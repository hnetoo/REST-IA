import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { offlineFirstService } from '../services/offlineFirstService';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react';

/**
 * OFFLINE-FIRST STATUS COMPONENT - Status do Sistema Offline-First
 * 
 * Interface visual para mostrar status da conexão, sincronização e conflitos
 */
const OfflineFirstStatus = () => {
  const { addNotification } = useStore();
  const [status, setStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Iniciar monitoramento
    offlineFirstService.startBackgroundSync();
    
    // Atualizar status inicial
    updateStatus();
    
    // Atualizar status periodicamente
    const interval = setInterval(updateStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async () => {
    try {
      const currentStatus = offlineFirstService.getOfflineStatus();
      const canReachSupabase = await offlineFirstService.canReachSupabase();
      
      setStatus({
        ...currentStatus,
        canReachSupabase
      });
    } catch (error) {
      console.error('[OfflineFirstStatus] Erro ao atualizar status:', error);
    }
  };

  const forceSyncNow = async () => {
    setIsSyncing(true);
    
    try {
      const success = await offlineFirstService.forceSyncNow();
      
      if (success) {
        addNotification('success', 'Sincronização forçada concluída com sucesso!');
        setLastSync(new Date());
      } else {
        addNotification('error', 'Erro na sincronização forçada');
      }
    } catch (error) {
      console.error('[OfflineFirstStatus] Erro na sincronização:', error);
      addNotification('error', 'Erro na sincronização');
    } finally {
      setIsSyncing(false);
      updateStatus();
    }
  };

  const getStatusColor = () => {
    if (!status) return 'text-gray-600';
    
    if (!status.isOnline) return 'text-red-600';
    if (!status.canReachSupabase) return 'text-orange-600';
    if (status.pendingSyncs > 0) return 'text-yellow-600';
    if (status.conflicts > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!status) return <Database className="w-5 h-5" />;
    
    if (!status.isOnline) return <WifiOff className="w-5 h-5" />;
    if (!status.canReachSupabase) return <CloudOff className="w-5 h-5" />;
    if (status.pendingSyncs > 0) return <Clock className="w-5 h-5" />;
    if (status.conflicts > 0) return <AlertTriangle className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  const getStatusText = () => {
    if (!status) return 'Verificando...';
    
    if (!status.isOnline) return 'Offline - Sem conexão';
    if (!status.canReachSupabase) return 'Online - Supabase inacessível';
    if (status.pendingSyncs > 0) return `Sincronizando ${status.pendingSyncs} itens...`;
    if (status.conflicts > 0) return `${status.conflicts} conflitos detectados`;
    return 'Online - Sincronizado';
  };

  const getStore = useStore.getState();
  const pendingCategories = getStore.categories.filter(c => c._syncStatus === 'pending').length;
  const pendingProducts = getStore.menu.filter(p => p._syncStatus === 'pending').length;
  const conflictedCategories = getStore.categories.filter(c => c._conflictResolved === false).length;
  const conflictedProducts = getStore.menu.filter(p => p._conflictResolved === false).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header Principal */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Status Offline-First</h1>
              <p className="text-gray-600">Sistema Offline-First da Tasca do Vereda</p>
            </div>
          </div>
          <div className={`flex items-center ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-2 font-medium">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Conexão */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Conexão</h3>
              <p className={`text-sm ${status?.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {status?.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
            {status?.isOnline ? (
              <Wifi className="w-8 h-8 text-green-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        {/* Supabase */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Supabase</h3>
              <p className={`text-sm ${status?.canReachSupabase ? 'text-green-600' : 'text-orange-600'}`}>
                {status?.canReachSupabase ? 'Acessível' : 'Inacessível'}
              </p>
            </div>
            {status?.canReachSupabase ? (
              <Cloud className="w-8 h-8 text-green-600" />
            ) : (
              <CloudOff className="w-8 h-8 text-orange-600" />
            )}
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Pendentes</h3>
              <p className={`text-sm ${status?.pendingSyncs > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {status?.pendingSyncs || 0} itens
              </p>
            </div>
            <Clock className={`w-8 h-8 ${status?.pendingSyncs > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
          </div>
        </div>

        {/* Conflitos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Conflitos</h3>
              <p className={`text-sm ${status?.conflicts > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {status?.conflicts || 0} itens
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${status?.conflicts > 0 ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ações</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={forceSyncNow}
            disabled={isSyncing || !status?.isOnline || !status?.canReachSupabase}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização'}
          </button>

          <button
            onClick={updateStatus}
            className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Atualizar Status
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Database className="w-5 h-5 mr-2" />
            {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
          </button>
        </div>

        {lastSync && (
          <p className="text-sm text-gray-600 mt-4">
            Última sincronização: {lastSync.toLocaleString()}
          </p>
        )}
      </div>

      {/* Detalhes */}
      {showDetails && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Detalhes do Sistema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categorias */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Categorias</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{getStore.categories.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pendentes:</span>
                  <span className="font-medium text-yellow-600">{pendingCategories}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Conflitos:</span>
                  <span className="font-medium text-orange-600">{conflictedCategories}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sincronizadas:</span>
                  <span className="font-medium text-green-600">
                    {getStore.categories.length - pendingCategories - conflictedCategories}
                  </span>
                </div>
              </div>
            </div>

            {/* Produtos */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Produtos</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{getStore.menu.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pendentes:</span>
                  <span className="font-medium text-yellow-600">{pendingProducts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Conflitos:</span>
                  <span className="font-medium text-orange-600">{conflictedProducts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sincronizados:</span>
                  <span className="font-medium text-green-600">
                    {getStore.menu.length - pendingProducts - conflictedProducts}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itens Pendentes */}
          {(pendingCategories > 0 || pendingProducts > 0) && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-lg font-medium text-yellow-800 mb-2">Itens Pendentes de Sincronização</h4>
              <div className="space-y-2">
                {pendingCategories > 0 && (
                  <p className="text-yellow-700">
                    {pendingCategories} categorias aguardando sincronização
                  </p>
                )}
                {pendingProducts > 0 && (
                  <p className="text-yellow-700">
                    {pendingProducts} produtos aguardando sincronização
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Conflitos */}
          {(conflictedCategories > 0 || conflictedProducts > 0) && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-lg font-medium text-orange-800 mb-2">Conflitos Detectados</h4>
              <div className="space-y-2">
                <p className="text-orange-700">
                  ⚠️ Conflitos detectados. A versão do Supabase (Livro Central) prevalecerá.
                </p>
                {conflictedCategories > 0 && (
                  <p className="text-orange-700">
                    {conflictedCategories} categorias em conflito
                  </p>
                )}
                {conflictedProducts > 0 && (
                  <p className="text-orange-700">
                    {conflictedProducts} produtos em conflito
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status Completo */}
          <div className="mt-6">
            <h4 className="text-lg font-medium text-gray-700 mb-2">Status Completo</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-600 overflow-x-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Informações Offline-First */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Database className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">🎯 Sistema Offline-First</h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-700 mb-1">UUID SEMPRE:</h4>
                <p className="text-blue-600 text-sm">
                  Mesmo offline, produtos e categorias usam crypto.randomUUID() para garantir IDs no formato Supabase.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">SINCRONIZAÇÃO DE FUNDO:</h4>
                <p className="text-blue-600 text-sm">
                  Sistema detecta automaticamente quando a internet volta e empurra mudanças locais sem bloquear a interface.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">RESOLUÇÃO DE CONFLITOS:</h4>
                <p className="text-blue-600 text-sm">
                  Se um item for editado offline e já existir no Supabase, a versão do Supabase (Livro Central) prevalece.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">FUNCIONAMENTO:</h4>
                <ul className="list-disc list-inside text-blue-600 text-sm space-y-1">
                  <li>App funciona perfeitamente offline</li>
                  <li>Dados são salvos localmente imediatamente</li>
                  <li>Sincronização automática quando a internet voltar</li>
                  <li>Conflitos resolvidos automaticamente</li>
                  <li>Interface nunca é bloqueada pela sincronização</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineFirstStatus;
