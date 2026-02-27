import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGZ0aWtjdnNubml3d2FucmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjcyMjAsImV4cCI6MjA3OTE0MzIyMH0.Z_EsaegFay24E0rOoX2PpwvWasWm5tfLcJiRrgs1nBY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
