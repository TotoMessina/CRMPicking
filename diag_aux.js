import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function checkAuxTables() {
    console.log("=== Checking tareas_tablero ===");
    let { error: e1 } = await supabase.from('tareas_tablero').select('empresa_id').limit(1);
    console.log("tareas_tablero error:", e1?.message || "OK");

    console.log("=== Checking turnos ===");
    let { error: e2 } = await supabase.from('turnos').select('empresa_id').limit(1);
    console.log("turnos error:", e2?.message || "OK");

    console.log("=== Checking actividades ===");
    let { error: e3 } = await supabase.from('actividades').select('empresa_id').limit(1);
    console.log("actividades error:", e3?.message || "OK");
}

checkAuxTables();
