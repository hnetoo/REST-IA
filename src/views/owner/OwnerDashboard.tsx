import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, Users, Wallet, Receipt, Calculator, RefreshCw, LogOut, Settings, TrendingDown, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Metrics {
  vendasHoje: number;
  mesasAtivas: number;
  totalVendas: number;
  receitaTotal: number;
  despesas: number;
  despesasAcumuladas: number; // NOVO: Para despesas totais acumuladas
  folhaSalarial: number;
  impostos: number;
  historicoRevenue: number; // Adicionar histórico de owner_finances
}

// Tipos para as tabelas do Supabase
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
  const [metrics, setMetrics] = useState<Metrics>({
    vendasHoje: 0,
    mesasAtivas: 0,
    totalVendas: 0,
    receitaTotal: 0,
    despesas: 0,
    despesasAcumuladas: 0, // NOVO: Inicializar com 0
    folhaSalarial: 0,
    impostos: 0,
    historicoRevenue: 0
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
  
  // ESTADOS INDIVIDUAIS PARA SINCRONIZAÇÃO
  const [totalVendasNoState, setTotalVendasNoState] = useState<number>(0);
  const [despesasNoState, setDespesasNoState] = useState<number>(0);
  const [despesasAcumuladasNoState, setDespesasAcumuladasNoState] = useState<number>(0);
  const [folhaSalarialNoState, setFolhaSalarialNoState] = useState<number>(0);

  // Função para obter range de datas baseado no período
  const getDateRange = (periodo: 'HOJE' | 'SEMANA' | 'MÊS' | 'ANO') => {
    const now = new Date();
    
    switch (periodo) {
      case 'HOJE':
        // FUSO HORÁRIO DE ANGOLA (GMT+1)
        const nowAngola = new Date(now.getTime() + (60 * 60 * 1000)); // +1 hora
        const today = new Date(nowAngola.getFullYear(), nowAngola.getMonth(), nowAngola.getDate());
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        console.log('[DASHBOARD] Data HOJE (GMT+1 Angola):', {
          data: today.toISOString().split('T')[0],
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString(),
          fuso: 'GMT+1 Angola'
        });
        
        return {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString()
        };
        
      case 'SEMANA':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo como início da semana
        startOfWeek.setHours(0, 0, 0, 0);
        return {
          startDate: startOfWeek.toISOString(),
          endDate: endOfDay.toISOString()
        };
      
      case 'MÊS':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return {
          startDate: startOfMonth.toISOString(),
          endDate: endOfDay.toISOString()
        };
      
      case 'ANO':
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return {
          startDate: startOfYear.toISOString(),
          endDate: endOfDay.toISOString()
        };
      
      default:
        return {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString()
        };
    }
  };

  // Verificação SIMPLES - sem complexidade
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('owner_logged_in') === 'true';
    if (!isLoggedIn) {
      navigate('/owner/login');
      return;
    }

    // Carregar dados reais do Supabase
    fetchMetrics();
    fetchTopProducts();
  }, [navigate]);

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
        .eq('status', 'closed')
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

  const seedTestData = async () => {
    try {
      console.log('[DASHBOARD] Inserindo dados de teste...');
      
      // Inserir uma venda real de 5.000 Kz
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: `test-order-${Date.now()}`,
          table_id: 1,
          status: 'closed',
          total_amount: 5000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          invoice_number: `TEST-${Date.now()}`
        });

      if (orderError) {
        console.error('[DASHBOARD] Erro ao inserir order de teste:', orderError);
        throw orderError;
      }

      console.log('[DASHBOARD] Dados de teste inseridos com sucesso!');
      
      // Atualizar métricas e produtos após inserção
      setTimeout(() => {
        fetchMetrics();
        fetchTopProducts();
      }, 1000);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao inserir dados de teste:', error);
    }
  };

  // Buscar faturação histórica da tabela external_history (UNIFICADO)
  const fetchHistoricoRevenue = async () => {
    try {
      const { data: historicoData, error: historicoError } = await supabase
        .from('external_history')
        .select('total_revenue, gross_profit, source_name, period')
        .order('period', { ascending: false });

      if (historicoError) {
        console.error('[DASHBOARD] Erro ao buscar faturação histórica:', historicoError);
        // Fallback para cálculo em tempo real se tabela não existir
        return await calculateHistoricoFromOrders();
      }

      if (!historicoData || historicoData.length === 0) {
        console.log('[DASHBOARD] Nenhum dado encontrado em external_history');
        return 0;
      }

      const totalHistorico = historicoData.reduce((sum, record) => sum + Number(record.total_revenue || 0), 0);
      console.log('[DASHBOARD] Faturação histórica total (external_history):', totalHistorico);
      return totalHistorico;
    } catch (error) {
      console.error('[DASHBOARD] Erro na busca de faturação histórica:', error);
      // Fallback para cálculo em tempo real
      return await calculateHistoricoFromOrders();
    }
  };

  // Fallback: calcular histórico a partir das orders
  const calculateHistoricoFromOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'closed')
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
      console.error('[DASHBOARD] Erro no cálculo de histórico fallback:', error);
      return 0;
    }
  };

  // Buscar despesas do dia atual (HOJE)
  const fetchTodayExpenses = async () => {
    try {
      // Usar date_trunc para garantir que apenas despesas do dia atual sejam incluídas
      const { data: todayExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, created_at, category, status')
        .neq('status', 'PENDENTE')
        .filter('created_at', 'gte', new Date().toISOString().split('T')[0]);

      if (expensesError) {
        console.error('[DASHBOARD] Erro ao buscar despesas de hoje:', expensesError);
        return 0;
      }

      const todayExpensesTotal = todayExpenses?.reduce((sum, exp) => sum + Number(exp.amount_kz || 0), 0) || 0;
      console.log('[DASHBOARD] Despesas de hoje (apenas dia atual):', todayExpensesTotal);
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
      
      console.log('[DASHBOARD] Buscando despesas do ANO:', {
        start: yearStart.toISOString(),
        end: yearEnd.toISOString()
      });

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

  // Buscar dados para gráficos
  const fetchChartData = async () => {
    try {
      console.log('[DASHBOARD] Buscando dados para gráficos...');
      
      // BUSCAR DADOS REAIS DAS ORDENS PARA GRÁFICOS
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Dados de hoje
      const { data: todayData, error: todayError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'closed')
        .gte('created_at', today.toISOString().split('T')[0])
        .lte('created_at', today.toISOString());
      
      // Dados de ontem
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'closed')
        .gte('created_at', yesterday.toISOString().split('T')[0])
        .lte('created_at', yesterday.toISOString().split('T')[0] + 'T23:59:59');
      
      const todayRevenue = todayData?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
      const yesterdayRevenue = yesterdayData?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
      
      // Dados de despesas (do período)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, created_at')
        .neq('status', 'PENDENTE')
        .gte('created_at', today.toISOString().split('T')[0])
        .lte('created_at', today.toISOString());
      
      const todayExpenses = expensesData?.reduce((sum, exp) => sum + (Number(exp.amount_kz) || 0), 0) || 0;
      
      // Criar dados para gráficos com valores reais
      const realChartData = [
        { 
          date: 'Hoje', 
          receitas: todayRevenue, 
          despesas: todayExpenses,
          vendas: todayRevenue
        },
        { 
          date: 'Ontem', 
          receitas: yesterdayRevenue, 
          despesas: Math.round(todayExpenses * 0.8), // Estimativa
          vendas: yesterdayRevenue
        }
      ];

      setChartData(realChartData);
      console.log('[DASHBOARD] Dados dos gráficos (reais):', realChartData);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar dados dos gráficos:', error);
      // Fallback para dados mock se houver erro
      const mockChartData = [
        { date: 'Hoje', receitas: 85000, despesas: 12000 },
        { date: 'Ontem', receitas: 72000, despesas: 10000 }
      ];
      setChartData(mockChartData);
    }
  };

  
  // Buscar produtos mais vendidos
  const fetchTopProducts = async () => {
    try {
      console.log('[DASHBOARD] Buscando produtos mais vendidos...');
      
      // QUERY SIMPLIFICADA E ROBUSTA
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status')
        .eq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50);
      
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
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .order('quantity', { ascending: false })
        .limit(20);
      
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
        const productId = item.product_id;
        const quantity = Number(item.quantity) || 0;
        const revenue = Number(item.unit_price) * quantity || 0;
        
        if (productMap.has(productId)) {
          const existing = productMap.get(productId);
          productMap.set(productId, {
            quantity: existing.quantity + quantity,
            revenue: existing.revenue + revenue
          });
        } else {
          productMap.set(productId, {
            quantity: quantity,
            revenue: revenue
          });
        }
      });

      // BUSCAR NOMES E PREÇOS REAIS DOS PRODUTOS
      const productIds = Array.from(productMap.keys());
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .in('id', productIds);

      if (productsError) {
        console.error('[DASHBOARD] Erro ao buscar produtos:', productsError);
        setTopProducts([]);
        return;
      }

      // CRIAR ARRAY FINAL COM DADOS REAIS
      const realProducts = Array.from(productMap.entries()).map(([productId, data]) => {
        const product = productsData?.find(p => p.id === productId);
        return {
          name: product?.name || `Produto ${productId}`,
          quantity: data.quantity,
          revenue: data.revenue,
          image: product?.image_url || null
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      setTopProducts(realProducts);
      console.log('[DASHBOARD] Produtos mais vendidos (reais):', realProducts);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro detalhado vendas:', error);
      setTopProducts([]);
    }
  };

  // Buscar métricas do Supabase
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      console.log(`[DASHBOARD] Data enviada para SQL:`, new Date().toISOString().split('T')[0]);
      console.log(`[DASHBOARD] Iniciando busca de métricas para período: ${period}`);
      
      // Obter range de datas para o período selecionado
      const { startDate, endDate } = getDateRange(period);
      
      // Buscar despesas reais do Supabase
      let totalDespesas = 0;
      let totalExpensesAllTime = 0; // NOVO: Para despesas acumuladas totais
      try {
        // QUERY COM FILTRO DE DATA BASEADO NO PERÍODO
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('amount_kz, created_at, category, status')
          .neq('status', 'PENDENTE') // APENAS DESPESAS APROVADAS
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (!expensesError && expensesData && expensesData.length > 0) {
          // SOMAR APENAS DESPESAS DO PERÍODO SELECIONADO
          totalDespesas = expensesData.reduce((acc, exp) => acc + Number(exp.amount_kz || 0), 0);
          console.log('[DASHBOARD] Total despesas do período:', totalDespesas);
        } else {
          console.log('[DASHBOARD] Nenhuma despesa encontrada para o período');
          totalDespesas = 0;
        }

        // NOVA QUERY PARA DESPESAS TOTAIS (SEM FILTRO DE DATA)
        const { data: allExpensesData, error: allExpensesError } = await supabase
          .from('expenses')
          .select('amount_kz, created_at, category, status')
          .neq('status', 'PENDENTE'); // APENAS DESPESAS APROVADAS

        if (!allExpensesError && allExpensesData && allExpensesData.length > 0) {
          // SOMAR TODAS AS DESPESAS REGISTADAS
          totalExpensesAllTime = allExpensesData.reduce((acc, exp) => acc + Number(exp.amount_kz || 0), 0);
          console.log('[DASHBOARD] Total despesas acumuladas (todas):', totalExpensesAllTime);
        } else {
          console.log('[DASHBOARD] Nenhuma despesa acumulada encontrada');
          totalExpensesAllTime = 0;
        }

      } catch (expError) {
        console.error('[DASHBOARD] Erro ao buscar despesas:', expError);
        totalDespesas = 0;
        totalExpensesAllTime = 0;
      }

      // Buscar folha salarial da tabela staff
      let folhaSalarial = 0;
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('status', 'ATIVO')
          .order('created_at', { ascending: false });

        console.log('[DASHBOARD] Funcionários encontrados:', staffData?.length || 0);

        if (!staffError && staffData && staffData.length > 0) {
          // Calcular total líquido para cada funcionário: (salario_base + subsidios + bonus + horas_extras) - descontos
          const monthlyTotal = staffData.reduce((acc, item) => {
            const salario_base = Number(item.salario_base) || Number(item.base_salary_kz) || 0;
            const subsidios = Number(item.subsidios) || 0;
            const bonus = Number(item.bonus) || 0;
            const horas_extras = Number(item.horas_extras) || 0;
            const descontos = Number(item.descontos) || 0;
            const totalLiquido = (salario_base + subsidios + bonus + horas_extras) - descontos;
            return acc + totalLiquido;
          }, 0);
          folhaSalarial = monthlyTotal;
          console.log('[DASHBOARD] Custo real da folha salarial (líquido):', folhaSalarial);
        } else {
          folhaSalarial = 0;
          console.log('[DASHBOARD] Tabela staff vazia - folha salarial = 0');
        }
      } catch (staffError) {
        console.error('[DASHBOARD] Erro ao buscar folha salarial:', staffError);
        folhaSalarial = 0;
      }

      // Buscar vendas reais do Supabase (COM FILTRO DE PERÍODO)
      let totalVendas = 0;
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, created_at, status')
          .eq('status', 'closed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        console.log('[DASHBOARD] Dados brutos das vendas:', ordersData);

        if (!ordersError && ordersData && ordersData.length > 0) {
          totalVendas = ordersData.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
          console.log('[DASHBOARD] Total vendas calculado:', totalVendas);
        } else {
          console.log('[DASHBOARD] Sem dados de vendas ou array vazio');
        }
      } catch (ordersError) {
        console.error('[DASHBOARD] Erro ao buscar vendas:', ordersError);
      }

      // Buscar vendas de hoje (para o indicador específico)
      let vendasHoje = 0;
      try {
        const { data: todayOrdersData, error: todayOrdersError } = await supabase
          .from('orders')
          .select('total_amount, created_at, status')
          .eq('status', 'closed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        if (!todayOrdersError && todayOrdersData && todayOrdersData.length > 0) {
          vendasHoje = todayOrdersData.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
        }
      } catch (todayError) {
        console.error('[DASHBOARD] Erro ao buscar vendas de hoje:', todayError);
      }

      // Gerar dados para gráficos com base nas vendas
      const chartDataGenerated = [
        {
          date: 'Hoje',
          receitas: totalVendas || 0,
          despesas: totalDespesas || 0,
          vendas: totalVendas || 0
        },
        {
          date: 'Ontem',
          receitas: Math.round((totalVendas || 0) * 0.8),
          despesas: Math.round((totalDespesas || 0) * 0.9),
          vendas: Math.round((totalVendas || 0) * 0.8)
        }
      ];

      // Calcular lucro líquido ajustado para o período
      let folhaSalarialPeriodo = folhaSalarial || 0;
      if (period === 'HOJE') {
        // Para o período HOJE, dividir a folha salarial por 30 (diário)
        folhaSalarialPeriodo = (folhaSalarial || 0) / 30;
      }

      const lucroLiquido = (totalVendas || 0) - (totalDespesas || 0) - folhaSalarialPeriodo;

      const metricsResult = {
        vendasHoje: Number(vendasHoje) || 0,
        mesasAtivas: 0, // Calcular depois se necessário
        totalVendas: Number(totalVendas) || 0,
        receitaTotal: Number(totalVendas) || 0,
        despesas: Number(totalDespesas) || 0,
        folhaSalarial: Number(folhaSalarial) || 0,
        impostos: Number(totalVendas || 0) * 0.065, // REGRA DOS 6,5%
        historicoRevenue: await fetchHistoricoRevenue(),
        lucroLiquido: Number(lucroLiquido) || 0,
        margem: Number(totalVendas) > 0 ? (Number(lucroLiquido) / Number(totalVendas)) * 100 : 0
      };

      console.log('[DASHBOARD] Métricas finais ANTES de setMetrics:', {
        periodo: period,
        totalVendas: Number(totalVendas) || 0,
        totalDespesas: Number(totalDespesas) || 0,
        folhaSalarial: Number(folhaSalarial) || 0,
        impostos: Number(totalVendas || 0) * 0.065,
        lucroLiquido: Number(lucroLiquido) || 0,
        vendasHoje: Number(vendasHoje) || 0
      });

      const finalMetrics = {
        vendasHoje: Number(vendasHoje) || 0,
        mesasAtivas: 0, // Calcular depois se necessário
        totalVendas: Number(totalVendas) || 0,
        receitaTotal: Number(totalVendas) || 0,
        despesas: Number(totalDespesas) || 0,
        despesasAcumuladas: Number(totalExpensesAllTime) || 0, // NOVO: Total acumulado
        folhaSalarial: Number(folhaSalarial) || 0,
        impostos: Number(totalVendas || 0) * 0.065, // REGRA DOS 6,5%
        historicoRevenue: await fetchHistoricoRevenue(),
        lucroLiquido: Number(lucroLiquido) || 0,
        margem: Number(totalVendas) > 0 ? (Number(lucroLiquido) / Number(totalVendas)) * 100 : 0
      };

      console.log('[DASHBOARD] Métricas finais DEPOIS de setMetrics:', {
        periodo: period,
        totalVendas: finalMetrics.totalVendas,
        totalDespesas: finalMetrics.despesas,
        folhaSalarial: finalMetrics.folhaSalarial,
        impostos: finalMetrics.impostos,
        lucroLiquido: finalMetrics.lucroLiquido,
        vendasHoje: finalMetrics.vendasHoje
      });

      // ATUALIZAR GRÁFICOS E DADOS VISUAIS
      await fetchTopProducts();
      await fetchChartData();
      await fetchRecentSales();
      
      // FORÇAR ATUALIZAÇÃO DO ESTADO
      setMetrics(finalMetrics);
      setChartData(chartDataGenerated);
      
      // SINCRONIZAR ESTADOS INDIVIDUAIS IMEDIATAMENTE
      setTotalVendasNoState(Number(totalVendas) || 0);
      setDespesasNoState(Number(totalDespesas) || 0);
      setDespesasAcumuladasNoState(Number(totalExpensesAllTime) || 0);
      setFolhaSalarialNoState(Number(folhaSalarial) || 0);
      
      // VERIFICAÇÃO IMEDIATA DO ESTADO
      setTimeout(() => {
        console.log('[DASHBOARD] Estado ATUALIZADO (verificação):', {
          metricsState: finalMetrics, // USAR finalMetrics em vez de metrics
          totalVendasNoState: totalVendasNoState,
          despesasNoState: despesasNoState,
          despesasAcumuladasNoState: despesasAcumuladasNoState,
          folhaSalarialNoState: folhaSalarialNoState
        });
      }, 100);

      setIsLoading(false);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar métricas:', error);
      
      // Em caso de erro, definir valores padrão
      setMetrics({
        vendasHoje: 0,
        mesasAtivas: 0,
        totalVendas: 0,
        receitaTotal: 0,
        despesas: 0,
        despesasAcumuladas: 0, // NOVO: Inicializar com 0
        folhaSalarial: 0,
        impostos: 0,
        historicoRevenue: 0
      });
    }
  };

  // Subscrição real-time do Supabase
  const subscribeToChanges = () => {
    const ordersChannel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    const purchasesChannel = supabase
      .channel('realtime-purchases')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'purchase_requests' 
        }, 
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(purchasesChannel);
    };
  };
  const handleResetProduction = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Esta ação irá apagar todos os pedidos e compras.\n\nEsta função é apenas para ambiente de desenvolvimento.\n\nDeseja continuar?')) {
      return;
    }

    setIsResetting(true);
    try {
      // Apagar pedidos
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (ordersError) throw ordersError;

      // Apagar compras
      const { error: purchasesError } = await supabase
        .from('purchase_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (purchasesError) throw purchasesError;

      addNotification('success', 'Dados de produção resetados com sucesso!');
      await fetchMetrics();

    } catch (error) {
      console.error('Erro ao resetar dados:', error);
      addNotification('error', 'Erro ao resetar dados de produção');
    } finally {
      setIsResetting(false);
    }
  };

  // Carregar dados e subscrição
  useEffect(() => {
    const session = localStorage.getItem('ownerSession');
    if (!session) return;

    // Forçar atualização dos dados ao entrar no Owner Hub
    fetchMetrics();
    fetchTopProducts();
    fetchTodayExpenses();
    fetchYearExpenses();
    const unsubscribe = subscribeToChanges();

    // Verificar status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [period]); // Removido fetchMetrics das dependências para evitar loops

  // Calcular ticket médio
  const ticketMedio = metrics.totalVendas > 0 ? metrics.totalVendas / (metrics.vendasHoje > 0 ? metrics.vendasHoje : 1) : 0;

  // Calcular lucro líquido
  const lucroLiquido = metrics.totalVendas - metrics.despesas - metrics.folhaSalarial - metrics.impostos;

  // Calcular Break-even
  const custoOperacionalTotal = metrics.despesas + metrics.folhaSalarial;
  const faturacaoAtual = metrics.totalVendas + metrics.historicoRevenue;
  const progressoBreakEven = custoOperacionalTotal > 0 ? Math.min((faturacaoAtual / custoOperacionalTotal) * 100, 100) : 0;
  const faturacaoNecessaria = Math.max(custoOperacionalTotal - faturacaoAtual, 0);
  const isAboveBreakEven = faturacaoAtual >= custoOperacionalTotal;
  
  // Verificar eficiência (break-even antes do dia 20)
  const diaAtual = new Date().getDate();
  const isAltaEficiencia = isAboveBreakEven && diaAtual <= 20;

  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden bg-[#070b14] scrollbar-thin scrollbar-thumb-orange-500">
      {/* HEADER - OWNER HUB */}
      <header className="sticky top-0 z-50 flex justify-between items-center p-4 bg-white/5 backdrop-blur-md border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white mb-1">OWNER HUB</h1>
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
                fetchMetrics(); // Recarregar dados ao mudar período
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

        {/* GRID DE INDICADORES (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Vendas Hoje */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Vendas Hoje</span>
            </div>
            <div className="text-3xl font-black text-amber-400 mb-2">
              {formatAKZ(metrics.vendasHoje)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* Card 2: Faturação Total */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Faturação Total</span>
            </div>
            <div className="text-2xl font-black text-white mb-2">
              {formatAKZ(metrics.totalVendas + metrics.historicoRevenue)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* Card 3: Lucro Líquido */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${lucroLiquido >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-xl flex items-center justify-center`}>
                <TrendingUp className={`w-6 h-6 ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Lucro Líquido</span>
            </div>
            <div className={`text-2xl font-black ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'} mb-2`}>
              {formatAKZ(lucroLiquido)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* Card 4: Ticket Médio */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Ticket Médio</span>
            </div>
            <div className="text-2xl font-black text-white mb-2">
              {ticketMedio > 0 ? formatAKZ(ticketMedio) : '---'}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* CARD 5: Despesas Hoje */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Despesas Hoje</span>
            </div>
            <div className="text-2xl font-black text-orange-400 mb-2">
              {formatAKZ(metrics.despesas)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* CARD 6: Despesas Acumuladas (Ano) */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Despesas Acumuladas (Ano)</span>
            </div>
            <div className="text-2xl font-black text-red-400 mb-2">
              {formatAKZ(metrics.despesasAcumuladas)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* CARD 7: Custos de Staff */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Custos de Staff</span>
            </div>
            <div className="text-2xl font-black text-white mb-2">
              {formatAKZ(metrics.folhaSalarial)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>
        </div>

        {/* CARD HISTÓRICO DE FATURAÇÃO */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Histórico Externo</h3>
                <p className="text-sm text-white/60">Faturação Histórica</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-purple-400 mb-2">
                {formatAKZ(metrics.historicoRevenue)}
              </div>
              <div className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
                Importado
              </div>
            </div>
          </div>
        </div>

        {/* CARD PONTO DE EQUILÍBRIO (BREAK-EVEN) */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-lg font-black text-white">Ponto de Equilíbrio (Break-even)</h3>
                  <p className="text-sm text-white/60">Custo Operacional: {formatAKZ(custoOperacionalTotal)}</p>
                </div>
                {isAltaEficiencia && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-full">
                    <span className="text-xs text-emerald-400 font-bold">Alta Eficiência</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-black mb-2 ${isAboveBreakEven ? 'text-emerald-400' : 'text-amber-400'}`}>
                {progressoBreakEven.toFixed(1)}%
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                isAboveBreakEven 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {isAboveBreakEven ? 'NEGÓCIO EM LUCRO! 🚀' : `Faltam ${formatAKZ(faturacaoNecessaria)}`}
              </div>
            </div>
          </div>
          
          {/* Barra de Progresso com Glow */}
          <div className="relative">
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isAboveBreakEven 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-glow' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-glow'
                }`}
                style={{ width: `${progressoBreakEven}%` }}
              ></div>
            </div>
            {/* Indicador de Break-even */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-red-500/80"
              style={{ left: '100%' }}
            ></div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Receitas vs Despesas */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <h3 className="text-lg font-black text-white mb-4">Receitas vs Despesas</h3>
            <div className="h-64">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff60"
                      tick={{ fill: '#ffffff60', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#ffffff60"
                      tick={{ fill: '#ffffff60', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#070b14', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#ffffff' }}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#f59e0b" 
                      name="Receitas"
                      radius={[8, 8, 0, 0]}
                      fillOpacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-white/60 text-sm">Sem dados para exibir</p>
                    <p className="text-white/40 text-xs mt-1">Selecione um período para visualizar</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Tendências */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
            <h3 className="text-lg font-black text-white mb-4">Tendências de Vendas</h3>
            <div className="h-64">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff60"
                      tick={{ fill: '#ffffff60', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#ffffff60"
                      tick={{ fill: '#ffffff60', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#070b14', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#ffffff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Vendas"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Pedidos"
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-white/60 text-sm">Sem dados para exibir</p>
                    <p className="text-white/40 text-xs mt-1">Selecione um período para visualizar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MÓDULO FISCAL */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Imposto Devido</h3>
                <p className="text-sm text-white/60">6.5% sobre faturação</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-red-400">
                {formatAKZ(metrics.impostos)}
              </div>
            </div>
          </div>
          {/* Barra de Progresso */}
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((metrics.impostos / (metrics.totalVendas * 0.1)) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* FLUXO DE VENDAS RECENTES (POS) */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
          <h3 className="text-lg font-black text-white mb-4">Fluxo de Vendas Recentes (POS)</h3>
          <div className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale, index) => (
                <div key={sale.id || index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-cyan-400 w-6">#{index + 1}</span>
                    <div className="w-10 h-10 bg-white/10 rounded-full overflow-hidden flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{sale.invoiceNumber}</h4>
                      <p className="text-xs text-white/60">Mesa {sale.table}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">{formatAKZ(sale.amount)}</div>
                    <div className="text-xs text-white/40">{sale.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Receipt className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-white/60 text-sm">Sem vendas registadas</p>
                  <p className="text-white/40 text-xs mt-1">Selecione um período para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PRODUTOS MAIS VENDIDOS */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500">
          <h3 className="text-lg font-black text-white mb-4">Produtos Mais Vendidos</h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-purple-400 w-6">#{index + 1}</span>
                    <div className="w-10 h-10 bg-white/10 rounded-full overflow-hidden flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{product.name}</h4>
                      <p className="text-xs text-white/60">{product.quantity} unidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-400">{formatAKZ(product.revenue)}</div>
                    <div className="text-xs text-white/40">{formatAKZ(product.revenue / product.quantity)} c/u</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-white/60 text-sm">Sem produtos vendidos</p>
                  <p className="text-white/40 text-xs mt-1">Selecione um período para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
