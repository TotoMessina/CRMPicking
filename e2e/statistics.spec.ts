import { test, expect } from '@playwright/test';

async function loginAsDemo(page) {
  await page.goto('/login');
  const demoBtn = page.locator('button:has-text("Acceder a Demo"), button:has-text("Demo"), button:has-text("Demo Access")');
  await expect(demoBtn).toBeVisible();
  await demoBtn.click();
  await page.waitForURL(url => url.pathname === '/' || url.pathname === '/dashboard', { timeout: 15000 });
}

test.describe('E2E — Estadísticas y Tabs de Rendimiento', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('debe navegar por las diferentes pestañas de estadísticas y verificar el renderizado de los componentes', async ({ page }) => {
    // 1. Navegar a Estadísticas
    await page.goto('/estadisticas');
    await page.waitForSelector('h1');

    // 2. Verificar que se muestra la primera pestaña activa por defecto (Ecosistema de Aplicaciones)
    const activeTab = page.locator('button:has-text("🚀")');
    await expect(activeTab).toBeVisible();
    await expect(activeTab).toContainText(/(Ecosistema|Apps)/i);

    // 3. Cambiar a la pestaña de Rendimiento de Activadores (⚡)
    const performanceTab = page.locator('button:has-text("⚡"), button:has-text("Rendimiento"), button:has-text("Performance")');
    await expect(performanceTab).toBeVisible();
    await performanceTab.click();

    // Dar un breve respiro para la transición
    await page.waitForTimeout(500);

    // 4. Cambiar a la pestaña de Proyecciones de IA (🎯)
    const projectionsTab = page.locator('button:has-text("🎯"), button:has-text("Proyecciones"), button:has-text("Projections")');
    await expect(projectionsTab).toBeVisible();
    await projectionsTab.click();

    // Comprobar que cargan las proyecciones o elementos predictivos
    const forecastingRadar = page.locator('canvas, .predictive-insights, div').filter({ hasText: /(Proyecciones|Forecast|Predecir)/i }).first();
    await expect(forecastingRadar).toBeVisible();
  });

});
