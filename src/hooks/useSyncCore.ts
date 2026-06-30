import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase_standalone';
import { calculateDataContabil } from '../lib/dateUtils';

// 🏗️ TIPOS MANUAIS (BASEADOS NO SCHEMA PRISMA)
// No browser, usamos apenas tipos - o PrismaClient roda no servidor
export type CashFlowWithRelations = {
  id?: string;
  amount?: number | null;
  category?: string | null;
  type?: 'entrada' | 'saida' | string;
  description?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
};

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
  data_contabil?: string | null; // 🔑 Dia Operacional
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
      detail: { ...data, source: 'SYNC_CORE_BROWSER' }
    }));
  }
};

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

  // 🔥 REFS DECLARADAS NO TOPO - Antes de qualquer função (evita erro lexical)
  const subscriptionsRef = useRef<{
    orders: any;
    expenses: any;
    staff: any;
    cashFlow: any;
  }>({ orders: null, expenses: null, staff: null, cashFlow: null });

  const retroactiveFixDoneRef = useRef(false);

  // 🏦 REVENUE ENGINE - Cálculo dinâmico de faturamento (COM TIPOS PRISMA)
  const calculateRevenue = useCallback(async (): Promise<{
    total: number;
    today: number;
    externalHistory: number;
    orders: OrderWithRelations[];
  }> => {
    try {
      // Correção retroativa de data_contabil — só 1x por sessão
      if (!retroactiveFixDoneRef.current) {
        retroactiveFixDoneRef.current = true;
        try {
          const fixHoje = calculateDataContabil(new Date());
          const { data: brokenOrders } = await supabase
            .from('orders')
            .select('id, created_at')
            .is('data_contabil', null)
            .gte('created_at', `${fixHoje}T00:00:00Z`)
            .lt('created_at', `${fixHoje}T23:59:59Z`);

          if (brokenOrders && brokenOrders.length > 0) {
            for (const order of brokenOrders) {
              const correctDC = calculateDataContabil(new Date(order.created_at));
              await supabase.from('orders').update({ data_contabil: correctDC }).eq('id', order.id);
            }
          }
        } catch (fixErr) {
          console.warn('[SYNC_CORE] Erro na correção retroativa:', fixErr);
        }
      }

      // Buscar external_history
      const { data: externalHistoryData, error: externalError } = await supabase
        .from('external_history')
        .select('total_revenue')
        .limit(1);
      
      let externalHistory = 0;
      if (!externalError && externalHistoryData && Array.isArray(externalHistoryData) && externalHistoryData.length > 0) {
        externalHistory = Number(externalHistoryData[0]?.total_revenue || 0);
      }
      
      // 💰 Buscar todas as orders (paginado para evitar limite de 1000 do Supabase REST API)
      let allOrdersData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('orders')
          .select('id, customer_name, customer_phone, customer_nif, delivery_address, total_amount, status, created_at, updated_at, payment_method, invoice_number, data_contabil')
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (pageError || !pageData || pageData.length === 0) {
          hasMore = false;
          break;
        }

        allOrdersData.push(...pageData);

        if (pageData.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }
      
      const validStatuses = ['closed', 'paid'];
      const filteredOrdersData = (allOrdersData ?? []).filter((o: any) => validStatuses.includes(o.status));
      
      let totalRevenue = 0;
      const typedOrders: OrderWithRelations[] = [];
      
      if (filteredOrdersData && Array.isArray(filteredOrdersData)) {
        typedOrders.push(...filteredOrdersData.map(order => ({
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
          data_contabil: order.data_contabil ?? null,
        })));
        
        totalRevenue = typedOrders.reduce((acc, order) => {
          return acc + (order.total_amount || 0);
        }, 0);
      }
      
      // 📅 Buscar orders de HOJE diretamente no Supabase via data_contabil
      const hojeString = calculateDataContabil(new Date());
      
      // Query principal: Por data_contabil (oficial - Dia Operacional)
      const { data: todayOrdersData } = await supabase
        .from('orders')
        .select('id, total_amount, data_contabil, created_at, status')
        .in('status', ['closed', 'paid'])
        .eq('data_contabil', hojeString);
      
      let todayRevenue = (todayOrdersData ?? []).reduce((acc: number, order: any) => {
        return acc + (Number(order.total_amount) || 0);
      }, 0);
      
      // Cálculo final
      const finalTotal = externalHistory + totalRevenue;
      
      // Emitir sinal de atualização
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
        .in('type', ['saida', 'saída']);
      
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
        
        // 📅 Usar calculateDataContabil (mesmo que POS)
        const hojeString = calculateDataContabil(new Date());
        
        if (expensesData && Array.isArray(expensesData)) {
          todayExpenses += expensesData.reduce((acc, expense) => {
            const expenseDate = calculateDataContabil(new Date(expense.created_at || ''));
            
            if (expenseDate === hojeString) {
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
        
        // 📅 Usar calculateDataContabil (mesmo que POS)
        const hojeString = calculateDataContabil(new Date());
        
        todayExpenses += cashFlowData.reduce((acc, cashFlow) => {
          const cashFlowDate = calculateDataContabil(new Date(cashFlow.created_at || ''));
          
          if (cashFlowDate === hojeString) {
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
        
        // Emitir sinal de atualização
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
        // Erro silenciado - fallback para estrutura vazia
        // 🔄 FALLBACK: Retornar estrutura vazia tipada
        return {
          costs: 0,
          count: 0,
          staff: []
        };
      }
      
    } catch (error) {
      // Erro silenciado - retornar estrutura vazia
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
      const [ordersResult, itemsResult, menuResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status')
          .in('status', ['closed', 'paid']),
        supabase
          .from('order_items')
          .select('order_id, product_id, quantity'),
        supabase
          .from('products')
          .select('id, name, price, cost_price')
      ]);
      
      const orders = ordersResult.data || [];
      const orderItems = itemsResult.data || [];
      const menu = menuResult.data || [];
      
      // Mapear items por order_id
      const itemsByOrder: Record<string, any[]> = {};
      orderItems.forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      });
      
      const productProfit: Record<string, { name: string, profit: number, qty: number }> = {};
      
      orders.forEach(order => {
        const items = itemsByOrder[order.id] || [];
        
        items.forEach((item: any) => {
          const dishId = item?.product_id;
          const quantity = item?.quantity || 0;
          
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
      // Erro silenciado - retornar array vazio
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
      // Erro silenciado - manter dados anteriores
      setSyncData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, [calculateRevenue, calculateExpenses, calculateStaffCosts, calculateTopMargins]);

  // 🔄 CONFIGURAR SUBSCRIPTIONS REALTIME
  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const setupRealtimeSubscriptions = useCallback(() => {
    try {
      const debouncedRecalc = () => {
        if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => recalculateAll(), 3000);
      };

      // Subscribe orders
      const ordersChannel = supabase
        .channel('synccore_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedRecalc)
        .subscribe();
      subscriptionsRef.current.orders = ordersChannel;

      // Subscribe expenses
      const expensesChannel = supabase
        .channel('synccore_expenses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, debouncedRecalc)
        .subscribe();
      subscriptionsRef.current.expenses = expensesChannel;

      // Subscribe cash_flow
      const cashFlowChannel = supabase
        .channel('synccore_cashflow')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_flow' }, debouncedRecalc)
        .subscribe();
      subscriptionsRef.current.cashFlow = cashFlowChannel;
    } catch (err) {
      console.warn('[SYNC_CORE] Erro ao configurar realtime:', err);
    }
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
    
    // 🔥 ADICIONADO: Listener para eventos de checkout (sincronização imediata)
    const handleOrderCompleted = (event: any) => {
      // Forçar recálculo imediato sem debounce
      recalculateAll();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('order-completed', handleOrderCompleted);
    }
    
    // 🔥 ADICIONADO: Polling como fallback (otimizado: 60s)
    const pollingInterval = setInterval(() => {
      recalculateAll();
    }, 60000); // 🔥 Otimizado: 60 segundos
    
    // Cleanup
    return () => {
      cleanupSubscriptions();
      clearInterval(pollingInterval); // 🔥 Limpar polling ao desmontar
      if (typeof window !== 'undefined') {
        window.removeEventListener('order-completed', handleOrderCompleted);
      }
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
// Tipos já exportados no início do arquivo
