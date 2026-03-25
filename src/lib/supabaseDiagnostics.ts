import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  console.log('[DIAGNOSTIC] Iniciando diagnóstico do Supabase...');
  
  try {
    // 1. Verificar conexão básica
    console.log('[DIAGNOSTIC] 1. Testando conexão básica...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      console.error('[DIAGNOSTIC] ❌ Erro de conexão:', connectionError);
      return { success: false, error: connectionError };
    }
    
    console.log('[DIAGNOSTIC] ✅ Conexão básica OK');
    
    // 2. Verificar autenticação
    console.log('[DIAGNOSTIC] 2. Verificando autenticação...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('[DIAGNOSTIC] ❌ Erro de autenticação:', authError);
    } else if (session) {
      console.log('[DIAGNOSTIC] ✅ Usuário autenticado:', session.user.id);
    } else {
      console.log('[DIAGNOSTIC] ⚠️ Nenhum usuário autenticado (modo anônimo)');
    }
    
    // 3. Testar permissões de escrita
    console.log('[DIAGNOSTIC] 3. Testando permissões de escrita...');
    const testOrder = {
      table_id: 'test',
      total_amount: 100,
      status: 'ABERTO',
      created_at: new Date().toISOString()
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();
    
    if (insertError) {
      console.error('[DIAGNOSTIC] ❌ Erro de inserção:', insertError);
      
      // Verificar se é erro de permissão
      if (insertError.code === '42501' || insertError.message.includes('permission')) {
        console.error('[DIAGNOSTIC] ❌ ERRO DE PERMISSÃO - Verificar RLS policies no Supabase');
        return { success: false, error: insertError, type: 'PERMISSION_ERROR' };
      }
    } else {
      console.log('[DIAGNOSTIC] ✅ Inserção bem-sucedida, ID:', insertTest.id);
      
      // Limpar teste
      await supabase.from('orders').delete().eq('id', insertTest.id);
      console.log('[DIAGNOSTIC] ✅ Teste limpo');
    }
    
    // 4. Verificar tabelas críticas
    console.log('[DIAGNOSTIC] 4. Verificando tabelas críticas...');
    const tables = ['orders', 'order_items', 'pos_tables', 'products', 'expenses'];
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.error(`[DIAGNOSTIC] ❌ Erro na tabela ${table}:`, tableError);
        } else {
          console.log(`[DIAGNOSTIC] ✅ Tabela ${table} acessível`);
        }
      } catch (err) {
        console.error(`[DIAGNOSTIC] ❌ Erro crítico na tabela ${table}:`, err);
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('[DIAGNOSTIC] ❌ Erro geral no diagnóstico:', error);
    return { success: false, error };
  }
};

// Função para executar diagnóstico automático ao iniciar
export const runAutoDiagnostics = () => {
  setTimeout(() => {
    console.log('[DIAGNOSTIC] Executando diagnóstico automático...');
    testSupabaseConnection();
  }, 2000); // Executar 2 segundos após carregar
};
