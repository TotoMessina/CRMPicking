import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
    // We can't use psql, so we use a trick: query the information_schema via RPC if available, 
    // or just try to insert a dummy record and see the error message.
    // Actually, let's just query a known record and see the types in the response.

    console.log("Checking Clientes record structure...");
    const { data: cData, error: cErr } = await supabase.from('clientes').select('*').limit(1);
    console.log("Clientes structure:", cData ? Object.keys(cData[0]) : "Empty/Error", cErr);

    console.log("\nChecking Empresa_Cliente record structure...");
    const { data: ecData, error: ecErr } = await supabase.from('empresa_cliente').select('*').limit(1);
    console.log("Empresa_Cliente structure:", ecData ? Object.keys(ecData[0]) : "Empty/Error", ecErr);
}

checkSchema();
