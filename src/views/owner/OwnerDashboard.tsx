import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { TrendingUp, DollarSign, Users, Receipt, LogOut, RefreshCw, Settings } from 'lucide-react';

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('ownerSession');
    if (!session) {
      navigate('/owner/login');
      return;
    }
    setIsLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ownerSession');
    navigate('/owner/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

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
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-white/90">Caixa: Equilibrado</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6">
          <h2 className="text-2xl font-black text-white mb-4">Dashboard em Manutenção</h2>
          <p className="text-white/80">
            O dashboard está sendo atualizado para garantir a sincronização perfeita entre todas as plataformas.
            Por favor, tente novamente em alguns minutos.
          </p>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
