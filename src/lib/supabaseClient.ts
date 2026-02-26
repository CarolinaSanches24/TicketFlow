import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('CONFIGURAÇÃO AUSENTE: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no ambiente.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
