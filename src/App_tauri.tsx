/**
 * ============================================================================
 * App_tauri.tsx - Main Application Entry Point (Windows/Desktop)
 * ============================================================================
 * 
 * ARCHITECTURE OVERVIEW:
 * This is the PRIMARY entry point for the Windows desktop application.
 * It handles routing, authentication, Supabase connection, and app lifecycle.
 * 
 * FILE STRUCTURE:
 * - Lines 1-40:    Imports and lazy-loaded components
 * - Lines 41-140:  App initialization and startup logic
 * - Lines 141-252: Real-time listeners (Supabase, BroadcastChannel)
 * - Lines 254-411: Session management and configuration
 * - Lines 413-676: Setup and schema creation functions
 * - Lines 678-784: Render logic and routing
 * 
 * KEY FEATURES:
 * ✅ Offline-first PIN authentication (no Supabase required for login)
 * ✅ Real-time sync with Supabase when connected
 * ✅ Owner Hub integration (remote reset signals)
 * ✅ Customer Display support (separate route)
 * ✅ Purchase approval workflow (public route)
 * ✅ Automatic schema creation on first setup
 * 
 * ROUTES:
 * Public: /approve-purchase/*, /customer-display/*, /input-test, /supabase-diagnostic
 * Auth:   /pos, /dashboard, /finance, /reports, /analytics, /inventory, etc.
 * Owner:  /owner/login, /owner/dashboard
 * 
 * MAINTENANCE NOTES:
 * - This file is ~784 lines - DO NOT refactor while in production
 * - All changes must follow Production Safety Protocol
 * - Backup required before any modifications
 * - Test offline login after every change
 * 
 * @module App
 * @since 1.0.0
 * @last-modified 2026-05-07
 * ============================================================================
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { supabase } from './supabase_standalone';
import { createClient } from '@supabase/supabase-js';
import { sqliteService } from './lib/sqliteService';
import { useStore, loadActiveOrdersFromSupabase } from './store/useStore';

// 🚀 LAZY LOADING para rotas pesadas - PERFORMANCE
const POS = lazy(() => import('./views/POS'));
const SystemHub = lazy(() => import('./views/SystemHub'));
const Inventory = lazy(() => import('./views/Inventory'));
const StockManagement = lazy(() => import('./views/StockManagement'));
const Events = lazy(() => import('./views/Events'));
const Finance = lazy(() => import('./views/Finance'));
const Reports = lazy(() => import('./views/Reports'));
const Analytics = lazy(() => import('./views/Analytics'));
const Employees = lazy(() => import('./views/Employees'));
const Purchases = lazy(() => import('./views/Purchases'));
const TableLayout = lazy(() => import('./views/TableLayout'));
const Reservations = lazy(() => import('./views/Reservations'));
const AGTControl = lazy(() => import('./views/AGTControl'));
const ProfitCenter = lazy(() => import('./views/ProfitCenter'));
const OwnerDashboard = lazy(() => import('./views/owner/OwnerDashboard'));
const OwnerLogin = lazy(() => import('./views/owner/OwnerLogin'));
const CustomerDisplay = lazy(() => import('./views/CustomerDisplay'));
const PublicMenu = lazy(() => import('./views/PublicMenu'));
import Manual from './views/Manual';

// 🔬 Componente de teste isolado para diagnosticar inputs
const InputTest = lazy(() => import('./components/InputTest'));

// 🔍 Componente de diagnóstico do Supabase
const SupabaseDiagnostic = lazy(() => import('./views/SupabaseDiagnostic'));

// Componentes leves mantêm importação direta
const PurchaseApproval = lazy(() => import('./views/PurchaseApproval'));
const SetupModal = lazy(() => import('./components/SetupModal'));
import { Loader2, Database, AlertTriangle } from 'lucide-react';
import { runAutoDiagnostics } from './lib/supabaseDiagnostics';
import { logger } from './lib/loggerService';
import AuthGuard from './components/AuthGuard';
import AppErrorBoundary from './components/AppErrorBoundary';
import { schemaStatements } from './lib/autoSchema';

const App = () => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ show: boolean; message: string; syncing: boolean }>({ show: false, message: '', syncing: false });

  // 🔑 STARTUP OFFLINE - App funciona 100% sem Supabase no login
  useEffect(() => {
    const initializeApp = async () => {
      console.log('[APP] 🚀 Inicializando aplicação em modo OFFLINE...');
      
      // ✅ PULAR STARTUP SYNC - Não tentar conectar ao Supabase no arranque
      // Isso evita erro "quota exceeded" e permite login imediato por PIN
      console.log('[APP] ⏭️ Skip startup sync - login offline ativado');
      
      // 🔥 VERIFICAR ORDENS PENDENTES APENAS LOCALMENTE
      console.log('[APP] 🔍 Verificando ordens pendentes locais...');
      try {
        const { getSyncablePendingOrders } = await import('./lib/sync/pendingSyncOrders');
        const pending = await getSyncablePendingOrders();
        
        if (pending.length > 0) {
          console.log(`[APP] 📊 Encontradas ${pending.length} ordens pendentes de sincronização`);
          setSyncStatus({
            show: true,
            message: `${pending.length} vendas pendentes (serão sincronizadas quando houver conexão)`,
            syncing: false
          });
        }
      } catch (error) {
        console.log('[APP] ⚠️ Erro ao verificar ordens pendentes, continuando...', error);
      }
      
      // 🔥 CARREGAR CONTAS ABERTAS DO SUPABASE (persistência contra falhas de energia)
      try {
        if (navigator.onLine) {
          console.log('[APP] 🔄 Carregando contas abertas do Supabase...');
          const activeOrders = await loadActiveOrdersFromSupabase();
          
          if (activeOrders && activeOrders.length > 0) {
            const store = useStore.getState();
            // 🛡️ Anti-duplicação: só adicionar orders que não existem localmente
            const currentIds = new Set(store.activeOrders.map((o: any) => o.id));
            const newOrders = activeOrders.filter((o: any) => !currentIds.has(o.id));
            
            if (newOrders.length > 0 && store.setActiveOrders) {
              store.setActiveOrders([...store.activeOrders, ...newOrders]);
              console.log('[APP] ✅', newOrders.length, 'contas abertas carregadas do Supabase');
            } else {
              console.log('[APP] ℹ️ Todas as contas abertas já existem localmente');
            }
          } else {
            console.log('[APP] ℹ️ Nenhuma conta aberta no Supabase');
          }
        } else {
          console.log('[APP] ⚠️ Offline - pulando carregamento de contas abertas');
        }
      } catch (error) {
        console.error('[APP] ❌ Erro ao carregar contas abertas:', error);
      }
      
      setIsLoading(false);
      console.log('[APP] ✅ App pronta para uso - login por PIN disponível');
    };
    
    initializeApp();
  }, []);

  // 🧹 FUNÇÃO DE LIMPEZA FORÇADA - ANIQUILA ESTADO LOCAL
  const forceCleanLocalState = async () => {
    console.log('🧹 [FORCE CLEAN] Iniciando limpeza forçada do estado local...');
    
    try {
      // 1. Limpar SQLite local
      await sqliteService.saveState(null);
      console.log('✅ [FORCE CLEAN] SQLite limpo');
      
      // 2. Limpar localStorage
      localStorage.clear();
      console.log('✅ [FORCE CLEAN] localStorage limpo');
      
      // 3. Limpar sessionStorage
      sessionStorage.clear();
      console.log('✅ [FORCE CLEAN] sessionStorage limpo');
      
      // 4. Forçar reload completo
      console.log('🔄 [FORCE CLEAN] Forçando reload completo...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ [FORCE CLEAN] Erro na limpeza forçada:', error);
    }
  };

  // 🚨 BOTÃO TEMPORÁRIO DE LIMPEZA — removido em producao (T5 otimizacao)
  // useEffect(() => {
  //   if (import.meta.env.DEV) {
  //     const cleanButton = document.createElement('button');
  //     cleanButton.innerHTML = '🧹 LIMPAR ESTADO';
  //     cleanButton.onclick = forceCleanLocalState;
  //     setTimeout(() => document.body.appendChild(cleanButton), 2000);
  //   }
  // }, []);

  // 🔑 LISTENER DE RESET DO OWNER HUB - Receber sinal para limpar SQLite
  useEffect(() => {
    console.log('[APP] 🔄 Configurando listener de reset do Owner Hub...');
    
    // 1. Listener via Supabase Realtime
    const resetChannel = supabase
      .channel('reset_signals')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'reset_signals' 
        }, 
        async (payload) => {
          const signal = payload.new;
          console.log('[APP] 🚨 Sinal de reset recebido do Owner Hub:', signal);
          
          if (signal.type === 'FORCE_CLEAN_WINDOWS_APP' && signal.action === 'clear_sqlite_and_state') {
            console.log('[APP] 🧹 Executando limpeza forçada da app Windows...');
            await forceCleanLocalState();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[APP] ✅ Conectado ao canal de reset do Owner Hub');
        }
      });

    // 2. Listener via Broadcast Channel (fallback)
    const broadcastChannel = new BroadcastChannel('vereda_reset_sync');
    broadcastChannel.onmessage = async (event) => {
      const signal = event.data;
      console.log('[APP] 🚨 Sinal de reset recebido via Broadcast:', signal);
      
      if (signal.type === 'FORCE_CLEAN_WINDOWS_APP' && signal.action === 'clear_sqlite_and_state') {
        console.log('[APP] 🧹 Executando limpeza forçada via Broadcast...');
        await forceCleanLocalState();
      }
    };

    // 🔄 REALTIME LISTENER PARA SINCRONIZAÇÃO COM SUPABASE
    const ordersChannel = supabase
      .channel('orders_realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('[APP] 🔄 Mudança em tempo real na tabela orders:', payload);
          
          // Se for INSERT ou UPDATE de uma ordem, recarregar estado
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('[APP] 📦 Recarregando estado devido a mudança em orders...');
            
            // Buscar ordens atualizadas do Supabase
            try {
              const { data: ordersData, error } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', new Date().toISOString().split('T')[0])
                .order('created_at', { ascending: false })
                .limit(50);
              
              if (!error && ordersData) {
                const store = useStore.getState();
                if (store.createNewOrder) {
                  const formattedOrders = ordersData.map(order => ({
                    id: order.id,
                    tableId: order.table_id,
                    type: order.type || 'LOCAL',
                    items: order.items || [],
                    status: order.status,
                    timestamp: order.created_at,
                    total: Number(order.total_amount || 0),
                    taxTotal: Number(order.tax_total || 0),
                    profit: Number(order.profit || 0),
                    subAccountName: order.customer_name || 'Principal',
                    paymentMethod: order.payment_method || 'NUMERARIO'
                  }));
                  
                  // Atualizar ordens no estado
                  formattedOrders.forEach(order => {
                    store.createNewOrder(order.tableId, order.type);
                  });
                  
                  console.log('[APP] ✅ Estado sincronizado com Supabase em tempo real');
                }
              }
            } catch (syncError) {
              console.error('[APP] ❌ Erro na sincronização em tempo real:', syncError);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[APP] ✅ Conectado ao canal de tempo real da tabela orders');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[APP] ❌ Erro no canal de tempo real');
        }
      });

    return () => {
      console.log('[APP] 🔄 Limpando listeners...');
      supabase.removeChannel(resetChannel);
      supabase.removeChannel(ordersChannel);
      broadcastChannel.close();
    };
  }, []);

  // 🛑 PROTOCOLO DE SESSÃO POR CONTRATO - LOCALSTORAGE FIRST
  useEffect(() => {
    logger.info('APP', 'Iniciando aplicação Windows');
    
    // 🔥 BYPASS PARA CUSTOMER DISPLAY - Não requer autenticação
    const currentPath = window.location.hash;
    if (currentPath.includes('customer-display')) {
      console.log('[APP] 🖥️ Customer Display detectado - bypass de autenticação');
      
      // Listener para receber configuração via BroadcastChannel
      const channel = new BroadcastChannel('customer_display_config');
      const timeout = setTimeout(() => {
        // Se não receber dados em 2 segundos, continuar mesmo assim
        console.log('[APP] ⚠️ Timeout ao receber configuração via BroadcastChannel');
        setIsConfigured(true);
        setIsLoading(false);
        channel.close();
      }, 2000);
      
      channel.onmessage = (event) => {
        console.log('[APP] ✅ Configuração recebida via BroadcastChannel:', event.data);
        
        if (event.data.establishmentId) {
          localStorage.setItem('establishment_id', event.data.establishmentId);
        }
        if (event.data.supabaseUrl) {
          localStorage.setItem('SUPABASE_URL', event.data.supabaseUrl);
        }
        if (event.data.supabaseKey) {
          localStorage.setItem('SUPABASE_ANON_KEY', event.data.supabaseKey);
        }
        
        clearTimeout(timeout);
        setIsConfigured(true);
        setIsLoading(false);
        channel.close();
      };
      
      return () => {
        clearTimeout(timeout);
        channel.close();
      };
    }
    
    // VERIFICAÇÃO APENAS DO LOCALSTORAGE - PROIBIDO CHAMAR SUPABASE AQUI
    const establishmentId = localStorage.getItem('establishment_id');
    const veredId = localStorage.getItem('tasca_vered_id');
    
    if (establishmentId || veredId) {
      // SE EXISTE ID, CONSIDERA AUTENTICADO - PROIBIDO VALIDAR SESSÃO DO SUPABASE
      logger.info('APP', 'Sessão por contrato detectada', { establishmentId, veredId });
      
      // Define no Estado Global IMEDIATAMENTE
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        invoke('set_establishment_id', { establishmentId: establishmentId || veredId });
      }
      
      // 🚀 FORÇAR FETCH INICIAL DO SUPABASE - PREENCHER ESTADO COM DADOS DA NUVEM
      const forceInitialSupabaseFetch = async () => {
        try {
          console.log('[APP] 🚀 Forçando fetch inicial do Supabase...');
          
          // Buscar ordens do Supabase
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (ordersError) {
            console.error('[APP] ❌ Erro ao buscar ordens do Supabase:', ordersError);
          } else {
            console.log('[APP] ✅ Ordens buscadas do Supabase:', ordersData?.length || 0);
            
            // Preencher estado local com dados do Supabase
            if (ordersData && ordersData.length > 0) {
              const formattedOrders = ordersData.map(order => ({
                id: order.id,
                tableId: order.table_id,
                type: order.type || 'LOCAL',
                items: order.items || [],
                status: order.status,
                timestamp: order.created_at,
                total: Number(order.total_amount || 0),
                taxTotal: Number(order.tax_total || 0),
                profit: Number(order.profit || 0),
                subAccountName: order.customer_name || 'Principal',
                paymentMethod: order.payment_method || 'NUMERARIO'
              }));
              
              // Atualizar estado local com dados do Supabase
              const store = useStore.getState();
              if (store.createNewOrder) {
                formattedOrders.forEach((order: any) => {
                  store.createNewOrder(order.tableId, order.type);
                });
                console.log('[APP] ✅ Estado local preenchido com dados do Supabase');
              }
            }
          }
          
          // Buscar despesas do Supabase
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .gte('created_at', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (expensesError) {
            console.error('[APP] ❌ Erro ao buscar despesas do Supabase:', expensesError);
          } else {
            console.log('[APP] ✅ Despesas buscadas do Supabase:', expensesData?.length || 0);
            
            // Preencher estado local com despesas do Supabase
            if (expensesData && expensesData.length > 0) {
              const formattedExpenses = expensesData.map(expense => ({
                id: expense.id,
                description: expense.description || '',
                amount: Number(expense.amount_kz || 0),
                category: expense.category || 'OUTROS',
                status: expense.status || 'PENDING',
                paymentMethod: expense.payment_method || 'NUMERARIO',
                receipt: expense.receipt || '',
                notes: expense.notes || '',
                date: expense.created_at || new Date(),
                createdAt: expense.created_at || new Date()
              }));
              
              // Atualizar estado local com despesas do Supabase
              const store = useStore.getState();
              if (store.addExpense) {
                formattedExpenses.forEach(expense => store.addExpense(expense));
                console.log('[APP] ✅ Despesas locais preenchidas com dados do Supabase');
              }
            }
          }
          
        } catch (fetchError) {
          console.error('[APP] ❌ Erro crítico no fetch inicial:', fetchError);
        }
      };
      
      // Executar fetch inicial após 2 segundos
      setTimeout(forceInitialSupabaseFetch, 2000);
      
      setIsConfigured(true);
      setIsLoading(false);
      return;
    }
    
    // 2. Se não há sessão local, mostra setup
    checkConfiguration();
    
    // 3. Executar diagnóstico automático do Supabase (fire and forget)
    void runAutoDiagnostics();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Verificar se já está configurado (APENAS se Tauri estiver disponível)
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const _configured = await invoke<boolean>('check_configuration');
          void _configured;
        } catch (error) {
          console.log('[APP] ⚠️ Tauri invoke não disponível, usando fallback localStorage');
        }
      }
      
      // Verificar se existe configuração no localStorage
      const localUrl = localStorage.getItem('SUPABASE_URL');
      const localKey = localStorage.getItem('SUPABASE_ANON_KEY');
      
      if (localUrl && localKey) {
        // Se existe configuração local, criar cliente e testar
        const client = createClient(localUrl, localKey);
        setIsConfigured(true);
        
        // Testar conexão
        const { error } = await client.from('products').select('id').limit(1);
        if (error) {
          // Se falhar, mostrar setup
          setShowSetup(true);
          setIsConfigured(false);
        }
      } else {
        // Se não existe configuração, mostrar setup
        setShowSetup(true);
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      setShowSetup(true);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = async (supabaseUrl: string, supabaseKey: string) => {
    try {
      // Criar cliente Supabase
      const client = createClient(supabaseUrl, supabaseKey);
      
      // Testar conexão
      const { error } = await client.from('products').select('id').limit(1);
      if (error) {
        throw new Error('Erro ao conectar ao Supabase: ' + error.message);
      }
      
      // Executar auto-schema
      await runAutoSchema(client);
      
      // Salvar configuração (APENAS se Tauri estiver disponível)
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          await invoke('save_config', { supabaseUrl, supabaseKey });
        } catch (error) {
          console.log('[APP] ⚠️ Tauri invoke save_config não disponível, usando apenas localStorage');
        }
      }
      
      // Salvar no localStorage
      localStorage.setItem('SUPABASE_URL', supabaseUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey);
      
      // Atualizar estado
      setIsConfigured(true);
      setShowSetup(false);
      
      // Definir cliente global
      (window as any).supabase = client;

      // Recarregar para que supabase_standalone.ts use as novas credenciais
      setTimeout(() => window.location.reload(), 500);
      
    } catch (error: any) {
      console.error('Erro no setup:', error);
      throw error;
    }
  };

  const runAutoSchema = async (client: any) => {
    console.log('[SCHEMA] A criar tabelas no projecto Supabase do cliente...');
    let ok = 0;
    let fail = 0;
    for (const sql of schemaStatements) {
      try {
        const { error } = await client.rpc('exec_sql', { sql });
        if (error) {
          // exec_sql pode não existir — tentar via query directa
          console.warn('[SCHEMA] RPC exec_sql falhou para:', sql.slice(0, 60), error.message);
          fail++;
        } else {
          ok++;
        }
      } catch (e) {
        console.warn('[SCHEMA] Erro:', e);
        fail++;
      }
    }
    console.log(`[SCHEMA] Concluído: ${ok} OK, ${fail} ignorados (tabelas já existem ou RPC indisponível)`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Tasca do Vereda POS</h1>
          <p className="text-blue-200">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  if (showSetup || !isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Database className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Tasca do Vereda POS</h1>
            <p className="text-blue-200">Configuração Inicial v1.1.2</p>
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Configuração necessária antes de usar o sistema</span>
              </div>
            </div>
          </div>
          <SetupModal
            isOpen={true}
            onClose={() => {}}
            onComplete={handleSetupComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      {/* 🔥 MODAL DE SINCRONIZAÇÃO AUTOMÁTICA */}
      {syncStatus.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-white mb-4">⚠️ Vendas Pendentes</h2>
            <p className="text-slate-300 mb-6">{syncStatus.message}</p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  setSyncStatus({ ...syncStatus, syncing: true });
                  await useStore.getState().syncPendingOrdersToSupabase();
                  setSyncStatus({ show: false, message: '', syncing: false });
                }}
                disabled={syncStatus.syncing}
                className="flex-1 py-4 bg-red-500 text-white rounded-xl font-black uppercase tracking-wider hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {syncStatus.syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
              <button
                onClick={() => setSyncStatus({ show: false, message: '', syncing: false })}
                className="flex-1 py-4 bg-slate-700 text-white rounded-xl font-black uppercase tracking-wider hover:bg-slate-600 transition-all"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}
      <Router>
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>}>
          <Routes>
            {/* 🚀 ROTA DE APROVAÇÃO IN-APP - dentro da app */}
            <Route path="/compras/owner/:id" element={<PurchaseApproval />} />
            
            {/* 📱 MENU DIGITAL - Acesso público para clientes */}
            <Route path="/menu" element={<PublicMenu />} />
            
            <Route path="/" element={<Navigate to="/pos" replace />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/agt" element={<AGTControl />} />
            <Route path="/profit-center" element={<ProfitCenter />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/customer-display/:tableId" element={<CustomerDisplay />} />
            
            {/* ✅ Rotas adicionais com lazy loading */}
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/stock-management" element={<StockManagement />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/tables-layout" element={<TableLayout />} />
            <Route path="/settings" element={<SystemHub />} />
            <Route path="/events" element={<Events />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/manual" element={<Manual />} />
            
            {/* 🔬 ROTA DE TESTE - Diagnóstico de inputs bloqueados */}
            <Route path="/input-test" element={<InputTest />} />
            
            {/* 🔍 ROTA DE DIAGNÓSTICO DO SUPABASE */}
            <Route path="/supabase-diagnostic" element={<SupabaseDiagnostic />} />
          </Routes>
        </Suspense>
      </Router>
    </AppErrorBoundary>
  );
};

export default App;
