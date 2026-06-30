import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useOrderStore } from '../store/slices/useOrderStore';
import { useUserStore } from '../store/slices/useUserStore';
import { useFinanceStore } from '../store/slices/useFinanceStore';
import { useMenuStore } from '../store/slices/useMenuStore';
import { useSettingsStore } from '../store/slices/useSettingsStore';
import { validateSupabaseConfig, performStartupSync } from '../store/useStore.utils';
import { loadAndMergeActiveOrders } from '../store/useStore';
import { Loader2 } from 'lucide-react';

interface ServicesContextType {
  isReady: boolean;
  error: string | null;
  retry: () => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

interface ServicesProviderProps {
  children: ReactNode;
}

export const ServicesProvider: React.FC<ServicesProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar todos os stores
  const orderStore = useOrderStore();
  const userStore = useUserStore();
  const financeStore = useFinanceStore();
  const menuStore = useMenuStore();
  const settingsStore = useSettingsStore();

  const initializeServices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[ServicesProvider] 🚀 Inicializando serviços...');

      // Validar configuração Supabase
      const configValid = validateSupabaseConfig();
      if (!configValid) {
        console.warn('[ServicesProvider] ⚠️ Configuração Supabase inválida, continuando offline');
      }

      // Executar startup sync
      console.log('[ServicesProvider] 🔄 Executando startup sync...');
      const syncSuccess = await performStartupSync();

      if (syncSuccess) {
        console.log('[ServicesProvider] ✅ Startup sync concluído');
      } else {
        console.log('[ServicesProvider] ⚠️ Startup sync falhou, app continua localmente');
      }

      // 🔥 Carregar ordens ativas do Supabase (persistência contra falhas de energia)
      console.log('[ServicesProvider] 🔄 Carregando ordens ativas do Supabase...');
      console.log('[ServicesProvider] 🔍 Antes de chamar loadAndMergeActiveOrders');
      try {
        await loadAndMergeActiveOrders();
        console.log('[ServicesProvider] ✅ loadAndMergeActiveOrders concluído');
      } catch (err) {
        console.error('[ServicesProvider] ❌ Erro em loadAndMergeActiveOrders:', err);
      }

      // Verificar se todos os stores estão carregados
      console.log('[ServicesProvider] ✅ Todos os stores inicializados');

      setIsReady(true);
      setIsLoading(false);
    } catch (err) {
      console.error('[ServicesProvider] ❌ Erro na inicialização:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeServices();
  }, []);

  const retry = () => {
    initializeServices();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Inicializando Tasca Vereda...</h2>
          <p className="text-gray-400">Carregando dados e sincronizando...</p>
        </div>
      </div>
    );
  }

  if (error && !isReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-gray-800 rounded-lg">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Erro de Inicialização</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <ServicesContext.Provider value={{ isReady, error, retry }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};

// Hook seguro para verificar se serviços estão prontos antes de operações
export const useServicesSafe = () => {
  const { isReady } = useServices();

  const safeOperation = async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    if (!isReady) {
      console.warn('[useServicesSafe] ⚠️ Serviços não prontos, operação abortada');
      return null;
    }
    try {
      return await operation();
    } catch (error) {
      console.error('[useServicesSafe] ❌ Erro na operação:', error);
      return null;
    }
  };

  return { isReady, safeOperation };
};
