import React, { useState, useEffect, useMemo } from 'react';
import { useSyncCore } from '../hooks/useSyncCore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, AlertTriangle, Brain, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PerformanceAnalytics = () => {
  // 🚀 CONECTAR AO MOTOR SYNC CORE
  const {
    totalRevenue,
    totalExpenses,
    staffCosts,
    netProfit,
    alerts,
    predictions,
    isLoading: syncLoading,
    recalculate
  } = useSyncCore();

  const [loading, setLoading] = useState(false);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);

  // 📊 CORES DO PETROLEUM GREEN THEME
  const colors = {
    primary: '#10b981',
    secondary: '#f59e0b',
    danger: '#ef4444',
    warning: '#f97316',
    success: '#22c55e',
    info: '#3b82f6',
    dark: '#1f2937',
    light: '#f3f4f6'
  };

  const pieColors = [
    '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'
  ];

  // 📈 CARREGAR DADOS DIÁRIOS PARA GRÁFICO DE LINHAS
  const fetchDailyData = async () => {
    try {
      setLoading(true);
      
      // Buscar últimos 30 dias de orders
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'pending')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Buscar últimos 30 dias de cash_flow (saídas)
      const { data: cashFlowData } = await supabase
        .from('cash_flow')
        .select('amount, created_at, category')
        .eq('type', 'saida')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Processar dados diários
      const dailyMap = new Map();
      
      // Processar vendas
      ordersData?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('pt-AO');
        const current = dailyMap.get(date) || { date, revenue: 0, expenses: 0 };
        current.revenue += Number(order.total_amount) || 0;
        dailyMap.set(date, current);
      });

      // Processar saídas
      cashFlowData?.forEach(cashFlow => {
        const date = new Date(cashFlow.created_at).toLocaleDateString('pt-AO');
        const current = dailyMap.get(date) || { date, revenue: 0, expenses: 0 };
        current.expenses += Number(cashFlow.amount) || 0;
        dailyMap.set(date, current);
      });

      const dailyArray = Array.from(dailyMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Últimos 30 dias

      setDailyData(dailyArray);
      
      // 🍕 PROCESSAR CATEGORIAS PARA GRÁFICO DE PIZZA
      const categoryMap = new Map();
      cashFlowData?.forEach(cashFlow => {
        const category = cashFlow.category || 'Outras';
        const current = categoryMap.get(category) || { name: category, value: 0 };
        current.value += Number(cashFlow.amount) || 0;
        categoryMap.set(category, current);
      });

      const categoryArray = Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value);

      setCategoryBreakdown(categoryArray);
      
    } catch (error) {
      console.error('[PERFORMANCE] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, []);

  // 🧠 MÉTRICAS DE PERFORMANCE
  const performanceMetrics = useMemo(() => {
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    const efficiency = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    
    return {
      profitMargin,
      expenseRatio,
      efficiency,
      dailyAverage: predictions.dailyAverage,
      monthlyProjection: predictions.monthlyForecast,
      monthEndProjection: predictions.projectedMonthEnd
    };
  }, [totalRevenue, totalExpenses, netProfit, predictions]);

  // 🎨 FORMATADORES
  const formatKz = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // 🔄 ATUALIZAR DADOS
  const handleRefresh = async () => {
    await recalculate();
    await fetchDailyData();
  };

  if (syncLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 CABEÇALHO */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Performance Analytics
          </h3>
          <p className="text-white/60 text-sm">Análise detalhada de performance financeira</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-primary/20 transition-all"
        >
          Atualizar Dados
        </button>
      </div>

      {/* 🎯 CARDS DE PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Previsão Mensal */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3 text-primary text-[9px] font-black uppercase tracking-[0.2em]">
            <Brain className="w-4 h-4" />
            Previsão Mensal
          </div>
          <p className="text-lg font-mono font-bold text-white text-glow">
            {formatKz(performanceMetrics.monthlyProjection)}
          </p>
          <div className="mt-2 text-[9px] text-primary/80 font-bold">
            Média diária: {formatKz(performanceMetrics.dailyAverage)}
          </div>
        </div>

        {/* Margem de Lucro */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            <Target className="w-4 h-4" />
            Margem de Lucro
          </div>
          <p className="text-lg font-mono font-bold text-white">
            {formatPercent(performanceMetrics.profitMargin)}
          </p>
          <div className="mt-2 text-[9px] text-emerald-500 font-bold flex items-center gap-1">
            {performanceMetrics.profitMargin >= 20 ? (
              <TrendingUp className="w-3 h-3" />
            ) : performanceMetrics.profitMargin >= 10 ? (
              <Activity className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {performanceMetrics.profitMargin >= 20 ? 'Saudável' : 
             performanceMetrics.profitMargin >= 10 ? 'Atenção' : 'Crítico'}
          </div>
        </div>

        {/* Eficiência Operacional */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            <Activity className="w-4 h-4" />
            Eficiência
          </div>
          <p className="text-lg font-mono font-bold text-white">
            {formatPercent(performanceMetrics.efficiency)}
          </p>
          <div className="mt-2 text-[9px] text-blue-500 font-bold">
            Revenues vs Despesas
          </div>
        </div>

        {/* Projeção de Fecho */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            <DollarSign className="w-4 h-4" />
            Fecho Previsto
          </div>
          <p className="text-lg font-mono font-bold text-white">
            {formatKz(performanceMetrics.monthEndProjection)}
          </p>
          <div className="mt-2 text-[9px] text-amber-500 font-bold">
            Final do mês
          </div>
        </div>
      </div>

      {/* 🚨 ALERTAS */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border flex items-center gap-3 ${
                alert.type === 'danger' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : alert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">{alert.title}</p>
                <p className="text-xs opacity-80">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📈 GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linhas - Vendas vs Despesas */}
        <div className="glass-panel p-6 rounded-xl">
          <h4 className="text-lg font-bold text-white mb-4">Vendas vs Despesas Diárias</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatKz(value), '']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke={colors.primary} 
                strokeWidth={2}
                name="Vendas"
                dot={{ fill: colors.primary, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke={colors.danger} 
                strokeWidth={2}
                name="Despesas"
                dot={{ fill: colors.danger, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pizza - Breakdown de Despesas */}
        <div className="glass-panel p-6 rounded-xl">
          <h4 className="text-lg font-bold text-white mb-4">Breakdown de Despesas por Categoria</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [formatKz(value), 'Valor']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
