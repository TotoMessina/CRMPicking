const { createClient } = require('@supabase/supabase-js');
// Hardcoded because .env is missing/inaccessible directly via Node in this env sometimes
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const tables = ['clientes', 'empresa_cliente'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`Error table ${table}:`, error);
            continue;
        }
        if (data && data.length > 0) {
            console.log(`--- ${table} content sample ---`);
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log(`Table ${table} is empty.`);
        }
    }
}

checkSchema();
