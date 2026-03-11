import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Logging in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'lucastotomessina@gmail.com',
        password: 'Toto2003'
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }
    console.log("Logged in as:", authData.user.email);

    // Now query Facundo's last clients
    console.log("Fetching Facundo's latest 50 clients...");
    const { data, error } = await supabase
        .from('empresa_cliente')
        .select(`
            cliente_id, responsable, creado_por, estado, situacion, 
            created_at, updated_at, activo,
            clientes ( id, nombre, direccion, created_at, updated_at )
        `)
        .or('responsable.ilike.%facundo%,creado_por.ilike.%facundo%')
        .order('updated_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} clients.`);
        data.slice(0, 50).forEach(d => {
            console.log(`\n--- CLIENTE ${d.cliente_id} ---`);
            console.log(`Resp/Creador: ${d.responsable} / ${d.creado_por}`);
            console.log(`Estado: ${d.estado}`);
            console.log(`empresa_cliente -> created_at: ${d.created_at} | updated_at: ${d.updated_at}`);
            console.log(`clientes (master) -> created_at: ${d.clientes?.created_at} | updated_at: ${d.clientes?.updated_at}`);
        });
    }
}

main();
