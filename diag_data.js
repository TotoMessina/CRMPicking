import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU2NzIyMCwiZXhwIjoyMDc5MTQzMjIwfQ.cIsYd6gD-j05zK8e_9M3QJkH4XlU6d_uO-46-H-P9Kk"
);

async function check() {
    const PICKINGUP_ID = '302444cf-9e6b-4127-b018-6c0d1972b276';
    
    console.log("Fetching sample data for PickingUp...");
    const { data: ec, error: e1 } = await supabase.from('empresa_cliente').select('id, estado, situacion, tipo_contacto').eq('empresa_id', PICKINGUP_ID).limit(5);
    console.log("Sample empresa_cliente Error:", e1 || "No error");
    console.log("Sample empresa_cliente Data:", ec);
    
    const { count, error: e2 } = await supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', PICKINGUP_ID);
    console.log("Total Count Error:", e2 || "No error");
    console.log("Total in empresa_cliente:", count);
}
check();
