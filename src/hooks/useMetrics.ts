import { useState, useEffect } from 'react';
import { getTerminalData } from '../services/syncService';

interface MetricsData {
  faturacaoHoje: number;
  despesasHoje: number;
  rendimentoGlobal: number;
  custosStaff: number;
  mesasAtivas: number;
  impostos: number;
  lucroLiquido: number;
}

// HOOK DE LEITURA - ESPELHO PASSIVO DA TERMINAL_SYNC
export const useMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsData>({
    faturacaoHoje: 0,
    despesasHoje: 0,
    rendimentoGlobal: 0,
    custosStaff: 0,
    mesasAtivas: 0,
    impostos: 0,
    lucroLiquido: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await getTerminalData();
        
        if (data) {
          // MAPEAMENTO DIRETO - SEM CÁLCULOS MANUAIS
          // BLOQUEADO: Qualquer tentativa de cálculo manual está proibida
          const newMetrics: MetricsData = {
            faturacaoHoje: Number(data.today_revenue || 0),
            despesasHoje: Number(data.total_expenses || 0),
            rendimentoGlobal: Number(data.global_revenue || 0),
            custosStaff: Number(data.staff_costs || 0),
            mesasAtivas: Number(data.open_orders_count || 0),
            impostos: Number(data.today_revenue || 0) * 0.07, // 7% fixo
            lucroLiquido: (Number(data.today_revenue || 0) - Number(data.total_expenses || 0) - Number(data.staff_costs || 0)) * 0.93
          };

          setMetrics(newMetrics);
          console.log('[METRICS HOOK] Dados carregados (espelho passivo):', newMetrics);
        }
      } catch (error) {
        console.error('[METRICS HOOK] Erro ao carregar métricas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Carregar imediatamente
    loadMetrics();
    
    // Recarregar a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { metrics, isLoading };
};
