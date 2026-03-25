import { createClient } from '@supabase/supabase-js';

// Tentar obter variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

// Verificar se estamos em ambiente Tauri/Windows
const isTauri = !!(window as any).__TAURI_INTERNALS__;

console.log('[SUPABASE DEBUG] Inicializando cliente...');
console.log('[SUPABASE DEBUG] URL:', supabaseUrl);
console.log('[SUPABASE DEBUG] Key presente:', !!supabaseAnonKey);
console.log('[SUPABASE DEBUG] Ambiente:', isTauri ? 'Tauri/Windows' : 'Web');
console.log('[SUPABASE DEBUG] import.meta.env:', import.meta.env);

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('[SUPABASE CRITICAL] Variáveis de ambiente não encontradas!');
  console.error('[SUPABASE CRITICAL] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.error('[SUPABASE CRITICAL] VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
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

// Adicionar logs detalhados para debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[SUPABASE AUTH] State change:', event);
  console.log('[SUPABASE AUTH] Session user:', session?.user?.id || 'no session');
  console.log('[SUPABASE AUTH] Session expires:', session?.expires_at || 'no expiry');
  if (event === 'SIGNED_OUT') {
    console.warn('[SUPABASE AUTH] User signed out');
  }
  if (event === 'TOKEN_REFRESHED') {
    console.info('[SUPABASE AUTH] Token refreshed successfully');
  }
});

// Verificar sessão atual com logs detalhados
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.error('[SUPABASE SESSION] Erro ao obter sessão:', error);
    console.error('[SUPABASE SESSION] Error details:', {
      message: error.message,
      status: error.status,
      code: error.code || 'UNKNOWN'
    });
  } else {
    console.log('[SUPABASE SESSION] Sessão obtida com sucesso');
    console.log('[SUPABASE SESSION] User ID:', session?.user?.id || 'no session');
    console.log('[SUPABASE SESSION] User email:', session?.user?.email || 'no email');
    console.log('[SUPABASE SESSION] Session valid until:', session?.expires_at || 'no expiry');
  }
});

// Teste de conexão com a base de dados
const testConnection = async () => {
  try {
    console.log('[SUPABASE DB] Testando conexão com a base de dados...');
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('[SUPABASE DB] Erro no teste de conexão:', error);
      console.error('[SUPABASE DB] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('[SUPABASE DB] Conexão bem-sucedida! Categories encontradas:', data?.length || 0);
    }
  } catch (err) {
    console.error('[SUPABASE DB] Erro crítico no teste de conexão:', err);
  }
};

// Executar teste após 1 segundo
setTimeout(testConnection, 1000);
