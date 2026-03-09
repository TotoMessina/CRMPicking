
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkState() {
    console.log("=== State Check ===");

    // List all companies
    const { data: empresas, error: eErr } = await supabase.from('empresas').select('id, nombre');
    console.log("Companies:", empresas, eErr?.message || "");

    // Total clients
    const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    console.log("Total clients in 'clientes':", totalClientes);

    // Empresa_cliente entries
    const { count: totalEC } = await supabase.from('empresa_cliente').select('*', { count: 'exact', head: true });
    console.log("Total entries in 'empresa_cliente':", totalEC);

    // Sample clientes - check if empresa_id field exists
    const { data: sample } = await supabase.from('clientes').select('id, nombre, empresa_id').limit(3);
    console.log("Sample clients (checking empresa_id field):", sample);
}

checkState();
