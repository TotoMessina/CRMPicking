import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    "https://mflftikcvsnniwwanrkj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY"
);

async function checkContactVisibility() {
    // This is the anon key, so it will respect RLS.
    // We can't log in here easily without user password, but we can check the policy name if possible or just try to select.
    console.log("=== Checking empresa_usuario visibility (Anon/RLS) ===");
    let { data, error } = await supabase.from('empresa_usuario').select('*');
    console.log("Data count:", data?.length);
    console.log("Error:", error);
}

checkContactVisibility();
