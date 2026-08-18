import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://mflftikcvsnniwwanrkj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY'
);

async function check() {
  const { data: emp } = await s.from('empresas').select('id').limit(1);
  const empresaId = emp?.[0]?.id;
  console.log('Empresa ID:', empresaId);

  if (empresaId) {
    const { data: ins, error: insErr } = await s.from('llamadas').insert({
      empresa_id: empresaId,
      nombre: '__test__',
      telefono: '0000000000',
    }).select().single();
    console.log('Insert result:', ins, 'Error:', insErr);

    if (ins?.id) {
      await s.from('llamadas').delete().eq('id', ins.id);
      console.log('Cleaned up test row');
    }
  }
}

check();
