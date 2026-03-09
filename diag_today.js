import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrphanClients() {
    const today = '2026-03-05';
    console.log(`Checking for records in 'clientes' created on or after: ${today}`);

    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .gte('created_at', today);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} clients.`);
    data.forEach(c => {
        console.log(`- ID: ${c.id}, Name: ${c.nombre}, Local: ${c.nombre_local}, Created: ${c.created_at}`);
    });
}

checkOrphanClients();
