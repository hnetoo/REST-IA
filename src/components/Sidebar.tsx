
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, UtensilsCrossed, Package, Settings, 
  Banknote, Map as MapIcon, ChevronLeft, Menu, 
  LogOut, Target, Bell, ShoppingCart, BarChart3, FileText, RefreshCw,
  Calendar, PartyPopper, BookOpen, ShoppingBag, Boxes, ChevronRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PermissionKey } from '../../types';
import appLogo from '/logo.png';

interface NavGroup {
  label: string;
  items: { to: string; icon: React.ReactNode; label: string; permission?: PermissionKey; color: string; dot: string }[];
}

const Sidebar = () => {
  const { logout, currentUser, settings, updateSettings, notifications } = useStore();
  const isCollapsed = settings.isSidebarCollapsed;
  const notificationCount = notifications.length;
  const [refreshing, setRefreshing] = useState(false);

  const toggleSidebar = () => updateSettings({ isSidebarCollapsed: !isCollapsed });

  const refreshDashboard = async () => {
    setRefreshing(true);
    try {
      const { loadExpenses, loadEmployees } = useStore.getState();
      await Promise.allSettled([loadExpenses(), loadEmployees()]);
      useStore.getState().addNotification('success', 'Dados atualizados com sucesso!');
    } catch (error) {
      useStore.getState().addNotification('error', 'Erro ao atualizar dados');
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Operações',
      items: [
        { to: '/',              icon: <LayoutDashboard size={16} />, label: 'Dashboard',            color: 'from-cyan-500 to-cyan-600',     dot: 'bg-cyan-500' },
        { to: '/pos',           icon: <UtensilsCrossed size={16} />, label: 'Terminal POS',          permission: 'POS_SALES',               color: 'from-orange-500 to-orange-600', dot: 'bg-orange-500' },
        { to: '/tables-layout', icon: <MapIcon size={16} />,         label: 'Mapa de Sala',          permission: 'POS_SALES',               color: 'from-purple-500 to-purple-600', dot: 'bg-purple-500' },
        { to: '/reservations',  icon: <Calendar size={16} />,        label: 'Reservas',              permission: 'POS_SALES',               color: 'from-blue-500 to-blue-600',     dot: 'bg-blue-500' },
        { to: '/events',        icon: <PartyPopper size={16} />,     label: 'Eventos',               permission: 'FINANCE_VIEW',            color: 'from-pink-500 to-pink-600',     dot: 'bg-pink-500' },
      ]
    },
    {
      label: 'Stock & Compras',
      items: [
        { to: '/inventory',        icon: <Package size={16} />,     label: 'Produtos',         permission: 'STOCK_MANAGE', color: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-500' },
        { to: '/stock-management', icon: <Boxes size={16} />,       label: 'Gestão de Stock',  permission: 'STOCK_MANAGE', color: 'from-teal-500 to-teal-600',       dot: 'bg-teal-500' },
        { to: '/compras',          icon: <ShoppingCart size={16} />, label: 'Compras',          permission: 'STOCK_MANAGE', color: 'from-lime-500 to-lime-600',       dot: 'bg-lime-500' },
      ]
    },
    {
      label: 'Financeiro',
      items: [
        { to: '/profit-center', icon: <Target size={16} />,      label: 'Centro de Lucro',  permission: 'FINANCE_VIEW', color: 'from-yellow-500 to-yellow-600', dot: 'bg-yellow-500' },
        { to: '/finance',       icon: <Banknote size={16} />,    label: 'Financeiro Legal', permission: 'FINANCE_VIEW', color: 'from-green-500 to-green-600',   dot: 'bg-green-500' },
        { to: '/sales-control', icon: <ShoppingBag size={16} />, label: 'Vendas',           permission: 'FINANCE_VIEW', color: 'from-indigo-500 to-indigo-600', dot: 'bg-indigo-500' },
        { to: '/analytics',     icon: <BarChart3 size={16} />,   label: 'Analytics',        permission: 'FINANCE_VIEW', color: 'from-violet-500 to-violet-600', dot: 'bg-violet-500' },
        { to: '/reports',       icon: <FileText size={16} />,    label: 'Relatórios',       permission: 'FINANCE_VIEW', color: 'from-rose-500 to-rose-600',     dot: 'bg-rose-500' },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { to: '/manual',   icon: <BookOpen size={16} />,  label: 'Manual',  color: 'from-slate-400 to-slate-500', dot: 'bg-slate-400' },
        { to: '/settings', icon: <Settings size={16} />,  label: 'Sistema', permission: 'SYSTEM_CONFIG', color: 'from-red-500 to-red-600', dot: 'bg-red-500' },
      ]
    }
  ];

  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!currentUser) return false;
      if (!item.permission) return true;
      return currentUser.permissions.includes(item.permission);
    })
  })).filter(group => group.items.length > 0);

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const roleColors: Record<string, string> = {
    ADMIN: 'from-red-500 to-orange-500',
    MANAGER: 'from-purple-500 to-blue-500',
    WAITER: 'from-cyan-500 to-teal-500',
    CASHIER: 'from-green-500 to-emerald-500',
  };
  const avatarGradient = roleColors[currentUser?.role ?? ''] ?? 'from-slate-500 to-slate-600';

  return (
    <aside className={`
      ${isCollapsed ? 'w-[68px]' : 'w-[220px]'}
      h-screen flex flex-col z-20 transition-all duration-300 ease-in-out
      border-r border-white/[0.06]
      bg-[#080c15]/95 backdrop-blur-2xl
      overflow-hidden shrink-0
    `}>

      {/* ── Header ── */}
      <div className={`px-3 pt-4 pb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <img
                src={appLogo}
                alt="Logo"
                className="w-8 h-8 object-contain rounded-xl border border-white/10 bg-white/5 p-0.5"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#080c15]"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-white uppercase italic tracking-tighter text-[13px] leading-tight truncate">
                {settings.restaurantName || 'Tasca do Vereda'}
              </span>
              <span className="text-[9px] font-bold text-[#06b6d4] uppercase tracking-[0.15em] opacity-70">
                REST IA OS
              </span>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-1 ${isCollapsed ? '' : 'shrink-0'}`}>
          {/* Notificações */}
          {notificationCount > 0 && (
            <div className="relative">
              <div className="w-5 h-5 rounded-full bg-[#06b6d4]/20 border border-[#06b6d4]/40 flex items-center justify-center">
                <Bell size={10} className="text-[#06b6d4]" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[7px] font-black text-white flex items-center justify-center leading-none">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={refreshDashboard}
            title="Atualizar dados"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/8 transition-all"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#06b6d4]' : ''} />
          </button>

          {/* Colapsar */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/8 transition-all"
          >
            {isCollapsed
              ? <ChevronRight size={13} />
              : <ChevronLeft size={13} />
            }
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-2" />

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 overflow-y-auto no-scrollbar space-y-4 pb-2">
        {filteredGroups.map(group => (
          <div key={group.label}>
            {/* Group label */}
            {!isCollapsed && (
              <p className="px-2 mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600 select-none">
                {group.label}
              </p>
            )}
            {isCollapsed && (
              <div className="mx-auto w-4 h-px bg-white/8 mb-1" />
            )}

            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-xl transition-all duration-150 select-none
                    ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'}
                    ${isActive
                      ? 'bg-white/[0.07] text-white'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active left bar */}
                      {isActive && !isCollapsed && (
                        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-gradient-to-b ${item.color}`} />
                      )}

                      {/* Icon with gradient bg when active */}
                      <div className={`
                        shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150
                        ${isActive
                          ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                          : 'text-slate-500 group-hover:text-slate-200 group-hover:bg-white/5'
                        }
                      `}>
                        {item.icon}
                      </div>

                      {/* Label */}
                      {!isCollapsed && (
                        <span className="text-[11px] font-bold tracking-wide leading-tight truncate flex-1">
                          {item.label}
                        </span>
                      )}

                      {/* Active dot (collapsed) */}
                      {isActive && isCollapsed && (
                        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${item.dot}`} />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* ── Footer / User ── */}
      <div className={`p-2 ${isCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {/* User card */}
        <div className={`
          flex items-center gap-2.5 rounded-xl p-2 mb-1
          ${isCollapsed ? 'justify-center' : ''}
          bg-white/[0.03] border border-white/5
        `}>
          {/* Avatar */}
          <div className={`shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-[10px] font-black`}>
            {userInitials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">{currentUser?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{currentUser?.role}</span>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sair"
          className={`
            w-full flex items-center gap-2 rounded-xl px-2 py-2 transition-all
            text-slate-600 hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/15
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={14} className="shrink-0" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

