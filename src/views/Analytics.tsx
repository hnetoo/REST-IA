import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Users, Calendar, Download, Filter, BarChart3,
  PieChart, Activity
} from 'lucide-react';

const Analytics = () => {
  const { settings, activeOrders, menu } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');
  const [loading, setLoading] = useState(false);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 2 
  }).format(val);

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

  const kpis = [
    {
      title: 'Vendas Hoje',
      value: formatKz(1250000),
      change: '+12.5%',
      trend: 'up',
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      title: 'Ticket Médio',
      value: formatKz(8500),
      change: '+3.2%',
      trend: 'up',
      icon: <DollarSign className="w-5 h-5" />
    },
    {
      title: 'Custo de Compras',
      value: formatKz(450000),
      change: '-5.8%',
      trend: 'down',
      icon: <ShoppingCart className="w-5 h-5" />
    },
    {
      title: 'Lucro Bruto',
      value: formatKz(800000),
      change: '+18.3%',
      trend: 'up',
      icon: <TrendingUp className="w-5 h-5" />
    }
  ];

  const salesData = [
    { month: 'Jan', sales: 980000, purchases: 120000 },
    { month: 'Fev', sales: 1200000, purchases: 150000 },
    { month: 'Mar', sales: 1100000, purchases: 110000 },
    { month: 'Abr', sales: 1350000, purchases: 180000 },
    { month: 'Mai', sales: 1500000, purchases: 200000 },
    { month: 'Jun', sales: 1400000, purchases: 160000 },
    { month: 'Jul', sales: 1600000, purchases: 140000 },
    { month: 'Ago', sales: 1800000, purchases: 170000 },
    { month: 'Set', sales: 1750000, purchases: 190000 },
    { month: 'Out', sales: 1650000, purchases: 180000 },
    { month: 'Nov', sales: 1900000, purchases: 200000 },
    { month: 'Dez', sales: 2100000, purchases: 220000 }
  ];

  const categoryData = [
    { name: 'Pratos Principais', value: 45, color: '#06b6d4' },
    { name: 'Bebidas', value: 25, color: '#10b981' },
    { name: 'Sobremesas', value: 20, color: '#f59e0b' },
    { name: 'Petiscos', value: 10, color: '#8b5cf6' }
  ];

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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Vendas vs Compras */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <BarChart3 size={20} className="text-[#06b6d4]" />
            Vendas vs Compras
          </h3>
          <div className="h-64 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
              <p>Gráfico de barras será implementado com Recharts</p>
            </div>
          </div>
        </div>

        {/* Categorias mais vendidas */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <PieChart size={20} className="text-[#10b981]" />
            Categorias mais Vendidas
          </h3>
          <div className="space-y-4">
            {categoryData.map((cat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-xl" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-white text-sm">{cat.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{cat.value}%</p>
                  <p className="text-xs text-slate-500">{cat.value === 45 ? '+5%' : cat.value === 25 ? '-2%' : '0%'}</p>
                </div>
              </div>
            ))}
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
