
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function check() {
    const { count: total } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    const { count: activos } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true);
    const { count: inactivos } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', false);
    const { count: nullActivo } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).is('activo', null);

    console.log("Total en clientes:", total);
    console.log("  activo=true:", activos);
    console.log("  activo=false:", inactivos);
    console.log("  activo=null:", nullActivo);

    // Sample of inactive ones
    const { data: sample } = await supabase.from('clientes').select('id, nombre, activo').eq('activo', false).limit(5);
    console.log("  Sample inactivos:", sample);
}
check();
