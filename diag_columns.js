import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU2NzIyMCwiZXhwIjoyMDc5MTQzMjIwfQ.cIsYd6gD-j05zK8e_9M3QJkH4XlU6d_uO-46-H-P9Kk"
);

async function checkColumns() {
    console.log("=== Checking 'clientes' ===");
    let { data: cData, error: cErr } = await supabase.from('clientes').select('*').limit(1);
    if (cErr) console.log("Error clientes:", cErr);
    else console.log("Data clientes:", cData);

    console.log("=== Checking 'empresa_cliente' ===");
    let { data: ecData, error: ecErr } = await supabase.from('empresa_cliente').select('*').limit(1);
    if (ecErr) console.log("Error empresa_cliente:", ecErr);
    else console.log("Data empresa_cliente:", ecData);
}

checkColumns();
