// 🔄 DATA SERVICE BRIDGE - Compatibilidade Windows/Web sem better-sqlite3
// Usa localStorage/indexedDB para fallback offline, Supabase para online
// NÃO usa better-sqlite3 para evitar problemas com Vite/Electron

import { supabase } from './supabase';

// 🏗️ TIPOS
export interface CashFlowData {
  id?: string;
  amount: number;
  category: string;
  type: 'entrada' | 'saida';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// 🌐 AMBIENTE
const isElectron = () => {
  return typeof window !== 'undefined' && 
         (window as any).electronAPI !== undefined;
};

// 💾 LOCAL STORAGE FALLBACK (para offline)
const saveToLocalStorage = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const loadFromLocalStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

const removeFromLocalStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

// 🔌 CASH FLOW SERVICE
export const cashFlowService = {
  // 📥 INSERT com fallback offline
  async insert(cashFlowData: CashFlowData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 🌐 ONLINE: Tentar Supabase primeiro
      const { data, error } = await supabase
        .from('cash_flow')
        .insert({
          id: cashFlowData.id || `cf-${Date.now()}`,
          amount: cashFlowData.amount,
          category: cashFlowData.category,
          type: cashFlowData.type,
          description: cashFlowData.description || null,
          created_at: cashFlowData.created_at || new Date().toISOString(),
          updated_at: cashFlowData.updated_at || new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // 🔄 OFFLINE: Salvar localmente para sync posterior
        console.warn('[CASH_FLOW] Erro Supabase, salvando localmente:', error);
        const pendingKey = `pending_cash_flow_${Date.now()}`;
        saveToLocalStorage(pendingKey, cashFlowData);
        return { success: true, data: { ...cashFlowData, id: pendingKey, pending: true } };
      }

      // ✅ Sucesso no Supabase
      console.log('[CASH_FLOW] Inserido no Supabase:', data);
      return { success: true, data };

    } catch (err) {
      // 🔄 OFFLINE: Salvar localmente
      console.error('[CASH_FLOW] Erro crítico, salvando localmente:', err);
      const pendingKey = `pending_cash_flow_${Date.now()}`;
      saveToLocalStorage(pendingKey, cashFlowData);
      return { success: true, data: { ...cashFlowData, id: pendingKey, pending: true } };
    }
  },

  // 📤 SYNC de pendentes
  async syncPending(): Promise<{ synced: number; failed: number }> {
    const result = { synced: 0, failed: 0 };
    
    if (typeof window === 'undefined') return result;

    // Buscar todas as chaves pendentes
    const pendingKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('pending_cash_flow_')
    );

    for (const key of pendingKeys) {
      const data = loadFromLocalStorage(key);
      if (!data) continue;

      try {
        const { error } = await supabase
          .from('cash_flow')
          .insert({
            id: data.id || `cf-${Date.now()}`,
            amount: data.amount,
            category: data.category,
            type: data.type,
            description: data.description || null,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString()
          });

        if (!error) {
          removeFromLocalStorage(key);
          result.synced++;
        } else {
          result.failed++;
        }
      } catch (err) {
        result.failed++;
      }
    }

    return result;
  },

  // 📊 BUSCAR todos
  async fetchAll(): Promise<CashFlowData[]> {
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CASH_FLOW] Erro ao buscar:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[CASH_FLOW] Erro crítico:', err);
      return [];
    }
  },

  // 📅 BUSCAR de hoje
  async fetchToday(): Promise<CashFlowData[]> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CASH_FLOW] Erro ao buscar hoje:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[CASH_FLOW] Erro crítico hoje:', err);
      return [];
    }
  }
};

// 🔌 ORDERS SERVICE (compatibilidade Windows)
export const ordersService = {
  async syncPending() {
    // Delegar para pendingSyncOrders existente
    const { getPendingSyncOrders, removePendingSyncOrder } = await import('./pendingSyncOrders');
    const pending = getPendingSyncOrders();
    
    let synced = 0;
    for (const order of pending) {
      try {
        // Tentar inserir via orderTransactionService
        const { orderTransactionService } = await import('./orderTransactionService');
        const result = await orderTransactionService.executeTransaction(
          order,
          order.items || []
        );
        
        if (result.success) {
          removePendingSyncOrder(order.id);
          synced++;
        }
      } catch (err) {
        console.error('[ORDERS_SYNC] Falha:', order.id, err);
      }
    }
    
    return { synced, total: pending.length };
  }
};

// 🚀 SYNC GERAL (Windows ↔ Web)
export const syncAllPending = async () => {
  console.log('[SYNC_BRIDGE] 🔄 Iniciando sincronização...');
  
  const [cashFlowResult, ordersResult] = await Promise.all([
    cashFlowService.syncPending(),
    ordersService.syncPending()
  ]);
  
  console.log('[SYNC_BRIDGE] ✅ Resultado:', {
    cashFlow: cashFlowResult,
    orders: ordersResult
  });
  
  return { cashFlow: cashFlowResult, orders: ordersResult };
};

// 🎯 EXPORT
export default {
  cashFlow: cashFlowService,
  orders: ordersService,
  syncAll: syncAllPending
};
