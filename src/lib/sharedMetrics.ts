import { supabase } from './supabase';

// Função compartilhada para buscar métricas de vendas do dia
export const fetchVendasHoje = async () => {
  try {
    // SQL TIMEZONE ANGOLA - PROCESSADO 100% NO SERVIDOR POSTGRESQL
    const { data, error } = await supabase.rpc('fetch_vendas_hoje_africa_luanda');

    if (error) {
      console.error('[SHARED METRICS] Erro ao buscar vendas de hoje:', error);
      return 0;
    }

    const vendasHoje = data?.[0]?.total || 0;
    
    console.log('[SHARED METRICS] Vendas Hoje (SQL Server Africa/Luanda):', {
      total: vendasHoje,
      timezone: 'Africa/Luanda (GMT+1) - Processado no Servidor',
      sql: 'SELECT SUM(total_amount) FROM orders WHERE created_at >= CURRENT_DATE AT TIME ZONE Africa/Luanda'
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
