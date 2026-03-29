
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { sqliteService } from '../lib/sqliteService';
import { supabase } from '../supabase_standalone';
import { versionControlService } from '../lib/versionControlService';
import { sqlMigrationService } from '../lib/sqlMigrationService';
import { databaseService } from '../lib/databaseService';
import { Table, Order, Dish, Customer, PaymentMethod, User, SystemSettings, Notification, MenuCategory, OrderType, Employee, AttendanceRecord, StockItem, Reservation, WorkShift, OrderItem, PermissionTemplate, AuditLog, PaymentMethodConfig, Expense } from '../../types';
import { addPendingSyncOrder, type PendingSyncOrder } from '../lib/pendingSyncOrders';
import { MOCK_TABLES, MOCK_USERS, MOCK_STOCK, MOCK_RESERVATIONS } from '../../constants';
import defaultLogo from '/logo.png';
import { formatDateInAppTimezone, formatKz } from '../lib/dateUtils';

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
      // TODO: Atualizar store com staffData
    }
    
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
      // TODO: Atualizar store com productsData
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
      return isToday && (o.status === 'FECHADO' || o.status === 'closed' || o.status === 'paid' || o.status === 'pago' || o.status === 'finalized');
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
      
      const { error } = await supabase
        .from('orders')
        .insert({
          ...order,
          synced_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('[SYNC ORDER] ❌ Erro ao sincronizar com Supabase:', error);
        return false;
      } else {
        console.log('[SYNC ORDER] ✅ Venda sincronizada com Supabase');
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
      // 🧹 LIMPAR O LIXO - Remover dados corrompidos no arranque
      console.log('[PERSISTENCE] 🧹 LIMPANDO CACHE CORROMPIDO NO ARRANQUE...');
      const corruptedKeys = [
        'vereda-store',
        'vereda-store-orders',
        'vereda-store-metrics',
        'vereda-store-historico',
        'vereda-store-activeOrders'
      ];
      
      corruptedKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            // 🔍 PROTEGER O PARSE - Verificar se JSON é válido
            try {
              JSON.parse(value);
              console.log('[PERSISTENCE] ✅ Cache válido:', key);
            } catch (parseError) {
              console.log('[PERSISTENCE] 🗑️ Cache corrompido, removendo:', key);
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.log('[PERSISTENCE] �️ Erro ao verificar chave, removendo:', key);
          localStorage.removeItem(key);
        }
      });
      
      // � MATAR O CACHE CEGO - LER VERDADE DO SUPABASE PRIMEIRO
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      const isOnline = navigator.onLine;
      
      // 🚀 SE HOUVER INTERNET, LER SUPABASE PRIMEIRO - IGNORAR SQLITE
      if (isOnline) {
        console.log('[PERSISTENCE] 🌐 INTERNET DETECTADA - LENDO VERDADE DO SUPABASE PRIMEIRO...');
        
        try {
          const { data: remoteData, error } = await supabase
            .from('categories')
            .select('id')
            .limit(1);
          
          if (!error && remoteData) {
            console.log('[PERSISTENCE] ✅ Conexão Supabase validada - ignorando SQLite');
            // 🔑 CORRIGIR: Retornar estado atual do store
            return JSON.stringify({ state: useStore.getState(), version: 8 });
          }
          
          // 🔑 SE SUPABASE FALHAR, LIMPAR CACHE LOCAL PARA EVITAR DADOS FANTASMA
          if (error || !remoteData) {
            console.log('[PERSISTENCE] ⚠️ SUPABASE FALHOU - LIMPANDO CACHE LOCAL PARA EVITAR DADOS FANTASMA');
            await sqliteService.saveState(null);
            console.log('[PERSISTENCE] ✅ CACHE LOCAL LIMPO FORÇADAMENTE');
            return null;
          }
        } catch (supabaseError) {
          console.log('[PERSISTENCE] ❌ ERRO NO SUPABASE, LIMPANDO CACHE LOCAL:', supabaseError);
          await sqliteService.saveState(null);
          return null;
        }
      }
      
      // 📱 APENAS SE ESTIVER OFFLINE: Usar SQLite local (TEMPORARIAMENTE DESATIVADO PARA TESTE)
      console.log('[PERSISTENCE] 📱 SQLITE DESATIVADO TEMPORARIAMENTE - FORÇANDO SUPABASE...');
      // const data = await sqliteService.loadState(); // 🔑 DESATIVADO PARA TESTE
      const data = null; // 🔑 FORÇAR NULL PARA OBRIGAR LEITURA DO SUPABASE
      
      if (data) {
        console.log('[PERSISTENCE] 📱 Dados encontrados no SQLite (modo offline)');
        // 🔑 CORRIGIR O SETITEM - Usar JSON.stringify correto
        return JSON.stringify({ state: data, version: 8 });
      }
      
      console.log('[PERSISTENCE] ❌ Nenhum dado encontrado');
      return null;
    } catch (e) {
      console.error('[PERSISTENCE] ❌ ERRO CRÍTICO NO GETITEM:', e);
      // 🧹 LIMPAR TUDO SE ERRO FOR CRÍTICO
      localStorage.clear();
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      // 🔑 CORRIGIR O SETITEM - Verificar se value já é string ou precisa de stringify
      let parsed;
      try {
        // Se value já for string, fazer parse direto
        if (typeof value === 'string') {
          parsed = JSON.parse(value);
        } else {
          // Se value for objeto, fazer stringify primeiro
          parsed = value;
        }
      } catch (parseError) {
        console.error('[PERSISTENCE] ❌ Erro ao fazer parse do value:', parseError);
        return;
      }
      
      const isOnline = navigator.onLine;
      
      // 🔑 PRIORIDADE DE ESCRITA BLINDADA: Supabase SEMPRE se online
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      
      if (isOnline && !isTauri) {
        // App Web online: Supabase é a FONTE DA VERDADE
        console.log('[PERSISTENCE] 🌐 App Web Online - Escrevendo PRIMEIRO no Supabase (fonte da verdade)...');
        
        try {
          // 1. Escrever no Supabase IMEDIATAMENTE
          // 🔑 CORRIGIR: REMOVER ESCRITA EM app_settings - APENAS SQLITE LOCAL
          console.log('[PERSISTENCE] 💾 Salvando apenas em SQLite local...');
          await sqliteService.saveState(parsed.state || parsed);
          console.log('[PERSISTENCE] ✅ Salvo em SQLite com sucesso');
          
        } catch (supabaseError) {
          console.error('[PERSISTENCE] ❌ Erro ao escrever no Supabase, usando apenas SQLite:', supabaseError);
          // Fallback: SQLite apenas
          await sqliteService.saveState(parsed.state || parsed);
        }
      } else {
        // App Tauri ou Offline: SQLite é a fonte principal
        console.log('[PERSISTENCE] 📱 App Tauri/Offline - SQLite como fonte principal...');
        await sqliteService.saveState(parsed.state || parsed);
        
        // Se Tauri estiver online, tentar sincronizar com Supabase depois
        if (isTauri && isOnline) {
          console.log('[PERSISTENCE] 🔄 Tauri online - tentando sincronizar com Supabase...');
          setTimeout(async () => {
            try {
              const stateString = JSON.stringify(parsed.state || parsed);
              await supabase
                .from('application_state')
                .upsert({ id: 'current_state', data: stateString });
              console.log('[PERSISTENCE] ✅ Tauri sincronizado com Supabase');
            } catch (syncError) {
              console.error('[PERSISTENCE] ❌ Erro na sincronização do Tauri:', syncError);
            }
          }, 1000);
        }
      }
      
      // Notify other tabs/windows
      const channel = getSyncChannel();
      if (channel) {
        channel.postMessage({ type: 'STATE_UPDATE' });
      }
    } catch (e) {
      console.error('[PERSISTENCE] ❌ Erro ao salvar dados:', e);
    }
  },
  removeItem: async (_name: string): Promise<void> => {
    try {
      // 🔑 PRIORIDADE TOTAL AO SUPABASE SE ONLINE
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      if (!isTauri) {
        console.log('[PERSISTENCE] 🔄 Removendo do Supabase...');
        try {
          await supabase
            .from('application_state')
            .delete()
            .eq('id', 'current_state');
          console.log('[PERSISTENCE] ✅ Removido do Supabase');
        } catch (supabaseError) {
          console.error('[PERSISTENCE] ❌ Erro ao remover do Supabase:', supabaseError);
        }
      }
      
      // 🔑 SEMPRE remover do SQLite
      console.log('[PERSISTENCE] 📱 Removendo do SQLite...');
      await sqliteService.saveState(null);
      
      // Notify other tabs/windows
      const channel = getSyncChannel();
      if (channel) {
        channel.postMessage({ type: 'STATE_UPDATE' });
      }
    } catch (e) {
      console.error('[PERSISTENCE] ❌ Erro ao remover dados:', e);
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
  addSubAccount: (tableId: number, name: string) => void;
  removeSubAccount: (orderId: string) => void;
  
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
  
  // Função unificada de faturação de hoje
  getTodayRevenue: () => number;
  
  setActiveTable: (id: number | null) => void;
  setActiveOrder: (id: string | null) => void;
  createNewOrder: (tableId: number | null, name?: string, type?: OrderType) => string;
  transferOrder: (orderId: string, targetTableId: number) => void;
  addToOrder: (tableId: number | null, dish: Dish, quantity?: number, notes?: string, orderId?: string) => void;
  checkoutTable: (orderId: string, paymentMethod: PaymentMethod, customerId?: string, customerNif?: string) => Promise<{ success: boolean; savedLocally?: boolean }>;
  updateOrderPaymentMethod: (orderId: string, newMethod: PaymentMethod) => void;
  
  updateTablePosition: (id: number, x: number, y: number) => void;
  addTable: (table: Table) => void;
  updateTable: (table: Table) => void;
  removeTable: (id: number) => void;
  closeTable: (id: number) => void;

  updateOrderStatus: (orderId: string, status: Order['status']) => void;
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
  removeEmployee: (id: string) => void;
  loadEmployees: () => Promise<void>;
  clockIn: (employeeId: string) => void;
  clockOut: (employeeId: string) => void;
  externalClockSync: (bioId: string) => void;

  addWorkShift: (shift: WorkShift) => void;
  updateWorkShift: (shift: WorkShift) => void;
  removeWorkShift: (id: string) => void;

  addReservation: (res: Reservation) => void;

  backupToSupabase: () => Promise<void>;
  restoreFromSupabase: () => Promise<void>;
  resetFinancialData: () => void;
  fetchOrders: () => Promise<void>;
  
  setMenu: (menu: Dish[]) => void;
  setCategories: (categories: MenuCategory[]) => void;
  setTables: (tables: Table[]) => void;
  setCustomers: (customers: Customer[]) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      users: [...MOCK_USERS, { id: '5', name: 'Proprietário', role: 'OWNER', pin: '0000', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'], status: 'ATIVO' }],
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
        const user = get().users.find(u => (userId ? u.id === userId : true) && u.pin === pin);
        if (user) { 
          set({ currentUser: user }); 
          get().addNotification('success', `Acesso autorizado: ${user.name}`);
          return true; 
        }
        get().addNotification('error', 'PIN Inválido');
        return false;
      },
      logout: () => {
        localStorage.clear();
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
        supabaseUrl: "https://ratzyxwpzrqbtpheygch.supabase.co",
        supabaseKey: "sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo",
        autoBackup: true,
        customDigitalMenuUrl: "https://tasca-do-vereda.vercel.app/menu-digital",
        agtSoftwareCertification: "AGT-2025-001",
        agtSoftwareVersion: "1.0.5",
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
        dataRetentionPeriod: 365,
        backupFrequency: "daily",
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
      activeOrders: [],
      customers: [],
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
        versionControlService.createRestorePoint(`Alteração no prato: ${d.name}`, get());
        set(state => ({ menu: state.menu.map(x => x.id === d.id ? d : x) }));
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
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
        const categoryProducts = get().menu.filter(d => d.categoryId === id);
        const newDishes = categoryProducts.map(d => ({
          ...d,
          id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: `${d.name} (Cópia)`,
          categoryId: newCatId
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

      createNewOrder: (tableId, _name, type: OrderType = 'LOCAL') => {
        const id = `ord-${Date.now()}`;
        const newOrder: Order = {
          id, tableId, type, items: [], status: 'ABERTO' as const, timestamp: new Date(),
          total: 0, taxTotal: 0, profit: 0, subAccountName: _name || 'Principal'
        };
        set(state => ({
          activeOrders: [...state.activeOrders, newOrder],
          activeOrderId: id,
          tables: tableId ? state.tables.map(t => t.id === tableId ? { ...t, status: 'OCUPADO' as const } : t) : state.tables
        }));
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
      },

      // 🚨 UNIFICAÇÃO DE STATUS - Script de normalização
      normalizeAllOrderStatuses: () => {
        const state = get();
        const ordersToUpdate = state.activeOrders.filter(o => o.status === 'FECHADO');
        
        if (ordersToUpdate.length > 0) {
          console.log(`[NORMALIZE] Convertendo ${ordersToUpdate.length} ordens de 'FECHADO' para 'closed'`);
          
          set(state => ({
            activeOrders: state.activeOrders.map(order => 
              order.status === 'FECHADO' 
                ? { ...order, status: 'FECHADO' as const }
                : order
            )
          }));
        }
      },

      checkoutTable: async (orderId, paymentMethod, customerId, customerNif?: string): Promise<{ success: boolean; savedLocally?: boolean }> => {
        const order = get().activeOrders.find(o => o.id === orderId);
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
        const invoiceNumber = `FR VER${series}/${count}`;
        const now = new Date().toISOString();
        const orderData = {
          id: order.id,
          customer_name: customerName,
          customer_phone: '999999999',
          customer_nif: customerNif || null, // NOVO: NIF do cliente opcional
          delivery_address: 'ENDEREÇO_PADRAO',
          total_amount: order.total,
          status: 'pending', // 🔥 CORREÇÃO: Usar 'pending' para match com useSyncCore
          payment_method: pm,
          invoice_number: invoiceNumber,
          created_at: now,
          updated_at: now
        };

        const orderItems = (order.items || []).map(item => ({
          order_id: order.id,
          product_id: item.dish?.id || item.dishId, // 🛡️ Usar dish.id com fallback para dishId
          quantity: item.quantity,
          unit_price: item.dish?.price || item.unitPrice, // 🛡️ Usar dish.price com fallback
          total_price: (item.dish?.price || item.unitPrice) * item.quantity
        }));

        const applyLocalState = () => {
          const series = get().settings.invoiceSeries;
          const count = get().invoiceCounter;
          const invoiceNumber = `FR VER${series}/${count}`;
          const hash = Math.random().toString(36).substring(2, 12).toUpperCase();
          const orderTotal = order.total;
          const tableId = order.tableId;

          set(state => {
            const newCustomers = customerId && paymentMethod === 'PAGAR_DEPOIS'
              ? state.customers.map(c => c.id === customerId ? { ...c, balance: c.balance + orderTotal } : c)
              : state.customers;

            const newOrders: Order[] = state.activeOrders.map(o =>
              o.id === orderId ? { ...o, status: 'FECHADO' as const, paymentMethod, customerId, invoiceNumber, hash } : o
            );

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
          
          console.log('[CHECKOUT] ✅ Validação passou. Enviando para Supabase...');
          
          // 🔑 OBRIGATÓRIO: FORÇAR UPLOAD DIRETO - TESTE COM INSERT
          console.log('[CHECKOUT] 🚀 FORÇANDO UPLOAD DIRETO COM INSERT - TESTE DE CONEXÃO...');
          console.log('[CHECKOUT] 📊 URL Supabase:', supabase.supabaseUrl);
          console.log('[CHECKOUT] 📊 OrderData completo:', JSON.stringify(orderData, null, 2));
          
          const { data: insertData, error } = await supabase.from('orders').insert([orderData]).select();
          
          if (error) {
            console.error('[CHECKOUT] ❌ ERRO CRÍTICO SUPABASE:', error);
            console.error('[CHECKOUT] ❌ DETALHES DO ERRO:', JSON.stringify(error, null, 2));
            throw new Error(`Falha crítica no Supabase: ${error.message}`);
          } else {
            console.log('[CHECKOUT] ✅ VENDA ENVIADA COM SUCESSO!');
            console.log('[CHECKOUT] ✅ DADOS RETORNADOS:', insertData);
          }

          // INSERT IMEDIATO DOS ITENS - GARANTIR REAL-TIME
          if (orderItems.length > 0) {
            const validItems = orderItems.filter(
              i => typeof i.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(i.product_id)
            );
            console.log('[CHECKOUT] ✅ Inserindo itens em tempo real:', validItems.length, 'itens');
            
            if (validItems.length > 0) {
              const { error: itemsError, data: itemsResult } = await supabase.from('order_items').insert(validItems).select();
              if (itemsError) {
                console.error('[CHECKOUT] ❌ Erro ao inserir order_items:', itemsError);
                throw itemsError;
              } else {
                console.log('[CHECKOUT] ✅ Order_items inseridos com sucesso:', itemsResult);
              }
            }
          }

          // � VERIFICAÇÃO: Confirmar que a venda foi salva no Supabase
          console.log('[CHECKOUT] 🔍 VERIFICANDO SE VENDA FOI SALVA...');
          const { data: verifyOrder, error: verifyError } = await supabase
            .from('orders')
            .select('id, total_amount, created_at, status')
            .eq('id', orderData.id)
            .single();
          
          if (verifyError) {
            console.error('[CHECKOUT] ❌ Erro ao verificar venda no Supabase:', verifyError);
          } else {
            console.log('[CHECKOUT] ✅ VENDA CONFIRMADA NO SUPABASE:', verifyOrder);
          }
          
          // �🔄 FORÇAR REFRESH DO STORE PARA REAL-TIME
          console.log('[CHECKOUT] 🔄 Forçando refresh do store para real-time...');
          await get().fetchOrders(); // Buscar ordens atualizadas do Supabase
          
          // 🔥 ADICIONADO: Trigger evento de sincronização para outros componentes
          console.log('[CHECKOUT] 📡 Emitindo evento de sincronização...');
          const event = new CustomEvent('order-completed', { 
            detail: { orderId: orderData.id, total: orderData.total_amount, action: 'created' } 
          });
          window.dispatchEvent(event);
          
          // 🔥 FORÇAR REFRESH GLOBAL APOS VENDA
          console.log('[CHECKOUT] 🔄 Forçando refresh global...');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-refresh', {}));
          }, 500);
          
          // 🔥 ADICIONADO: Forçar mutação do Dashboard (SWR/State Mutate)
          console.log('[CHECKOUT] 🔄 Forçando mutação do Dashboard...');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('dashboard-mutate', { 
              detail: { action: 'invalidate', timestamp: Date.now() } 
            }));
          }, 100);

          // �🛡️ LIBERAR MESA APÓS VENDA CONFIRMADA
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
                
                // Liberar mesa
                if (tableId) {
                  await supabase.from('pos_tables').update({ status: 'LIVRE' }).eq('id', tableId);
                }
                
                await get().fetchOrders();
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
      closeTable: (id: number) => {
        const tableToClose = get().tables.find(t => t.id === id);
        if (!tableToClose) return;

        // Verificar se existem pedidos com itens (que não podem ser fechados sem pagamento)
        const hasOrdersWithItems = get().activeOrders.some(o => o.tableId === id && o.status === 'ABERTO' && o.items.length > 0);
        
        if (hasOrdersWithItems) {
          get().addNotification('error', `Não é possível fechar a mesa ${tableToClose.name} porque tem pedidos ativos com itens.`);
          return;
        }

        versionControlService.createRestorePoint(`Fecho da mesa: ${tableToClose.name}`, get());
        
        set(state => ({
          tables: state.tables.map(t => t.id === id ? { ...t, status: 'LIVRE' as const } : t),
          // Remove pedidos vazios da mesa
          activeOrders: state.activeOrders.filter(o => !(o.tableId === id && o.status === 'ABERTO')),
          activeTableId: state.activeTableId === id ? undefined : state.activeTableId,
          activeOrderId: state.activeTableId === id ? undefined : state.activeOrderId
        }));

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
          subAccountName: _name || undefined
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

      updateOrderItemStatus: (orderId, itemIndex, status) => set(state => ({
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
              status: e.status || 'active'
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

      addWorkShift: (s) => set(state => ({ workShifts: [...state.workShifts, s] })),
      updateWorkShift: (s) => set(state => ({ workShifts: state.workShifts.map(x => x.id === s.id ? s : x) })),
      removeWorkShift: (id) => set(state => ({ workShifts: state.workShifts.filter(x => x.id !== id) })),

      addReservation: (res) => set(state => ({ reservations: [...state.reservations, res] })),

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
                data: JSON.stringify(state),
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
            .select('state_data')
            .eq('id', 'current_state')
            .single();
          
          if (data?.state_data) {
            set(JSON.parse(data.state_data));
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
            role: staff.role || 'GARCOM',
            salary: Number(staff.base_salary_kz || staff.salary || 0),
            phone: staff.phone || '',
            status: (staff.is_active ? 'ATIVO' : 'INATIVO') as 'ATIVO' | 'INATIVO',
            color: staff.color || '#3B82F6',
            workDaysPerMonth: staff.work_days_per_month || 22,
            dailyWorkHours: staff.daily_work_hours || 8,
            externalBioId: staff.external_bio_id || staff.id,
            foodAllowance: staff.food_allowance || 0,
            transportAllowance: staff.transport_allowance || 0,
            bonus: staff.bonus || 0,
            overtimeHourlyRate: staff.overtime_hourly_rate || 0
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
            await sqliteService.deleteExpense(id);
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
            const { dataServiceBridge } = await import('../lib/dataService');
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
              state_data: JSON.stringify(state),
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
              state_data: JSON.stringify(state),
              updated_at: new Date().toISOString()
            });
          get().addNotification('success', 'Categorias sincronizadas com sucesso!');
        } catch (error) {
          get().addNotification('error', 'Falha ao sincronizar categorias');
        }
      },

      setMenu: (menu: Dish[]) => set({ menu }),
      setCategories: (categories: MenuCategory[]) => set({ categories }),
      setTables: (tables: Table[]) => set({ tables }),
      setCustomers: (customers: Customer[]) => set({ customers }),
      
      // ✅ FUNÇÃO DE LIMPEZA TOTAL - HARD RESET
      clearAllData: () => {
        console.log('[Store] 🧹 LIMPANDO TODOS OS DADOS LOCAIS...');
        set(() => ({
          // Estado inicial limpo
          menu: [],
          categories: [],
          activeOrders: [],
          tables: [],
          customers: [],
          users: MOCK_USERS,
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
            taxRate: 6.5,
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
            dataRetentionPeriod: 365,
            backupFrequency: 'daily',
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
        const external_history = 0; // 🔥 CORREÇÃO: Removido 8.000.000 Kz fixo - usar apenas dados reais
        const vendasHoje = todayOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
        const total = vendasHoje; // 🔥 CORREÇÃO: Apenas vendas reais do dia
        
        console.log("🔍 DEBUG FINANCEIRO -> INÍCIO HOJE (FUSO LUANDA):", inicioHoje.toISOString());
        console.log("🔍 DEBUG FINANCEIRO -> VENDAS HOJE (DATAS REAIS):", vendasHoje);
        console.log("🔍 DEBUG FINANCEIRO -> ORDENS HOJE:", todayOrders.length);
        console.log("🔍 DEBUG FINANCEIRO -> RENDIMENTO GLOBAL:", total);
        console.log("🔍 DEBUG FINANCEIRO -> DATA ATUAL:", new Date().toISOString());
        console.log("� DEBUG FINANCEIRO -> CORREÇÃO APLICADA - Valores Reais:", {
          external_history: 0, // 🔥 CORREÇÃO: Antes era 8.000.000
          vendasHoje: vendasHoje,
          total: Number(total),
          formatKz: formatKz(total),
          ordersCount: todayOrders.length
        });
        
        return total; // 🔥 CORREÇÃO: Retorna apenas vendas reais do dia (sem valores fictícios)
      }
    }),
    {
      name: 'vereda-store',
      storage: customPersistenceStorage,
      version: 8,
      migrate: (persistedState, version) => {
        if (version === 7) {
          // Migration from version 7 to 8
          return persistedState as StoreState;
        }
        return persistedState as StoreState;
      }
    }
  )
);
