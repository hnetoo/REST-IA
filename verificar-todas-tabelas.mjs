import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarTodasTabelas() {
  try {
    console.log('🔍 VERIFICAR TODAS AS TABELAS DE RENDIMENTO');
    console.log('=========================================');
    
    // 1. Verificar external_history
    console.log('\n📊 TABELA: external_history');
    const { data: externalHistoryData, error: externalHistoryError } = await supabase
      .from('external_history')
      .select('*');

    if (externalHistoryError) {
      console.error('❌ Erro ao buscar external_history:', externalHistoryError);
    } else {
      console.log('✅ DADOS ENCONTRADOS EM EXTERNAL_HISTORY:');
      externalHistoryData?.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}`);
        console.log(`      Valor: ${Number(item.valor || 0).toLocaleString('pt-AO')} Kz`);
        console.log(`      Data: ${item.created_at || 'N/A'}`);
        console.log('');
      });

      const totalExternalHistory = externalHistoryData?.reduce((acc, item) => acc + (Number(item.valor || 0)), 0) || 0;
      console.log(`💰 TOTAL EXTERNAL_HISTORY: ${totalExternalHistory.toLocaleString('pt-AO')} Kz`);
    }

    // 2. Verificar business_stats
    console.log('\n📊 TABELA: business_stats');
    const { data: businessStatsData, error: businessStatsError } = await supabase
      .from('business_stats')
      .select('*');

    if (businessStatsError) {
      console.error('❌ Erro ao buscar business_stats:', businessStatsError);
    } else {
      console.log('✅ DADOS ENCONTRADOS EM BUSINESS_STATS:');
      businessStatsData?.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}`);
        console.log(`      Total Revenue: ${Number(item.total_revenue || 0).toLocaleString('pt-AO')} Kz`);
        console.log(`      Data: ${item.created_at || 'N/A'}`);
        console.log('');
      });

      const totalBusinessStats = businessStatsData?.reduce((acc, item) => acc + (Number(item.total_revenue || 0)), 0) || 0;
      console.log(`💰 TOTAL BUSINESS_STATS: ${totalBusinessStats.toLocaleString('pt-AO')} Kz`);
    }

    // 3. Verificar todas as tabelas que possam ter os 8 milhões
    console.log('\n🔍 PROCURANDO ONDE ESTÃO OS 8 MILHÕES...');
    
    const tabelasParaVerificar = [
      'external_history',
      'business_stats', 
      'financial_history',
      'orders',
      'historico_financeiro',
      'revenue_history',
      'sales_history'
    ];

    for (const tabela of tabelasParaVerificar) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${tabela}: Erro - ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`   ✅ ${tabela}: Existe (tem dados)`);
        } else {
          console.log(`   ⚠️ ${tabela}: Vazia ou não existe`);
        }
      } catch (e) {
        console.log(`   ❌ ${tabela}: Exceção - ${e.message}`);
      }
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
  }
}

verificarTodasTabelas();
