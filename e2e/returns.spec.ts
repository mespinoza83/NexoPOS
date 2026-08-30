import { expect, test, type APIResponse, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@nexopos.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

type CashOverview = {
  registers: Array<{ id: string }>;
  openSession: { id: string; expectedCash: string | number } | null;
};

type Product = {
  id: string;
  salePrice: string | number;
  taxRate: string | number;
  taxExempt: boolean;
  status: string;
  availableForSale: boolean;
  inventory: Array<{ quantity: string | number }>;
};

async function json<T>(response: APIResponse, operation: string): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { message?: string | string[] };
  if (!response.ok()) {
    const detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(`${operation}: ${detail ?? response.statusText()}`);
  }
  return body;
}

async function login(page: Page) {
  if (!adminPassword) throw new Error('Define E2E_ADMIN_PASSWORD para ejecutar esta prueba.');
  await page.goto('/');
  await page.getByLabel('Correo electrónico').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByLabel('Correo electrónico').fill(adminEmail);
  await page.getByLabel('Contraseña').fill(adminPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
}

test('devolución parcial y total restaura efectivo, inventario y estados', async ({ page }) => {
  test.skip(!adminPassword, 'Requiere E2E_ADMIN_PASSWORD.');
  await login(page);

  const me = await json<{ user: { branches: Array<{ id: string }> } }>(
    await page.request.get(`${apiURL}/auth/me`),
    'Consultar sesión',
  );
  const branchId = me.user.branches[0]?.id;
  expect(branchId, 'El administrador debe tener una sucursal asignada.').toBeTruthy();

  const initialCash = await json<CashOverview>(
    await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
    'Consultar caja',
  );
  expect(initialCash.openSession, 'La prueba requiere que no exista otra caja abierta.').toBeNull();
  expect(initialCash.registers[0]?.id, 'Debe existir una caja registradora.').toBeTruthy();

  const openingAmount = 300;
  const session = await json<{ id: string }>(
    await page.request.post(`${apiURL}/cash/sessions`, {
      data: { cashRegisterId: initialCash.registers[0].id, openingAmount },
    }),
    'Abrir caja',
  );

  let product: Product | undefined;
  let inventoryPrepared = false;
  let invoice: {
    id: string;
    number: string;
    total: string | number;
    items: Array<{ id: string; lineTotal: string | number }>;
  } | undefined;
  let returnedQuantity = 0;
  let sessionClosed = false;

  try {
    const setup = await json<{
      business: {
        defaultCurrency: 'NIO' | 'USD';
        taxesEnabled: boolean;
        ivaRate: string | number;
      };
      paymentMethods: Array<{ id: string; kind: string }>;
    }>(
      await page.request.get(`${apiURL}/sales/setup?branchId=${branchId}`),
      'Consultar configuración',
    );
    const cashMethodId = setup.paymentMethods.find((method) => method.kind === 'CASH')?.id;
    expect(cashMethodId, 'Debe existir el método efectivo.').toBeTruthy();

    const products = await json<Product[]>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Consultar productos',
    );
    product = products.find((candidate) => {
      if (candidate.status !== 'ACTIVE' || !candidate.availableForSale || Number(candidate.salePrice) >= 100_000) return false;
      const subtotal = roundMoney(Number(candidate.salePrice) * 2);
      const rate = Number(candidate.taxRate) || Number(setup.business.ivaRate);
      const tax = setup.business.taxesEnabled && !candidate.taxExempt ? roundMoney(subtotal * rate / 100) : 0;
      const cents = Math.round(roundMoney(subtotal + tax) * 100);
      return cents >= 2 && cents % 2 === 0;
    });
    expect(product, 'Debe existir un producto cuyo total permita dos reembolsos exactos.').toBeTruthy();

    const inventoryBefore = Number(product!.inventory[0]?.quantity ?? 0);
    await json(
      await page.request.post(`${apiURL}/catalog/products/${product!.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_IN',
          quantity: 2,
          reason: 'Preparación devoluciones E2E',
        },
      }),
      'Preparar inventario',
    );
    inventoryPrepared = true;

    invoice = await json<{
      id: string;
      number: string;
      total: string | number;
      items: Array<{ id: string; lineTotal: string | number }>;
    }>(
      await page.request.post(`${apiURL}/sales`, {
        data: {
          branchId,
          currency: setup.business.defaultCurrency,
          idempotencyKey: crypto.randomUUID(),
          items: [{ productId: product!.id, quantity: 2, discountPercent: 0 }],
          discountPercent: 0,
          payments: [{ paymentMethodId: cashMethodId, amount: 100_000 }],
        },
      }),
      'Registrar venta para devolución',
    );
    const invoiceTotal = Number(invoice.total);
    const invoiceItemId = invoice.items[0]?.id;
    const refundPerUnit = roundMoney(Number(invoice.items[0]?.lineTotal) / 2);
    expect(invoiceItemId).toBeTruthy();
    expect(refundPerUnit * 2).toBeCloseTo(invoiceTotal, 2);

    const afterSale = await json<CashOverview>(
      await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
      'Verificar caja después de venta',
    );
    expect(Number(afterSale.openSession?.expectedCash)).toBeCloseTo(openingAmount + invoiceTotal, 2);

    await json(
      await page.request.post(`${apiURL}/sales/${invoice.id}/returns`, {
        data: {
          reason: 'Devolución parcial automática E2E',
          items: [{ invoiceItemId, quantity: 1 }],
          refunds: [{ paymentMethodId: cashMethodId, amount: refundPerUnit }],
        },
      }),
      'Registrar devolución parcial',
    );
    returnedQuantity = 1;

    const afterPartialInvoices = await json<Array<{ id: string; status: string }>>(
      await page.request.get(`${apiURL}/sales?branchId=${branchId}`),
      'Consultar estado parcial',
    );
    expect(afterPartialInvoices.find((item) => item.id === invoice!.id)?.status).toBe('PARTIALLY_RETURNED');

    const afterPartialCash = await json<CashOverview>(
      await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
      'Verificar caja parcial',
    );
    expect(Number(afterPartialCash.openSession?.expectedCash)).toBeCloseTo(openingAmount + invoiceTotal - refundPerUnit, 2);

    const partialProducts = await json<Product[]>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Verificar inventario parcial',
    );
    expect(Number(partialProducts.find((item) => item.id === product!.id)?.inventory[0]?.quantity ?? 0)).toBeCloseTo(inventoryBefore + 1, 3);

    await json(
      await page.request.post(`${apiURL}/sales/${invoice.id}/returns`, {
        data: {
          reason: 'Devolución total automática E2E',
          items: [{ invoiceItemId, quantity: 1 }],
          refunds: [{ paymentMethodId: cashMethodId, amount: refundPerUnit }],
        },
      }),
      'Completar devolución',
    );
    returnedQuantity = 2;

    const completedInvoices = await json<Array<{ id: string; status: string }>>(
      await page.request.get(`${apiURL}/sales?branchId=${branchId}`),
      'Consultar estado total',
    );
    expect(completedInvoices.find((item) => item.id === invoice!.id)?.status).toBe('FULLY_RETURNED');

    const afterFullCash = await json<CashOverview>(
      await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
      'Verificar caja después de devolución total',
    );
    expect(Number(afterFullCash.openSession?.expectedCash)).toBeCloseTo(openingAmount, 2);

    const fullProducts = await json<Product[]>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Verificar inventario restaurado',
    );
    expect(Number(fullProducts.find((item) => item.id === product!.id)?.inventory[0]?.quantity ?? 0)).toBeCloseTo(inventoryBefore + 2, 3);

    await page.getByRole('button', { name: /Ventas/ }).click();
    await expect(page.getByText('Devuelta totalmente', { exact: true }).first()).toBeVisible();

    await json(
      await page.request.post(`${apiURL}/catalog/products/${product!.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_OUT',
          quantity: 2,
          reason: 'Limpieza devoluciones E2E',
        },
      }),
      'Restaurar inventario de prueba',
    );
    inventoryPrepared = false;

    const closed = await json<{ difference: string | number; status: string }>(
      await page.request.post(`${apiURL}/cash/sessions/${session.id}/close`, {
        data: { countedCash: openingAmount },
      }),
      'Cerrar caja',
    );
    sessionClosed = true;
    expect(Number(closed.difference)).toBe(0);
    expect(closed.status).toBe('CLOSED');
  } finally {
    if (invoice && returnedQuantity < 2) {
      const cashMethod = await json<{
        paymentMethods: Array<{ id: string; kind: string }>;
      }>(
        await page.request.get(`${apiURL}/sales/setup?branchId=${branchId}`),
        'Consultar método para limpieza',
      );
      const cashMethodId = cashMethod.paymentMethods.find((method) => method.kind === 'CASH')?.id;
      const remaining = 2 - returnedQuantity;
      const refund = roundMoney(Number(invoice.items[0]?.lineTotal) * remaining / 2);
      if (cashMethodId && remaining > 0) {
        const response = await page.request.post(`${apiURL}/sales/${invoice.id}/returns`, {
          data: {
            reason: 'Limpieza automática devoluciones E2E',
            items: [{ invoiceItemId: invoice.items[0].id, quantity: remaining }],
            refunds: [{ paymentMethodId: cashMethodId, amount: refund }],
          },
        });
        if (response.ok()) returnedQuantity = 2;
      }
    }
    if (product && inventoryPrepared && (!invoice || returnedQuantity === 2)) {
      await page.request.post(`${apiURL}/catalog/products/${product.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_OUT',
          quantity: 2,
          reason: 'Limpieza automática devoluciones E2E',
        },
      });
    }
    if (!sessionClosed) {
      const overview = await json<CashOverview>(
        await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
        'Consultar caja para limpieza',
      );
      if (overview.openSession?.id === session.id) {
        await page.request.post(`${apiURL}/cash/sessions/${session.id}/close`, {
          data: { countedCash: Number(overview.openSession.expectedCash) },
        });
      }
    }
  }
});
