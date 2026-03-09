import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRPC() {
    // Current active company from logs in previous turn was: 302444cf-9e6b-4127-b018-6c0d1972b276
    const empresaId = '302444cf-9e6b-4127-b018-6c0d1972b276';

    console.log(`Calling RPC buscar_clientes_empresa for company: ${empresaId}`);

    const { data, error } = await supabase.rpc('buscar_clientes_empresa', {
        p_empresa_id: empresaId,
        p_limit: 50
    });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`RPC returned ${data.length} clients.`);
    data.forEach(c => {
        console.log(`- ID: ${c.cliente_id}, Local: ${c.nombre_local}, Coords: ${c.lat}, ${c.lng}, Created: ${c.ec_created_at}`);
    });
}

testRPC();
