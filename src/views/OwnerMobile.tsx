import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Smartphone, DollarSign, Users, TrendingUp, Wallet, Receipt, FileText, Calculator, RefreshCw } from 'lucide-react';

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

const OwnerMobile = () => {
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

  // Verificar sessão independente do Owner Mobile
  useEffect(() => {
    const session = localStorage.getItem('ownerMobileSession');
    if (!session) {
      navigate('/owner-mobile/login');
      return;
    }

    try {
      const sessionData = JSON.parse(session);
      // Verificar se a sessão expirou (24 horas)
      if (Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('ownerMobileSession');
        navigate('/owner-mobile/login');
        return;
      }
    } catch (error) {
      localStorage.removeItem('ownerMobileSession');
      navigate('/owner-mobile/login');
    }
  }, [navigate]);

  // Função de notificação simples (independente do store)
  const addNotification = (type: 'success' | 'error', message: string) => {
    // Criar notificação temporária
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

  // Formatação de moeda
  const formatAOA = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatAKZ = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
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
        .reduce((sum, order) => sum + (order.total_amount_kz || 0), 0);

      const mesasAtivas = orders
        .filter(order => order.status === 'open')
        .length;

      const totalVendas = orders.reduce((sum, order) => sum + (order.total_amount_kz || 0), 0);
      const receitaTotal = totalVendas; // Pode ser ajustado para lucro líquido
      const despesas = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
      const folhaSalarial = staff.reduce((sum, employee) => sum + (employee.base_salary_kz || 0), 0);
      const impostos = totalVendas * 0.065; // 6.5% sobre faturação

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
          fetchMetrics(); // Recalcula os valores dos cards
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
          fetchMetrics(); // Recalcula os valores dos cards
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(purchasesChannel);
    };
  };

  // Reset de dados de produção (apenas para desenvolvimento)
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Não apagar nada se não houver pedidos

      if (ordersError) throw ordersError;

      // Apagar compras
      const { error: purchasesError } = await supabase
        .from('purchase_requests')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (purchasesError) throw purchasesError;

      addNotification('success', 'Dados de produção resetados com sucesso!');
      await fetchMetrics(); // Recarregar métricas

    } catch (error) {
      console.error('Erro ao resetar dados:', error);
      addNotification('error', 'Erro ao resetar dados de produção');
    } finally {
      setIsResetting(false);
    }
  };

  // Carregar dados e subscrição
  useEffect(() => {
    const session = localStorage.getItem('ownerMobileSession');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-[#06b6d4]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Owner Mobile</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-xs text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['HOJE', 'SEMANA', 'MÊS', 'ANO'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
              period === p 
                ? 'bg-[#fbbf24] text-black' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Vendas Hoje - Verde */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">AOA</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatAOA(metrics.vendasHoje)}
          </div>
          <div className="text-xs text-white/70">Vendas Hoje</div>
        </div>

        {/* Mesas Ativas - Azul */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">TOTAL</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.mesasAtivas}
          </div>
          <div className="text-xs text-white/70">Mesas Ativas</div>
        </div>

        {/* Total Vendas - Laranja */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">AOA</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatAOA(metrics.totalVendas)}
          </div>
          <div className="text-xs text-white/70">Total Vendas</div>
        </div>

        {/* Receita Total - Roxo */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <Wallet className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">AOA</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatAOA(metrics.receitaTotal)}
          </div>
          <div className="text-xs text-white/70">Receita Total</div>
        </div>

        {/* Despesas - Vermelho */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <Receipt className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">AKZ</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatAKZ(metrics.despesas)}
          </div>
          <div className="text-xs text-white/70">Despesas</div>
        </div>

        {/* Folha Salarial - Vermelho Escuro */}
        <div className="bg-gradient-to-br from-red-700 to-red-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">AKZ</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatAKZ(metrics.folhaSalarial)}
          </div>
          <div className="text-xs text-white/70">Folha Salarial</div>
        </div>

        {/* Impostos - Azul Escuro */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-800 p-4 rounded-2xl col-span-2">
          <div className="flex items-center justify-between mb-2">
            <Calculator className="w-5 h-5 text-white/80" />
            <span className="text-xs text-white/80 uppercase">AKZ</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {formatAKZ(metrics.impostos)}
          </div>
          <div className="text-xs text-white/70">Impostos (6.5% sobre faturação)</div>
        </div>
      </div>

      {/* Botão de Reset - Apenas para desenvolvimento */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={handleResetProduction}
          disabled={isResetting}
          className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isResetting ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Resetando...
            </>
          ) : (
            'Reset de Dados de Produção'
          )}
        </button>
      </div>
    </div>
  );
};

export default OwnerMobile;
