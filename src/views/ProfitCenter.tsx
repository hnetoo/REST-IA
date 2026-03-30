
import React, { useMemo, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { printFinanceReport } from '../lib/printService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Target, TrendingUp, DollarSign, Zap, Sparkles, 
  PieChart as PieIcon, BarChart3, ArrowUpRight, 
  Activity, Layers, ShoppingBag, CreditCard,
  Rocket, Brain, Printer
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import { useSyncCore } from '../hooks/useSyncCore';
import { supabase } from '../supabase_standalone';

// Extender jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
}

const formatKz = (val: number) => 
  new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 0 
  }).format(val);

const ProfitCenter = () => {
  const { activeOrders, menu, settings, addNotification, expenses, employees, loadExpenses, loadEmployees } = useStore();
  const [realtimeOrders, setRealtimeOrders] = useState<any[]>([]);
  
  // 🔑 SYNC CORE - Usar valor calculado do motor de sincronização
  const { totalRevenue: syncCoreRevenue, topMarginProducts: syncCoreTopMargins } = useSyncCore();

  useEffect(() => {
    if (!navigator.onLine) return;
    
    // Buscar dados atualizados do Supabase
    const fetchRealtimeData = async () => {
      try {
        console.log('[PROFIT_CENTER] Buscando dados atualizados do Supabase...');
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!ordersError && ordersData) {
          setRealtimeOrders(ordersData);
          console.log('[PROFIT_CENTER] ✅ Dados atualizados:', ordersData.length, 'vendas');
        } else if (ordersError) {
          console.error('[PROFIT_CENTER] ❌ Erro ao buscar vendas:', ordersError);
        }
      } catch (error) {
        console.error('[PROFIT_CENTER] ❌ Erro crítico:', error);
      }
    };

    // Carregar dados imediatamente
    fetchRealtimeData();
    
    // Recarregar periodicamente para garantir dados frescos
    const interval = setInterval(fetchRealtimeData, 10000); // 10 segundos
    
    // Forçar carregamento de dados do Supabase
    console.log('[PROFIT_CENTER] Carregando dados do Supabase...');
    loadExpenses().catch(() => {});
    loadEmployees().catch(() => {});
    
    return () => clearInterval(interval);
  }, [loadExpenses, loadEmployees]);

  // 🔑 RE-RENDER - Atualizar quando dados da Store mudarem
  useEffect(() => {
    console.log('[PROFIT_CENTER] 🔄 DETECTADA MUDANÇA NA STORE - Atualizando métricas...');
    
    // Se dados mudarem, forçar refresh completo
    if (expenses.length > 0 || employees.length > 0) {
      console.log('[PROFIT_CENTER] 🔄 REFRESH AUTOMÁTICO - Dados atualizados');
      
      // Pequeno delay para garantir que a Store atualizou
      const timeoutId = setTimeout(() => {
        const fetchRealtimeData = async () => {
          try {
            const { data: ordersData, error: ordersError } = await supabase
              .from('orders')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(100);

            if (!ordersError && ordersData) {
              setRealtimeOrders(ordersData);
              console.log('[PROFIT_CENTER] ✅ Dados refresh:', ordersData.length, 'vendas');
            }
          } catch (error) {
            console.error('[PROFIT_CENTER] ❌ Erro no refresh:', error);
          }
        };
        
        fetchRealtimeData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [expenses.length, employees.length]); // Trigger quando dados mudarem

  const closedOrders = useMemo(() => {
    const validStatuses = ['closed', 'paid'];
    const filtered = realtimeOrders.filter(o => validStatuses.includes(o.status));
    console.log('[PROFIT_CENTER] 🔍 closedOrders calculado:', {
      realtimeOrdersCount: realtimeOrders.length,
      closedOrdersCount: filtered.length,
      sampleOrder: filtered[0] ? { id: filtered[0].id, status: filtered[0].status, hasItems: !!filtered[0].items } : null
    });
    return filtered;
  }, [realtimeOrders]);
  
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // VENDAS HOJE: Usar dados do Supabase
    const todayOrders = closedOrders.filter(order => 
      String(order.created_at || '').split('T')[0] === today
    );
    
    console.log('[PROFIT_CENTER] 📊 Usando dados do Supabase:', {
      totalOrders: closedOrders.length,
      todayOrders: todayOrders.length,
      source: 'SUPABASE_REALTIME'
    });
    const revenueToday = todayOrders.reduce((a, b) => a + (Number(b.total_amount) || 0), 0);
    
    // 🔑 CENTRO DE LUCRO - Faturação Total Bruta do SyncCore (inclui external_history + todas as ordens reais)
    const revenue = syncCoreRevenue; // Usar valor calculado pelo motor de sincronização
    
    // DESPESAS HOJE: Mesma lógica do Dashboard
    const todayExpenses = expenses.filter(expense => 
      String(expense.createdAt || '').split('T')[0] === today
    );
    const variableCosts = todayExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
    
    // CUSTOS FIXOS: Soma de base_salary_kz da tabela staff (mantido)
    const fixedCosts = employees.reduce((acc, emp) => acc + Number(emp.salary || 0), 0);
    
    // IMPOSTOS: Taxa de 6.5% sobre vendas (mesma lógica do Dashboard)
    const tax = revenue * 0.065;
    
    // LUCRO LÍQUIDO REAL: VendasHoje - DespesasHoje - CustosFixos - Impostos
    const netProfit = revenue - variableCosts - fixedCosts - tax;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    
    // 🔑 PAYMENT ECOSYSTEM - Mapear payment_method das ordens
    const byMethod = closedOrders.reduce((acc: Record<string, number>, o) => {
      // 🔑 CORREÇÃO: Mapear payment_method corretamente
      let method = 'A CLASSIFICAR';
      if (o.payment_method === 'NUMERARIO') method = 'Dinheiro';
      else if (o.payment_method === 'TPA') method = 'TPA';
      else if (o.payment_method === 'TRANSFERENCIA') method = 'Transferência';
      else if (o.payment_method === 'QRCODE') method = 'QR Code';
      else if (o.payment_method) method = o.payment_method;
      
      acc[method] = (acc[method] || 0) + (Number(o.total_amount) || 0);
      return acc;
    }, {} as Record<string, number>);

    // � TOP MARGENS: Usar do SyncCore (já calculado no motor)
    const topMarginProducts = syncCoreTopMargins;

    return {
      revenue,
      netProfit,
      margin,
      fixedCosts,
      variableCosts,
      tax,
      todayOrders,
      byMethod,
      topMarginProducts
    };
  }, [closedOrders, expenses, employees, menu]);

  const handleExportProfitReport = () => {
    if (metrics.todayOrders.length === 0) {
      addNotification('warning', 'Nenhuma venda hoje para exportar.');
      return;
    }
    
    try {
      const doc = new jsPDF();
      const today = new Date().toISOString().split('T')[0];
      
      // Título
      doc.setFontSize(18);
      doc.text('RELATÓRIO EXECUTIVO - CENTRO DE LUCRO', 14, 20);
      
      // Data
      doc.setFontSize(12);
      doc.text(`Data: ${today}`, 14, 30);
      
      // Resumo Financeiro
      doc.setFontSize(14);
      doc.text('RESUMO FINANCEIRO', 14, 45);
      
      const summaryData = [
        ['Faturação Bruta', formatKz(metrics.revenue)],
        ['Despesas Variáveis (Hoje)', formatKz(metrics.variableCosts)],
        ['Despesas Fixas (Mês)', formatKz(metrics.fixedCosts)],
        ['Impostos (6.5%)', formatKz(metrics.tax)],
        ['LUCRO LÍQUIDO', formatKz(metrics.netProfit)],
        ['Margem de Lucro', metrics.margin.toFixed(1) + '%']
      ];
      
      autoTable(doc, {
        head: [['Métrica', 'Valor']],
        body: summaryData,
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [6, 182, 212], textColor: 255 },
        bodyStyles: { textColor: 0 }
      });
      
      // Ecossistema de Pagamentos
      const paymentStartY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('ECOSSISTEMA DE PAGAMENTOS', 14, paymentStartY);
      
      const paymentData = Object.entries(metrics.byMethod).map(([method, amount]) => [
        method.toUpperCase(),
        formatKz(amount as number)
      ]);
      
      autoTable(doc, {
        head: [['Método', 'Valor']],
        body: paymentData,
        startY: paymentStartY + 5,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        bodyStyles: { textColor: 0 }
      });
      
      // Top Produtos por Margem
      const productsStartY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('TOP PRODUTOS POR MARGEM', 14, productsStartY);
      
      const productsData = metrics.topMarginProducts.map(product => [
        product.name,
        product.qty.toString(),
        formatKz(product.profit || 0)
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Quantidade', 'Lucro']],
        body: productsData,
        startY: productsStartY + 5,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [245, 158, 11], textColor: 255 },
        bodyStyles: { textColor: 0 }
      });
      
      // Salvar PDF
      doc.save(`centro_lucro_${today}.pdf`);
      
      addNotification('success', 'Relatório executivo exportado com sucesso em PDF.');
      console.log('[PROFIT CENTER] ✅ Relatório executivo exportado para PDF');
    } catch (error) {
      console.error('[PROFIT CENTER] ❌ Erro ao gerar PDF:', error);
      addNotification('error', 'Erro ao gerar PDF. Tente novamente.');
    }
  };

  // Cores futuristas
  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const paymentPieData = Object.entries(metrics.byMethod).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-slate-950 text-slate-200">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Rocket size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">REST IA OS Profit Mission Control</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Centro de Lucro</h2>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-3xl border border-white/10">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Eficiência Operativa</span>
              <span className="text-emerald-500 font-mono font-bold text-lg">{metrics.margin.toFixed(1)}%</span>
           </div>
           <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-glow">
              <Activity size={24} />
           </div>
        </div>
      </header>

      {/* Main Visionary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="glass-panel p-10 rounded-[3rem] border-primary/40 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-primary opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={100}/></div>
            <div className="relative">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Lucro Líquido Real (Net Alpha)</p>
              <div className="relative group">
                <h3 className="text-5xl font-mono font-bold text-white text-glow">{formatKz(metrics.netProfit)}</h3>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg p-3 w-64 z-10 border border-slate-600">
                  <p className="font-bold mb-1">Cálculo do Lucro Líquido:</p>
                  <p className="text-slate-300">Faturação - Despesas Hoje - Despesas Fixas (Mês) - Impostos (6.5%)</p>
                  <p className="text-slate-400 mt-1 text-[10px]">Inclui custos fixos mensais e despesas variáveis do dia</p>
                  <div className="absolute top-full left-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
               <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-var-progress" style={{'--progress-width': `${metrics.margin}%`} as React.CSSProperties}></div>
               </div>
               <span className="text-[10px] font-black text-slate-500">OPTIMIZED</span>
            </div>
         </div>

         <div className="glass-panel p-10 rounded-[3rem] border-white/5 relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Faturação Total Bruta</p>
            <h3 className="text-4xl font-mono font-bold text-white">{formatKz(metrics.revenue)}</h3>
            <p className="text-[10px] text-slate-500 mt-4 font-bold uppercase">Inclui {formatKz(metrics.tax)} de impostos retidos</p>
         </div>

         <div className="glass-panel p-8 rounded-[3rem] border-white/5 flex flex-col justify-center relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500"><Brain size={20}/></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Prediction</span>
            </div>
            <p className="text-sm text-slate-300 italic leading-relaxed">
               "A tendência atual indica um crescimento de 15% para o próximo trimestre. Recomendo focar nos itens de alta margem como bebidas premium."
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Performance Graph - Steve Jobs Style (Clean) */}
        <div className="lg:col-span-2 glass-panel p-10 rounded-[4rem] border-white/5">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                <BarChart3 className="text-primary" /> Velocity Curve
              </h3>
              <div className="flex gap-2">
                 <div className="px-3 py-1 bg-primary/10 rounded-full text-[8px] font-black text-primary uppercase">Real-time</div>
              </div>
           </div>
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: '08h', v: 2000 }, { name: '10h', v: 5000 }, { name: '12h', v: 15000 }, 
                  { name: '14h', v: 12000 }, { name: '16h', v: 7000 }, { name: '18h', v: 22000 }, { name: '20h', v: 35000 }, { name: '22h', v: 18000 }
                ]}>
                   <defs>
                     <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} hide />
                   <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff'}} />
                   <Area type="monotone" dataKey="v" stroke="#06b6d4" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Payment Logic - Elon Musk Style (Efficiency) */}
        <div className="glass-panel p-10 rounded-[4rem] border-white/5 flex flex-col items-center">
           <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 self-start flex items-center gap-3">
             <CreditCard className="text-primary" /> Payment Ecosystem
           </h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={paymentPieData}
                   innerRadius={60}
                   outerRadius={100}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {paymentPieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}} />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="w-full space-y-3 mt-6">
              {paymentPieData.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-dynamic" style={{'--dynamic-color': COLORS[i % COLORS.length]} as React.CSSProperties}></div>
                      <span className="text-slate-500">{p.name}</span>
                   </div>
                   {/* Explicit cast to number to fix unknown type error during compilation */}
                   <span className="text-white">{formatKz(p.value as number)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Product Contribution - The Pareto Principle (80/20) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="glass-panel p-10 rounded-[4rem] border-white/5">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
              <Layers className="text-orange-500" /> Top Margens de Contribuição
            </h3>
            <div className="space-y-6">
               {metrics.topMarginProducts.map((p, i) => (
                 <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-slate-500 group-hover:text-primary transition-colors">0{i+1}</div>
                       <div>
                          <p className="text-sm font-bold text-white uppercase">{p.name}</p>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.qty} Unidades vendidas</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-emerald-500 font-mono font-bold">{(p.profit || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
                       <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">LUCRO PURO</p>
                    </div>
                 </div>
               ))}
               {metrics.topMarginProducts.length === 0 && <p className="text-center text-slate-600 py-10 italic">Processando algoritmos de margem...</p>}
            </div>
         </div>

         <div className="glass-panel p-10 rounded-[4rem] border-white/5 bg-gradient-to-t from-primary/5 to-transparent flex flex-col justify-center text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6 shadow-glow border border-primary/30">
               <TrendingUp size={40} />
            </div>
            <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Insanely Profitable.</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
               Este dashboard não mostra apenas números. Ele mostra o futuro do seu império gastronómico. Elimine o que não gera valor, escale o que encanta o cliente.
            </p>
            <button 
               onClick={handleExportProfitReport}
               className="mt-10 px-8 py-4 bg-white text-black rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2"
            >
               <Printer size={16} /> Descarregar Relatório Executivo
            </button>
         </div>
      </div>
    </div>
  );
};

export default ProfitCenter;




