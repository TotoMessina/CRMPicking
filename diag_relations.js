import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU2NzIyMCwiZXhwIjoyMDc5MTQzMjIwfQ.cIsYd6gD-j05zK8e_9M3QJkH4XlU6d_uO-46-H-P9Kk"
);

async function checkRelations() {
    console.log("=== Checking empresa_usuario schema ===");

    // Attempt standard relationship
    let { data, error } = await supabase.from('empresa_usuario').select('*, usuarios(*)').limit(1);
    console.log("Error querying using usuariosfk:", error?.message || "OK");
    console.log("Data:", data);

    // Let's get the raw columns of empresa_usuario
    let { data: raw, error: e2 } = await supabase.from('empresa_usuario').select('*').limit(1);
    console.log("Raw row:", raw);
}

checkRelations();
