import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Calendar, Download, Filter, TrendingUp, TrendingDown, 
  PieChart, BarChart3, DollarSign, FileText, Users
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

const ExpenseReports = () => {
  const { expenses, settings, addNotification, loadExpenses } = useStore();
  const [dateRange, setDateRange] = useState('Hoje');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Formatação de moeda
  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 2 
  }).format(val);

  // Garantir despesas reais e com categoria (Supabase-first)
  useEffect(() => {
    if (!navigator.onLine) return;
    loadExpenses().catch(() => {});
  }, [loadExpenses]);

  // Filtrar despesas por período
  const filteredExpenses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    let startDateFilter: Date;
    let endDateFilter: Date;

    switch (dateRange) {
      case 'Hoje':
        startDateFilter = new Date(today);
        endDateFilter = new Date(today);
        endDateFilter.setDate(endDateFilter.getDate() + 1);
        break;
      case '7 dias':
        startDateFilter = new Date(now);
        startDateFilter.setDate(startDateFilter.getDate() - 7);
        endDateFilter = new Date(now);
        endDateFilter.setDate(endDateFilter.getDate() + 1);
        break;
      case '30 dias':
        startDateFilter = new Date(now);
        startDateFilter.setDate(startDateFilter.getDate() - 30);
        endDateFilter = new Date(now);
        endDateFilter.setDate(endDateFilter.getDate() + 1);
        break;
      case 'Personalizado':
        if (startDate && endDate) {
          startDateFilter = new Date(startDate);
          endDateFilter = new Date(endDate);
          endDateFilter.setDate(endDateFilter.getDate() + 1);
        } else {
          return [];
        }
        break;
      default:
        return [];
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDateFilter && expenseDate < endDateFilter;
    });
  }, [expenses, dateRange, startDate, endDate]);

  // Agrupar por categoria
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { total: number; count: number; items: typeof expenses }> = {};
    
    filteredExpenses.forEach(expense => {
      if (!grouped[expense.category]) {
        grouped[expense.category] = { total: 0, count: 0, items: [] };
      }
      grouped[expense.category].total += expense.amount;
      grouped[expense.category].count += 1;
      grouped[expense.category].items.push(expense);
    });

    return Object.entries(grouped).map(([category, data]) => ({
      category,
      ...data,
      percentage: 0 // Será calculado depois
    }));
  }, [filteredExpenses]);

  // Calcular impacto percentual
  const totalExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  const expensesWithImpact = expensesByCategory.map(cat => ({
    ...cat,
    percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
  }));

  // Dados para gráfico de pizza
  const pieData = expensesWithImpact.map(cat => ({
    name: cat.category,
    value: cat.total,
    percentage: cat.percentage
  }));

  // Dados para gráfico de área (últimos 30 dias)
  const areaChartData = useMemo(() => {
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
      const expenseDate = expense.date?.split('T')[0];
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

  // Exportar PDF
  const handleExportPDF = () => {
    // TODO: Implementar exportação PDF com jsPDF
    addNotification('info', 'Funcionalidade de exportação PDF em desenvolvimento');
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Relatórios de Despesas</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Análise Financeira Detalhada</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:border-[#06b6d4]"
            aria-label="Selecionar intervalo de datas"
          >
            <option value="Hoje">Hoje</option>
            <option value="7 dias">Últimos 7 dias</option>
            <option value="30 dias">Últimos 30 dias</option>
            <option value="Personalizado">Personalizado</option>
          </select>
          
          {dateRange === 'Personalizado' && (
            <div className="flex gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#06b6d4]"
                aria-label="Data início"
              />
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-[#06b6d4]"
                aria-label="Data fim"
              />
            </div>
          )}
          
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-[#06b6d4] text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-red-500/10">
              <DollarSign className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Total Despesas</p>
              <p className="text-2xl font-bold text-white">{formatKz(totalExpenses)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Nº de Despesas</p>
              <p className="text-2xl font-bold text-white">{filteredExpenses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Média por Despesa</p>
              <p className="text-2xl font-bold text-white">
                {formatKz(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Pizza */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <PieChart size={20} className="text-[#10b981]" />
            Distribuição por Categoria
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    formatKz(value),
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

        {/* Gráfico de Área */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp size={20} className="text-[#06b6d4]" />
            Evolução das Despesas (30 dias)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData}>
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
                    formatKz(value),
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

      {/* Tabela Detalhada */}
      <div className="glass-panel p-8 rounded-2xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
          <FileText size={20} className="text-[#f59e0b]" />
          Despesas Detalhadas por Categoria
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white font-black uppercase text-xs">Categoria</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Quantidade</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Valor Total</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Impacto %</th>
                <th className="text-left p-3 text-white font-black uppercase text-xs">Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expensesWithImpact.map((category, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 text-white font-bold">{category.category}</td>
                  <td className="p-3 text-slate-400">{category.count}</td>
                  <td className="p-3 text-emerald-500 font-mono font-bold">{formatKz(category.total)}</td>
                  <td className="p-3 text-orange-500 font-mono">{category.percentage.toFixed(1)}%</td>
                  <td className="p-3 text-slate-400 font-mono">
                    {formatKz(category.count > 0 ? category.total / category.count : 0)}
                  </td>
                </tr>
              ))}
              {expensesWithImpact.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                    Nenhuma despesa encontrada no período selecionado
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-primary/20">
                <td colSpan={2} className="p-3 text-primary font-black">TOTAL</td>
                <td className="p-3 text-emerald-500 font-mono font-bold">{formatKz(totalExpenses)}</td>
                <td className="p-3 text-orange-500 font-mono font-bold">100.0%</td>
                <td className="p-3 text-slate-400 font-mono">
                  {formatKz(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReports;
