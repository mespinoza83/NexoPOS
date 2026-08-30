import { expect, test, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@nexopos.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function loginAsAdmin(page: Page) {
  if (!adminPassword) throw new Error('Define E2E_ADMIN_PASSWORD para ejecutar las pruebas autenticadas.');
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill(adminEmail);
  await page.getByLabel('Contraseña').fill(adminPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
}

test('muestra el acceso cuando no existe una sesión', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
});

test.describe('administrador autenticado', () => {
  test.skip(!adminPassword, 'Requiere E2E_ADMIN_PASSWORD.');

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('muestra todas las opciones autorizadas del menú', async ({ page }) => {
    const expectedSections = ['Resumen', 'Ventas', 'Inventario', 'Caja', 'Reportes', 'Clientes', 'Administración'];

    for (const section of expectedSections) {
      await expect(page.getByRole('button', { name: new RegExp(section) })).toBeVisible();
    }

    await expect(page.getByText('Cerrar sesión', { exact: true })).toBeVisible();
  });

  test('permite abrir Administración y regresar al resumen', async ({ page }) => {
    await page.getByRole('button', { name: /Administración/ }).click();
    await expect(page.getByRole('heading', { name: 'Administración', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Resumen/ }).click();
    await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
  });

  test('cierra la sesión y vuelve al acceso', async ({ page }) => {
    await page.getByRole('button', { name: /Cerrar sesión/ }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  });
});
