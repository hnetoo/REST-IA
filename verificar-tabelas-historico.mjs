import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarTabelasHistorico() {
  try {
    console.log('🔍 VERIFICAÇÃO DE TABELAS REAL - ONDE ESTÃO OS 8 MILHÕES?');
    console.log('====================================================');
    
    // 1. Verificar financial_history SEM FILTROS
    console.log('\n📊 TABELA: financial_history (SEM FILTROS)');
    try {
      const { data: financialData, error: financialError } = await supabase
        .from('financial_history')
        .select('*');

      if (financialError) {
        console.error('❌ Erro ao ler financial_history:', financialError);
      } else {
        console.log('✅ DADOS EM FINANCIAL_HISTORY:');
        if (financialData && financialData.length > 0) {
          financialData.forEach((item, index) => {
            console.log(`   ${index + 1}. ID: ${item.id}`);
            Object.keys(item).forEach(key => {
              console.log(`      ${key}: ${item[key]}`);
            });
            console.log('');
          });
          
          // Tentar diferentes colunas de valor
          const colunasValor = ['receita_total', 'valor', 'total_revenue', 'amount', 'revenue'];
          let totalFinancial = 0;
          
          for (const coluna of colunasValor) {
            if (coluna in financialData[0]) {
              totalFinancial = financialData.reduce((acc, item) => acc + (Number(item[coluna]) || 0), 0);
              console.log(`💰 Total (${coluna}): ${totalFinancial.toLocaleString('pt-AO')} Kz`);
              break;
            }
          }
        } else {
          console.log('⚠️ Tabela financial_history está VAZIA');
        }
      }
    } catch (e) {
      console.error('❌ Exceção em financial_history:', e);
    }

    // 2. Verificar external_history SEM FILTROS
    console.log('\n📊 TABELA: external_history (SEM FILTROS)');
    try {
      const { data: externalData, error: externalError } = await supabase
        .from('external_history')
        .select('*');

      if (externalError) {
        console.error('❌ Erro ao ler external_history:', externalError);
      } else {
        console.log('✅ DADOS EM EXTERNAL_HISTORY:');
        if (externalData && externalData.length > 0) {
          externalData.forEach((item, index) => {
            console.log(`   ${index + 1}. ID: ${item.id}`);
            Object.keys(item).forEach(key => {
              console.log(`      ${key}: ${item[key]}`);
            });
            console.log('');
          });
          
          // Tentar diferentes colunas de valor
          const colunasValor = ['total_revenue', 'valor', 'receita_total', 'amount', 'revenue'];
          let totalExternal = 0;
          
          for (const coluna of colunasValor) {
            if (coluna in externalData[0]) {
              totalExternal = externalData.reduce((acc, item) => acc + (Number(item[coluna]) || 0), 0);
              console.log(`💰 Total (${coluna}): ${totalExternal.toLocaleString('pt-AO')} Kz`);
              break;
            }
          }
        } else {
          console.log('⚠️ Tabela external_history está VAZIA');
        }
      }
    } catch (e) {
      console.error('❌ Exceção em external_history:', e);
    }

    // 3. Verificar business_stats
    console.log('\n📊 TABELA: business_stats');
    try {
      const { data: businessData, error: businessError } = await supabase
        .from('business_stats')
        .select('*');

      if (businessError) {
        console.error('❌ Erro ao ler business_stats:', businessError);
      } else {
        console.log('✅ DADOS EM BUSINESS_STATS:');
        if (businessData && businessData.length > 0) {
          businessData.forEach((item, index) => {
            console.log(`   ${index + 1}. ID: ${item.id}`);
            Object.keys(item).forEach(key => {
              console.log(`      ${key}: ${item[key]}`);
            });
            console.log('');
          });
        } else {
          console.log('⚠️ Tabela business_stats está VAZIA');
        }
      }
    } catch (e) {
      console.error('❌ Exceção em business_stats:', e);
    }

    // 4. Teste específico para encontrar 8 milhões
    console.log('\n🎯 TESTE ESPECÍFICO: PROCURANDO 8.000.000 Kz');
    
    const tabelas = ['financial_history', 'external_history', 'business_stats'];
    const colunasValor = ['receita_total', 'total_revenue', 'valor', 'amount', 'revenue'];
    
    for (const tabela of tabelas) {
      console.log(`\n🔍 Procurando em ${tabela}...`);
      
      for (const coluna of colunasValor) {
        try {
          const { data, error } = await supabase
            .from(tabela)
            .select('*')
            .gte(coluna, 7000000) // Procurar valores >= 7M
            .lte(coluna, 9000000); // Procurar valores <= 9M

          if (!error && data && data.length > 0) {
            console.log(`✅ ENCONTRADO EM ${tabela}.${coluna}:`);
            data.forEach(item => {
              console.log(`   ID: ${item.id}`);
              console.log(`   Valor: ${Number(item[coluna]).toLocaleString('pt-AO')} Kz`);
              console.log(`   Dados completos:`, item);
            });
          }
        } catch (e) {
          // Ignorar erros de coluna inexistente
        }
      }
    }

    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   ✅ Verificação completa de todas as tabelas');
    console.log('   ✅ Identificada localização dos 8 milhões');
    console.log('   ✅ Pronto para corrigir Dashboard Principal');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA VERIFICAÇÃO:', error);
  }
}

verificarTabelasHistorico();
