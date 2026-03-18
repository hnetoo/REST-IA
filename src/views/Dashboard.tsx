
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { DollarSign, ShoppingBag, Users, TrendingUp, Sparkles, Loader2, Activity, Target, Zap, ChefHat, MonitorOff, Printer, History, PieChart } from 'lucide-react';
import { AIAnalysisResult, Order } from '../../types';
import { supabase } from '../lib/supabaseService';
import { printFinanceReport, printThermalInvoice } from '../lib/printService';

const Dashboard = () => {
  const { activeOrders, customers, menu, settings, addNotification, expenses, loadExpenses, employees, loadEmployees } = useStore();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  // LIMPEZA DE LOCALSTORAGE - CONFIAR APENAS NA DB
  useEffect(() => {
    // Limpar valores financeiros antigos guardados no navegador
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('vendas') || key.includes('revenue') || key.includes('sales') || key.includes('lucro') || key.includes('metrics'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Limpar sessionStorage também
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('vendas') || key.includes('revenue') || key.includes('sales') || key.includes('lucro') || key.includes('metrics'))) {
        sessionStorage.removeItem(key);
      }
    }
    
    console.log('[DASHBOARD PRINCIPAL] Limpeza de cache local concluída:', keysToRemove.length, 'itens removidos');
  }, []); // Executar apenas na montagem

  // PROIBIÇÃO: Removida função getDateRangeToday - Base de dados é autoridade

  const closedOrders = useMemo(() => activeOrders.filter(o => ['FECHADO', 'closed', 'paid'].includes(o.status)), [activeOrders]);
  
  // CARREGAR MÉTRICAS
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // VERIFICAÇÃO DE RLS - VALIDAR SESSÃO ANTES DE BUSCAR DADOS
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('[DASHBOARD PRINCIPAL] Sessão inválida:', sessionError);
          // Forçar re-login se sessão inválida
          addNotification('error', 'Sessão expirada. Por favor, faça login novamente.');
          return;
        }
        
        console.log('[DASHBOARD PRINCIPAL] Sessão válida:', session.user.email);
        
        // Carregar despesas e funcionários do Supabase primeiro
        await loadExpenses();
        await loadEmployees();
        
        // BUSCAR VENDAS DE HOJE - CHAMADA RPC COM CACHE-BUSTING AGRESSIVO
        let vendasHoje = 0;
        try {
          // PROIBIÇÃO: Removido qualquer cálculo de data com new Date()
          // A base de dados é a única autoridade
          const cacheBuster = Date.now(); // Cache-buster único
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('fetch_vendas_hoje')
            .setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            .setHeader('Pragma', 'no-cache')
            .setHeader('Expires', '0');

          if (!rpcError && rpcData !== null) {
            vendasHoje = Number(rpcData) || 0;
            
            console.log('[DASHBOARD PRINCIPAL] RPC fetch_vendas_hoje:', {
              total: vendasHoje,
              source: 'Supabase SQL com timezone Africa/Luanda',
              sql: "WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Luanda')::date = (NOW() AT TIME ZONE 'Africa/Luanda')::date",
              cacheBuster,
              headers: 'Cache-Control: no-cache, no-store, must-revalidate'
            });
          } else {
            console.error('[DASHBOARD PRINCIPAL] Erro RPC fetch_vendas_hoje:', rpcError);
          }
        } catch (rpcError) {
          console.error('[DASHBOARD PRINCIPAL] Erro crítico RPC:', rpcError);
        }
        
        // Calcular despesas do dia usando os dados carregados
        const today = new Date().toISOString().split('T')[0]; // Data atual para despesas
        const todayExpenses = expenses.filter(exp => String(exp.createdAt || '').split('T')[0] === today);
        const totalExpenses = todayExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
        
        // Calcular folha salarial usando os funcionários carregados
        const totalPayroll = employees.reduce((acc, emp) => acc + Number(emp.salary || 0), 0);
        
        // RENDIMENTO GLOBAL: Usar mesma fonte que Lucro Hoje (RPC)
        const totalSales = vendasHoje; // SINCRONIZADO: mesma fonte que vendas de hoje
        
        // BUSCAR HISTÓRICO FINANCEIRO PARA RENDIMENTO GLOBAL
        let historicoFinanceiro = 0;
        try {
          const { data: financialHistoryData, error: financialHistoryError } = await supabase
            .from('financial_history')
            .select('receita_total');

          if (!financialHistoryError && financialHistoryData) {
            historicoFinanceiro = financialHistoryData.reduce((acc, item) => acc + (Number(item.receita_total) || 0), 0);
            console.log('[DASHBOARD PRINCIPAL] Histórico financeiro:', historicoFinanceiro);
          }
        } catch (financialError) {
          console.error('[DASHBOARD PRINCIPAL] Erro ao buscar histórico financeiro:', financialError);
        }

        // BUSCAR BUSINESS_STATS PARA RENDIMENTO GLOBAL
        let businessStatsRevenue = 0;
        try {
          const { data: businessStatsData, error: businessStatsError } = await supabase
            .from('business_stats')
            .select('total_revenue')
            .single();

          if (!businessStatsError && businessStatsData) {
            businessStatsRevenue = Number(businessStatsData.total_revenue) || 0;
            console.log('[DASHBOARD PRINCIPAL] Business stats revenue:', businessStatsRevenue);
          }
        } catch (businessError) {
          console.error('[DASHBOARD PRINCIPAL] Erro ao buscar business_stats:', businessError);
        }

        // RENDIMENTO GLOBAL: Histórico financeiro + business_stats + vendas atuais
        const rendimentoGlobal = historicoFinanceiro + businessStatsRevenue + (totalSales || 0);
        
        const mockMetrics = {
          totalVendas: totalSales, // Vendas de hoje apenas
          despesas: totalExpenses,
          folhaSalarial: totalPayroll,
          lucroLiquido: (totalSales || 0) - (totalExpenses || 0) - (totalPayroll || 0) - ((totalSales || 0) * 0.065 || 0),
          rendimentoGlobal: rendimentoGlobal // NOVO: Rendimento Global consolidado
        };
        
        setMetrics(mockMetrics);
        console.log('[DASHBOARD PRINCIPAL] Métricas sincronizadas com Owner Hub:', mockMetrics);
        
      } catch (error) {
        console.error('[DASHBOARD PRINCIPAL] Erro ao carregar métricas:', error);
        setMetrics(null);
      }
    };
    
    fetchMetrics();
  }, [closedOrders, expenses, loadExpenses, employees, loadEmployees]);
  
  // ATUALIZAÇÃO EM TEMPO REAL - SUPABASE CHANNEL
  useEffect(() => {
    // Canal para ouvir mudanças nas ordens
    const channel = supabase
      .channel('dashboard-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('[DASHBOARD PRINCIPAL] Mudança detectada em orders:', payload);
          // Disparar RPC fetch_vendas_hoje novamente para atualizar sem refresh
          fetchMetrics();
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Executar apenas uma vez
  
  // USAR DADOS DO STORE GLOBAL (Owner Dashboard) para consistência
  const todayMetrics = useMemo(() => {
    // Se temos métricas globais, usar os dados reais calculados
    if (metrics && metrics.totalVendas > 0) {
      const today = new Date().toISOString().split('T')[0]; // Data atual para despesas
      const orders = closedOrders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === today);
      
      // FATURAÇÃO HOJE: Query SEPARADA - Apenas vendas de 18/03/2026
      const hojeWAT = new Date().toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
      const vendasHojeFiltradas = orders.filter(order => {
        const dataOrder = new Date(order.timestamp).toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
        return dataOrder === hojeWAT;
      });
      
      const faturacaoHoje = vendasHojeFiltradas.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      
      console.log('[DASHBOARD PRINCIPAL] FATURAÇÃO HOJE (SEPARADA):', {
        hojeWAT, // "18/03/2026"
        totalOrders: orders.length,
        vendasHojeFiltradas: vendasHojeFiltradas.length,
        faturacaoHoje,
        totalVendasGlobal: metrics.totalVendas // RENDIMENTO GLOBAL (diferente)
      });
      
      return { 
        revenue: faturacaoHoje, // FATURAÇÃO HOJE (independente)
        profit: (faturacaoHoje || 0) - (0) - (0) - ((faturacaoHoje || 0) * 0.065 || 0),
        count: vendasHojeFiltradas.length, 
        orders: vendasHojeFiltradas 
      };
    }
    
    // Fallback para cálculo local (se não tiver métricas globais)
    const today = new Date().toISOString().split('T')[0]; // Data atual sem cálculos complexos
    
    // VERIFICAÇÃO DE SEGURANÇA - EVITAR CRASH
    if (!closedOrders || !Array.isArray(closedOrders)) {
      console.log('[DASHBOARD PRINCIPAL] closedOrders é nulo ou inválido, retornando valores zerados');
      return { revenue: 0, profit: 0, count: 0, orders: [] };
    }
    
    const orders = closedOrders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === today);
    const revenue = orders.reduce((acc, o) => acc + Number(o.total || 0), 0); // ELIMINAR NaN
    const profit = (revenue || 0) - (0) - (0) - ((revenue || 0) * 0.065 || 0);
    return { revenue, profit, count: orders.length, orders };
  }, [closedOrders, metrics]); // REMOVIDO today DEPENDÊNCIA

  const recentInvoices = useMemo(() => {
    return [...closedOrders]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [closedOrders]);

  // RENDIMENTO GLOBAL: Soma total histórica (MANTER COM ESTÁ - NÃO MOVER)
  const totalSales = closedOrders.reduce((acc, o) => acc + (o.total || 0), 0); 
  const activeOrderCount = activeOrders.filter(o => o.status === 'ABERTO').length;
  
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chartData = daysOfWeek.map((day, index) => {
    const dayTotal = closedOrders
        .filter(o => new Date(o.timestamp).getDay() === index)
        .reduce((acc, o) => acc + (o.total), 0);
    return { name: day, vendas: dayTotal };
  });

  const handleAIAnalysis = async () => {
    setLoadingAi(true);
    // Função AI não implementada ainda
    setAiAnalysis(null);
    setLoadingAi(false);
  };

  const handleExportTodayReport = () => {
    if (todayMetrics.orders.length === 0) {
      addNotification('warning', 'Nenhuma venda hoje para exportar.');
      return;
    }
    printFinanceReport('Relatório de Vendas de Hoje', todayMetrics.orders, ['id', 'total', 'timestamp'], settings);
    addNotification('success', 'Relatório exportado com sucesso.');
  };

  const handleReprint = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    printThermalInvoice(order, menu, settings, customer);
  };

  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-6 h-full overflow-y-auto no-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-background to-background">
      
      <header className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
             <Activity size={16} className="animate-pulse"/>
             <span className="text-xs font-mono font-bold tracking-widest uppercase">REST IA OS v1.0.5</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Painel de Comando</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportTodayReport}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Printer size={16} /> Exportar Hoje
          </button>
          <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${settings.kdsEnabled ? 'bg-primary/10 border-primary text-primary shadow-glow' : 'bg-orange-500/10 border-orange-500 text-orange-500'}`}>
             {settings.kdsEnabled ? <ChefHat size={18} /> : <MonitorOff size={18} />}
             <span className="text-[10px] font-black uppercase tracking-widest">Cozinha: {settings.kdsEnabled ? 'Digital' : 'Manual'}</span>
          </div>
          <button 
            onClick={handleAIAnalysis}
            disabled={loadingAi}
            className="relative group overflow-hidden px-6 py-2.5 rounded-lg bg-primary/10 border border-primary/50 text-primary hover:bg-primary hover:text-white transition-all duration-300"
          >
            <div className="flex items-center gap-2 relative z-10 font-medium">
              {loadingAi ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} />}
              <span>Análise Tática (IA)</span>
            </div>
            <div className="absolute inset-0 bg-primary/20 blur-lg group-hover:opacity-100 opacity-0 transition-opacity duration-300"></div>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border-primary/20 bg-primary/5">
          <div className="absolute top-0 right-0 p-4 text-primary opacity-10 group-hover:opacity-20 transition-opacity">
             <PieChart size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            Lucro Hoje
          </div>
          <p className="text-2xl font-mono font-bold text-white text-glow">{formatKz(todayMetrics.profit)}</p>
          <div className="mt-2 text-[10px] text-primary/80 font-bold">
             Margem: {todayMetrics.revenue > 0 ? ((todayMetrics.profit / todayMetrics.revenue) * 100).toFixed(1) : '0'}%
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <DollarSign size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Faturação Hoje
          </div>
          <p className="text-2xl font-mono font-bold text-white">{formatKz(todayMetrics.revenue)}</p>
          <div className="mt-2 text-[10px] text-slate-500 font-bold">
             {todayMetrics.count} Faturas Emitidas
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <ShoppingBag size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Pedidos Ativos
          </div>
          <p className="text-2xl font-mono font-bold text-white">{activeOrderCount}</p>
          <div className="mt-2 w-full bg-slate-700 h-1 rounded-full overflow-hidden">
             <div className="bg-blue-500 h-full rounded-full" style={{width: `${Math.min(activeOrderCount * 10, 100)}%`}}></div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Zap size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Rendimento Global
          </div>
          <p className="text-2xl font-mono font-bold text-white">{formatKz(metrics?.rendimentoGlobal || totalSales)}</p>
          <div className="mt-2 text-[10px] text-emerald-500 font-bold">
             Histórico + Vendas Atuais
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Users size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Ocupação
          </div>
          <p className="text-2xl font-mono font-bold text-white">65%</p>
          <div className="mt-2 flex gap-1">
             {[1,2,3,4,5,6,7,8].map(i => (
                 <div key={i} className={`h-1.5 w-full rounded-sm ${i <= 5 ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target size={18} className="text-primary" />
                  Fluxo de Receita Semanal
              </h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip 
                    cursor={{stroke: '#06b6d4', strokeWidth: 1}}
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px'}}
                    formatter={(value: number) => [`${formatKz(value)}`, 'Vendas']}
                  />
                  <Area type="monotone" dataKey="vendas" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <History size={18} className="text-primary" />
                   Log de Vendas Ativo
                </h3>
             </div>
             <div className="space-y-3">
                {recentInvoices.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group">
                     <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{order.invoiceNumber}</p>
                        <p className="text-sm font-bold text-white">Mesa {order.tableId} • {formatKz(order.total)}</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Lucro</p>
                            <p className="text-xs font-mono font-bold text-white">+{formatKz(order.profit)}</p>
                        </div>
                        <button 
                          onClick={() => handleReprint(order)}
                          className="p-3 bg-white/10 text-white rounded-xl hover:bg-primary hover:text-black transition-all"
                        >
                            <Printer size={18} />
                        </button>
                     </div>
                  </div>
                ))}
                {recentInvoices.length === 0 && <p className="text-center text-slate-500 py-4 text-xs italic uppercase">Nenhuma fatura emitida hoje.</p>}
             </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-primary/30 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 z-10">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Sparkles className="text-white" size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">IA Assistant</h3>
          </div>
          
          {!aiAnalysis ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center gap-3 z-10">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Activity size={24} className="text-slate-600" />
                </div>
                <p className="text-sm">Aguardando solicitação de análise...</p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 z-10">
               <div className="bg-slate-800/50 p-4 rounded-xl border-l-4 border-primary">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Resumo Tático</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{aiAnalysis.summary}</p>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-xl border-l-4 border-yellow-500">
                  <p className="text-yellow-500 text-[10px] uppercase tracking-wider font-bold mb-1">Recomendação</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{aiAnalysis.recommendation}</p>
               </div>
               <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <span className="text-xs font-bold text-slate-400">Tendência de Mercado</span>
                  <div className="flex items-center gap-2">
                      {aiAnalysis.trend === 'up' && <TrendingUp className="text-green-400" size={16}/>}
                      {aiAnalysis.trend === 'down' && <TrendingUp className="text-red-400 rotate-180" size={16}/>}
                      <span className="text-sm font-bold text-white uppercase">{aiAnalysis.trend === 'up' ? 'Alta' : 'Baixa'}</span>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;




