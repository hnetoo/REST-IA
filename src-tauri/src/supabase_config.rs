/// <reference types="@tauri-apps/api" />

// Configurações do Supabase para ambiente Windows
export const SUPABASE_CONFIG = {
  url: 'https://tboiuiwlqfzcvakxrsmj.supabase.co',
  anonKey: 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm',
  options: {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'rest-ia-auth',
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
};
