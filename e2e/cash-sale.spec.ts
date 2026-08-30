import { expect, test, type APIResponse, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@nexopos.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';

type CashOverview = {
  registers: Array<{ id: string; name: string }>;
  openSession: { id: string; expectedCash: string | number } | null;
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
  await page.getByLabel('Correo electrónico').fill(adminEmail);
  await page.getByLabel('Contraseña').fill(adminPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
}

test('abrir caja, cobrar en efectivo, verificar esperado y cerrar sin diferencia', async ({ page }) => {
  test.skip(!adminPassword, 'Requiere E2E_ADMIN_PASSWORD.');
  await login(page);

  const me = await json<{ user: { branches: Array<{ id: string }> } }>(
    await page.request.get(`${apiURL}/auth/me`),
    'Consultar sesión',
  );
  const branchId = me.user.branches[0]?.id;
  expect(branchId, 'El administrador debe tener una sucursal asignada.').toBeTruthy();

  const initialOverview = await json<CashOverview>(
    await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
    'Consultar caja',
  );
  expect(initialOverview.openSession, 'La prueba requiere que no exista otra caja abierta.').toBeNull();
  const registerId = initialOverview.registers[0]?.id;
  expect(registerId, 'Debe existir al menos una caja registradora.').toBeTruthy();

  const openingAmount = 100;
  const opened = await json<{ id: string }>(
    await page.request.post(`${apiURL}/cash/sessions`, {
      data: { cashRegisterId: registerId, openingAmount },
    }),
    'Abrir caja',
  );

  let sessionClosed = false;
  try {
    const products = await json<Array<{
      id: string;
      salePrice: string | number;
      status: string;
      availableForSale: boolean;
    }>>(
      await page.request.get(`${apiURL}/catalog/products?branchId=${branchId}`),
      'Consultar productos',
    );
    const product = products.find((item) => item.status === 'ACTIVE' && item.availableForSale && Number(item.salePrice) > 0);
    expect(product, 'Debe existir un producto activo con precio de venta.').toBeTruthy();

    await json(
      await page.request.post(`${apiURL}/catalog/products/${product!.id}/adjust-inventory`, {
        data: {
          branchId,
          type: 'ADJUSTMENT_IN',
          quantity: 1,
          reason: 'Preparación prueba E2E',
        },
      }),
      'Preparar inventario',
    );

    const setup = await json<{
      business: { defaultCurrency: 'NIO' | 'USD' };
      paymentMethods: Array<{ id: string; kind: string }>;
    }>(
      await page.request.get(`${apiURL}/sales/setup?branchId=${branchId}`),
      'Consultar configuración de venta',
    );
    const cashMethodId = setup.paymentMethods.find((method) => method.kind === 'CASH')?.id;
    expect(cashMethodId, 'Debe existir un método de pago en efectivo.').toBeTruthy();

    const invoice = await json<{ id: string; number: string; total: string | number }>(
      await page.request.post(`${apiURL}/sales`, {
        data: {
          branchId,
          currency: setup.business.defaultCurrency,
          idempotencyKey: crypto.randomUUID(),
          items: [{ productId: product!.id, quantity: 1, discountPercent: 0 }],
          discountPercent: 0,
          payments: [{ paymentMethodId: cashMethodId, amount: 100_000 }],
        },
      }),
      'Registrar venta',
    );
    expect(invoice.number).toBeTruthy();

    const afterSale = await json<CashOverview>(
      await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
      'Verificar caja después de la venta',
    );
    const expectedCash = openingAmount + Number(invoice.total);
    expect(Number(afterSale.openSession?.expectedCash)).toBeCloseTo(expectedCash, 2);

    const closed = await json<{ difference: string | number; status: string }>(
      await page.request.post(`${apiURL}/cash/sessions/${opened.id}/close`, {
        data: { countedCash: expectedCash },
      }),
      'Cerrar caja',
    );
    sessionClosed = true;
    expect(Number(closed.difference)).toBe(0);
    expect(closed.status).toBe('CLOSED');

    await page.getByRole('button', { name: /Caja/ }).click();
    await expect(page.getByRole('heading', { name: 'Caja', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No hay una caja abierta' })).toBeVisible();
  } finally {
    if (!sessionClosed) {
      const overview = await json<CashOverview>(
        await page.request.get(`${apiURL}/cash?branchId=${branchId}`),
        'Consultar caja para limpieza',
      );
      if (overview.openSession?.id === opened.id) {
        await page.request.post(`${apiURL}/cash/sessions/${opened.id}/close`, {
          data: { countedCash: Number(overview.openSession.expectedCash) },
        });
      }
    }
  }
});
