import { useSyncCore } from './useSyncCore';
import { useMemo } from 'react';

// 🧠 HOOK INTELIGENTE - USA MODO ONLINE PADRÃO (SEM ERROS NATIVOS)
type SyncCoreReturn = {
  syncData: any;
  recalculate: () => Promise<void>;
  syncPending: () => Promise<void>;
  totalRevenue: number;
  todayRevenue: number;
  totalExpenses: number;
  todayExpenses: number;
  todayExpensesCount: number;  // 🔥 ADICIONADO: Contagem de despesas de hoje
  externalHistory: number;
  staffCosts: number;
  staffCount: number;
  netProfit: number;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  syncStatus: 'synced' | 'pending' | 'offline' | 'error';
  pendingSyncCount: number;
  alerts: any[];
  predictions: any;
  calculateRevenue: (forceLocal?: boolean) => Promise<{ total: number; today: number }>;
  calculateExpenses: (forceLocal?: boolean) => Promise<{ total: number; categories: any }>;
  calculateStaffCosts: (forceLocal?: boolean) => Promise<number>;
};

export const useSyncCoreSmart = (): SyncCoreReturn => {
  const onlineResult = useSyncCore();
  
  return useMemo(() => ({
    ...onlineResult,
    syncPending: async () => {},
    isOnline: true,
    syncStatus: 'synced' as const,
    pendingSyncCount: 0,
    externalHistory: onlineResult.externalHistory || 0,
    calculateStaffCosts: async () => onlineResult.staffCosts || 0
  }), [onlineResult]);
};
