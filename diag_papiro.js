import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function checkPapiro() {
    const PICKINGUP_ID = '302444cf-9e6b-4127-b018-6c0d1972b276';

    let { data } = await supabase.rpc('buscar_clientes_empresa', {
        p_empresa_id: PICKINGUP_ID,
        p_nombre: 'papiro',
        p_limit: 5,
        p_offset: 0
    });

    console.log("Papiro count in PickingUp:", data?.length);
    console.log("Papiro data:", data);
}

checkPapiro();
