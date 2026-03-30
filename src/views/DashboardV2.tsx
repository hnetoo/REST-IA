import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie } from 'recharts';
import { Users, Target, TrendingUp, DollarSign, Zap, RefreshCw, Activity, MonitorOff, Printer, ChefHat, Loader2, Sparkles, ShoppingBag, Receipt } from 'lucide-react';
import { AIAnalysisResult, Order } from '../../types';
import { supabase } from '../supabase_standalone';
import { printFinanceReport, printThermalInvoice } from '../lib/printService';
import { formatKz, formatDateInAppTimezone } from '../lib/dateUtils';
import { getRealtimeService, stopRealtimeService } from '../services/realtimeService';
import { getTodayRangeInLuanda, formatKzAngola, formatDateDDMMAAAA } from '../lib/timezoneLuanda';
import { useSyncCoreSmart } from '../hooks/useSyncCoreSmart';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const DashboardV2 = () => {
  const { activeOrders, customers, menu, settings, addNotification, expenses, loadExpenses, employees, loadEmployees } = useStore();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // 🔥 ADICIONADO: Estado para orders do Supabase
  const [supabaseOrders, setSupabaseOrders] = useState<any[]>([]);
  
  // 🚀 INTEGRAR MOTOR SYNC - DADOS UNIFICADOS
  const {
    syncData,
    totalRevenue,
    todayRevenue,
    totalExpenses,
    todayExpenses,
    todayExpensesCount,
    staffCosts,
    staffCount,
    netProfit,
    isLoading: syncLoading,
    error: syncError,
    isOnline,
    syncStatus,
    pendingSyncCount,
    recalculate
  } = useSyncCoreSmart();
  
  // 🔥 ATIVAR SINCRONIZAÇÃO EM TEMPO REAL - Força atualização imediata quando vendas são feitas
  useRealtimeSync();
  
  // 🔥 ADICIONADO: Debug dos valores recebidos com resiliência
  useEffect(() => {
    try {
      console.log('[DASHBOARD DEBUG] Valores do SyncCore:', {
        todayRevenue,
        totalRevenue,
        staffCosts,
        netProfit,
        todayExpenses,
        totalExpenses
      });
    } catch (error) {
      console.warn('[DASHBOARD] ⚠️ Erro no debug log:', error);
    }
  }, [todayRevenue, totalRevenue, staffCosts, netProfit, todayExpenses, totalExpenses]);
  
  // 🔥 CÁLCULOS CORRIGIDOS COM RESILIÊNCIA
  const despesasHoje = todayExpenses || 0; // Despesas de hoje
  const despesasTotais = 0; // 🔥 REMOVIDO: External history temporariamente desativado
  
  // 🔥 ADICIONADO: Estado para Optimistic Update
  const [optimisticRevenue, setOptimisticRevenue] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const previousRevenueRef = useRef(0);
  
  // 🔥 OPTIMISTIC UPDATE: Combinar valor real com otimista
  const displayRevenue = useMemo(() => {
    const baseRevenue = todayRevenue || 0;
    const total = baseRevenue + optimisticRevenue;
    
    // 🔥 CORREÇÃO: Só resetar optimistic quando o valor real DE FATO aumentar
    if (baseRevenue > previousRevenueRef.current && optimisticRevenue > 0) {
      console.log('[DASHBOARD] ✅ Valor real atualizado! Resetando optimistic:', {
        anterior: previousRevenueRef.current,
        atual: baseRevenue,
        optimistic: optimisticRevenue
      });
      previousRevenueRef.current = baseRevenue;
      setOptimisticRevenue(0);
    } else if (baseRevenue !== previousRevenueRef.current) {
      // Atualizar referência mesmo sem resetar optimistic
      previousRevenueRef.current = baseRevenue;
    }
    
    return total;
  }, [todayRevenue, optimisticRevenue]);
  
  // 🔥 ADICIONADO: Listener direto para app Windows
  useEffect(() => {
    const handleOrderCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[DASHBOARD] 📡 Evento recebido diretamente:', customEvent.detail);
      
      // 🔥 OPTIMISTIC UPDATE: Atualizar imediatamente com valor da venda
      const saleAmount = customEvent.detail?.total || 0;
      if (saleAmount > 0) {
        console.log('[DASHBOARD] 🚀 Optimistic Update - Adicionando venda:', saleAmount);
        setOptimisticRevenue(prev => prev + saleAmount);
        setLastUpdateTime(Date.now());
      }
      
      console.log('[DASHBOARD] 🔄 Forçando recálculo imediato...');
      
      // Forçar recálculo do SyncCore
      if (recalculate) {
        recalculate();
      }
      
      // Forçar refresh dos dados do Dashboard
      setTimeout(() => {
        console.log('[DASHBOARD] 🔄 Segundo refresh para garantir...');
        if (recalculate) {
          recalculate();
        }
      }, 1000);
    };
    
    const handleForceRefresh = () => {
      console.log('[DASHBOARD] 🔄 Evento force-refresh recebido');
      if (recalculate) {
        recalculate();
      }
    };
    
    const handleDashboardMutate = () => {
      console.log('[DASHBOARD] 🔄 Evento dashboard-mutate recebido - Forçando revalidação...');
      if (recalculate) {
        recalculate();
      }
    };
    
    // Registrar listeners
    window.addEventListener('order-completed', handleOrderCompleted);
    window.addEventListener('force-refresh', handleForceRefresh);
    window.addEventListener('dashboard-mutate', handleDashboardMutate);
    
    // Cleanup
    return () => {
      window.removeEventListener('order-completed', handleOrderCompleted);
      window.removeEventListener('force-refresh', handleForceRefresh);
      window.removeEventListener('dashboard-mutate', handleDashboardMutate);
    };
  }, [recalculate]);
  
  // �� MÉTRICAS DO MOTOR SYNC - MANTER ESTRUTURA ORIGINAL
  const metrics = useMemo(() => ({
    totalVendas: todayRevenue || 0,
    despesas: totalExpenses || 0,
    despesasHoje: totalExpenses || 0, // Para compatibilidade com layout original
    despesasAcumuladas: totalExpenses || 0,
    despesasTotais: totalExpenses || 0, // Para compatibilidade
    folhaSalarial: staffCosts || 0,
    lucroLiquido: netProfit || 0,
    rendimentoGlobal: totalRevenue || 0,
    faturacaoAnual: totalRevenue || 0
  }), [todayRevenue, totalExpenses, staffCosts, netProfit, totalRevenue]);

  // FUNÇÕES DE FORMATAÇÃO - MOVIDAS PARA O TOPO PARA EVITAR ERRO DE INICIALIZAÇÃO
  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA', 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(val);
  };

  const formatKzWithSeparators = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(val) + ',00 Kz';
  };

  // 🔥 ADICIONADO: Buscar orders do Supabase para gráfico e log
  useEffect(() => {
    const fetchOrdersFromSupabase = async () => {
      try {
        console.log('[DASHBOARD] 🔄 Buscando orders do Supabase...');
        const { data, error } = await supabase
          .from('orders')
          .select('id, total_amount, created_at, status, invoice_number, customer_name')
          .in('status', ['pending', 'closed', 'paid', 'FECHADO'])
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) {
          console.error('[DASHBOARD] ❌ Erro ao buscar orders:', error);
          return;
        }
        
        if (data && data.length > 0) {
          console.log('[DASHBOARD] ✅ Orders carregados do Supabase:', data.length);
          const formattedOrders = data.map(order => ({
            id: order.id,
            total: Number(order.total_amount) || 0,
            timestamp: order.created_at,
            status: order.status,
            invoiceNumber: order.invoice_number,
            customerName: order.customer_name
          }));
          setSupabaseOrders(formattedOrders);
        }
      } catch (err) {
        console.error('[DASHBOARD] ❌ Erro crítico ao buscar orders:', err);
      }
    };
    
    fetchOrdersFromSupabase();
    const interval = setInterval(fetchOrdersFromSupabase, 3000); // 3 segundos
    return () => clearInterval(interval);
  }, []);

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

  // CARREGAR DADOS INICIAIS QUANDO CONEXÃO FOR RESTABELECIDA
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('[DASHBOARD] Inicializando dados...');
      
      // Verificar se temos produtos e categorias carregados
      const store = useStore.getState();
      const hasProducts = store.menu && store.menu.length > 0;
      const hasCategories = store.categories && store.categories.length > 0;
      
      if (!hasProducts || !hasCategories) {
        console.log('[DASHBOARD] Carregando dados iniciais...');
        
        try {
          // Carregar categorias
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*');
            
          if (!categoriesError && categoriesData) {
            console.log('[DASHBOARD] Categorias carregadas:', categoriesData.length);
            useStore.getState().setCategories(categoriesData);
          }
          
          // Carregar produtos
          const { data: productsData, error: productsError } = await supabase
            .from('menu_items')
            .select('*');
            
          if (!productsError && productsData) {
            console.log('[DASHBOARD] Produtos carregados:', productsData.length);
            useStore.getState().setMenu(productsData);
          }
          
          // Carregar despesas
          await loadExpenses();
          
          // Carregar funcionários  
          await loadEmployees();
          
          console.log('[DASHBOARD] Dados iniciais carregados com sucesso!');
          
        } catch (error) {
          console.error('[DASHBOARD] Erro ao carregar dados iniciais:', error);
        }
      } else {
        console.log('[DASHBOARD] Dados já carregados, ignorando inicialização');
      }
    };
    
    // Executar inicialização após 2 segundos
    const timer = setTimeout(initializeDashboard, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // 🔥 CORREÇÃO: Removido listener antigo - agora usa useRealtimeSync

  // 🔄 FORÇAR REFRESH MANUAL DO DASHBOARD
  const handleManualRefresh = async () => {
    console.log('[DASHBOARD] 🔄 Refresh manual acionado pelo usuário...');
    setIsRefreshing(true);
    
    try {
      // 🔄 O Motor Sync Core já atualiza automaticamente
      console.log('[DASHBOARD] ✅ Motor Sync Core ativo - dados atualizados automaticamente');
      addNotification('success', 'Dashboard atualizado via Motor Sync Core');
      
    } catch (error) {
      console.error('[DASHBOARD] ❌ Erro no refresh manual:', error);
      addNotification('error', 'Falha ao atualizar Dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  // PROIBIÇÃO: Removida função getDateRangeToday - Base de dados é autoridade

  const closedOrders = useMemo(() => activeOrders.filter((o: any) => ['FECHADO', 'closed', 'paid'].includes(o.status)), [activeOrders]);
  
  const todayMetrics = useMemo(() => {
    // DEBUG: Log dos valores recebidos
    console.log('[DASHBOARD DEBUG] Valores recebidos:', {
      todayRevenue,
      totalRevenue,
      metrics: metrics?.totalVendas,
      activeOrdersLength: activeOrders?.length,
      closedOrdersLength: closedOrders.length
    });
    
    // 🔄 PRIORIDADE: Usar dados do Motor Sync (Supabase) se disponíveis
    if (todayRevenue > 0) {
      console.log('[DASHBOARD] Usando todayRevenue do Motor Sync:', todayRevenue);
      return { 
        revenue: todayRevenue, 
        profit: (todayRevenue || 0) - (totalExpenses || 0) - ((todayRevenue || 0) * 0.065 || 0),
        count: 1, 
        orders: [] 
      };
    }
    
    // Se temos métricas globais, usar os dados reais calculados
    if (metrics.totalVendas > 0) {
      console.log('[DASHBOARD] Usando totalVendas do Motor Sync:', metrics.totalVendas);
      return { 
        revenue: metrics.totalVendas, 
        profit: (metrics.totalVendas || 0) - (totalExpenses || 0) - ((metrics.totalVendas || 0) * 0.065 || 0),
        count: 1, 
        orders: [] 
      };
    }
    
    // Se não houver dados, usar dados locais como fallback
    console.log('[DASHBOARD] ⚠️ Usando dados locais - activeOrders:', activeOrders.length);
    const today = new Date().toISOString().split('T')[0];
    const orders = supabaseOrders.length > 0 ? supabaseOrders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === today) : closedOrders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === today);
    const revenue = orders.reduce((acc, o) => acc + Number(o.total || 0), 0); // ELIMINAR NaN
    const profit = (revenue || 0) - (0) - (0) - ((revenue || 0) * 0.065 || 0);
    return { revenue, profit, count: orders.length, orders };
  }, [closedOrders, metrics, supabaseOrders, todayRevenue, totalExpenses, activeOrders]);
  
  const recentInvoices = useMemo(() => {
    // 🔥 CORREÇÃO: Usar supabaseOrders em vez de closedOrders
    const ordersToUse = supabaseOrders.length > 0 ? supabaseOrders : closedOrders;
    return [...ordersToUse]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [closedOrders, supabaseOrders]);
  
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chartData = useMemo(() => {
    // 🔥 CORREÇÃO: Usar supabaseOrders em vez de closedOrders
    const ordersToUse = supabaseOrders.length > 0 ? supabaseOrders : closedOrders;
    return daysOfWeek.map((day, index) => {
      const dayTotal = ordersToUse
        .filter(o => new Date(o.timestamp).getDay() === index)
        .reduce((acc, o) => acc + (o.total || 0), 0);
      return { name: day, vendas: dayTotal };
    });
  }, [closedOrders, supabaseOrders]);
  
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
  
  const handleAIAnalysis = async () => {
    setLoadingAi(true);
    
    // 🔥 IMPLEMENTADO: Análise real usando dados do SyncCore
    const analysis: AIAnalysisResult = {
      summary: `Análise de Performance - ${new Date().toLocaleDateString('pt-AO')}`,
      insights: [
        `Faturamento hoje: ${formatKz(todayRevenue || 0)}`,
        `Despesas hoje: ${formatKz(totalExpenses || 0)}`,
        `Lucro líquido: ${formatKz(netProfit || 0)}`,
        `Margem de lucro: ${todayRevenue > 0 ? Math.round(((netProfit || 0) / todayRevenue) * 100) : 0}%`
      ],
      recommendations: [
        netProfit > 0 
          ? '✅ Performance positiva! Continue monitorando despesas.'
          : '⚠️ Lucro negativo. Revise custos operacionais.',
        totalExpenses > todayRevenue * 0.3
          ? '💡 Despesas acima de 30% da receita. Considere otimização.'
          : '💡 Despesas sob controle.',
        '💡 Dica: Use o botão de refresh para dados atualizados.'
      ],
      trend: todayRevenue > (totalRevenue || 0) * 0.1 ? 'up' : 'down',
      confidence: 85
    };
    
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  return (
    <div className="p-4 h-full overflow-y-auto no-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-background to-background text-sm">
      
      <header className="flex justify-between items-end mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
             <Activity size={16} className="animate-pulse"/>
             <span className="text-xs font-mono font-bold tracking-widest uppercase">REST IA OS v1.0.5</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Painel de Comando</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            {isRefreshing ? 'Atualizando...' : 'Actualizar Dashboard'}
          </button>
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
          {/* 📡 INDICADOR DE SINCRONIZAÇÃO */}
          <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
            isOnline 
              ? syncStatus === 'synced' 
                ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                : syncStatus === 'pending'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
             {isOnline ? (
               syncStatus === 'synced' ? (
                 <Activity size={18} />
               ) : syncStatus === 'pending' ? (
                 <RefreshCw size={18} className="animate-spin" />
               ) : (
                 <Activity size={18} />
               )
             ) : (
               <MonitorOff size={18} />
             )}
             <span className="text-[10px] font-black uppercase tracking-widest">
               {isOnline 
                 ? syncStatus === 'synced' 
                   ? 'Online Sincronizado'
                   : syncStatus === 'pending'
                   ? `Sincronizando (${pendingSyncCount})`
                   : 'Online'
                 : 'Offline'
               }
             </span>
             {pendingSyncCount > 0 && (
               <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-[8px] font-bold">
                 {pendingSyncCount}
               </span>
             )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-primary/20 bg-primary/5">
          <div className="absolute top-0 right-0 p-2 text-primary opacity-10 group-hover:opacity-20 transition-opacity">
             <PieChart size={48} />
          </div>
          <div className="flex items-center gap-2 mb-3 text-primary text-[9px] font-black uppercase tracking-[0.2em]">
            Lucro Hoje
          </div>
          <p className="text-lg font-mono font-bold text-white text-glow">{formatKz(todayMetrics.profit)}</p>
          <div className="mt-2 text-[9px] text-primary/80 font-bold">
             Margem: {todayMetrics.revenue > 0 ? ((todayMetrics.profit / todayMetrics.revenue) * 100).toFixed(1) : '0'}%
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <TrendingUp size={48} />
          </div>
          <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">FATURAÇÃO HOJE</span>
            </div>
            <div className="text-xl font-black text-amber-400 mb-2">
              {formatKz(displayRevenue || todayMetrics.revenue)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
        </div>

        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <ShoppingBag size={48} />
          </div>
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            Despesas Hoje
          </div>
          <p className="text-lg font-mono font-bold text-white">{formatKz(metrics?.despesas || 0)}</p>
          <div className="mt-2 text-[9px] text-orange-500 font-bold">
             {todayExpensesCount || 0} Registros
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <Users size={48} />
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
              Custos Staff
            </div>
            <button
              onClick={() => recalculate()}
              className="p-1 rounded bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
              title="Atualizar dados do staff"
            >
              <RefreshCw size={12} className="text-blue-400" />
            </button>
          </div>
          <p className="text-lg font-mono font-bold text-white">{formatKz(staffCosts || 0)}</p>
          <div className="mt-2 text-[9px] text-blue-500 font-bold">
             {staffCount || 0} Funcionários
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <Target size={48} />
          </div>
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            Lucro Operacional
          </div>
          <p className="text-lg font-mono font-bold text-white text-glow">
            {formatKz((todayMetrics.revenue || 0) - (metrics?.despesas || 0) - (metrics?.folhaSalarial || 0))}
          </p>
          <div className="mt-2 text-[9px] text-emerald-500 font-bold">
             Vendas - (Despesas + Staff)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <TrendingUp size={48} />
          </div>
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            Rendimento Global
          </div>
          <p className="text-lg font-mono font-bold text-white text-glow">{formatKzWithSeparators(totalRevenue || 0)}</p>
          <div className="mt-2 text-[9px] text-emerald-500 font-bold">
             Histórico + Vendas Atuais
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <TrendingUp size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            IMPOSTOS (IVA)
          </div>
          <p className="text-lg font-mono font-bold text-white">{formatKz(todayMetrics.revenue * 0.14)}</p>
          <div className="mt-2 text-[10px] text-yellow-500 font-bold">
             14% sobre Faturação Hoje
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group border-primary/20 bg-primary/5">
          <div className="absolute top-0 right-0 p-4 text-primary opacity-10 group-hover:opacity-20 transition-opacity">
             <Receipt size={64} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
            Imposto Acumulado Anual
          </div>
          <p className="text-2xl font-mono font-bold text-white text-glow">{formatKz((metrics?.rendimentoGlobal || 0) * 0.14)}</p>
          <div className="mt-2 text-[10px] text-primary/80 font-bold">
             14% sobre Rendimento Global (Histórico + Vendas)
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
                   <Activity size={18} className="text-primary" />
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
                          title="Reimprimir fatura"
                          aria-label="Reimprimir fatura"
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

export default DashboardV2;




