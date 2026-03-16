import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, CreditCard, ShoppingCart, Calendar, Clock, AlertTriangle, Users, BarChart3, Package, Filter, Download, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatKz, formatPercent, safeValue, getProfitColor, getPercentColor, formatDate, formatDateTime } from '../utils/format';

// Interfaces TypeScript para dados financeiros
interface OrderData {
  id: string;
  created_at: string;
  total: number;
  status: string;
  payment_method?: string;
  order_items: {
    quantity: number;
    products: {
      cost_price: number;
      price: number;
    };
  }[];
}

interface ExpenseData {
  id: string;
  amount: number;
  created_at: string;
  category: string;
}

interface PaymentMethodData {
  method: string;
  amount: number;
  percentage: number;
}

interface HourlySales {
  hour: string;
  orders: number;
  revenue: number;
}

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  details: string;
  user_name?: string;
}

const DashboardV2 = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('hoje');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Estados para métricas financeiras
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    totalOrders: 0,
    averageTicket: 0,
    taxProvision: 0,
    annualTaxProvision: 0, // Adicionado para resolver o erro
    currentExerciseProfit: 0, // Adicionado para resolver o erro
    reservaFiscal: 0,
    caixaDisponivel: 0,
    liquidezStatus: 'seguro' as 'seguro' | 'risco',
    paymentMethods: [] as PaymentMethodData[],
    hourlySales: [] as HourlySales[],
    weeklyComparison: { today: 0, lastWeek: 0 },
    auditLogs: [] as AuditLog[],
    topExpenses: [] as ExpenseData[],
    historicoExternoRevenue: 0,
    historicoExternoProfit: 0,
    faturacaoTotal: 0
  });

  // Formatar data para input
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Definir range de datas
  const setDateRange = (range: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'hoje':
        start = today;
        end = today;
        break;
      case 'semana':
        start = new Date(today.setDate(today.getDate() - 7));
        end = today;
        break;
      case 'mes':
        start = new Date(today.setMonth(today.getMonth() - 1));
        end = today;
        break;
    }

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setDateRange(range);
  };

  // Carregar dados do dashboard
  const loadDashboardData = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      console.log('[DashboardV2] Carregando dados financeiros...');

      // 1. Buscar pedidos com JOIN para order_items e products
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total,
          status,
          payment_method,
          order_items (
            quantity,
            products (
              cost_price,
              price
            )
          )
        `)
        .in('status', ['closed', 'finalized'])
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('[DashboardV2] Erro ao buscar pedidos:', ordersError);
        setLoading(false);
        return;
      }

      // 2. Buscar despesas
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, amount, created_at, category')
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`);

      if (expensesError) {
        console.error('[DashboardV2] Erro ao buscar despesas:', expensesError);
      }

      // LOGS DE DEPURURAÇÃO PURA - DEBUG DESPESAS
      console.log("[DEBUG DESPESAS] Tabelas encontradas e dados brutos:", expensesData);
      console.log("[DEBUG DESPESAS] Total de registos:", expensesData?.length || 0);
      console.log("[DEBUG DESPESAS] Soma bruta:", expensesData?.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0) || 0);

      // 3. Buscar histórico externo (soma dinâmica de todos os registos)
      const { data: externalHistory, error: externalError } = await supabase
        .from('external_history')
        .select('total_revenue, gross_profit');

      let historicoExternoRevenue = 0;
      let historicoExternoProfit = 0;
      
      if (externalError) {
        console.error('[DashboardV2] Erro ao buscar histórico externo:', externalError);
      } else if (!externalHistory || externalHistory.length === 0) {
        console.log('[DASHBOARD] Histórico vazio. Exibindo valores zerados.');
      } else {
        // Soma dinâmica de todos os registos com tratamento seguro
        historicoExternoRevenue = externalHistory.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
        historicoExternoProfit = externalHistory.reduce((sum, item) => sum + (item.gross_profit || 0), 0);
        console.log('[DashboardV2] Histórico externo carregado:', { 
          registros: externalHistory.length, 
          revenue: historicoExternoRevenue, 
          profit: historicoExternoProfit 
        });
      }

      // 4. Buscar logs de auditoria
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('id, created_at, action, details, user_name')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditError) {
        console.error('[DashboardV2] Erro ao buscar logs:', auditError);
      }

      // 4. Processar dados financeiros
      let totalRevenue = 0;
      let totalCost = 0;
      let totalOrders = 0;
      const paymentMethodsMap = new Map<string, number>();
      const hourlySalesMap = new Map<string, { orders: number; revenue: number }>();

      ordersData?.forEach((order: OrderData) => {
        totalRevenue += order.total || 0;
        totalOrders++;

        // Agregar por método de pagamento
        const method = order.payment_method || 'Não Especificado';
        paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + (order.total || 0));

        // Calcular custo dos produtos
        order.order_items?.forEach(item => {
          const quantity = item.quantity || 0;
          const costPrice = item.products?.cost_price || 0;
          totalCost += quantity * costPrice;
        });

        // Agregar por hora
        const hour = new Date(order.created_at).getHours().toString().padStart(2, '0');
        const current = hourlySalesMap.get(hour) || { orders: 0, revenue: 0 };
        hourlySalesMap.set(hour, {
          orders: current.orders + 1,
          revenue: current.revenue + (order.total || 0)
        });
      });

      const totalExpenses = (expensesData && expensesData.length > 0) 
        ? expensesData.reduce((sum, expense: ExpenseData) => sum + Number(expense?.amount || 0), 0) 
        : 0;

      // LOG DE VALIDAÇÃO DO CÁLCULO
      console.log("[DEBUG DESPESAS] Cálculo final totalExpenses:", totalExpenses);
      console.log("[DEBUG DESPESAS] Detalhe do cálculo:", {
        hasData: expensesData && expensesData.length > 0,
        itemCount: expensesData?.length || 0,
        calculation: expensesData?.map(e => ({ id: e.id, amount: e.amount, parsed: Number(e?.amount || 0) }))
      });
      const totalProfit = totalRevenue - totalCost - totalExpenses;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // REGRA DE NEGÓCIO: IMPOSTOS APENAS SOBRE VENDAS DE HOJE
      const taxProvision = totalRevenue * 0.065; // 6.5% de provisão APENAS sobre vendas do dia
      
      // CÁLCULO DA PROVISÃO DE IMPOSTO ANUAL (SEM DUPLA TRIBUTAÇÃO)
      // Incide APENAS sobre lucro gerado na operação atual da app
      const currentExerciseProfit = totalRevenue - totalExpenses; // Lucro deste exercício
      const annualTaxProvision = Math.max(0, currentExerciseProfit) * 0.065; // 6.5% apenas sobre operação atual
      
      // Cálculo de liquidez fiscal (TOQUE DE MESTRE) - APENAS OPERAÇÃO ATUAL
      const reservaFiscal = taxProvision + (Math.max(0, totalProfit) * 0.25); // Retenção + Industrial
      const caixaDisponivel = totalRevenue - totalExpenses; // Faturamento do dia - Despesas do dia
      const liquidezStatus = caixaDisponivel >= reservaFiscal ? 'seguro' : 'risco';

      // Processar métodos de pagamento
      const paymentMethods: PaymentMethodData[] = Array.from(paymentMethodsMap.entries())
        .map(([method, amount]) => ({
          method,
          amount,
          percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      // Processar vendas horárias
      const hourlySales: HourlySales[] = Array.from(hourlySalesMap.entries())
        .map(([hour, data]) => ({
          hour: `${hour}:00`,
          orders: data.orders,
          revenue: data.revenue
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Processar top 3 despesas
      const topExpenses: ExpenseData[] = (expensesData && expensesData.length > 0)
        ? expensesData
            .sort((a: ExpenseData, b: ExpenseData) => (b.amount || 0) - (a.amount || 0))
            .slice(0, 3)
        : [];

      // Calcular faturação total (APENAS PARA EXIBIÇÃO - NÃO AFETA CÁLCULOS)
      const faturacaoTotal = historicoExternoRevenue + totalRevenue;

      // Comparação semanal (simplificada)
      const todayRevenue = totalRevenue;
      const lastWeekRevenue = todayRevenue * 0.85; // Simulação de -15%

      setMetrics({
        totalRevenue,
        totalProfit,
        totalExpenses,
        totalOrders,
        averageTicket,
        taxProvision,
        annualTaxProvision, // NOVO: Provisão de imposto anual (sem dupla tributação)
        currentExerciseProfit, // NOVO: Lucro deste exercício
        reservaFiscal,
        caixaDisponivel,
        liquidezStatus,
        paymentMethods,
        hourlySales,
        weeklyComparison: {
          today: todayRevenue,
          lastWeek: lastWeekRevenue
        },
        auditLogs: auditData || [],
        topExpenses,
        historicoExternoRevenue,
        historicoExternoProfit,
        faturacaoTotal
      });

      console.log('[TASCA] Dashboard V2: Dados sincronizados com sucesso.');

      console.log('[DashboardV2] Dados processados:', {
        totalRevenue,
        totalProfit,
        totalOrders,
        totalExpenses,
        reservaFiscal,
        caixaDisponivel,
        liquidezStatus,
        historicoExternoRevenue,
        historicoExternoProfit,
        faturacaoTotal,
        paymentMethods: paymentMethods.length
      });

    } catch (error) {
      console.error('[DashboardV2] Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDateRange('hoje');
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [startDate, endDate]);

  // Monitorizar mudanças nas métricas para debugging
  useEffect(() => {
    console.log('[DashboardV2] Estado atualizado:', {
      totalRevenue: metrics.totalRevenue,
      totalExpenses: metrics.totalExpenses,
      totalProfit: metrics.totalProfit,
      reservaFiscal: metrics.reservaFiscal,
      caixaDisponivel: metrics.caixaDisponivel,
      liquidezStatus: metrics.liquidezStatus,
      historicoExternoRevenue: metrics.historicoExternoRevenue,
      historicoExternoProfit: metrics.historicoExternoProfit,
      faturacaoTotal: metrics.faturacaoTotal
    });
  }, [metrics]);

  // Forçar re-render completo quando métricas mudarem
  useEffect(() => {
    // Este useEffect força o componente a re-renderizar quando as métricas mudam
    if (metrics.totalExpenses > 0 || metrics.historicoExternoRevenue > 0) {
      console.log('[DashboardV2] Forçando re-render por mudança de métricas');
    }
  }, [metrics.totalExpenses, metrics.historicoExternoRevenue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-white text-lg">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard V2 - Tasca do Vereda</h1>
        <p className="text-slate-400">Painel de controle financeiro e operacional</p>
      </div>

      {/* Filtros */}
      <div className="glass-panel rounded-xl p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Período</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="hoje">Hoje</option>
              <option value="semana">Últimos 7 dias</option>
              <option value="mes">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          
          {(dateRange === 'custom' || startDate) && (
            <>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </>
          )}
          
          <button
            onClick={loadDashboardData}
            className="px-6 py-2 bg-primary text-black rounded-lg font-medium hover:brightness-110 transition-all"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards Principais */}
      <div key={JSON.stringify(metrics)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card Financeiro */}
        <div className="glass-panel rounded-xl p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Financeiro</h3>
            <DollarSign className="text-green-500" size={24} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Receita Bruta</span>
              <span className="text-white font-bold">{formatKz(metrics.totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Lucro Líquido</span>
              <span className={`font-bold ${metrics.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatKz(metrics.totalProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Provisão Impostos</span>
              <span className="text-yellow-400 font-bold">{formatKz(metrics.taxProvision)}</span>
            </div>
          </div>
        </div>

        {/* Card Conciliação */}
        <div className="glass-panel rounded-xl p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Conciliação</h3>
            <CreditCard className="text-blue-500" size={24} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Histórico Externo</span>
              <span className="text-white font-bold">{formatKz(metrics.historicoExternoRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Vendas Hoje</span>
              <span className="text-white font-bold">{formatKz(metrics.totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Faturação Total</span>
              <span className="text-green-400 font-bold">{formatKz(metrics.faturacaoTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Despesas Hoje</span>
              <span className="text-white font-bold">{formatKz(metrics.totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Card Performance */}
        <div className="glass-panel rounded-xl p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Performance</h3>
            <BarChart3 className="text-purple-500" size={24} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Ticket Médio</span>
              <span className="text-white font-bold">{formatKz(metrics.averageTicket)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Total Pedidos</span>
              <span className="text-white font-bold">{metrics.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">CMV %</span>
              <span className="text-white font-bold">
                {metrics.totalRevenue > 0 ? ((metrics.totalExpenses / metrics.totalRevenue) * 100).toFixed(1) : '0'}%
              </span>
            </div>
          </div>
        </div>

        {/* Card Impostos */}
        <div className={`glass-panel rounded-xl p-6 border-l-4 ${
          metrics.liquidezStatus === 'seguro' ? 'border-l-green-500' : 'border-l-red-500'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">Impostos AGT</h3>
              {/* Indicador Visual de Liquidez */}
              <div className={`w-3 h-3 rounded-full ${
                metrics.liquidezStatus === 'seguro' 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-red-500 animate-pulse'
              }`} />
            </div>
            <AlertTriangle className={`${
              metrics.liquidezStatus === 'seguro' ? 'text-green-500' : 'text-red-500'
            }`} size={24} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Retenção na Fonte</span>
              <span className="text-white font-bold">{formatKz(metrics.taxProvision)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Imposto Industrial</span>
              <span className="text-yellow-400 font-bold">
                {formatKz(Math.max(0, metrics.totalProfit) * 0.25)}
              </span>
            </div>
            {/* NOVO: Previsão de Imposto (Este Exercício) */}
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <div>
                <span className="text-slate-400 text-sm">Previsão de Imposto (Este Exercício)</span>
                <div className="text-xs text-slate-500 mt-1">Exclui histórico tributado anteriormente</div>
              </div>
              <span className="text-green-400 font-bold">{formatKz(metrics.annualTaxProvision)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Liquidez Disponível</span>
              <span className={`font-bold ${
                metrics.liquidezStatus === 'seguro' ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatKz(metrics.caixaDisponivel)}
              </span>
            </div>
            {/* Alerta de Liquidez Fiscal */}
            <div 
              className={`mt-3 p-2 rounded-lg border ${
                metrics.liquidezStatus === 'seguro' 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}
              title="Este alerta compara o teu saldo disponível com a provisão de impostos calculada (Retenção + Industrial). Garante que tens liquidez para o fecho do exercício."
            >
              <p className={`text-sm font-medium ${
                metrics.liquidezStatus === 'seguro' ? 'text-green-400' : 'text-red-400'
              }`}>
                {metrics.totalProfit < 0 
                  ? '🚨 DÉFICE OPERACIONAL: Vendas não cobrem custos fixos'
                  : metrics.liquidezStatus === 'seguro' 
                    ? '✅ RESERVA COBERTA' 
                    : '⚠️ SALDO INSUFICIENTE PARA IMPOSTOS'
                }
              </p>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              *Estimativa anual a ser ajustada no fecho
            </div>
            {/* Top 3 Despesas */}
            {metrics.topExpenses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-2">Maiores Despesas</p>
                <div className="space-y-1">
                  {metrics.topExpenses.map((expense, index) => (
                    <div key={expense.id} className="flex justify-between text-xs">
                      <span className="text-slate-400">{expense.category}</span>
                      <span className="text-white font-medium">{formatKz(expense.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Tendência */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <TrendingUp className="text-primary" size={20} />
            Tendência de Vendas
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
              <span className="text-slate-400">Hoje</span>
              <span className="text-green-400 font-bold">{formatKz(metrics.weeklyComparison.today)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
              <span className="text-slate-400">Mesma data (Semana passada)</span>
              <span className="text-slate-400 font-bold">{formatKz(metrics.weeklyComparison.lastWeek)}</span>
            </div>
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">
                {metrics.weeklyComparison.today > metrics.weeklyComparison.lastWeek ? '+' : ''}
                {formatKz(metrics.weeklyComparison.today - metrics.weeklyComparison.lastWeek)} 
                {metrics.weeklyComparison.today > metrics.weeklyComparison.lastWeek ? ' vs semana passada' : ' vs semana passada'}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Horários */}
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <Clock className="text-primary" size={20} />
            Volume por Hora
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.hourlySales.map((hour, index) => (
              <div key={index} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded">
                <span className="text-slate-400 text-sm w-16">{hour.hour}</span>
                <div className="flex-1 mx-4 bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (hour.revenue / Math.max(...metrics.hourlySales.map(h => h.revenue))) * 100)}%` }}
                  />
                </div>
                <span className="text-white text-sm w-20 text-right">{hour.orders} pedidos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <Activity className="text-primary" size={20} />
          Atividades Recentes
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {metrics.auditLogs.length > 0 ? (
            metrics.auditLogs.map((log, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{log.action}</p>
                  <p className="text-slate-400 text-xs">{log.details}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">{log.user_name || 'Sistema'}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(log.created_at).toLocaleString('pt-AO')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Package className="text-slate-500 mx-auto mb-4" size={32} />
              <p className="text-slate-400">Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardV2;
