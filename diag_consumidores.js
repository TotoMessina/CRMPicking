import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Logging in...");
    await supabase.auth.signInWithPassword({
        email: 'lucastotomessina@gmail.com',
        password: 'Toto2003'
    });

    console.log("Checking session...");
    const { data: { session } } = await supabase.auth.getSession();
    console.log("User UID:", session?.user?.id);

    console.log("Querying 'consumidores' table...");
    const { data, error, count } = await supabase
        .from('consumidores')
        .select('*', { count: 'exact' });

    if (error) {
        console.error("Error query:", error.message);
    } else {
        console.log("Total consumidores found (with RLS if active):", count);
        if (data && data.length > 0) {
            console.log("Sample consumer:", data[0]);
            const companies = [...new Set(data.map(c => c.empresa_id))];
            console.log("Unique empresa_ids in 'consumidores':", companies);
        } else {
            console.log("No data returned from 'consumidores'.");
        }
    }

    console.log("Checking if RLS is enabled and policies (via RPC or common knowledge)...");
    // We don't have a direct tool to check RLS status besides trying to read.
}

main();
