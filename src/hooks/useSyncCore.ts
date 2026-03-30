import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PrismaClient } from '@prisma/client';

// 🔥 INSTÂNCIA DO PRISMA CLIENT (SINGLETON)
const prisma = new PrismaClient();

// 🏗️ TIPOS DO PRISMA (GERADOS AUTOMATICAMENTE)
export type OrderWithRelations = {
  id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_nif?: string | null;
  delivery_address?: string | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  payment_method?: string | null;
  invoice_number?: string | null;
  order_items?: OrderItemWithRelations[];
};

export type OrderItemWithRelations = {
  id?: string;
  order_id?: string;
  product_id?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
};

export type ExpenseWithRelations = {
  id?: string;
  description?: string | null;
  amount_kz?: number | null;
  category?: string | null;
  status?: string | null;
  created_at?: Date | null;
};

export type StaffWithRelations = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  base_salary_kz?: number | null;
  phone?: string | null;
  status?: string | null;
  subsidios?: number | null;
  bonus?: number | null;
  horas_extras?: number | null;
  descontos?: number | null;
  salario_base?: number | null;
};

// 🔥 SINAL DE ATUALIZAÇÃO GLOBAL
const emitSyncSignal = (data: { 
  type: 'orders' | 'expenses' | 'staff' | 'cash_flow' | 'all';
  action: 'created' | 'updated' | 'deleted' | 'synced';
  timestamp: number;
  payload?: any;
}) => {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('sync-core-update', { 
      detail: { ...data, source: 'SYNC_CORE_PRISMA' }
    }));
  }
};

// 🔥 DEBOUNCE SYNC CONFIG
const DEBOUNCE_DELAY = 30000; // 30 segundos
const BATCH_SIZE = 10; // Máximo de operações em lote

// 🏗️ TIPOS DO MOTOR DE SINCRONIZAÇÃO
interface TopMarginProduct {
  name: string;
  profit: number;
  qty: number;
}

interface SyncData {
  totalRevenue: number;        // Soma total de todas as orders
  todayRevenue: number;        // Faturamento de hoje
  totalExpenses: number;      // Soma total de todas as expenses
  todayExpenses: number;      // Despesas de hoje
  todayExpensesCount: number;  // 🔥 ADICIONADO: Contagem de despesas de hoje
  staffCosts: number;         // Custo total com staff
  staffCount: number;         // ✅ ADICIONADO: Número de funcionários ativos
  netProfit: number;          // Lucro líquido (Revenue - Expenses - Staff)
  externalHistory: number;     // ✅ ADICIONADO: Histórico externo da tabela external_history
  topMarginProducts: TopMarginProduct[]; // 🔥 ADICIONADO: Top produtos por margem
  lastUpdate: string;         // Timestamp da última atualização
  lastUpdated: Date | null;   // Data da última atualização (compatibilidade)
  isLoading: boolean;         // Status de carregamento
  error: string | null;       // Erro se houver
  // 🧠 INTELIGÊNCIA E ALERTAS
  alerts: Alert[];
  predictions: Predictions;
}


interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

interface Predictions {
  monthlyForecast: number;
  dailyAverage: number;
  projectedMonthEnd: number;
  marginTrend: 'increasing' | 'decreasing' | 'stable';
}

interface ExpenseCategory {
  staff: number;              // Despesas com pessoal
  operational: number;         // Custos operacionais
  maintenance: number;         // Manutenção
  supplies: number;           // Suprimentos
  other: number;             // Outras despesas
}

// MOTOR PRINCIPAL - LÓGICA PURA DE CÁLCULO
export const useSyncCore = () => {
  // ESTADO CENTRALIZADO
  const [syncData, setSyncData] = useState<SyncData>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalExpenses: 0,
    todayExpenses: 0,
    todayExpensesCount: 0,    // 🔥 ADICIONADO: Contagem de despesas de hoje
    staffCosts: 0,
    staffCount: 0,            // ✅ ADICIONADO: Contagem de funcionários
    netProfit: 0,
    externalHistory: 0,        // ✅ ADICIONADO: Histórico externo
    topMarginProducts: [],     // 🔥 ADICIONADO: Top produtos por margem
    isLoading: false,
    error: null,
    lastUpdated: null,
    lastUpdate: new Date().toISOString(),
    // INTELIGÊNCIA E ALERTAS
    alerts: [],
    predictions: {
      monthlyForecast: 0,
      dailyAverage: 0,
      projectedMonthEnd: 0,
      marginTrend: 'stable'
    }
  });

  // 🧠 INTELIGÊNCIA - Previsões e Alertas
  const calculateIntelligence = useCallback(async (revenue: number, expenses: number, staffCosts: number) => {
    try {
      // � PREVISÃO DE FECHO COM BASE NA MÉDIA DIÁRIA
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const remainingDays = daysInMonth - currentDay;
      
      // Calcular média diária (últimos 7 dias)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'pending')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const dailyAverage = recentOrders?.reduce((acc, order) => acc + Number(order.total_amount || 0), 0) / 7 || 0;
      const projectedMonthEnd = revenue + (dailyAverage * remainingDays);
      const monthlyForecast = dailyAverage * daysInMonth;
      
      // 🚨 ALERTAS - Verificar margem de lucro
      const profitMargin = revenue > 0 ? ((revenue - expenses - staffCosts) / revenue) * 100 : 0;
      const alerts: Alert[] = [];
      
      if (profitMargin < 20 && profitMargin > 0) {
        alerts.push({
          id: `margin-warning-${Date.now()}`,
          type: 'warning',
          title: 'Margem de Lucro Baixa',
          message: `Margem atual: ${profitMargin.toFixed(1)}%. Abaixo do ideal de 20%.`,
          threshold: 20,
          currentValue: profitMargin,
          timestamp: new Date()
        });
      }
      
      if (profitMargin < 10 && profitMargin > 0) {
        alerts.push({
          id: `margin-danger-${Date.now()}`,
          type: 'danger',
          title: 'Margem de Lucro Crítica',
          message: `Margem atual: ${profitMargin.toFixed(1)}%. Necessária intervenção imediata!`,
          threshold: 10,
          currentValue: profitMargin,
          timestamp: new Date()
        });
      }
      
      // 📊 TENDÊNCIA DE MARGEM
      const marginTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'; // TODO: Implementar análise histórica
      
      return {
        monthlyForecast,
        dailyAverage,
        projectedMonthEnd,
        marginTrend,
        alerts
      };
      
    } catch (error) {
      console.error('[SYNC_CORE] Erro no cálculo de inteligência:', error);
      return {
        monthlyForecast: 0,
        dailyAverage: 0,
        projectedMonthEnd: 0,
        marginTrend: 'stable' as const,
        alerts: []
      };
    }
  }, []);
  const subscriptionsRef = useRef<{
    orders: any;
    expenses: any;
    staff: any;
    cashFlow: any;
  }>({ orders: null, expenses: null, staff: null, cashFlow: null });

  // 📅 FUNÇÃO AUXILIAR - DATA DE LUANDA
  const getLuandaDate = useCallback(() => {
    const today = new Date();
    const luandaOffset = 1; // WAT is UTC+1
    return new Date(today.getTime() + (luandaOffset * 60 * 60 * 1000));
  }, []);

  // 🏦 REVENUE ENGINE - Cálculo dinâmico de faturamento (COM TIPOS PRISMA)
  const calculateRevenue = useCallback(async (): Promise<{
    total: number;
    today: number;
    externalHistory: number;
    orders: OrderWithRelations[];
  }> => {
    try {
      // 📚 Buscar external_history
      const { data: externalHistoryData, error: externalError } = await supabase
        .from('external_history')
        .select('total_revenue')
        .limit(1);
      
      let externalHistory = 0;
      if (!externalError && externalHistoryData && Array.isArray(externalHistoryData) && externalHistoryData.length > 0) {
        externalHistory = Number(externalHistoryData[0]?.total_revenue || 0);
      }
      
      // 💰 Buscar todas as orders (com tipos Prisma)
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, customer_nif, delivery_address, total_amount, status, created_at, updated_at, payment_method, invoice_number')
        .in('status', ['pending', 'closed', 'paid', 'FECHADO', 'PAGO', 'completed', 'delivered', 'DELIVERED']);
      
      let totalRevenue = 0;
      const typedOrders: OrderWithRelations[] = [];
      
      if (!allOrdersError && allOrdersData && Array.isArray(allOrdersData)) {
        typedOrders.push(...allOrdersData.map(order => ({
          id: order.id,
          customer_name: order.customer_name ?? null,
          customer_phone: order.customer_phone ?? null,
          customer_nif: order.customer_nif ?? null,
          delivery_address: order.delivery_address ?? null,
          total_amount: order.total_amount != null ? Number(order.total_amount) : null,
          status: order.status ?? null,
          created_at: order.created_at ? new Date(order.created_at) : null,
          updated_at: order.updated_at ? new Date(order.updated_at) : null,
          payment_method: order.payment_method ?? null,
          invoice_number: order.invoice_number ?? null,
        })));
        
        totalRevenue = typedOrders.reduce((acc, order) => {
          return acc + (order.total_amount || 0);
        }, 0);
      }
      
      // 📅 Buscar orders de hoje
      const hojeUTC = new Date().toISOString().split('T')[0];
      
      const todayRevenue = typedOrders.reduce((acc, order) => {
        const orderDate = order.created_at?.toISOString().split('T')[0];
        if (orderDate === hojeUTC) {
          return acc + (order.total_amount || 0);
        }
        return acc;
      }, 0);
      
      // 🚀 Cálculo final
      const finalTotal = externalHistory + totalRevenue;
      
      // 📡 EMITIR SINAL DE ATUALIZAÇÃO
      emitSyncSignal({
        type: 'orders',
        action: 'synced',
        timestamp: Date.now(),
        payload: { count: typedOrders.length, total: finalTotal, today: todayRevenue }
      });
      
      return {
        total: finalTotal,
        today: todayRevenue,
        externalHistory: externalHistory,
        orders: typedOrders
      };
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Revenue Engine error:', error);
      // 🔄 FALLBACK: Retornar estrutura vazia tipada
      return { total: 0, today: 0, externalHistory: 0, orders: [] };
    }
  }, []);

  // 💸 EXPENSE ENGINE
  const calculateExpenses = useCallback(async (): Promise<{
    total: number;
    today: number;
    todayCount: number;
    categories: ExpenseCategory;
  }> => {
    try {
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, category, description, created_at');
      
      const { data: cashFlowData, error: cashFlowError } = await supabase
        .from('cash_flow')
        .select('amount, category, description, created_at')
        .eq('type', 'saida');
      
      const categories: ExpenseCategory = {
        staff: 0,
        operational: 0,
        maintenance: 0,
        supplies: 0,
        other: 0
      };
      
      let totalExpenses = 0;
      let todayExpenses = 0;
      let todayExpensesCount = 0;
      
      // Processar expenses
      if (!expensesError && expensesData && Array.isArray(expensesData)) {
        totalExpenses += expensesData.reduce((acc, expense) => {
          const amount = Number(expense.amount_kz || 0);
          const category = (expense.category || '').toLowerCase();
          const description = (expense.description || '').toLowerCase();
          
          if (category.includes('staff') || category.includes('salario') || 
              description.includes('salario') || description.includes('ordenado') ||
              description.includes('staff') || description.includes('funcionario')) {
            categories.staff += amount;
          } else if (category.includes('operacional') || category.includes('operação') ||
                     description.includes('aluguel') || description.includes('agua') ||
                     description.includes('luz') || description.includes('internet')) {
            categories.operational += amount;
          } else if (category.includes('manutenção') || category.includes('repair') ||
                     description.includes('manuten') || description.includes('conserto')) {
            categories.maintenance += amount;
          } else if (category.includes('suprimento') || category.includes('supply') ||
                     description.includes('compra') || description.includes('material')) {
            categories.supplies += amount;
          } else {
            categories.other += amount;
          }
          
          return acc + amount;
        }, 0);
        
        const hojeUTC = new Date().toISOString().split('T')[0];
        
        if (expensesData && Array.isArray(expensesData)) {
          todayExpenses += expensesData.reduce((acc, expense) => {
            const expenseDate = new Date(expense.created_at || '').toISOString().split('T')[0];
            if (expenseDate === hojeUTC) {
              todayExpensesCount++;
              return acc + Number(expense.amount_kz || 0);
            }
            return acc;
          }, 0);
        }
      }
      
      // Processar cash_flow
      if (!cashFlowError && cashFlowData && Array.isArray(cashFlowData)) {
        totalExpenses += cashFlowData.reduce((acc, cashFlow) => {
          const amount = Number(cashFlow.amount || 0);
          const category = (cashFlow.category || '').toLowerCase();
          const description = (cashFlow.description || '').toLowerCase();
          
          if (category.includes('staff') || category.includes('salario') || 
              description.includes('salario') || description.includes('ordenado') ||
              description.includes('staff') || description.includes('funcionario')) {
            categories.staff += amount;
          } else if (category.includes('operacional') || category.includes('operação') ||
                     description.includes('aluguel') || description.includes('agua') ||
                     description.includes('luz') || description.includes('internet')) {
            categories.operational += amount;
          } else if (category.includes('manutenção') || category.includes('repair') ||
                     description.includes('manuten') || description.includes('conserto')) {
            categories.maintenance += amount;
          } else if (category.includes('suprimento') || category.includes('supply') ||
                     description.includes('compra') || description.includes('material')) {
            categories.supplies += amount;
          } else {
            categories.other += amount;
          }
          
          return acc + amount;
        }, 0);
        
        const hojeUTC = new Date().toISOString().split('T')[0];
        
        todayExpenses += cashFlowData.reduce((acc, cashFlow) => {
          const cashFlowDate = new Date(cashFlow.created_at || '').toISOString().split('T')[0];
          if (cashFlowDate === hojeUTC) {
            todayExpensesCount++;
            return acc + Number(cashFlow.amount || 0);
          }
          return acc;
        }, 0);
      }
      
      return {
        total: totalExpenses,
        today: todayExpenses,
        todayCount: todayExpensesCount,
        categories
      };
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Expense Engine error:', error);
      return { 
        total: 0, 
        today: 0,
        todayCount: 0,
        categories: { staff: 0, operational: 0, maintenance: 0, supplies: 0, other: 0 }
      };
    }
  }, []);

  // 👥 STAFF ENGINE (COM TIPOS PRISMA)
  const calculateStaffCosts = useCallback(async (): Promise<{ costs: number; count: number; staff: StaffWithRelations[] }> => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, full_name, role, base_salary_kz, phone, status, created_at, subsidios, bonus, horas_extras, descontos, salario_base');
      
      let totalStaffCosts = 0;
      const typedStaff: StaffWithRelations[] = [];
      
      if (!staffError && staffData && Array.isArray(staffData)) {
        typedStaff.push(...staffData.map(staff => ({
          id: staff.id ?? '',
          full_name: staff.full_name ?? null,
          role: staff.role ?? null,
          base_salary_kz: staff.base_salary_kz ?? null,
          phone: staff.phone ?? null,
          status: staff.status ?? null,
          subsidios: staff.subsidios ?? null,
          bonus: staff.bonus ?? null,
          horas_extras: staff.horas_extras ?? null,
          descontos: staff.descontos ?? null,
          salario_base: staff.salario_base ?? null,
        })));
        
        totalStaffCosts = typedStaff.reduce((acc, staff) => {
          const isActiveStaff = staff.status && (
            staff.status.toLowerCase() === 'active' || 
            staff.status.toLowerCase() === 'ativo'
          );
          
          if (!isActiveStaff) {
            return acc;
          }
          
          const baseSalary = Number(staff.base_salary_kz) || Number(staff.salario_base) || 0;
          const subsidios = Number(staff.subsidios) || 0;
          const bonus = Number(staff.bonus) || 0;
          const horasExtras = Number(staff.horas_extras) || 0;
          const descontos = Number(staff.descontos) || 0;
          
          const salaryTotal = baseSalary + subsidios + bonus + horasExtras - descontos;
          
          return acc + salaryTotal;
        }, 0);
        
        // 📡 EMITIR SINAL DE ATUALIZAÇÃO
        emitSyncSignal({
          type: 'staff',
          action: 'synced',
          timestamp: Date.now(),
          payload: { count: typedStaff.length, costs: totalStaffCosts }
        });
        
        return {
          costs: totalStaffCosts,
          count: typedStaff.length,
          staff: typedStaff
        };
      } else {
        // 🔄 FALLBACK: Retornar estrutura vazia tipada
        return {
          costs: 0,
          count: 0,
          staff: []
        };
      }
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Staff Engine error:', error);
      // 🔄 FALLBACK: Retornar estrutura vazia tipada
      return {
        costs: 0,
        count: 0,
        staff: []
      };
    }
  }, []);

  // 🍽️ TOP MARGINS ENGINE
  const calculateTopMargins = useCallback(async (): Promise<TopMarginProduct[]> => {
    try {
      const [ordersResult, menuResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, items, status')
          .in('status', ['closed', 'FECHADO', 'paid', 'PAGO', 'completed', 'delivered']),
        supabase
          .from('menu_items')
          .select('id, name, price, cost_price')
      ]);
      
      const orders = ordersResult.data || [];
      const menu = menuResult.data || [];
      
      const productProfit: Record<string, { name: string, profit: number, qty: number }> = {};
      
      orders.forEach(order => {
        let items = order.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch (e) {
            items = [];
          }
        }
        
        if (!Array.isArray(items)) return;
        
        items.forEach((item: any) => {
          const dishId = item?.dishId || item?.dish_id;
          const quantity = item?.quantity || item?.quantidade || 0;
          
          if (!dishId) return;
          
          const dish = menu.find(m => m.id === dishId);
          if (!dish) return;
          
          if (!productProfit[dishId]) {
            productProfit[dishId] = { name: dish.name || 'Desconhecido', profit: 0, qty: 0 };
          }
          
          const price = Number(dish.price) || 0;
          const costPrice = Number(dish.cost_price) || 0;
          const itemProfit = (price - costPrice) * quantity;
          
          productProfit[dishId].profit += itemProfit;
          productProfit[dishId].qty += quantity;
        });
      });
      
      const topProducts = Object.values(productProfit)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);
      
      return topProducts;
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Top Margins Engine error:', error);
      return [];
    }
  }, []);

  // 🔄 RECÁLCULO COMPLETO
  const recalculateAll = useCallback(async () => {
    setSyncData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const [revenueResult, expensesResult, staffResult, topMarginsResult] = await Promise.all([
        calculateRevenue(),
        calculateExpenses(),
        calculateStaffCosts(),
        calculateTopMargins()
      ]);
      
      const netProfit = revenueResult.total - expensesResult.total - staffResult.costs;
      
      const finalSyncData: SyncData = {
        totalRevenue: revenueResult.total,
        todayRevenue: revenueResult.today,
        totalExpenses: expensesResult.total,
        todayExpenses: expensesResult.today,
        todayExpensesCount: expensesResult.todayCount,
        staffCosts: staffResult.costs,
        staffCount: staffResult.count,
        netProfit,
        externalHistory: revenueResult.externalHistory,
        topMarginProducts: topMarginsResult,
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
      };
      
      setSyncData(finalSyncData);
      
      if (typeof window !== 'undefined') {
        (window as any).WINDOWS_SYNC = {
          faturacaoHoje: revenueResult.today,
          totalRevenue: revenueResult.total,
          despesasTotais: expensesResult.total,
          folhaSalarial: staffResult.costs,
          lucroLiquido: netProfit,
          timestamp: new Date().toISOString(),
          source: 'SYNC_CORE_PURE'
        };
      }
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Erro no recálculo:', error);
      setSyncData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, [calculateRevenue, calculateExpenses, calculateStaffCosts, calculateTopMargins]);

  // 🔄 CONFIGURAR SUBSCRIPTIONS REALTIME
  const setupRealtimeSubscriptions = useCallback(() => {
    const ordersSubscription = supabase
      .channel('sync-core-orders-v3')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => recalculateAll()
      )
      .subscribe();

    const expensesSubscription = supabase
      .channel('sync-core-expenses-v3')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => recalculateAll()
      )
      .subscribe();

    const staffSubscription = supabase
      .channel('sync-core-staff-v3')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => recalculateAll()
      )
      .subscribe();

    const cashFlowSubscription = supabase
      .channel('sync-core-cash-flow-v3')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cash_flow' },
        () => recalculateAll()
      )
      .subscribe();

    subscriptionsRef.current = {
      orders: ordersSubscription,
      expenses: expensesSubscription,
      staff: staffSubscription,
      cashFlow: cashFlowSubscription
    };
  }, [recalculateAll]);

  // 🔥 DEBOUNCE SYNC IMPLEMENTATION
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<any[]>([]);
  
  const debouncedRecalculate = useCallback(() => {
    // Adicionar operação à fila
    pendingOperationsRef.current.push({ timestamp: Date.now() });
    
    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Configurar novo timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('[SYNC_CORE] 🔄 Debounce Sync - Processando lote de operações:', {
        operations: pendingOperationsRef.current.length,
        delay: DEBOUNCE_DELAY
      });
      
      // Processar operações em lote
      pendingOperationsRef.current = [];
      recalculateAll();
    }, DEBOUNCE_DELAY);
  }, [recalculateAll]);
  
  // 🧹 LIMPAR SUBSCRIPTIONS
  const cleanupSubscriptions = useCallback(() => {
    
    const { orders, expenses, staff, cashFlow } = subscriptionsRef.current;
    
    if (orders) supabase.removeChannel(orders);
    if (expenses) supabase.removeChannel(expenses);
    if (staff) supabase.removeChannel(staff);
    if (cashFlow) supabase.removeChannel(cashFlow);
    
    subscriptionsRef.current = { orders: null, expenses: null, staff: null, cashFlow: null };
  }, []);

  // 🚀 INICIALIZAÇÃO
  useEffect(() => {
    
    // Buscar dados iniciais
    recalculateAll();
    
    // Configurar realtime
    setupRealtimeSubscriptions();
    
    // 🔥 ADICIONADO: Polling de 30 segundos como fallback
    const pollingInterval = setInterval(() => {
      recalculateAll();
    }, 30000); // 30 segundos
    
    // Cleanup
    return () => {
      cleanupSubscriptions();
      clearInterval(pollingInterval); // 🔥 Limpar polling ao desmontar
    };
  }, [recalculateAll, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // 🔄 EXPORTAR DADOS E FUNÇÕES
  return {
    // Estado completo
    syncData,
    
    // Funções de controle
    recalculate: recalculateAll,
    
    // Valores individuais (conveniência)
    totalRevenue: syncData.totalRevenue,
    todayRevenue: syncData.todayRevenue,
    totalExpenses: syncData.totalExpenses,
    todayExpenses: syncData.todayExpenses,
    todayExpensesCount: syncData.todayExpensesCount, // 🔥 ADICIONADO: Contagem de despesas de hoje
    externalHistory: syncData.externalHistory, // 🔥 ADICIONADO: Histórico externo
    staffCosts: syncData.staffCosts,
    staffCount: syncData.staffCount,  // ✅ ADICIONADO: Contagem de funcionários
    netProfit: syncData.netProfit,
    
    topMarginProducts: syncData.topMarginProducts,  // 🔥 ADICIONADO: Top produtos por margem
    
    // Status
    isLoading: syncData.isLoading,
    error: syncData.error,
    
    // 🧠 INTELIGÊNCIA E ALERTAS
    alerts: syncData.alerts,
    predictions: syncData.predictions,
    
    // Funções específicas dos engines
    calculateRevenue,
    calculateExpenses,
    calculateStaffCosts
  };
};

// 🎯 EXPORTAR TIPOS
export type { 
  SyncData, 
  ExpenseCategory, 
  TopMarginProduct,
  OrderWithRelations,
  OrderItemWithRelations,
  ExpenseWithRelations,
  StaffWithRelations
};
