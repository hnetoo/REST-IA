import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { usePendingSyncOrders } from './src/hooks/usePendingSyncOrders';
import Sidebar from './src/components/Sidebar';
import Login from './src/views/Login';
import OwnerLogin from './src/views/owner/OwnerLogin';
import OwnerDashboard from './src/views/owner/OwnerDashboard';
import ApprovePurchase from './src/views/ApprovePurchase';
import Manual from './src/views/Manual';
import { X, Loader2 } from 'lucide-react';
import { useStore } from './src/store/useStore';
import { loadAndMergeActiveOrders } from './src/store/useStore';
import { checkAndRestoreActiveOrders, startAutoBackup } from './src/lib/sync/activeOrdersBackup';

// � LAZY LOADING para rotas pesadas - PERFORMANCE
const DashboardV2 = lazy(() => import('./src/views/DashboardV2'));
const POS = lazy(() => import('./src/views/POS'));
const PrinterConfig = lazy(() => import('./src/views/PrinterConfig'));
const AGTControl = lazy(() => import('./src/views/AGTControl'));
const CertificationDashboard = lazy(() => import('./src/views/CertificationDashboard'));
const ComplianceReports = lazy(() => import('./src/views/ComplianceReports'));
const ProfitCenter = lazy(() => import('./src/views/ProfitCenter'));
const TableLayout = lazy(() => import('./src/views/TableLayout'));
const Inventory = lazy(() => import('./src/views/Inventory'));
const Purchases = lazy(() => import('./src/views/Purchases'));
const PurchaseApproval = lazy(() => import('./src/views/PurchaseApproval'));
const Finance = lazy(() => import('./src/views/Finance'));
const Analytics = lazy(() => import('./src/views/Analytics'));
const Reports = lazy(() => import('./src/views/Reports'));
const Employees = lazy(() => import('./src/views/Employees'));
const SystemHub = lazy(() => import('./src/views/SystemHub'));
const PublicMenu = lazy(() => import('./src/views/PublicMenu'));
const CustomerDisplay = lazy(() => import('./src/views/CustomerDisplay'));
const Reservations = lazy(() => import('./src/views/Reservations'));
const Events = lazy(() => import('./src/views/Events'));
const SalesControl = lazy(() => import('./src/views/SalesControl'));
const StockManagement = lazy(() => import('./src/views/StockManagement'));

// �🔥 LIMPEZA DE EMERGÊNCIA - localStorage bloqueado (QuotaExceededError)
(function cleanupBloatedStorage() {
  try {
    const veredaStore = localStorage.getItem('vereda-store');
    if (veredaStore && veredaStore.length > 4_000_000) { // > 4MB = muito grande
      console.warn('[APP BOOT] 🚨 vereda-store muito grande:', (veredaStore.length / 1024 / 1024).toFixed(2), 'MB - limpando...');
      localStorage.removeItem('vereda-store');
      console.log('[APP BOOT] ✅ vereda-store limpo');
    }
    // Limpar restore points que também causam quota exceeded
    const restorePoints = localStorage.getItem('tasca_restore_points');
    if (restorePoints) {
      localStorage.removeItem('tasca_restore_points');
      console.log('[APP BOOT] ✅ tasca_restore_points limpo');
    }
    // Limpar logs antigos
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('log-') || key.includes('debug-') || key.includes('trace-'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('[APP BOOT] ❌ Erro na limpeza de storage:', e);
  }
})();

// Log de boot da aplicação
console.log('🚀 [APP BOOT] Tasca do Vereda iniciando...');
console.log('🔧 [APP BOOT] Ambiente:', typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ ? 'Tauri/Windows' : 'Web/Browser');
console.log('📡 [APP BOOT] Tentando conectar ao Supabase...');

// 🪟 LOGS DE EMERGÊNCIA - Capturar erros globais
window.addEventListener('error', (event) => {
  console.error('🪟 [EMERGENCY] JavaScript Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🪟 [EMERGENCY] Unhandled Promise Rejection:', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

console.log('🪟 [DEBUG] Emergency logging ativado');

// Atalho F12 para abrir DevTools no Windows
if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
      e.preventDefault();
      console.log('🔧 [DEVTOOLS] Abrindo Inspector via F12...');
      // Tentar abrir DevTools via API do Tauri
      (window as any).__TAURI_INTERNALS__?.invoke('show_devtools');
    }
  });
}

const GlobalNotificationCenter = () => {
  const { notifications, removeNotification } = useStore();
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl flex items-start gap-3 border backdrop-blur-md animate-in slide-in-from-right ${n.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-primary/20 border-primary/50 text-primary'}`}>
          <p className="text-xs font-black uppercase tracking-widest flex-1">{n.message}</p>
          <button 
            onClick={() => removeNotification(n.id)}
            title="Fechar notificação"
            aria-label="Fechar notificação"
          >
            <X size={14}/>
          </button>
        </div>
      ))}
    </div>
  );
};

const AppContent = () => {
  const location = useLocation();
  const isPOS = location.pathname === '/pos';
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {!isPOS && <Sidebar />}
      <main className={`flex-1 h-full overflow-hidden relative w-full ${isPOS ? '' : 'max-w-7xl mx-auto px-6'}`}>
        <Suspense fallback={<div className="flex items-center justify-center h-full bg-slate-950"><Loader2 className="animate-spin text-primary" size={32} /><span className="ml-3 text-primary font-bold">Carregando...</span></div>}>
        <Routes>
          <Route path="/" element={<DashboardV2 />} />
          <Route path="/dashboard" element={<DashboardV2 />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/printer-config" element={<PrinterConfig />} />
          <Route path="/agt" element={<AGTControl />} />
          <Route path="/agt/certification" element={<CertificationDashboard />} />
          <Route path="/agt/compliance" element={<ComplianceReports />} />
          <Route path="/profit-center" element={<ProfitCenter />} />
          <Route path="/tables-layout" element={<TableLayout />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/stock-management" element={<StockManagement />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/compras/owner/:id" element={<PurchaseApproval />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/events" element={<Events />} />
          <Route path="/sales-control" element={<SalesControl />} />
          <Route path="/settings" element={<SystemHub />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="/menu" element={<PublicMenu />} />
          <Route path="/menu/:tableId" element={<PublicMenu />} />
          <Route path="/approve-purchase/:id/:token" element={<ApprovePurchase />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App = () => {
  const { currentUser, setMenu, setCategories, setTables, setCustomers, menu, categories, tables, customers, activeOrders } = useStore();
  usePendingSyncOrders();

  // 🔑 SEMPRE carregar dados do Supabase (não persistimos mais menu/produtos/clientes no localStorage)
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      console.log('[APP] 🔄 Carregando dados do Supabase...');
      if (isMounted) {
        import('./src/lib/supabaseDataLoader').then(({ loadAllFromSupabase }) => {
          if (isMounted) {
            loadAllFromSupabase({ setMenu, setCategories, setTables, setCustomers }).catch(console.warn);
          }
        });
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);
  
  // 🔥 REALTIME SYNC DESATIVADO - Estava causando perda de dados locais
  // useEffect(() => {
  //   if (currentUser?.id) {
  //     const store = useStore.getState();
  //     const realtimeService = getRealtimeService(store);
  //     realtimeService.startAllSubscriptions();
  //     
  //     return () => {
  //       stopRealtimeService();
  //     };
  //   }
  // }, [currentUser?.id]);
  
  // 🔥 REGISTRAR SERVICE WORKER PARA PWA
  useEffect(() => {
    let isMounted = true;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (isMounted) {
            console.log('[PWA] Service Worker registrado:', registration.scope);
          }
        })
        .catch((error) => {
          if (isMounted) {
            console.error('[PWA] Erro ao registrar Service Worker:', error);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // 🔥 CARREGAR ORDENS ATIVAS DO SUPABASE/BACKUP NA INICIALIZAÇÃO
  useEffect(() => {
    let isMounted = true;

    const loadActiveOrders = async () => {
      // Verificar se temos ordens no estado atual (possivelmente do Zustand persist)
      const currentOrders = useStore.getState().activeOrders;

      if (currentOrders && currentOrders.length > 0) {
        console.log('[APP] ✅ Ordens ativas encontradas no estado:', currentOrders.length);
        // Iniciar auto-backup mesmo se já temos ordens
        startAutoBackup(() => useStore.getState().activeOrders);
        return;
      }

      console.log('[APP] 🔄 Ordens ativas vazias - tentando recuperar...');

      // Tentativa 1: Buscar do Supabase
      try {
        await loadAndMergeActiveOrders();
        if (isMounted) {
          const afterLoad = useStore.getState().activeOrders;
          if (afterLoad.length > 0) {
            console.log('[APP] ✅ Ordens recuperadas do Supabase:', afterLoad.length);
            return;
          }
        }
      } catch (err) {
        console.error('[APP] ❌ Erro ao carregar do Supabase:', err);
      }

      // Tentativa 2: Restaurar do backup local (IndexedDB)
      if (isMounted) {
        console.log('[APP] 🔄 Tentando restaurar do backup local...');
        try {
          const restored = await checkAndRestoreActiveOrders([]);
          if (restored && restored.length > 0) {
            console.log('[APP] ✅ Ordens restauradas do backup local:', restored.length);
            useStore.setState({ activeOrders: restored });

            // Atualizar status das mesas baseado nas ordens restauradas
            const currentTables = useStore.getState().tables;
            const updatedTables = currentTables.map(table => {
              const hasOpenOrder = restored.some(order => order.tableId === table.id && order.status === 'ABERTO');
              if (hasOpenOrder && table.status !== 'OCUPADO') {
                console.log(`[APP] 🪑 Mesa ${table.id} marcada como OCUPADO (backup)`);
                return { ...table, status: 'OCUPADO' as const };
              }
              return table;
            });
            useStore.setState({ tables: updatedTables });
          } else {
            console.log('[APP] ℹ️ Nenhuma ordem encontrada no backup local');
          }
        } catch (backupErr) {
          console.error('[APP] ❌ Erro ao restaurar backup:', backupErr);
        }
      }

      // Iniciar auto-backup após carregar
      if (isMounted) {
        startAutoBackup(() => useStore.getState().activeOrders);
      }
    };

    // Executar após um pequeno delay para garantir que o store está pronto
    const timeoutId = setTimeout(loadActiveOrders, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-950 font-sans overflow-hidden">
        <GlobalNotificationCenter />
        <Routes>
          {/* ZONA LIVRE: Login, Menu Público, Owner e Customer Display */}
          <Route path="/login" element={<Login />} />
          <Route path="/menu-public" element={<PublicMenu />} />
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/mobile" element={<OwnerLogin />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/customer-display/:tableId" element={<CustomerDisplay />} />

          {/* BLINDAGEM SAGRADA: Só entra quem tem sessão válida */}
          <Route path="/*" element={
            currentUser?.id ? <AppContent /> : <Navigate to="/login" replace />
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
