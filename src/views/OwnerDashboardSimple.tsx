import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, DollarSign, Users, TrendingUp, Wallet, Receipt, FileText, Calculator, RefreshCw, LogOut } from 'lucide-react';

const OwnerDashboardSimple = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);

  // Verificação SIMPLES - sem complexidade
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('owner_logged_in') === 'true';
    if (!isLoggedIn) {
      navigate('/owner/login');
      return;
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('owner_logged_in');
    navigate('/owner/login');
  };

  // Dados MOCK simples - sem Supabase, sem complexidade
  const metrics = {
    vendasHoje: 250000,
    mesasAtivas: 12,
    totalVendas: 1850000,
    receitaTotal: 1425000,
    despesas: 425000,
    folhaSalarial: 350000,
    impostos: 120250
  };

  const formatAOA = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header com Botão de Sair */}
      <div className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Owner Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-xs text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>

      <div className="p-6">
        {/* Filtros de Período */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['HOJE', 'SEMANA', 'MÊS', 'ANO'].map((period) => (
            <button
              key={period}
              className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider bg-[#fbbf24] text-black"
            >
              {period}
            </button>
          ))}
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {/* Vendas Hoje - Verde */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">AOA</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatAOA(metrics.vendasHoje)}
            </div>
            <div className="text-xs text-white/70">Vendas Hoje</div>
          </div>

          {/* Mesas Ativas - Azul */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">TOTAL</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics.mesasAtivas}
            </div>
            <div className="text-xs text-white/70">Mesas Ativas</div>
          </div>

          {/* Total Vendas - Laranja */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">AOA</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatAOA(metrics.totalVendas)}
            </div>
            <div className="text-xs text-white/70">Total Vendas</div>
          </div>

          {/* Receita Total - Roxo */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">AOA</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatAOA(metrics.receitaTotal)}
            </div>
            <div className="text-xs text-white/70">Receita Total</div>
          </div>

          {/* Despesas - Vermelho */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <Receipt className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">AKZ</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatAOA(metrics.despesas)}
            </div>
            <div className="text-xs text-white/70">Despesas</div>
          </div>

          {/* Folha Salarial - Vermelho Escuro */}
          <div className="bg-gradient-to-br from-red-700 to-red-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">AKZ</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatAOA(metrics.folhaSalarial)}
            </div>
            <div className="text-xs text-white/70">Folha Salarial</div>
          </div>

          {/* Impostos - Azul Escuro */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 p-6 rounded-2xl col-span-2">
            <div className="flex items-center justify-between mb-2">
              <Calculator className="w-6 h-6 text-white/80" />
              <span className="text-xs text-white/80 uppercase">AKZ</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatAOA(metrics.impostos)}
            </div>
            <div className="text-xs text-white/70">Impostos (6.5% sobre faturação)</div>
          </div>
        </div>
      </div>

      {/* Botão de Reset - Apenas para desenvolvimento */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => alert('Reset de dados - apenas desenvolvimento')}
          className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all"
        >
          Reset de Dados de Produção
        </button>
      </div>
    </div>
  );
};

export default OwnerDashboardSimple;
