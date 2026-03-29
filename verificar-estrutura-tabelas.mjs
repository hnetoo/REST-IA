import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarEstruturaTabelas() {
  try {
    console.log('🔍 VERIFICANDO ESTRUTURA DAS TABELAS');
    console.log('====================================');
    
    // 1. Verificar estrutura da tabela financial_history
    console.log('\n📊 ESTRUTURA DA TABELA: financial_history');
    try {
      const { data: columnsData, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'financial_history' });

      if (columnsError) {
        console.error('❌ Erro ao buscar colunas de financial_history:', columnsError);
        
        // Tentar buscar dados para ver as colunas
        console.log('\n🔄 TENTANDO BUSCAR DADOS PARA VER COLUNAS...');
        const { data: testData, error: testError } = await supabase
          .from('financial_history')
          .select('*')
          .limit(1);

        if (testError) {
          console.error('❌ Erro ao buscar dados de financial_history:', testError);
        } else if (testData && testData.length > 0) {
          console.log('✅ COLUNAS ENCONTRADAS (via dados):');
          Object.keys(testData[0]).forEach(key => {
            console.log(`   - ${key}: ${typeof testData[0][key]} = ${testData[0][key]}`);
          });
        } else {
          console.log('⚠️ Tabela financial_history está vazia');
        }
      } else {
        console.log('✅ COLUNAS DE FINANCIAL_HISTORY:');
        columnsData.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
      }
    } catch (e) {
      console.error('❌ Exceção ao verificar financial_history:', e);
    }

    // 2. Verificar estrutura da tabela external_history
    console.log('\n📊 ESTRUTURA DA TABELA: external_history');
    try {
      const { data: externalData, error: externalError } = await supabase
        .from('external_history')
        .select('*')
        .limit(1);

      if (externalError) {
        console.error('❌ Erro ao buscar dados de external_history:', externalError);
      } else if (externalData && externalData.length > 0) {
        console.log('✅ COLUNAS ENCONTRADAS EM EXTERNAL_HISTORY:');
        Object.keys(externalData[0]).forEach(key => {
          console.log(`   - ${key}: ${typeof externalData[0][key]} = ${externalData[0][key]}`);
        });
      } else {
        console.log('⚠️ Tabela external_history está vazia');
      }
    } catch (e) {
      console.error('❌ Exceção ao verificar external_history:', e);
    }

    // 3. Inserir 8 milhões na tabela correta
    console.log('\n💰 INSERINDO 8.000.000 Kz NA TABELA CORRETA...');
    
    // Tentar external_history primeiro
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('external_history')
        .insert({
          description: 'Saldo Histórico Consolidado - 8 Milhões',
          valor: 8000000,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao inserir em external_history:', insertError);
        
        // Tentar com colunas diferentes
        console.log('\n🔄 TENTANDO COM OUTRAS COLUNAS...');
        const { data: altData, error: altError } = await supabase
          .from('external_history')
          .insert({
            valor: 8000000,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (altError) {
          console.error('❌ Erro na inserção alternativa:', altError);
        } else {
          console.log('✅ INSERIDO COM SUCESSO (alternativa)!');
          console.log('   ID:', altData.id);
          console.log('   Valor:', Number(altData.valor).toLocaleString('pt-AO'), 'Kz');
        }
      } else {
        console.log('✅ INSERIDO COM SUCESSO EM EXTERNAL_HISTORY!');
        console.log('   ID:', insertData.id);
        console.log('   Descrição:', insertData.description);
        console.log('   Valor:', Number(insertData.valor).toLocaleString('pt-AO'), 'Kz');
      }
    } catch (e) {
      console.error('❌ Exceção na inserção:', e);
    }

    // 4. Verificar resultado final
    console.log('\n🔍 VERIFICANDO RESULTADO FINAL...');
    const { data: finalData, error: finalError } = await supabase
      .from('external_history')
      .select('*');

    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError);
    } else {
      console.log('✅ VERIFICAÇÃO FINAL CONCLUÍDA!');
      console.log('📊 DADOS FINAIS EM EXTERNAL_HISTORY:');
      finalData.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}`);
        Object.keys(item).forEach(key => {
          console.log(`      ${key}: ${item[key]}`);
        });
        console.log('');
      });

      const totalFinal = finalData.reduce((acc, item) => acc + (Number(item.valor || 0)), 0) || 0;
      console.log(`💰 TOTAL FINAL: ${totalFinal.toLocaleString('pt-AO')} Kz`);
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
  }
}

verificarEstruturaTabelas();
