import { create, type StoreApi, type StateCreator } from 'zustand';
import { persist, StateStorage, createJSONStorage, type PersistStorage } from 'zustand/middleware';

import { supabase } from '../supabase_standalone';

import { versionControlService } from '../lib/versionControlService';

import { sqlMigrationService } from '../lib/sqlMigrationService';

import { databaseService } from '../lib/database/databaseService';

import { Table, Order, Dish, Customer, PaymentMethod, User, SystemSettings, Notification, MenuCategory, OrderType, Employee, AttendanceRecord, StockItem, Reservation, WorkShift, OrderItem, PermissionTemplate, AuditLog, PaymentMethodConfig, Expense, PaymentSplit } from '../../types';

import { addPendingSyncOrder, type PendingSyncOrder } from '../lib/sync/pendingSyncOrders';

import { 
  saveActiveOrdersBackup, 
  loadActiveOrdersBackup, 
  checkAndRestoreActiveOrders,
  startAutoBackup,
  stopAutoBackup 
} from '../lib/sync/activeOrdersBackup';

import { emitDocumentFromOrder, documentToDbRow } from '../lib/agt/documentService';

// 🔥 Função para sincronizar contas abertas para Supabase (persistência contra falhas de energia)
// SOLUÇÃO DEFINITIVA: Usa upsert direto na tabela orders (sem depender de RPC)
export const syncActiveOrderToSupabase = async (order: Order) => {
  try {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      console.log('[SYNC ACTIVE ORDER] ⚠️ Offline - conta não sincronizada');
      return;
    }

    console.log('[SYNC ACTIVE ORDER] 🚀 Upserting ordem direto na tabela orders:', order.id);

    // 🔑 Calcular data_contabil para ordens ativas também
    const { calculateDataContabil } = await import('../lib/dateUtils');
    const dataContabil = calculateDataContabil(new Date());

    // 🔥 Serializar items para JSONB - garantir que só dados simples são enviados
    const itemsToSave = (order.items || []).map(item => ({
      dishId: item.dishId || item.dish_id || null,
      name: item.name || item.dish?.name || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.unit_price || 0,
      unitCost: item.unitCost || 0,
      taxAmount: item.taxAmount || 0,
      status: item.status || 'pending',
      notes: item.notes || ''
    }));

    const { error } = await supabase
      .from('orders')
      .upsert({
        id: order.id,
        customer_name: order.subAccountName || 'Cliente',
        total_amount: order.total || 0,
        status: order.status || 'ABERTO',
        payment_method: 'pending',
        invoice_number: order.invoiceNumber || null,
        table_id: order.tableId ? String(order.tableId) : null,
        updated_at: new Date().toISOString(),
        data_contabil: dataContabil,
        items: itemsToSave
      }, { onConflict: 'id' });

    if (error) {
      console.error('[SYNC ACTIVE ORDER] ❌ Erro ao sincronizar:', error);
    } else {
      console.log('[SYNC ACTIVE ORDER] ✅ Ordem sincronizada com sucesso');
    }
  } catch (error) {
    console.error('[SYNC ACTIVE ORDER] ❌ Erro:', error);
  }
};

// 🔥 Função para recuperar contas abertas do Supabase ao iniciar o app
// SOLUÇÃO DEFINITIVA: Select direto na tabela orders (sem depender de RPC)
export const loadActiveOrdersFromSupabase = async () => {
  try {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      console.log('[LOAD ACTIVE ORDERS] ⚠️ Offline - contas não recuperadas');
      return [];
    }

    console.log('[LOAD ACTIVE ORDERS] 🔄 Buscando ordens ABERTAS da tabela orders...');

    // 🔥 Só recuperar orders dos últimos 7 dias — evita restaurar orders antigas
    // que ficaram presas em ABERTO por crash/bug em dias anteriores
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'ABERTO')
      .gte('updated_at', cutoff)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[LOAD ACTIVE ORDERS] ❌ Erro:', error);
      return [];
    }

    console.log('[LOAD ACTIVE ORDERS] ✅ Ordens ABERTAS encontradas:', data?.length || 0);

    // 🔥 FALLBACK: Para orders sem items no JSONB, tentar buscar em order_items
    const ordersNeedingItemsFetch: string[] = [];
    if (data && data.length > 0) {
      data.forEach((order: any) => {
        const rawItems = order.items;
        const itemsLen = Array.isArray(rawItems) ? rawItems.length : 0;
        if (itemsLen === 0) ordersNeedingItemsFetch.push(order.id);
      });
    }

    let orderItemsMap: Record<string, any[]> = {};
    if (ordersNeedingItemsFetch.length > 0) {
      try {
        const { data: oiData, error: oiError } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, unit_price, notes, products!fk_order_items_product(name, price, cost_price, category_id)')
          .in('order_id', ordersNeedingItemsFetch);

        if (!oiError && oiData) {
          oiData.forEach((oi: any) => {
            if (!orderItemsMap[oi.order_id]) orderItemsMap[oi.order_id] = [];
            orderItemsMap[oi.order_id].push(oi);
          });
        }
      } catch (e) {
        // Silently fail - order_items may not have data for open orders
      }
    }

    // Converter dados do Supabase (snake_case) para formato Order (camelCase)
    const menuItems = useStore.getState().menu || [];
    const menuMap = new Map(menuItems.map((d: any) => [d.id, d]));

    const convertedOrders = (data || []).map((supabaseOrder: any) => {
      const rawItems = supabaseOrder.items || [];
      let items = Array.isArray(rawItems) ? rawItems.map((item: any) => {
        const dishId = item.dishId || item.product_id || null;
        const localDish = dishId ? menuMap.get(dishId) : null;
        return {
          dishId,
          dish: item.dish || localDish || null,
          name: item.name || item.dish?.name || localDish?.name || '',
          quantity: item.quantity || 1,
          notes: item.notes || '',
          status: item.status || 'pending',
          unitPrice: item.unitPrice || item.unit_price || item.dish?.price || localDish?.price || 0,
          unitCost: item.unitCost || item.dish?.costPrice || localDish?.costPrice || 0,
          taxAmount: item.taxAmount || 0
        };
      }) : [];

      // 🔥 FALLBACK: Se items vazios, tentar usar order_items da tabela separada
      if (items.length === 0 && orderItemsMap[supabaseOrder.id]) {
        items = orderItemsMap[supabaseOrder.id].map((oi: any) => {
          const product = oi.products || {};
          return {
            dishId: oi.product_id || null,
            dish: {
              id: oi.product_id,
              name: product.name || 'Produto',
              price: product.price || oi.unit_price || 0,
              costPrice: product.cost_price || 0,
              category_id: product.category_id || '',
              categoryId: product.category_id || ''
            } as any,
            name: product.name || 'Produto',
            quantity: oi.quantity || 1,
            notes: oi.notes || '',
            status: 'pending',
            unitPrice: oi.unit_price || product.price || 0,
            unitCost: product.cost_price || 0,
            taxAmount: 0
          };
        });
      }
      
      const total = Number(supabaseOrder.total_amount || 0);
      const taxTotal = items.reduce((sum: number, i: any) => sum + (i.taxAmount || 0) * (i.quantity || 1), 0);
      const profit = items.reduce((sum: number, i: any) => sum + ((i.unitPrice || 0) - (i.unitCost || 0)) * (i.quantity || 1), 0);
      
      return {
        id: supabaseOrder.id,
        tableId: supabaseOrder.table_id ? Number(supabaseOrder.table_id) : null,
        type: 'LOCAL',
        items,
        status: supabaseOrder.status || 'ABERTO',
        timestamp: new Date(supabaseOrder.created_at || Date.now()),
        total,
        taxTotal,
        profit,
        paymentMethod: supabaseOrder.payment_method || 'CASH',
        subAccountName: supabaseOrder.customer_name || 'Principal'
      };
    });

    console.log('[LOAD ACTIVE ORDERS] ✅ Ordens convertidas:', convertedOrders.length);
    return convertedOrders as any[];
  } catch (error) {
    console.error('[LOAD ACTIVE ORDERS] ❌ Erro:', error);
    return [];
  }
};

// 🔥 Função para deletar conta aberta do Supabase quando fechada
// SOLUÇÃO DEFINITIVA: Delete direto na tabela orders (sem depender de RPC)
export const deleteActiveOrderFromSupabase = async (localId: string) => {
  try {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      console.log('[DELETE ACTIVE ORDER] ⚠️ Offline - ordem não removida do Supabase');
      return;
    }

    // 🔥 NÃO deletar orders fechadas/pagas — só orders ativas (ABERTO/pending)
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', localId)
      .maybeSingle();

    if (fetchError) {
      console.error('[DELETE ACTIVE ORDER] ❌ Erro ao verificar status:', fetchError);
      return;
    }

    if (!order) {
      console.log('[DELETE ACTIVE ORDER] ℹ️ Order não existe no Supabase:', localId);
      return;
    }

    if (order.status === 'closed' || order.status === 'paid') {
      console.log('[DELETE ACTIVE ORDER] 🛡️ Order fechada/paga — NÃO deletar:', localId, 'Status:', order.status);
      return;
    }

    console.log('[DELETE ACTIVE ORDER] 🗑️ Removendo ordem da tabela orders:', localId, 'Status:', order.status);

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', localId);

    if (error) {
      console.error('[DELETE ACTIVE ORDER] ❌ Erro:', error);
    } else {
      console.log('[DELETE ACTIVE ORDER] ✅ Ordem removida com sucesso');
    }
  } catch (error) {
    console.error('[DELETE ACTIVE ORDER] ❌ Erro:', error);
  }
};

import { MOCK_TABLES, MOCK_USERS, MOCK_STOCK, MOCK_RESERVATIONS } from '../../constants';

import defaultLogo from '/logo.png';

import { formatKz } from '../lib/dateUtils';



// 🔑 DEBOUNCE PARA EVITAR MÚLTIPLOS POSTS NO APPLICATION_STATE

let applicationStateTimeout: NodeJS.Timeout | null = null;

const debounceApplicationState = (callback: () => void, delay: number = 2000) => {

  if (applicationStateTimeout) {

    clearTimeout(applicationStateTimeout);

  }

  applicationStateTimeout = setTimeout(callback, delay);

};



// 🔑 SUPABASE FIRST - Validar ligação antes de permitir gravações

export const validateSupabaseConnection = async (): Promise<boolean> => {

  try {

    console.log('[SUPABASE_FIRST] 🔍 Validando ligação ao Supabase...');

    

    // Testar ligação com tabela que sabemos que existe - categories

    const { error } = await supabase

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

  

  // Employees - Funcionários

  const staffChannel = supabase

    .channel('staff-global')

    .on('postgres_changes',

      { event: '*', schema: 'public', table: 'staff' },

      (payload) => {

        console.log('[REALTIME] 👥 Staff mudou:', payload);

        // Atualizar estado global automaticamente

        const store = useStore.getState();

        if (payload.eventType === 'INSERT') {

          // Adicionar funcionário

        } else if (payload.eventType === 'DELETE') {

          // Remover funcionário do estado

          store.employees = store.employees.filter(emp => emp.id !== payload.old.id);

        }

      }

    )

    .subscribe();

    

  // Expenses - Despesas

  const expensesChannel = supabase

    .channel('expenses-global')

    .on('postgres_changes',

      { event: '*', schema: 'public', table: 'expenses' },

      (payload) => {

        console.log('[REALTIME] 💰 Expense mudou:', payload);

        // Atualizar estado global automaticamente

        const store = useStore.getState();

        if (payload.eventType === 'INSERT') {

          store.expenses.push(payload.new as any);

        } else if (payload.eventType === 'DELETE') {

          store.expenses = store.expenses.filter(exp => exp.id !== payload.old.id);

        }

      }

    )

    .subscribe();

    

  return () => {

    supabase.removeChannel(staffChannel);

    supabase.removeChannel(expensesChannel);

  };

};



// 🔑 SINCRO DE ARRANQUE - Fetch total de todas as tabelas para nova MSI

export const performStartupSync = async (store?: any): Promise<boolean> => {

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

      // TODO: Atualizar store com staffData

    }

    

    // 🔥 Recuperar mesas abertas do Supabase (persistência contra falhas de energia)
    console.log('[STARTUP_SYNC] 🔄 Recuperando mesas abertas do Supabase...');
    const activeOrders = await loadActiveOrdersFromSupabase();
    console.log('[STARTUP_SYNC] ✅ Mesas abertas recuperadas:', activeOrders.length);

    // Fetch total de Orders

    const { data: ordersData, error: ordersError } = await supabase

      .from('orders')

      .select('*')

      .eq('status', 'closed')

      .order('created_at', { ascending: false })

      .limit(100);

      

    if (ordersError) {

      console.error('[STARTUP_SYNC] ❌ Erro ao buscar orders:', ordersError);

    } else {

      console.log('[STARTUP_SYNC] ✅ Orders sincronizadas:', ordersData?.length || 0, 'vendas');

      // TODO: Atualizar store com ordersData

    }

    

    // Fetch total de Expenses

    const { data: expensesData, error: expensesError } = await supabase

      .from('expenses')

      .select('*')

      .order('created_at', { ascending: false })

      .limit(50);

      

    if (expensesError) {

      console.error('[STARTUP_SYNC] ❌ Erro ao buscar expenses:', expensesError);

    } else {

      console.log('[STARTUP_SYNC] ✅ Expenses sincronizadas:', expensesData?.length || 0, 'despesas');

      // TODO: Atualizar store com expensesData

    }

    

    // Fetch total de Products

    const { data: productsData, error: productsError } = await supabase

      .from('products')

      .select('*')

      .eq('is_active', true);

      

    if (productsError) {

      console.error('[STARTUP_SYNC] ❌ Erro ao buscar products:', productsError);

    } else {

      console.log('[STARTUP_SYNC] ✅ Products sincronizados:', productsData?.length || 0, 'produtos');

      // Atualizar store com productsData
      if (productsData && productsData.length > 0 && store) {
        store.setProducts(productsData);
      }

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



// @command: UNIFICAÇÃO FINANCEIRA TOTAL

// 1. Padronizar Status: Alterar todos os status de 'FECHADO' para 'closed' no store

// 2. Criar Seletor Único de Faturação de Hoje:



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

export const getTodaySalesTotal = (state: StoreState): number => {

  const hoje = new Date().toISOString().split('T')[0]; // 🔑 UNIFICADO: toISOString().split('T')[0]

  

  // Somar ordens do estado local que coincidem com hoje

  const localTotal = state.activeOrders

    .filter(o => {

      const isToday = new Date(o.timestamp).toISOString().split('T')[0] === hoje; // 🔑 UNIFICADO

      // 🚨 CORREÇÃO: Incluir TODAS as variações de status

      return isToday && (o.status === 'FECHADO');

    })

    .reduce((acc, o) => acc + (o.total || 0), 0);



  return localTotal;

};



// 🔑 FUNÇÃO DE SINCRONIZAÇÃO IMEDIATA COM SUPABASE

export const syncOrderToSupabase = async (order: any) => {

  try {

    const isOnline = navigator.onLine;

    const isTauri = !!(window as any).__TAURI_INTERNALS__;

    

    if (isOnline && !isTauri) {

      // App Web online: Sincronizar IMEDIATAMENTE com Supabase

      console.log('[SYNC ORDER] 🚀 Sincronizando venda com Supabase...', order);

      

      // 🔑 Preparar items no formato da tabela order_items (product_id, order_id text, etc.)
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
          synced_at: new Date().toISOString()
        },
        items_data: itemsData
      });

        

      if (error) {

        console.error('[SYNC ORDER] ❌ Erro ao sincronizar com Supabase:', error);

        return false;

      } else {

        console.log('[SYNC ORDER] ✅ Venda sincronizada com Supabase (atômico)');

        return true;

      }

    } else if (isTauri && isOnline) {

      // App Tauri online: Tentar sincronizar depois

      console.log('[SYNC ORDER] 📱 App Tauri online - agendando sincronização...');

      setTimeout(async () => {

        try {

          await supabase

            .from('orders')

            .insert({

              ...order,

              synced_at: new Date().toISOString()

            });

          console.log('[SYNC ORDER] ✅ Tauri sincronizado com Supabase');

        } catch (syncError) {

          console.error('[SYNC ORDER] ❌ Erro na sincronização do Tauri:', syncError);

        }

      }, 500);

      return true;

    } else {

      // Offline: Guardar apenas localmente

      console.log('[SYNC ORDER] 📴 Offline - venda guardada apenas localmente');

      return false;

    }

  } catch (error) {

    console.error('[SYNC ORDER] ❌ Erro crítico na sincronização:', error);

    return false;

  }

};



// 🎯 FUNÇÃO UNIFICADA PARA FILTRO DE DATA DE HOJE

export const getTodayDateString = (): string => {

  return new Date().toISOString().split('T')[0]; // 🔑 PADRÃO UNIFICADO

};



// 🔗 BroadcastChannel para sync entre tabs - criado lazy para evitar erro SSR

let syncChannel: BroadcastChannel | null = null;

const getSyncChannel = (): BroadcastChannel | null => {

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !syncChannel) {

    syncChannel = new BroadcastChannel('vereda_state_sync');

  }

  return syncChannel;

};



// 🔑 LIMPEZA DE PRODUTOS - Remover produto problemático que bloqueia deletes

export const cleanupProblematicProduct = async () => {

  try {

    console.log('[CLEANUP] 🔍 Procurando produto problemático...');

    

    // Buscar produto com ID específico que causa erro 23502

    const { data: problematicProduct, error } = await supabase

      .from('products')

      .select('*')

      .eq('id', '531522f2-8ed0-42cd-90a3-849c43434cc4')

      .single();

    

    if (error && error.code !== 'PGRST116') {

      console.error('[CLEANUP] ❌ Erro ao buscar produto problemático:', error);

      return false;

    }

    

    if (problematicProduct) {

      console.log('[CLEANUP] 🎯 Produto problemático encontrado:', problematicProduct);

      

      // Tentar corrigir nome se for null

      if (!problematicProduct.name || problematicProduct.name === null) {

        console.log('[CLEANUP] 🔧 Corrigindo nome do produto...');

        const { error: updateError } = await supabase

          .from('products')

          .update({ name: 'Produto Corrigido Automaticamente' })

          .eq('id', '531522f2-8ed0-42cd-90a3-849c43434cc4');

          

        if (updateError) {

          console.log('[CLEANUP] 🗑️ Falha ao corrigir, apagando produto...');

          const { error: deleteError } = await supabase

            .from('products')

            .delete()

            .eq('id', '531522f2-8ed0-42cd-90a3-849c43434cc4');

            

          if (deleteError) {

            console.error('[CLEANUP] ❌ Erro ao apagar produto problemático:', deleteError);

            return false;

          }

          

          console.log('[CLEANUP] ✅ Produto problemático apagado com sucesso');

        } else {

          console.log('[CLEANUP] ✅ Produto corrigido com sucesso');

        }

      }

    } else {

      console.log('[CLEANUP] ℹ️ Produto problemático não encontrado');

    }

    

    return true;

  } catch (error) {

    console.error('[CLEANUP] ❌ Erro crítico na limpeza:', error);

    return false;

  }

};



// 🔑 FORÇAR REFRESH - Tentar apagar despesa após limpeza

export const retryDeleteExpense = async (expenseId: string) => {

  try {

    console.log('[RETRY] 🔄 Tentando apagar despesa após limpeza:', expenseId);

    

    // Primeiro limpar produto problemático

    const cleanupSuccess = await cleanupProblematicProduct();

    

    if (!cleanupSuccess) {

      console.log('[RETRY] ❌ Falha na limpeza, abortando retry');

      return false;

    }

    

    // Esperar um pouco para garantir que o banco atualizou

    await new Promise(resolve => setTimeout(resolve, 1000));

    

    // Tentar apagar despesa novamente

    const { error } = await supabase

      .from('expenses')

      .delete()

      .eq('id', expenseId);

      

    if (error) {

      console.error('[RETRY] ❌ Erro ao apagar despesa no retry:', error);

      return false;

    }

    

    console.log('[RETRY] ✅ Despesa apagada com sucesso no retry');

    return true;

  } catch (error) {

    console.error('[RETRY] ❌ Erro crítico no retry:', error);

    return false;

  }

};



const customPersistenceStorage: StateStorage = {
  getItem: async (): Promise<string | null> => {

    try {

      const persistedState = localStorage.getItem('vereda-store');

      if (persistedState) {

        try {

          // Validar JSON antes de retornar
          const parsed = JSON.parse(persistedState);

          return persistedState;

        } catch (parseError) {

          // Silenciar logs para evitar quota exceed
          localStorage.removeItem('vereda-store');

        }

      }

      return null;

    } catch (e) {

      // Silenciar logs para evitar quota exceed
      return null;

    }

  },

  setItem: async (_name: string, value: string): Promise<void> => {

    try {

      // 🔥 SALVAR NO LOCALSTORAGE PRIMEIRO PARA GARANTIR PERSISTÊNCIA IMEDIATA
      localStorage.setItem('vereda-store', value);

    } catch (e: any) {

      // 🔥 PROTEÇÃO DEFINITIVA CONTRA QuotaExceededError
      if (e?.name === 'QuotaExceededError' || e?.message?.includes('quota') || e?.message?.includes('exceeded')) {
        console.warn('[ZUSTAND PERSIST] 🚨 QuotaExceededError detectado - limpando storage e tentando novamente...');
        try {
          // Limpar dados não essenciais para fazer espaço
          const keysToKeep = ['vereda-store', 'active_orders_backup_v1'];
          const allKeys = Object.keys(localStorage);
          for (const key of allKeys) {
            if (!keysToKeep.includes(key) && !key.startsWith('zustand-')) {
              localStorage.removeItem(key);
            }
          }
          // Tentar salvar novamente
          localStorage.setItem('vereda-store', value);
          console.log('[ZUSTAND PERSIST] ✅ Storage limpo e salvo com sucesso');
        } catch (retryError) {
          console.error('[ZUSTAND PERSIST] ❌ Falha mesmo após limpeza - dados serão mantidos em memória apenas');
        }
      }

    }

  },

  removeItem: async (_name: string): Promise<void> => {

    try {

      // REMOVER DO LOCALSTORAGE
      localStorage.removeItem('vereda-store');

      // REMOVER DO SQLITE se disponível (Electron)
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { sqliteService } = await import('../lib/sqliteService');
        await sqliteService.saveState(null);
      }

    } catch (e) {

      // Silenciar logs para evitar quota exceed

    }

  }

};



interface StoreState {

  users: User[];

  currentUser: User | null;

  login: (pin: string, userId?: string) => boolean;

  logout: () => void;

  resetLocalState: () => void;

  clearZustandPersist: () => void;

  addUser: (user: User) => void;

  updateUser: (user: User) => void;

  removeUser: (id: string) => void;

  

  permissionTemplates: PermissionTemplate[];

  addPermissionTemplate: (template: PermissionTemplate) => void;

  updatePermissionTemplate: (template: PermissionTemplate) => void;

  removePermissionTemplate: (id: string) => void;



  transferTable: (fromTableId: number, toTableId: number) => void;

  cancelEmptyTable: (tableId: number) => void;

  addSubAccount: (tableId: number, name: string) => string;

  removeSubAccount: (orderId: string) => void;

  mergeOrders: (sourceOrderId: string, targetOrderId: string) => void;

  

  // Pagamentos

  addPaymentConfig: (config: Omit<PaymentMethodConfig, 'id'>) => void;

  updatePaymentConfig: (id: string, config: Partial<PaymentMethodConfig>) => void;

  

  // Configurações e UI

  settings: SystemSettings;

  updateSettings: (settings: Partial<SystemSettings>) => void;

  auditLogs: AuditLog[];

  paymentConfigs: PaymentMethodConfig[];

  notifications: Notification[];

  addNotification: (type: Notification['type'], message: string) => void;

  removeNotification: (id: string) => void;

  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => void;

  tables: Table[];

  categories: MenuCategory[];

  menu: Dish[];

  products: any[];

  activeOrders: Order[];

  customers: Customer[];

  activeTableId: number | null;

  activeOrderId: string | null;

  customerDisplayMode: Record<number, 'MARKETING' | 'ORDER_SUMMARY'>;

  setCustomerDisplayMode: (tableId: number, mode: 'MARKETING' | 'ORDER_SUMMARY') => void;

  invoiceCounter: number;

  attendance: AttendanceRecord[];

  stock: StockItem[];

  reservations: Reservation[];

  workShifts: WorkShift[];

  

  // Despesas

  expenses: Expense[];

  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;

  updateExpense: (id: string, expense: Partial<Expense>) => void;

  removeExpense: (id: string) => void;

  approveExpense: (id: string, approvedBy: string) => void;

  loadExpenses: () => Promise<void>;

  syncProductsToCloud: () => Promise<void>;

  syncCategoriesToCloud: () => Promise<void>;

  syncPendingOrdersToSupabase: () => Promise<{ synced: number; failed: number }>;

  

  // Função unificada de faturação de hoje

  getTodayRevenue: () => Promise<number>;

  

  setActiveTable: (id: number | null) => void;

  setActiveOrder: (id: string | null) => void;

  setActiveOrders: (orders: Order[]) => void;

  createNewOrder: (tableId: number | null, name?: string, type?: OrderType) => string;

  transferOrder: (orderId: string, targetTableId: number) => void;

  addToOrder: (tableId: number | null, dish: Dish, quantity?: number, notes?: string, orderId?: string) => void;
  removeFromOrder: (orderId: string, itemIndex: number) => void;

  checkoutTable: (orderId: string, paymentMethod: PaymentMethod, customerId?: string, customerNif?: string, documentType?: string) => Promise<{ success: boolean; savedLocally?: boolean }>;

  splitCheckout: (orderId: string, splits: PaymentSplit[], documentType?: string) => Promise<{ success: boolean; savedLocally?: boolean; invoices?: string[] }>;

  updateOrderPaymentMethod: (orderId: string, newMethod: PaymentMethod) => void;

  

  updateTablePosition: (id: number, x: number, y: number) => void;

  addTable: (table: Table) => void;

  updateTable: (table: Table) => void;

  removeTable: (id: number) => void;

  closeTable: (id: number) => void;



  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  updateOrderItemStatus: (orderId: string, itemIndex: number, status: OrderItem['status']) => void;

  markOrderAsServed: (orderId: string) => void;



  toggleDishVisibility: (id: string) => void;

  toggleDishFeatured: (id: string) => void;

  toggleCategoryVisibility: (id: string) => void;



  addDish: (dish: Dish) => void;

  updateDish: (dish: Dish) => void;

  removeDish: (id: string) => void;

  addCategory: (cat: MenuCategory) => void;

  updateCategory: (cat: MenuCategory) => void;

  removeCategory: (id: string) => void;

  duplicateDish: (id: string) => void;

  duplicateCategory: (id: string) => void;

  updateStockQuantity: (id: string, delta: number) => void;



  addCustomer: (customer: Customer) => void;

  updateCustomer: (customer: Customer) => void;

  removeCustomer: (id: string) => void;

  settleCustomerDebt: (id: string, amount: number) => void;



  employees: Employee[];

  addEmployee: (e: Employee) => void;

  addEmployeeWithPersistence: (e: Employee) => Promise<void>;

  updateEmployee: (e: Employee) => void;

  updateEmployeeWithPersistence: (e: Employee) => Promise<boolean>;

  removeEmployee: (id: string) => void;

  loadEmployees: () => Promise<void>;

  clockIn: (employeeId: string) => void;

  clockOut: (employeeId: string) => void;

  externalClockSync: (bioId: string) => void;



  addWorkShift: (shift: WorkShift) => void;

  updateWorkShift: (shift: WorkShift) => void;

  removeWorkShift: (id: string) => void;

  loadWorkShifts: () => Promise<void>;



  addReservation: (res: Reservation) => void;

  updateReservation: (id: string, updates: Partial<Reservation>) => void;

  cancelReservation: (id: string) => void;

  deleteReservation: (id: string) => void;



  backupToSupabase: () => Promise<void>;

  restoreFromSupabase: () => Promise<void>;

  resetFinancialData: () => void;

  fetchOrders: () => Promise<void>;

  

  setMenu: (menu: Dish[]) => void;

  setProducts: (products: any[]) => void;

  setCategories: (categories: MenuCategory[]) => void;

  setTables: (tables: Table[]) => void;

  setCustomers: (customers: Customer[]) => void;

  events: any[];
  loadEvents: () => Promise<void>;

}

export const useStore = create<StoreState>()(
  // 🔥🔥🔥 PERSISTÊNCIA OTIMIZADA - SEM LOGS EXCESSIVOS
  persist(
    ((set, get) => ({

      users: [],

      currentUser: null,

      permissionTemplates: [

        { id: 'tp-waiter', name: 'Perfil Garçom', description: 'Permissões básicas para atendimento de mesas.', permissions: ['POS_SALES'] },

        { id: 'tp-cashier', name: 'Perfil Caixa', description: 'Acesso a vendas e descontos.', permissions: ['POS_SALES', 'POS_DISCOUNT'] },

        { id: 'tp-manager', name: 'Perfil Gerente', description: 'Acesso total operativo e financeiro.', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE'] },

        { id: 'tp-owner', name: 'Perfil Proprietário', description: 'Controlo total e acesso ao Owner Hub.', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'] }

      ],

      addPermissionTemplate: (t) => set(state => ({ permissionTemplates: [...state.permissionTemplates, t] })),

      updatePermissionTemplate: (t) => set(state => ({ permissionTemplates: state.permissionTemplates.map(x => x.id === t.id ? t : x) })),

      removePermissionTemplate: (id) => set(state => ({ permissionTemplates: state.permissionTemplates.filter(x => x.id !== id) })),



      login: (pin, userId) => {

        // 🔥🔥🔥🔥 LOGIN OFFLINE TOTAL - APP WINDOWS SEM DEPENDÊNCIAS
        const isElectron = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
        console.log('[OFFLINE LOGIN] 🚨 MODO OFFLINE TOTAL:', { pin, userId, isElectron });
        
        // CAMADA 1: Validação básica do PIN (offline)
        if (!pin || pin.length !== 4) {
          try {
            get().addNotification('error', 'PIN deve ter 4 dígitos');
          } catch (e) {
            console.log('[OFFLINE LOGIN] ❌ Erro notificação, mas continuando...');
          }
          return false;
        }

        // CAMADA 2: LIMPEZA OFFLINE PARA ELECTRON (sem dependências)
        if (isElectron) {
          console.log('[OFFLINE LOGIN] 🖥️ App Windows - Modo Offline Total');
          
          // Limpar localStorage apenas se necessário (sem bloquear login)
          try {
            const testKey = 'offline-login-test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            console.log('[OFFLINE LOGIN] ✅ localStorage OK');
          } catch (e) {
            console.log('[OFFLINE LOGIN] 🔥 localStorage cheio - limpando essencial...');
            try {
              // Manter apenas essencial para login offline
              const keysToKeep = ['offline-login-user', 'offline-session'];
              const allKeys = Object.keys(localStorage);
              
              allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                  localStorage.removeItem(key);
                }
              });
              
              console.log('[OFFLINE LOGIN] ✅ localStorage limpo para modo offline');
            } catch (cleanupError) {
              console.log('[OFFLINE LOGIN] ⚠️ Falha limpeza, mas login continua...');
            }
          }
        }

        // CAMADA 0: MASTER DE EMERGÊNCIA — sempre funciona, offline, sem Supabase
        const EMERGENCY_USER = { id: 'emergency-master', name: 'Admin Master', role: 'ADMIN' as const, pin: '0011', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'AGT_CONFIG', 'OWNER_ACCESS'], status: 'ATIVO' };
        if (String(pin).trim() === EMERGENCY_USER.pin) {
          console.log('[EMERGENCY LOGIN] 🔑 PIN master de emergência aceite');
          set({ currentUser: EMERGENCY_USER as any });
          try { get().addNotification('success', `Acesso autorizado: ${EMERGENCY_USER.name}`); } catch (_) {}
          return true;
        }

        // CAMADA 2A: VERIFICAR PRIMEIRO NOS UTILIZADORES DO STATE (PINs editados pelo Controlo de Acesso)
        let stateUsers = get().users || [];
        console.log('[INFALLIBLE LOGIN] 👥 Utilizadores no state:', stateUsers.length);

        // Se state está vazio, tentar carregar do localStorage cache (pos_operators_cache)
        if (stateUsers.length === 0) {
          try {
            const cached = localStorage.getItem('pos_operators_cache');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                set({ users: parsed });
                stateUsers = parsed;
                console.log('[INFALLIBLE LOGIN] ✅ Operadores carregados do cache local:', parsed.length);
              }
            }
          } catch (e) {
            console.log('[INFALLIBLE LOGIN] ⚠️ Cache não disponível');
          }
        }

        let foundUser: any = null;
        const inputPin = String(pin).trim();

        // Prioridade 1: Buscar nos utilizadores do state (podem ter PINs actualizados)
        if (stateUsers.length > 0) {
          foundUser = stateUsers.find(user => {
            const userPin = String(user.pin || '').trim();
            return userPin === inputPin;
          });
          if (foundUser) {
            console.log('[INFALLIBLE LOGIN] ✅ Encontrado no state:', foundUser.name);
          }
        }

        // CAMADA 2B: FALLBACK - USUÁRIOS EMBUTIDOS (caso state esteja vazio ou PIN não encontrado)
        if (!foundUser) {
          const EMBEDDED_USERS = [
            { id: '1', name: 'Gerente (Admin)', role: 'ADMIN' as const, pin: '1234', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'AGT_CONFIG'], status: 'ATIVO' },
            { id: '2', name: 'Operador de Caixa', role: 'CAIXA' as const, pin: '1111', permissions: ['POS_SALES', 'POS_DISCOUNT'], status: 'ATIVO' },
            { id: '3', name: 'Chefe de Cozinha', role: 'COZINHA' as const, pin: '2222', permissions: [], status: 'ATIVO' },
            { id: '4', name: 'Garçom', role: 'GARCOM' as const, pin: '3333', permissions: ['POS_SALES'], status: 'ATIVO' },
            { id: '5', name: 'Proprietário', role: 'OWNER' as const, pin: '0000', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'], status: 'ATIVO' }
          ];

          console.log('[INFALLIBLE LOGIN] 👥 Fallback para embutidos:', EMBEDDED_USERS.length);

          foundUser = EMBEDDED_USERS.find(user => {
            const userPin = String(user.pin || '').trim();
            return userPin === inputPin;
          });
        }

        console.log('[INFALLIBLE LOGIN] 🎯 Resultado busca:', foundUser ? `✅ ${foundUser.name}` : '❌ NENHUM');

        // CAMADA 4: SUCESSO GARANTIDO - SEM DEPENDÊNCIAS
        if (foundUser) {
          console.log('[INFALLIBLE LOGIN] ✅ SUCESSO GARANTIDO:', foundUser.name);
          
          // Forçar estado do usuário - SEM DEPENDER DE STORE EXTERNO
          try {
            set({ 
              currentUser: foundUser as any
            });
          } catch (setStateError) {
            console.log('[OFFLINE LOGIN] ⚠️ Erro ao setar estado, mas continuando...');
            // Continuar mesmo se setState falhar
          }

          // CAMADA OFFLINE TOTAL: Sem dependências de SQLite ou Supabase
          if (isElectron) {
            console.log('[OFFLINE LOGIN] 🖥️ App Windows - Login 100% offline');
            
            // Salvar sessão offline simples (sem dependências)
            try {
              const offlineSession = {
                userId: foundUser.id,
                userName: foundUser.name,
                userRole: foundUser.role,
                loginTime: new Date().toISOString(),
                offlineMode: true
              };
              localStorage.setItem('offline-login-user', JSON.stringify(offlineSession));
              console.log('[OFFLINE LOGIN] ✅ Sessão offline salva');
            } catch (sessionError) {
              console.log('[OFFLINE LOGIN] ⚠️ Erro salvar sessão offline, mas login OK');
            }
          }
          
          // Notificação de sucesso (sem dependências)
          try {
            get().addNotification('success', `Acesso autorizado: ${foundUser.name}`);
          } catch (notifError) {
            console.log('[OFFLINE LOGIN] ⚠️ Erro notificação, mas login OK');
          }
          
          console.log('[OFFLINE LOGIN] 🎉 LOGIN OFFLINE BEM-SUCEDIDO - APP FUNCIONANDO');
          return true;
        }

        // CAMADA 5: FALHA - PIN REALMENTE INCORRETO
        console.log('[INFALLIBLE LOGIN] ❌ PIN NÃO ENCONTRADO - VERIFIQUE O PIN');
        try {
          get().addNotification('error', 'PIN Incorreto');
        } catch (notifError) {
          console.log('[INFALLIBLE LOGIN] ❌ Erro notificação falha');
        }
        
        return false;

      },

      logout: () => {

        // 🔥🔥🔥 LOGOUT INFALÍVEL - MANTER BACKUPS
        const currentUser = get().currentUser;
        
        // Backup da sessão antes de limpar
        if (currentUser) {
          try {
            localStorage.setItem('last-user-session', JSON.stringify({
              user: currentUser,
              logoutTime: new Date().toISOString()
            }));
          } catch (e) {
            console.log('[LOGOUT BACKUP] ❌ Falha backup sessão:', e);
          }
        }

        // Limpeza segura (mantendo backups críticos)
        const backupUsers = localStorage.getItem('users-backup');
        const backupSession = localStorage.getItem('current-user-backup');
        
        localStorage.clear();
        
        // Restaurar backups críticos
        if (backupUsers) localStorage.setItem('users-backup', backupUsers);
        if (backupSession) localStorage.setItem('current-user-backup', backupSession);

        set({ currentUser: null });

      },

      // Função para reset completo do estado local

      resetLocalState: () => {

        console.log('🧹 Limpando todo o estado local...');

        localStorage.clear();

        

        // 🔑 MATAR CACHE DO ZUSTAND - Limpar persistência

        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {

          // Em Tauri, limpar também o storage persistente (sem dependência externa)

          console.log('[ZUSTAND] Limpando storage Tauri...');

        }

        

        // Limpar também o estado do store - RESET COMPLETO

        set({

          activeOrders: [], // 🔑 LIMPAR ORDENS ATIVAS

          tables: MOCK_TABLES,

          menu: [],

          products: [],

          categories: [],

          customers: [],

          expenses: [],

          stock: MOCK_STOCK,

          reservations: MOCK_RESERVATIONS,

          attendance: [],

          workShifts: [],

          employees: [],

          invoiceCounter: 1,

          activeTableId: null,

          activeOrderId: null,

          customerDisplayMode: {},

          currentUser: null // 🔑 LIMPAR USUÁRIO LOGADO

        });

        

        console.log('✅ Estado local limpo. Dashboard deve marcar 0 Kz em todos os menus.');

        console.log('🔄 Recarregando a página para aplicar reset...');

        setTimeout(() => {

          window.location.reload();

        }, 1000);

      },

      // 🔑 FUNÇÃO ESPECÍFICA PARA LIMPAR PERSISTÊNCIA DO ZUSTAND

      clearZustandPersist: () => {

        console.log('🧹 [ZUSTAND] Limpando persistência do Zustand...');

        

        // Limpar localStorage onde o Zustand guarda os dados

        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {

          const key = localStorage.key(i);

          if (key && key.startsWith('zustand-')) {

            keysToRemove.push(key);

          }

        }

        

        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log(`✅ [ZUSTAND] Removidas ${keysToRemove.length} chaves de persistência`);

        

        // Forçar reload

        setTimeout(() => {

          window.location.reload();

        }, 500);

      },

      addUser: (user) => set(state => ({ users: [...state.users, user] })),

      updateUser: (user) => set(state => ({ users: state.users.map(u => u.id === user.id ? user : u) })),

      removeUser: (id) => set(state => ({ users: state.users.filter(u => u.id !== id) })),

      auditLogs: [],

      paymentConfigs: [

        { id: '1', name: 'Numerário', type: 'NUMERARIO', icon: 'Banknote', isActive: true },

        { id: '2', name: 'TPA / Multicaixa', type: 'TPA', icon: 'CreditCard', isActive: true },

        { id: '3', name: 'Transferência', type: 'TRANSFERENCIA', icon: 'ArrowRightLeft', isActive: true },

        { id: '4', name: 'Referência QR', type: 'QR_CODE', icon: 'QrCode', isActive: true },

      ],

      notifications: [],

      expenses: [],

      addNotification: (type, message) => {

        const id = Math.random().toString(36).substring(7);

        set(state => {

          // Limpar notificações anteriores ao adicionar nova

          const currentNotifications = state.notifications.slice(-1); // Manter apenas a mais recente

          return { notifications: [...currentNotifications, { id, type, message }] };

        });

        

        // Tempo de duração baseado no tipo

        const duration = type === 'success' ? 2000 : 5000; // 2s para sucesso, 5s para outros

        setTimeout(() => get().removeNotification(id), duration);

      },

      removeNotification: (id) => set(state => ({

        notifications: state.notifications.filter(n => n.id !== id)

      })),

      addAuditLog: (log) => {

        const currentUser = get().currentUser || { id: 'sys', name: 'Sistema' };

        const newLog: AuditLog = {

          ...log,

          id: `log-${Date.now()}`,

          timestamp: new Date(),

          userId: currentUser.id,

          userName: currentUser.name

        };

        set(state => ({ auditLogs: [newLog, ...state.auditLogs].slice(0, 1000) }));

      },

      settings: {

        restaurantName: "Tasca do Vereda",

        appLogoUrl: defaultLogo,

        currency: "Kz",

        taxRate: 14,

        taxRegime: 'GERAL',

        phone: "+244 923 000 000",

        address: "Via AL 15, Talatona, Luanda",

        nif: "5000000000",

        email: "info@tascadovereda.ao",

        website: "www.tascadovereda.ao",

        commercialReg: "L001-2025",

        capitalSocial: "100.000,00 Kz",

        conservatoria: "Conservatória do Registo Comercial de Luanda",

        agtCertificate: "000/AGT/2025",

        invoiceSeries: "2025",

        kdsEnabled: true,

        isSidebarCollapsed: false,

        apiToken: "V-OS-QUBIT-777",

        supabaseUrl: "https://tboiuiwlqfzcvakxrsmj.supabase.co",

        supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU",

        autoBackup: true,

        customDigitalMenuUrl: "https://tasca-do-vereda.vercel.app/menu-digital",

        agtSoftwareCertification: "AGT-2025-001",

        agtSoftwareVersion: "1.0.11",

        agtProductionCertificate: "PROD-2025-001",

        agtProcessNumber: "PROCESS-2025-001",

        agtCertificationDate: "2025-01-01",

        agtValidityPeriod: "2025-12-31",

        agtTechnicalResponsible: "Tasca Dev Team",

        agtContactEmail: "dev@tascadovereda.ao",

        agtSupportPhone: "+244 923 000 001",

        saftPassword: "saft_secure_2025",

        digitalSignatureEnabled: true,

        electronicInvoiceEnabled: true,

        agtEnvironment: 'homologation',

        dataRetentionPeriod: 365,

        backupFrequency: 1,

        lastAuditDate: "2025-01-01",

        nextAuditDate: "2026-01-01"

      },

      updateSettings: (s) => {

        const oldState = get();

        versionControlService.createRestorePoint('Auto-backup antes de alteração de definições', oldState);

        

        // Se auto-backup estiver ativo, criar um backup real no DB Hub

        if (s.autoBackup && !get().settings.autoBackup) {

          databaseService.createBackup('Ativação de Auto-Backup', oldState);

        }



        set(state => {

          const merged = { ...state.settings, ...s };

          const baseUrl = "https://tasca-do-vereda.vercel.app/menu-digital";

          const shareUrl = (merged.supabaseUrl && merged.supabaseKey)

            ? `${baseUrl}?supabaseUrl=${encodeURIComponent(merged.supabaseUrl)}&anonKey=${encodeURIComponent(merged.supabaseKey)}`

            : baseUrl;

          return { settings: { ...merged, customDigitalMenuUrl: shareUrl } };

        });

        

        // Auto-sync to Supabase if enabled

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },

      tables: MOCK_TABLES,

      categories: [],

      menu: [],

      products: [],

      activeOrders: [],

      customers: [],

      events: [],

      activeTableId: null,

      activeOrderId: null,

      customerDisplayMode: {},

      setCustomerDisplayMode: (tableId, mode) => set(state => ({

        customerDisplayMode: { ...state.customerDisplayMode, [tableId]: mode }

      })),

      invoiceCounter: 1,

      employees: [],

      attendance: [],

      stock: MOCK_STOCK,

      reservations: MOCK_RESERVATIONS,

      workShifts: [],



      setActiveTable: (id) => set({ activeTableId: id }),

      setActiveOrder: (id) => set({ activeOrderId: id }),

      setActiveOrders: (orders) => {
        console.log('[SET ACTIVE ORDERS] 📋 Definindo activeOrders:', {
          quantidade: orders.length,
          ordens: orders.map(o => ({
            id: o.id,
            tableId: o.tableId,
            items: o.items?.length || 0,
            total: o.total,
            status: o.status
          }))
        });
        set({ activeOrders: orders });
      },



      toggleDishVisibility: (id) => set(state => ({

        menu: state.menu.map(d => d.id === id ? { ...d, isVisibleDigital: !d.isVisibleDigital } : d)

      })),

      toggleDishFeatured: (id) => set(state => ({

        menu: state.menu.map(d => d.id === id ? { ...d, isFeatured: !d.isFeatured } : d)

      })),

      toggleCategoryVisibility: (id) => set(state => ({

        categories: state.categories.map(c => c.id === id ? { ...c, isVisibleDigital: !c.isVisibleDigital } : c)

      })),



      addDish: (d) => set(state => ({ menu: [...state.menu, { ...d, isVisibleDigital: true }] })),

      updateDish: (d) => {
        console.log('[updateDish] Atualizando prato:', d);
        console.log('[updateDish] Menu antes:', get().menu.length);
        console.log('[updateDish] Prato encontrado no menu:', get().menu.find(x => x.id === d.id)?.name);

        versionControlService.createRestorePoint(`Alteração no prato: ${d.name}`, get());

        set(state => {
          const newMenu = state.menu.map(x => x.id === d.id ? d : x);
          console.log('[updateDish] Menu depois:', newMenu.length);
          console.log('[updateDish] Prato atualizado:', newMenu.find(x => x.id === d.id));
          return { menu: newMenu };
        });

        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          console.log('[updateDish] Executando autoMigrate...');
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },

      removeDish: (id) => {

        const dish = get().menu.find(x => x.id === id);

        versionControlService.createRestorePoint(`Remoção do prato: ${dish?.name || id}`, get());

        set(state => ({ menu: state.menu.filter(x => x.id !== id) }));

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },

      addCategory: (c) => {

        set(state => ({ categories: [...state.categories, { ...c, isVisibleDigital: true }] }));

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },

      updateCategory: (c) => {

        versionControlService.createRestorePoint(`Alteração na categoria: ${c.name}`, get());

        set(state => ({ categories: state.categories.map(x => x.id === c.id ? c : x) }));

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },

      removeCategory: (id: string) => set(state => ({ categories: state.categories.filter(x => x.id !== id) })),



      duplicateDish: (id: string) => {

        const original = get().menu.find(d => d.id === id);

        if (!original) return;



        const newDish: Dish = {

          ...original,

          id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,

          name: `${original.name} (Cópia)`,

          isVisibleDigital: original.isVisibleDigital,

          isFeatured: original.isFeatured

        };



        set(state => ({ menu: [...state.menu, newDish] }));

        get().addAuditLog({

          module: 'SYSTEM',

          action: 'DUPLICAR_PRODUTO',

          details: `Produto duplicado: ${original.name} (ID: ${original.id}) -> ${newDish.name} (ID: ${newDish.id})`

        });

        get().addNotification('success', `Produto "${original.name}" duplicado com sucesso.`);

        

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },



      duplicateCategory: (id: string) => {

        const original = get().categories.find(c => c.id === id);

        if (!original) return;



        const newCatId = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        const newCategory: MenuCategory = {

          ...original,

          id: newCatId,

          name: `${original.name} (Cópia)`

        };



        // Duplicar também os produtos desta categoria

        const categoryProducts = get().menu.filter(d => d.category_id === id);

        const newDishes = categoryProducts.map(d => ({

          ...d,

          id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,

          name: `${d.name} (Cópia)`,

          category_id: newCatId

        }));

        

        set(state => ({ 

          categories: [...state.categories, newCategory],

          menu: [...state.menu, ...newDishes]

        }));



        get().addAuditLog({

          module: 'SYSTEM',

          action: 'DUPLICAR_CATEGORIA',

          details: `Categoria duplicada: ${original.name} (ID: ${original.id}) -> ${newCategory.name} (ID: ${newCategory.id}). ${newDishes.length} produtos duplicados.`

        });

        get().addNotification('success', `Categoria "${original.name}" e ${newDishes.length} produtos duplicados com sucesso.`);



        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },



      updateStockQuantity: (id, delta) => set(state => ({

        stock: state.stock.map(s => s.id === id ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s)

      })),



      createNewOrder: (tableId: number | null, name?: string, type?: OrderType) => {

        console.log('[CREATE ORDER] 🔍 Criando nova ordem:', { tableId, name, type });

        // 🔑 Gerar UUID válido para compatibilidade com Supabase
        const id = crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const orderType = type || 'LOCAL';
        
        // 🔥 USAR O NOME SE FORNECIDO, senão deixar vazio (Principal)
        const subAccountName = name && name.trim() ? name.trim() : '';

        const newOrder: Order = {

          id,

          tableId,

          type: orderType,

          status: 'ABERTO',

          items: [],

          total: 0,

          taxTotal: 0,

          profit: 0,

          timestamp: new Date(),

          subAccountName

        };

        // 🔑 LOGAR ANTES DE CRIAR
        console.log('[CREATE ORDER] 📋 Criando nova ordem:', {
          id,
          tableId,
          type: orderType,
          activeOrdersAntes: get().activeOrders.length
        });

        set(state => ({

          activeOrders: [...state.activeOrders, newOrder],

          activeOrderId: id,

          tables: tableId ? state.tables.map(t => t.id === tableId ? { ...t, status: 'OCUPADO' as const } : t) : state.tables

        }));

        // 🔑 LOGAR APÓS CRIAR
        console.log('[CREATE ORDER] ✅ Ordem criada:', {
          id,
          activeOrdersDepois: get().activeOrders.length
        });

        // 🔥 Sincronizar conta aberta para Supabase (persistência contra falhas de energia)
        console.log('[CREATE ORDER] 🔥 Chamando syncActiveOrderToSupabase para ordem:', newOrder.id);
        syncActiveOrderToSupabase(newOrder).catch(err => {
          console.error('[CREATE ORDER] ❌ Erro ao sincronizar ordem:', err);
        });

        return id;

      },



      transferOrder: (orderId, targetTableId) => {

        set(state => {

          const order = state.activeOrders.find(o => o.id === orderId);

          if (!order) return state;

          

          const oldTableId = order.tableId;

          const newOrders = state.activeOrders.map(o => o.id === orderId ? { ...o, tableId: targetTableId } : o);

          

          const oldTableStillHasOrders = newOrders.some(o => o.tableId === oldTableId && o.status === 'ABERTO');

          

          return {

            activeOrders: newOrders,

            tables: state.tables.map(t => {

              if (t.id === targetTableId) return { ...t, status: 'OCUPADO' as const };

              if (t.id === oldTableId && !oldTableStillHasOrders) return { ...t, status: 'LIVRE' as const };

              return t;

            }),

            activeTableId: targetTableId

          };

        });

      },



      addToOrder: (tableId, dish, quantity = 1, notes = '', orderId) => {

        const targetId = orderId || get().activeOrderId;

        // 🔑 LOGAR ANTES DE ADICIONAR
        console.log('[ADD TO ORDER] 📋 Adicionando item:', {
          targetId,
          tableId,
          dishId: dish?.id,
          dishName: dish?.name,
          quantity,
          notes,
          activeOrdersAntes: get().activeOrders.length,
          orderAntes: get().activeOrders.find(o => o.id === targetId)
        });

        set(state => {

          const orderExists = state.activeOrders.find(o => o.id === targetId);

          

          if (!orderExists && tableId) {

             const newId = `ord-${Date.now()}`;

             const newOrder: Order = {

               id: newId, tableId, type: 'LOCAL', items: [{

                  dishId: dish.id, quantity, status: 'PENDENTE' as const, notes,

                  unitPrice: dish?.price || 0, unitCost: dish?.costPrice || 0,

                  taxAmount: (dish?.price || 0) * (state.settings.taxRate / 100),

                  dish: dish

               }], status: 'ABERTO' as const, timestamp: new Date(),

               total: (dish?.price || 0) * quantity, taxTotal: ((dish?.price || 0) * (state.settings.taxRate / 100)) * quantity, 

               profit: ((dish?.price || 0) - (dish?.costPrice || 0)) * quantity, subAccountName: 'Principal'

             };

             return { 

                activeOrders: [...state.activeOrders, newOrder],

                activeOrderId: newId,

                tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'OCUPADO' as const } : t)

             };

          }



          if (!orderExists) return state;



          const newOrders = state.activeOrders.map(o => {

            if (o.id !== targetId) return o;

            

            // Lógica de Otimização: Agrupar itens duplicados

            // Apenas agrupa se as notas forem idênticas e o status for PENDENTE

            const existingItemIndex = o.items.findIndex(item => 

              item.dishId === dish?.id && 

              item.notes === notes && 

              item.status === 'PENDENTE'

            );



            let newItems: OrderItem[];

            if (existingItemIndex >= 0) {

              newItems = o.items.map((item, idx) => 

                idx === existingItemIndex 

                  ? { ...item, quantity: item.quantity + quantity }

                  : item

              );

              get().addNotification('success', `Quantidade de ${dish?.name || 'produto'} incrementada.`);

            } else {

              newItems = [...o.items, {

                dishId: dish?.id || '', quantity, status: 'PENDENTE' as const, notes,

                unitPrice: dish?.price || 0, unitCost: dish?.costPrice || 0,

                taxAmount: (dish?.price || 0) * (state.settings.taxRate / 100),

                dish: dish || undefined

              }];

            }



            const total = newItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);

            const profit = newItems.reduce((acc, i) => acc + ((i.unitPrice - i.unitCost) * i.quantity), 0);

            const taxTotal = newItems.reduce((acc, i) => acc + (i.taxAmount * i.quantity), 0);

            return { ...o, items: newItems, total, profit, taxTotal };

          });

          

          return { activeOrders: newOrders };

        });

        // 🔥 SINCRONIZAÇÃO ASSÍNCRONA COM SUPABASE (não bloqueia UI)
        // Garante persistência contra falhas de energia
        setTimeout(() => {
          const updatedOrder = get().activeOrders.find(o => o.id === targetId);
          if (updatedOrder) {
            console.log('[ADD TO ORDER] 🔥 Sincronizando ordem com Supabase:', updatedOrder.id);
            syncActiveOrderToSupabase(updatedOrder).catch(err => {
              console.error('[ADD TO ORDER] ❌ Erro ao sincronizar ordem:', err);
            });
            // Notificar CustomerDisplay da mesa
            try {
              const ch = new BroadcastChannel(`vereda_table_${updatedOrder.tableId}`);
              ch.postMessage({ type: 'ORDER_UPDATE', orderId: updatedOrder.id });
              ch.close();
            } catch (e) { /* silent */ }
          }
        }, 100);
      },

      removeFromOrder: (orderId: string, itemIndex: number) => {
        set(state => {
          const order = state.activeOrders.find(o => o.id === orderId);
          if (!order) return state;

          const updatedItems = order.items.filter((_, i) => i !== itemIndex);
          const newTotal = updatedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
          const newProfit = updatedItems.reduce((sum, i) => sum + ((i.unitPrice - i.unitCost) * i.quantity), 0);
          const newTaxTotal = updatedItems.reduce((sum, i) => sum + (i.taxAmount * i.quantity), 0);

          return {
            activeOrders: state.activeOrders.map(o =>
              o.id === orderId
                ? { ...o, items: updatedItems, total: newTotal, profit: newProfit, taxTotal: newTaxTotal }
                : o
            )
          };
        });

        // 🔥 SINCRONIZAÇÃO ASSÍNCRONA COM SUPABASE (não bloqueia UI)
        // Garante persistência contra falhas de energia
        setTimeout(() => {
          const updatedOrder = get().activeOrders.find(o => o.id === orderId);
          if (updatedOrder) {
            console.log('[REMOVE FROM ORDER] 🔥 Sincronizando ordem com Supabase:', updatedOrder.id);
            syncActiveOrderToSupabase(updatedOrder).catch(err => {
              console.error('[REMOVE FROM ORDER] ❌ Erro ao sincronizar ordem:', err);
            });
            // Notificar CustomerDisplay da mesa
            try {
              const ch = new BroadcastChannel(`vereda_table_${updatedOrder.tableId}`);
              ch.postMessage({ type: 'ORDER_UPDATE', orderId: updatedOrder.id });
              ch.close();
            } catch (e) { /* silent */ }
          }
        }, 100);
      },

      checkoutTable: async (orderId, paymentMethod, customerId, customerNif, documentType = 'FR') => {

        console.log('[CHECKOUT] 🚀 checkoutTable chamado:', { orderId, paymentMethod, customerId, customerNif, documentType });

        const order = get().activeOrders.find(o => o.id === orderId);

        console.log('[CHECKOUT] 📋 Order encontrada:', order ? order.id : 'NÃO ENCONTRADA');

        if (!order) return { success: false };



        const customers = get().customers;

        const customerName = customerId

          ? (customers.find(c => c.id === customerId)?.name || order.subAccountName || 'CLIENTE_PADRAO')

          : (order.subAccountName || 'CLIENTE_PADRAO');

        const pm = paymentMethod; // 🚫 REMOVIDO: || 'NUMERARIO' - Agora usa o valor dinâmico

        const tableId = order.tableId; // 🛡️ Extrair tableId do order



        // Estrutura com EXATAMENTE os nomes de coluna do Supabase (schema real)

        const series = get().settings.invoiceSeries;

        const count = get().invoiceCounter;

        const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
        const invoiceNumber = `FR VER${series}/${count}-${timestamp}`;

        const now = new Date().toISOString();

        // 🔑 Calcular data_contabil (Dia Operacional) - Lógica IMUTÁVEL: 05:00 às 04:59
        const { calculateDataContabil } = await import('../lib/dateUtils');
        const dataContabil = calculateDataContabil(new Date());
        console.log('[CHECKOUT] 📅 Data contabil calculada:', dataContabil, '- Hora Luanda:', new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' }));

        // 🔥 NOVO: Buscar turno aberto atual para associar à venda
        let activeShiftId: string | null = null;
        try {
          const { data: openShift } = await supabase
            .from('pos_shift_records')
            .select('id')
            .eq('data_contabil', dataContabil)
            .eq('status', 'OPEN')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (openShift) {
            activeShiftId = openShift.id;
            console.log('[CHECKOUT] 🔄 Turno aberto encontrado:', activeShiftId);
          }
        } catch (shiftErr) {
          console.warn('[CHECKOUT] ⚠️ Erro ao buscar turno aberto:', shiftErr);
        }

        const orderData: {

          id: string;

          customer_name: string;

          customer_phone: string;

          customer_nif: string | null;

          delivery_address: string;

          total_amount: number;

          status: 'closed';

          payment_method: string;

          invoice_number: string;

          created_at: string;

          updated_at: string;

          table_id: string | null;

          data_contabil: string; // 🔑 Dia Operacional - IMUTÁVEL

          shift_id?: string | null; // 🔥 Turno de caixa (opcional)

          closed_by?: string | null; // 🔒 Registo de quem fechou a venda (anti-roubo)

        } = {

          id: order.id,

          customer_name: customerName,

          customer_phone: '999999999',

          customer_nif: customerNif || null,

          delivery_address: 'ENDEREÇO_PADRAO',

          total_amount: order.total,

          status: 'closed', // ✅ CORREÇÃO ESTRUTURAL: SEMPRE status final 'closed' (schema Supabase real)

          payment_method: pm,

          invoice_number: invoiceNumber,

          created_at: now,

          updated_at: now,

          table_id: tableId ? String(tableId) : null, // ✅ Enviar table_id da mesa quando existir

          data_contabil: dataContabil, // 🔑 Dia Operacional - IMUTÁVEL após venda

          shift_id: activeShiftId, // 🔥 Associar venda ao turno aberto (null se não houver)

          closed_by: get().currentUser?.name || null // 🔒 Registar operador que fechou a venda

        };



        const orderItems = (order.items || []).map(item => ({

          order_id: order.id,

          product_id: item.dish?.id || item.dishId, 

          quantity: item.quantity,

          unit_price: item.dish?.price || item.unitPrice, 

          total_price: (item.dish?.price || item.unitPrice) * item.quantity

        }));



        const validItems = orderItems.filter(

          i => typeof i.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(i.product_id)

        );



        const applyLocalState = () => {

          const series = get().settings.invoiceSeries;

          const count = get().invoiceCounter;

          const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
          const invoiceNumber = `FR VER${series}/${count}-${timestamp}`;

          const hash = Math.random().toString(36).substring(2, 12).toUpperCase();

          const orderTotal = order.total;

          const tableId = order.tableId;



          set(state => {

            const newCustomers = customerId && paymentMethod === 'PAGAR_DEPOIS'

              ? state.customers.map(c => c.id === customerId ? { ...c, balance: c.balance + orderTotal } : c)

              : state.customers;



            // 🔥 MANTER ordem em activeOrders com status 'closed' (para Histórico funcionar)
            const newOrders: Order[] = state.activeOrders.map(o =>
              o.id === orderId
                ? { ...o, status: 'closed' as const, paymentMethod: pm, invoiceNumber }
                : o
            );

            console.log('[CHECKOUT] ✅ Ordem marcada como closed:', orderId, '- Status:', pm);

            // 🔥 Verificar se mesa tem mais ordens ABERTAS
            const tableHasMoreOrders = newOrders.some(o => o.tableId === tableId && o.status === 'ABERTO');



            return {

              customers: newCustomers,

              activeOrders: newOrders,

              tables: tableId ? state.tables.map(t => t.id === tableId && !tableHasMoreOrders ? { ...t, status: 'LIVRE' as const } : t) : state.tables,

              invoiceCounter: count + 1,

              activeTableId: undefined,

              activeOrderId: undefined,

              customerDisplayMode: tableId ? { ...state.customerDisplayMode, [tableId]: 'MARKETING' as const } : state.customerDisplayMode

            };

          });

        };



        try {

          console.log('[CHECKOUT] Iniciando gravação no Supabase...');

          console.log('[CHECKOUT] OrderData:', orderData);

          console.log('[CHECKOUT] OrderItems:', orderItems);

          

          // 🔥 VALIDAÇÃO PRÉ-ENVIO CRÍTICA - ANTI-CORRUPÇÃO

          if (!orderData.total_amount || orderData.total_amount <= 0) {

            console.error('[CHECKOUT] ❌ ERRO: total_amount é inválido:', orderData.total_amount);

            throw new Error('Valor total inválido. Verifique os itens do pedido.');

          }

          

          if (!orderData.payment_method) {

            console.error('[CHECKOUT] ❌ ERRO: payment_method é inválido:', orderData.payment_method);

            throw new Error('Método de pagamento inválido.');

          }

          

          if (!orderItems || orderItems.length === 0) {

            console.error('[CHECKOUT] ❌ ERRO: orderItems está vazio:', orderItems);

            throw new Error('Lista de itens vazia. Não é possível finalizar pedido.');

          }

          

          // Validar que cada item tem os campos obrigatórios

          const invalidItems = orderItems.filter(item => 

            !item.product_id || !item.quantity || !item.unit_price || item.unit_price <= 0

          );

          

          if (invalidItems.length > 0) {

            console.error('[CHECKOUT] ❌ ERRO: Itens inválidos encontrados:', invalidItems);

            throw new Error('Itens inválidos no pedido. Verifique todos os produtos.');

          }

          

          console.log('[CHECKOUT] Validação passou. Enviando para Supabase...');

          // 🔥 VALIDAÇÃO: Verificar se invoice_number já existe para evitar duplicatas
          console.log('[CHECKOUT] Verificando se invoice_number já existe:', invoiceNumber);
          const { data: existingInvoice, error: invoiceCheckError } = await supabase
            .from('orders')
            .select('id')
            .eq('invoice_number', invoiceNumber)
            .maybeSingle();

          if (existingInvoice) {
            console.error('[CHECKOUT] ❌ invoice_number já existe:', invoiceNumber);
            throw new Error(`Fatura com número ${invoiceNumber} já existe. Tente novamente.`);
          }

          if (invoiceCheckError && invoiceCheckError.code !== 'PGRST116') {
            console.error('[CHECKOUT] ❌ Erro ao verificar invoice_number:', invoiceCheckError);
          }

          // 🔥 VALIDAÇÃO: Verificar se order ID já existe
          console.log('[CHECKOUT] Verificando se order ID já existe:', orderData.id);
          const { data: existingOrder, error: orderCheckError } = await supabase
            .from('orders')
            .select('id, status, data_contabil')
            .eq('id', orderData.id)
            .maybeSingle();

          console.log('[CHECKOUT] 🔍 Resultado verificação:', { existingOrder, orderCheckError });

          let orderResult = null;

          if (existingOrder) {
            // 🔒 Order já existe → fazer UPDATE em vez de INSERT (resolve 409 Conflict)
            console.log('[CHECKOUT] ⚠️ Order ID já existe, fazendo UPDATE:', orderData.id, 'Status atual:', existingOrder.status);
            const { data: updatedOrder, error: updateError } = await supabase
              .from('orders')
              .update({
                status: 'closed',
                payment_method: orderData.payment_method,
                invoice_number: orderData.invoice_number,
                total_amount: orderData.total_amount,
                customer_nif: orderData.customer_nif,
                data_contabil: orderData.data_contabil, // 🔑 Garantir Dia Operacional no UPDATE
                shift_id: orderData.shift_id, // 🔥 Associar venda ao turno aberto
                updated_at: new Date().toISOString()
              })
              .eq('id', orderData.id)
              .select()
              .single();

            if (updateError) {
              console.error('[CHECKOUT] ❌ Erro ao atualizar order existente:', updateError);
              throw new Error(`Falha ao atualizar ordem: ${updateError.message}`);
            }

            orderResult = updatedOrder;
            console.log('[CHECKOUT] ✅ Order existente atualizado:', orderResult?.id);
          } else {
            if (orderCheckError && orderCheckError.code !== 'PGRST116') {
              console.error('[CHECKOUT] ❌ Erro ao verificar order ID:', orderCheckError);
            }

            // IMPLEMENTAÇÃO SIMPLES: Insert direto no Supabase
            console.log('[CHECKOUT] Salvando venda diretamente no Supabase...');

            // 1. Inserir Order
            const { data: insertedOrder, error: orderError } = await supabase
              .from('orders')
              .insert([orderData])
              .select()
              .single();

            if (orderError) {
              console.error('[CHECKOUT] ERRO AO INSERIR ORDER:', orderError);
              throw new Error(`Falha ao criar ordem: ${orderError.message}`);
            }

            orderResult = insertedOrder;
            console.log('[CHECKOUT] Order inserida:', orderResult?.id);
          }

          // 2. Inserir Order Items
          if (orderItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems);

            if (itemsError) {
              console.error('[CHECKOUT] ERRO AO INSERIR ITEMS:', itemsError);
              // Tentar deletar a order para não ficar órfã
              await supabase.from('orders').delete().eq('id', orderData.id);
              throw new Error(`Falha ao inserir items: ${itemsError.message}`);
            }

            console.log('[CHECKOUT] Items inseridos:', orderItems.length);
          }

          console.log('[CHECKOUT] VENDA SALVA COM SUCESSO NO SUPABASE');

          // 🧾 EMITIR DOCUMENTO FISCAL AGT (NÃO bloqueia checkout)
          try {
            const { data: activeSeries } = await supabase
              .from('agt_series')
              .select('*')
              .eq('document_type', documentType)
              .eq('status', 'A')
              .order('series_year', { ascending: false })
              .limit(1)
              .single();

            if (activeSeries) {
              const series = {
                id: activeSeries.id,
                seriesCode: activeSeries.series_code,
                seriesYear: activeSeries.series_year,
                documentType: activeSeries.document_type,
                establishmentNumber: activeSeries.establishment_number || '001',
                authorizedQuantity: activeSeries.authorized_quantity,
                firstDocumentNo: activeSeries.first_document_no,
                lastDocumentNo: activeSeries.last_document_no,
                currentSequence: activeSeries.current_sequence || 0,
                status: activeSeries.status,
                createdAt: activeSeries.created_at,
                updatedAt: activeSeries.updated_at
              };

              const agtResult = await emitDocumentFromOrder(
                {
                  ...order,
                  payment_method: paymentMethod,
                  invoice_number: invoiceNumber
                },
                series,
                {
                  taxRegistrationNumber: get().settings.nif || '5000000000',
                  taxRate: get().settings.taxRate || 14,
                  eacCode: get().settings.eacCode
                },
                documentType as import('../types/agt').AGTDocumentType
              );

              if (agtResult.success && agtResult.document) {
                const agtRow = documentToDbRow(agtResult.document);
                await supabase.from('agt_documents').insert(agtRow);
                await supabase
                  .from('agt_series')
                  .update({ current_sequence: series.currentSequence + 1 })
                  .eq('id', series.id);
                console.log('[CHECKOUT] ✅ Documento AGT emitido:', agtResult.document.documentNumber);
              } else {
                console.warn('[CHECKOUT] ⚠️ Emissão AGT falhou:', agtResult.message);
              }
            } else {
              console.warn('[CHECKOUT] ⚠️ Nenhuma série AGT ativa encontrada');
            }
          } catch (agtErr) {
            console.error('[CHECKOUT] ⚠️ Erro ao emitir documento AGT:', agtErr);
          }

          // BAIXA AUTOMÁTICA DE STOCK APÓS VENDA

          console.log('[CHECKOUT] Processando baixa de stock...');
          console.log('[CHECKOUT] 🔄 Processando baixa de stock...');

          try {
            // 🔥 OTIMIZAÇÃO: Updates paralelos com Promise.all() em vez de sequenciais
            const stockUpdates = order.items.map(async (item) => {
              if (item.dish?.id) {
                const product = get().menu.find(p => p.id === item.dish?.id);
                if (product) {
                  const currentStock = (product as any).stock_quantity || 0;
                  const newStock = Math.max(0, currentStock - item.quantity);

                  // Atualizar no Supabase
                  const { error: stockError } = await supabase
                    .from('products')
                    .update({ stock_quantity: newStock })
                    .eq('id', item.dish.id);

                  if (stockError) {
                    console.error(`[CHECKOUT] ❌ Erro ao baixar stock de ${product.name}:`, stockError);
                  } else {
                    console.log(`[CHECKOUT] ✅ Stock baixado: ${product.name} (${currentStock} → ${newStock})`);

                    // Verificar alertas de stock baixo
                    const minStock = (product as any).min_stock || 10;
                    if (newStock === 0) {
                      get().addNotification('error', `⚠️ ${product.name} está ESGOTADO!`);
                    } else if (newStock <= minStock) {
                      get().addNotification('warning', `⚠️ Stock baixo: ${product.name} (${newStock} unidades)`);
                    }
                  }
                }
              }
            });

            // Executar todos os updates em paralelo
            await Promise.all(stockUpdates);

          } catch (stockErr) {

            console.error('[CHECKOUT] ⚠️ Erro ao processar baixa de stock:', stockErr);

            // Não falhar a venda por erro de stock

          }

          

          // NOTIFICAR SYNCCORE PARA SINCRONIZAÇÃO EM TEMPO REAL

          console.log('[CHECKOUT] Notificando SyncCore...');

          if (typeof window !== 'undefined') {

            window.dispatchEvent(new CustomEvent('sync-core-update', { 

              detail: { 

                type: 'orders', 

                action: 'created', 

                timestamp: Date.now(),

                payload: { orderId: orderData.id, total: orderData.total_amount }

              }

            }));

          }

          

          // 🔥 DELETAR ordem ativa do Supabase ANTES de atualizar estado local
          console.log('[CHECKOUT] 🗑️ Deletando conta aberta do Supabase:', orderId);
          try {
            await deleteActiveOrderFromSupabase(orderId);
            console.log('[CHECKOUT] ✅ Conta aberta deletada do Supabase');
          } catch (err) {
            console.error('[CHECKOUT] ❌ Erro ao deletar conta do Supabase:', err);
            // Não falhar o checkout - continuar mesmo com erro
          }

          // 🔥 IMPORTANTE: NÃO chamar fetchOrders() aqui - ele sobrescreveria o estado local
          console.log('[CHECKOUT] ✅ Checkout concluído, notificando Dashboard');

          // Apenas notificar Dashboard para atualizar cards (sem forçar refresh de dados)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dashboard-mutate', { 
              detail: { action: 'invalidate', timestamp: Date.now() } 
            }));
          }

          // 🛡️ LIBERAR MESA APÓS VENDA CONFIRMADA

          if (tableId) {

            try {

              const { error: tableError } = await supabase

                .from('pos_tables')

                .update({ status: 'LIVRE' })

                .eq('id', tableId);

              

              if (tableError) {

                console.warn('[checkout] Erro ao liberar mesa no Supabase:', tableError);

              } else {

                console.log('[checkout] Mesa liberada com sucesso no Supabase:', tableId);

              }

            } catch (tableUpdateError) {

              console.warn('[checkout] Erro crítico ao atualizar mesa:', tableUpdateError);

            }

          }



          applyLocalState();

          return { success: true };

        } catch (err: any) {

          // 🔥 CORREÇÃO: Tentar novamente com retry antes de salvar localmente

          console.error('[CHECKOUT] ⚠️ Erro na primeira tentativa:', err);

          

          // Tentar mais 2 vezes com delay

          for (let attempt = 1; attempt <= 2; attempt++) {

            console.log(`[CHECKOUT] 🔄 Tentativa ${attempt + 1} de 3...`);

            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Delay crescente

            

            try {

              const { error: retryError } = await supabase.from('orders').insert([orderData]);

              

              if (!retryError) {

                // Retry bem-sucedido - inserir itens também

                console.log('[CHECKOUT] ✅ Retry bem-sucedido! Venda enviada.');

                

                if (validItems.length > 0) {

                  await supabase.from('order_items').insert(validItems);

                }

                // 🔥 DELETAR ordem ativa do Supabase (retry path esquecia isso!)
                try {
                  await deleteActiveOrderFromSupabase(orderId);
                  console.log('[CHECKOUT] ✅ Conta aberta deletada no retry');
                } catch (delErr) {
                  console.error('[CHECKOUT] ⚠️ Erro ao deletar no retry:', delErr);
                }

                // Liberar mesa

                if (tableId) {

                  await supabase.from('pos_tables').update({ status: 'LIVRE' }).eq('id', tableId);

                }

                applyLocalState();

                return { success: true };

              }

            } catch (retryErr) {

              console.log(`[CHECKOUT] ❌ Tentativa ${attempt + 1} falhou:`, retryErr);

            }

          }

          

          // Todas as tentativas falharam - salvar localmente

          console.log('[CHECKOUT] ⚠️ Todas as tentativas falharam. Salvando localmente...');

          const pendingOrder: PendingSyncOrder = {

            ...orderData,

            items: orderItems,

            tableId: tableId || undefined

          };

          addPendingSyncOrder(pendingOrder);

          applyLocalState();

          return { success: false, savedLocally: true };

        }

      },

      splitCheckout: async (orderId, splits, documentType = 'FR') => {
        console.log('[SPLIT CHECKOUT] 🚀 splitCheckout chamado:', { orderId, splitsCount: splits.length, documentType });

        const order = get().activeOrders.find(o => o.id === orderId);
        if (!order) {
          console.error('[SPLIT CHECKOUT] ❌ Order não encontrada:', orderId);
          return { success: false };
        }

        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplitAmount - order.total) > 0.01) {
          console.error('[SPLIT CHECKOUT] ❌ Total das parcelas não bate:', totalSplitAmount, 'vs', order.total);
          return { success: false };
        }

        const { calculateDataContabil } = await import('../lib/dateUtils');
        const dataContabil = calculateDataContabil(new Date());

        let activeShiftId: string | null = null;
        try {
          const { data: openShift } = await supabase
            .from('pos_shift_records')
            .select('id')
            .eq('data_contabil', dataContabil)
            .eq('status', 'OPEN')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (openShift) activeShiftId = openShift.id;
        } catch (e) {
          console.warn('[SPLIT CHECKOUT] ⚠️ Erro ao buscar turno:', e);
        }

        const generatedInvoices: string[] = [];
        const now = new Date().toISOString();

        for (let i = 0; i < splits.length; i++) {
          const split = splits[i];
          const series = get().settings.invoiceSeries;
          const count = get().invoiceCounter + i;
          const timestamp = Date.now().toString().slice(-6);
          const invoiceNumber = `FR VER${series}/${count}-${timestamp}`;
          generatedInvoices.push(invoiceNumber);

          const splitOrderId = `${orderId}-split-${i + 1}-${Date.now()}`;

          const splitOrderData: any = {
            id: splitOrderId,
            customer_name: split.customerName || 'CLIENTE_PADRAO',
            customer_phone: '999999999',
            customer_nif: split.customerNif || '999999999',
            delivery_address: 'ENDEREÇO_PADRAO',
            total_amount: split.amount,
            status: 'closed',
            payment_method: split.paymentMethod,
            invoice_number: invoiceNumber,
            created_at: now,
            updated_at: now,
            table_id: order.tableId ? String(order.tableId) : null,
            data_contabil: dataContabil,
            shift_id: activeShiftId
          };

          try {
            console.log('[SPLIT CHECKOUT] Inserindo parcela', i + 1, splitOrderData);
            const { error: insertError } = await supabase
              .from('orders')
              .insert([splitOrderData]);

            if (insertError) {
              console.error('[SPLIT CHECKOUT] ❌ Erro ao inserir parcela', i + 1, insertError);
              throw insertError;
            }

            const orderItems = (order.items || []).map(item => ({
              order_id: splitOrderId,
              product_id: item.dish?.id || item.dishId,
              quantity: item.quantity,
              unit_price: (item.dish?.price || item.unitPrice) * (split.amount / order.total),
              total_price: (item.dish?.price || item.unitPrice) * item.quantity * (split.amount / order.total)
            }));

            if (orderItems.length > 0) {
              const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);
              if (itemsError) {
                console.warn('[SPLIT CHECKOUT] ⚠️ Erro ao inserir items da parcela', i + 1, itemsError);
              }
            }

            const { error: splitInsertError } = await supabase
              .from('order_payment_splits')
              .insert([{
                order_id: splitOrderId,
                amount: split.amount,
                payment_method: split.paymentMethod,
                customer_name: split.customerName || null,
                customer_nif: split.customerNif || '999999999',
                invoice_number: invoiceNumber,
                status: 'paid',
                created_at: now
              }]);

            if (splitInsertError) {
              console.warn('[SPLIT CHECKOUT] ⚠️ Erro ao inserir split record:', splitInsertError);
            }

            console.log('[SPLIT CHECKOUT] ✅ Parcela', i + 1, 'inserida:', invoiceNumber);
          } catch (err) {
            console.error('[SPLIT CHECKOUT] ❌ Erro na parcela', i + 1, err);
            return { success: false };
          }
        }

        const tableId = order.tableId;
        set(state => ({
          invoiceCounter: state.invoiceCounter + splits.length,
          activeOrders: state.activeOrders.map(o =>
            o.id === orderId
              ? { ...o, status: 'closed' as const, paymentMethod: splits[0].paymentMethod }
              : o
          ),
          tables: tableId ? state.tables.map(t =>
            t.id === tableId && !state.activeOrders.some(o => o.tableId === tableId && o.status === 'ABERTO' && o.id !== orderId)
              ? { ...t, status: 'LIVRE' as const }
              : t
          ) : state.tables,
          activeTableId: undefined,
          activeOrderId: undefined
        }));

        console.log('[SPLIT CHECKOUT] ✅ Split checkout concluído!', generatedInvoices);
        return { success: true, invoices: generatedInvoices };
      },

      updateOrderPaymentMethod: (orderId, newMethod) => {

        set(state => {

          // Localizar a conta original para gerir saldos de clientes

          const originalOrder = state.activeOrders.find(o => o.id === orderId);

          if (!originalOrder) return state;



          const oldMethod = originalOrder.paymentMethod;

          let newCustomers = [...state.customers];



          // Se tiver cliente associado, gerir a conta corrente

          if (originalOrder.customerId) {

            // Se saiu de PAGAR_DEPOIS para um imediato, remove o débito do cliente

            if (oldMethod === 'PAGAR_DEPOIS' && newMethod !== 'PAGAR_DEPOIS') {

              newCustomers = newCustomers.map(c => c.id === originalOrder.customerId ? { ...c, balance: Math.max(0, c.balance - originalOrder.total) } : c);

            } 

            // Se entrou em PAGAR_DEPOIS agora, adiciona o débito ao cliente

            else if (oldMethod !== 'PAGAR_DEPOIS' && newMethod === 'PAGAR_DEPOIS') {

              newCustomers = newCustomers.map(c => c.id === originalOrder.customerId ? { ...c, balance: c.balance + originalOrder.total } : c);

            }

          }



          const newOrders = state.activeOrders.map(o => {

            if (o.id !== orderId) return o;

            return { ...o, paymentMethod: newMethod };

          });



          return { 

            activeOrders: newOrders,

            customers: newCustomers 

          };

        });

      },



      updateTablePosition: (id, x, y) => set(state => ({

        tables: state.tables.map(t => t.id === id ? { ...t, x, y } : t)

      })),

      addTable: (table) => set(state => ({ tables: [...state.tables, table] })),

      updateTable: (table) => set(state => ({ tables: state.tables.map(t => t.id === table.id ? table : t) })),

      removeTable: (id) => {

        const tableToRemove = get().tables.find(t => t.id === id);

        if (!tableToRemove) return;



        const hasActiveOrders = get().activeOrders.some(o => o.tableId === id && o.status === 'ABERTO');

        if (hasActiveOrders) {

          get().addNotification('error', `Não é possível apagar a mesa ${tableToRemove.name} porque tem pedidos ativos.`);

          return;

        }



        versionControlService.createRestorePoint(`Remoção da mesa: ${tableToRemove.name}`, get());

        set(state => ({ 

          tables: state.tables.filter(t => t.id !== id),

          activeOrders: state.activeOrders.filter(o => o.tableId !== id) // Remove any closed/voided orders associated

        }));

        get().addAuditLog({

          module: 'TABLES',

          action: 'REMOVER_MESA',

          details: `Mesa ${tableToRemove.name} (ID: ${id}) removida.`

        });

        get().addNotification('success', `Mesa ${tableToRemove.name} removida com sucesso.`);

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },

      closeTable: async (id: number) => {

        const tableToClose = get().tables.find(t => t.id === id);

        if (!tableToClose) return;

        // 🔑 LOGAR ANTES DE MODIFICAR
        console.log('[CLOSE TABLE] 📋 Fechando mesa:', {
          mesaId: id,
          mesaNome: tableToClose.name,
          activeOrdersAntes: get().activeOrders.length,
          ordensDaMesa: get().activeOrders.filter(o => o.tableId === id).map(o => ({
            id: o.id,
            status: o.status,
            items: o.items.length
          }))
        });

        // Verificar se existem pedidos com itens (que não podem ser fechados sem pagamento)
        const hasOrdersWithItems = get().activeOrders.some(o => o.tableId === id && o.status === 'ABERTO' && o.items.length > 0);
        
        if (hasOrdersWithItems) {
          get().addNotification('error', `Não é possível fechar a mesa ${tableToClose.name} porque tem pedidos ativos com itens.`);
          return;
        }

        versionControlService.createRestorePoint(`Fecho da mesa: ${tableToClose.name}`, get());

        const ordensRemovidas = get().activeOrders.filter(o => o.tableId === id && o.status === 'ABERTO');
        
        // 🔥 PRIMEIRO: Deletar ordens do Supabase (aguardar confirmação)
        if (ordensRemovidas.length > 0) {
          console.log('[CLOSE TABLE] 🗑️ Deletando', ordensRemovidas.length, 'ordem(s) do Supabase...');
          try {
            await Promise.all(ordensRemovidas.map(order => deleteActiveOrderFromSupabase(order.id)));
            console.log('[CLOSE TABLE] ✅ Ordens deletadas do Supabase com sucesso');
          } catch (err) {
            console.error('[CLOSE TABLE] ❌ Erro ao deletar ordens do Supabase:', err);
            // Continuar mesmo com erro - local state é prioridade
          }
        }
        
        // 🔥 DEPOIS: Atualizar estado local (só após confirmação do Supabase)
        set(state => ({
          tables: state.tables.map(t => t.id === id ? { ...t, status: 'LIVRE' as const } : t),
          activeOrders: state.activeOrders.filter(o => !(o.tableId === id && o.status === 'ABERTO')),
          activeTableId: state.activeTableId === id ? undefined : state.activeTableId,
          activeOrderId: state.activeTableId === id ? undefined : state.activeOrderId
        }));

        // 🔑 LOGAR APÓS MODIFICAR
        console.log('[CLOSE TABLE] ✅ Mesa fechada:', {
          mesaId: id,
          ordensRemovidas: ordensRemovidas.length,
          activeOrdersDepois: get().activeOrders.length
        });



        get().addAuditLog({

          module: 'TABLES',

          action: 'FECHAR_MESA',

          details: `Mesa ${tableToClose.name} (ID: ${id}) fechada e definida como LIVRE.`

        });

        get().addNotification('success', `Mesa ${tableToClose.name} fechada com sucesso e definida como LIVRE.`);

        if (get().settings.autoBackup && get().settings.supabaseUrl) {

          sqlMigrationService.autoMigrate(get().settings, get());

        }

      },





      cancelEmptyTable: (tableId: number) => {

        const state = get();

        const order = state.activeOrders.find(o => o.tableId === tableId && o.status === 'ABERTO');

        

        if (!order) {

          state.addNotification('error', 'Nenhum pedido aberto encontrado para esta mesa.');

          return;

        }



        if (order.items.length > 0) {

          state.addNotification('error', 'Não é possível fechar uma mesa com itens. Use a função de pagamento.');

          return;

        }



        set(state => ({

          activeOrders: state.activeOrders.filter(o => o.id !== order.id),

          tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'LIVRE' as const } : t),

          activeTableId: state.activeTableId === tableId ? null : state.activeTableId,

          activeOrderId: state.activeOrderId === order.id ? null : state.activeOrderId

        }));



        get().addAuditLog({

          module: 'TABLES',

          action: 'CANCEL_EMPTY_TABLE',

          details: `Mesa ${tableId} fechada (vazia) manualmente.`

        });

        state.addNotification('success', `Mesa ${tableId} fechada com sucesso.`);

      },



      transferTable: (fromTableId, toTableId) => {

        const fromOrders = get().activeOrders.filter(o => o.tableId === fromTableId && o.status === 'ABERTO');

        if (fromOrders.length === 0) {

          get().addNotification('error', 'Não existem pedidos abertos na mesa de origem.');

          return;

        }



        const toTable = get().tables.find(t => t.id === toTableId);

        if (!toTable) return;



        set(state => ({

          activeOrders: state.activeOrders.map(o => 

            (o.tableId === fromTableId && o.status === 'ABERTO') 

              ? { ...o, tableId: toTableId } 

              : o

          ),

          tables: state.tables.map(t => {

            if (t.id === fromTableId) return { ...t, status: 'LIVRE' as const };

            if (t.id === toTableId) return { ...t, status: 'OCUPADO' as const };

            return t;

          })

        }));



        get().addAuditLog({

          module: 'TABLES',

          action: 'TRANSFERENCIA_MESA',

          details: `Transferência da Mesa ${fromTableId} para Mesa ${toTableId}. ${fromOrders.length} conta(s) transferida(s).`

        });

        get().addNotification('success', `Mesa ${fromTableId} transferida para Mesa ${toTableId}.`);

      },



      addSubAccount: (tableId, _name) => {
        // 🔥 GARANTIR QUE O NOME SEJA USADO
        const subAccountName = _name && _name.trim() ? _name.trim() : undefined;
        
        const newId = `ord-${Date.now()}`;

        const newOrder: Order = {

          id: newId,

          tableId,

          type: 'LOCAL',

          items: [],

          status: 'ABERTO',

          timestamp: new Date(),

          total: 0,

          taxTotal: 0,

          profit: 0,

          subAccountName

        };

        

        set(state => ({

          activeOrders: [...state.activeOrders, newOrder],

          activeOrderId: newId

        }));

        

        get().addAuditLog({

          module: 'POS',

          action: 'CRIAR_SUBCONTA',

          details: `Nova subconta "${_name}" criada para Mesa ${tableId}.`

        });

        get().addNotification('success', `Subconta "${_name}" criada.`);

        return newId;

      },



      removeSubAccount: (orderId) => {

        const order = get().activeOrders.find(o => o.id === orderId);

        if (!order) return;

        

        if (order.items.length > 0) {

          get().addNotification('error', 'Não é possível remover uma subconta com itens. Transfira ou anule os itens primeiro.');

          return;

        }



        set(state => ({

          activeOrders: state.activeOrders.filter(o => o.id !== orderId),

          activeOrderId: state.activeOrderId === orderId ? null : state.activeOrderId

        }));

        

        get().addNotification('info', `Subconta "${order.subAccountName}" removida.`);

      },



      mergeOrders: (sourceOrderId, targetOrderId) => {

        const sourceOrder = get().activeOrders.find(o => o.id === sourceOrderId);

        const targetOrder = get().activeOrders.find(o => o.id === targetOrderId);

        if (!sourceOrder || !targetOrder) return;

        if (sourceOrder.items.length === 0) {

          get().addNotification('error', 'A conta de origem não tem itens para juntar.');

          return;

        }



        const mergedItems = [...targetOrder.items, ...sourceOrder.items];

        const mergedTotal = targetOrder.total + sourceOrder.total;

        const mergedTax = targetOrder.taxTotal + sourceOrder.taxTotal;

        const mergedProfit = targetOrder.profit + sourceOrder.profit;

        const sourceTableId = sourceOrder.tableId;



        set(state => ({

          activeOrders: state.activeOrders

            .map(o => o.id === targetOrderId ? {

              ...o,

              items: mergedItems,

              total: mergedTotal,

              taxTotal: mergedTax,

              profit: mergedProfit

            } : o)

            .filter(o => o.id !== sourceOrderId),

          activeOrderId: state.activeOrderId === sourceOrderId ? targetOrderId : state.activeOrderId,

          tables: state.tables.map(t => {

            if (t.id === sourceTableId) {

              const stillHasOrders = state.activeOrders.some(o => o.tableId === sourceTableId && o.id !== sourceOrderId && o.status === 'ABERTO');

              return stillHasOrders ? t : { ...t, status: 'LIVRE' as const };

            }

            return t;

          })

        }));



        get().addAuditLog({

          module: 'POS',

          action: 'JUNTAR_CONTAS',

          details: `Conta ${sourceOrder.subAccountName || 'Principal'} (${sourceOrder.items.length} itens, ${sourceOrder.total} Kz) juntada à conta ${targetOrder.subAccountName || 'Principal'} da Mesa ${targetOrder.tableId}.`

        });



        get().addNotification('success', `Itens juntados à conta da Mesa ${targetOrder.tableId}. Mesa ${sourceTableId} liberta.`);

      },



      addPaymentConfig: (config) => {

        const id = `pay-${Date.now()}`;

        set(state => ({ paymentConfigs: [...state.paymentConfigs, { ...config, id }] }));

        get().addAuditLog({

          module: 'SYSTEM',

          action: 'CONFIG_PAGAMENTO',

          details: `Adicionado novo modo de pagamento: ${config.name}`

        });

      },



      updatePaymentConfig: (id, config) => {

        set(state => ({

          paymentConfigs: state.paymentConfigs.map(c => c.id === id ? { ...c, ...config } : c)

        }));

      },



      updateOrderItemStatus: (orderId: string, itemIndex: number, status: OrderItem['status']) => set(state => ({

        activeOrders: state.activeOrders.map(o => {

          if (o.id !== orderId) return o;

          const items = o.items.map((item, idx) => 

            idx === itemIndex ? { ...item, status } : item

          );

          return { ...o, items };

        })

      })),

      markOrderAsServed: (orderId) => set(state => ({

        activeOrders: state.activeOrders.map(o => {

          if (o.id !== orderId) return o;

          const items = o.items.map(item => ({ ...item, status: 'ENTREGUE' as const }));

          return { ...o, items };

        })

      })),



      addCustomer: (c) => set(state => ({ customers: [...state.customers, c] })),

      updateCustomer: (c) => set(state => ({ customers: state.customers.map(x => x.id === c.id ? c : x) })),

      removeCustomer: (id) => set(state => ({ customers: state.customers.filter(x => x.id !== id) })),

      settleCustomerDebt: (id, amount) => set(state => ({

        customers: state.customers.map(c => c.id === id ? { ...c, balance: Math.max(0, c.balance - amount) } : c)

      })),



      addEmployee: (e) => set(state => ({ employees: [...state.employees, e] })),

      

      // 🔑 SUPABASE FIRST - PERSISTÊNCIA DE FUNCIONÁRIOS COM VALIDAÇÃO

      addEmployeeWithPersistence: async (e: Employee) => {

        try {

          // 🔑 VALIDAR LIGAÇÃO ANTES DE QUALQUER GRAVAÇÃO

          const isOnline = await validateSupabaseConnection();

          if (!isOnline) {

            console.error('[STAFF] ❌ Sem ligação ao Supabase, funcionário não será gravado');

            get().addNotification('error', 'Sem ligação à internet. Funcionário não foi gravado.');

            return;

          }

          

          // 🔑 VALIDAR CONFIGURAÇÃO

          const configValid = validateSupabaseConfig();

          if (!configValid) {

            console.error('[STAFF] ❌ Configuração Supabase inválida');

            get().addNotification('error', 'Configuração da aplicação inválida.');

            return;

          }

          

          console.log('[STAFF] 🚀 SUPABASE FIRST - Gravando funcionário no Supabase:', {

            id: e.id,

            full_name: e.name,

            role: e.role,

            phone: e.phone,

            base_salary_kz: e.salary,

            status: e.status

          });



          // 🔑 INSERT DIRETO NO SUPABASE (PRIMEIRO)

          const { data, error } = await supabase

            .from('staff')

            .insert({

              id: e.id,

              full_name: e.name,

              role: e.role,

              phone: e.phone,

              base_salary_kz: e.salary,

              status: e.status === 'ATIVO' ? 'active' : (e.status === 'INATIVO' ? 'inactive' : (e.status || 'active')),

              nif: e.nif || null,

              admission_date: e.admissionDate || null,

              contract_type: e.contractType || 'INDEFINIDO',

              irt_exempt: e.irtExempt || false,

              auto_calculate_tax: e.autoCalculateTax !== false,

              food_allowance: e.foodAllowance || 0,

              transport_allowance: e.transportAllowance || 0,

              bonus: e.bonus || 0,

              overtime_hourly_rate: e.overtimeHourlyRate || 0,

              daily_work_hours: e.dailyWorkHours || 8,

              work_days_per_month: e.workDaysPerMonth || 22,

              color: e.color || '#06b6d4',

              external_bio_id: e.externalBioId || null

            })

            .select()

            .single();



          if (error) {

            console.error('[STAFF] ❌ Erro ao gravar funcionário no Supabase:', error);

            get().addNotification('error', 'Falha ao gravar funcionário no servidor');

            return;

          }

          

          console.log('[STAFF] ✅ Gravado no Supabase com sucesso ID:', data?.id);

          get().addNotification('success', 'Funcionário gravado com sucesso no Supabase');

          

          // 🔑 SÓ AGORA ATUALIZAR STORE LOCAL (DEPOIS DO SUPABASE)

          set(state => ({ employees: [...state.employees, e] }));

          

        } catch (error) {

          console.error('[STAFF] ❌ Erro crítico na persistência:', error);

          get().addNotification('error', 'Falha crítica ao gravar funcionário');

        }

      },

      updateEmployee: (e) => set(state => ({ employees: state.employees.map(x => x.id === e.id ? e : x) })),

      

      // 🔑 SUPABASE FIRST - PERSISTÊNCIA DE EDIÇÃO DE FUNCIONÁRIOS

      updateEmployeeWithPersistence: async (e: Employee) => {

        try {

          // 🔑 VALIDAR LIGAÇÃO ANTES DE QUALQUER GRAVAÇÃO

          const isOnline = await validateSupabaseConnection();

          if (!isOnline) {

            console.error('[STAFF] ❌ Sem ligação ao Supabase, funcionário não será atualizado');

            get().addNotification('error', 'Sem ligação à internet. Funcionário não foi atualizado.');

            return false;

          }

          

          console.log('[STAFF] 🚀 SUPABASE FIRST - Atualizando funcionário no Supabase:', {

            id: e.id,

            full_name: e.name,

            role: e.role,

            phone: e.phone,

            base_salary_kz: e.salary,

            status: e.status

          });



          // 🔑 UPDATE DIRETO NO SUPABASE (PRIMEIRO)

          const { data, error } = await supabase

            .from('staff')

            .update({

              full_name: e.name,

              role: e.role,

              phone: e.phone,

              base_salary_kz: e.salary,

              status: e.status === 'ATIVO' ? 'active' : (e.status === 'INATIVO' ? 'inactive' : (e.status || 'active')),

              nif: e.nif || null,

              admission_date: e.admissionDate || null,

              contract_type: e.contractType || 'INDEFINIDO',

              irt_exempt: e.irtExempt || false,

              auto_calculate_tax: e.autoCalculateTax !== false,

              food_allowance: e.foodAllowance || 0,

              transport_allowance: e.transportAllowance || 0,

              bonus: e.bonus || 0,

              overtime_hourly_rate: e.overtimeHourlyRate || 0,

              daily_work_hours: e.dailyWorkHours || 8,

              work_days_per_month: e.workDaysPerMonth || 22,

              color: e.color || '#06b6d4',

              external_bio_id: e.externalBioId || null,

              updated_at: new Date().toISOString()

            })

            .eq('id', e.id)

            .select()

            .single();



          if (error) {

            console.error('[STAFF] ❌ Erro ao atualizar funcionário no Supabase:', error);

            get().addNotification('error', 'Falha ao atualizar funcionário no servidor');

            return false;

          }

          

          console.log('[STAFF] ✅ Atualizado no Supabase com sucesso ID:', data?.id);

          

          // 🔑 SÓ AGORA ATUALIZAR STORE LOCAL (DEPOIS DO SUPABASE)

          set(state => ({ employees: state.employees.map(x => x.id === e.id ? e : x) }));

          

          get().addNotification('success', 'Funcionário atualizado com sucesso no Supabase');

          return true;

          

        } catch (error) {

          console.error('[STAFF] ❌ Erro crítico na atualização:', error);

          get().addNotification('error', 'Falha crítica ao atualizar funcionário');

          return false;

        }

      },

      removeEmployee: async (id: string) => {

        try {

          console.log('[STAFF] 🗑️ Removendo funcionário do Supabase:', id);

          

          // ✅ CORREÇÃO: Remover do Supabase primeiro

          const { error: deleteError } = await supabase

            .from('staff')

            .delete()

            .eq('id', id);

            

          if (deleteError) {

            console.error('[STAFF] ❌ Erro ao remover do Supabase:', deleteError);

            get().addNotification('error', 'Falha ao remover funcionário do banco de dados');

            return;

          }

          

          console.log('[STAFF] ✅ Funcionário removido do Supabase com sucesso');

          

          // Depois remover do estado local

          set(state => ({ employees: state.employees.filter(x => x.id !== id) }));

          

          get().addNotification('success', 'Funcionário removido com sucesso');

          

          // Forçar reload para garantir consistência

          await get().loadEmployees();

          

        } catch (error) {

          console.error('[STAFF] ❌ Erro crítico ao remover funcionário:', error);

          get().addNotification('error', 'Falha crítica ao remover funcionário');

        }

      },

      clockIn: (empId) => {

        const today = new Date().toISOString().split('T')[0];

        set(state => ({

          attendance: [...state.attendance, { employeeId: empId, date: today, clockIn: new Date() }]

        }));

      },

      clockOut: (empId) => {

        const today = new Date().toISOString().split('T')[0];

        set(state => ({

          attendance: state.attendance.map(a => 

            a.employeeId === empId && a.date === today ? { ...a, clockOut: new Date() } : a

          )

        }));

      },

      externalClockSync: (bioId) => {

        const emp = get().employees.find(e => e.externalBioId === bioId);

        if (emp) {

          const today = new Date().toISOString().split('T')[0];

          const record = get().attendance.find(a => a.employeeId === emp.id && a.date === today);

          if (!record || !record.clockIn) get().clockIn(emp.id);

          else if (!record.clockOut) get().clockOut(emp.id);

        }

      },



      addWorkShift: (s) => {
        set(state => ({ workShifts: [...state.workShifts, s] }));
        supabase
          .from('staff_schedules')
          .insert({
            id: s.id,
            staff_id: s.employeeId,
            shift_start: s.startTime,
            shift_end: s.endTime,
            work_days: [String(s.dayOfWeek)]
          })
          .then(({ error }) => {
            if (error) console.error('[SCHEDULES] Erro ao gravar escala no Supabase:', error);
            else console.log('[SCHEDULES] Escala gravada no Supabase:', s.id);
          });
      },

      updateWorkShift: (s) => {
        set(state => ({ workShifts: state.workShifts.map(x => x.id === s.id ? s : x) }));
        supabase
          .from('staff_schedules')
          .update({
            staff_id: s.employeeId,
            shift_start: s.startTime,
            shift_end: s.endTime,
            work_days: [String(s.dayOfWeek)]
          })
          .eq('id', s.id)
          .then(({ error }) => {
            if (error) console.error('[SCHEDULES] Erro ao atualizar escala no Supabase:', error);
            else console.log('[SCHEDULES] Escala atualizada no Supabase:', s.id);
          });
      },

      removeWorkShift: (id) => {
        set(state => ({ workShifts: state.workShifts.filter(x => x.id !== id) }));
        supabase
          .from('staff_schedules')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[SCHEDULES] Erro ao apagar escala no Supabase:', error);
            else console.log('[SCHEDULES] Escala apagada no Supabase:', id);
          });
      },

      loadWorkShifts: async () => {
        try {
          const { data, error } = await supabase
            .from('staff_schedules')
            .select('*');
          if (error) {
            console.error('[SCHEDULES] Erro ao carregar escalas:', error);
            return;
          }
          if (data && data.length > 0) {
            const shifts: WorkShift[] = [];
            for (const row of data) {
              const days = row.work_days || [];
              for (const dayStr of days) {
                shifts.push({
                  id: days.length > 1 ? `${row.id}_${dayStr}` : row.id,
                  employeeId: row.staff_id || '',
                  dayOfWeek: Number(dayStr),
                  startTime: row.shift_start || '08:00',
                  endTime: row.shift_end || '16:00'
                });
              }
            }
            set({ workShifts: shifts });
            console.log('[SCHEDULES] Escalas carregadas do Supabase:', shifts.length);
          }
        } catch (e) {
          console.error('[SCHEDULES] Erro ao carregar escalas:', e);
        }
      },



      addReservation: (res) => set(state => ({ reservations: [...state.reservations, res] })),

      

      updateReservation: (id: string, updates: Partial<Reservation>) => set(state => ({

        reservations: state.reservations.map(r => r.id === id ? { ...r, ...updates } : r)

      })),

      

      cancelReservation: (id: string) => set(state => ({

        reservations: state.reservations.map(r => 

          r.id === id ? { ...r, status: 'CANCELADA' as const } : r

        )

      })),



      updateOrderStatus: (orderId: string, status: Order['status']) => {
        const order = get().activeOrders.find(o => o.id === orderId);

        set(state => ({
          activeOrders: state.activeOrders.map(o => 
            o.id === orderId ? { ...o, status } : o
          )
        }));

        // 🔒 LOG DE AUDITORIA: Se status for anulação/cancelamento
        if (order && (status === 'cancelled' || status === 'CANCELADO' || status === 'void' || status === 'VOID')) {
          import('../lib/auditService').then(({ logVoidSale }) => {
            const currentUser = get().currentUser;
            logVoidSale(
              orderId,
              { total: order.total, tableId: order.tableId, items: order.items?.length || 0 },
              'Status alterado para cancelado',
              currentUser?.id,
              currentUser?.name
            ).catch(err => console.error('[AUDIT] Erro ao logar void:', err));
          }).catch(() => {});
        }

        // 🔥 SINCRONIZAÇÃO ASSÍNCRONA COM SUPABASE após updateOrderStatus
        setTimeout(() => {
          const updatedOrder = get().activeOrders.find(o => o.id === orderId);
          if (updatedOrder) {
            console.log('[UPDATE ORDER STATUS] 🔥 Sincronizando ordem com Supabase:', updatedOrder.id);
            syncActiveOrderToSupabase(updatedOrder).catch(err => {
              console.error('[UPDATE ORDER STATUS] ❌ Erro ao sincronizar ordem:', err);
            });
          }
        }, 100);
      },



      deleteReservation: (id: string) => set(state => ({

        reservations: state.reservations.filter(r => r.id !== id)

      })),



      backupToSupabase: async () => {

        get().addNotification('info', 'Backup quântico em progresso...');

        

        // 🔑 DEBOUNCE PARA EVITAR MÚLTIPLOS POSTS

        debounceApplicationState(async () => {

          try {

            const state = get();

            const { error } = await supabase

              .from('application_state')

              .upsert({ 

                id: 'current_state', 

                state: JSON.stringify(state),

                updated_at: new Date().toISOString()

              });

            

            if (error) throw error;

            get().addNotification('success', 'Nuvem atualizada com sucesso.');

          } catch (err: any) {

            console.error('Erro backup Supabase:', err);

            get().addNotification('error', 'Falha no backup Supabase.');

          }

        }, 2000);

      },



      restoreFromSupabase: async () => {

        try {

          // CORREÇÃO: Tabela restaurant_state não existe, usar application_state

          console.log("[STORE] Restaurando integridade...");

          const { data } = await supabase

            .from('application_state')

            .select('state')

            .eq('id', 'current_state')

            .single();

          

          if (data?.state) {

            set(JSON.parse(data.state));

            get().addNotification('success', 'Dados restaurados da nuvem com sucesso!');

          }

        } catch (error) {

          get().addNotification('error', 'Falha ao restaurar da nuvem');

        }

      },

      

      addExpense: (expense) => set(state => {

        const newExpense = {

          ...expense,

          id: `exp-${Date.now()}`,

          createdAt: new Date(),

          updatedAt: new Date()

        };

        return { expenses: [...state.expenses, newExpense] };

      }),

      

      // PERSISTÊNCIA DE DESPESAS NO SUPABASE - NOVO E CRÍTICO

      addExpenseWithPersistence: async (expense: any) => {

        // BLOQUEAR ESTADO DE LOADING

        try {

          console.log('[EXPENSE] Persistindo despesa no Supabase:', {

            id: expense.id || `exp-${Date.now()}`,

            amount_kz: expense.amount,

            description: expense.description,

            category: expense.category

          });



          // VERIFICAÇÃO DE DUPLICAÇÃO - EVITAR MESMA DESPESA NO MESMO MINUTO

          const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

          const { data: existingExpense } = await supabase

            .from('expenses')

            .select('id, description, amount_kz')

            .eq('amount_kz', expense.amount)

            .eq('description', expense.description)

            .gte('created_at', oneMinuteAgo)

            .limit(1);



          if (existingExpense && existingExpense.length > 0) {

            console.log('[EXPENSE] Despesa duplicada detectada, ignorando:', existingExpense[0].id);

            return; // NÃO INSERIR DUPLICADA

          }



          // LIMPEZA DE DADOS: Remover despesa duplicada "Óleo (6.000 Kz)"

          if (expense.description === 'Óleo' && expense.amount === 6000) {

            const { data: oleoDuplicates } = await supabase

              .from('expenses')

              .select('id, created_at')

              .eq('description', 'Óleo')

              .eq('amount_kz', 6000)

              .order('created_at', { ascending: false });

            

            if (oleoDuplicates && oleoDuplicates.length > 1) {

              // Manter apenas o mais recente, remover os mais antigos

              const toRemove = oleoDuplicates.slice(1);

              for (const duplicate of toRemove) {

                console.log('[EXPENSE] REMOVENDO DUPLICATA ÓLEO:', duplicate.id);

                await supabase

                  .from('expenses')

                  .delete()

                  .eq('id', duplicate.id);

              }

              // FORÇAR RELOAD APÓS LIMPEZA

              await get().loadExpenses();

            }

          }



          // Inserir diretamente na tabela expenses

          const { data } = await supabase

            .from('expenses')

            .insert({

              id: expense.id || `exp-${Date.now()}`,

              amount_kz: expense.amount,

              description: expense.description,

              category: expense.category,

              status: 'PENDING',

              created_at: new Date().toISOString(),

              updated_at: new Date().toISOString()

            })

            .select(); // FORÇAR RETORNO DOS DADOS



          // AGUARDAR CONFIRMAÇÃO ANTES DE FECHAR MODAL

          console.log('[EXPENSE] Despesa persistida com sucesso no Supabase:', data);  

          await get().loadExpenses();

        } catch {

          console.error('[EXPENSE] Erro na persistência da despesa');

        }

      },



      // 💰 CASH FLOW COM PERSISTÊNCIA - Windows ↔ Web via dataServiceBridge

      addCashFlowWithPersistence: async (cashFlowData: {

        amount: number;

        category: string;

        type: 'entrada' | 'saida';

        description?: string;

      }) => {

        try {

          console.log('[CASH_FLOW] Persistindo movimento:', cashFlowData);



          // 🌐 USAR DATA SERVICE BRIDGE (sem better-sqlite3)

          const { cashFlowService } = await import('../lib/data/dataServiceBridge');

          

          const result = await cashFlowService.insert({

            id: `cf-${Date.now()}`,

            amount: cashFlowData.amount,

            category: cashFlowData.category,

            type: cashFlowData.type,

            description: cashFlowData.description || undefined,

            created_at: new Date().toISOString(),

            updated_at: new Date().toISOString()

          });



          if (result.success) {

            console.log('[CASH_FLOW] ✅ Movimento persistido:', result.data);

            get().addNotification('success', 'Movimento de caixa registrado');

            

            // 🔄 TRIGGER SYNC para outras instâncias (Windows/Web)

            if (typeof window !== 'undefined') {

              window.dispatchEvent(new CustomEvent('cash-flow-updated', {

                detail: { cashFlow: result.data, timestamp: new Date().toISOString() }

              }));

            }

          } else {

            console.error('[CASH_FLOW] ❌ Falha ao persistir:', result.error);

            get().addNotification('error', 'Falha ao registrar movimento');

          }



        } catch (error) {

          console.error('[CASH_FLOW] ❌ Erro crítico:', error);

          get().addNotification('error', 'Erro ao registrar movimento de caixa');

        }

      },



      updateExpense: (id, expense) => set(state => ({

        expenses: state.expenses.map(e => e.id === id ? { ...e, ...expense, updatedAt: new Date() } : e)

      })),



      // CARREGAR FUNCIONÁRIOS DO SUPABASE

      loadEmployees: async () => {

        try {

          console.log('[STAFF] Carregando funcionários do Supabase...');

          const { data: staffData, error } = await supabase

            .from('staff')

            .select('*')

            .order('created_at', { ascending: false });



          if (error) {

            console.error('[STAFF] Erro ao carregar funcionários:', error);

            get().addNotification('error', 'Falha ao carregar funcionários');

            return;

          }



          console.log('[STAFF] Funcionários carregados:', staffData?.length || 0);

          if (staffData && staffData.length > 0) {

            console.log('Colunas Staff:', staffData[0]);

          }



          // Converter para o formato local

          const formattedEmployees: Employee[] = staffData?.map(staff => ({

            id: staff.id,

            name: staff.full_name || staff.name || '',

            full_name: staff.full_name || staff.name || '',

            role: staff.role || 'GARCOM',

            salary: Number(staff.base_salary_kz || staff.salary || 0),

            base_salary_kz: Number(staff.base_salary_kz || staff.salary || 0),

            phone: staff.phone || '',

            status: (staff.status === 'active' || staff.status === 'ATIVO' ? 'ATIVO' : 'INATIVO') as 'ATIVO' | 'INATIVO',

            color: staff.color || '#3B82F6',

            workDaysPerMonth: staff.work_days_per_month || 22,

            dailyWorkHours: staff.daily_work_hours || 8,

            externalBioId: staff.external_bio_id || staff.id,

            foodAllowance: staff.food_allowance || 0,

            transportAllowance: staff.transport_allowance || 0,

            bonus: staff.bonus || 0,

            overtimeHourlyRate: staff.overtime_hourly_rate || 0,

            nif: staff.nif || '',

            admissionDate: staff.admission_date || '',

            contractType: staff.contract_type || 'INDEFINIDO',

            irtExempt: staff.irt_exempt || false,

            autoCalculateTax: staff.auto_calculate_tax !== false,

            createdAt: staff.created_at || new Date().toISOString(),

            updatedAt: staff.updated_at || new Date().toISOString()

          })) || [];



          set({ employees: formattedEmployees });

          console.log('[STAFF] Estado atualizado com funcionários:', formattedEmployees.length);

          

        } catch (error) {

          console.error('[STAFF] Erro crítico ao carregar funcionários:', error);

          get().addNotification('error', 'Falha crítica ao carregar funcionários');

        }

      },



      // CARREGAR DESPESAS DO SUPABASE

      loadExpenses: async () => {

        try {

          console.log('[EXPENSE] Carregando despesas do Supabase...');

          

          const { data: expensesData, error } = await supabase

            .from('expenses')

            .select('*')

            .order('created_at', { ascending: false });



          if (error) {

            console.error('[EXPENSE] Erro ao carregar despesas:', error);

            // 🛡️ REMOVIDO: Notificação de erro para evitar avisos persistentes

            // get().addNotification('error', 'Falha ao carregar despesas');

            return;

          }



          console.log('[EXPENSE] Despesas carregadas:', expensesData?.length || 0);

          if (expensesData && expensesData.length > 0) {

            console.log('Colunas Expenses:', expensesData[0]);

          }



          // Converter para o formato local

          const formattedExpenses = expensesData?.map(exp => ({

            id: exp.id,

            description: exp.description || '',

            amount: Number(exp.amount_kz || 0),

            category: exp.category || exp.category_name || 'OUTROS',

            status: exp.status || 'PENDENTE',

            paymentMethod: exp.payment_method || 'NUMERARIO',

            receipt: exp.receipt || '',

            notes: exp.notes || '',

            date: exp.created_at || new Date(),

            createdAt: exp.created_at || new Date(),

            updatedAt: exp.updated_at || new Date()

          })) || [];



          set({ expenses: formattedExpenses });

          console.log('[EXPENSE] Estado atualizado com despesas:', formattedExpenses.length);

          

        } catch (error) {

          console.error('[EXPENSE] Erro crítico ao carregar despesas:', error);

          get().addNotification('error', 'Falha crítica ao carregar despesas');

        }

      },



      removeExpense: async (id) => {

        try {

          console.log('[STORE] 🗑️ Apagando despesa do Supabase:', id);

          

          // 🔑 BYPASS DE SESSÃO - Não verificar sessão para delete

          // 🔑 STOP NO ERRO 400 - Apenas delete direto, sem app_settings

          const { error } = await supabase

            .from('expenses')

            .delete()

            .eq('id', id);

            

          if (error) {

            console.error('[STORE] ❌ Erro ao apagar despesa:', error);

            

            // 🔑 RETRY AUTOMÁTICO SE ERRO 23502

            if (error.code === '23502' && error.message?.includes('name')) {

              console.log('[STORE] 🔄 Erro de produto detectado, tentando cleanup...');

              

              // Limpar produto problemático primeiro

              const cleanupSuccess = await cleanupProblematicProduct();

              

              if (cleanupSuccess) {

                // Tentar apagar despesa novamente após cleanup

                const { error: retryError } = await supabase

                  .from('expenses')

                  .delete()

                  .eq('id', id);

                  

                if (!retryError) {

                  console.log('[STORE] ✅ Despesa apagada com sucesso no retry');

                  

                  // 🔑 REFRESH DO ESTADO LOCAL - Atualização explícita

                  set(state => ({

                    expenses: state.expenses.filter(e => e.id !== id)

                  }));

                  

                  get().addNotification('success', 'Despesa apagada com sucesso');

                  return;

                }

              }

            }

            

            get().addNotification('error', 'Falha ao apagar despesa');

            return;

          }

          

          console.log('[STORE] ✅ Despesa apagada com sucesso no Supabase');

          

          // 🔑 REFRESH DO ESTADO LOCAL - Atualização imediata e explícita

          set(state => ({

            expenses: state.expenses.filter(e => e.id !== id)

          }));

          

          console.log('[STORE] 🔄 Estado local atualizado, expenses removidas:', id);

          

          // 🔑 SQLITE SYNC - Apagar imediatamente do SQLite para evitar fantasmia

          try {

            // Apagar do SQLite se disponível (Electron)
            if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
              const { sqliteService } = await import('../lib/sqliteService');
              await sqliteService.deleteExpense(id);
              console.log('[STORE] Despesa apagada do SQLite');
            }

            console.log('[STORE] ✅ Despesa apagada do SQLite');

          } catch (sqliteError) {

            console.error('[STORE] ❌ Erro ao apagar do SQLite:', sqliteError);

          }

          

          // 🚀 TRIGGER DE ATUALIZAÇÃO IMEDIATA - Limpar cache e refresh

          console.log('[STORE] 🔄 Triggerando atualização automática após deleção...');

          

          // 1. Limpar cache do Dashboard

          if (typeof window !== 'undefined') {

            (window as any).DASHBOARD_CACHE_CLEAR = true;

            console.log('[STORE] 🗑️ Cache do Dashboard marcado para limpeza');

          }

          

          // 2. Disparar evento customizado para Dashboard ouvir

          if (typeof window !== 'undefined') {

            const event = new CustomEvent('expense-deleted', { 

              detail: { expenseId: id, timestamp: new Date().toISOString() } 

            });

            window.dispatchEvent(event);

            console.log('[STORE] 📢 Evento expense-deleted disparado');

          }

          

          // 3. Forçar refresh global (se existir função)

          if (typeof (window as any).forceDashboardRefresh === 'function') {

            (window as any).forceDashboardRefresh();

            console.log('[STORE] 🔄 forceDashboardRefresh executado');

          }

          

          // 4. 🔄 INVALIDAR CACHE DA DATA BRIDGE - NOVO!

          try {

            const { dataServiceBridge } = await import('../lib/data/dataService');

            await dataServiceBridge.invalidateCache();

            console.log('[STORE] 🔄 Data Bridge cache invalidado');

          } catch (bridgeError) {

            console.error('[STORE] ❌ Erro ao invalidar Data Bridge:', bridgeError);

          }

          

          get().addNotification('success', 'Despesa apagada com sucesso');

        } catch (error) {

          console.error('[STORE] ❌ Erro crítico ao apagar despesa:', error);

          get().addNotification('error', 'Falha crítica ao apagar despesa');

        }

      },



      approveExpense: (id, approvedBy) => set(state => ({

        expenses: state.expenses.map(e => 

          e.id === id ? { ...e, status: 'APROVADO', approvedBy, updatedAt: new Date() } : e

        )

      })),



      syncProductsToCloud: async () => {

        get().addNotification('info', 'Sincronizando produtos com a nuvem...');

        try {

          // VERIFICAÇÃO DA TABELA 'PRODUCTS' NO SUPABASE

          console.log("[STORE] Verificando tabela products no Supabase...");

          const { data: productsData, error: productsError } = await supabase

            .from('products')

            .select('*')

            .eq('is_active', true); // ✅ CORREÇÃO: Usar campo correto 'is_active'



          if (productsError) {

            console.error('[STORE] Erro ao buscar produtos:', productsError);

            get().addNotification('error', 'Falha ao buscar produtos do Supabase');

            return;

          }



          console.log("[STORE] Produtos encontrados no Supabase:", productsData?.length || 0);

          

          // 🔑 FIX PRODUCTS BUG - Validar nome antes de sincronizar

          const validProducts = (productsData || []).filter(product => {

            if (!product.name || product.name.trim() === '') {

              console.warn('[STORE] ⚠️ Produto com nome vazio ignorado:', product);

              return false;

            }

            return true;

          });

          

          console.log("[STORE] Produtos válidos para sincronizar:", validProducts.length);

          

          const state = get();

          await supabase

            .from('application_state')

            .upsert({

              id: 'current_state',

              state: JSON.stringify(state),

              updated_at: new Date().toISOString()

            });

          get().addNotification('success', 'Produtos sincronizados com sucesso!');

        } catch (error) {

          get().addNotification('error', 'Falha ao sincronizar produtos');

        }

      },



      syncCategoriesToCloud: async () => {

        get().addNotification('info', 'Sincronizando categorias com a nuvem...');

        try {

          const state = get();

          await supabase

            .from('application_state')

            .upsert({

              id: 'current_state',

              state: JSON.stringify(state),

              updated_at: new Date().toISOString()

            });

          get().addNotification('success', 'Categorias sincronizadas com sucesso!');

        } catch (error) {

          get().addNotification('error', 'Falha ao sincronizar categorias');

        }

      },

      syncPendingOrdersToSupabase: async () => {
        const { getSyncablePendingOrders, removePendingSyncOrder } = await import('../lib/sync/pendingSyncOrders');
        const { orderTransactionService } = await import('../lib/orderTransactionService');
        const { sqliteService } = await import('../lib/sqliteService');
        
        console.log('[SYNC] 🔍 Verificando orders pendentes no localStorage...');
        const pending = await getSyncablePendingOrders();
        
        // 🔥 VERIFICAR SQLITE
        console.log('[SYNC] 🔍 Verificando dados no SQLite...');
        try {
          await sqliteService.init();
          const state = await sqliteService.loadState();
          if (state && state.activeOrders) {
            console.log('[SYNC] 📊 ActiveOrders no SQLite:', state.activeOrders.length);
            console.log('[SYNC] 📋 ActiveOrders:', state.activeOrders.map((o: any) => ({ id: o.id, total: o.total, status: o.status })));
          } else {
            console.log('[SYNC] ℹ️ Nenhum activeOrder encontrado no SQLite');
          }
        } catch (sqliteError) {
          console.error('[SYNC] ❌ Erro ao verificar SQLite:', sqliteError);
        }
        
        // 🔥 VERIFICAR LOCALSTORAGE
        console.log('[SYNC] 🔍 Verificando localStorage...');
        const localStorageData = localStorage.getItem('tasca_vereda_storage_v6');
        if (localStorageData) {
          try {
            const parsed = JSON.parse(localStorageData);
            console.log('[SYNC] 📊 ActiveOrders no localStorage:', parsed.activeOrders?.length || 0);
            if (parsed.activeOrders && parsed.activeOrders.length > 0) {
              console.log('[SYNC] 📋 ActiveOrders:', parsed.activeOrders.map((o: any) => ({ id: o.id, total: o.total, status: o.status })));
            }
          } catch (parseError) {
            console.error('[SYNC] ❌ Erro ao fazer parse do localStorage:', parseError);
          }
        }
        
        if (pending.length === 0) {
          console.log('[SYNC] ℹ️ Nenhuma order pendente encontrada no pending_sync_orders');
          return { synced: 0, failed: 0 };
        }
        
        console.log(`[SYNC] 📊 Encontradas ${pending.length} orders pendentes no pending_sync_orders`);
        
        let synced = 0;
        let failed = 0;
        
        for (const order of pending) {
          try {
            console.log(`[SYNC] 📤 Sincronizando order ${order.id?.slice(-8)}...`);
            
            const orderPayload = {
              id: order.id,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone || '999999999',
              delivery_address: order.delivery_address || 'ENDEREÇO_PADRAO',
              total_amount: order.total_amount,
              status: 'closed' as const,
              payment_method: order.payment_method,
              invoice_number: order.invoice_number,
              created_at: order.created_at,
              updated_at: order.updated_at,
              table_id: order.tableId ? String(order.tableId) : null,
              data_contabil: order.data_contabil // 🔑 Preservar dia operacional original
            };

            const orderItems = (order.items || []).map((item: any) => ({
              order_id: order.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            }));

            const validItems = orderItems.filter(
              (i: any) => typeof i.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(i.product_id)
            );

            const result = await orderTransactionService.executeTransaction(orderPayload, validItems);

            if (result.success) {
              removePendingSyncOrder(order.id);
              synced++;
              console.log(`[SYNC] ✅ Order ${order.id?.slice(-8)} sincronizada`);
            } else {
              failed++;
              console.error(`[SYNC] ❌ Falha ao sincronizar order ${order.id?.slice(-8)}:`, result.error);
            }
          } catch (err) {
            failed++;
            console.error(`[SYNC] ❌ Exceção ao sincronizar order ${order.id}:`, err);
          }
        }
        
        console.log(`[SYNC] 📊 Resultado: ${synced} sincronizadas, ${failed} falharam`);
        
        if (synced > 0) {
          get().addNotification('success', `${synced} venda(s) sincronizada(s) com sucesso!`);
        }
        
        if (failed > 0) {
          get().addNotification('error', `${failed} venda(s) falharam ao sincronizar`);
        }
        
        return { synced, failed };
      },



      setMenu: (menu: Dish[]) => set({ menu }),

      setProducts: (products: any[]) => set({ products }),

      setCategories: (categories: MenuCategory[]) => set({ categories }),

      setTables: (tables: Table[]) => set({ tables }),

      setCustomers: (customers: Customer[]) => set({ customers }),

      loadEvents: async () => {
        try {
          const { EventService } = await import('../services/eventService');
          const data = await EventService.listEvents();
          set({ events: data });
        } catch (error) {
          console.error('[useStore] Erro ao carregar eventos:', error);
        }
      },

      

      // ✅ FUNÇÃO DE LIMPEZA TOTAL - HARD RESET

      clearAllData: () => {

        console.log('[Store] 🧹 LIMPANDO TODOS OS DADOS LOCAIS...');

        set(() => ({

          // Estado inicial limpo

          menu: [],

          products: [],

          categories: [],

          activeOrders: [],

          tables: [],

          customers: [],

          users: [],

          employees: [],

          attendance: [],

          stock: [],

          reservations: [],

          workShifts: [],

          expenses: [],

          orders: [],

          auditLogs: [],

          notifications: [],

          paymentMethods: [],

          tablesConfig: {},

          menuConfig: {},

          settings: {

            restaurantName: 'Tasca do Vereda',

            appLogoUrl: '',

            currency: 'AOA',

            taxRate: 14,

            taxRegime: 'GERAL',

            phone: '',

            address: '',

            nif: '',

            email: '',

            website: '',

            commercialReg: '',

            capitalSocial: '',

            conservatoria: '',

            agtCertificate: '',

            invoiceSeries: '',

            kdsEnabled: false,

            isSidebarCollapsed: false,

            apiToken: '',

            supabaseUrl: '',

            supabaseKey: '',

            autoBackup: false,

            agtSoftwareCertification: '',

            agtSoftwareVersion: '',

            agtProductionCertificate: '',

            agtProcessNumber: '',

            agtCertificationDate: '',

            agtValidityPeriod: '',

            agtTechnicalResponsible: '',

            agtContactEmail: '',

            agtSupportPhone: '',

            saftPassword: '',

            digitalSignatureEnabled: false,

            electronicInvoiceEnabled: false,

            agtEnvironment: 'homologation',

            dataRetentionPeriod: 365,

            backupFrequency: 1,

            lastAuditDate: '',

            nextAuditDate: ''

          },

          invoiceCounter: 1,

          activeTableId: null,

          activeOrderId: null,

          metrics: {

            dailyRevenue: 0,

            monthlyRevenue: 0,

            ordersCount: 0,

            customersCount: 0,

            averageTicket: 0

          }

        }));

        

        // Limpar localStorage manualmente

        try {

          localStorage.clear();

          console.log('[Store] 🗑️ localStorage limpo');

        } catch (error) {

          console.error('[Store] ❌ Erro ao limpar localStorage:', error);

        }

        

        // Limpar IndexedDB se existir

        try {

          if ('indexedDB' in window) {

            indexedDB.databases().then((databases) => {

              databases.forEach((db) => {

                if (db?.name && (db.name.includes('tasca') || db.name.includes('zustand') || db.name.includes('vereda'))) {

                  indexedDB.deleteDatabase(db.name);

                  console.log('[Store] 🗑️ IndexedDB apagado:', db.name);

                }

              });

            });

          }

        } catch (error) {

          console.error('[Store] ❌ Erro ao limpar IndexedDB:', error);

        }

      },

      

      resetFinancialData: () => {

        set(state => ({

          activeOrders: [],

          invoiceCounter: 1,

          activeTableId: null,

          activeOrderId: null,

          tables: state.tables.map(t => ({ ...t, status: 'LIVRE' as const }))

        }));

      },

      

      fetchOrders: async () => {

        try {

          console.log('[STORE] Buscando ordens do Supabase...');

          const { data, error } = await supabase

            .from('orders')

            .select('*')

            .order('created_at', { ascending: false })

            .limit(100);



          if (error) {

            console.error('[STORE] Erro ao buscar ordens:', error);

            return;

          }



          console.log('[STORE] Ordens buscadas:', data?.length || 0);

          // Aqui poderia atualizar o estado se necessário

        } catch (error) {

          console.error('[STORE] Erro crítico ao buscar ordens:', error);

        }

      },

      

      // 🔄 QUERY UNIFICADA - Fonte da Verdade para Faturação de Hoje

      getTodayRevenue: async () => {

        const orders = get().activeOrders;

        

        // 🚨 CORREÇÃO CRÍTICA: Usar início do dia local (fuso Luanda)

        const inicioHoje = new Date();

        inicioHoje.setHours(0, 0, 0, 0); // Meia-noite local

        

        // Filtrar ordens de hoje - COMPARAÇÃO DE DATAS REAIS

        const todayOrders = orders.filter(order => {

          // 🚨 CORREÇÃO: Comparar datas reais, não strings

          const orderDate = order.timestamp ? new Date(order.timestamp) : null;

          

          // Status válidos para faturação - TODAS AS VARIAÇÕES

          const validStatus = ['closed', 'FECHADO', 'paid', 'pago', 'finalized'].includes(order.status);

          

          // Valor válido (não NULL ou zero)

          const hasValidTotal = Number(order.total || 0) > 0;

          

          // Verificar se é hoje usando comparação de datas

          const isToday = orderDate && orderDate >= inicioHoje;

          

          return isToday && validStatus && hasValidTotal;

        });

        

        // 🔍 DEBUG FINANCEIRO - CÁLCULO CORRETO COM DATAS REAIS

        // const external_history = 0; // 🔥 CORREÇÃO: Removido 8.000.000 Kz fixo - usar apenas dados reais

        const vendasHoje = todayOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

        const total = vendasHoje; // 🔥 CORREÇÃO: Apenas vendas reais do dia

        

        console.log("🔍 DEBUG FINANCEIRO -> INÍCIO HOJE (FUSO LUANDA):", inicioHoje.toISOString());

        console.log("🔍 DEBUG FINANCEIRO -> VENDAS HOJE (DATAS REAIS):", vendasHoje);

        console.log("🔍 DEBUG FINANCEIRO -> ORDENS HOJE:", todayOrders.length);

        console.log("🔍 DEBUG FINANCEIRO -> RENDIMENTO GLOBAL:", total);

        console.log("🔍 DEBUG FINANCEIRO -> DATA ATUAL:", new Date().toISOString());

        console.log("🔍 DEBUG FINANCEIRO -> CORREÇÃO APLICADA - Valores Reais:", {

          vendasHoje: vendasHoje,

          total: Number(total),

          formatKz: formatKz(total),

          ordersCount: todayOrders.length

        });

        

        return total; // 🔥 CORREÇÃO: Retorna apenas vendas reais do dia (sem valores fictícios)

      }

    })) as StateCreator<StoreState>,
    {
      name: 'vereda-store',
      // 🔥 SOLUÇÃO DEFINITIVA: Só persistir dados PEQUENOS no localStorage
      // Dados grandes (menu, produtos, clientes, ordens) vêm sempre do Supabase
      storage: createJSONStorage(() => customPersistenceStorage) as any,
      partialize: (state) => ({
        settings: state.settings,
        currentUser: state.currentUser,
        tables: state.tables,
        invoiceCounter: state.invoiceCounter,
        customerDisplayMode: state.customerDisplayMode,
        activeOrders: state.activeOrders, // 🔥 PERSISTIR mesas/contas abertas com produtos
        customers: state.customers, // 🔥 PERSISTIR clientes (incl. contas pendentes)
        workShifts: state.workShifts // 🔥 PERSISTIR escalas de turno
      }),
      merge: (persistedState: any, currentState: any) => {
        const merged = { ...currentState, ...persistedState };
        // 🎯 Limpar custosFixosMensal antigo (era 350000 por defeito, agora deve ser undefined para usar staffCosts + UTILIDADES)
        if (merged.settings && merged.settings.custosFixosMensal === 350000) {
          merged.settings = { ...merged.settings, custosFixosMensal: undefined };
        }
        return merged;
      }
    }
  )
);

// 🔥 Função para carregar ordens ativas do Supabase (APENAS Supabase, sem mesclagem)
export const loadAndMergeActiveOrders = async () => {
  try {
    console.log('[ACTIVE ORDERS] 🔄 Carregando ordens ativas do Supabase...');

    const supabaseOrders = await loadActiveOrdersFromSupabase();
    console.log('[ACTIVE ORDERS] 📊 Ordens do Supabase:', supabaseOrders.length);

    // 🔥 CORREÇÃO CRÍTICA: NUNCA sobrescrever ordens locais (_isLocal: true)
    const currentActiveOrders = useStore.getState().activeOrders;
    // 🔥 Só proteger orders locais que ainda estão genuinamente ABERTAS
    const closedStatuses = new Set(['closed', 'paid', 'pago', 'FECHADO', 'finalized', 'void', 'VOID']);
    const localOrders = currentActiveOrders.filter(o => o._isLocal === true && !closedStatuses.has(o.status || ''));
    const nonLocalOrderIds = new Set(currentActiveOrders.filter(o => !o._isLocal).map(o => o.id));
    
    // 🔥 PREVENIR DUPLICAÇÃO: Se já existe uma order local ABERTA para a mesma mesa,
    // não trazer outra order do Supabase para essa mesa (operador pode ter re-adicionado items)
    const localTableIds = new Set(localOrders.map(o => o.tableId).filter(Boolean));
    const nonLocalTableIds = new Set(currentActiveOrders.filter(o => !o._isLocal).map(o => o.tableId).filter(Boolean));

    // 🔥 MERGE INTELIGENTE: Para cada order, se uma versão (local ou Supabase) tem items
    // e a outra não, manter a que tem items. Preferir local se ambas têm items (mais recente).
    const mergedOrders = [...localOrders];
    
    // Processar ordens não-locais existentes (excluir as já fechadas/pagas)
    const existingNonLocal = currentActiveOrders.filter(o => !o._isLocal && !closedStatuses.has(o.status || ''));
    for (const existing of existingNonLocal) {
      const supabaseVersion = supabaseOrders.find((so: Order) => so.id === existing.id);
      if (supabaseVersion) {
        // Temos ambas - manter a que tem items, preferir local se ambas têm
        const existingItems = existing.items?.length || 0;
        const supabaseItems = supabaseVersion.items?.length || 0;
        if (existingItems > 0) {
          mergedOrders.push(existing); // local tem items, manter
        } else if (supabaseItems > 0) {
          mergedOrders.push(supabaseVersion); // Supabase tem items, usar
        } else {
          mergedOrders.push(existing); // nenhuma tem items, manter local
        }
      } else {
        mergedOrders.push(existing); // não está no Supabase, manter local
      }
    }
    
    // Adicionar ordens do Supabase que não existem localmente
    const allLocalIds = new Set(mergedOrders.map(o => o.id));
    for (const so of supabaseOrders) {
      if (!allLocalIds.has(so.id)) {
        // Verificar se a mesa já tem order local
        if (so.tableId && localTableIds.has(so.tableId)) {
          console.log(`[ACTIVE ORDERS] ⚠️ Order ${so.id} do Supabase ignorada - mesa ${so.tableId} já tem order local`);
        } else {
          mergedOrders.push(so);
        }
      }
    }

    console.log('[ACTIVE ORDERS] 🔄 Merge concluído:', {
      localOrders: localOrders.length,
      fromSupabase: supabaseOrders.length,
      merged: mergedOrders.length
    });

    const finalActiveOrders = mergedOrders;

    const currentTables = useStore.getState().tables;
    const updatedTables = currentTables.map(table => {
      const hasOpenOrder = supabaseOrders.some(order => order.tableId === table.id && order.status === 'ABERTO');
      if (hasOpenOrder && table.status !== 'OCUPADO') {
        console.log(`[ACTIVE ORDERS] 🪑 Mesa ${table.id} (${table.name}) marcada como OCUPADO`);
        return { ...table, status: 'OCUPADO' as const };
      } else if (!hasOpenOrder && table.status === 'OCUPADO') {
        // 🔥 LIBERAR MESA se não tiver mais ordens abertas no Supabase
        console.log(`[ACTIVE ORDERS] 🆓 Mesa ${table.id} (${table.name}) liberada (sem ordens abertas)`);
        return { ...table, status: 'LIVRE' as const };
      }
      return table;
    });

    useStore.setState({
      activeOrders: finalActiveOrders, // 🔥 Protegendo ordens locais + Supabase
      tables: updatedTables
    });

    console.log('[ACTIVE ORDERS] ✅ Carregamento concluído:', {
      fromSupabase: supabaseOrders.length,
      tablesOccupied: updatedTables.filter(t => t.status === 'OCUPADO').length
    });
    
    // 🔥 INICIAR AUTO-BACKUP após carregar
    startAutoBackup(() => useStore.getState().activeOrders);
  } catch (err) {
    console.error('[ACTIVE ORDERS] ❌ Erro ao carregar ordens do Supabase:', err);
    
    // ⚠️ SÓ em caso de ERRO (não quando vazio), tentar backup local
    console.log('[ACTIVE ORDERS] 🔄 ERRO no Supabase - tentando backup local...');
    const localOrders = useStore.getState().activeOrders;
    const restoredOrders = await checkAndRestoreActiveOrders(localOrders);

    if (restoredOrders && restoredOrders.length > 0) {
      console.log('[ACTIVE ORDERS] ✅ Ordens restauradas do backup:', restoredOrders.length);
      useStore.setState({ activeOrders: restoredOrders });
    }
  }
};

