import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, Users, Wallet, Receipt, Calculator, RefreshCw, LogOut, Settings, TrendingDown, Package } from 'lucide-react';

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

  // Função para criar dados de teste
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
      
      // Atualizar métricas após inserção
      setTimeout(() => {
        fetchMetrics();
      }, 1000);
      
    } catch (error) {
      console.error('[DASHBOARD] Erro ao inserir dados de teste:', error);
    }
  };

  // Buscar métricas do Supabase
  const fetchMetrics = async () => {
    try {
      console.log(`[DASHBOARD] Iniciando busca de métricas para período: ${period}`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startDate = new Date(today);
      
      // Ajustar data de início conforme período
      switch (period) {
        case 'HOJE':
          startDate = today;
          break;
        case 'SEMANA':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'MÊS':
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'ANO':
          startDate.setFullYear(today.getFullYear() - 1);
          break;
      }

      // Buscar pedidos
      console.log(`[DASHBOARD] Buscando orders de ${startDate.toISOString()} até agora`);
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'closed');

      if (ordersError) {
        console.error('[DASHBOARD] Erro ao buscar orders:', ordersError);
        throw ordersError;
      }
      console.log(`[DASHBOARD] Orders encontrados: ${orders?.length || 0}`);

      // Buscar despesas (purchase_requests)
      console.log(`[DASHBOARD] Buscando purchase_requests de ${startDate.toISOString()} até agora`);
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchase_requests')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'pago');

      if (purchasesError) {
        console.error('[DASHBOARD] Erro ao buscar purchase_requests:', purchasesError);
        throw purchasesError;
      }
      console.log(`[DASHBOARD] Purchase requests encontrados: ${purchases?.length || 0}`);

      // Buscar folha salarial
      console.log(`[DASHBOARD] Buscando staff`);
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('base_salary_kz');

      if (staffError) {
        console.error('[DASHBOARD] Erro ao buscar staff:', staffError);
        throw staffError;
      }
      console.log(`[DASHBOARD] Staff encontrados: ${staff?.length || 0}`);

      // Buscar histórico de owner_finances
      console.log(`[DASHBOARD] Buscando owner_finances`);
      const { data: ownerFinances, error: ownerFinancesError } = await supabase
        .from('owner_finances')
        .select('legacy_revenue_kz')
        .gte('created_at', startDate.toISOString());

      if (ownerFinancesError) {
        console.error('[DASHBOARD] Erro ao buscar owner_finances:', ownerFinancesError);
        console.log('[DASHBOARD] Continuando sem dados de owner_finances');
      }
      console.log(`[DASHBOARD] Owner finances encontrados: ${ownerFinances?.length || 0}`);

      // Calcular métricas
      const vendasHoje = orders
        .filter(order => {
          const orderDate = new Date(order.created_at!);
          const todayDate = new Date();
          return orderDate.toDateString() === todayDate.toDateString();
        })
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);

      const mesasAtivas = orders
        .filter(order => order.status === 'open')
        .length;

      const totalVendas = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const receitaTotal = totalVendas;
      const despesas = purchases.reduce((sum, purchase) => sum + (purchase.amount_kz || 0), 0);
      const folhaSalarial = staff.reduce((sum, employee) => sum + (employee.base_salary_kz || 0), 0);
      const historicoRevenue = ownerFinances?.reduce((sum, finance) => sum + (finance.legacy_revenue_kz || 0), 0) || 0;
      const impostos = totalVendas * 0.065;

      console.log(`[DASHBOARD] Métricas calculadas:`, {
        totalVendas,
        despesas,
        folhaSalarial,
        historicoRevenue,
        impostos
      });

      setMetrics({
        vendasHoje,
        mesasAtivas,
        totalVendas,
        receitaTotal,
        despesas,
        folhaSalarial,
        impostos,
        historicoRevenue
      });

    } catch (error) {
      console.error('[DASHBOARD] Erro ao buscar métricas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Se for erro de permissão, mostrar mensagem específica
      if (errorMessage.includes('permission') || (error as any)?.code === 'PGRST301') {
        addNotification('error', 'Erro de permissão: Verifique as políticas RLS das tabelas');
      } else {
        addNotification('error', `Erro ao carregar métricas: ${errorMessage}`);
      }
      
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

    fetchMetrics();
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
  }, [period]);

  // Calcular ticket médio
  const ticketMedio = metrics.totalVendas > 0 ? metrics.totalVendas / (metrics.vendasHoje > 0 ? metrics.vendasHoje : 1) : 0;

  // Calcular lucro líquido
  const lucroLiquido = metrics.receitaTotal - metrics.despesas - metrics.folhaSalarial - metrics.impostos;

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#070b14]">
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
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                period === p 
                  ? 'bg-cyan-500 text-black shadow-lg' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* GRID DE INDICADORES (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Faturação Total */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all min-h-[140px]">
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

          {/* Card 2: Lucro Líquido */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all min-h-[140px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Lucro Líquido</span>
            </div>
            <div className="text-3xl font-black text-emerald-400 mb-2">
              {formatAKZ(lucroLiquido)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* Card 3: Ticket Médio */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all min-h-[140px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-xs text-white/60 uppercase tracking-wider">Ticket Médio</span>
            </div>
            <div className="text-2xl font-black text-white mb-2">
              {formatAKZ(ticketMedio)}
            </div>
            <div className="text-xs text-white/60">Moeda: AKZ</div>
          </div>

          {/* Card 4: Custos de Staff */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all min-h-[140px]">
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
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6 min-h-[140px]">
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

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Receitas */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 min-h-[280px]">
            <h3 className="text-lg font-black text-white mb-4">Receitas vs Despesas</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-white/60 text-sm">Gráfico em desenvolvimento</p>
                <p className="text-white/40 text-xs mt-1">Recharts integration</p>
              </div>
            </div>
          </div>

          {/* Gráfico de Tendências */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 min-h-[280px]">
            <h3 className="text-lg font-black text-white mb-4">Tendências de Vendas</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-white/60 text-sm">Gráfico em desenvolvimento</p>
                <p className="text-white/40 text-xs mt-1">ResponsiveContainer ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* MÓDULO FISCAL */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6 min-h-[140px]">
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

        {/* RANKING - TOP 5 PRODUTOS */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 min-h-[320px]">
          <h3 className="text-lg font-black text-white mb-4">Top 5 Produtos</h3>
          <div className="space-y-3">
            {[
              { name: 'Frango com Batata', sales: 45, image: '/api/placeholder/40/40' },
              { name: 'Arroz com Marisco', sales: 38, image: '/api/placeholder/40/40' },
              { name: 'Muamba de Carne', sales: 32, image: '/api/placeholder/40/40' },
              { name: 'Calulu de Peixe', sales: 28, image: '/api/placeholder/40/40' },
              { name: 'Feijão com Óleo', sales: 24, image: '/api/placeholder/40/40' }
            ].map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-cyan-400 w-6">#{index + 1}</span>
                  <div className="w-10 h-10 bg-white/10 rounded-full overflow-hidden flex items-center justify-center">
                    <Package className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{product.name}</h4>
                    <p className="text-xs text-white/60">{product.sales} vendas</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{product.sales}</div>
                  <div className="text-xs text-white/40">unidades</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
