import { test, expect } from '@playwright/test';

/**
 * ATENCIÓN: Estos tests requieren estar logueado.
 * Podés configurar credenciales en un archivo .env o usarlas directamente aquí
 * para correr las pruebas locales.
 */

test.describe('Gestión de Clientes', () => {
  
  test.beforeEach(async ({ page }) => {
    // Aquí iría el flujo de login si tuviéramos credenciales de prueba
    // Por ahora, saltamos si no estamos en la página correcta
    await page.goto('/clientes');
    if (page.url().includes('/login')) {
      test.skip(true, 'Se requiere login para probar el flujo de clientes');
    }
  });

  test('debe cargar la lista de clientes', async ({ page }) => {
    // Verificar que el header existe
    await expect(page.locator('h1')).toContainText(/Clientes/i);
    
    // Verificar que el botón de "Nuevo Cliente" está disponible
    const btnNuevo = page.locator('button:has-text("Nuevo Cliente")');
    await expect(btnNuevo).toBeVisible();
  });

  test('debe abrir el modal de nuevo cliente', async ({ page }) => {
    await page.click('button:has-text("Nuevo Cliente")');
    
    // Verificar que el modal se abrió
    const modal = page.locator('.modal.is-open');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h3')).toContainText(/Nuevo Cliente/i);
    
    // Verificar campos básicos
    await expect(modal.locator('input[name="nombre_local"]')).toBeVisible();
    await expect(modal.locator('button[type="submit"]')).toBeVisible();
  });
});
