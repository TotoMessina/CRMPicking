import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { readFile } from 'node:fs/promises';

for (const format of ['xlsx', 'csv'] as const) {
  for (const scenario of ['template', 'empty', 'records'] as const) {
    test(`distribuidores ${scenario}: downloads a valid named ${format}`, async ({ page }) => {
      // Exercise the actual download functions without login or production data.
      await page.route('http://localhost:5173/', route => route.fulfill({
        contentType: 'text/html', body: '<html><body></body></html>',
      }));
      await page.route('**/rest/v1/distribuidores*', route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(scenario === 'records'
          ? [{ nombre: 'Distribución "Norte"; SRL', categorias_productos: 'Lácteos', estado: 'Activo' }]
          : []),
      }));
      await page.goto('/');
      const downloadPromise = page.waitForEvent('download');
      await page.evaluate(async ({ format, scenario }) => {
        const modulePath = '/src/lib/excelExport.ts';
        const exports = await import(/* @vite-ignore */ modulePath);
        if (scenario === 'template') {
          exports[format === 'xlsx' ? 'descargarModeloDistribuidores' : 'descargarModeloDistribuidoresCSV']();
        } else {
          await exports[format === 'xlsx' ? 'exportarDistribuidoresExcel' : 'exportarDistribuidoresCSV']({ id: 'download-test' });
        }
      }, { format, scenario });
      const download = await downloadPromise;
      expect(await download.failure()).toBeNull();
      expect(download.suggestedFilename()).toMatch(scenario === 'template'
        ? new RegExp(`^modelo_distribuidores_crm\\.${format}$`)
        : new RegExp(`^distribuidores_\\d{4}-\\d{2}-\\d{2}\\.${format}$`));
      const bytes = await readFile((await download.path())!);
      if (format === 'xlsx') expect(bytes.subarray(0, 2).toString()).toBe('PK');
      else expect(bytes.subarray(0, 3).toString('hex')).toBe('efbbbf');
      const workbook = XLSX.read(bytes, { type: 'buffer' });
      const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      expect(rows[0][0]).toBe(scenario === 'template' ? 'nombre' : 'Nombre Distribuidor');
      if (scenario === 'records') expect(rows[1][0]).toBe('Distribución "Norte"; SRL');
      if (scenario === 'template') expect(rows[1][2]).toBe('Bebidas, Lácteos, Golosinas');
    });
  }
}
