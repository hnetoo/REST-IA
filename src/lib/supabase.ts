import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

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

// Exportar chave secreta para operações admin
export const supabaseSecretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA3NzkzOSwiZXhwIjoyMDg4NjUzOTM5fQ.XuG0V0cxLeoBbkAVcH4kYg_OLpvunUM';
