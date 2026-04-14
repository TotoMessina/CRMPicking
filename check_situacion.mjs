import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let envStr = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');

const lines = envStr.split('\n');
let url = '';
let key = '';
lines.forEach(l => {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

async function test() {
    console.log("URL:", url);
    const { data: ecList, error: err1 } = await supabase.from('empresa_cliente').select('*').limit(1);
    if (err1) {
        console.error("Select error:", err1);
        return;
    }
    if (!ecList || ecList.length === 0) return console.log("No records found.");
    const ec = ecList[0];
    
    console.log("Keys in empresa_cliente:", Object.keys(ec));
    console.log("Current situacion:", ec.situacion);

    // Now try to update
    const { error: err2 } = await supabase.from('empresa_cliente').upsert({
        cliente_id: ec.cliente_id,
        empresa_id: ec.empresa_id,
        situacion: "en funcionamiento"
    }, { onConflict: 'empresa_id,cliente_id' });

    if (err2) {
        console.error("UPSERT ERROR:", err2);
    } else {
        console.log("UPSERT NO ERROR. Attempting to revert...");
        await supabase.from('empresa_cliente').upsert({
            cliente_id: ec.cliente_id,
            empresa_id: ec.empresa_id,
            situacion: ec.situacion
        }, { onConflict: 'empresa_id,cliente_id' });
    }
}

test();
