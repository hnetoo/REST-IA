import { supabase } from './supabase';

// Função compartilhada para buscar métricas de vendas do dia
export const fetchVendasHoje = async () => {
  try {
    // 🛡️ QUERY DIRETA SEM RPC - Filtro para timezone Africa/Luanda
    const today = new Date().toISOString().split('T')[0];
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .in('status', ['closed', 'paid', 'FECHADO']);

    if (error) {
      console.error('[SHARED METRICS] Erro na query de vendas hoje:', error);
      return 0;
    }

    const vendasHoje = (ordersData ?? [])
      .filter((o: { created_at?: string }) => String(o.created_at || '').startsWith(today))
      .reduce((sum: number, o: { total_amount?: number }) => sum + Number(o.total_amount ?? 0), 0);
    
    console.log('[SHARED METRICS] Vendas Hoje (Query Direta):', {
      total: vendasHoje,
      today,
      totalOrders: ordersData?.length || 0,
      todayOrders: (ordersData ?? []).filter((o: { created_at?: string }) => String(o.created_at || '').startsWith(today)).length
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
