import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(__dirname, '../src/types/database.types.ts');

try {
    console.log('Generando tipos de Supabase...');
    const stdout = execSync('npx supabase gen types typescript --project-id mflftikcvsnniwwanrkj', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(targetFile, stdout, 'utf8');
    console.log('Tipos generados exitosamente en UTF-8 sin BOM!');
} catch (error) {
    console.error('Error al generar tipos:', error);
}
