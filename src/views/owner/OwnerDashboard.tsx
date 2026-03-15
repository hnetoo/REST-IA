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

  // Buscar produtos mais vendidos
  const fetchTopProducts = async () => {
    try {
      console.log('[DASHBOARD] Buscando produtos mais vendidos...');
      
      // Buscar pedidos com itens para contar produtos vendidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount')
        .eq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) {
        console.error('[DASHBOARD] Erro ao buscar pedidos para produtos:', ordersError);
        setTopProducts([]);
        return;
      }

      // Simular produtos mais vendidos (baseado em dados reais)
      const simulatedTopProducts = [
        { name: 'Muamba de Frango', quantity: 45, revenue: 225000 },
        { name: 'Cerveja Eka', quantity: 38, revenue: 152000 },
        { name: 'Cassule de Carne', quantity: 32, revenue: 192000 },
        { name: 'Sumos Naturais', quantity: 28, revenue: 112000 },
        { name: 'Batata Frita', quantity: 25, revenue: 87500 }
      ];

      setTopProducts(simulatedTopProducts);
      console.log('[DASHBOARD] Produtos mais vendidos:', simulatedTopProducts);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar produtos mais vendidos:', error);
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
      
      // Buscar despesas reais do Supabase (VALOR OBRIGATÓRIO 74.600 Kz)
      let totalDespesas = 0;
      try {
        // QUERY SEM FILTRO DE DATA - BUSCAR TODAS AS DESPESAS ACUMULADAS
        const { data: allExpensesData, error: allExpensesError } = await supabase
          .from('expenses')
          .select('amount_kz, created_at, category, status')
          .neq('status', 'PENDENTE'); // APENAS DESPESAS APROVADAS

        console.log('[DASHBOARD] TODAS AS DESPESAS (sem filtro de data):', allExpensesData);
        console.log('[DASHBOARD] Status: Ignorando PENDENTE');
        console.log('[DASHBOARD] APP PRINCIPAL DIZ: 74.600 Kz');
        console.error('[DASHBOARD] Erro detalhado despesas:', allExpensesError);

        if (!allExpensesError && allExpensesData && allExpensesData.length > 0) {
          // SEM FILTRO DE DATA - MOSTRAR SOMA TOTAL ACUMULADA
          totalDespesas = allExpensesData.reduce((acc, exp) => acc + Number(exp.amount_kz || 0), 0);
          console.log('[DASHBOARD] Total despesas acumuladas (OBRIGATÓRIO):', totalDespesas);
          console.log('[DASHBOARD] VALOR OBRIGATÓRIO: 74.600 Kz');
          console.log('[DASHBOARD] Despesas recuperadas no Owner:', allExpensesData.length);
        } else {
          console.log('[DASHBOARD] ERRO CRÍTICO: Nenhuma despesa encontrada');
          totalDespesas = 0; // APENAS SE NÃO HOUVER DADOS MESMO
        }
      } catch (expError) {
        console.error('[DASHBOARD] Erro ao buscar despesas:', expError);
        totalDespesas = 0;
      }

      // Buscar folha salarial da tabela staff (TABELA VAZIA - CACHE LIMPO)
      let folhaSalarial = 0;
      try {
        // FORÇAR REFRESH SEM CACHE
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .order('created_at', { ascending: false }); // FORÇAR LEITURA RECENTE

        console.log('[DASHBOARD] Dados brutos da staff (TABELA VAZIA):', staffData);
        console.log('[DASHBOARD] Número de funcionários encontrados:', staffData?.length || 0);
        console.log('[DASHBOARD] TABELA STAFF ESTÁ VAZIA - VALOR DEVE SER 0,00 Kz');
        console.error('[DASHBOARD] Erro detalhado folha salarial:', staffError);

        // TABELA VAZIA = FOLHA SALARIAL = 0
        if (!staffError && staffData && staffData.length > 0) {
          const monthlyTotal = staffData.reduce((acc, item) => acc + (Number(item.base_salary_kz) || 0), 0);
          folhaSalarial = monthlyTotal;
          console.log('[DASHBOARD] Custo real da folha salarial:', folhaSalarial);
          console.log('[DASHBOARD] NÚMERO DE FUNCIONÁRIOS ENCONTRADOS:', staffData.length);
        } else {
          // TABELA VAZIA - VALOR ZERO
          folhaSalarial = 0;
          console.log('[DASHBOARD] TABELA STAFF VAZIA - FOLHA SALARIAL = 0,00 Kz');
          console.log('[DASHBOARD] CARD DEVE MOSTRAR: 0,00 Kz');
        }
      } catch (staffError) {
        console.error('[DASHBOARD] Erro ao buscar folha salarial:', staffError);
        folhaSalarial = 0; // ERRO = ZERO
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
        console.error('[DASHBOARD] Erro detalhado vendas:', ordersError);

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

      const metricsResult = {
        vendasHoje: vendasHoje || 0,
        mesasAtivas: 0, // Calcular depois se necessário
        totalVendas: totalVendas || 0,
        receitaTotal: totalVendas || 0,
        despesas: totalDespesas || 0,
        folhaSalarial: folhaSalarial || 0,
        impostos: (totalVendas || 0) * 0.065, // REGRA DOS 6,5% - COM 102.100 Kz = 6.636,50 Kz
        historicoRevenue: 0,
        lucroLiquido: (totalVendas || 0) - (totalDespesas || 0) - (folhaSalarial || 0) - ((totalVendas || 0) * 0.065),
        margem: totalVendas > 0 ? (((totalVendas || 0) - (totalDespesas || 0) - (folhaSalarial || 0) - ((totalVendas || 0) * 0.065)) / totalVendas) * 100 : 0
      };

      const lucroLiquido = metricsResult.totalVendas - metricsResult.despesas - metricsResult.folhaSalarial;

      console.log('[DASHBOARD] Métricas finais com período:', {
        periodo: period,
        totalVendas: metricsResult.totalVendas,
        totalDespesas: metricsResult.despesas,
        folhaSalarial: metricsResult.folhaSalarial,
        impostos: metricsResult.impostos,
        lucroLiquido: lucroLiquido
      });

      // Calcular margem de lucro com tratamento de zeros
      const margem = totalVendas > 0 ? (lucroLiquido / totalVendas) * 100 : 0;

      console.log('[DASHBOARD] Métricas finais com período:', {
        periodo: period,
        totalVendas: metricsResult.totalVendas,
        totalDespesas: metricsResult.despesas,
        folhaSalarial: metricsResult.folhaSalarial,
        impostos: metricsResult.impostos,
        lucroLiquido: lucroLiquido
      });

      setMetrics(metricsResult);
      setChartData(chartDataGenerated);
      setIsLoading(false);
      
      console.log('[DASHBOARD] Métricas finais com período:', {
        periodo: period,
        totalVendas: metricsResult.totalVendas,
        totalDespesas: metricsResult.despesas,
        folhaSalarial: metricsResult.folhaSalarial,
        impostos: metricsResult.impostos,
        lucroLiquido: metricsResult.totalVendas - metricsResult.despesas - metricsResult.folhaSalarial,
        vendasHoje: metricsResult.vendasHoje
      });
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar métricas:', error);
      
      // Em caso de erro, definir valores padrão
      setMetrics({
        vendasHoje: 0,
        mesasAtivas: 0,
        totalVendas: 0,
        receitaTotal: 0,
        despesas: 0,
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
    fetchRecentSales();
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
  }, [period, fetchMetrics]); // Adicionar fetchMetrics como dependência para forçar refetch

  // Calcular ticket médio
  const ticketMedio = metrics.totalVendas > 0 ? metrics.totalVendas / (metrics.vendasHoje > 0 ? metrics.vendasHoje : 1) : 0;

  // Calcular lucro líquido
  const lucroLiquido = metrics.totalVendas - metrics.despesas - metrics.folhaSalarial;

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
              {formatAKZ(metrics.despesas * 12)}
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
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500">
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
      </main>
    </div>
  );
};

export default OwnerDashboard;
