import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Faltan las variables de entorno de Supabase en el archivo .env");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    global: {
        fetch: async (...args) => {
            try {
                const res = await fetch(...args);
                if (!res.ok && res.status >= 500) {
                    window.dispatchEvent(new CustomEvent('supabase-error', { detail: 'server-error' }));
                }
                return res;
            } catch (err: any) {
                if (err.message?.toLowerCase().includes('failed to fetch')) {
                    window.dispatchEvent(new CustomEvent('supabase-error', { detail: 'network-error' }));
                }
                throw err;
            }
        }
    }
});
