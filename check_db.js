import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    // try to fetch a client
    const { data: ecData } = await supabase.from('empresa_cliente').select('cliente_id, empresa_id, situacion').limit(5);
    console.log("Current situacion values in DB:", ecData.map(e => e.situacion));
}
check();
