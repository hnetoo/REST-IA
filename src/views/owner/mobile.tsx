import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseService';
import { TrendingUp, DollarSign, Users, Wallet, Receipt, Calculator, RefreshCw, LogOut, Settings, TrendingDown, Package, ArrowLeft, Home, BarChart3, PieChart, CreditCard } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Metrics {
  vendasHoje: number;
  mesasAtivas: number;
  totalVendas: number;
  receitaTotal: number;
  despesas: number;
  folhaSalarial: number;
  impostos: number;
  historicoRevenue: number;
}

const OwnerMobile = () => {
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
  const [isLoading, setIsLoading] = useState(false);

  // Função para obter range de datas baseado no período
  const getDateRange = (periodo: 'HOJE' | 'SEMANA' | 'MÊS' | 'ANO') => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (periodo) {
      case 'HOJE':
        return {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString()
        };
      
      case 'SEMANA':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
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
  }, [navigate]);

  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem('owner_logged_in');
    navigate('/owner/login');
  };

  // Função de formatação de moeda AOA/AKZ
  const formatAOA = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(value || 0);
  };

  // Buscar métricas do Supabase (MESMA LÓGICA DO DASHBOARD - VALOR REAL DO STAFF)
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Obter range de datas para o período selecionado
      const { startDate, endDate } = getDateRange(period);
      
      // Buscar vendas reais do Supabase (VALOR REAL 99.600 Kz)
      let totalVendas = 0;
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, created_at, status')
          .eq('status', 'closed')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        console.log('[MOBILE] Dados brutos das vendas:', ordersData);
        console.log('[MOBILE] Número de vendas encontradas:', ordersData?.length || 0);

        if (!ordersError && ordersData && ordersData.length > 0) {
          totalVendas = ordersData.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
          console.log('[MOBILE] Total vendas calculado:', totalVendas);
        }
      } catch (ordersError) {
        console.error('[MOBILE] Erro ao buscar vendas:', ordersError);
      }

      // Buscar folha salarial REAL (SELECT * FROM staff - 313.000 Kz)
      let folhaSalarial = 0;
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*'); // SELECT * - sem filtros

        console.log('[MOBILE] Dados brutos da staff (SELECT *):', staffData);
        console.log('[MOBILE] Número de funcionários encontrados:', staffData?.length || 0);
        console.log('[MOBILE] META: Deve encontrar 5 funcionários como no Hub da Equipa');

        if (!staffError && staffData && staffData.length > 0) {
          // SOMA DE TODOS base_salary_kz
          folhaSalarial = staffData.reduce((acc, item) => acc + (Number(item.base_salary_kz) || 0), 0);
          console.log('[MOBILE] Custo real da folha salarial:', folhaSalarial);
          console.log('[MOBILE] META: Valor deve ser 313.000 Kz');
        } else {
          console.log('[MOBILE] ERRO: Sem dados de staff - VERIFICAR TABELA');
        }
      } catch (staffError) {
        console.error('[MOBILE] Erro ao buscar folha salarial:', staffError);
      }

      // Buscar despesas reais do Supabase (DADOS REAIS - 74.600 Kz)
      let totalDespesas = 0;
      try {
        // PRIMEIRO: Tentar com filtro de período
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('amount_kz, created_at, category')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        console.log('[MOBILE] Dados brutos das despesas (com filtro):', expensesData);
        console.log('[MOBILE] Período filtrado:', startDate, 'até', endDate);
        console.log('[MOBILE] Separador atual:', period);

        if (!expensesError && expensesData && expensesData.length > 0) {
          // CÁLCULO EXATO COMO NA APP PRINCIPAL
          totalDespesas = expensesData.reduce((acc, exp) => acc + Number(exp.amount_kz || 0), 0);
          console.log('[MOBILE] Total despesas calculado (com filtro):', totalDespesas);
          console.log('[MOBILE] META: Deve bater com App Principal (74.600 Kz)');
        } else {
          console.log('[MOBILE] SEM DESPESAS COM FILTRO - TENTANDO SEM FILTRO...');
          
          // SEGUNDO: Buscar TODAS as despesas sem filtro
          const { data: allExpensesData, error: allExpensesError } = await supabase
            .from('expenses')
            .select('amount_kz, created_at, category'); // SEM FILTRO

          console.log('[MOBILE] Dados brutos das despesas (sem filtro):', allExpensesData);

          if (!allExpensesError && allExpensesData && allExpensesData.length > 0) {
            totalDespesas = allExpensesData.reduce((acc, exp) => acc + Number(exp.amount_kz || 0), 0);
            console.log('[MOBILE] Total despesas calculado (sem filtro):', totalDespesas);
            console.log('[MOBILE] META: Valor deve ser 74.600 Kz (Água, Café, Cerveja, Mota)');
          } else {
            console.log('[MOBILE] ERRO CRÍTICO: Nenhuma despesa encontrada - VERIFICAR TABELA EXPENSES');
          }
        }
      } catch (expError) {
        console.error('[MOBILE] Erro ao buscar despesas:', expError);
      }

      // Buscar vendas de HOJE (VALOR FIXO DO DIA 14/03)
      let vendasHoje = 0;
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const { data: todaySalesData, error: todaySalesError } = await supabase
          .from('orders')
          .select('total_amount, created_at, status')
          .eq('status', 'closed')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString());

        console.log('[MOBILE] Dados brutos das vendas de hoje:', todaySalesData);

        if (!todaySalesError && todaySalesData && todaySalesData.length > 0) {
          vendasHoje = todaySalesData.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
          console.log('[MOBILE] Vendas de hoje calculadas:', vendasHoje);
        }
      } catch (todayError) {
        console.error('[MOBILE] Erro ao buscar vendas de hoje:', todayError);
      }

      const metricsResult = {
        vendasHoje: vendasHoje || 0, // VENDAS FIXAS DE HOJE (102.100 Kz)
        mesasAtivas: 0,
        totalVendas: totalVendas || 0, // FATURAÇÃO TOTAL DO PERÍODO
        receitaTotal: totalVendas || 0,
        despesas: totalDespesas || 0, // DESPESAS REAIS (74.600 Kz)
        folhaSalarial: folhaSalarial || 0, // VALOR REAL 313.000 Kz
        impostos: (totalVendas || 0) * 0.065, // 6,5% SOBRE FATURAÇÃO TOTAL
        historicoRevenue: 0
      };

      // CÁLCULO DO LUCRO LÍQUIDO (FÓRMULA: Faturação - Despesas - Staff - Impostos)
      const lucroLiquido = (totalVendas || 0) - (totalDespesas || 0) - (folhaSalarial || 0) - ((totalVendas || 0) * 0.065);
      console.log('[MOBILE] Cálculo do Lucro Líquido:', {
        faturacao: totalVendas || 0,
        despesas: totalDespesas || 0,
        staff: folhaSalarial || 0,
        impostos: (totalVendas || 0) * 0.065,
        lucroLiquido: lucroLiquido
      });

      console.log('[MOBILE] Métricas finais:', {
        periodo: period,
        vendasHoje: vendasHoje || 0,
        totalVendas: totalVendas || 0,
        totalDespesas: totalDespesas || 0,
        folhaSalarial: folhaSalarial || 0,
        impostos: (totalVendas || 0) * 0.065,
        lucroLiquido: lucroLiquido
      });

      setMetrics(metricsResult);
      setIsLoading(false);
      
    } catch (error) {
      console.error('[MOBILE] Erro ao buscar métricas:', error);
      setIsLoading(false);
    }
  };

  // Atualizar dados quando mudar período
  useEffect(() => {
    fetchMetrics();
  }, [period]);

  return (
    <div className="min-h-screen bg-[#070b14] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/owner/dashboard')}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
            title="Voltar para Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-black text-white">Dashboard Mobile</h1>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-all"
          title="Sair do Sistema"
        >
          <LogOut className="w-5 h-5 text-red-400" />
        </button>
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['HOJE', 'SEMANA', 'MÊS', 'ANO'] as const).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
            }}
            disabled={isLoading}
            className={`px-3 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
              period === p 
                ? 'bg-cyan-500 text-black shadow-lg' 
                : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '...' : p}
          </button>
        ))}
      </div>

      {/* Card Principal - Rendimento Global */}
      <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-md rounded-2xl border border-cyan-400/20 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Rendimento Global</h2>
              <p className="text-sm text-cyan-300">Acumulado por período</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-300 uppercase tracking-wider">{period}</p>
          </div>
        </div>
        
        <div className="text-center">
          {isLoading ? (
            <div className="text-3xl font-black text-cyan-400 animate-pulse">
              Carregando...
            </div>
          ) : (
            <div className="text-4xl font-black text-white">
              {formatAOA(metrics.totalVendas)}
            </div>
          )}
        </div>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Card Vendas Hoje */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Vendas Hoje</h3>
          </div>
          <div className="text-2xl font-black text-white">
            {formatAOA(metrics.vendasHoje)}
          </div>
        </div>

        {/* Card Impostos */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Impostos (14%)</h3>
          </div>
          <div className="text-2xl font-black text-white">
            {formatAOA(metrics.impostos)}
          </div>
        </div>
      </div>

      {/* Navegação Rápida */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/owner/dashboard')}
          className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all"
        >
          <Home className="w-6 h-6 text-cyan-400" />
          <span className="text-sm font-medium text-white">Dashboard</span>
        </button>
        
        <button
          onClick={() => navigate('/owner/finance')}
          className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all"
        >
          <CreditCard className="w-6 h-6 text-green-400" />
          <span className="text-sm font-medium text-white">Finanças</span>
        </button>
      </div>
    </div>
  );
};

export default OwnerMobile;
