
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Zap, BarChart3, Activity, Layers, CreditCard,
  Rocket, Brain, Printer, Calendar, ArrowUpRight, ArrowDownRight,
  DollarSign, Receipt
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import { supabase } from '../supabase_standalone';
import ProgressBar from '../components/ProgressBar';

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

type PeriodType = 'today' | '7days' | '30days';

const getPeriodRange = (period: PeriodType): { start: string; end: string; label: string } => {
  const today = new Date();
  const end = today.toISOString().split('T')[0];
  if (period === 'today') {
    return { start: end, end, label: 'Hoje' };
  }
  const start = new Date(today);
  start.setDate(start.getDate() - (period === '7days' ? 7 : 30));
  return { start: start.toISOString().split('T')[0], end, label: period === '7days' ? 'Últimos 7 dias' : 'Últimos 30 dias' };
};

const getPreviousRange = (period: PeriodType): { start: string; end: string } => {
  const today = new Date();
  if (period === 'today') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const d = yesterday.toISOString().split('T')[0];
    return { start: d, end: d };
  }
  const days = period === '7days' ? 7 : 30;
  const prevEnd = new Date(today);
  prevEnd.setDate(prevEnd.getDate() - days);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);
  return { start: prevStart.toISOString().split('T')[0], end: prevEnd.toISOString().split('T')[0] };
};

const ProfitCenter = () => {
  const { menu, categories, addNotification, expenses, employees, loadExpenses, loadEmployees } = useStore();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [eventRevenue, setEventRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('today');

  const periodRange = useMemo(() => getPeriodRange(period), [period]);
  const prevRange = useMemo(() => getPreviousRange(period), [period]);

  const [allOrderItems, setAllOrderItems] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar orders paginadas (evitar limite de 1000 do Supabase)
      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', `${getPeriodRange('30days').start}T00:00:00`)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        allData.push(...data);

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      setAllOrders(allData);

      // Buscar order_items em batches (Supabase tem limite no .in())
      if (allData.length > 0) {
        const orderIds = allData.map(o => o.id);
        const allItems: any[] = [];
        const batchSize = 200;
        for (let i = 0; i < orderIds.length; i += batchSize) {
          const batch = orderIds.slice(i, i + batchSize);
          const { data: batchItems } = await supabase
            .from('order_items')
            .select('order_id, product_id, quantity, unit_price')
            .in('order_id', batch);
          if (batchItems) {
            allItems.push(...batchItems);
          }
        }
        setAllOrderItems(allItems);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchOrders();
    loadExpenses().catch(() => {});
    loadEmployees().catch(() => {});

    const channel = supabase
      .channel('profit-center-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        loadExpenses().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, loadExpenses, loadEmployees]);

  // Fetch event extras revenue
  useEffect(() => {
    const fetchEventRevenue = async () => {
      try {
        const { start } = periodRange;
        const { data, error } = await supabase
          .from('events')
          .select('extras_amount')
          .gte('start_date', start);
        if (!error && data) {
          setEventRevenue(data.reduce((sum, e) => sum + (Number(e.extras_amount) || 0), 0));
        }
      } catch {
        // silent
      }
    };
    fetchEventRevenue();
  }, [periodRange]);

  const closedOrders = useMemo(() => {
    return allOrders.filter(o => ['closed', 'paid'].includes(o.status));
  }, [allOrders]);

  const periodOrders = useMemo(() => {
    return closedOrders.filter(o => {
      const orderDate = (o.data_contabil || o.created_at || '').split('T')[0];
      return orderDate >= periodRange.start && orderDate <= periodRange.end;
    });
  }, [closedOrders, periodRange]);

  const prevPeriodOrders = useMemo(() => {
    return closedOrders.filter(o => {
      const orderDate = (o.data_contabil || o.created_at || '').split('T')[0];
      return orderDate >= prevRange.start && orderDate <= prevRange.end;
    });
  }, [closedOrders, prevRange]);

  // Hourly chart data from real orders
  const hourlyData = useMemo(() => {
    const hours: Record<string, number> = {};
    for (let h = 8; h <= 23; h++) {
      hours[`${h}h`] = 0;
    }
    periodOrders.forEach(o => {
      const created = new Date(o.created_at);
      const h = created.getHours();
      if (h >= 8 && h <= 23) {
        hours[`${h}h`] = (hours[`${h}h`] || 0) + (Number(o.total_amount) || 0);
      }
    });
    return Object.entries(hours).map(([name, v]) => ({ name, v }));
  }, [periodOrders]);

  const metrics = useMemo(() => {
    const revenue = periodOrders.reduce((a, b) => a + (Number(b.total_amount) || 0), 0);
    const prevRevenue = prevPeriodOrders.reduce((a, b) => a + (Number(b.total_amount) || 0), 0);

    // Variable costs (expenses in period)
    const periodExpenses = expenses.filter(exp => {
      const expDate = String(exp.createdAt || '').split('T')[0];
      return expDate >= periodRange.start && expDate <= periodRange.end;
    });
    const variableCosts = periodExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

    // Fixed costs (monthly salaries - shown separately, not subtracted from daily revenue)
    const fixedCostsMonthly = employees.reduce((acc, emp) => acc + Number(emp.salary || 0), 0);
    const fixedCostsPerDay = fixedCostsMonthly / 30;
    const periodDays = period === 'today' ? 1 : (period === '7days' ? 7 : 30);
    const fixedCostsPeriod = fixedCostsPerDay * periodDays;

    // Tax
    const tax = revenue * 0.065;

    // Net profit: revenue - variable costs - tax (fixed costs shown separately)
    const netProfit = revenue - variableCosts - tax;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Comparison vs previous period
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const prevExpenses = expenses.filter(exp => {
      const expDate = String(exp.createdAt || '').split('T')[0];
      return expDate >= prevRange.start && expDate <= prevRange.end;
    });
    const prevVariableCosts = prevExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
    const expensesChange = prevVariableCosts > 0 ? ((variableCosts - prevVariableCosts) / prevVariableCosts) * 100 : 0;

    // Payment methods
    const byMethod = periodOrders.reduce((acc: Record<string, number>, o) => {
      let method = 'A CLASSIFICAR';
      if (o.payment_method === 'NUMERARIO') method = 'Dinheiro';
      else if (o.payment_method === 'TPA') method = 'TPA / MULTICAIXA';
      else if (o.payment_method === 'TRANSFERENCIA') method = 'Transferência';
      else if (o.payment_method === 'QRCODE') method = 'QR Code';
      else if (o.payment_method) method = o.payment_method;
      acc[method] = (acc[method] || 0) + (Number(o.total_amount) || 0);
      return acc;
    }, {} as Record<string, number>);

    // Top margin products - via order_items (items JSONB é null)
    const itemsByOrder: Record<string, any[]> = {};
    allOrderItems.forEach((item: any) => {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push(item);
    });

    const productProfit: Record<string, { name: string; profit: number; qty: number; category?: string }> = {};
    periodOrders.forEach((order: any) => {
      const items = itemsByOrder[order.id] || [];
      items.forEach((item: any) => {
        const dishId = item.product_id || item.dish_id || item.id;
        const qty = item.quantity || 0;
        const dish = menu.find(d => d.id === dishId);
        const itemPrice = Number(item.unit_price) || Number(dish?.price) || 0;
        const itemCost = Number(dish?.costPrice) || 0;
        const catId = dish?.categoryId || dish?.category_id;
        const catName = catId ? (categories.find((c: any) => c.id === catId)?.name || 'Outros') : 'Outros';
        if (!productProfit[dishId]) {
          productProfit[dishId] = { name: dish?.name || `Produto ${String(dishId).substring(0, 8)}`, profit: 0, qty: 0, category: catName };
        }
        productProfit[dishId].profit += (itemPrice - itemCost) * qty;
        productProfit[dishId].qty += qty;
      });
    });
    const topMarginProducts = Object.values(productProfit)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    // Category ranking - via order_items
    const categoryRevenue: Record<string, number> = {};
    periodOrders.forEach((order: any) => {
      const items = itemsByOrder[order.id] || [];
      items.forEach((item: any) => {
        const dishId = item.product_id || item.dish_id || item.id;
        const dish = menu.find(d => d.id === dishId);
        const catId = dish?.categoryId || dish?.category_id;
        const catName = catId ? (categories.find((c: any) => c.id === catId)?.name || 'Outros') : 'Outros';
        const price = Number(item.unit_price) || Number(dish?.price) || 0;
        categoryRevenue[catName] = (categoryRevenue[catName] || 0) + (Number(item.quantity) || 0) * price;
      });
    });
    const categoryRanking = Object.entries(categoryRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Ticket average
    const ticketAvg = periodOrders.length > 0 ? revenue / periodOrders.length : 0;

    // Break-even point: receita necessária para cobrir custos fixos + variáveis
    // Fórmula: Break-even = Custos Fixos / (1 - (Custos Variáveis / Receita))
    // Se receita = 0, break-even = custos fixos + variáveis (total costs)
    let breakEven: number;
    if (revenue > 0 && variableCosts > 0) {
      const contributionMarginRatio = (revenue - variableCosts) / revenue;
      if (contributionMarginRatio > 0) {
        breakEven = fixedCostsPeriod / contributionMarginRatio;
      } else {
        breakEven = fixedCostsPeriod + variableCosts;
      }
    } else {
      breakEven = fixedCostsPeriod + variableCosts;
    }

    // Neural prediction: 7-day moving average
    const last7DaysRevenue: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayRev = closedOrders
        .filter(o => (o.data_contabil || o.created_at || '').split('T')[0] === dStr)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      last7DaysRevenue.push(dayRev);
    }
    const avg7Days = last7DaysRevenue.reduce((a, b) => a + b, 0) / 7;
    const todayRevenue = last7DaysRevenue[0] || 0;
    const trendPercent = avg7Days > 0 ? ((todayRevenue - avg7Days) / avg7Days) * 100 : 0;
    const predictionText = avg7Days > 0
      ? `Média móvel 7 dias: ${formatKz(avg7Days)}/dia. ${trendPercent >= 0 ? 'Crescimento' : 'Queda'} de ${Math.abs(trendPercent).toFixed(1)}% vs média. ${topMarginProducts[0] ? `Produto estrela: ${topMarginProducts[0].name}.` : ''} ${expensesChange > 20 ? '⚠ Despesas acima da média.' : ''}`
      : 'Sem dados suficientes para previsão. Comece a registar vendas para activar o motor de análise.';

    return {
      revenue,
      prevRevenue,
      netProfit,
      margin,
      fixedCostsMonthly,
      fixedCostsPeriod,
      variableCosts,
      prevVariableCosts,
      tax,
      periodOrders,
      byMethod,
      topMarginProducts,
      categoryRanking,
      ticketAvg,
      breakEven,
      revenueChange,
      expensesChange,
      eventRevenue,
      predictionText,
      avg7Days,
      trendPercent
    };
  }, [periodOrders, prevPeriodOrders, expenses, employees, menu, categories, period, periodRange, prevRange, closedOrders, eventRevenue, allOrderItems]);

  const handleExportProfitReport = () => {
    if (metrics.periodOrders.length === 0) {
      addNotification('warning', 'Nenhuma venda no período para exportar.');
      return;
    }
    try {
      const doc = new jsPDF();
      const today = new Date().toISOString().split('T')[0];
      doc.setFontSize(18);
      doc.text('RELATÓRIO EXECUTIVO - CENTRO DE LUCRO', 14, 20);
      doc.setFontSize(12);
      doc.text(`Período: ${periodRange.label} (${periodRange.start} a ${periodRange.end})`, 14, 30);
      doc.setFontSize(14);
      doc.text('RESUMO FINANCEIRO', 14, 45);
      const summaryData = [
        ['Faturação Bruta', formatKz(metrics.revenue)],
        ['Receita de Eventos (Extras)', formatKz(metrics.eventRevenue)],
        ['Despesas Variáveis', formatKz(metrics.variableCosts)],
        ['Custos Fixos Mensais (separado)', formatKz(metrics.fixedCostsMonthly)],
        ['Impostos (6.5%)', formatKz(metrics.tax)],
        ['LUCRO LÍQUIDO OPERACIONAL', formatKz(metrics.netProfit)],
        ['Margem de Lucro', metrics.margin.toFixed(1) + '%'],
        ['Ticket Médio', formatKz(metrics.ticketAvg)],
        ['Ponto de Equilíbrio', formatKz(metrics.breakEven)],
        ['Total de Vendas', String(metrics.periodOrders.length)]
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
      const paymentStartY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('ECOSSISTEMA DE PAGAMENTOS', 14, paymentStartY);
      const paymentData = Object.entries(metrics.byMethod).map(([method, amount]) => [
        method.toUpperCase(), formatKz(amount as number)
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
      const productsStartY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('TOP PRODUTOS POR MARGEM', 14, productsStartY);
      const productsData = metrics.topMarginProducts.map(product => [
        product.name, product.qty.toString(), formatKz(product.profit || 0)
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
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `centro_lucro_${periodRange.label}_${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addNotification('success', 'Relatório executivo exportado com sucesso em PDF.');
    } catch {
      addNotification('error', 'Erro ao gerar PDF. Tente novamente.');
    }
  };

  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
  const COLOR_CLASSES = ['bg-cyan-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400', 'bg-red-400'];
  const paymentPieData = Object.entries(metrics.byMethod).map(([name, value]) => ({ name, value }));

  const periodButtons: { id: PeriodType; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: '7days', label: '7 Dias' },
    { id: '30days', label: '30 Dias' },
  ];

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-slate-500 text-[10px]">—</span>;
    const positive = value > 0;
    return (
      <span className={`flex items-center gap-0.5 text-[10px] font-black ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-slate-950 text-slate-200">
      {/* Header + Period Selector */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Rocket size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">REST IA OS Profit Mission Control</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Centro de Lucro</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
            {periodButtons.map(pb => (
              <button
                key={pb.id}
                onClick={() => setPeriod(pb.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  period === pb.id ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {pb.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-3xl border border-white/10">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Eficiência</span>
              <span className="text-emerald-500 font-mono font-bold text-lg">{metrics.margin.toFixed(1)}%</span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-glow">
              <Activity size={24} />
            </div>
          </div>
        </div>
      </header>

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
          <span className="ml-4 text-primary font-bold text-sm uppercase tracking-widest">Carregando métricas...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Net Profit */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-primary/40 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 text-primary opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={80}/></div>
              <div className="relative">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-3">Lucro Líquido Operacional</p>
                <h3 className="text-4xl font-mono font-bold text-white text-glow">{formatKz(metrics.netProfit)}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar percentage={Math.max(0, Math.min(100, metrics.margin))} className="h-1 flex-1" barClassName="bg-primary" />
                  <span className="text-[10px] font-black text-slate-500">{metrics.margin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Faturação Bruta</p>
              <h3 className="text-3xl font-mono font-bold text-white">{formatKz(metrics.revenue)}</h3>
              <div className="mt-3 flex items-center gap-2">
                <ChangeIndicator value={metrics.revenueChange} />
                <span className="text-[9px] text-slate-600 uppercase">vs período anterior</span>
              </div>
              <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Impostos: {formatKz(metrics.tax)}</p>
            </div>

            {/* Variable Costs */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Despesas Variáveis</p>
              <h3 className="text-3xl font-mono font-bold text-white">{formatKz(metrics.variableCosts)}</h3>
              <div className="mt-3 flex items-center gap-2">
                <ChangeIndicator value={metrics.expensesChange} />
                <span className="text-[9px] text-slate-600 uppercase">vs período anterior</span>
              </div>
              <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">{metrics.periodOrders.length} vendas • Ticket: {formatKz(metrics.ticketAvg)}</p>
            </div>

            {/* Fixed Costs (separate) */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Receipt size={14} className="text-amber-400" />
                <p className="text-[10px] font-black text-amber-400/80 uppercase tracking-[0.4em]">Custos Fixos Mensais</p>
              </div>
              <h3 className="text-3xl font-mono font-bold text-white">{formatKz(metrics.fixedCostsMonthly)}</h3>
              <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">
                {formatKz(metrics.fixedCostsMonthly / 30)}/dia • {formatKz(metrics.fixedCostsPeriod)} no período
              </p>
              <p className="text-[9px] text-slate-600 mt-1 italic">Não afecta lucro operacional diário</p>
            </div>
          </div>

          {/* Neural Prediction + Event Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="glass-panel p-6 rounded-[2.5rem] border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500"><Brain size={20}/></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análise Preditiva</span>
              </div>
              <p className="text-sm text-slate-300 italic leading-relaxed">{metrics.predictionText}</p>
            </div>

            <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400"><Calendar size={20}/></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita de Eventos</span>
              </div>
              <h3 className="text-2xl font-mono font-bold text-white">{formatKz(metrics.eventRevenue)}</h3>
              <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">Extras vendidos via POS no período</p>
            </div>

            <div className="glass-panel p-6 rounded-[2.5rem] border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400"><DollarSign size={20}/></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ponto de Equilíbrio</span>
              </div>
              <h3 className="text-2xl font-mono font-bold text-white">{formatKz(metrics.breakEven)}</h3>
              <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">
                {metrics.revenue >= metrics.breakEven ? '✅ Meta atingida' : `Faltam ${formatKz(metrics.breakEven - metrics.revenue)}`}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Velocity Curve - real hourly data */}
            <div className="lg:col-span-2 glass-panel p-8 rounded-[3rem] border-white/5">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                  <BarChart3 className="text-primary" /> Velocity Curve
                </h3>
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-primary/10 rounded-full text-[8px] font-black text-primary uppercase">{periodRange.label}</div>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} hide />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff'}} formatter={(v: number) => [formatKz(v), 'Vendas']} />
                    <Area type="monotone" dataKey="v" stroke="#06b6d4" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Ecosystem */}
            <div className="glass-panel p-8 rounded-[3rem] border-white/5 flex flex-col items-center">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2 self-start flex items-center gap-3">
                <CreditCard className="text-primary" /> Pagamentos
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest self-start mb-4">
                {periodRange.label}
              </p>
              {paymentPieData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-slate-600 text-sm italic">Sem vendas no período</div>
              ) : (
                <>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentPieData} innerRadius={50} outerRadius={90} paddingAngle={5} dataKey="value">
                          {paymentPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: 'none'}} formatter={(v: number) => formatKz(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-2 mt-4">
                    {paymentPieData.map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${COLOR_CLASSES[i % COLOR_CLASSES.length]}`}></div>
                          <span className="text-slate-500">{p.name}</span>
                        </div>
                        <span className="text-white">{formatKz(p.value as number)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom: Top Margins + Category Ranking + Export */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Margins */}
            <div className="glass-panel p-8 rounded-[3rem] border-white/5">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <Layers className="text-orange-500" /> Top Margens
              </h3>
              <div className="space-y-4">
                {metrics.topMarginProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-slate-500 group-hover:text-primary transition-colors">0{i+1}</div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{p.name}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.qty} un.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-500 font-mono font-bold text-sm">{formatKz(p.profit || 0)}</p>
                      <p className="text-[8px] font-black text-slate-600 uppercase">LUCRO</p>
                    </div>
                  </div>
                ))}
                {metrics.topMarginProducts.length === 0 && <p className="text-center text-slate-600 py-8 italic text-sm">Sem dados de margem no período</p>}
              </div>
            </div>

            {/* Category Ranking */}
            <div className="glass-panel p-8 rounded-[3rem] border-white/5">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                <BarChart3 className="text-cyan-400" /> Top Categorias
              </h3>
              <div className="space-y-3">
                {metrics.categoryRanking.map(([cat, rev], i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[10px] font-black text-cyan-400">{i+1}</div>
                      <span className="text-sm font-bold text-white uppercase">{cat}</span>
                    </div>
                    <span className="text-cyan-300 font-mono font-bold text-sm">{formatKz(rev)}</span>
                  </div>
                ))}
                {metrics.categoryRanking.length === 0 && <p className="text-center text-slate-600 py-8 italic text-sm">Sem dados no período</p>}
              </div>
            </div>

            {/* Export + Summary */}
            <div className="glass-panel p-8 rounded-[3rem] border-white/5 bg-gradient-to-t from-primary/5 to-transparent flex flex-col justify-center">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendas</span>
                  <span className="text-white font-mono font-bold">{metrics.periodOrders.length}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ticket Médio</span>
                  <span className="text-white font-mono font-bold">{formatKz(metrics.ticketAvg)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Média 7 dias</span>
                  <span className="text-white font-mono font-bold">{formatKz(metrics.avg7Days)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tendência</span>
                  <ChangeIndicator value={metrics.trendPercent} />
                </div>
              </div>
              <button 
                onClick={handleExportProfitReport}
                className="px-6 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Exportar Relatório PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitCenter;




