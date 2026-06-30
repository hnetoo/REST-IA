import { createClient } from '@supabase/supabase-js';

// ISOLAMENTO TOTAL DO CLIENTE - NÃO IMPORTA MAIS NADA
const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

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
