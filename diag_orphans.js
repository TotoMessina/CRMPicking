import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EMPRESA_ID = "302444cf-9e6b-4127-b018-6c0d1972b276"; // From earlier logs

async function diagnoseOrphans() {
    console.log("--- Diagnosing Orphan Clients ---");

    // 1. Get all universal clients
    const { data: allClientes, error: err1 } = await supabase.from('clientes').select('id, nombre_local, created_at, lat, lng');
    if (err1) return console.error("Error fetching clientes:", err1);

    // 2. Get all linked clients for this company
    const { data: linkedClientes, error: err2 } = await supabase.from('empresa_cliente').select('cliente_id').eq('empresa_id', EMPRESA_ID);
    if (err2) return console.error("Error fetching linked:", err2);

    const linkedIds = new Set((linkedClientes || []).map(l => l.cliente_id));
    const orphans = (allClientes || []).filter(c => !linkedIds.has(c.id));

    console.log(`Total Clientes: ${allClientes.length}`);
    console.log(`Linked to Company ${EMPRESA_ID}: ${linkedIds.size}`);
    console.log(`Orphans (no company link): ${orphans.length}`);

    if (orphans.length > 0) {
        console.log("\nRecent Orphans Sample (Last 5):");
        orphans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        orphans.slice(0, 5).forEach(o => {
            console.log(`- [${o.created_at}] ${o.nombre_local} (ID: ${o.id}) Loc: ${o.lat}, ${o.lng}`);
        });
    }

    // 3. Check map fetch conditions
    console.log("\n--- Checking Map Fetch Conditions ---");
    const { data: mapFetch, error: err3 } = await supabase
        .from("empresa_cliente")
        .select("*, clientes(*)")
        .eq("empresa_id", EMPRESA_ID)
        .eq("activo", true);

    if (err3) console.error("Map fetch error:", err3);
    else {
        const withCoords = mapFetch.filter(r => r.clientes?.lat && r.clientes?.lng);
        console.log(`Linked & Active: ${mapFetch.length}`);
        console.log(`Linked & Active & With Coords: ${withCoords.length}`);
        if (mapFetch.length > 0 && withCoords.length === 0) {
            console.log("SAMPLE LINKED RECORD (No coords?):", mapFetch[0]);
        }
    }
}

diagnoseOrphans();
