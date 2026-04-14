import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const lines = envFile.split('\n');
let url = '';
let key = '';
lines.forEach(l => {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

async function run() {
    const { data: ecData, error } = await supabase.from('empresa_cliente').select('situacion').limit(20);
    if (error) console.error(error);
    else console.log("DB Situaciones:", [...new Set(ecData.map(e => e.situacion))]);
}
run();
