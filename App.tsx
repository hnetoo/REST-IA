import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './src/store/useStore';
import Sidebar from './src/components/Sidebar';
import Login from './src/views/Login';
import Dashboard from './src/views/Dashboard';
import POS from './src/views/POS';
import Inventory from './src/views/Inventory';
import Finance from './src/views/Finance';
import TableLayout from './src/views/TableLayout';
import Purchases from './src/views/Purchases';
import PurchaseApproval from './src/views/PurchaseApproval';
import PublicMenu from './src/views/PublicMenu';
import OwnerDashboard from './src/views/OwnerDashboard';
import OwnerLogin from './src/views/OwnerLogin';
import Employees from './src/views/Employees';
import ProfitCenter from './src/views/ProfitCenter';
import AGTControl from './src/views/AGTControl';
import CustomerDisplay from './src/views/CustomerDisplay';
import Settings from './src/views/Settings';
import SystemHub from './src/views/SystemHub';
import Analytics from './src/views/Analytics';
import Reports from './src/views/Reports';
import { X } from 'lucide-react';

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
  const { currentUser } = useStore();

  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-950 font-sans overflow-hidden">
        <GlobalNotificationCenter />
        <Routes>
          {/* OWNER - ROTAS INDEPENDENTES NO NÍVEL MAIS ALTO */}
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          
          {/* Rotas Públicas / Externas */}
          <Route path="/menu/:tableId" element={<PublicMenu />} />
          <Route path="/customer-display/:tableId" element={<CustomerDisplay />} />
          
          {/* SISTEMA PRINCIPAL - com Sidebar e Layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            !currentUser ? <Login /> : (
              <div className="flex h-screen w-full overflow-hidden">
                <Sidebar />
                <main className="flex-1 h-full overflow-hidden relative">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/pos" element={<POS />} />
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
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            )
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
