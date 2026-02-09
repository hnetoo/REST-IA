
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, UtensilsCrossed, Package, Settings, 
  Banknote, Map as MapIcon, ChevronLeft, Menu, 
  LogOut, Target, Users as UsersIcon, TrendingUp
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PermissionKey } from '../types';

const Sidebar = () => {
  const { logout, currentUser, settings, updateSettings } = useStore();
  const isCollapsed = settings.isSidebarCollapsed;

  const toggleSidebar = () => updateSettings({ isSidebarCollapsed: !isCollapsed });

  const navItems: { to: string; icon: React.ReactNode; label: string; permission?: PermissionKey }[] = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/pos", icon: <UtensilsCrossed size={20} />, label: "Terminal POS", permission: 'POS_SALES' },
    { to: "/profit-center", icon: <Target size={20} />, label: "Centro de Lucro", permission: 'FINANCE_VIEW' },
    { to: "/tables-layout", icon: <MapIcon size={20} />, label: "Mapa de Sala", permission: 'POS_SALES' },
    { to: "/inventory", icon: <Package size={20} />, label: "Menu & Stock", permission: 'STOCK_MANAGE' },
    { to: "/employees", icon: <UsersIcon size={20} />, label: "Equipa & RH", permission: 'STAFF_MANAGE' },
    { to: "/finance", icon: <Banknote size={20} />, label: "Financeiro Legal", permission: 'FINANCE_VIEW' },
    { to: "/settings", icon: <Settings size={20} />, label: "Sistema", permission: 'SYSTEM_CONFIG' },
    { to: "/owner-hub", icon: <TrendingUp size={20} />, label: "Owner Hub", permission: 'OWNER_ACCESS' },
  ];

  const filteredItems = navItems.filter(item => {
    if (!currentUser) return false;
    if (!item.permission) return true;
    return currentUser.permissions.includes(item.permission);
  });

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} h-full glass-panel flex flex-col z-20 transition-all duration-300 border-r border-white/5 bg-slate-950`}>
      <div className="p-8 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-4 min-w-0">
            {settings.appLogoUrl ? (
              <img 
                src={settings.appLogoUrl} 
                alt="Logo" 
                className="w-12 h-12 object-contain rounded-xl shrink-0 shadow-glow border border-white/10 bg-white/5 p-1" 
              />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-black font-black shadow-glow shrink-0">
                {settings.restaurantName?.charAt(0).toUpperCase() || "V"}
              </div>
            )}
            <div className="flex flex-col min-w-0">
                <span className="font-black text-white uppercase italic tracking-tighter text-base leading-tight">
                    {settings.restaurantName || "Tasca do Vereda"}
                </span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-widest opacity-60">REST IA OS v1.0.6</span>
            </div>
          </div>
        )}
        <button onClick={toggleSidebar} className="text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 ml-auto">
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
        {filteredItems.map(item => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            className={({ isActive }) => `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${isActive ? 'bg-primary text-black shadow-glow' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
          >
            <div className="shrink-0">{item.icon}</div>
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.15em] truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 bg-black/20">
        <div className="mb-4 px-5">
           <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{currentUser?.role}</span>
           </div>
           {!isCollapsed && <p className="text-[10px] font-bold text-white truncate">{currentUser?.name}</p>}
        </div>
        <button onClick={logout} className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-500/10 transition-all rounded-2xl border border-transparent hover:border-red-500/20">
          <LogOut size={20} />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
