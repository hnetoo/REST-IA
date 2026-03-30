import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkCashFlowSchema() {
  console.log('🔍 Verificando schema da tabela cash_flow...');
  
  try {
    // Buscar uma linha para ver as colunas
    const { data, error } = await supabase
      .from('cash_flow')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar cash_flow:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Tabela cash_flow existe!');
      console.log('📋 Colunas:', Object.keys(data[0]));
      console.log('📊 Exemplo:', data[0]);
    } else {
      console.log('⚠️ Tabela cash_flow existe mas está vazia');
      
      // Tentar buscar schema via information_schema
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'cash_flow' });
      
      if (schemaError) {
        console.log('ℹ️ Não foi possível buscar schema via RPC');
      } else {
        console.log('📋 Schema:', schemaData);
      }
    }
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

checkCashFlowSchema();
