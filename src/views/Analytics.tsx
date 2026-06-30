import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import ProgressBar from '../components/ProgressBar';
import { 
  TrendingUp, DollarSign, ShoppingCart, 
  Download,
  PieChart, Sparkles, RefreshCw, Crown, Medal, Award,
  AlertCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { formatKz, calculateDataContabil } from '../lib/dateUtils';
import { supabase } from '../supabase_standalone';

const Analytics = () => {
  const { settings, activeOrders, menu, expenses, loadExpenses } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');
  const [productPeriod, setProductPeriod] = useState<'today' | 'yesterday' | 'dayBefore' | 'week' | 'month'>('today');
  const [realtimeOrders, setRealtimeOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  // Estado para cache de dados por período
  const [periodCache, setPeriodCache] = useState<Record<string, { orders: any[], items: any[] }>>({
    today: { orders: [], items: [] },
    yesterday: { orders: [], items: [] },
    dayBefore: { orders: [], items: [] },
    week: { orders: [], items: [] },
    month: { orders: [], items: [] }
  });

  useEffect(() => {
    if (!navigator.onLine) return;
    
    // Buscar dados atualizados do Supabase
    const fetchRealtimeData = async () => {
      try {
        const hojeString = calculateDataContabil(new Date());
        
        // Buscar orders fechadas/pagas de HOJE via data_contabil
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['closed', 'paid'])
          .eq('data_contabil', hojeString)
          .order('created_at', { ascending: false });

        if (ordersError) {
          return;
        }

        // Buscar order_items para as orders de hoje
        const orderIds = ordersData?.map((o: any) => o.id) || [];
        let itemsData: any[] = [];
        
        if (orderIds.length > 0) {
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);
            
          if (!itemsError && items) {
            itemsData = items;
          }
        }

        if (ordersData) {
          setRealtimeOrders(ordersData);
          setOrderItems(itemsData);
          setLastUpdate(new Date());
        }
      } catch (error) {
        // silent fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 10000);
    loadExpenses().catch(() => {});
    
    return () => clearInterval(interval);
  }, [loadExpenses]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'r' || e.key === 'R') {
        setIsLoading(true);
        window.location.reload();
      }
      if (e.key === 'e' || e.key === 'E') {
        exportToCSV();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [realtimeOrders, expenses]);

  // 🔥 BUSCAR DADOS DO SUPABASE PARA QUALQUER PERÍODO
  const fetchProductSalesForPeriod = useCallback(async (period: 'today' | 'yesterday' | 'dayBefore' | 'week' | 'month') => {
    if (!navigator.onLine) return;
    
    // Se já temos dados em cache e não é 'today', usar cache
    if (period !== 'today' && periodCache[period].orders.length > 0) {
            return;
    }
    
    try {
      let startDate: string;
      let endDate: string;
      const now = new Date();
      
      // Calcular datas sempre em formato YYYY-MM-DD local (Luanda)
      if (period === 'today') {
        startDate = calculateDataContabil(now);
        endDate = startDate;
      } else if (period === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        // Converter para formato YYYY-MM-DD local
        startDate = yesterday.toLocaleDateString('en-CA', { timeZone: 'Africa/Luanda' }); // formato YYYY-MM-DD
        endDate = startDate;
      } else if (period === 'dayBefore') {
        const dayBefore = new Date(now);
        dayBefore.setDate(dayBefore.getDate() - 2);
        startDate = dayBefore.toLocaleDateString('en-CA', { timeZone: 'Africa/Luanda' });
        endDate = startDate;
      } else if (period === 'week') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startDate = sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Africa/Luanda' });
        endDate = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Luanda' });
      } else {
        // month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfMonth.toLocaleDateString('en-CA', { timeZone: 'Africa/Luanda' });
        endDate = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Luanda' });
      }
      
            
      // SEMPRE usar data_contabil para consistência (está em formato YYYY-MM-DD local)
      let ordersQuery;
      
      if (period === 'today') {
        ordersQuery = supabase
          .from('orders')
          .select('*')
          .in('status', ['closed', 'paid'])
          .eq('data_contabil', startDate)
          .order('created_at', { ascending: false });
      } else if (period === 'yesterday') {
        ordersQuery = supabase
          .from('orders')
          .select('*')
          .in('status', ['closed', 'paid'])
          .eq('data_contabil', startDate) // ontem específico
          .order('created_at', { ascending: false });
      } else if (period === 'dayBefore') {
        ordersQuery = supabase
          .from('orders')
          .select('*')
          .in('status', ['closed', 'paid'])
          .eq('data_contabil', startDate) // anteontem específico
          .order('created_at', { ascending: false });
      } else {
        // week e month - usar range de data_contabil
        ordersQuery = supabase
          .from('orders')
          .select('*')
          .in('status', ['closed', 'paid'])
          .gte('data_contabil', startDate)
          .lte('data_contabil', endDate)
          .order('created_at', { ascending: false });
      }
      
      const { data: ordersData, error: ordersError } = await ordersQuery;
      
      if (ordersError) {
                return;
      }
      
      // Buscar order_items
      const orderIds = ordersData?.map((o: any) => o.id) || [];
      let itemsData: any[] = [];
      
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
          
        if (!itemsError && items) {
          itemsData = items;
        }
      }
      
      // Atualizar cache
      setPeriodCache(prev => ({
        ...prev,
        [period]: { orders: ordersData || [], items: itemsData }
      }));
      
          } catch (error) {
          }
  }, [periodCache]);

  // 🔄 BUSCAR DADOS AUTOMATICAMENTE QUANDO MUDAR DE PERÍODO
  useEffect(() => {
    fetchProductSalesForPeriod(productPeriod);
  }, [productPeriod, fetchProductSalesForPeriod]);

  // Calcular métricas reais
  const realMetrics = useMemo(() => {
    // realtimeOrders já está filtrado por data_contabil de hoje no useEffect
    const todayOrders = realtimeOrders;
    
    const totalSalesToday = todayOrders.reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0);
    const totalOrdersToday = todayOrders.length;
    const ticketMedio = totalOrdersToday > 0 ? totalSalesToday / totalOrdersToday : 0;
    
    // Custo de Compras: expenses de hoje
    const hojeString = calculateDataContabil(new Date());
    const todayExpenses = expenses.filter(expense => 
      String(expense.createdAt || '').split('T')[0] === hojeString
    );
    const totalExpensesToday = todayExpenses.reduce((acc, expense) => acc + Number(expense.amount || 0), 0);
    
    // Lucro Bruto
    const lucroBruto = (totalSalesToday || 0) - (totalExpensesToday || 0);
    
    return {
      totalSalesToday,
      totalOrdersToday,
      ticketMedio,
      totalExpensesToday,
      lucroBruto
    };
  }, [realtimeOrders, expenses]);

  // Dados para gráfico dos últimos 7 dias
  const weekChartData = useMemo(() => {
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // 🔑 UNIFICADO: toISOString().split('T')[0]
      const dayName = date.toLocaleDateString('pt-AO', { weekday: 'short', day: 'numeric' });
      
      // Vendas do dia (incluindo todos os status de venda) - CORRIGIR CAMPO
      const dayOrders = activeOrders.filter(order => 
        ['closed', 'paid'].includes(order.status) && 
        String(order.timestamp || '').split('T')[0] === dateStr // 🔑 UNIFICADO: toISOString().split('T')[0]
      );
      const sales = dayOrders.reduce((acc, order) => acc + (order.total || 0), 0);
      
      // Compras do dia - CORRIGIR CAMPO
      const dayExpenses = expenses.filter(expense => 
        String(expense.createdAt || '').split('T')[0] === dateStr // 🔑 UNIFICADO: toISOString().split('T')[0]
      );
      const purchases = dayExpenses.reduce((acc, expense) => acc + Number(expense.amount || 0), 0);
      
      data.push({
        day: dayName,
        sales,
        purchases
      });
    }
    
    return data;
  }, [activeOrders, expenses]);

  // KPIs com dados reais
  const kpis = [
    {
      title: 'FATURAÇÃO HOJE',
      value: realMetrics.totalSalesToday.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
      change: '+0%',
      trend: 'up' as const,
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      title: 'Ticket Médio',
      value: realMetrics.ticketMedio.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
      change: '+0%',
      trend: 'up' as const,
      icon: <DollarSign className="w-5 h-5" />
    },
    {
      title: 'Custo de Compras',
      value: realMetrics.totalExpensesToday.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
      change: '-0%',
      trend: 'down' as const,
      icon: <ShoppingCart className="w-5 h-5" />
    },
    {
      title: 'Lucro Bruto',
      value: realMetrics.lucroBruto.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
      change: '+0%',
      trend: 'up' as const,
      icon: <TrendingUp className="w-5 h-5" />
    }
  ];

  // Calcular top produtos reais baseado nos order_items (tabela separada)
  const realTopProducts = useMemo(() => {
    const productSales: Record<string, { name: string, category: string, sales: number }> = {};
    
        
    orderItems.forEach((item: any) => {
      const productId = item.product_id || item.dish_id;
      const quantity = item.quantity || 0;
      
      if (!productId) return;
      
      const dish = menu.find(d => d.id === productId);
      if (!productSales[productId]) {
        productSales[productId] = {
          name: dish?.name || item.product_name || 'Desconhecido',
          category: dish?.category_id || 'Outros',
          sales: 0
        };
      }
      productSales[productId].sales += quantity;
    });

    const result = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
      
        
    return result;
  }, [orderItems, menu]);

  // 🔥 VENDAS POR PRODUTOS POR PERÍODO (Hoje, Ontem, Anteontem, 7 Dias, Mensal)
  const productSalesByPeriod = useMemo(() => {
    const productMap: Record<string, { name: string; quantity: number; totalValue: number }> = {};
    
    // Usar dados do cache para o período selecionado
    const cacheData = periodCache[productPeriod];
    const orders = cacheData.orders.length > 0 ? cacheData.orders : realtimeOrders;
    const items = cacheData.items.length > 0 ? cacheData.items : orderItems;
    
        
    // Criar lookup de orders do período
    const orderIds = new Set(orders.map((o: any) => o.id));
    
    // Processar items
    items.forEach((item: any) => {
      if (!orderIds.has(item.order_id)) return;
      
      const productId = item.product_id || item.dish_id;
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price || item.price || 0;
      const totalValue = (item.total_price || 0) || (quantity * unitPrice);
      
      // Buscar nome do produto
      const dish = menu.find(d => d.id === productId);
      const name = dish?.name || item.product_name || 'Desconhecido';
      
      if (!productMap[name]) {
        productMap[name] = { name, quantity: 0, totalValue: 0 };
      }
      productMap[name].quantity += quantity;
      productMap[name].totalValue += totalValue;
    });
    
    return Object.values(productMap)
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [periodCache, productPeriod, realtimeOrders, orderItems, menu]);

  // Dados para gráfico de pizza das despesas - ACEITAR TODAS AS CATEGORIAS
  const expensePieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    // MAPEAMENTO OFICIAL DE CATEGORIAS ANGOLA
    const categoryMapping: Record<string, string> = {
      'ALIMENTACAO': 'ALIMENTAÇÃO',
      'ALIMENTAÇÃO': 'ALIMENTAÇÃO',
      'STAFF': 'STAFF',
      'COMPRAS': 'MERCADORIA',
      'MERCADORIA': 'MERCADORIA', 
      'RENDAS': 'RENDAS',
      'IMPOSTOS': 'IMPOSTOS',
      'MANUTENCAO': 'MANUTENÇÃO',
      'MANUTENÇÃO': 'MANUTENÇÃO',
      'BEBIDAS': 'MERCADORIA',
      'MATERIAL_LIMPEZA': 'MANUTENÇÃO',
      'UTILIDADES': 'UTILIDADES',
      'REPARACOES': 'MANUTENÇÃO',
      'REPARAÇÕES': 'MANUTENÇÃO',
      'MARKETING': 'MARKETING',
      'OUTROS': 'OUTROS'
    };
    
    expenses.forEach(expense => {
      // USAR CAMPO CORRETO amount (conforme tipo Expense)
      const valor = Number(expense.amount || 0);
      
      // ACEITAR TODAS AS CATEGORIAS - MAPEAR SE NECESSÁRIO
      let rawCategory = String(expense.category || '').toUpperCase().trim();
      
      if (!rawCategory || rawCategory === 'undefined' || rawCategory === '') {
                return; // PULAR APENAS SE REALMENTE NÃO TIVER CATEGORIA
      }
      
      // USAR CATEGORIA MAPEADA OU ORIGINAL SE NÃO EXISTER NO MAPA
      let categoryName = categoryMapping[rawCategory] || rawCategory;
      
      if (!grouped[categoryName]) {
        grouped[categoryName] = 0;
      }
      
      grouped[categoryName] += valor;
    });

    const total = Object.values(grouped).reduce((acc, val) => acc + val, 0);
    
    // MAPEAMENTO CORRETO PARA O GRÁFICO - name é a chave esperada pelo PieChart
    const chartData = Object.entries(grouped).map(([category, amount]) => ({
      name: category,  // ← CHAVE CORRETA PARA O GRÁFICO
      value: amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }));
    
        return chartData;
  }, [expenses]);

  // Dados para gráfico de área das despesas (últimos 30 dias)
  const expenseAreaData = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    
    // Inicializar últimos 30 dias com 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // 🔑 UNIFICADO: toISOString().split('T')[0]
      data[dateStr] = 0;
    }
    
    // Somar despesas por dia
    expenses.forEach(expense => {
      const expenseDate = String(expense.createdAt || '').split('T')[0]; // 🔑 UNIFICADO: toISOString().split('T')[0]
      if (data.hasOwnProperty(expenseDate)) {
        data[expenseDate] += Number(expense.amount || 0);
      }
    });
    
    return Object.entries(data).map(([date, total]) => ({
      date: new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' }),
      total
    }));
  }, [expenses]);

  // Cores para gráficos - CORES FIXAS POR CATEGORIA
  const CATEGORY_COLORS: Record<string, string> = {
    'STAFF': '#06b6d4',        // Cyan
    'MERCADORIA': '#10b981',   // Green  
    'RENDAS': '#f59e0b',       // Yellow
    'IMPOSTOS': '#ef4444',     // Red
    'MANUTENÇÃO': '#8b5cf6',   // Purple
    'ALIMENTAÇÃO': '#ec4899',  // Pink
    'UTILIDADES': '#14b8a6',   // Teal
    'MARKETING': '#f97316',    // Orange
    'OUTROS': '#64748b'        // Slate
  };

  // Cores genéricas para fallback
  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // FUNÇÃO DE EXPORTAÇÃO CSV
  const exportToCSV = () => {
    const today = calculateDataContabil(new Date()); // 🔑 UNIFICADO: usar calculateDataContabil
    
    // Preparar dados para exportação
    const csvData = [
      ['Relatório de Analytics - ' + today],
      [],
      ['MÉTRICAS DO DIA'],
      ['Métrica', 'Valor'],
      ['FATURAÇÃO HOJE', realMetrics.totalSalesToday.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })],
      ['Ticket Médio', realMetrics.ticketMedio.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })],
      ['Custo de Compras', realMetrics.totalExpensesToday.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })],
      ['Lucro Bruto', realMetrics.lucroBruto.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })],
      [],
      ['TOP PRODUTOS'],
      ['Produto', 'Categoria', 'Vendas'],
      ...realTopProducts.map(product => [
        product.name,
        product.category,
        product.sales.toString()
      ]),
      [],
      ['DESPESAS POR CATEGORIA'],
      ['Categoria', 'Valor', 'Percentagem'],
      ...expensePieData.map(expense => [
        expense.name,
        expense.value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
        expense.percentage.toFixed(1) + '%'
      ])
    ];
    
    // Converter para CSV
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
      };

  // REMOVER ARRAY DE DADOS FICTÍCIOS - APENAS USAR DADOS REAIS
  // const topProducts = [
  //   { name: 'Muamba de Galinha', sales: 450, category: 'Pratos Principais' },
  //   { name: 'Caldo de Mancarra', sales: 380, category: 'Pratos Principais' },
  //   { name: 'Fufu com Carne', sales: 320, category: 'Pratos Principais' },
  //   { name: 'Ginga com Coca-Cola', sales: 280, category: 'Bebidas' },
  //   { name: 'Cuscuza', sales: 180, category: 'Petiscos' }
  // ];

  // Alertas inteligentes
  const alerts = useMemo(() => {
    const alertList: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];
    
    if (realMetrics.totalSalesToday === 0 && !isLoading) {
      alertList.push({ type: 'info', title: 'Sem Vendas Hoje', message: 'Ainda não foram registadas vendas hoje.' });
    }
    
    if (realMetrics.totalExpensesToday > 0 && realMetrics.totalSalesToday > 0) {
      const ratio = realMetrics.totalExpensesToday / realMetrics.totalSalesToday;
      if (ratio > 0.7) {
        alertList.push({ type: 'danger', title: 'Despesas Elevadas', message: `Despesas representam ${Math.round(ratio * 100)}% da faturação. Rever custos.` });
      } else if (ratio > 0.5) {
        alertList.push({ type: 'warning', title: 'Atenção aos Custos', message: `Despesas a ${Math.round(ratio * 100)}% da faturação.` });
      }
    }
    
    if (realMetrics.totalOrdersToday > 0 && realMetrics.ticketMedio < 2000) {
      alertList.push({ type: 'warning', title: 'Ticket Médio Baixo', message: `Ticket médio de ${formatKz(realMetrics.ticketMedio)}. Considerar up-selling.` });
    }
    
    return alertList;
  }, [realMetrics, isLoading]);

  // Período label
  const periodLabels: Record<string, string> = { today: 'Hoje', yesterday: 'Ontem', dayBefore: 'Anteontem', week: '7 Dias', month: 'Mensal' };

  // Skeleton component
  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
  );

  return (
    <div className="p-6 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Header Modernizado */}
      <header className="flex justify-between items-center mb-6 animate-in fade-in duration-500">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Live</span>
            </div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Business Intelligence</span>
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Analytics</h2>
          {lastUpdate && (
            <p className="text-[10px] text-slate-600 mt-0.5">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date Range Pills */}
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl">
            {['Hoje', 'Últimos 7 dias', 'Últimos 30 dias', 'Mês Atual'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  dateRange === range ? 'bg-primary text-black shadow-glow' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button 
            onClick={exportToCSV}
            className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
            title="Exportar CSV (E)"
          >
            <Download size={14} />
            CSV
          </button>
          
          <button 
            onClick={() => { setIsLoading(true); window.location.reload(); }}
            className="p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-400 hover:text-primary transition-all"
            title="Atualizar (R)"
            aria-label="Atualizar dados"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Alertas Inteligentes */}
      {alerts.length > 0 && !isLoading && (
        <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top duration-300">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${
                alert.type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              <AlertCircle size={16} className="shrink-0" />
              <div>
                <p className="text-xs font-black">{alert.title}</p>
                <p className="text-[10px] opacity-80">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumo Executivo */}
      {!isLoading && realMetrics.totalSalesToday > 0 && (
        <div className="mb-4 px-5 py-3 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-transparent border border-primary/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom duration-500">
          <Sparkles size={18} className="text-primary shrink-0" />
          <p className="text-sm text-slate-300">
            <span className="font-black text-white">Hoje:</span> {realMetrics.totalOrdersToday} vendas •
            <span className="font-black text-primary"> {formatKz(realMetrics.totalSalesToday)}</span> faturação •
            <span className={`font-black ${realMetrics.lucroBruto >= 0 ? 'text-green-400' : 'text-red-400'}`}> {formatKz(realMetrics.lucroBruto)}</span> lucro bruto
          </p>
        </div>
      )}

      {/* KPIs Redesenhados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          kpis.map((kpi, index) => (
            <div
              key={index}
              className="relative p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden group hover:border-white/15 transition-all animate-fade-in-up"
              ref={(el) => { if (el) { el.style.animationDelay = `${index * 0.08}s`; } }}
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${kpi.trend === 'up' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-orange-500'}`} />
              
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.trend === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {kpi.icon}
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black ${kpi.trend === 'up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {kpi.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {kpi.change}
                </div>
              </div>
              
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.title}</p>
              <p className="text-xl font-black text-white">{kpi.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Gráficos Modernizados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Gráfico de Pizza */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <PieChart size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Despesas por Categoria</h3>
          </div>
          {isLoading ? (
            <Skeleton className="h-56" />
          ) : expensePieData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <PieChart size={28} className="text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-500">Sem despesas registadas</p>
              <p className="text-xs text-slate-600 mt-1">As despesas aparecerão aqui quando forem adicionadas</p>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <defs>
                    {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
                      <linearGradient key={name} id={`grad-${name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#grad-${entry.name})`}
                        stroke={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]}
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatKz(value), '']}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8', fontSize: '10px' }}
                    formatter={(value: string, entry: any) => {
                      const categoryName = entry.payload?.name || value || 'OUTROS';
                      const percentage = entry.payload?.percentage || 0;
                      return `${categoryName}: ${percentage.toFixed(1)}%`;
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico de Área */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-red-400" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Evolução de Despesas (30d)</h3>
          </div>
          {isLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenseAreaData}>
                  <defs>
                    <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#475569" tick={{ fill: '#475569', fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [formatKz(value), '']}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} fill="url(#grad-expense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tabelas Modernizadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Produtos com Medalhas */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Crown size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Top Produtos</h3>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : realTopProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <TrendingUp size={28} className="text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-500">Aguardando vendas reais</p>
                <p className="text-xs text-slate-600 mt-1">Os produtos mais vendidos aparecerão aqui</p>
              </div>
            ) : (
              realTopProducts.map((product: any, index: number) => {
                const maxSales = realTopProducts[0]?.sales || 1;
                const percentage = (product.sales / maxSales) * 100;
                const medalIcon = index === 0 ? <Crown size={14} className="text-amber-400" /> :
                                  index === 1 ? <Medal size={14} className="text-slate-300" /> :
                                  index === 2 ? <Award size={14} className="text-orange-400" /> : null;
                return (
                  <div key={index} className="p-3 bg-white/[0.02] rounded-xl hover:bg-white/[0.05] transition-all group animate-fade-in-up" ref={(el) => { if (el) { el.style.animationDelay = `${index * 0.1}s`; } }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {medalIcon || <span className="w-3.5 text-center text-[10px] font-black text-slate-600">{index + 1}</span>}
                        <div>
                          <p className="text-sm font-bold text-white">{product.name}</p>
                          <p className="text-[10px] text-slate-500">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{product.sales}</p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest">unidades</p>
                      </div>
                    </div>
                    <ProgressBar percentage={percentage} className="h-1" barClassName="bg-gradient-to-r from-primary to-cyan-400" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Venda por Produto Melhorada */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShoppingCart size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Venda por Produto</h3>
            </div>
            
            {/* Period Tabs Animadas */}
            <div className="flex gap-0.5 p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.05]">
              {[
                { key: 'today', label: 'Hoje' },
                { key: 'yesterday', label: 'Ontem' },
                { key: 'dayBefore', label: 'Anteont.' },
                { key: 'week', label: '7 Dias' },
                { key: 'month', label: 'Mês' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setProductPeriod(period.key as 'today' | 'yesterday' | 'dayBefore' | 'week' | 'month')}
                  className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                    productPeriod === period.key
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Lista com scroll */}
          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : productSalesByPeriod.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <ShoppingCart size={28} className="text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-500">Sem vendas no período</p>
                <p className="text-xs text-slate-600 mt-1">Nenhuma venda registada em {periodLabels[productPeriod]}</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 px-2 sticky top-0 bg-[#0f1117] py-2 z-10 border-b border-white/5">
                  <span>Produto</span>
                  <span>Total / Qtd</span>
                </div>
                {productSalesByPeriod.map((product: any, index: number) => {
                  const maxTotal = productSalesByPeriod[0]?.totalValue || 1;
                  const percentage = (product.totalValue / maxTotal) * 100;
                  return (
                    <div
                      key={index}
                      className="relative p-3 bg-white/[0.02] rounded-xl hover:bg-white/[0.05] transition-all overflow-hidden animate-fade-in-up-fast"
                      ref={(el) => { if (el) { el.style.animationDelay = `${index * 0.05}s`; } }}
                    >
                      {/* Barra de fundo */}
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl pointer-events-none w-0"
                        ref={(el) => { if (el) { el.style.width = `${percentage}%`; } }}
                      />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{product.name}</p>
                          <p className="text-[10px] text-slate-500">{product.quantity} unidades</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">{formatKz(product.totalValue)}</p>
                          <p className="text-[9px] text-slate-600 uppercase tracking-widest">{product.quantity} vendas</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
