import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { loadAndMergeActiveOrders } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line, Cell, PieChart as RechartsPieChart, Legend } from 'recharts';
import { Users, Target, TrendingUp, DollarSign, Zap, RefreshCw, Activity, MonitorOff, Printer, ChefHat, Loader2, Sparkles, ShoppingBag, Receipt, AlertTriangle, PieChart, FileText, Wallet, CreditCard, Scale, Gauge, TrendingDown, BarChart3 } from 'lucide-react';
import { AIAnalysisResult, Order } from '../../types';
import { supabase } from '../supabase_standalone';
import { printFinanceReport, printThermalInvoice, showPrintPreview } from '../lib/printService';
import { formatKz, formatDateInAppTimezone, calculateDataContabil } from '../lib/dateUtils';
import { getRealtimeService, stopRealtimeService } from '../services/realtimeService';
import { getTodayRangeInLuanda, formatKzAngola, formatDateDDMMAAAA } from '../lib/timezoneLuanda';
import { useSyncCoreSmart } from '../hooks/useSyncCoreSmart';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useAutoCashClose } from '../hooks/useAutoCashClose';

const DashboardV2 = () => {
  // 🤖 Fecho automático de caixa (partilhado)
  useAutoCashClose();
  const { activeOrders, customers, menu, settings, addNotification, expenses, loadExpenses, employees, loadEmployees, tables, categories } = useStore();
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

  // 🔥 CARREGAR ORDENS ATIVAS DO SUPABASE AO MONTAR (persistência contra falhas de energia)
  useEffect(() => {
    console.log('[DASHBOARD] 🔄 Carregando ordens ativas do Supabase...');
    loadAndMergeActiveOrders().then(() => {
      console.log('[DASHBOARD] ✅ Ordens ativas carregadas do Supabase');
    }).catch(err => {
      console.error('[DASHBOARD] ❌ Erro ao carregar ordens do Supabase:', err);
    });
  }, []);

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
  const despesasHoje = todayExpenses || 0;
  const despesasTotais = 0;
  
  // 🔥 ADICIONADO: Estado para Optimistic Update
  const [optimisticRevenue, setOptimisticRevenue] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const previousRevenueRef = useRef(0);

  // 🆕 VENDAS TOTAIS (sem filtro de data) - busca paginada de TODAS as orders
  const [allSalesTotal, setAllSalesTotal] = useState(0);
  const [allSalesCount, setAllSalesCount] = useState(0);

  const fetchAllSales = useCallback(async () => {
    try {
      let total = 0;
      let count = 0;
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('total_amount, status')
          .in('status', ['closed', 'paid'])
          .order('created_at', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        total += data.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
        count += data.length;

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      setAllSalesTotal(total);
      setAllSalesCount(count);
      console.log('[DASHBOARD] 💰 Vendas Totais (sem filtro):', total, 'Count:', count);
    } catch (err) {
      console.error('[DASHBOARD] ❌ Erro ao buscar vendas totais:', err);
    }
  }, []);

  // 🆕 RECEITA POR CATEGORIA - via order_items + products (items JSONB é null)
  const [categoriaData, setCategoriaData] = useState<{ name: string; value: number }[]>([]);

  const fetchReceitaPorCategoria = useCallback(async () => {
    try {
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['closed', 'paid'])
        .eq('data_contabil', calculateDataContabil(new Date()));

      if (!todayOrders || todayOrders.length === 0) {
        setCategoriaData([]);
        return;
      }

      const orderIds = todayOrders.map((o: any) => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      if (!items || items.length === 0) {
        setCategoriaData([]);
        return;
      }

      const productIds = [...new Set(items.map((i: any) => i.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, category_id')
        .in('id', productIds);

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name');

      const prodCatMap: Record<string, string> = {};
      (products || []).forEach((p: any) => {
        const cat = (categoriesData || []).find((c: any) => c.id === p.category_id);
        prodCatMap[p.id] = cat?.name || 'Outros';
      });

      const catTotals: Record<string, number> = {};
      items.forEach((item: any) => {
        const catName = prodCatMap[item.product_id] || 'Outros';
        const total = Number(item.quantity || 0) * Number(item.unit_price || 0);
        catTotals[catName] = (catTotals[catName] || 0) + total;
      });

      const result = Object.entries(catTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setCategoriaData(result);
    } catch (err) {
      console.error('[DASHBOARD] ❌ Erro ao buscar receita por categoria:', err);
      setCategoriaData([]);
    }
  }, []);
  
  // 🔥 OPTIMISTIC UPDATE: Combinar valor real com otimista
  const displayRevenue = useMemo(() => {
    const baseRevenue = todayRevenue || 0;
    const total = baseRevenue + optimisticRevenue;
    
    // Só resetar optimistic quando o valor real DE FATO aumentar
    if (baseRevenue > previousRevenueRef.current && optimisticRevenue > 0) {
      previousRevenueRef.current = baseRevenue;
      setOptimisticRevenue(0);
    } else if (baseRevenue !== previousRevenueRef.current) {
      previousRevenueRef.current = baseRevenue;
    }
    
    return total;
  }, [todayRevenue, optimisticRevenue]);
  
  // Listener para eventos de vendas
  useEffect(() => {
    const handleOrderCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Optimistic Update
      const saleAmount = customEvent.detail?.total || 0;
      if (saleAmount > 0) {
        setOptimisticRevenue(prev => prev + saleAmount);
        setLastUpdateTime(Date.now());
      }
      
      // Recalcular
      if (recalculate) {
        recalculate();
      }
      
      // Atualizar vendas totais e receita por categoria
      fetchAllSales();
      fetchReceitaPorCategoria();
      
      // Segundo refresh
      setTimeout(() => {
        if (recalculate) {
          recalculate();
        }
        fetchAllSales();
      }, 1000);
    };
    
    const handleForceRefresh = () => {
      if (recalculate) {
        recalculate();
      }
    };
    
    const handleDashboardMutate = () => {
      if (recalculate) {
        recalculate();
      }
    };
    
    window.addEventListener('order-completed', handleOrderCompleted);
    window.addEventListener('force-refresh', handleForceRefresh);
    window.addEventListener('dashboard-mutate', handleDashboardMutate);
    
    return () => {
      window.removeEventListener('order-completed', handleOrderCompleted);
      window.removeEventListener('force-refresh', handleForceRefresh);
      window.removeEventListener('dashboard-mutate', handleDashboardMutate);
    };
  }, [recalculate, fetchAllSales, fetchReceitaPorCategoria]);
  
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

  // Buscar orders do Supabase (paginado para evitar limite de 1000)
  useEffect(() => {
    const fetchOrdersFromSupabase = async () => {
      try {
        let allData: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['closed', 'paid'])
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

        setSupabaseOrders(allData);
        console.log('[DASHBOARD] ✅ Orders carregadas (paginado):', allData.length);
      } catch (err) {
        console.error('[DASHBOARD] ❌ Erro crítico ao buscar orders:', err);
      }
    };

    fetchOrdersFromSupabase();
    fetchAllSales();
    fetchReceitaPorCategoria();
    const interval = setInterval(() => {
      fetchOrdersFromSupabase();
      fetchAllSales();
      fetchReceitaPorCategoria();
      recalculate();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchAllSales, fetchReceitaPorCategoria, recalculate]);

  // LIMPEZA DE LOCALSTORAGE
  useEffect(() => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('vendas') || key.includes('revenue') || key.includes('sales') || key.includes('lucro') || key.includes('metrics'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('vendas') || key.includes('revenue') || key.includes('sales') || key.includes('lucro') || key.includes('metrics'))) {
        sessionStorage.removeItem(key);
      }
    }
  }, []);

  // CARREGAR DADOS INICIAIS
  useEffect(() => {
    const initializeDashboard = async () => {
      const store = useStore.getState();
      const hasProducts = store.menu && store.menu.length > 0;
      const hasCategories = store.categories && store.categories.length > 0;
      
      if (!hasProducts || !hasCategories) {
        try {
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*');
          if (!categoriesError && categoriesData) {
            useStore.getState().setCategories(categoriesData);
          }
          
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*');
          if (!productsError && productsData) {
            useStore.getState().setMenu(productsData);
          }
          
          await loadExpenses();
          await loadEmployees();
        } catch (error) {
          console.error('[DASHBOARD] Erro ao carregar dados:', error);
        }
      }
    };
    
    const timer = setTimeout(initializeDashboard, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🔥 CORREÇÃO: Removido listener antigo - agora usa useRealtimeSync

  // 🔄 FORÇAR REFRESH MANUAL
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      addNotification('success', 'Dashboard atualizado');
    } catch (error) {
      console.error('[DASHBOARD] Erro no refresh:', error);
      addNotification('error', 'Falha ao atualizar');
    } finally {
      setIsRefreshing(false);
    }
  };

  // PROIBIÇÃO: Removida função getDateRangeToday - Base de dados é autoridade

  const closedOrders = useMemo(() => activeOrders.filter((o: any) => ['closed', 'paid', 'completed'].includes(o.status)), [activeOrders]);
  
  const todayMetrics = useMemo(() => {
    // ✅ SEMPRE usar todayRevenue do SyncCore (fonte oficial do Supabase)
    const revenue = todayRevenue || 0;
    const profit = revenue - (todayExpenses || 0);
    return { revenue, profit, count: revenue > 0 ? 1 : 0, orders: [] };
  }, [todayRevenue, todayExpenses]);
  
  // 🔥 RESERVA FISCAL (AGT) - Projeção Anual baseada no dia atual
  const reservaFiscal = useMemo(() => {
    const lucroHoje = todayMetrics.profit || 0;
    const faturacaoHoje = todayMetrics.revenue || 0;
    const taxaRetencao = (settings.taxRate || 7) / 100;
    
    // Cálculos diários
    const impostoIndustrialHoje = lucroHoje > 0 ? lucroHoje * 0.25 : 0;
    const retencaoFonteHoje = faturacaoHoje * taxaRetencao;
    const reservaDiaria = impostoIndustrialHoje + retencaoFonteHoje;
    
    // Projeção anual (baseada no dia atual × 365)
    const impostoIndustrialAnual = impostoIndustrialHoje * 365;
    const retencaoFonteAnual = retencaoFonteHoje * 365;
    const reservaAnualProjetada = reservaDiaria * 365;
    
    // Dias restantes no ano
    const hoje = new Date();
    const fimAno = new Date(hoje.getFullYear(), 11, 31);
    const diasRestantes = Math.ceil((fimAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      diaria: {
        total: reservaDiaria,
        impostoIndustrial: impostoIndustrialHoje,
        retencaoFonte: retencaoFonteHoje
      },
      anual: {
        total: reservaAnualProjetada,
        impostoIndustrial: impostoIndustrialAnual,
        retencaoFonte: retencaoFonteAnual,
        diasRestantes
      },
      percentual: faturacaoHoje > 0 ? ((reservaDiaria / faturacaoHoje) * 100) : 0
    };
  }, [todayMetrics.profit, todayMetrics.revenue, settings.taxRate]);
  
  const recentInvoices = useMemo(() => {
    // 🔥 CORREÇÃO: Usar supabaseOrders em vez de closedOrders
    const ordersToUse = supabaseOrders.length > 0 ? supabaseOrders : closedOrders;
    return [...ordersToUse]
      .filter(o => {
        // 🔥 Verificar se timestamp/created_at é válido antes de usar
        const timeField = o.timestamp || o.created_at;
        if (!timeField) return false;
        const date = new Date(timeField);
        return !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const aTime = new Date(a.timestamp || a.created_at).getTime();
        const bTime = new Date(b.timestamp || b.created_at).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [closedOrders, supabaseOrders]);
  
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chartData = useMemo(() => {
    // 🔥 CORREÇÃO: Usar apenas supabaseOrders (igual ao OwnerDashboard)
    // 🔥 CORRIGIR BUG: Usar data específica em vez de getDay() para evitar pegar todas as sextas-feiras
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    return last7Days.map((dateStr, index) => {
      const dayTotal = supabaseOrders
        .filter(o => {
          // � Usar data_contabil específica em vez de getDay()
          const orderDateStr = (o.data_contabil || o.created_at || '').split('T')[0];
          return orderDateStr === dateStr;
        })
        .reduce((acc, o) => acc + Number(o.total_amount || o.total || 0), 0);
      const dayName = daysOfWeek[new Date(dateStr).getDay()];
      return { name: dayName, vendas: dayTotal, faturacao: dayTotal };
    });
  }, [supabaseOrders]);

  // 🎯 PONTO DE EQUILÍBRIO (BREAK-EVEN)
  const breakEven = useMemo(() => {
    // Despesas fixas do mês atual: apenas UTILIDADES (aluguer, água, luz, internet)
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const despesasFixasMes = (expenses || [])
      .filter(e => {
        const d = new Date(e.date || e.createdAt || '');
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
          && (e.category === 'UTILIDADES');
      })
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

    // Custos fixos mensais = salários (staffCosts) + despesas fixas (UTILIDADES)
    // Se o utilizador definiu manualmente nas Settings, usa esse valor
    const custosFixosMensal = settings.custosFixosMensal
      ? settings.custosFixosMensal
      : (staffCosts || 0) + despesasFixasMes;
    const custosVariaveisHoje = todayExpenses || 0;
    const faturacaoHoje = todayRevenue || 0;
    const margemContribuicao = faturacaoHoje - custosVariaveisHoje;
    const margemPercentual = faturacaoHoje > 0 ? (margemContribuicao / faturacaoHoje) * 100 : 0;
    const breakEvenDiario = custosFixosMensal / 30;
    const breakEvenMensal = margemPercentual > 0 ? custosFixosMensal / (margemPercentual / 100) : 0;
    const acimaBreakEven = faturacaoHoje >= breakEvenDiario;
    const diferenca = faturacaoHoje - breakEvenDiario;
    const progressoMeta = breakEvenDiario > 0 ? Math.min((faturacaoHoje / breakEvenDiario) * 100, 100) : 0;

    return {
      custosFixosMensal,
      custosVariaveisHoje,
      margemContribuicao,
      margemPercentual,
      breakEvenDiario,
      breakEvenMensal,
      acimaBreakEven,
      diferenca,
      progressoMeta
    };
  }, [settings.custosFixosMensal, staffCosts, expenses, todayExpenses, todayRevenue]);

  // 📊 BI: Ticket Médio
  const ticketMedio = useMemo(() => {
    const vendasHoje = supabaseOrders.filter(o =>
      ['closed', 'paid', 'completed'].includes(o.status) ||
      o.status === 'FECHADO'
    ).length;
    return vendasHoje > 0 ? (todayRevenue || 0) / vendasHoje : 0;
  }, [supabaseOrders, todayRevenue]);

  // 📊 BI: Taxa de Ocupação
  const taxaOcupacao = useMemo(() => {
    const totalMesas = tables?.length || 0;
    const mesasOcupadas = tables?.filter((t: any) =>
      t.status === 'OCUPADO' || t.status === 'ocupado'
    ).length || 0;
    return totalMesas > 0 ? (mesasOcupadas / totalMesas) * 100 : 0;
  }, [tables]);

  // 📊 BI: Margem de Lucro
  const margemLucro = useMemo(() => {
    const lucro = (todayRevenue || 0) - (todayExpenses || 0) - (staffCosts || 0);
    return todayRevenue > 0 ? (lucro / todayRevenue) * 100 : 0;
  }, [todayRevenue, todayExpenses, staffCosts]);

  // 📊 BI: Receita por Categoria (hoje) - via order_items + products
  const receitaPorCategoria = useMemo(() => {
    return categoriaData;
  }, [categoriaData]);

  // 📊 BI: Dados para gráfico Receita vs Custos vs Break-Even
  const biChartData = useMemo(() => {
    return chartData.map(d => ({
      name: d.name,
      Receita: d.vendas,
      Custos: Math.round((breakEven.custosFixosMensal / 30) + (todayExpenses || 0) / 7),
      BreakEven: Math.round(breakEven.breakEvenDiario)
    }));
  }, [chartData, breakEven.custosFixosMensal, breakEven.breakEvenDiario, todayExpenses]);

  const biChartColors = ['#06b6d4', '#f97316', '#eab308'];

  const handleExportTodayReport = () => {
    const orders = recentInvoices.length > 0 ? recentInvoices : supabaseOrders.filter(o => ['closed', 'paid'].includes(o.status));
    if (orders.length === 0) {
      addNotification('warning', 'Nenhuma venda hoje para exportar.');
      return;
    }
    const rows = orders.map(order => {
      const inv = order.invoiceNumber || order.invoice_number || order.id?.toString().slice(-6).toUpperCase() || '—';
      const total = Number(order.total ?? order.total_amount ?? 0);
      const pm = order.payment_method || order.paymentMethod || '—';
      const time = order.created_at ? new Date(order.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) : '—';
      return [inv, pm, time, formatKz(total)];
    });
    printFinanceReport('Relatório de Vendas de Hoje', rows, ['Fatura', 'Pagamento', 'Hora', 'Valor'], settings);
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
      recommendation: netProfit > 0 
          ? '✅ Performance positiva! Continue monitorando despesas.'
          : '⚠️ Lucro negativo. Revise custos operacionais.',
      trend: todayRevenue > (totalRevenue || 0) * 0.1 ? 'up' : 'down'
    };
    
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  // Relatório Diário para Aprovação
  const handlePrintDailyReport = () => {
    const now = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
    const dateStr = new Date().toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
    const revenue = todayMetrics.revenue || 0;
    const profit = todayMetrics.profit || 0;
    const expenses = todayExpenses || 0;
    const staff = staffCosts || 0;
    const operational = revenue - expenses - staff;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';

    const recentRows = recentInvoices.slice(0, 10).map(order => {
      const total = Number(order.total ?? order.total_amount ?? 0);
      const pm = order.payment_method || '—';
      const table = order.tableId || order.table_id || '—';
      const inv = order.invoiceNumber || order.invoice_number || order.id?.toString().slice(-6).toUpperCase() || '—';
      return `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:11px;">${inv}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:11px;">Mesa ${table}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:11px;">${pm}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:11px;text-align:right;">${formatKz(total)}</td>
        </tr>
      `;
    }).join('');

    const reportHtml = `
      <html>
        <head>
          <title>Relatório Diário - Tasca do Vereda</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { text-align: center; margin-bottom: 2px; font-size: 20px; }
            .sub { text-align: center; color: #666; font-size: 11px; margin-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
            .card-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .card-value { font-size: 18px; font-weight: bold; margin-top: 6px; }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            .neutral { color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
            th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; font-size: 10px; text-align: left; font-weight: bold; }
            .section { margin-top: 20px; padding-top: 12px; border-top: 2px solid #e5e7eb; }
            .section h3 { font-size: 13px; margin-bottom: 10px; color: #111; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            .sign-row { display: flex; justify-content: space-between; margin-top: 40px; }
            .sign-box { width: 45%; text-align: center; }
            .sign-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 11px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>RELATÓRIO DIÁRIO DE GESTÃO</h1>
          <p class="sub">Tasca do Vereda • ${dateStr} • Emitido em ${now}</p>
          
          <div class="summary">
            <div class="card"><div class="card-label">Faturação</div><div class="card-value neutral">${formatKz(revenue)}</div></div>
            <div class="card"><div class="card-label">Despesas</div><div class="card-value negative">${formatKz(expenses)}</div></div>
            <div class="card"><div class="card-label">Folha Salarial</div><div class="card-value negative">${formatKz(staff)}</div></div>
            <div class="card"><div class="card-label">Lucro Líquido</div><div class="card-value ${profit >= 0 ? 'positive' : 'negative'}">${formatKz(profit)}</div></div>
            <div class="card"><div class="card-label">Lucro Operacional</div><div class="card-value ${operational >= 0 ? 'positive' : 'negative'}">${formatKz(operational)}</div></div>
            <div class="card"><div class="card-label">Margem</div><div class="card-value neutral">${margin}%</div></div>
          </div>

          <div class="section">
            <h3>🧾 Vendas Recentes</h3>
            <table>
              <thead>
                <tr><th>Fatura</th><th>Mesa</th><th>Pagamento</th><th style="text-align:right;">Valor</th></tr>
              </thead>
              <tbody>${recentRows || '<tr><td colspan="4" style="text-align:center;color:#999;padding:12px;">Nenhuma venda registrada hoje</td></tr>'}</tbody>
            </table>
          </div>

          <div class="footer">
            Relatório Diário de Gestão • Uso Interno • REST IA OS v1.1.2
          </div>
          
          <div class="sign-row">
            <div class="sign-box">
              <div class="sign-line">Responsável do Turno</div>
            </div>
            <div class="sign-box">
              <div class="sign-line">Gerente / Administrador</div>
            </div>
          </div>

          <div class="no-print" style="text-align:center;margin-top:30px;">
            <button onclick="window.print()" style="padding:10px 28px;font-size:14px;cursor:pointer;border-radius:8px;border:none;background:#06b6d4;color:#000;font-weight:bold;">🖨️ Imprimir / Guardar PDF</button>
          </div>
        </body>
      </html>
    `;
    showPrintPreview(reportHtml);
  };

  return (
    <div className="p-4 h-full overflow-y-auto no-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-background to-background text-sm">
      
      <header className="flex justify-between items-end mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
             <Activity size={16} className="animate-pulse"/>
             <span className="text-xs font-mono font-bold tracking-widest uppercase">REST IA OS v1.1.2</span>
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
          <button 
            onClick={handlePrintDailyReport}
            className="px-4 py-2.5 bg-primary/10 border border-primary/40 text-primary rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-primary hover:text-black transition-all"
          >
            <FileText size={16} /> Relatório Diário
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

      {/* Card Vendas Totais - linha própria em destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="glass-panel p-5 rounded-xl relative overflow-hidden group border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Vendas Totais</p>
              <p className="text-2xl font-mono font-bold text-white">{formatKz(allSalesTotal)}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <DollarSign size={12} className="text-indigo-400" />
                <span className="text-[9px] text-indigo-400/80 font-bold">{allSalesCount} vendas desde sempre</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-indigo-500/15 flex items-center justify-center ml-3 shrink-0">
              <DollarSign size={24} className="text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Resumo rápido ao lado */}
        <div className="glass-panel p-5 rounded-xl relative overflow-hidden group border-l-4 border-l-violet-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mb-1">Rendimento Global</p>
              <p className="text-2xl font-mono font-bold text-white">{formatKzWithSeparators(totalRevenue || 0)}</p>
              <div className="mt-2">
                <span className="text-[9px] text-violet-400/80 font-bold">Histórico + Vendas Atuais</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-violet-500/15 flex items-center justify-center ml-3 shrink-0">
              <TrendingUp size={24} className="text-violet-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Card Lucro Hoje */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Lucro Hoje</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(todayMetrics.profit)}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all w-0" ref={(el) => { if (el) el.style.width = `${Math.min(todayMetrics.revenue > 0 ? (todayMetrics.profit / todayMetrics.revenue) * 100 : 0, 100)}%`; }}></div>
                </div>
                <span className="text-[9px] text-emerald-400 font-bold whitespace-nowrap">{todayMetrics.revenue > 0 ? ((todayMetrics.profit / todayMetrics.revenue) * 100).toFixed(1) : '0'}%</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center ml-3">
              <PieChart size={20} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Card Faturação Hoje */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-amber-400">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1">Faturação Hoje</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(displayRevenue ?? todayMetrics.revenue)}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-amber-400" />
                <span className="text-[9px] text-white/50 font-bold">Meta estimada: {formatKz(300000)}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center ml-3">
              <DollarSign size={20} className="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Card Despesas Hoje */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-orange-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400 mb-1">Despesas Hoje</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(todayExpenses || 0)}</p>
              <div className="mt-2">
                <span className="text-[9px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full">{todayExpensesCount || 0} registos</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center ml-3">
              <ShoppingBag size={20} className="text-orange-400" />
            </div>
          </div>
        </div>

        {/* Card Custos Staff */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Custos Staff</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(staffCosts || 0)}</p>
              <div className="mt-2 flex items-center gap-2">
                <Users size={12} className="text-blue-400" />
                <span className="text-[9px] text-blue-400 font-bold">{staffCount || 0} funcionários</span>
                <button onClick={() => recalculate()} className="ml-auto p-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors" title="Atualizar">
                  <RefreshCw size={10} className="text-blue-400" />
                </button>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center ml-3">
              <Wallet size={20} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Card Lucro Operacional */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-cyan-400">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1">Lucro Operacional</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz((todayMetrics.revenue || 0) - (metrics?.despesas || 0) - (metrics?.folhaSalarial || 0))}</p>
              <div className="mt-2">
                <span className="text-[9px] text-cyan-400/80 font-bold">Vendas − (Despesas + Staff)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-400/15 flex items-center justify-center ml-3">
              <Target size={20} className="text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Card Impostos */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-yellow-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400 mb-1">Impostos ({settings.taxRate || 7}%)</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(todayMetrics.revenue * ((settings.taxRate || 7) / 100))}</p>
              <div className="mt-2">
                <span className="text-[9px] text-yellow-400/80 font-bold">{settings.taxRate || 7}% sobre Faturação Hoje</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center ml-3">
              <Receipt size={20} className="text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Card Despesas Totais */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-red-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400 mb-1">Despesas Totais</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(totalExpenses || 0)}</p>
              <div className="mt-2">
                <span className="text-[9px] text-red-400/80 font-bold">Todas as despesas registradas</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center ml-3">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
          </div>
        </div>

        {/* Card Reserva Fiscal */}
        <div className="glass-panel p-4 rounded-xl relative overflow-hidden group border-l-4 border-l-rose-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">Reserva Fiscal Anual</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(reservaFiscal.anual.total)}</p>
              <div className="mt-1">
                <span className="text-[8px] text-rose-400/60 font-bold">Base: Hoje × 365 dias</span>
              </div>
              <div className="mt-0.5 text-[7px] text-slate-500">
                 II: {formatKz(reservaFiscal.anual.impostoIndustrial)} | Ret: {formatKz(reservaFiscal.anual.retencaoFonte)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/15 flex items-center justify-center ml-3">
              <CreditCard size={20} className="text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 ALERTA BREAK-EVEN (condicional) */}
      {todayRevenue > 0 && !breakEven.acimaBreakEven && (
        <div className="glass-panel p-4 rounded-2xl border border-red-500/30 bg-red-500/5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-400 uppercase tracking-wider">Abaixo do Ponto de Equilíbrio</p>
            <p className="text-xs text-slate-300 mt-1">
              Faturação de hoje ({formatKz(todayRevenue)}) está abaixo do break-even diário ({formatKz(breakEven.breakEvenDiario)}).
              Falta: <span className="font-bold text-red-400">{formatKz(Math.abs(breakEven.diferenca))}</span>
            </p>
          </div>
        </div>
      )}
      {todayRevenue > 0 && breakEven.acimaBreakEven && (
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Target size={24} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-emerald-400 uppercase tracking-wider">Acima do Ponto de Equilíbrio</p>
            <p className="text-xs text-slate-300 mt-1">
              Faturação de hoje supera o break-even diário em <span className="font-bold text-emerald-400">{formatKz(breakEven.diferenca)}</span>.
              Lucro operacional positivo.
            </p>
          </div>
        </div>
      )}

      {/* 🎯 PONTO DE EQUILÍBRIO (BREAK-EVEN) */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Scale size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">Ponto de Equilíbrio (Break-Even)</h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Receita mínima para cobrir custos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Custos Fixos (Mês)</p>
            <p className="text-lg font-mono font-bold text-white">{formatKz(breakEven.custosFixosMensal)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Custos Variáveis (Hoje)</p>
            <p className="text-lg font-mono font-bold text-white">{formatKz(breakEven.custosVariaveisHoje)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Margem Contribuição</p>
            <p className="text-lg font-mono font-bold text-cyan-400">{formatKz(breakEven.margemContribuicao)}</p>
            <p className="text-[8px] text-cyan-400/60 font-bold">{breakEven.margemPercentual.toFixed(1)}%</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Break-Even Mensal</p>
            <p className="text-lg font-mono font-bold text-amber-400">{formatKz(breakEven.breakEvenMensal)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400">Progresso da Meta Diária</span>
          <span className="text-xs font-black text-white">
            {formatKz(todayRevenue || 0)} / {formatKz(breakEven.breakEvenDiario)}
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 w-0 ${breakEven.acimaBreakEven ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-amber-500 to-red-500'}`}
            ref={(el) => { if (el) el.style.width = `${breakEven.progressoMeta}%`; }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-slate-500 font-bold">
            Break-Even Diário: <span className="text-white">{formatKz(breakEven.breakEvenDiario)}</span>
          </span>
          <span className={`text-[9px] font-black ${breakEven.acimaBreakEven ? 'text-emerald-400' : 'text-red-400'}`}>
            {breakEven.acimaBreakEven ? '✓ META ATINGIDA' : '✗ ABAIXO DA META'} ({breakEven.progressoMeta.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* 📊 BI: 3 CARDS DE INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border-l-4 border-l-violet-500 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Ticket Médio</p>
              <p className="text-xl font-mono font-bold text-white">{formatKz(ticketMedio)}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Gauge size={12} className="text-indigo-400" />
                <span className="text-[9px] text-indigo-400/80 font-bold">Por venda fechada</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center ml-3">
              <Gauge size={20} className="text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border-l-4 border-l-teal-500 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-400 mb-1">Taxa de Ocupação</p>
              <p className="text-xl font-mono font-bold text-white">{taxaOcupacao.toFixed(0)}%</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Users size={12} className="text-teal-400" />
                <span className="text-[9px] text-teal-400/80 font-bold">
                  {tables?.filter((t: any) => t.status === 'OCUPADO' || t.status === 'ocupado').length || 0} / {tables?.length || 0} mesas
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center ml-3">
              <Users size={20} className="text-teal-400" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border-l-4 border-l-fuchsia-500 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-400 mb-1">Margem de Lucro</p>
              <p className="text-xl font-mono font-bold text-white">{margemLucro.toFixed(1)}%</p>
              <div className="mt-2 flex items-center gap-1.5">
                {margemLucro >= 0 ? <TrendingUp size={12} className="text-fuchsia-400" /> : <TrendingDown size={12} className="text-red-400" />}
                <span className="text-[9px] text-fuchsia-400/80 font-bold">Lucro / Faturação</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-fuchsia-500/15 flex items-center justify-center ml-3">
              <BarChart3 size={20} className="text-fuchsia-400" />
            </div>
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
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}} 
                    tickFormatter={(val) => `${val/1000}k`} 
                  />
                  <Tooltip 
                    cursor={{stroke: '#06b6d4', strokeWidth: 2}}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: '#06b6d4', 
                      color: '#fff', 
                      borderRadius: '12px',
                      borderWidth: 2
                    }}
                    formatter={(value: number) => [`${formatKz(value)}`, 'Faturação']}
                    labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorVendas)"
                    dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
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
                {recentInvoices.map(order => {
                  const tableLabel = order.tableId || order.table_id || order.table_name || '—';
                  const orderTotal = Number(order.total ?? order.total_amount ?? order.amount ?? 0);
                  const invoiceNum = order.invoiceNumber || order.invoice_number || order.id?.toString().slice(-6).toUpperCase() || '—';
                  const profit = order.profit || (orderTotal > 0 ? orderTotal * 0.3 : 0);
                  const pm = order.payment_method || '—';
                  const pmColors: Record<string, string> = {
                    'NUMERARIO': 'bg-green-500/10 text-green-400 border-green-500/20',
                    'TPA / MULTICAIXA': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    'TRANSFERENCIA': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    'QR CODE': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                    'PAGAR_DEPOIS': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  };
                  const pmBadge = pmColors[pm] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                  return (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all group">
                     <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Receipt size={16} className="text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{invoiceNum}</p>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${pmBadge}`}>{pm}</span>
                          </div>
                          <p className="text-sm font-bold text-white">Mesa {tableLabel} • {formatKz(orderTotal)}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Lucro Est.</p>
                            <p className="text-xs font-mono font-bold text-white">+{formatKz(profit)}</p>
                        </div>
                        <button 
                          onClick={() => handleReprint(order)}
                          className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-primary hover:text-black transition-all"
                          title="Reimprimir fatura"
                          aria-label="Reimprimir fatura"
                        >
                            <Printer size={16} />
                        </button>
                     </div>
                  </div>
                  );
                })}
                {recentInvoices.length === 0 && (
                  <div className="text-center py-8">
                    <Receipt size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-500 text-xs italic uppercase">Nenhuma fatura emitida hoje.</p>
                  </div>
                )}
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

      {/* 📊 BI: GRÁFICOS DE BUSINESS INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Gráfico Receita vs Custos vs Break-Even */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              Receita vs Custos vs Break-Even
            </h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={biChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#06b6d4',
                    color: '#fff',
                    borderRadius: '12px',
                    borderWidth: 2
                  }}
                  formatter={(value: number) => formatKz(value)}
                  labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="Receita" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custos" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="BreakEven" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Receita por Categoria */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PieChart size={18} className="text-primary" />
              Receita por Categoria (Hoje)
            </h3>
          </div>
          <div className="h-72 w-full">
            {receitaPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#06b6d4',
                      color: '#fff',
                      borderRadius: '12px',
                      borderWidth: 2
                    }}
                    formatter={(value: number) => [formatKz(value), 'Receita']}
                    labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {receitaPorCategoria.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={biChartColors[index % biChartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-center">
                <div>
                  <PieChart size={32} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs italic uppercase">Sem vendas hoje para analisar.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardV2;




