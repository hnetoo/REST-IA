import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarFinancialHistory() {
  try {
    console.log('🔍 VERIFICAÇÃO DOS 8 MILHÕES - FINANCIAL_HISTORY');
    console.log('===============================================');
    
    // 1. Verificar tabela financial_history
    console.log('\n📊 TABELA: financial_history');
    const { data: financialHistoryData, error: financialHistoryError } = await supabase
      .from('financial_history')
      .select('*');

    if (financialHistoryError) {
      console.error('❌ Erro ao buscar financial_history:', financialHistoryError);
      return;
    }

    if (!financialHistoryData || financialHistoryData.length === 0) {
      console.log('⚠️ Tabela financial_history está VAZIA');
      return;
    }

    console.log('✅ DADOS ENCONTRADOS EM FINANCIAL_HISTORY:');
    financialHistoryData.forEach((item, index) => {
      console.log(`   ${index + 1}. ID: ${item.id}`);
      console.log(`      Descrição: ${item.description || 'N/A'}`);
      console.log(`      Receita Total: ${Number(item.receita_total || 0).toLocaleString('pt-AO')} Kz`);
      console.log(`      Data: ${item.created_at || 'N/A'}`);
      console.log('');
    });

    const totalFinancialHistory = financialHistoryData.reduce((acc, item) => acc + (Number(item.receita_total) || 0), 0);
    console.log(`💰 TOTAL FINANCIAL_HISTORY: ${totalFinancialHistory.toLocaleString('pt-AO')} Kz`);

    // 2. Verificar tabela business_stats
    console.log('\n📊 TABELA: business_stats');
    const { data: businessStatsData, error: businessStatsError } = await supabase
      .from('business_stats')
      .select('*');

    if (businessStatsError) {
      console.error('❌ Erro ao buscar business_stats:', businessStatsError);
    } else if (!businessStatsData || businessStatsData.length === 0) {
      console.log('⚠️ Tabela business_stats está VAZIA');
    } else {
      console.log('✅ DADOS ENCONTRADOS EM BUSINESS_STATS:');
      businessStatsData.forEach((item, index) => {
        console.log(`   ${index + 1}. ID: ${item.id}`);
        console.log(`      Total Revenue: ${Number(item.total_revenue || 0).toLocaleString('pt-AO')} Kz`);
        console.log(`      Data: ${item.created_at || 'N/A'}`);
        console.log('');
      });

      const totalBusinessStats = businessStatsData.reduce((acc, item) => acc + (Number(item.total_revenue) || 0), 0);
      console.log(`💰 TOTAL BUSINESS_STATS: ${totalBusinessStats.toLocaleString('pt-AO')} Kz`);
    }

    // 3. Verificar vendas de hoje
    console.log('\n📊 VENDAS DE HOJE (ORDERS)');
    const hoje = new Date().toISOString().split('T')[0];
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .in('status', ['closed', 'paid'])
      .gte('created_at', hoje);

    if (ordersError) {
      console.error('❌ Erro ao buscar orders:', ordersError);
    } else {
      const totalVendasHoje = ordersData?.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0) || 0;
      console.log(`💰 TOTAL VENDAS HOJE: ${totalVendasHoje.toLocaleString('pt-AO')} Kz`);
    }

    // 4. Cálculo final
    const totalBusinessStats = businessStatsData?.reduce((acc, item) => acc + (Number(item.total_revenue) || 0), 0) || 0;
    const totalVendasHoje = ordersData?.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0) || 0;
    const rendimentoGlobalEsperado = totalFinancialHistory + totalBusinessStats + totalVendasHoje;

    console.log('\n🎯 CÁLCULO FINAL - RENDIMENTO GLOBAL ESPERADO:');
    console.log(`   Financial History: ${totalFinancialHistory.toLocaleString('pt-AO')} Kz`);
    console.log(`   Business Stats: ${totalBusinessStats.toLocaleString('pt-AO')} Kz`);
    console.log(`   Vendas Hoje: ${totalVendasHoje.toLocaleString('pt-AO')} Kz`);
    console.log(`   ---------------------------------------------`);
    console.log(`   💰 RENDIMENTO GLOBAL: ${rendimentoGlobalEsperado.toLocaleString('pt-AO')} Kz`);

    // 5. Verificação se os 8 milhões existem
    if (totalFinancialHistory >= 8000000) {
      console.log('\n✅ CONFIRMADO: Os 8.000.000 Kz existem na financial_history!');
      console.log('❌ PROBLEMA: O Dashboard da App Principal não está somando este valor.');
    } else {
      console.log('\n❌ PROBLEMA: Os 8.000.000 Kz NÃO foram encontrados na financial_history.');
      console.log(`   Valor encontrado: ${totalFinancialHistory.toLocaleString('pt-AO')} Kz`);
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA VERIFICAÇÃO:', error);
  }
}

verificarFinancialHistory();
