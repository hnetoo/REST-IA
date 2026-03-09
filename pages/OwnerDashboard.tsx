
import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  TrendingUp, Users, DollarSign, Wallet, Package, 
  Target, BarChart3, ArrowUpRight, ArrowDownRight,
  PieChart as PieIcon, Activity, Sparkles, LayoutGrid
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const OwnerDashboard = () => {
  const { activeOrders, menu, employees, settings } = useStore();

  const closedOrders = useMemo(() => activeOrders.filter(o => o.status === 'FECHADO'), [activeOrders]);

  const metrics = useMemo(() => {
    const totalRevenue = closedOrders.reduce((a, b) => a + b.total, 0);
    const totalProfit = closedOrders.reduce((a, b) => a + b.profit, 0);
    const avgTicket = closedOrders.length > 0 ? totalRevenue / closedOrders.length : 0;
    const laborCost = employees.reduce((a, b) => a + b.salary, 0);
    return { totalRevenue, totalProfit, avgTicket, laborCost };
  }, [closedOrders, employees]);

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    closedOrders.flatMap(o => o.items).forEach(i => {
      counts[i.dishId] = (counts[i.dishId] || 0) + i.quantity;
    });
    return Object.entries(counts)
      .map(([id, qty]) => ({
        name: menu.find(m => m.id === id)?.name || 'Desconhecido',
        qty
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [closedOrders, menu]);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-slate-950">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <Target size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Proprietário • Painel Estratégico</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Owner Hub</h2>
        </div>
        <div className="flex gap-3">
          <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado de Caixa</span>
             <span className="text-emerald-500 font-black text-sm uppercase">Equilibrado</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Faturação Total', value: formatKz(metrics.totalRevenue), icon: DollarSign, color: 'emerald' },
          { label: 'Lucro Líquido Real', value: formatKz(metrics.totalProfit), icon: TrendingUp, color: 'primary' },
          { label: 'Ticket Médio', value: formatKz(metrics.avgTicket), icon: Wallet, color: 'blue' },
          { label: 'Custos Fixos (Staff)', value: formatKz(metrics.laborCost), icon: Users, color: 'red' }
        ].map((card, i) => (
          <div key={i} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
             <div className={`absolute -top-4 -right-4 w-24 h-24 bg-${card.color}-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform`}></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{card.label}</p>
             <h3 className="text-2xl font-mono font-bold text-white">{card.value}</h3>
             <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                <ArrowUpRight size={14} /> +12.5% vs mês anterior
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] border-white/5">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                <BarChart3 className="text-primary" /> Performance de Vendas
              </h3>
           </div>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Seg', v: 4000 }, { name: 'Ter', v: 3000 }, { name: 'Qua', v: 2000 }, 
                  { name: 'Qui', v: 2780 }, { name: 'Sex', v: 1890 }, { name: 'Sáb', v: 2390 }, { name: 'Dom', v: 3490 }
                ]}>
                   <defs>
                     <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                   <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff'}} />
                   <Area type="monotone" dataKey="v" stroke="#06b6d4" fillOpacity={1} fill="url(#colorV)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="glass-panel p-10 rounded-[3rem] border-white/5 flex flex-col">
           <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
             <Sparkles className="text-yellow-500" /> Top 5 Mais Vendidos
           </h3>
           <div className="flex-1 space-y-6">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">0{i+1}</div>
                      <span className="text-sm font-bold text-white uppercase truncate w-32">{p.name}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-primary font-mono font-bold text-sm">{p.qty}</span>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Unidades</p>
                   </div>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-center text-slate-600 py-10 italic">Aguardando faturas...</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
