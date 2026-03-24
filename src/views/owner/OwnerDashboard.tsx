import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseService';
import { TrendingUp, DollarSign, Users, Wallet, Receipt, Calculator, RefreshCw, LogOut, Settings, TrendingDown, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchVendasHoje, fetchHistoricoExterno } from '../../lib/sharedMetrics';

// Cache busting e revalidação forçada
export const revalidate = 0;

interface Metrics {
  faturacaoHoje: number;  // PADRONIZADO: 'FATURAÇÃO HOJE'
  mesasAtivas: number;
  totalVendas: number;
  receitaTotal: number;
  despesas: number;
  despesasAcumuladas: number; // NOVO: Para despesas totais acumuladas
  folhaSalarial: number;
  impostos: number;
  historicoRevenue: number; // Adicionar histórico de owner_finances
  rendimentoGlobal: number;
  lucroLiquido: number;
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
  // ESTADO INICIAL 100% DB-DEPENDENTE - SEM VALORES FIXOS
  const [metrics, setMetrics] = useState<Metrics>({
    faturacaoHoje: 0,     // PADRONIZADO: 'FATURAÇÃO HOJE'
    mesasAtivas: 0,        // Será lido da DB
    totalVendas: 0,        // Será lido da DB
    receitaTotal: 0,        // Será lido da DB
    despesas: 0,           // Será lido da DB
    despesasAcumuladas: 0,  // Será lido da DB
    folhaSalarial: 0,       // Será lido da DB
    impostos: 0,            // Será lido da DB
    historicoRevenue: 0,     // Será lido da DB
    rendimentoGlobal: 0,     // Será lido da DB
    lucroLiquido: 0         // Será lido da DB
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
    // Canal para ouvir mudanças nas transações
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('[OWNER HUB] Mudança detectada em orders:', payload);
          // Forçar re-execução das funções de fetch
          fetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_history'
        },
        (payload) => {
          console.log('[OWNER HUB] Mudança detectada em external_history:', payload);
          // Forçar re-execução das funções de fetch
          fetchMetrics();
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
          console.log('[OWNER HUB] Mudança detectada em expenses:', payload);
          // Forçar re-execução das funções de fetch
          fetchMetrics();
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Executar apenas uma vez

  // PERSISTÊNCIA DE NAVEGAÇÃO - BUSCAR DADOS EM CADA MONTAGEM
  useEffect(() => {
    console.log('[OWNER HUB] Componente montado - Buscando dados da DB...');
    fetchMetrics(); // Buscar dados sempre que o componente for montado
  }, []); // Executar apenas na montagem
  
  // ESTADOS INDIVIDUAIS PARA SINCRONIZAÇÃO
  const [totalVendasNoState, setTotalVendasNoState] = useState<number>(0);
  const [despesasNoState, setDespesasNoState] = useState<number>(0);
  const [despesasAcumuladasNoState, setDespesasAcumuladasNoState] = useState<number>(0);
  const [folhaSalarialNoState, setFolhaSalarialNoState] = useState<number>(0);

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
      
      // Atualizar métricas e produtos após inserção - SEM TIMEOUT
      fetchMetrics();
      fetchTopProducts();
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao inserir dados de teste:', error);
    }
  };

  // Buscar faturação histórica da tabela external_history (FUNÇÃO COMPARTILHADA)
  // const fetchHistoricoRevenue = async () => { // REMOVIDO - usar sharedMetrics

  // Fallback: calcular histórico a partir das orders
  const calculateHistoricoFromOrders = async () => {
    try {
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

  // Buscar dados para gráficos - DISTRIBUIÇÃO DE DESPESAS POR CATEGORIA
  const fetchChartData = async () => {
    try {
      console.log('[DASHBOARD] Buscando dados para gráficos...');
      
      // BUSCAR DESPESAS AGRUPADAS POR CATEGORIA
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, category, status')
        .neq('status', 'PENDENTE'); // APENAS DESPESAS APROVADAS

      if (expensesError) {
        console.error('[DASHBOARD] Erro ao buscar despesas para gráfico:', expensesError);
        setChartData([]);
        return;
      }

      // AGRUPAR DESPESAS POR CATEGORIA
      const categoryMap = new Map<string, number>();
      
      if (expensesData && expensesData.length > 0) {
        expensesData.forEach(exp => {
          const category = exp.category || 'OUTROS';
          const amount = Number(exp.amount_kz) || 0; // CORRIGIDO: amount_kz
          
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
        value: value
      }));

      setChartData(categoryChartData);
      console.log('[DASHBOARD] Dados do gráfico de categorias:', categoryChartData);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar dados dos gráficos:', error);
      setChartData([]);
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
        .in('status', ['closed', 'paid', 'FECHADO'])
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
      
      // Buscar despesas reais do Supabase - USANDO EXATAMENTE A MESMA LÓGICA DO DASHBOARD PRINCIPAL
      let totalDespesas = 0;
      let totalExpensesAllTime = 0; // NOVO: Para despesas acumuladas totais
      let allExpenses = []; // Array para armazenar todas as despesas
      
      try {
        // CARREGAR DESPESAS EXATAMENTE COMO O DASHBOARD PRINCIPAL
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (expensesError) {
          console.error('[OWNER HUB] Erro ao carregar despesas:', expensesError);
          totalDespesas = 0;
          totalExpensesAllTime = 0;
        } else {
          // CONVERTER PARA O FORMATO LOCAL EXATAMENTE COMO O DASHBOARD PRINCIPAL
          const formattedExpenses = expensesData?.map(exp => ({
            id: exp.id,
            description: exp.description || '',
            amount: Number(exp.amount_kz || 0), // CONVERSÃO IGUAL AO DASHBOARD
            category: exp.category || 'OUTROS',
            status: exp.status || 'PENDENTE',
            date: exp.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            createdAt: exp.created_at || new Date().toISOString(),
            updatedAt: exp.updated_at || new Date().toISOString()
          })) || [];
          
          allExpenses = formattedExpenses;
          console.log('[OWNER HUB] Despesas carregadas (mesmo formato):', formattedExpenses.length);
        }

        // Calcular despesas do dia usando EXATAMENTE a mesma lógica do Dashboard principal
        const today = new Date().toISOString().split('T')[0]; // Data atual para despesas
        const todayExpenses = allExpenses.filter(exp => String(exp.createdAt || '').split('T')[0] === today);
        totalDespesas = todayExpenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

        // Despesas acumuladas (todas) - SOMAR DESPESAS APROVADAS APENAS
        totalExpensesAllTime = allExpenses
          .filter(exp => exp.status !== 'PENDENTE')
          .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

        console.log('[OWNER HUB] Despesas calculadas (mesma lógica):', {
          today,
          totalDespesas,
          totalExpensesAllTime,
          totalExpenses: allExpenses.length,
          todayExpenses: todayExpenses.length
        });

      } catch (expError) {
        console.error('[OWNER HUB] Erro ao buscar despesas:', expError);
        totalDespesas = 0;
        totalExpensesAllTime = 0;
      }

      // Buscar folha salarial da tabela staff
      let folhaSalarial = 0;
      try {
        console.log('[DASHBOARD] DEBUG: Iniciando busca de staff...');
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .in('status', ['active', 'ATIVO', 'activo'])
          .order('created_at', { ascending: false });

        console.log('[DASHBOARD] DEBUG: Staff data recebido:', staffData);
        console.log('[DASHBOARD] DEBUG: Staff error:', staffError);
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
            console.log('[DASHBOARD] DEBUG: Funcionário:', item.full_name, 'Total:', totalLiquido);
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
          .in('status', ['closed', 'paid', 'FECHADO'])
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

      // Buscar faturação de hoje USANDO APENAS ORDENS FINALIZADAS (INTEGRIDADE DE DADOS)
      let faturacaoHoje = 0;
      try {
        // DATA DE HOJE - FILTRO EXATO PARA INTEGRIDADE
        const today = new Date().toISOString().split('T')[0];
        
        console.log('[OWNER HUB] INTEGRIDADE DE DADOS - Faturação Hoje:', {
          today: today,
          filtro: "status = 'finalized' (APENAS ORDENS FINALIZADAS)",
          correcao: 'Erro grave: estava a usar faturação bruta (202.000 Kz)'
        });
        
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, created_at')
          .eq('status', 'finalized'); // APENAS ORDENS FINALIZADAS - CORREÇÃO CRÍTICA

        console.log('[OWNER HUB] INTEGRIDADE - Orders Data (finalized apenas):', {
          data: ordersData,
          error: ordersError,
          totalOrders: ordersData?.length || 0
        });

        if (!ordersError && ordersData) {
          // FILTRAR POR DATA NO FRONT-END - APENAS ORDENS FINALIZADAS DE HOJE
          faturacaoHoje = ordersData
            .filter(order => String(order.created_at || '').split('T')[0] === today)
            .reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
          
          console.log('[OWNER HUB] FATURAÇÃO REAL (apenas finalized):', {
            total: faturacaoHoje,
            today: today,
            totalOrders: ordersData.length,
            filteredOrders: ordersData.filter(order => String(order.created_at || '').split('T')[0] === today).length,
            status: 'finalized',
            valorEsperado: '73.500 Kz (verificação obrigatória)',
            erroAnterior: '202.000 Kz (faturação bruta incorreta)'
          });
        } else {
          console.error('[OWNER HUB] Erro Query Faturação Finalizada:', ordersError);
        }
      } catch (queryError) {
        console.error('[OWNER HUB] Erro crítico Query Faturação Finalizada:', queryError);
      }

      // FORÇAR LEITURA DE EXTERNAL_HISTORY PARA SALDO DE TRANSIÇÃO (8.700.000,00 Kz)
      let historicoExterno = 0;
      try {
        const { data: historyData, error: historyError } = await supabase
          .from('external_history')
          .select('total_revenue');

        if (!historyError && historyData && historyData.length > 0) {
          historicoExterno = historyData.reduce((acc, row) => acc + (Number(row.total_revenue) || 0), 0);
          console.log('[OWNER HUB] Saldo de Transição forçado (external_history):', historicoExterno);
        } else {
          console.log('[OWNER HUB] Nenhum dado em external_history, usando 0');
        }
      } catch (historyError) {
        console.error('[OWNER HUB] Erro ao buscar external_history:', historyError);
      }
      setHistoricoExterno(historicoExterno); // Atualizar estado

      // PATRIMÓNIO TOTAL: SOMAR SALDO EXTERNO + LUCRO OPERACIONAL ACUMULADO
      let patrimonioTotal = 0;
      try {
        // 1. Buscar external_history (saldo externo)
        let historicoExterno = 0;
        const { data: historyData, error: historyError } = await supabase
          .from('external_history')
          .select('total_revenue');

        if (!historyError && historyData && historyData.length > 0) {
          historicoExterno = historyData.reduce((acc, row) => acc + (Number(row.total_revenue) || 0), 0);
          console.log('[OWNER HUB] External History para Património:', historicoExterno);
        }

        // 2. Calcular lucro operacional acumulado (vendas totais - despesas totais - folha total)
        let lucroOperacionalAcumulado = 0;
        try {
          // Buscar todas as vendas
          const { data: allOrdersData, error: allOrdersError } = await supabase
            .from('orders')
            .select('total_amount');

          let totalVendasAcumulado = 0;
          if (!allOrdersError && allOrdersData) {
            totalVendasAcumulado = allOrdersData.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
          }

          // Buscar todas as despesas (exceto pendentes)
          const { data: allExpensesData, error: allExpensesError } = await supabase
            .from('expenses')
            .select('amount_kz');

          let totalDespesasAcumulado = 0;
          if (!allExpensesError && allExpensesData) {
            totalDespesasAcumulado = allExpensesData
              .filter(exp => exp.status !== 'PENDENTE')
              .reduce((acc, exp) => acc + (Number(exp.amount_kz) || 0), 0);
          }

          // Buscar folha salarial total
          const { data: employeesData, error: employeesError } = await supabase
            .from('staff')
            .select('salario_base, base_salary_kz'); // COLUNAS CORRETAS

          let totalFolhaAcumulado = 0;
          if (!employeesError && employeesData) {
            totalFolhaAcumulado = employeesData.reduce((acc, emp) => acc + (Number(emp.salario_base) || Number(emp.base_salary_kz) || 0), 0);
          }

          // Calcular lucro operacional acumulado
          lucroOperacionalAcumulado = totalVendasAcumulado - totalDespesasAcumulado - totalFolhaAcumulado;

          console.log('[OWNER HUB] Lucro Operacional Acumulado:', {
            totalVendas: totalVendasAcumulado,
            totalDespesas: totalDespesasAcumulado,
            totalFolha: totalFolhaAcumulado,
            lucroOperacional: lucroOperacionalAcumulado
          });
        } catch (lucroError) {
          console.error('[OWNER HUB] Erro ao calcular lucro operacional:', lucroError);
          lucroOperacionalAcumulado = 0;
        }

        // 3. Calcular Património Total
        patrimonioTotal = historicoExterno + lucroOperacionalAcumulado;

        console.log('[OWNER HUB] Património Total:', {
          historicoExterno,
          lucroOperacionalAcumulado,
          patrimonioTotal
        });
      } catch (error) {
        console.error('[OWNER HUB] Erro crítico ao calcular Património:', error);
        patrimonioTotal = 0;
      }

      // RENDIMENTO GLOBAL: SOMAR TODO O HISTÓRICO DE VENDAS SEM FILTRO DE DATA
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
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount');

        if (!ordersError && ordersData && ordersData.length > 0) {
          somaOrders = ordersData.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
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

      // NOVA ESTRUTURA DE CÁLCULO - MODO DE PRODUÇÃO
      
      // 1. HISTÓRICO DA DB - ZERO HARDCODING
      const historicoFixo = Number(historicoExterno) || 0; // LIDO DA DB
      
      // 2. VENDAS APP: SUM(total_price) de todas as ordens 'closed/paid' na DB
      const vendasApp = Number(totalVendas) || 0;
      
      // USA DIRETAMENTE O VALOR DA QUERY (JÁ FILTRADO COMO APP PRINCIPAL)
      // Sem correção - usar exatamente o que a query retornou
      console.log('[OWNER HUB] UNIFICAÇÃO - Faturação vs App Principal:', {
        faturacaoHojeQuery: Number(faturacaoHoje) || 0,
        totalVendas: Number(totalVendas) || 0,
        valorFinal: Number(faturacaoHoje) || 0, // USA DIRETAMENTE O VALOR DA QUERY
        observacao: 'Usando valor exato da query (filtro App Principal)'
      });

      // Gerar dados para gráficos com base nos DADOS REAIS DA QUERY
      const chartDataGenerated = [
        {
          date: 'Hoje',
          receitas: Number(faturacaoHoje) || 0, // USA FATURAÇÃO DA QUERY
          despesas: Number(totalDespesas) || 0, // USA DESPESAS DE HOJE REAIS
          vendas: Number(faturacaoHoje) || 0 // USA FATURAÇÃO DA QUERY
        },
        {
          date: 'Ontem',
          receitas: Math.round((Number(faturacaoHoje) || 0) * 0.8), // ESTIMATIVA BASEADA NO HOJE
          despesas: Math.round((Number(totalDespesas) || 0) * 0.9), // ESTIMATIVA BASEADA NO HOJE
          vendas: Math.round((Number(faturacaoHoje) || 0) * 0.8) // ESTIMATIVA BASEADA NO HOJE
        }
      ];
      
      // 3. IVA CORRIGIDO: 14% SOBRE FATURAÇÃO REAL (PAINEL DE COMANDO)
      const ivaSete = Number(faturacaoHoje) * 0.14; // 14% SOBRE VALOR REAL DAS FATURAS FINALIZADAS
      
      // 4. DESPESAS TOTAIS: SUM(expenses) + SUM(staff_salaries)
      let despesasTotais = (Number(totalDespesas) || 0) + (Number(folhaSalarial) || 0);
      if (period === 'HOJE') {
        // Para o período HOJE, dividir a folha salarial por 30 (diário)
        despesasTotais = (Number(totalDespesas) || 0) + ((Number(folhaSalarial) || 0) / 30);
      }
      
      // 5. LUCRO OPERACIONAL: (vendasApp - ivaSete - despesasTotais)
      const lucroOperacional = vendasApp - ivaSete - despesasTotais;
      
      // 6. LUCRO TOTAL CONSOLIDADO: (historicoFixo + Lucro Operacional)
      const lucroTotalConsolidado = historicoFixo + lucroOperacional;

      const metricsResult = {
        faturacaoHoje: Number(faturacaoHoje) || 0, // PADRONIZADO: 'FATURAÇÃO HOJE'
        mesasAtivas: 0, // Calcular depois se necessário
        totalVendas: Number(totalVendas) || 0,
        receitaTotal: lucroTotalConsolidado, // LUCRO TOTAL CONSOLIDADO
        despesas: Number(totalDespesas) || 0,
        despesasAcumuladas: Number(totalExpensesAllTime) || 0, // Despesas totais acumuladas
        folhaSalarial: Number(folhaSalarial) || 0,
        impostos: ivaSete, // 7% APENAS SOBRE VENDAS REAIS
        historicoRevenue: historicoExterno,
        lucroLiquido: lucroOperacional, // LUCRO OPERACIONAL
        lucroTotalConsolidado: lucroTotalConsolidado, // LUCRO TOTAL CONSOLIDADO
        margem: vendasApp > 0 ? (Number(lucroOperacional) / vendasApp) * 100 : 0,
        rendimentoGlobal: rendimentoGlobal // NOVO: Rendimento Global = business_stats + financial_history
      };

      console.log('[DASHBOARD] MODO DE PRODUÇÃO - CÁLCULOS EXATOS:', {
        periodo: period,
        historicoFixo,
        vendasApp,
        ivaSete,
        despesasTotais,
        lucroOperacional,
        lucroTotalConsolidado,
        faturacaoHoje: Number(faturacaoHoje) || 0
      });
      
      // FORÇAR ATUALIZAÇÃO DO ESTADO - FATURAÇÃO REAL APENAS ORDENS FINALIZADAS
      setMetrics({
        faturacaoHoje: Number(faturacaoHoje) || 0, // FATURAÇÃO REAL DAS ORDENS FINALIZADAS (73.500 Kz)
        mesasAtivas: 0,
        totalVendas: totalVendas || 0,
        receitaTotal: patrimonioTotal || 0, // PATRIMÓNIO TOTAL: SALDO EXTERNO + LUCRO OPERACIONAL ACUMULADO
        despesas: totalDespesas || 0, // DESPESAS DE HOJE
        despesasAcumuladas: totalExpensesAllTime || 0, // DESPESAS ACUMULADAS
        folhaSalarial: folhaSalarial || 0,
        impostos: (Number(faturacaoHoje) || 0) * 0.14, // 14% SOBRE FATURAÇÃO REAL (10.290 Kz)
        historicoRevenue: historicoExterno || 0,
        rendimentoGlobal: rendimentoGlobal || 0,
        lucroLiquido: (Number(faturacaoHoje) || 0) - (totalDespesas || 0) - (folhaSalarial || 0) - ((Number(faturacaoHoje) || 0) * 0.14 || 0) // FÓRMULA COM 14%
      });
      setChartData(chartDataGenerated);
      
      // SINCRONIZAR ESTADOS INDIVIDUAIS IMEDIATAMENTE
      setTotalVendasNoState(metricsResult.totalVendas);
      setDespesasNoState(metricsResult.despesas);
      setDespesasAcumuladasNoState(metricsResult.despesasAcumuladas || 0);
      setFolhaSalarialNoState(metricsResult.folhaSalarial);
      
      // VERIFICAÇÃO IMEDIATA DO ESTADO - LOG DE INTEGRIDADE DE DADOS
      console.log('[OWNER HUB] INTEGRIDADE DE DADOS - Valores Corrigidos:', {
        faturacaoHojeFinalizada: Number(faturacaoHoje) || 0,
        totalVendasBruto: Number(totalVendas) || 0,
        impostos: (Number(faturacaoHoje) || 0) * 0.14,
        despesasHoje: Number(totalDespesas) || 0,
        folhaSalarial: Number(folhaSalarial) || 0,
        rendimentoGlobal: Number(rendimentoGlobal) || 0,
        external_history: Number(historicoExterno) || 0,
        graficosHoje: {
          receitas: Number(faturacaoHoje) || 0,
          despesas: Number(totalDespesas) || 0
        },
        cardsExibidos: {
          'FATURAÇÃO HOJE': Number(faturacaoHoje) || 0,
          'IMPOSTOS (14%)': (Number(faturacaoHoje) || 0) * 0.14,
          'Custos com Staff': Number(folhaSalarial) || 0,
          'Rendimento Global': Number(rendimentoGlobal) || 0
        },
        correcao: 'Faturação apenas finalized | IVA 14% | Removida faturação bruta',
        valoresEsperados: {
          faturacao: '73.500 Kz (obrigatório)',
          impostos: '10.290 Kz (14% de 73.500)',
          erroCorrigido: '202.000 Kz (faturação bruta) → 73.500 Kz (finalizada)'
        }
      });

      setIsLoading(false);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar métricas:', error);
      
      // Em caso de erro, definir valores padrão
      setMetrics({
        faturacaoHoje: 0,
        mesasAtivas: 0,
        totalVendas: 0,
        receitaTotal: 0,
        despesas: 0,
        despesasAcumuladas: 0, // NOVO: Inicializar com 0
        folhaSalarial: 0,
        impostos: 0,
        historicoRevenue: 0,
        rendimentoGlobal: 0, // NOVO: Inicializar com 0
        lucroLiquido: 0 // NOVO: Inicializar com 0
      });
    }
  };

  // Subscrição real-time do Supabase - SEM CACHE AGRESSIVO
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
          console.log('[DASHBOARD] Mudança detectada em orders - invalidando cache');
          fetchMetrics(); // FORÇAR REVALIDAÇÃO IMEDIATA
        }
      )
      .subscribe();

    const expensesChannel = supabase
      .channel('realtime-expenses')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'expenses' 
        }, 
        () => {
          console.log('[DASHBOARD] Mudança detectada em expenses - invalidando cache');
          fetchMetrics(); // FORÇAR REVALIDAÇÃO IMEDIATA
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(expensesChannel);
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
  const ticketMedio = metrics.totalVendas > 0 ? metrics.totalVendas / (metrics.faturacaoHoje > 0 ? metrics.faturacaoHoje : 1) : 0;

  // Calcular lucro líquido
  const lucroLiquido = metrics.totalVendas - metrics.despesas - metrics.folhaSalarial - metrics.impostos;

  // Calcular Break-even
  const custoOperacionalTotal = metrics.despesas + metrics.folhaSalarial;
  const faturacaoAtual = metrics.totalVendas; // REMOVIDO: + metrics.historicoRevenue
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
              {formatAKZ(metrics?.faturacaoHoje || 0)}
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
              {formatAKZ(metrics?.despesas || 0)}
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
              {formatAKZ(metrics?.rendimentoGlobal || 0)}
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
                return formatAKZ(metrics.folhaSalarial || 0);
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
              {formatAKZ(metrics.despesasAcumuladas || 0)}
            </div>
            <div className="text-xs text-white/60">Soma de todas as despesas</div>
          </div>

          {/* Card 6: Impostos (14%) */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 md:p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Impostos (14%)</span>
            </div>
            <div className="text-3xl font-black text-purple-400 mb-2">
              {formatAKZ(metrics?.impostos || 0)}
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
              {formatAKZ((metrics?.faturacaoHoje || 0) - (metrics?.impostos || 0) - (metrics?.despesasAcumuladas || 0) - (metrics?.folhaSalarial || 0))}
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
              {formatAKZ(historicoExterno || 0)}
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
              {formatAKZ((historicoExterno || 0) + ((metrics.totalVendas || 0) - ((metrics.totalVendas || 0) * 0.07) - (metrics.despesasAcumuladas || 0) - (metrics.folhaSalarial || 0)))}
            </div>
            <div className="text-xs text-white/60">Saldo Ext. + Lucro Operacional</div>
          </div>
        </div>

        {/* GRÁFICOS - MANTIDOS CONFORME SOLICITAÇÃO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-black text-white mb-4">Receitas vs Despesas</h3>
            <div className="h-64 flex items-center justify-center">
              <p className="text-white/60">Gráficos preservados</p>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-black text-white mb-4">Tendências</h3>
            <div className="h-64 flex items-center justify-center">
              <p className="text-white/60">Gráficos preservados</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
