import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://mflftikcvsnniwwanrkj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY'
);

async function inspectLlamadas() {
  const { data: llamadas, error } = await s.from('llamadas').select('*').limit(20);
  console.log('Error:', error);
  console.log('Count:', llamadas?.length);
  if (llamadas && llamadas.length > 0) {
    console.log('Sample row:', llamadas[0]);
  }

  const { data: emp } = await s.from('empresas').select('id, nombre');
  console.log('Empresas:', emp);
}

inspectLlamadas();
