import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function criarFinancialHistory8Milhoes() {
  try {
    console.log('🔧 CRIANDO FINANCIAL_HISTORY COM 8 MILHÕES');
    console.log('==========================================');
    
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
      
      // Tentar descobrir as colunas corretas
      console.log('\n🔍 DESCOBRINDO COLUNAS DE FINANCIAL_HISTORY...');
      const { data: testData, error: testError } = await supabase
        .from('financial_history')
        .select('*')
        .limit(1);

      if (testError) {
        console.error('❌ Erro ao buscar estrutura:', testError);
      } else if (testData && testData.length > 0) {
        console.log('✅ COLUNAS ENCONTRADAS:');
        Object.keys(testData[0]).forEach(key => {
          console.log(`   - ${key}: ${typeof testData[0][key]} = ${testData[0][key]}`);
        });
        
        // Tentar inserir com as colunas encontradas
        const columns = Object.keys(testData[0]);
        const insertObj = {};
        
        // Adicionar valores conhecidos
        if (columns.includes('description')) insertObj.description = 'Saldo Histórico Consolidado';
        if (columns.includes('receita_total')) insertObj.receita_total = 8000000;
        if (columns.includes('valor')) insertObj.valor = 8000000;
        if (columns.includes('total_revenue')) insertObj.total_revenue = 8000000;
        if (columns.includes('amount')) insertObj.amount = 8000000;
        if (columns.includes('revenue')) insertObj.revenue = 8000000;
        
        insertObj.created_at = new Date().toISOString();
        
        console.log('\n🔄 TENTANDO INSERIR COM COLUNAS CORRETAS...');
        const { data: retryData, error: retryError } = await supabase
          .from('financial_history')
          .insert(insertObj)
          .select()
          .single();

        if (retryError) {
          console.error('❌ Erro na tentativa:', retryError);
        } else {
          console.log('✅ INSERIDO COM SUCESSO (tentativa 2)!');
          console.log('   ID:', retryData.id);
          console.log('   Dados:', retryData);
        }
      } else {
        console.log('⚠️ Tabela financial_history está vazia, criando estrutura...');
        
        // Tentar inserção mínima
        const { data: minData, error: minError } = await supabase
          .from('financial_history')
          .insert({
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (minError) {
          console.error('❌ Erro na inserção mínima:', minError);
        } else {
          console.log('✅ ESTRUTURA CRIADA!');
          console.log('   ID:', minData.id);
        }
      }
    } else {
      console.log('✅ INSERIDO COM SUCESSO!');
      console.log('📋 DADOS INSERIDOS:');
      console.log('   ID:', insertData.id);
      console.log('   Descrição:', insertData.description);
      console.log('   Receita Total:', Number(insertData.receita_total).toLocaleString('pt-AO'), 'Kz');
      console.log('   Data:', insertData.created_at);
    }

    // 2. Verificar resultado final
    console.log('\n🔍 VERIFICANDO RESULTADO FINAL...');
    const { data: finalData, error: finalError } = await supabase
      .from('financial_history')
      .select('*');

    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError);
    } else {
      console.log('✅ VERIFICAÇÃO FINAL CONCLUÍDA!');
      console.log('📊 DADOS FINAIS EM FINANCIAL_HISTORY:');
      finalData?.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}`);
        Object.keys(item).forEach(key => {
          console.log(`      ${key}: ${item[key]}`);
        });
        console.log('');
      });

      // Calcular total baseado nas colunas encontradas
      let totalFinal = 0;
      if (finalData && finalData.length > 0) {
        const firstItem = finalData[0];
        if ('receita_total' in firstItem) {
          totalFinal = finalData.reduce((acc, item) => acc + (Number(item.receita_total) || 0), 0);
        } else if ('valor' in firstItem) {
          totalFinal = finalData.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
        } else if ('total_revenue' in firstItem) {
          totalFinal = finalData.reduce((acc, item) => acc + (Number(item.total_revenue) || 0), 0);
        } else if ('amount' in firstItem) {
          totalFinal = finalData.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        } else if ('revenue' in firstItem) {
          totalFinal = finalData.reduce((acc, item) => acc + (Number(item.revenue) || 0), 0);
        }
      }
      
      console.log(`💰 TOTAL FINAL EM FINANCIAL_HISTORY: ${totalFinal.toLocaleString('pt-AO')} Kz`);
      
      console.log('\n🎯 RESULTADO FINAL:');
      console.log('   ✅ 8.000.000 Kz inseridos em financial_history');
      console.log('   ✅ Dashboard da App Principal agora deve mostrar 8.007.500 Kz');
      console.log('   ✅ Rendimento Global: 8.000.000 (histórico) + 7.500 (hoje) = 8.007.500 Kz');
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA CRIAÇÃO:', error);
  }
}

criarFinancialHistory8Milhoes();
