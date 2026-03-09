
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log("Diagnostic of 'clientes' table (Direct):");

    // Total count
    const { count, error } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
    console.log("Total clients in table:", count, error?.message || "");

    // Count with location
    const { count: locCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
        .not('lat', 'is', null)
        .not('lng', 'is', null);
    console.log("Clients with lat/lng:", locCount);

    // Sample data to check types
    const { data } = await supabase.from('clientes').select('id, nombre, lat, lng').limit(5);
    console.log("Sample clients:", data);
}

diagnose();
