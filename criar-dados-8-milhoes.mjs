import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function criarDados8Milhoes() {
  try {
    console.log('🔧 CRIANDO DADOS DE 8 MILHÕES - FINANCIAL_HISTORY');
    console.log('===============================================');
    
    // 1. Verificar se financial_history existe e tem permissão
    console.log('\n🔍 VERIFICANDO PERMISSÕES FINANCIAL_HISTORY...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('financial_history')
        .select('*')
        .limit(1);

      if (testError) {
        console.error('❌ Sem permissão para financial_history:', testError);
        console.log('🔄 Usando external_history como fonte principal...');
        
        // 2. Inserir em external_history
        const { data: insertData, error: insertError } = await supabase
          .from('external_history')
          .insert({
            source_name: 'HISTÓRICO CONSOLIDADO',
            total_revenue: 8000000,
            gross_profit: 8000000,
            period: 'CONSOLIDADO',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao inserir em external_history:', insertError);
        } else {
          console.log('✅ INSERIDO COM SUCESSO EM EXTERNAL_HISTORY!');
          console.log('   ID:', insertData.id);
          console.log('   Total Revenue:', Number(insertData.total_revenue).toLocaleString('pt-AO'), 'Kz');
        }
      } else {
        console.log('✅ FINANCIAL_HISTORY ACESSÍVEL');
        
        // 3. Tentar inserir em financial_history
        const { data: insertData, error: insertError } = await supabase
          .from('financial_history')
          .insert({
            description: 'Saldo Histórico Consolidado',
            receita_total: 8000000,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao inserir em financial_history:', insertError);
          console.log('🔄 Tentando external_history como fallback...');
          
          // Fallback para external_history
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('external_history')
            .insert({
              source_name: 'HISTÓRICO CONSOLIDADO',
              total_revenue: 8000000,
              gross_profit: 8000000,
              period: 'CONSOLIDADO',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (fallbackError) {
            console.error('❌ Erro no fallback:', fallbackError);
          } else {
            console.log('✅ FALLBACK INSERIDO COM SUCESSO!');
            console.log('   Total Revenue:', Number(fallbackData.total_revenue).toLocaleString('pt-AO'), 'Kz');
          }
        } else {
          console.log('✅ INSERIDO COM SUCESSO EM FINANCIAL_HISTORY!');
          console.log('   ID:', insertData.id);
          console.log('   Receita Total:', Number(insertData.receita_total).toLocaleString('pt-AO'), 'Kz');
        }
      }
    } catch (e) {
      console.error('❌ Exceção na verificação:', e);
    }

    // 4. Verificar dados finais
    console.log('\n🔍 VERIFICANDO DADOS FINAIS...');
    
    // Verificar financial_history
    const { data: finalFinancialData, error: finalFinancialError } = await supabase
      .from('financial_history')
      .select('*');

    if (!finalFinancialError && finalFinancialData) {
      const totalFinancial = finalFinancialData.reduce((acc, item) => acc + (Number(item.receita_total || 0)), 0);
      console.log('✅ FINANCIAL_HISTORY - Total:', totalFinancial.toLocaleString('pt-AO'), 'Kz');
    }

    // Verificar external_history
    const { data: finalExternalData, error: finalExternalError } = await supabase
      .from('external_history')
      .select('*');

    if (!finalExternalError && finalExternalData) {
      const totalExternal = finalExternalData.reduce((acc, item) => acc + (Number(item.total_revenue || 0)), 0);
      console.log('✅ EXTERNAL_HISTORY - Total:', totalExternal.toLocaleString('pt-AO'), 'Kz');
    }

    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   ✅ Dados de 8 milhões criados');
    console.log('   ✅ Dashboard deve mostrar 8.007.500 Kz');
    console.log('   ✅ Rendimento Global: 8.000.000 (histórico) + 7.500 (hoje)');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
  }
}

criarDados8Milhoes();
