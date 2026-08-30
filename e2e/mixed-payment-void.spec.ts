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

test('pago mixto afecta caja sólo por efectivo y la anulación revierte caja e inventario', async ({ page }) => {
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

  const openingAmount = 200;
  const session = await json<{ id: string }>(
    await page.request.post(`${apiURL}/cash/sessions`, {
      data: { cashRegisterId: initialCash.registers[0].id, openingAmount },
    }),
    'Abrir caja',
  );

  let product: Product | undefined;
  let inventoryPrepared = false;
  let invoiceId: string | undefined;
  let invoiceVoided = false;
  let sessionClosed = false;

  try {
    const products = await json<Product[]>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Consultar productos',
    );
    product = products.find((item) =>
      item.status === 'ACTIVE' &&
      item.availableForSale &&
      Number(item.salePrice) >= 1,
    );
    expect(product, 'Debe existir un producto activo con precio mayor o igual a 1.').toBeTruthy();

    const inventoryBefore = Number(product!.inventory[0]?.quantity ?? 0);
    await json(
      await page.request.post(`${apiURL}/catalog/products/${product!.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_IN',
          quantity: 1,
          reason: 'Preparación pago mixto E2E',
        },
      }),
      'Preparar inventario',
    );
    inventoryPrepared = true;

    const setup = await json<{
      business: {
        defaultCurrency: 'NIO' | 'USD';
        taxesEnabled: boolean;
        ivaRate: string | number;
      };
      paymentMethods: Array<{ id: string; kind: string }>;
      banks: Array<{ id: string }>;
      terminals: Array<{ id: string; bankId: string }>;
    }>(
      await page.request.get(`${apiURL}/sales/setup?branchId=${branchId}`),
      'Consultar configuración',
    );

    const cashMethod = setup.paymentMethods.find((method) => method.kind === 'CASH');
    const transferMethod = setup.paymentMethods.find((method) => method.kind === 'BANK_TRANSFER');
    const posMethod = setup.paymentMethods.find((method) => method.kind === 'POS');
    const bank = setup.banks[0];
    const terminal = setup.terminals.find((item) => !bank || item.bankId === bank.id);
    expect(cashMethod, 'Debe existir el método efectivo.').toBeTruthy();
    expect(bank, 'Debe existir un banco activo.').toBeTruthy();
    expect(transferMethod || (posMethod && terminal), 'Debe existir transferencia o POS configurado.').toBeTruthy();

    const subtotal = roundMoney(Number(product!.salePrice));
    const taxRate = Number(product!.taxRate) || Number(setup.business.ivaRate);
    const tax = setup.business.taxesEnabled && !product!.taxExempt
      ? roundMoney(subtotal * taxRate / 100)
      : 0;
    const total = roundMoney(subtotal + tax);
    const cashAmount = Math.floor(total * 50) / 100;
    const nonCashAmount = roundMoney(total - cashAmount);
    expect(cashAmount).toBeGreaterThanOrEqual(0.01);
    expect(nonCashAmount).toBeGreaterThanOrEqual(0.01);

    const nonCashPayment = transferMethod
      ? {
          paymentMethodId: transferMethod.id,
          amount: nonCashAmount,
          bankId: bank!.id,
          reference: `E2E-${Date.now()}`,
        }
      : {
          paymentMethodId: posMethod!.id,
          amount: nonCashAmount,
          bankId: terminal!.bankId,
          posTerminalId: terminal!.id,
          cardType: 'DEBIT',
          reference: `E2E-${Date.now()}`,
        };

    const invoice = await json<{
      id: string;
      total: string | number;
      status: string;
      payments: Array<{ amount: string | number; paymentMethod: { kind: string } }>;
    }>(
      await page.request.post(`${apiURL}/sales`, {
        data: {
          branchId,
          currency: setup.business.defaultCurrency,
          idempotencyKey: crypto.randomUUID(),
          items: [{ productId: product!.id, quantity: 1, discountPercent: 0 }],
          discountPercent: 0,
          payments: [
            { paymentMethodId: cashMethod!.id, amount: cashAmount },
            nonCashPayment,
          ],
        },
      }),
      'Registrar venta mixta',
    );
    invoiceId = invoice.id;
    expect(Number(invoice.total)).toBe(total);
    expect(invoice.payments).toHaveLength(2);

    const afterSale = await json<CashOverview>(
      await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
      'Verificar efectivo de la venta mixta',
    );
    expect(Number(afterSale.openSession?.expectedCash)).toBeCloseTo(openingAmount + cashAmount, 2);

    const afterSaleProducts = await json<Product[]>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Verificar inventario vendido',
    );
    const inventoryAfterSale = Number(afterSaleProducts.find((item) => item.id === product!.id)?.inventory[0]?.quantity ?? 0);
    expect(inventoryAfterSale).toBeCloseTo(inventoryBefore, 3);

    const voided = await json<{ status: string }>(
      await page.request.post(`${apiURL}/sales/${invoice.id}/void`, {
        data: { reason: 'Anulación automática prueba E2E' },
      }),
      'Anular venta mixta',
    );
    invoiceVoided = true;
    expect(voided.status).toBe('VOIDED');

    const afterVoid = await json<CashOverview>(
      await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
      'Verificar caja anulada',
    );
    expect(Number(afterVoid.openSession?.expectedCash)).toBeCloseTo(openingAmount, 2);

    const afterVoidProducts = await json<Product[]>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Verificar inventario restaurado',
    );
    const inventoryAfterVoid = Number(afterVoidProducts.find((item) => item.id === product!.id)?.inventory[0]?.quantity ?? 0);
    expect(inventoryAfterVoid).toBeCloseTo(inventoryBefore + 1, 3);

    await json(
      await page.request.post(`${apiURL}/catalog/products/${product!.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_OUT',
          quantity: 1,
          reason: 'Limpieza pago mixto E2E',
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
    if (invoiceId && !invoiceVoided) {
      const response = await page.request.post(`${apiURL}/sales/${invoiceId}/void`, {
        data: { reason: 'Limpieza automática prueba E2E' },
      });
      invoiceVoided = response.ok();
    }
    if (product && inventoryPrepared && invoiceVoided) {
      await page.request.post(`${apiURL}/catalog/products/${product.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_OUT',
          quantity: 1,
          reason: 'Limpieza automática prueba E2E',
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
