import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSubs() {
    const { data, error } = await supabase.from('push_subscriptions').select('*');
    if (error) {
        console.error("Error reading database:", error);
    } else {
        console.log("Subscriptions Found:", data.length);
        console.log(data);
    }
}
checkSubs();
