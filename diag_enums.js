import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function checkEnums() {
    const PICKINGUP_ID = '302444cf-9e6b-4127-b018-6c0d1972b276';

    console.log("=== Fetching distinct states ===");

    // We can't do DISTINCT directly in JS without an RPC, so we just fetch all and map
    // Actually we can just execute the RPC with no filters to get up to 100
    let { data } = await supabase.rpc('buscar_clientes_empresa', {
        p_empresa_id: PICKINGUP_ID,
        p_limit: 500,
        p_offset: 0
    });

    if (data) {
        let estados = [...new Set(data.map(d => d.estado))].filter(Boolean);
        let situaciones = [...new Set(data.map(d => d.situacion))].filter(Boolean);
        let tipos = [...new Set(data.map(d => d.tipo_contacto))].filter(Boolean);

        console.log("Estados en la DB:", estados);
        console.log("Situaciones en la DB:", situaciones);
        console.log("Tipos en la DB:", tipos);
    } else {
        console.log("No data returned");
    }
}

checkEnums();
