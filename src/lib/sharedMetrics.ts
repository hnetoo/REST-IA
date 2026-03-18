import { supabase } from './supabase';

// Função compartilhada para buscar métricas de vendas do dia
export const fetchVendasHoje = async () => {
  try {
    // SQL PRECISO COM TIMEZONE DO SERVIDOR - AFRICA/LUANDA
    const { data: todayOrdersData, error: todayOrdersError } = await supabase
      .from('orders')
      .select('total_amount, created_at, status')
      .in('status', ['closed', 'paid'])
      .gte('created_at', supabase.rpc('current_date_wat'))
      .lt('created_at', supabase.rpc('next_date_wat'));

    if (todayOrdersError) {
      console.error('[SHARED METRICS] Erro ao buscar vendas de hoje:', todayOrdersError);
      return 0;
    }

    if (!todayOrdersData || todayOrdersData.length === 0) {
      console.log('[SHARED METRICS] Nenhuma venda hoje');
      return 0;
    }

    const vendasHoje = todayOrdersData.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    
    console.log('[SHARED METRICS] Vendas Hoje (Africa/Luanda):', {
      total: vendasHoje,
      orders: todayOrdersData.length,
      timezone: 'Africa/Luanda (GMT+1)'
    });

    return vendasHoje;
  } catch (error) {
    console.error('[SHARED METRICS] Erro crítico ao buscar vendas de hoje:', error);
    return 0;
  }
};

// Função compartilhada para buscar histórico externo
export const fetchHistoricoExterno = async () => {
  try {
    const timestamp = Date.now(); // Cache busting
    const { data: historicoData, error: historicoError } = await supabase
      .from('external_history')
      .select('total_revenue, gross_profit, source_name, period')
      .order('period', { ascending: false });

    if (historicoError) {
      console.error('[SHARED METRICS] Erro ao buscar histórico externo:', historicoError);
      return 0;
    }

    if (!historicoData || historicoData.length === 0) {
      console.log('[SHARED METRICS] Nenhum dado em external_history');
      return 0;
    }

    const totalHistorico = historicoData.reduce((sum: number, record: any) => sum + Number(record.total_revenue || 0), 0);
    
    console.log('[SHARED METRICS] Histórico Externo:', {
      total: totalHistorico,
      records: historicoData.length,
      cacheBust: timestamp
    });

    return totalHistorico;
  } catch (error) {
    console.error('[SHARED METRICS] Erro ao buscar histórico externo:', error);
    return 0;
  }
};
