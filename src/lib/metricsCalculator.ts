import { dataServiceBridge, MetricsData } from './dataService';

// 🎯 ARQUITETURA OFFLINE-FIRST + SYNC - SEM PRISMA NO FRONTEND
export type { MetricsData } from './dataService';

export const calculateMetrics = async (): Promise<MetricsData> => {
  console.log('[METRICS] 🎯 Calculando métricas - Bridge DataService (sem Prisma)...');
  
  try {
    // 🎯 USAR BRIDGE DE DADOS - Verifica ambiente automaticamente
    const metrics = await dataServiceBridge.getMetrics();
    
    console.log('[METRICS] ✅ Métricas obtidas via Bridge:', metrics);
    return metrics;
    
  } catch (error) {
    console.error('[METRICS] ❌ Erro no cálculo via Bridge:', error);
    
    // 🛡️ VALORES SEGUROS SE FALHAR TUDO
    return {
      vendasHoje: 0,
      vendasTotais: 0,
      despesasHoje: 0,
      despesasTotais: 0,
      folhaSalarial: 0,
      impostos: 0,
      lucroLiquido: 0,
      margem: 0,
      historicoExterno: 0,
      rendimentoGlobal: 0,
      source: 'supabase_remote'
    };
  }
};
