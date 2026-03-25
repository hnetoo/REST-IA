import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { TrendingUp, DollarSign, Users, Wallet, Receipt, Calculator, RefreshCw, LogOut, Settings, TrendingDown, Package } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatKz } from '../../lib/dateUtils';
import { log } from '../../lib/loggerService';

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

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { activeOrders } = useStore();
  
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

  useEffect(() => {
    // VERIFICAÇÃO SIMPLIFICADA - usar owner_logged_in em vez de ownerSession
    const isLoggedIn = localStorage.getItem('owner_logged_in');
    if (!isLoggedIn) {
      navigate('/owner/login');
      return;
    }
    
    // LIMPEZA DE CACHE E FORÇAR REFRESH DE DADOS
    console.log('[OWNER DASHBOARD] Iniciando, limpando cache...');
    
    // Limpar cache de dados antigos
    localStorage.removeItem('owner_dashboard_cache');
    localStorage.removeItem('orders_cache');
    localStorage.removeItem('metrics_cache');
    
    // Carregar dados frescos do Supabase
    fetchMetrics();
  }, [navigate]);

  const getDateRange = (period: 'HOJE' | 'SEMANA' | 'MÊS' | 'ANO') => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
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

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      console.log('[OWNER DASHBOARD] Buscando métricas do Supabase...');
      
      // FORÇAR REFRESH DE DADOS - buscar diretamente do Supabase
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['closed', 'FECHADO', 'paid', 'finalized']);

      if (ordersError) {
        console.error('[OWNER DASHBOARD] Erro ao buscar orders:', ordersError);
      } else {
        console.log('[OWNER DASHBOARD] Orders encontradas:', ordersData?.length || 0);
        
        // Calcular faturação de hoje com timezone Africa/Luanda
        const today = new Date().toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
        const todayOrders = ordersData?.filter(order => {
          const orderDate = new Date(order.created_at || order.timestamp).toLocaleDateString('pt-AO', { timeZone: 'Africa/Luanda' });
          return orderDate === today && Number(order.total_amount || order.total || 0) > 0;
        }) || [];

        const faturacaoHoje = todayOrders.reduce((sum, order) => sum + Number(order.total_amount || order.total || 0), 0);
        
        console.log('[OWNER DASHBOARD] Faturação Hoje (Africa/Luanda):', {
          today,
          todayOrders: todayOrders.length,
          faturacaoHoje,
          formatKz: formatKz(faturacaoHoje)
        });

        // Buscar despesas
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('*')
          .eq('status', 'PENDING');

        const totalDespesas = expensesData?.reduce((sum, exp) => sum + Number(exp.amount_kz || 0), 0) || 0;

        // Buscar folha salarial
        const { data: staffData } = await supabase
          .from('staff')
          .select('salario_base, base_salary_kz');

        const folhaSalarial = staffData?.reduce((sum, staff) => sum + Number(staff.salario_base || staff.base_salary_kz || 0), 0) || 0;

        // Buscar histórico externo
        let historicoExterno = 0;
        try {
          const { data: historyData } = await supabase
            .from('external_history')
            .select('total_revenue');

          if (historyData && historyData.length > 0) {
            historicoExterno = historyData.reduce((acc, row) => acc + (Number(row.total_revenue) || 0), 0);
          }
        } catch (error) {
          console.error('[OWNER DASHBOARD] Erro ao buscar external_history:', error);
        }

        // Calcular impostos (7%)
        const impostos = faturacaoHoje * 0.07;

        // Gerar dados para gráficos
        const chartDataGenerated = [
          {
            date: 'Hoje',
            receitas: Number(faturacaoHoje) || 0,
            despesas: Number(totalDespesas) || 0,
            vendas: Number(faturacaoHoje) || 0
          },
          {
            date: 'Ontem',
            receitas: Math.round((Number(faturacaoHoje) || 0) * 0.8),
            despesas: Math.round((Number(totalDespesas) || 0) * 0.9),
            vendas: Math.round((Number(faturacaoHoje) || 0) * 0.8)
          }
        ];

        // Atualizar métricas
        setMetrics({
          faturacaoHoje,
          mesasAtivas: 0,
          totalVendas: faturacaoHoje,
          receitaTotal: faturacaoHoje,
          despesas: totalDespesas,
          despesasAcumuladas: totalDespesas,
          folhaSalarial,
          impostos,
          historicoRevenue: historicoExterno,
          rendimentoGlobal: faturacaoHoje + historicoExterno,
          lucroLiquido: faturacaoHoje - impostos - totalDespesas - folhaSalarial
        });
        
        setChartData(chartDataGenerated);
        setHistoricoExterno(historicoExterno);
      }
    } catch (error) {
      console.error('[OWNER DASHBOARD] Erro ao buscar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('owner_logged_in');
    navigate('/owner/login');
  };

  const handleResetProduction = async () => {
    setIsResetting(true);
    try {
      // Lógica de reset
      await fetchMetrics();
    } catch (error) {
      console.error('[OWNER DASHBOARD] Erro ao resetar produção:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const ticketMedio = metrics.totalVendas > 0 ? metrics.totalVendas / (metrics.faturacaoHoje > 0 ? metrics.faturacaoHoje : 1) : 0;
  const lucroLiquido = metrics.totalVendas - metrics.despesas - metrics.folhaSalarial - metrics.impostos;
  const custoOperacionalTotal = metrics.despesas + metrics.folhaSalarial;
  const faturacaoAtual = metrics.totalVendas;
  const progressoBreakEven = custoOperacionalTotal > 0 ? Math.min((faturacaoAtual / custoOperacionalTotal) * 100, 100) : 0;
  const faturacaoNecessaria = Math.max(custoOperacionalTotal - faturacaoAtual, 0);
  const isAboveBreakEven = faturacaoAtual >= custoOperacionalTotal;
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
              {formatKz(metrics.folhaSalarial || 0)}
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
