import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ [HAV Portal] Las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en el archivo .env.");
  console.warn("Inicializando cliente Supabase ficticio para evitar el bloqueo de la aplicación (Pantalla en blanco).");

  // Cliente Proxy temporal seguro para no romper la carga de la UI
  supabaseClient = {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  };
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;

