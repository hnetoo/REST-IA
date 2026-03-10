import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Smartphone, DollarSign, Users, TrendingUp, Wallet, Receipt, FileText, Calculator, RefreshCw, LogOut, Settings } from 'lucide-react';

interface Metrics {
  vendasHoje: number;
  mesasAtivas: number;
  totalVendas: number;
  receitaTotal: number;
  despesas: number;
  folhaSalarial: number;
  impostos: number;
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
    impostos: 0
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

  // Buscar métricas do Supabase
  const fetchMetrics = async () => {
    try {
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
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'closed');

      if (ordersError) throw ordersError;

      // Buscar despesas (purchase_requests)
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchase_requests')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'approved');

      if (purchasesError) throw purchasesError;

      // Buscar folha salarial
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('base_salary_kz');

      if (staffError) throw staffError;

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
      const despesas = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
      const folhaSalarial = staff.reduce((sum, employee) => sum + (employee.base_salary_kz || 0), 0);
      const impostos = totalVendas * 0.065;

      setMetrics({
        vendasHoje,
        mesasAtivas,
        totalVendas,
        receitaTotal,
        despesas,
        folhaSalarial,
        impostos
      });

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      addNotification('error', 'Erro ao carregar métricas');
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

  // Script de Teste - Gerar Dados de Teste
  const handleGenerateTestData = async () => {
    if (!window.confirm('🧪 Gerar dados de teste?\n\nIsto irá criar 10 vendas reais e 5 despesas pagas.')) {
      return;
    }

    setIsResetting(true);
    try {
      // Gerar 10 vendas de hoje com valores realistas
      const today = new Date();
      for (let i = 1; i <= 10; i++) {
        const { error } = await supabase
          .from('orders')
          .insert({
            id: `test-order-${Date.now()}-${i}`,
            table_id: Math.floor(Math.random() * 10) + 1,
            status: 'closed',
            total_amount: Math.floor(Math.random() * 80000) + 20000, // 20k-100k AOA
            created_at: today.toISOString(),
            updated_at: today.toISOString()
          });
        
        if (error) throw error;
      }

      // Gerar 5 despesas pagas com valores realistas
      const expenses = [
        { description: 'Matéria-prima cozinha', amount: 45000 },
        { description: 'Bebidas e refrigerantes', amount: 35000 },
        { description: 'Carne e pescado', amount: 65000 },
        { description: 'Legumes e frutas', amount: 28000 },
        { description: 'Material de limpeza', amount: 15000 }
      ];

      for (let i = 0; i < expenses.length; i++) {
        const { error } = await supabase
          .from('purchase_requests')
          .insert({
            id: `test-purchase-${Date.now()}-${i}`,
            description: expenses[i].description,
            amount: expenses[i].amount,
            status: 'aprovado',
            created_at: today.toISOString(),
            updated_at: today.toISOString()
          });
        
        if (error) throw error;
      }

      addNotification('success', 'Dados de teste gerados com sucesso!');
      await fetchMetrics();

    } catch (error) {
      console.error('Erro ao gerar dados:', error);
      addNotification('error', 'Erro ao gerar dados de teste');
    } finally {
      setIsResetting(false);
    }
  };

  // Reset de dados de produção
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto">
      {/* Header com Botão de Sair */}
      <header className="sticky top-0 z-50 flex justify-between items-center p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Owner Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-white/90">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all backdrop-blur-sm"
        >
          <LogOut size={18} />
          <span className="font-semibold">Sair</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-24">
        {/* Filtros de Período */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['HOJE', 'SEMANA', 'MÊS', 'ANO'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all ${
                period === p 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Card de Faturação Consolidada */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-md mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-white" />
              <h2 className="text-xl font-bold text-white">Faturação Consolidada</h2>
            </div>
            <button className="px-4 py-2 bg-white/20 border border-white/30 text-white/80 rounded-lg hover:bg-white/30 transition-all text-sm">
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-white/70 mb-2">Vendas Atuais (Vereda OS)</p>
              <div className="text-3xl font-bold text-white">
                {formatAOA(metrics.totalVendas)}
              </div>
            </div>
            <div>
              <p className="text-sm text-white/70 mb-2">Histórico Acumulado</p>
              <div className="text-3xl font-bold text-white">
                {formatAOA(0)}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="text-4xl font-bold text-white text-center">
              {formatAOA(metrics.totalVendas + 0)}
            </div>
          </div>
        </div>

        {/* Grid de Cards - Layout Horizontal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Vendas Hoje - Verde */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 p-8 rounded-3xl shadow-2xl border border-green-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <DollarSign className="w-8 h-8 text-green-200" />
              <span className="text-sm text-green-200 uppercase tracking-wider">AOA</span>
            </div>
            <div className="text-5xl font-bold text-white">
              {formatAOA(metrics.vendasHoje)}
            </div>
            <div className="text-sm text-green-200">Vendas Hoje</div>
          </div>

          {/* Mesas Ativas - Azul */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl shadow-2xl border border-blue-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-blue-200" />
              <span className="text-sm text-blue-200 uppercase tracking-wider">MESAS</span>
            </div>
            <div className="text-5xl font-bold text-white">
              {metrics.mesasAtivas}
            </div>
            <div className="text-sm text-blue-200">Mesas Ativas</div>
          </div>

          {/* Receita Total - Roxa */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-8 rounded-3xl shadow-2xl border border-purple-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <Wallet className="w-8 h-8 text-purple-200" />
              <span className="text-sm text-purple-200 uppercase tracking-wider">AOA</span>
            </div>
            <div className="text-5xl font-bold text-white">
              {formatAOA(metrics.receitaTotal)}
            </div>
            <div className="text-sm text-purple-200">Receita Total</div>
          </div>

          {/* Despesas - Laranja */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 p-8 rounded-3xl shadow-2xl border border-orange-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <Receipt className="w-8 h-8 text-orange-200" />
              <span className="text-sm text-orange-200 uppercase tracking-wider">AOA</span>
            </div>
            <div className="text-5xl font-bold text-white">
              {formatAOA(metrics.despesas)}
            </div>
            <div className="text-sm text-orange-200">Despesas</div>
          </div>

          {/* Folha Salarial - Rosa */}
          <div className="bg-gradient-to-br from-pink-600 to-pink-700 p-8 rounded-3xl shadow-2xl border border-pink-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <FileText className="w-8 h-8 text-pink-200" />
              <span className="text-sm text-pink-200 uppercase tracking-wider">AOA</span>
            </div>
            <div className="text-5xl font-bold text-white">
              {formatAOA(metrics.folhaSalarial)}
            </div>
            <div className="text-sm text-pink-200">Folha Salarial</div>
          </div>

          {/* Impostos - Vermelho */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-8 rounded-3xl shadow-2xl border border-red-500/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <Calculator className="w-8 h-8 text-red-200" />
              <span className="text-sm text-red-200 uppercase tracking-wider">AOA</span>
            </div>
            <div className="text-5xl font-bold text-white">
              {formatAOA(metrics.impostos)}
            </div>
            <div className="text-sm text-red-200">Impostos (6.5% sobre faturação)</div>
          </div>
        </div>
      </main>

      {/* Botão de Reset - Limpar Dados de Teste */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <button
          onClick={handleGenerateTestData}
          disabled={isResetting}
          className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-green-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isResetting ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Gerando...
            </>
          ) : (
            'Gerar Dados de Teste'
          )}
        </button>
        <button
          onClick={handleResetProduction}
          disabled={isResetting}
          className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isResetting ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Limpando...
            </>
          ) : (
            'Limpar Dados de Teste'
          )}
        </button>
      </div>
    </div>
  );
};

export default OwnerDashboard;
