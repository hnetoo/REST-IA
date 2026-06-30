import { useState, lazy, Suspense } from 'react';
import { Boxes, LayoutDashboard, ArrowLeftRight, ShoppingCart, ClipboardList, Truck, FileBarChart, AlertTriangle, PackageSearch } from 'lucide-react';

const StockDashboard = lazy(() => import('./StockDashboard'));
const StockMovements = lazy(() => import('./StockMovements'));
const StockPurchases = lazy(() => import('./StockPurchases'));
const StockInventory = lazy(() => import('./StockInventory'));
const StockSuppliers = lazy(() => import('./StockSuppliers'));
const StockReports = lazy(() => import('./StockReports'));
const StockDamaged = lazy(() => import('./StockDamaged'));
const StockManage = lazy(() => import('./StockManage'));

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'manage', label: 'Gerir Stock', icon: PackageSearch },
  { id: 'movements', label: 'Movimentos', icon: ArrowLeftRight },
  { id: 'purchases', label: 'Compras', icon: ShoppingCart },
  { id: 'damaged', label: 'Danificados', icon: AlertTriangle },
  { id: 'inventory', label: 'Inventário', icon: ClipboardList },
  { id: 'suppliers', label: 'Fornecedores', icon: Truck },
  { id: 'reports', label: 'Relatórios', icon: FileBarChart },
] as const;

const StockManagement = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full overflow-y-auto bg-background text-slate-200">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase flex items-center gap-3">
            <Boxes size={32} className="text-primary" />
            Gestão de Stock
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Stock Avançado • Inventário • Compras</p>
        </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-black shadow-glow'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
        {activeTab === 'dashboard' && <StockDashboard />}
        {activeTab === 'manage' && <StockManage />}
        {activeTab === 'movements' && <StockMovements />}
        {activeTab === 'purchases' && <StockPurchases />}
        {activeTab === 'damaged' && <StockDamaged />}
        {activeTab === 'inventory' && <StockInventory />}
        {activeTab === 'suppliers' && <StockSuppliers />}
        {activeTab === 'reports' && <StockReports />}
      </Suspense>
    </div>
  );
};

export default StockManagement;
