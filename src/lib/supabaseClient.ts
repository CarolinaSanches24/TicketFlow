import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('CONFIGURAÇÃO AUSENTE: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no ambiente.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Cliente isolado para operações como criação de usuários por admin
// sem substituir a sessão de login salva no localStorage do navegador
export const createIsolatedAuthClient = () => {
  return createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};
