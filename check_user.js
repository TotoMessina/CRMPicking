import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Logging in as Toto...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'lucastotomessina@gmail.com',
        password: 'Toto2003'
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }
    console.log("Logged in:", authData.user.email);

    const { data: userRow, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', authData.user.email)
        .single();

    if (userError) {
        console.error("User row error:", userError.message);
    } else {
        console.log("Current user row:", userRow);
    }

    console.log("\nListing all users...");
    const { data: allUsers, error: allUsersError } = await supabase
        .from('usuarios')
        .select('email, nombre, role');

    if (allUsersError) {
        console.error("List users error:", allUsersError.message);
    } else {
        console.log("Found", allUsers.length, "users.");
        allUsers.forEach(u => console.log(`- ${u.email}: ${u.role}`));
    }
}

main();
