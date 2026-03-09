
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function check() {
    const PICKINGUP_ID = '302444cf-9e6b-4127-b018-6c0d1972b276';

    const { count: total } = await supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', PICKINGUP_ID);
    const { count: activos } = await supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', PICKINGUP_ID).eq('activo', true);
    const { count: inactivos } = await supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', PICKINGUP_ID).eq('activo', false);
    const { count: nullActivo } = await supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', PICKINGUP_ID).is('activo', null);

    console.log("Total en empresa_cliente (PickingUp):", total);
    console.log("  activo=true:", activos);
    console.log("  activo=false:", inactivos);
    console.log("  activo=null:", nullActivo);
}
check();
