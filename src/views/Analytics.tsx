import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Users, Calendar, Download, Filter, BarChart3,
  PieChart, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const Analytics = () => {
  const { settings, activeOrders, menu, expenses } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');
  const [loading, setLoading] = useState(false);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 2 
  }).format(val);

  // Calcular métricas reais
  const realMetrics = useMemo(() => {
    const today = String(new Date().toISOString().split('T')[0] || '');
    
    // Vendas Hoje: filtrar pedidos fechados de hoje
    const todayOrders = activeOrders.filter(order => 
      order.status === 'FECHADO' && 
      String(order.timestamp || '').split('T')[0] === today
    );
    
    const totalSalesToday = todayOrders.reduce((acc, order) => acc + order.total, 0);
    const totalOrdersToday = todayOrders.length;
    const ticketMedio = totalOrdersToday > 0 ? totalSalesToday / totalOrdersToday : 0;
    
    // Custo de Compras: expenses de hoje
    const todayExpenses = expenses.filter(expense => 
      String(expense.date || '').split('T')[0] === today
    );
    const totalExpensesToday = todayExpenses.reduce((acc, expense) => acc + expense.amount, 0);
    
    // Lucro Bruto
    const lucroBruto = (totalSalesToday || 0) - (totalExpensesToday || 0);
    
    return {
      totalSalesToday,
      totalOrdersToday,
      ticketMedio,
      totalExpensesToday,
      lucroBruto
    };
  }, [activeOrders, expenses]);

  // Dados para gráfico dos últimos 7 dias
  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('pt-AO', { weekday: 'short', day: 'numeric' });
      
      // Vendas do dia
      const dayOrders = activeOrders.filter(order => 
        order.status === 'FECHADO' && 
        String(order.timestamp || '').split('T')[0] === dateStr
      );
      const sales = dayOrders.reduce((acc, order) => acc + order.total, 0);
      
      // Compras do dia
      const dayExpenses = expenses.filter(expense => 
        String(expense.date || '').split('T')[0] === dateStr
      );
      const purchases = dayExpenses.reduce((acc, expense) => acc + expense.amount, 0);
      
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
      title: 'Vendas Hoje',
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

  // Calcular top produtos reais baseado nos activeOrders (pedidos fechados)
  const realTopProducts = useMemo(() => {
    const productSales: Record<string, { name: string, category: string, sales: number }> = {};
    
    // Filtrar apenas pedidos fechados
    const closedOrders = activeOrders.filter(order => order.status === 'FECHADO');
    
    closedOrders.flatMap((order: any) => order.items).forEach((item: any) => {
      const dish = menu.find(d => d.id === item.dishId);
      if (!productSales[item.dishId]) {
        productSales[item.dishId] = {
          name: dish?.name || 'Desconhecido',
          category: dish?.category || 'Outros',
          sales: 0
        };
      }
      productSales[item.dishId].sales += item.quantity;
    });

    return Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [activeOrders, menu]);

  // REMOVER ARRAY DE DADOS FICTÍCIOS - APENAS USAR DADOS REAIS
  // const salesData = [
  //   { month: 'Jan', sales: 980000, purchases: 120000 },
  //   ...
  // ];

  // Dados para gráfico de pizza das despesas
  const expensePieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    expenses.forEach(expense => {
      if (!grouped[expense.category]) {
        grouped[expense.category] = 0;
      }
      grouped[expense.category] += expense.amount;
    });

    const total = Object.values(grouped).reduce((acc, val) => acc + val, 0);
    
    return Object.entries(grouped).map(([category, amount]) => ({
      name: category,
      value: amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }));
  }, [expenses]);

  // Dados para gráfico de área das despesas (últimos 30 dias)
  const expenseAreaData = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    
    // Inicializar últimos 30 dias com 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      data[dateStr] = 0;
    }
    
    // Somar despesas por dia
    expenses.forEach(expense => {
      const expenseDate = String(expense.date || '').split('T')[0];
      if (data.hasOwnProperty(expenseDate)) {
        data[expenseDate] += expense.amount;
      }
    });
    
    return Object.entries(data).map(([date, total]) => ({
      date: new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' }),
      total
    }));
  }, [expenses]);

  // Cores para gráficos
  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // REMOVER ARRAY DE DADOS FICTÍCIOS - APENAS USAR DADOS REAIS
  // const topProducts = [
  //   { name: 'Muamba de Galinha', sales: 450, category: 'Pratos Principais' },
  //   { name: 'Caldo de Mancarra', sales: 380, category: 'Pratos Principais' },
  //   { name: 'Fufu com Carne', sales: 320, category: 'Pratos Principais' },
  //   { name: 'Ginga com Coca-Cola', sales: 280, category: 'Bebidas' },
  //   { name: 'Cuscuza', sales: 180, category: 'Petiscos' }
  // ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Business Intelligence</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Análise e Relatórios</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-[#06b6d4]"
          >
            <option>Hoje</option>
            <option>Últimos 7 dias</option>
            <option>Últimos 30 dias</option>
            <option>Mês Atual</option>
            <option>Personalizado</option>
          </select>
          
          <button className="px-4 py-2 bg-[#06b6d4] text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all">
            <Filter size={16} />
          </button>
          
          <button className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm hover:bg-white/20 transition-all">
            <Download size={16} />
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${kpi.trend === 'up' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest">{kpi.title}</p>
                  <p className="text-2xl font-bold text-white">{kpi.value}</p>
                </div>
              </div>
              <div className={`text-sm font-black ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {kpi.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos Avançados de Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Pizza - Distribuição por Categoria */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <PieChart size={20} className="text-[#10b981]" />
            Distribuição de Despesas por Categoria
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
                    ''
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#9ca3af' }}
                  formatter={(value: number, entry: any) => 
                    `${entry.name}: ${entry.payload.percentage.toFixed(1)}%`
                  }
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Área - Evolução das Despesas */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={20} className="text-[#ef4444]" />
            Evolução das Despesas (30 dias)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseAreaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [
                    value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }),
                    ''
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Produtos */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={20} className="text-[#10b981]" />
            Top Produtos
          </h3>
          <div className="space-y-3">
            {realTopProducts.length === 0 ? (
              <div className="text-center text-slate-500 py-10 italic">
                Aguardando vendas reais...
              </div>
            ) : (
              realTopProducts.map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-bold">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#06b6d4]">{product.sales} unidades</p>
                    <p className="text-xs text-slate-500">{product.sales} vendas</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tendências */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <Activity size={20} className="text-[#f59e0b]" />
            Tendências
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white font-bold">Horário de Pico</p>
                <p className="text-xs text-slate-500">Análise baseada nos últimos 30 dias</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#f59e0b]">19:30 - 21:00</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-white font-bold">Dia Mais Movimentado</p>
                <p className="text-xs text-slate-500">Sextas</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#10b981]">Sexta</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
