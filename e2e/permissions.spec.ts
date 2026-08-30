import { expect, test, type APIResponse, type BrowserContext, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@nexopos.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';

async function json<T>(response: APIResponse, operation: string): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & { message?: string | string[] };
  if (!response.ok()) {
    const detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(`${operation}: ${detail ?? response.statusText()}`);
  }
  return body;
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
}

test('el rol Cajero ve sólo su menú y no puede consultar auditoría', async ({ page, browser }) => {
  test.skip(!adminPassword, 'Requiere E2E_ADMIN_PASSWORD.');
  await login(page, adminEmail, adminPassword!);

  const access = await json<{
    roles: Array<{ id: string; code: string }>;
    branches: Array<{ id: string }>;
  }>(
    await page.request.get(`${apiURL}/admin/access`),
    'Consultar roles y sucursales',
  );
  const cashierRoleId = access.roles.find((role) => role.code === 'CASHIER')?.id;
  const branchId = access.branches[0]?.id;
  expect(cashierRoleId, 'Debe existir el rol CASHIER.').toBeTruthy();
  expect(branchId, 'Debe existir una sucursal.').toBeTruthy();

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const cashierEmail = `e2e-cajero-${suffix}@nexopos.local`;
  const cashierPassword = `E2E-${crypto.randomUUID()}-aA1!`;
  const cashier = await json<{ id: string }>(
    await page.request.post(`${apiURL}/admin/users`, {
      data: {
        email: cashierEmail,
        firstName: 'Cajero',
        lastName: 'Prueba E2E',
        password: cashierPassword,
        roleIds: [cashierRoleId],
        branchIds: [branchId],
      },
    }),
    'Crear cajero temporal',
  );

  let cashierContext: BrowserContext | undefined;
  try {
    cashierContext = await browser.newContext();
    const cashierPage = await cashierContext.newPage();
    await login(cashierPage, cashierEmail, cashierPassword);

    for (const section of ['Resumen', 'Ventas', 'Inventario', 'Caja', 'Clientes']) {
      await expect(cashierPage.getByRole('button', { name: new RegExp(section) })).toBeVisible();
    }
    await expect(cashierPage.getByRole('button', { name: /Reportes/ })).toHaveCount(0);
    await expect(cashierPage.getByRole('button', { name: /Administración/ })).toHaveCount(0);

    const me = await json<{ user: { permissions: string[] } }>(
      await cashierPage.request.get(`${apiURL}/auth/me`),
      'Consultar permisos del cajero',
    );
    expect(me.user.permissions).toContain('sales.create');
    expect(me.user.permissions).toContain('cash.manage');
    expect(me.user.permissions).not.toContain('audit.read');
    expect(me.user.permissions).not.toContain('settings.manage');

    const auditResponse = await cashierPage.request.get(`${apiURL}/admin/audit-logs`);
    expect(auditResponse.status()).toBe(403);
  } finally {
    await cashierContext?.close();
    await json(
      await page.request.patch(`${apiURL}/admin/users/${cashier.id}`, {
        data: { status: 'INACTIVE' },
      }),
      'Inactivar cajero temporal',
    );
  }
});
