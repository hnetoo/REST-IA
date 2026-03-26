import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { usePendingSyncOrders } from './src/hooks/usePendingSyncOrders';
import Sidebar from './src/components/Sidebar';
import Login from './src/views/Login';
import OwnerLogin from './src/views/owner/OwnerLogin';
import OwnerDashboard from './src/views/owner/OwnerDashboard';
import DashboardV2 from './src/views/DashboardV2';
import POS from './src/views/POS';
import PrinterConfig from './src/views/PrinterConfig';
import AGTControl from './src/views/AGTControl';
import ProfitCenter from './src/views/ProfitCenter';
import TableLayout from './src/views/TableLayout';
import Inventory from './src/views/Inventory';
import Purchases from './src/views/Purchases';
import PurchaseApproval from './src/views/PurchaseApproval';
import ApprovePurchase from './src/views/ApprovePurchase';
import Finance from './src/views/Finance';
import Analytics from './src/views/Analytics';
import Reports from './src/views/Reports';
import Employees from './src/views/Employees';
import SystemHub from './src/views/SystemHub';
import PublicMenu from './src/views/PublicMenu';
import CustomerDisplay from './src/views/CustomerDisplay';
import Settings from './src/views/Settings';
import { X } from 'lucide-react';
import { useStore } from './src/store/useStore';

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

const App = () => {
  const { currentUser, setMenu, setCategories, setTables, setCustomers } = useStore();
  usePendingSyncOrders();

  useEffect(() => {
    import('./src/lib/supabaseDataLoader').then(({ loadAllFromSupabase }) => {
      loadAllFromSupabase({ setMenu, setCategories, setTables, setCustomers }).catch(console.warn);
    });
  }, [setMenu, setCategories, setTables, setCustomers]);

  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-950 font-sans overflow-hidden">
        <GlobalNotificationCenter />
        <Routes>
          {/* ZONA LIVRE: Login, Menu Público e Owner */}
          <Route path="/login" element={<Login />} />
          <Route path="/menu-public" element={<PublicMenu />} />
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/mobile" element={<OwnerLogin />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />

          {/* BLINDAGEM SAGRADA: Só entra quem tem sessão válida */}
          <Route path="/*" element={
            currentUser?.id ? (
              <div className="flex h-screen w-full overflow-hidden">
                <Sidebar />
                <main className="flex-1 h-full overflow-hidden relative max-w-7xl mx-auto px-6 w-full">
                  <Routes>
                    <Route path="/" element={<DashboardV2 />} />
                    <Route path="/dashboard" element={<DashboardV2 />} />
                    <Route path="/pos" element={<POS />} />
                    <Route path="/printer-config" element={<PrinterConfig />} />
                    <Route path="/agt" element={<AGTControl />} />
                    <Route path="/profit-center" element={<ProfitCenter />} />
                    <Route path="/tables-layout" element={<TableLayout />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/compras" element={<Purchases />} />
                    <Route path="/compras/owner/:id" element={<PurchaseApproval />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/settings" element={<SystemHub />} />
                    <Route path="/menu" element={<PublicMenu />} />
                    <Route path="/menu/:tableId" element={<PublicMenu />} />
                    <Route path="/customer-display/:tableId" element={<CustomerDisplay />} />
                    <Route path="/approve-purchase/:id/:token" element={<ApprovePurchase />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
