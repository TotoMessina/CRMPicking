import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('debe mostrar la página de login al inicio', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/PickingUp/);
    await expect(page.locator('.brand-logo')).toHaveText('PU');
    await expect(page.locator('h2')).toHaveText('Bienvenido');
  });

  test('debe fallar con credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@noexiste.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Esperar mensaje de error
    const errorMsg = page.locator('p.text-center');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/Credenciales incorrectas/i);
  });
});
