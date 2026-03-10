import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Verificar se as variáveis de ambiente estão chegando
console.log('[SUPABASE] Config:', {
  url: supabaseUrl ? 'URL definida' : 'URL undefined',
  key: supabaseAnonKey ? 'KEY definida' : 'KEY undefined',
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseAnonKey?.length || 0
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] Erro: Variáveis de ambiente não encontradas');
  console.error('[SUPABASE] Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
