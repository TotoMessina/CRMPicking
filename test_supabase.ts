import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mflftikcvsnniwwanrkj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert...');
  const { data, error } = await supabase.from('ai_unknown_queries').insert({
    query: 'test_query_from_script',
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error('Insert Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert Success:', data);
  }
}

testInsert();
