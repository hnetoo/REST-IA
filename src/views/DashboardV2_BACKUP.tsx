import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { DollarSign, ShoppingBag, Users, TrendingUp, Sparkles, Loader2, Activity, Target, Zap, ChefHat, MonitorOff, Printer, History, PieChart, Receipt, RefreshCw } from 'lucide-react';
import { AIAnalysisResult, Order } from '../../types';
import { supabase } from '../supabase_standalone';
import { printFinanceReport, printThermalInvoice } from '../lib/printService';
import { formatKz, formatDateInAppTimezone } from '../lib/dateUtils';
import { getRealtimeService, stopRealtimeService } from '../services/realtimeService';
import { getTodayRangeInLuanda, formatKzAngola, formatDateDDMMAAAA } from '../lib/timezoneLuanda';
import { useSyncCore } from '../hooks/useSyncCore';

const DashboardV2 = () => {
  const { activeOrders, customers, menu, settings, addNotification, expenses, loadExpenses, employees, loadEmployees } = useStore();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 🚀 INTEGRAR MOTOR SYNC CORE - DADOS UNIFICADOS
  const {
    totalRevenue,
    todayRevenue,
    totalExpenses,
    staffCosts,
    netProfit,
    isLoading: syncLoading,
    error: syncError
  } = useSyncCore();
  
  // 🪟 ANTI-FLICKER WINDOWS - Estado persistente para manter valores durante carregamento
  const [persistentRevenue, setPersistentRevenue] = useState<number>(0);
  const previousRevenueRef = useRef<number>(0);
  
  // 🔄 MÉTRICAS DO MOTOR SYNC
  const metrics = useMemo(() => ({
    totalVendas: todayRevenue,
    despesas: totalExpenses,
    despesasAcumuladas: totalExpenses, // Usar total para consistência
    folhaSalarial: staffCosts,
    lucroLiquido: netProfit,
    rendimentoGlobal: totalRevenue,
    faturacaoAnual: totalRevenue // Anual = total para simplificação
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
            .from('products')
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

  // 🔑 SINGLE SOURCE OF TRUTH - Dashboard usa Motor Sync Core
  useEffect(() => {
    console.log('[DASHBOARD] 🚀 Single Source of Truth - Motor Sync Core...');
    
    // Limpar qualquer localStorage residual
    localStorage.removeItem('dashboard_metrics');
    localStorage.removeItem('dashboard_revenue');
    
    const store = useStore.getState();
    const realtimeService = getRealtimeService(store);
    
    // Iniciar todas as subscriptions para espelho perfeito
    realtimeService.startAllSubscriptions();
    
    // Cleanup ao desmontar
    return () => {
      console.log('[DASHBOARD] 🛑 Parando Realtime Subscriptions...');
      stopRealtimeService();
    };
  }, []);

  // 🔄 REFRESH MANUAL DO DASHBOARD
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

  // FONTE DA VERDADE: Motor Sync Core - ignorar localStorage e activeOrders
  const rendimentoGlobalDinamico = useMemo(() => {
    return metrics?.rendimentoGlobal || 0;
  }, [metrics?.rendimentoGlobal]);
    
    historyChannel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'external_history' 
      }, (payload) => {
        console.log('[DASHBOARD] Mudança no histórico detectada:', payload);
        console.log('[DASHBOARD] Atualizando Rendimento Global...');
        // Forçar atualização imediata das métricas
        fetchMetrics();
      })
      .subscribe();

    // Limpeza dos canais
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [fetchMetrics]); // Executar apenas uma vez
  
  // USAR DADOS DO STORE GLOBAL (Owner Dashboard) para consistência
  const todayMetrics = useMemo(() => {
    // Se temos métricas globais, usar os dados reais calculados
    if (metrics?.totalVendas > 0) {
      const today = new Date().toISOString().split('T')[0]; // Data atual para despesas
      const orders = closedOrders.filter(o => formatDateInAppTimezone(new Date(o.timestamp)).split(' ')[0] === today);
      
      // FATURAÇÃO HOJE: Query SEPARADA - Apenas vendas de hoje com Africa/Luanda
      const hojeWAT = new Date().toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
      const vendasHojeFiltradas = orders.filter(order => {
        const dataOrder = new Date(order.timestamp).toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
        return dataOrder === hojeWAT;
      });
      
      const faturacaoHoje = vendasHojeFiltradas.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      
      // 🪟 ANTI-FLICKER WINDOWS - Manter valor antigo até novo ser validado
      if (faturacaoHoje > 0) {
        setPersistentRevenue(faturacaoHoje);
        previousRevenueRef.current = faturacaoHoje;
      }
      
      // 🪟 WINDOWS SYNC LOG - Log específico para Inspector Tauri
      console.log('[WINDOWS_SYNC] Dados recebidos:', {
        faturacaoHoje,
        despesasHoje: metrics?.despesasHoje || 0,
        persistentRevenue: persistentRevenue || faturacaoHoje,
        formatKz: formatKz(persistentRevenue || faturacaoHoje),
        hojeWAT,
        totalOrders: orders.length,
        vendasHojeFiltradas: vendasHojeFiltradas.length,
        environment: 'TAURI_WINDOWS',
        timestamp: new Date().toISOString(),
        antiFlicker: 'ACTIVE'
      });
      
      // 🔄 ATUALIZAR WINDOWS_SYNC COM DADOS COMPLETOS (NÃO APENAS VENDAS)
      if (typeof window !== 'undefined') {
        // 🎯 GARANTIR VALORES REAIS ANTES DE ENVIAR
        const realFaturacaoHoje = faturacaoHoje > 0 ? faturacaoHoje : (metrics?.totalVendas || 0);
        const realDespesasHoje = metrics?.despesasHoje > 0 ? metrics?.despesasHoje : (expenses?.reduce((acc, e) => acc + Number(e.amount_kz || 0), 0) || 0);
        const realTotalVendas = metrics?.totalVendas || 0;
        const realDespesasTotais = metrics?.despesasTotais || 0;
        const realFolhaSalarial = metrics?.folhaSalarial || 0;
        
        (window as any).WINDOWS_SYNC = {
          ...(window as any).WINDOWS_SYNC || {},
          faturacaoHoje: realFaturacaoHoje, // 🔄 VALOR REAL CALCULADO
          despesasHoje: realDespesasHoje, // 🔄 VALOR REAL CALCULADO
          totalVendas: realTotalVendas, // 🔄 VALOR REAL
          despesasTotais: realDespesasTotais, // 🔄 VALOR REAL
          folhaSalarial: realFolhaSalarial, // 🔄 VALOR REAL
          timestamp: new Date().toISOString()
        };
        
        console.log('[WINDOWS_SYNC] 🔄 Atualizado com dados REAIS:', {
          faturacaoHoje: realFaturacaoHoje,
          despesasHoje: realDespesasHoje,
          totalVendas: realTotalVendas,
          despesasTotais: realDespesasTotais,
          folhaSalarial: realFolhaSalarial,
          environment: 'TAURI_WINDOWS',
          timestamp: new Date().toISOString(),
          antiFlicker: 'ACTIVE'
        });
      }
      
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
    const today = formatDateInAppTimezone(new Date()).split(' ')[0]; // Data atual sem cálculos complexos
    
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
              {formatKz(persistentRevenue || todayMetrics.revenue)}
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
             {expenses.length} Registros
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
             <Users size={48} />
          </div>
          <div className="flex items-center gap-2 mb-3 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
            Custos Staff
          </div>
          <p className="text-lg font-mono font-bold text-white">{formatKz(metrics?.folhaSalarial || 0)}</p>
          <div className="mt-2 text-[9px] text-blue-500 font-bold">
             {employees.length} Funcionários
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
          <p className="text-lg font-mono font-bold text-white text-glow">{formatKzWithSeparators(rendimentoGlobalDinamico)}</p>
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




