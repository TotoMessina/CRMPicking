import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walkDir(srcDir);
console.log(`Encontrados ${files.length} archivos TypeScript.`);

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('(supabase as any)')) {
        content = content.replace(/\(supabase as any\)/g, 'supabase');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Reemplazado en: ${path.basename(file)}`);
        count++;
    }
});

console.log(`Limpieza completada en ${count} archivos.`);
