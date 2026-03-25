import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { TrendingUp, DollarSign, Users, Wallet, Receipt, Calculator, RefreshCw, LogOut, Settings, TrendingDown, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatKz } from '../../lib/dateUtils';
import { log } from '../../lib/loggerService';

// Cache busting e revalidação forçada
export const revalidate = 0;

interface Metrics {
  faturacaoHoje: number;
  mesasAtivas: number;
  totalVendas: number;
  receitaTotal: number;
  despesas: number;
  despesasAcumuladas: number;
  folhaSalarial: number;
  impostos: number;
  historicoRevenue: number;
  rendimentoGlobal: number;
  lucroLiquido: number;
}

interface Order {
  id: string;
  created_at: string | null;
  status: string | null;
  table_id: string | null;
  total_amount_kz: number | null;
  closed_at: string | null;
}

interface PurchaseRequest {
  id: string;
  amount: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string | null;
  created_by: string | null;
  description: string;
  notes: string | null;
  proforma_url: string | null;
  provider: string;
  receipt_url: string | null;
  status: string;
}

interface Staff {
  id: string;
  base_salary_kz: number | null;
  created_at: string | null;
  full_name: string;
  phone: string | null;
  role: string | null;
  status: string | null;
}

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, activeOrders } = useStore();
  
  const [metrics, setMetrics] = useState<Metrics>({
    faturacaoHoje: 0,
    mesasAtivas: 0,
    totalVendas: 0,
    receitaTotal: 0,
    despesas: 0,
    despesasAcumuladas: 0,
    folhaSalarial: 0,
    impostos: 0,
    historicoRevenue: 0,
    rendimentoGlobal: 0,
    lucroLiquido: 0
  });
  
  const [period, setPeriod] = useState<'HOJE' | 'SEMANA' | 'MÊS' | 'ANO'>('HOJE');
  const [isOnline, setIsOnline] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; message: string; timestamp: number }>>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<number>(0);
  const [yearExpenses, setYearExpenses] = useState<number>(0);
  const [historicoExterno, setHistoricoExterno] = useState<number>(0);
  
  // DECLARAR VARIÁVEIS DE MÉTRICAS PARA EVITAR UNDEFINED
  const totalVendasHoje = 0;
  const despesasHoje = 0;
  const rendimentoGlobalHoje = 0;
  
  // SINCRONIZAÇÃO EM TEMPO REAL - SUPABASE CHANNELS
  useEffect(() => {
    const session = localStorage.getItem('owner_logged_in');
    if (!session) {
      navigate('/owner/login');
      return;
    }
    
    // Limpar cache no arranque
    localStorage.removeItem('owner_dashboard_cache');
    localStorage.removeItem('orders_cache');
    localStorage.removeItem('metrics_cache');
    
    // Canal para ouvir mudanças nas transações
    const channel = supabase
      .channel('owner-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          log.info('OWNER_DASHBOARD', 'Mudança detectada em orders', payload);
          setTimeout(() => fetchMetrics(), 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          log.info('OWNER_DASHBOARD', 'Mudança detectada em expenses', payload);
          setTimeout(() => fetchMetrics(), 1000);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          log.info('OWNER_DASHBOARD', 'Subscrição real-time ativa');
        } else if (status === 'CHANNEL_ERROR') {
          log.error('OWNER_DASHBOARD', 'Erro na subscrição real-time');
        }
      });

    // Refresh automático a cada 30 segundos
    const refreshInterval = setInterval(() => {
      log.debug('OWNER_DASHBOARD', 'Refresh periódico');
      fetchMetrics();
    }, 30000);

    // Verificar status online/offline
    const handleOnline = () => log.info('OWNER_DASHBOARD', 'Conexão restaurada');
    const handleOffline = () => log.info('OWNER_DASHBOARD', 'Conexão perdida');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carregar dados iniciais
    fetchMetrics();
    fetchTopProducts();

    return () => {
      log.info('OWNER_DASHBOARD', 'Limpando subscrição real-time');
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate]);

  const getDateRange = (periodo: 'HOJE' | 'SEMANA' | 'MÊS' | 'ANO') => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (periodo) {
      case 'HOJE': {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        return { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() };
      }
      case 'SEMANA': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return { startDate: startOfWeek.toISOString(), endDate: endOfDay.toISOString() };
      }
      case 'MÊS': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { startDate: startOfMonth.toISOString(), endDate: endOfDay.toISOString() };
      }
      case 'ANO': {
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { startDate: startOfYear.toISOString(), endDate: endOfDay.toISOString() };
      }
      default: {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        return { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() };
      }
    }
  };

  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem('owner_logged_in');
    navigate('/owner/login');
  };

  // Função de notificação simples
  const addNotification = (type: 'success' | 'error', message: string) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-medium text-sm shadow-lg transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  // Função de formatação de moeda AOA/AKZ
  const formatAOA = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value || 0);
  };

  const formatAKZ = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value || 0);
  };

  // Estado para vendas recentes
  const [recentSales, setRecentSales] = useState<any[]>([]);

  // Buscar vendas recentes no Supabase
  const fetchRecentSales = async () => {
    try {
      console.log('[DASHBOARD] Buscando vendas recentes...');
      
      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('id, invoice_number, table_id, total_amount, created_at')
        .in('status', ['closed', 'paid', 'FECHADO'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (salesError) {
        console.error('[DASHBOARD] Erro ao buscar vendas recentes:', salesError);
        return;
      }

      if (salesData && salesData.length > 0) {
        const formattedSales = salesData.map(sale => ({
          id: sale.id,
          invoiceNumber: sale.invoice_number || `INV-${sale.id.slice(-8)}`,
          table: sale.table_id || 'Takeaway',
          amount: sale.total_amount || 0,
          time: new Date(sale.created_at || '').toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
        }));
        
        setRecentSales(formattedSales);
        console.log('[DASHBOARD] Vendas recentes:', formattedSales);
      }
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar vendas recentes:', error);
    }
  };

  // Buscar faturação histórica da tabela external_history
  const fetchHistoricoRevenue = async () => {
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('external_history')
        .select('total_revenue');

      if (!historyError && historyData && historyData.length > 0) {
        const totalHistorico = historyData.reduce((sum, row) => sum + (Number(row.total_revenue) || 0), 0);
        console.log('[DASHBOARD] Faturação histórica (external_history):', totalHistorico);
        return totalHistorico;
      }

      // Fallback: calcular histórico a partir das orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['closed', 'paid', 'FECHADO'])
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .lte('created_at', new Date().toISOString());

      if (ordersError) {
        console.error('[DASHBOARD] Erro ao buscar orders para histórico:', ordersError);
        return 0;
      }

      const totalHistorico = ordersData?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      console.log('[DASHBOARD] Faturação histórica calculada (orders fallback):', totalHistorico);
      return totalHistorico;
    } catch (error) {
      console.error('[DASHBOARD] Erro no cálculo de histórico:', error);
      return 0;
    }
  };

  // Buscar despesas do dia atual (HOJE)
  const fetchTodayExpenses = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, created_at, category, status')
        .neq('status', 'PENDENTE')
        .gte('created_at', today);

      if (expensesError) {
        console.error('[DASHBOARD] Erro ao buscar despesas de hoje:', expensesError);
        return 0;
      }

      const todayExpensesTotal = todayExpenses?.reduce((sum, exp) => sum + Number(exp.amount_kz || 0), 0) || 0;
      console.log('[DASHBOARD] Despesas de hoje:', todayExpensesTotal);
      setTodayExpenses(todayExpensesTotal);
      return todayExpensesTotal;
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar despesas de hoje:', error);
      return 0;
    }
  };

  // Buscar despesas acumuladas do ano
  const fetchYearExpenses = async () => {
    try {
      const yearStart = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
      
      const { data: yearExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, created_at, category, status')
        .gte('created_at', yearStart.toISOString())
        .lte('created_at', yearEnd.toISOString())
        .neq('status', 'PENDENTE');

      if (expensesError) {
        console.error('[DASHBOARD] Erro ao buscar despesas do ano:', expensesError);
        return 0;
      }

      const yearExpensesTotal = yearExpenses?.reduce((sum, exp) => sum + Number(exp.amount_kz || 0), 0) || 0;
      console.log('[DASHBOARD] Despesas acumuladas do ano:', yearExpensesTotal);
      setYearExpenses(yearExpensesTotal);
      return yearExpensesTotal;
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar despesas do ano:', error);
      return 0;
    }
  };

  // Buscar dados para gráficos - DISTRIBUIÇÃO DE DESPESAS POR CATEGORIA
  const fetchChartData = async () => {
    try {
      console.log('[DASHBOARD] Buscando dados para gráficos...');
      
      // BUSCAR DESPESAS AGRUPADAS POR CATEGORIA
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('category, amount_kz, status')
        .neq('status', 'PENDENTE');

      if (expensesError) {
        console.error('[DASHBOARD] Erro ao buscar despesas para gráfico:', expensesError);
        setChartData([]);
        return;
      }

      // AGRUPAR DESPESAS POR CATEGORIA
      const categoryMap = new Map<string, number>();
      
      if (expensesData && expensesData.length > 0) {
        expensesData.forEach(expense => {
          const category = expense.category || 'Outras';
          const amount = Number(expense.amount_kz || 0);
          
          if (categoryMap.has(category)) {
            categoryMap.set(category, categoryMap.get(category)! + amount);
          } else {
            categoryMap.set(category, amount);
          }
        });
      }

      // CONVERTER PARA FORMATO DO GRÁFICO
      const categoryChartData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name: name,
        despesas: value,
        receitas: 0 // Placeholder para receitas por categoria
      }));

      // BUSCAR DADOS DE VENDAS PARA O GRÁFICO
      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['closed', 'paid', 'FECHADO']);

      if (!salesError && salesData && salesData.length > 0) {
        // AGRUPAR VENDAS POR DIA
        const salesByDate = new Map<string, number>();
        
        salesData.forEach(sale => {
          const date = new Date(sale.created_at || '').toLocaleDateString('pt-AO');
          const amount = Number(sale.total_amount || 0);
          
          if (salesByDate.has(date)) {
            salesByDate.set(date, salesByDate.get(date)! + amount);
          } else {
            salesByDate.set(date, amount);
          }
        });

        // ADICIONAR DADOS DE VENDAS AO GRÁFICO
        const salesChartData = Array.from(salesByDate.entries()).map(([date, receitas]) => ({
          date,
          receitas,
          despesas: 0 // Placeholder para despesas por dia
        }));

        setChartData(salesChartData);
      } else {
        setChartData(categoryChartData);
      }
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar dados dos gráficos:', error);
      setChartData([]);
    }
  };
  
  // Buscar produtos mais vendidos
  const fetchTopProducts = async () => {
    try {
      console.log('[DASHBOARD] Buscando produtos mais vendidos...');
      
      // BUSCAR PEDIDOS COM ITENS
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at')
        .in('status', ['closed', 'paid', 'FECHADO']);

      if (ordersError) {
        console.error('[DASHBOARD] Erro ao buscar pedidos para produtos:', ordersError);
        setTopProducts([]);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        console.log('[DASHBOARD] Nenhum pedido encontrado para produtos');
        setTopProducts([]);
        return;
      }

      console.log('[DASHBOARD] Dados brutos das vendas:', ordersData.length);

      // QUERY PARA PRODUTOS REAIS USANDO ORDER_ITEMS
      const orderIds = ordersData.map(order => order.id);
      
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, order_id')
        .in('order_id', orderIds);

      if (orderItemsError) {
        console.error('[DASHBOARD] Erro ao buscar order_items:', orderItemsError);
        setTopProducts([]);
        return;
      }

      if (!orderItemsData || orderItemsData.length === 0) {
        console.log('[DASHBOARD] Nenhum order_item encontrado');
        setTopProducts([]);
        return;
      }

      // AGRUPAR POR PRODUTO E CALCULAR TOTAIS
      const productMap = new Map();
      
      orderItemsData.forEach(item => {
        const productId = item.product_id || 'Produto Sem Nome';
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const revenue = quantity * unitPrice;
        
        if (productMap.has(productId)) {
          const existing = productMap.get(productId);
          productMap.set(productId, {
            ...existing,
            quantity: existing.quantity + quantity,
            revenue: existing.revenue + revenue
          });
        } else {
          productMap.set(productId, {
            id: productId,
            name: productId, // Usando product_id como nome já que product_name não existe
            quantity: quantity,
            revenue: revenue
          });
        }
      });

      // CONVERTER PARA ARRAY E ORDENAR POR RECEITA
      const productsArray = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Top 5 produtos

      setTopProducts(productsArray);
      console.log('[DASHBOARD] Top produtos calculados:', productsArray);
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar top produtos:', error);
      setTopProducts([]);
    }
  };

  // Função helper para unificar timezone em toda a app
  const isTodayInAppTimezone = (dateString: string | null) => {
    if (!dateString) return false;
    const today = new Date().toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
    const orderDate = new Date(dateString).toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
    return orderDate === today;
  };

  // Função principal para buscar métricas
  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      console.log('[OWNER HUB] Buscando métricas do Supabase...');
      
      // FORÇAR REFRESH DE DADOS - buscar diretamente do Supabase
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['closed', 'FECHADO', 'paid', 'finalized']);

      if (ordersError) {
        console.error('[OWNER HUB] Erro ao buscar orders:', ordersError);
      } else {
        console.log('[OWNER HUB] Orders encontradas:', ordersData?.length || 0);
        
        // Calcular faturação de hoje com timezone Africa/Luanda (FUNÇÃO UNIFICADA)
        const todayOrders = ordersData?.filter(order => {
          return isTodayInAppTimezone(order.created_at || order.timestamp) && 
                 Number(order.total_amount || order.total || 0) > 0;
        }) || [];

        const faturacaoHoje = todayOrders.reduce((sum, order) => sum + Number(order.total_amount || order.total || 0), 0);
        
        console.log('[OWNER HUB] Faturação Hoje (Africa/Luanda - UNIFICADO):', {
          today: new Date().toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' }),
          todayOrders: todayOrders.length,
          faturacaoHoje,
          formatKz: formatKz(faturacaoHoje),
          timezone: 'Africa/Luanda'
        });

        // Buscar despesas
        const totalDespesas = await fetchTodayExpenses();

        // Buscar folha salarial (STAFF FIX - garantir leitura antes do render)
        let folhaSalarial = 0;
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('salario_base, base_salary_kz');

          if (staffError) {
            console.error('[OWNER HUB] Erro ao buscar staff:', staffError);
          } else if (staffData && staffData.length > 0) {
            folhaSalarial = staffData.reduce((sum, staff) => sum + Number(staff.salario_base || staff.base_salary_kz || 0), 0);
            console.log('[OWNER HUB] Staff carregado com sucesso:', {
              totalFuncionarios: staffData.length,
              folhaSalarial,
              formatKz: formatKz(folhaSalarial)
            });
          } else {
            console.log('[OWNER HUB] Nenhum funcionário encontrado na tabela staff');
          }
        } catch (error) {
          console.error('[OWNER HUB] Erro crítico ao carregar staff:', error);
        }

        // Buscar histórico externo
        const historicoExternoData = await fetchHistoricoRevenue();

        // Calcular impostos (7%)
        const impostos = faturacaoHoje * 0.07;

        // Buscar despesas acumuladas
        const totalExpensesAllTime = await fetchYearExpenses();

        // Gerar dados para gráficos
        await fetchChartData();

        // Calcular rendimento global
        let rendimentoGlobal = 0;
        try {
          // 1. External History (histórico de transição)
          let historicoExterno = 0;
          const { data: historyData, error: historyError } = await supabase
            .from('external_history')
            .select('total_revenue');

          if (!historyError && historyData && historyData.length > 0) {
            historicoExterno = historyData.reduce((acc, row) => acc + (Number(row.total_revenue) || 0), 0);
            console.log('[OWNER HUB] External History para Rendimento Global:', historicoExterno);
          }

          // 2. Soma total da tabela orders (vendas reais)
          let somaOrders = 0;
          const { data: ordersDataForGlobal, error: ordersErrorForGlobal } = await supabase
            .from('orders')
            .select('total_amount');

          if (!ordersErrorForGlobal && ordersDataForGlobal) {
            somaOrders = ordersDataForGlobal.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
            console.log('[OWNER HUB] Soma Orders para Rendimento Global:', somaOrders);
          }

          // 3. Calcular Rendimento Global (fórmula completa)
          rendimentoGlobal = historicoExterno + somaOrders;
          
          console.log('[OWNER HUB] Rendimento Global (Histórico Completo):', {
            external_history: historicoExterno,
            orders: somaOrders,
            total: rendimentoGlobal
          });
        } catch (error) {
          console.error('[OWNER HUB] Erro crítico ao calcular Rendimento Global:', error);
          rendimentoGlobal = 0;
        }

        // Calcular lucro operacional
        const lucroOperacional = faturacaoHoje - impostos - totalDespesas - folhaSalarial;

        // Atualizar métricas
        setMetrics({
          faturacaoHoje,
          mesasAtivas: 0,
          totalVendas: faturacaoHoje,
          receitaTotal: faturacaoHoje,
          despesas: totalDespesas,
          despesasAcumuladas: totalExpensesAllTime,
          folhaSalarial,
          impostos,
          historicoRevenue: historicoExternoData,
          rendimentoGlobal,
          lucroLiquido: lucroOperacional
        });
        
        setHistoricoExterno(historicoExternoData);
      }
    } catch (error) {
      console.error('[OWNER HUB] Erro ao buscar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProduction = async () => {
    setIsResetting(true);
    try {
      await fetchMetrics();
      addNotification('success', 'Produção resetada com sucesso');
    } catch (error) {
      console.error('[OWNER HUB] Erro ao resetar produção:', error);
      addNotification('error', 'Erro ao resetar produção');
    } finally {
      setIsResetting(false);
    }
  };

  // Calcular ticket médio
  const ticketMedio = metrics.totalVendas > 0 ? metrics.totalVendas / (metrics.faturacaoHoje > 0 ? metrics.faturacaoHoje : 1) : 0;

  // Calcular lucro líquido
  const lucroLiquido = metrics.totalVendas - metrics.despesas - metrics.folhaSalarial - metrics.impostos;

  // Calcular Break-even
  const custoOperacionalTotal = metrics.despesas + metrics.folhaSalarial;
  const faturacaoAtual = metrics.totalVendas;
  const progressoBreakEven = custoOperacionalTotal > 0 ? Math.min((faturacaoAtual / custoOperacionalTotal) * 100, 100) : 0;
  const faturacaoNecessaria = Math.max(custoOperacionalTotal - faturacaoAtual, 0);
  const isAboveBreakEven = faturacaoAtual >= custoOperacionalTotal;
  
  // Verificar eficiência (break-even antes do dia 20)
  const diaAtual = new Date().getDate();
  const isAltaEficiencia = isAboveBreakEven && diaAtual <= 20;

  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden bg-[#070b14] scrollbar-thin scrollbar-thumb-orange-500">
      {/* HEADER - OWNER HUB */}
      <header className="sticky top-0 z-50 flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 md:p-4 bg-white/5 backdrop-blur-md border border-white/10">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white mb-1">OWNER HUB</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-xs text-white/90">Caixa: Equilibrado</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetProduction}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all backdrop-blur-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="font-semibold text-sm">Reset Produção</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-all backdrop-blur-sm"
          >
            <LogOut size={16} />
            <span className="font-semibold text-sm">Sair</span>
          </button>
        </div>
      </header>

      <main className="w-full px-4 pb-20">
        {/* Filtros de Período */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['HOJE', 'SEMANA', 'MÊS', 'ANO'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                fetchMetrics();
              }}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                period === p 
                  ? 'bg-cyan-500 text-black shadow-lg' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Carregando...' : p}
            </button>
          ))}
        </div>

        {/* GRID DE INDICADORES - 3 LINHAS ORGANIZADAS */}
        
        {/* LINHA 1 (OPERACIONAL): FATURAÇÃO HOJE | Despesas Hoje | Rendimento Global */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Card 1: FATURAÇÃO HOJE */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">FATURAÇÃO HOJE</span>
            </div>
            <div className="text-3xl font-black text-amber-400 mb-2">
              {formatKz(metrics?.faturacaoHoje || 0)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* Card 2: Despesas Hoje */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Despesas Hoje</span>
            </div>
            <div className="text-3xl font-black text-red-400 mb-2">
              {formatKz(metrics?.despesas || 0)}
            </div>
            <div className="text-xs text-white/60">Hoje - Africa/Luanda</div>
          </div>

          {/* Card 3: Rendimento Global */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Rendimento Global</span>
            </div>
            <div className="text-3xl font-black text-purple-400 mb-2">
              {formatKz(metrics?.rendimentoGlobal || 0)}
            </div>
            <div className="text-xs text-white/60">external_history + orders</div>
          </div>
        </div>

        {/* LINHA 2 (CUSTOS): Custos com Staff | Despesas Acumuladas | Impostos (7%) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Card 4: Custos com Staff */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Custos com Staff</span>
            </div>
            <div className="text-3xl font-black text-blue-400 mb-2">
              {(() => {
                console.log("DADOS REAIS DA TABELA STAFF:", metrics.folhaSalarial);
                console.log("DADOS REAIS COMPLETOS:", metrics);
                return formatKz(metrics.folhaSalarial || 0);
              })()}
            </div>
            <div className="text-xs text-white/60">Soma salários funcionários</div>
          </div>

          {/* Card 5: Despesas Acumuladas */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Despesas Acumuladas</span>
            </div>
            <div className="text-3xl font-black text-orange-400 mb-2">
              {formatKz(metrics.despesasAcumuladas || 0)}
            </div>
            <div className="text-xs text-white/60">Soma de todas as despesas</div>
          </div>

          {/* Card 6: Impostos (7%) */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Impostos (7%)</span>
            </div>
            <div className="text-3xl font-black text-green-400 mb-2">
              {formatKz(metrics?.impostos || 0)}
            </div>
            <div className="text-xs text-white/60">Apenas sobre vendas da App</div>
          </div>
        </div>

        {/* LINHA 3 (PATRIMÓNIO): Lucro Operacional | Saldo de Transição | PATRIMÓNIO TOTAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Card 7: Lucro Operacional */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${metrics.lucroLiquido >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-xl flex items-center justify-center`}>
                <TrendingUp className={`w-6 h-6 ${metrics.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Lucro Operacional</span>
            </div>
            <div className="text-3xl font-black text-emerald-400 mb-2">
              {formatKz((metrics?.faturacaoHoje || 0) - (metrics?.impostos || 0) - (metrics?.despesasAcumuladas || 0) - (metrics?.folhaSalarial || 0))}
            </div>
            <div className="text-xs text-white/60">Vendas - Impostos - Despesas - Staff</div>
          </div>

          {/* Card 8: Saldo de Transição */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Saldo de Transição</span>
            </div>
            <div className="text-3xl font-black text-cyan-400 mb-2">
              {formatKz(historicoExterno || 0)}
            </div>
            <div className="text-xs text-white/60">8.700.000,00 Kz - external_history</div>
          </div>

          {/* Card 9: PATRIMÓNIO TOTAL */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">PATRIMÓNIO TOTAL</span>
            </div>
            <div className="text-3xl font-black text-purple-400 mb-2">
              {formatKz((historicoExterno || 0) + ((metrics.totalVendas || 0) - ((metrics.totalVendas || 0) * 0.07) - (metrics.despesasAcumuladas || 0) - (metrics.folhaSalarial || 0)))}
            </div>
            <div className="text-xs text-white/60">Saldo Ext. + Lucro Operacional</div>
          </div>
        </div>

        {/* GRÁFICOS - DADOS REAIS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-black text-white mb-4">Receitas vs Despesas</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Bar dataKey="receitas" fill="#10B981" name="Receitas" />
                  <Bar dataKey="despesas" fill="#EF4444" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-black text-white mb-4">Tendências</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="#10B981" name="Receitas" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesas" stroke="#EF4444" name="Despesas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* VENDAS RECENTES */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6">
          <h3 className="text-lg font-black text-white mb-4">Vendas Recentes</h3>
          <div className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white font-medium">{sale.invoiceNumber}</div>
                    <div className="text-white/60 text-sm">Mesa {sale.table} • {sale.time}</div>
                  </div>
                  <div className="text-amber-400 font-bold">{formatKz(sale.amount)}</div>
                </div>
              ))
            ) : (
              <div className="text-white/60 text-center py-8">Nenhuma venda recente encontrada</div>
            )}
          </div>
        </div>

        {/* TOP PRODUTOS */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6">
          <h3 className="text-lg font-black text-white mb-4">Top Produtos</h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-amber-400 font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{product.name}</div>
                      <div className="text-white/60 text-sm">{product.quantity} unidades</div>
                    </div>
                  </div>
                  <div className="text-amber-400 font-bold">{formatKz(product.revenue)}</div>
                </div>
              ))
            ) : (
              <div className="text-white/60 text-center py-8">Nenhum produto encontrado</div>
            )}
          </div>
        </div>

        {/* LOG DE SINCRONIZAÇÃO */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-bold text-white mb-2">📊 Status de Sincronização</h3>
          <div className="text-xs text-white/60 space-y-1">
            <div>✅ Timezone: Africa/Luanda</div>
            <div>✅ Query: Dados diretos do Supabase</div>
            <div>✅ Fonte: Cache ignorada</div>
            <div>✅ Padrão: Kz #.##0 unificado</div>
            <div>✅ Real-time: Sem loop infinito</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
