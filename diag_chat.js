import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU2NzIyMCwiZXhwIjoyMDc5MTQzMjIwfQ.cIsYd6gD-j05zK8e_9M3QJkH4XlU6d_uO-46-H-P9Kk"
);

async function checkChat() {
    console.log("=== Checking mensajes_chat schema ===");
    let { data, error } = await supabase.from('mensajes_chat').select('*').limit(1);
    console.log("Data:", data);
    console.log("Error:", error);
}

checkChat();
