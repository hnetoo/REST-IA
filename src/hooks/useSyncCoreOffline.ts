import { useState, useEffect, useCallback } from 'react';
import { Low } from 'lowdb';
import { supabase } from '../lib/supabase';

// 🏗️ TIPOS DO MOTOR DE SINCRONIZAÇÃO OFFLINE-FIRST
interface SyncData {
  totalRevenue: number;
  todayRevenue: number;
  totalExpenses: number;
  todayExpenses: number;
  staffCosts: number;
  staffCount: number;
  netProfit: number;
  externalHistory: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string;
  lastUpdated: Date;
  alerts: any[];
  predictions: {
    monthlyForecast: number;
    dailyAverage: number;
    projectedMonthEnd: number;
    marginTrend: 'stable' | 'increasing' | 'decreasing';
  };
}

interface LocalDB {
  orders: any[];
  expenses: any[];
  cash_flow: any[];
  staff: any[];
  external_history: any[];
  lastSync?: string;
}

// 🖥️ MOTOR OFFLINE-FIRST COM LOWDB
export const useSyncCoreOffline = () => {
  const [syncData, setSyncData] = useState<SyncData>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalExpenses: 0,
    todayExpenses: 0,
    staffCosts: 0,
    staffCount: 0,
    netProfit: 0,
    externalHistory: 0,
    lastUpdate: new Date().toISOString(),
    lastUpdated: new Date(),
    isLoading: false,
    error: null,
    alerts: [],
    predictions: {
      monthlyForecast: 0,
      dailyAverage: 0,
      projectedMonthEnd: 0,
      marginTrend: 'stable'
    }
  });

  // 📁 INICIALIZAR LOWDB
  const [db, setDb] = useState<low.LowdbSync<LocalDB> | null>(null);

  // Inicializar banco de dados local
  useEffect(() => {
    const initDB = async () => {
      try {
        const adapter = new low.LocalStorage('rest-ia-db');
        const dbInstance = new Low(adapter);
        
        // Garantir estrutura inicial
        await dbInstance.read();
        
        const defaultData: LocalDB = {
          orders: [],
          expenses: [],
          cash_flow: [],
          staff: [],
          external_history: [],
          lastSync: new Date().toISOString()
        };
        
        // Inicializar dados se não existirem
        Object.keys(defaultData).forEach(key => {
          if (!dbInstance.data[key]) {
            dbInstance.data[key] = defaultData[key as any];
          }
        });
        
        await dbInstance.write();
        setDb(dbInstance);
        console.log('[SYNC_CORE_OFFLINE] 📁 LowDB inicializado com sucesso');
        
        // Carregar dados iniciais
        await loadLocalData(dbInstance);
        
      } catch (error) {
        console.error('[SYNC_CORE_OFFLINE] ❌ Erro ao inicializar LowDB:', error);
        setSyncData(prev => ({ ...prev, error: 'Falha ao iniciar banco local', isLoading: false }));
      }
    };

    initDB();
  }, []);

  // 📊 CARREGAR DADOS LOCAIS
  const loadLocalData = useCallback(async (database: low.LowdbSync<LocalDB>) => {
    try {
      await database.read();
      
      const orders = database.data.orders || [];
      const expenses = database.data.expenses || [];
      const cashFlow = database.data.cash_flow || [];
      const staff = database.data.staff || [];
      const externalHistory = database.data.external_history || [];
      
      // Calcular totais
      const today = new Date().toISOString().split('T')[0];
      
      const totalRevenue = orders.reduce((sum: number, order: any) => {
        if (order.status === 'pago' || order.status === 'paid') {
          return sum + (order.total_amount || order.total || 0);
        }
        return sum;
      }, 0);
      
      const todayRevenue = orders
        .filter((order: any) => order.created_at?.startsWith(today))
        .reduce((sum: number, order: any) => sum + (order.total_amount || order.total || 0), 0);
      
      const totalExpenses = expenses.reduce((sum: number, expense: any) => {
        return sum + (expense.amount_kz || expense.amount || 0);
      }, 0);
      
      const todayExpenses = expenses
        .filter((expense: any) => expense.created_at?.startsWith(today))
        .reduce((sum: number, expense: any) => sum + (expense.amount_kz || expense.amount || 0), 0);
      
      // Calcular custos de staff
      const activeStaff = staff.filter((s: any) => !s.status || s.status === 'active');
      const staffCosts = activeStaff.reduce((sum: number, staffMember: any) => {
        const salary = Number(staffMember.base_salary_kz) || Number(staffMember.salario_base) || 0;
        const subsidios = Number(staffMember.subsidios) || 0;
        const bonus = Number(staffMember.bonus) || 0;
        const horasExtras = Number(staffMember.horas_extras) || 0;
        const descontos = Number(staffMember.descontos) || 0;
        
        return sum + salary + subsidios + bonus + horasExtras - descontos;
      }, 0);
      
      const staffCount = activeStaff.length;
      
      const netProfit = totalRevenue - totalExpenses - staffCosts;
      
      console.log('[SYNC_CORE_OFFLINE] 📊 Dados carregados do LowDB:', {
        totalOrders: orders.length,
        totalExpenses,
        staffCosts,
        staffCount,
        netProfit
      });
      
      setSyncData({
        totalRevenue,
        todayRevenue,
        totalExpenses,
        todayExpenses,
        staffCosts,
        staffCount,
        netProfit,
        externalHistory: externalHistory.reduce((sum: number, h: any) => sum + (h.total_revenue || 0), 0),
        lastUpdate: new Date().toISOString(),
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
        alerts: [],
        predictions: {
          monthlyForecast: todayRevenue * 30,
          dailyAverage: todayRevenue,
          projectedMonthEnd: todayRevenue * 30,
          marginTrend: 'stable'
        }
      });
      
    } catch (error) {
      console.error('[SYNC_CORE_OFFLINE] ❌ Erro ao carregar dados locais:', error);
      setSyncData(prev => ({ ...prev, error: 'Falha ao carregar dados', isLoading: false }));
    }
  }, []);

  // 🔄 RECÁLCULO COMPLETO
  const recalculate = useCallback(async () => {
    if (!db) return;
    
    console.log('[SYNC_CORE_OFFLINE] 🔄 Recalculando dados locais...');
    setSyncData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await loadLocalData(db);
      setSyncData(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('[SYNC_CORE_OFFLINE] ❌ Erro no recálculo:', error);
      setSyncData(prev => ({ ...prev, error: 'Falha no recálculo', isLoading: false }));
    }
  }, [db]);

  // 📤 FUNÇÕES DE CÁLCULO INDIVIDUAIS
  const calculateRevenue = useCallback(async (forceLocal = true) => {
    if (!db) return { total: 0, today: 0 };
    
    await db.read();
    const orders = db.data.orders || [];
    const today = new Date().toISOString().split('T')[0];
    
    const total = orders.reduce((sum: number, order: any) => {
      if (order.status === 'pago' || order.status === 'paid') {
        return sum + (order.total_amount || order.total || 0);
      }
      return sum;
    }, 0);
    
    const today = orders
      .filter((order: any) => order.created_at?.startsWith(today))
      .reduce((sum: number, order: any) => sum + (order.total_amount || order.total || 0), 0);
    
    return { total, today };
  }, [db]);

  const calculateExpenses = useCallback(async (forceLocal = true) => {
    if (!db) return { total: 0, categories: {} };
    
    await db.read();
    const expenses = db.data.expenses || [];
    const today = new Date().toISOString().split('T')[0];
    
    const total = expenses.reduce((sum: number, expense: any) => {
      return sum + (expense.amount_kz || expense.amount || 0);
    }, 0);
    
    const today = expenses
      .filter((expense: any) => expense.created_at?.startsWith(today))
      .reduce((sum: number, expense: any) => sum + (expense.amount_kz || expense.amount || 0), 0);
    
    return { total, today, categories: {} };
  }, [db]);

  const calculateStaffCosts = useCallback(async (forceLocal = true) => {
    if (!db) return 0;
    
    await db.read();
    const staff = db.data.staff || [];
    const activeStaff = staff.filter((s: any) => !s.status || s.status === 'active');
    
    const total = activeStaff.reduce((sum: number, staffMember: any) => {
      const salary = Number(staffMember.base_salary_kz) || Number(staffMember.salario_base) || 0;
      const subsidios = Number(staffMember.subsidios) || 0;
      const bonus = Number(staffMember.bonus) || 0;
      const horasExtras = Number(staffMember.horas_extras) || 0;
      const descontos = Number(staffMember.descontos) || 0;
      
      return sum + salary + subsidios + bonus + horasExtras - descontos;
    }, 0);
    
    return total;
  }, [db]);

  const syncPending = useCallback(async () => {
    console.log('[SYNC_CORE_OFFLINE] 📤 Sync pendente - salvando dados locais...');
    if (db) {
      await db.read();
      db.data.lastSync = new Date().toISOString();
      await db.write();
    }
  }, [db]);

  return {
    syncData,
    recalculate,
    syncPending,
    totalRevenue: syncData.totalRevenue,
    todayRevenue: syncData.todayRevenue,
    totalExpenses: syncData.totalExpenses,
    todayExpenses: syncData.todayExpenses,
    externalHistory: syncData.externalHistory,
    staffCosts: syncData.staffCosts,
    staffCount: syncData.staffCount,
    netProfit: syncData.netProfit,
    isLoading: syncData.isLoading,
    error: syncData.error,
    isOnline: false,
    syncStatus: 'synced' as const,
    pendingSyncCount: 0,
    alerts: syncData.alerts,
    predictions: syncData.predictions,
    calculateRevenue,
    calculateExpenses,
    calculateStaffCosts
  };
};
