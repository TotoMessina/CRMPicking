import { test, expect } from '@playwright/test';

async function loginAsDemo(page) {
  await page.goto('/login');
  const demoBtn = page.locator('button:has-text("Acceder a Demo"), button:has-text("Demo"), button:has-text("Demo Access")');
  await expect(demoBtn).toBeVisible();
  await demoBtn.click();
  await page.waitForURL(url => url.pathname === '/' || url.pathname === '/dashboard', { timeout: 15000 });
}

test.describe('E2E — Clientes y Filtros Reactivos', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('debe filtrar locales de forma reactiva y abrir el panel de filtros avanzados', async ({ page }) => {
    // 1. Navegar a Clientes
    await page.goto('/clientes');
    await page.waitForSelector('h1');

    // Confirmar título principal
    await expect(page.locator('h1')).toContainText(/(Clientes|Clients|Agenda)/i);

    // 2. Interactuar con la barra de búsqueda principal
    const searchInput = page.locator('input[placeholder*="Buscar" i], input[placeholder*="Search" i], input.input').first();
    await expect(searchInput).toBeVisible();

    // Escribir un criterio de búsqueda ficticio o común
    await searchInput.fill('Almacén');
    await page.waitForTimeout(500); // Dar un breve respiro para la actualización reactiva

    // 3. Abrir el panel de filtros avanzados
    const advancedFiltersBtn = page.locator('button:has-text("Filtros Avanzados"), button:has-text("Filtros"), button:has-text("Advanced Filters")');
    await expect(advancedFiltersBtn).toBeVisible();
    await advancedFiltersBtn.click();

    // 4. Verificar que se desplieguen los campos del panel avanzado
    // Buscar inputs de teléfono o dirección para confirmar que el panel se expandió
    const phoneFilterInput = page.locator('input[placeholder*="Teléfono"], input[placeholder*="Phone"]');
    const addressFilterInput = page.locator('input[placeholder*="Dirección"], input[placeholder*="Address"]');
    
    await expect(phoneFilterInput).toBeVisible();
    await expect(addressFilterInput).toBeVisible();

    // Validar el botón de filtro de agenda "Próximos 7" o "Next 7"
    const next7DaysBtn = page.locator('button:has-text("Próximos 7"), button:has-text("Next 7")');
    await expect(next7DaysBtn).toBeVisible();
  });

});
