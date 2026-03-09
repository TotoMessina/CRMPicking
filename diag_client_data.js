import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkClientData() {
    const { data, error } = await supabase.rpc('buscar_clientes_empresa', {
        p_empresa_id: '302444cf-9e6b-4127-b018-6c0d1972b276',
        p_limit: 10
    });

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Found recent client via RPC:");
        console.log("ID:", data[0].cliente_id);
        console.log("Estado (ec):", data[0].estado);
        console.log("Rubro (ec):", data[0].rubro);
        console.log("Notas (ec):", data[0].notas);
    } else {
        console.log("No data returned via RPC.");
    }
}

checkClientData();
