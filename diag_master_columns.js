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

    console.log("Checking columns in 'clientes' master table...");
    const { data, error } = await supabase.from('clientes').select('*').limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else if (data && data.length > 0) {
        console.log("Found keys:", Object.keys(data[0]));
        console.log("Sample Data:", data[0]);
    } else {
        console.log("No master client data found.");
    }
}

main();
