// Funções utilitárias extraídas do useStore.ts original
// Mantidas para compatibilidade

import { supabase } from '../supabase_standalone';

// 🔑 SUPABASE FIRST - Validar ligação antes de permitir gravações
export const validateSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('[SUPABASE_FIRST] 🔍 Validando ligação ao Supabase...');

    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[SUPABASE_FIRST] ❌ Erro na ligação:', error);
      return false;
    }

    console.log('[SUPABASE_FIRST] ✅ Ligação validada com sucesso');
    return true;
  } catch (error) {
    console.error('[SUPABASE_FIRST] ❌ Erro crítico na validação:', error);
    return false;
  }
};

// 🔑 REALTIME SUBSCRIPTIONS - Sincronização total Windows ↔ Vercel
export const startRealtimeSubscriptions = () => {
  console.log('[REALTIME] 🚀 Iniciando subscriptions globais...');

  const staffChannel = supabase
    .channel('staff-global')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'staff' },
      (payload) => {
        console.log('[REALTIME] 👥 Staff mudou:', payload);
      }
    )
    .subscribe();

  const expensesChannel = supabase
    .channel('expenses-global')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'expenses' },
      (payload) => {
        console.log('[REALTIME] 💰 Expense mudou:', payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(staffChannel);
    supabase.removeChannel(expensesChannel);
  };
};

// 🔑 SINCRO DE ARRANQUE - Fetch total de todas as tabelas para nova MSI
export const performStartupSync = async (): Promise<boolean> => {
  try {
    console.log('[STARTUP_SYNC] 🚀 Iniciando sincronização total de arranque...');

    const isOnline = await validateSupabaseConnection();
    if (!isOnline) {
      console.log('[STARTUP_SYNC] ❌ Sem ligação ao Supabase, abortando sync');
      return false;
    }

    // Fetch total de Staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('status', 'active');

    if (staffError) {
      console.error('[STARTUP_SYNC] ❌ Erro ao buscar staff:', staffError);
    } else {
      console.log('[STARTUP_SYNC] ✅ Staff sincronizado:', staffData?.length || 0, 'funcionários');
    }

    // Fetch total de Orders (paginado)
    let totalOrders = 0;
    let ordersOffset = 0;
    const ordersPageSize = 1000;
    let ordersHasMore = true;
    while (ordersHasMore) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'closed')
        .order('created_at', { ascending: false })
        .range(ordersOffset, ordersOffset + ordersPageSize - 1);
      if (ordersError || !ordersData || ordersData.length === 0) { ordersHasMore = false; break; }
      totalOrders += ordersData.length;
      if (ordersData.length < ordersPageSize) { ordersHasMore = false; } else { ordersOffset += ordersPageSize; }
    }
    console.log('[STARTUP_SYNC] ✅ Orders sincronizadas:', totalOrders, 'vendas');

    // Fetch total de Expenses (paginado)
    let totalExpenses = 0;
    let expensesOffset = 0;
    const expensesPageSize = 1000;
    let expensesHasMore = true;
    while (expensesHasMore) {
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .range(expensesOffset, expensesOffset + expensesPageSize - 1);
      if (expensesError || !expensesData || expensesData.length === 0) { expensesHasMore = false; break; }
      totalExpenses += expensesData.length;
      if (expensesData.length < expensesPageSize) { expensesHasMore = false; } else { expensesOffset += expensesPageSize; }
    }
    console.log('[STARTUP_SYNC] ✅ Expenses sincronizadas:', totalExpenses, 'despesas');

    // Fetch total de Products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (productsError) {
      console.error('[STARTUP_SYNC] ❌ Erro ao buscar products:', productsError);
    } else {
      console.log('[STARTUP_SYNC] ✅ Products sincronizados:', productsData?.length || 0, 'produtos');
    }

    console.log('[STARTUP_SYNC] ✅ Sincronização total concluída');
    return true;
  } catch (error) {
    console.error('[STARTUP_SYNC] ❌ Erro crítico no sync:', error);
    return false;
  }
};

// 🔑 ID DE INSTALAÇÃO - Verificar se API e URL estão definidas
export const validateSupabaseConfig = (): boolean => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('[INSTALL_ID] 🔍 Validando configuração Supabase:', {
      url: supabaseUrl ? '✅ DEFINIDA' : '❌ UNDEFINED',
      key: supabaseAnonKey ? '✅ DEFINIDA' : '❌ UNDEFINED'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[INSTALL_ID] ❌ Configuração Supabase incompleta');
      return false;
    }

    console.log('[INSTALL_ID] ✅ Configuração Supabase válida');
    return true;
  } catch (error) {
    console.error('[INSTALL_ID] ❌ Erro na validação:', error);
    return false;
  }
};

// Função unificada para buscar external_history
export const getExternalHistoryTotal = async (): Promise<number> => {
  try {
    const { data: externalData, error: externalError } = await supabase
      .from('external_history')
      .select('total_revenue')
      .single();

    if (externalError) {
      console.error('[EXTERNAL_HISTORY] Erro ao buscar dados:', externalError);
      return 0;
    }

    return externalData?.total_revenue ? Number(externalData.total_revenue) : 0;
  } catch (error) {
    console.error('[EXTERNAL_HISTORY] Erro crítico:', error);
    return 0;
  }
};

// 🎯 FUNÇÃO UNIFICADA PARA SOMA DE VENDAS DE HOJE
export const getTodaySalesTotal = (activeOrders: any[]): number => {
  const hoje = new Date().toISOString().split('T')[0];

  return activeOrders
    .filter((o) => {
      const isToday = new Date(o.timestamp).toISOString().split('T')[0] === hoje;
      return isToday && (o.status === 'closed' || o.status === 'paid' || o.status === 'finalized');
    })
    .reduce((acc, o) => acc + (o.total || 0), 0);
};

// 🔑 FUNÇÃO DE SINCRONIZAÇÃO IMEDIATA COM SUPABASE
export const syncOrderToSupabase = async (order: any) => {
  try {
    const isOnline = navigator.onLine;
    const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

    if (isOnline && !isTauri) {
      console.log('[SYNC ORDER] 🚀 Sincronizando venda com Supabase...', order);

      // 🔑 Calcular data_contabil se não existir (Dia Operacional)
      const dataContabil = order.data_contabil || calculateBusinessDay();

      // 🔑 Preparar items no formato da tabela order_items
      const itemsData = (order.items || []).map((item: any) => ({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order_id: order.id,
        product_id: item.dishId || item.product_id || null,
        quantity: item.quantity || 0,
        unit_price: item.unitPrice || item.unit_price || 0,
        total_price: (item.unitPrice || item.unit_price || 0) * (item.quantity || 0)
      }));
      
      // 🔑 Usar função RPC para sincronização atômica (order + order_items)
      const { error } = await supabase.rpc('sync_complete_order', {
        order_data: { 
          ...order, 
          synced_at: new Date().toISOString(),
          data_contabil: dataContabil // Garantir Dia Operacional na sincronização
        },
        items_data: itemsData
      });

      if (error) {
        console.error('[SYNC ORDER] ❌ Erro ao sincronizar:', error);
      } else {
        console.log('[SYNC ORDER] ✅ Venda sincronizada com sucesso (atômico)');
      }
    }
  } catch (error) {
    console.error('[SYNC ORDER] ❌ Erro crítico:', error);
  }
};

// 🔑 FUNÇÃO AUXILIAR - Calcular Dia Operacional usando dateUtils
function calculateBusinessDay(): string {
  const { calculateDataContabil } = require('../lib/dateUtils');
  const businessDay = calculateDataContabil();
  console.log('[SYNC ORDER] 📅 DIA OPERACIONAL calculado:', businessDay);
  return businessDay;
}
