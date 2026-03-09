const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://mflftikcvsnniwwanrkj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "..."; // I will not put it in the thought but I will try to read it from .env or just use the one from diag_columns_full.js if it was there.
// Actually diag_columns_full.js had the anon key. I need the service role key.
// I'll read .env file.
