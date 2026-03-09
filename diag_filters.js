import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function testFilters() {
    const PICKINGUP_ID = '302444cf-9e6b-4127-b018-6c0d1972b276';

    console.log("=== Testing RPC Filter Strictness ===");

    let rpcReq2 = await supabase.rpc('buscar_clientes_empresa', {
        p_empresa_id: PICKINGUP_ID,
        p_estado: 'VALOR_FALSO_QUE_DEBERIA_DAR_CERO',
        p_limit: 25,
        p_offset: 0
    });
    console.log("RPC Fake Status Filter count:", rpcReq2.data?.length, rpcReq2.error);

    let rpcReq3 = await supabase.rpc('buscar_clientes_empresa', {
        p_empresa_id: PICKINGUP_ID,
        p_nombre: 'VALOR_FALSO_TXT',
        p_limit: 25,
        p_offset: 0
    });
    console.log("RPC Fake Text Filter count:", rpcReq3.data?.length, rpcReq3.error);
}

testFilters();
