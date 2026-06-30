import { createClient } from '@supabase/supabase-js';

// CREDENCIAIS PADRÃO (projecto de desenvolvimento / fallback)
const DEV_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

// Ler credenciais do cliente guardadas no localStorage (primeiro uso / novo cliente)
// Se vazio → usar credenciais de desenvolvimento como fallback (comportamento actual preservado)
const storedUrl = (typeof window !== 'undefined' && window.localStorage?.getItem('SUPABASE_URL')) || '';
const storedKey = (typeof window !== 'undefined' && window.localStorage?.getItem('SUPABASE_ANON_KEY')) || '';

const supabaseUrl = storedUrl || DEV_URL;
const supabaseAnonKey = storedKey || DEV_KEY;

// Extrair ref do projecto para a storageKey (funciona com qualquer projecto)
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'default';

// ÚNICA EXPORTAÇÃO - FOLHA MORTA DA ÁRVORE
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: `sb-${projectRef}-auth-token`,
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
