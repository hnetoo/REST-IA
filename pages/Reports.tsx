
import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { generateSAFT, downloadSAFT } from '../services/saftService';
import { 
  FileDown, Activity, Calendar, Filter, Loader2, ShieldCheck, TrendingUp, DollarSign
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const Reports = () => {
  const { activeOrders, menu, settings, customers, addNotification } = useStore();
  const [saftLoading, setSaftLoading] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const closedOrders = useMemo(() => {
    return activeOrders.filter(o => {
      const d = new Date(o.timestamp);
      return o.status === 'FECHADO' && 
             d.getMonth() === selectedMonth && 
             d.getFullYear() === selectedYear;
    });
  }, [activeOrders, selectedMonth, selectedYear]);

  const metrics = useMemo(() => {
    const totalRevenue = closedOrders.reduce((a, b) => a + b.total, 0);
    const totalProfit = closedOrders.reduce((a, b) => a + b.profit, 0);
    const totalTax = closedOrders.reduce((a, b) => a + b.taxTotal, 0);
    return { totalRevenue, totalProfit, totalTax };
  }, [closedOrders]);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

  const dailySalesData = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data = [];
    for (let i = 1; i <= lastDay; i++) {
      const ordersOfDay = closedOrders.filter(o => new Date(o.timestamp).getDate() === i);
      const dayTotal = ordersOfDay.reduce((acc, o) => acc + o.total, 0);
      const dayProfit = ordersOfDay.reduce((acc, o) => acc + o.profit, 0);
      data.push({ name: `${i}`, faturacao: dayTotal, lucro: dayProfit });
    }
    return data;
  }, [closedOrders, selectedMonth, selectedYear]);

  const handleGenerateSAFT = async () => {
    setSaftLoading(true);
    try {
      if (closedOrders.length === 0) {
        addNotification('warning', 'Sem faturamento no período selecionado para gerar o SAF-T.');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const xml = generateSAFT(activeOrders, customers, menu, settings, { 
        month: selectedMonth, 
        year: selectedYear 
      });
      
      const filename = `SAFT_AO_${settings.nif}_${selectedYear}_${(selectedMonth + 1).toString().padStart(2, '0')}.xml`;
      downloadSAFT(xml, filename);
      
      addNotification('success', 'Ficheiro SAF-T exportado com sucesso (v1.01).');
    } catch (e) {
      console.error(e);
      addNotification('error', 'Falha ao processar ficheiro SAF-T.');
    } finally {
      setSaftLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background text-slate-200">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
             <Activity size={18} className="animate-pulse" />
             <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase">Módulo de Auditoria Analítica</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Relatórios Fiscais</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
             <Filter size={14} className="text-slate-500 ml-2" />
             <select 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
               className="bg-transparent text-[10px] font-black uppercase text-slate-300 outline-none p-2 cursor-pointer"
             >
               {Array.from({ length: 12 }).map((_, i) => (
                 <option key={i} value={i} className="bg-slate-900">
                    {new Intl.DateTimeFormat('pt-AO', { month: 'long' }).format(new Date(2025, i))}
                 </option>
               ))}
             </select>
             <select 
               value={selectedYear} 
               onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
               className="bg-transparent text-[10px] font-black uppercase text-slate-300 outline-none p-2 cursor-pointer"
             >
               {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
             </select>
          </div>

          <button 
            onClick={handleGenerateSAFT} 
            disabled={saftLoading} 
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {saftLoading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} className="text-primary" />}
            Exportar SAF-T AO
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div className="glass-panel p-6 rounded-[2rem] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Faturação Bruta</p>
            <p className="text-2xl font-mono font-bold text-white">{formatKz(metrics.totalRevenue)}</p>
         </div>
         <div className="glass-panel p-6 rounded-[2rem] border border-primary/20 bg-primary/5">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Lucro Líquido Real</p>
            <p className="text-2xl font-mono font-bold text-white text-glow">{formatKz(metrics.totalProfit)}</p>
         </div>
         <div className="glass-panel p-6 rounded-[2rem] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">IVA Liquidado</p>
            <p className="text-2xl font-mono font-bold text-orange-500">{formatKz(metrics.totalTax)}</p>
         </div>
         <div className="glass-panel p-6 rounded-[2rem] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Margem do Período</p>
            <p className="text-2xl font-mono font-bold text-emerald-500">
               {metrics.totalRevenue > 0 ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1) : '0'}%
            </p>
         </div>
      </div>

      <div className="glass-panel rounded-[3rem] p-8 border-white/5 min-h-[400px]">
         <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                Análise de Performance Diária
            </h3>
         </div>
         
         <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="colorFaturacao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10}} 
                    tickFormatter={(val) => `${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', color: '#fff'}} 
                    itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                    formatter={(val: number) => [formatKz(val), '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="faturacao" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorFaturacao)" 
                    name="Faturação"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lucro" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorLucro)" 
                    name="Lucro Real"
                  />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default Reports;
