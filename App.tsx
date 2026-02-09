
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Kitchen from './pages/Kitchen';
import Reservations from './pages/Reservations';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import TableLayout from './pages/TableLayout';
import PublicMenu from './pages/PublicMenu';
import OwnerDashboard from './pages/OwnerDashboard';
import Employees from './pages/Employees';
import ProfitCenter from './pages/ProfitCenter';
import AGTControl from './pages/AGTControl';
import CustomerDisplay from './pages/CustomerDisplay';
// Fix: Added missing import for Settings page
import Settings from './pages/Settings';
import { X } from 'lucide-react';

const GlobalNotificationCenter = () => {
  const { notifications, removeNotification } = useStore();
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl flex items-start gap-3 border backdrop-blur-md animate-in slide-in-from-right ${n.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-primary/20 border-primary/50 text-primary'}`}>
          <p className="text-xs font-black uppercase tracking-widest flex-1">{n.message}</p>
          <button onClick={() => removeNotification(n.id)}><X size={14}/></button>
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
          {/* Rotas Públicas / Externas */}
          <Route path="/menu/:tableId" element={<PublicMenu />} />
          <Route path="/customer-display/:tableId" element={<CustomerDisplay />} />
          
          <Route path="/*" element={
            !currentUser ? <Login /> : (
              <div className="flex h-screen w-full overflow-hidden">
                <Sidebar />
                <main className="flex-1 h-full overflow-hidden relative">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/owner-hub" element={<OwnerDashboard />} />
                    <Route path="/pos" element={<POS />} />
                    <Route path="/agt" element={<AGTControl />} />
                    <Route path="/profit-center" element={<ProfitCenter />} />
                    <Route path="/tables-layout" element={<TableLayout />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/settings" element={<Settings />} />
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
