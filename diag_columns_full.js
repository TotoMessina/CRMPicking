import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
    // We try to get one record from clientes to see all its columns
    // We might need to use a linked one if orphans are blocked by RLS
    const { data, error } = await supabase.from('clientes').select('*').limit(1);

    if (error) {
        console.error("Error fetching clientes:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns in 'clientes' table:", Object.keys(data[0]));
        console.log("Sample data:", data[0]);
    } else {
        console.log("No data found in 'clientes' table.");
    }
}

checkColumns();
