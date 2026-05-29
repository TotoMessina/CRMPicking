import { test, expect } from '@playwright/test';

test.describe('E2E — Autenticación e Idioma', () => {

  test('debe mostrar error con credenciales incorrectas, iniciar sesion con demo, cambiar de idioma a ingles y cerrar sesion', async ({ page }) => {
    // 1. Navegar al Login
    await page.goto('/login');
    await expect(page).toHaveTitle(/InsideUp CRM|CRM/i);

    // 2. Probar credenciales incorrectas
    await page.fill('#email', 'incorrecto@ejemplo.com');
    await page.fill('#password', 'ClaveFalsa123');
    await page.click('button[type="submit"]');

    // Esperar mensaje de error
    const errorMsg = page.locator('p.text-center');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/(credenciales|invalid|incorrecto|credentials)/i);

    // 3. Iniciar sesión usando el acceso Demo
    const demoBtn = page.locator('button:has-text("Acceder a Demo"), button:has-text("Demo"), button:has-text("Demo Access")');
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Esperar redirección al Dashboard
    await page.waitForURL(url => url.pathname === '/' || url.pathname === '/dashboard', { timeout: 15000 });
    
    // 4. Navegar a Configuración para probar cambio de idioma
    await page.goto('/configuracion');
    await page.waitForSelector('h1');

    // Comprobar que el título sea válido
    await expect(page.locator('h1')).toContainText(/(Configuración|Cuenta|Settings|Account)/i);

    // Detectar qué botón de idioma clickear para forzar un cambio
    const initialText = await page.locator('h1').textContent();
    const isCurrentlyEnglish = /settings|account/i.test(initialText || '');

    if (isCurrentlyEnglish) {
      // Si ya está en inglés, cambiamos a Español
      const spanishBtn = page.locator('button:has-text("Español"), button:has-text("🇪🇸 Español")');
      await expect(spanishBtn).toBeVisible();
      await spanishBtn.click();
      await expect(page.locator('h1')).toContainText(/(Configuración|Cuenta)/i);
    } else {
      // Si está en español, cambiamos a Inglés
      const englishBtn = page.locator('button:has-text("English"), button:has-text("🇺🇸 English")');
      await expect(englishBtn).toBeVisible();
      await englishBtn.click();
      await expect(page.locator('h1')).toContainText(/(Settings|Account)/i);
    }

    // 5. Cerrar sesión
    const logoutBtn = page.locator('#btnLogout, button.sidebar-ctrl-danger');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verificar retorno a la página de login
    await page.waitForURL(url => url.pathname.includes('/login'), { timeout: 10000 });
  });

});
