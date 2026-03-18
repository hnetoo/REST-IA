import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function criarHistorico8Milhoes() {
  try {
    console.log('🔧 CRIANDO HISTÓRICO FINANCEIRO COM 8 MILHÕES');
    console.log('===============================================');
    
    // 1. Inserir os 8 milhões na tabela financial_history
    console.log('\n💰 INSERINDO 8.000.000 Kz EM FINANCIAL_HISTORY...');
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
      return;
    }

    console.log('✅ INSERIDO COM SUCESSO!');
    console.log('📋 DADOS INSERIDOS:');
    console.log('   ID:', insertData.id);
    console.log('   Descrição:', insertData.description);
    console.log('   Receita Total:', Number(insertData.receita_total).toLocaleString('pt-AO'), 'Kz');
    console.log('   Data:', insertData.created_at);

    // 2. Verificar se foi inserido corretamente
    console.log('\n🔍 VERIFICANDO INSERÇÃO...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('financial_history')
      .select('*');

    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError);
      return;
    }

    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('📊 TODOS OS DADOS EM FINANCIAL_HISTORY:');
    verifyData.forEach((item, index) => {
      console.log(`   ${index + 1}. ID: ${item.id}`);
      console.log(`      Descrição: ${item.description}`);
      console.log(`      Receita Total: ${Number(item.receita_total).toLocaleString('pt-AO')} Kz`);
      console.log(`      Data: ${item.created_at}`);
      console.log('');
    });

    const totalVerificado = verifyData.reduce((acc, item) => acc + (Number(item.receita_total) || 0), 0);
    console.log(`💰 TOTAL VERIFICADO: ${totalVerificado.toLocaleString('pt-AO')} Kz`);

    // 3. Atualizar business_stats também
    console.log('\n📊 ATUALIZANDO BUSINESS_STATS...');
    const { data: updateBusinessData, error: updateBusinessError } = await supabase
      .from('business_stats')
      .upsert({
        id: '8e95f891-62bf-430a-ae7c-013e30d0c81b',
        total_revenue: 8000000,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateBusinessError) {
      console.error('❌ Erro ao atualizar business_stats:', updateBusinessError);
    } else {
      console.log('✅ BUSINESS_STATS ATUALIZADO!');
      console.log('   Total Revenue:', Number(updateBusinessData.total_revenue).toLocaleString('pt-AO'), 'Kz');
    }

    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   ✅ 8.000.000 Kz inseridos em financial_history');
    console.log('   ✅ business_stats atualizado');
    console.log('   ✅ Dashboard da App Principal agora deve mostrar 8.007.500 Kz');
    console.log('   ✅ Rendimento Global: 8.000.000 (histórico) + 7.500 (hoje) = 8.007.500 Kz');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA CRIAÇÃO:', error);
  }
}

criarHistorico8Milhoes();
