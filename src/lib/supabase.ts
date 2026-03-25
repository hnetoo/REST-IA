import { createClient } from '@supabase/supabase-js';

// Tentar obter variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

// Verificar se estamos em ambiente Tauri/Windows
const isTauri = !!(window as any).__TAURI_INTERNALS__;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[SUPABASE] Variáveis de ambiente não encontradas, usando fallback para Windows/Tauri');
  console.log('[SUPABASE] URL:', supabaseUrl);
  console.log('[SUPABASE] Ambiente:', isTauri ? 'Tauri/Windows' : 'Web');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Evita tentativas de detetar sessão a partir de URLs de navegação/hash
      // (pode causar erros repetidos no POS em rotas com fragmento)
      detectSessionInUrl: false,
      storageKey: 'rest-ia-auth',
      storage: window.localStorage
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'rest-ia-app/1.0.0'
      }
    }
  }
);
