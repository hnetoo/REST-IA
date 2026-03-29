import { createClient } from '@supabase/supabase-js';

// ISOLAMENTO TOTAL DO CLIENTE - NÃO IMPORTA MAIS NADA
const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

// ÚNICA EXPORTAÇÃO - FOLHA MORTA DA ÁRVORE
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-tboiuiwlqfzcvakxrsmj-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    realtime: {
      params: {
        headers: {
          'x-client-info': 'rest-ia-windows-app'
        }
      }
    },
    global: {
      headers: {
        'x-client-info': 'rest-ia-windows-app'
      }
    },
    db: {
      schema: 'public'
    }
  }
);

export default supabase;
