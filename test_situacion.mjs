import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let envStr = '';
try { envStr = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8'); } catch (e) {
  try { envStr = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8'); } catch (e2) {}
}

const lines = envStr.split('\n');
let url = '';
let key = '';
lines.forEach(l => {
    if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim();
});

// Polyfill fetch for node 16 if needed, but Node 24 has it.
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

async function test() {
    // 1. Get any single business client
    const { data: ecList, error: err1 } = await supabase.from('empresa_cliente').select('cliente_id, empresa_id, situacion').limit(1);
    if (!ecList || ecList.length === 0) return console.log("No records found.");
    const ec = ecList[0];
    
    console.log("Original situacion:", ec.situacion);

    // 2. Try to update it to "en funcionamiento"
    const { error: err2 } = await supabase.from('empresa_cliente').upsert({
        cliente_id: ec.cliente_id,
        empresa_id: ec.empresa_id,
        situacion: "en funcionamiento"
    }, { onConflict: 'empresa_id,cliente_id' });

    if (err2) {
        console.error("UPSERT ERROR:", err2);
    } else {
        console.log("Upsert Success!");
        // Revert it
        await supabase.from('empresa_cliente').upsert({
            cliente_id: ec.cliente_id,
            empresa_id: ec.empresa_id,
            situacion: ec.situacion
        }, { onConflict: 'empresa_id,cliente_id' });
    }
}

test();
