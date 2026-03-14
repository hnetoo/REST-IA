import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { hardResetService } from '../services/hardResetService';
import { AlertTriangle, RefreshCw, Database, Trash2, CheckCircle } from 'lucide-react';

/**
 * HARD RESET COMPONENT - Interface para Reset Completo do Sistema
 * 
 * Este componente oferece uma interface visual para executar o hard reset
 * quando o Supabase está vazio ou há dados órfãos localmente.
 */
const HardResetComponent = () => {
  const { addNotification } = useStore();
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'checking' | 'resetting' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setResetStatus('checking');
    setStatusMessage('Verificando status do sistema...');
    
    try {
      const needsReset = await hardResetService.performHardResetIfNecessary();
      const consistency = await hardResetService.checkConsistency();
      
      setSystemStatus({
        needsReset,
        isConsistent: consistency.isConsistent,
        issues: consistency.issues
      });
      
      setResetStatus('idle');
      
      if (needsReset) {
        setStatusMessage('Sistema detectou necessidade de reset. Supabase está vazio.');
        addNotification('warning', 'Sistema precisa de reset. Supabase está vazio.');
      } else if (!consistency.isConsistent) {
        setStatusMessage('Dados inconsistentes detectados. Recomendado sincronização de emergência.');
        addNotification('warning', 'Dados inconsistentes detectados.');
      } else {
        setStatusMessage('Sistema OK. Dados consistentes.');
      }
    } catch (error) {
      console.error('[HardReset] Erro ao verificar status:', error);
      setResetStatus('error');
      setStatusMessage('Erro ao verificar status do sistema');
      addNotification('error', 'Erro ao verificar status do sistema');
    }
  };

  const performHardReset = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados locais e resetar o sistema completamente. Deseja continuar?')) {
      return;
    }

    setIsResetting(true);
    setResetStatus('resetting');
    setStatusMessage('Executando hard reset completo...');
    
    try {
      await hardResetService.executeHardReset();
      setResetStatus('success');
      setStatusMessage('Hard reset concluído com sucesso! Recarregando...');
      addNotification('success', 'Sistema resetado com sucesso!');
    } catch (error) {
      console.error('[HardReset] Erro no hard reset:', error);
      setResetStatus('error');
      setStatusMessage('Erro ao executar hard reset');
      addNotification('error', 'Erro ao executar hard reset');
    } finally {
      setIsResetting(false);
    }
  };

  const performEmergencySync = async () => {
    setIsResetting(true);
    setResetStatus('resetting');
    setStatusMessage('Executando sincronização de emergência...');
    
    try {
      await hardResetService.emergencySync();
      setResetStatus('success');
      setStatusMessage('Sincronização de emergência concluída!');
      addNotification('success', 'Sincronização de emergência concluída!');
      
      // Recarregar para refletir mudanças
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('[HardReset] Erro na sincronização:', error);
      setResetStatus('error');
      setStatusMessage('Erro na sincronização de emergência');
      addNotification('error', 'Erro na sincronização de emergência');
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusColor = () => {
    switch (resetStatus) {
      case 'checking': return 'text-blue-600';
      case 'resetting': return 'text-orange-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (resetStatus) {
      case 'checking': return <RefreshCw className="w-5 h-5 animate-spin" />;
      case 'resetting': return <RefreshCw className="w-5 h-5 animate-spin" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  if (!systemStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Verificando sistema...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hard Reset do Sistema</h1>
              <p className="text-gray-600">Gerenciamento de reset completo e sincronização</p>
            </div>
          </div>
          <div className={`flex items-center ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-2 font-medium">{statusMessage}</span>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Status do Supabase</h3>
              <p className={`text-sm ${systemStatus.needsReset ? 'text-red-600' : 'text-green-600'}`}>
                {systemStatus.needsReset ? 'Vazio - Precisa de Reset' : 'OK - Dados Presentes'}
              </p>
            </div>
            <Database className={`w-8 h-8 ${systemStatus.needsReset ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Consistência</h3>
              <p className={`text-sm ${systemStatus.isConsistent ? 'text-green-600' : 'text-orange-600'}`}>
                {systemStatus.isConsistent ? 'Dados Consistentes' : 'Dados Inconsistentes'}
              </p>
            </div>
            <CheckCircle className={`w-8 h-8 ${systemStatus.isConsistent ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Issues Detectados</h3>
              <p className="text-sm text-gray-600">
                {systemStatus.issues.length > 0 ? `${systemStatus.issues.length} issues` : 'Nenhum issue'}
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${systemStatus.issues.length > 0 ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Ações Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={performHardReset}
            disabled={isResetting || !systemStatus.needsReset}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            {isResetting ? 'Resetando...' : 'Hard Reset Completo'}
          </button>

          <button
            onClick={performEmergencySync}
            disabled={isResetting || systemStatus.isConsistent}
            className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            {isResetting ? 'Sincronizando...' : 'Sincronização de Emergência'}
          </button>

          <button
            onClick={checkSystemStatus}
            disabled={isResetting}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Database className="w-5 h-5 mr-2" />
            Verificar Status
          </button>

          <button
            onClick={() => window.location.reload()}
            disabled={isResetting}
            className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Recarregar Página
          </button>
        </div>
      </div>

      {/* Details Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Detalhes do Sistema</h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
          </button>
        </div>

        {showDetails && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Issues Detectados:</h3>
              {systemStatus.issues.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {systemStatus.issues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-600">Nenhum issue detectado.</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Informações do Sistema:</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-600 overflow-x-auto">
                  {JSON.stringify(systemStatus, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Aviso Importante</h3>
            <p className="text-yellow-700 mb-2">
              O Hard Reset é uma operação <strong>irreversível</strong> que irá:
            </p>
            <ul className="list-disc list-inside text-yellow-700 space-y-1">
              <li>Apagar TODOS os dados locais (localStorage, IndexedDB)</li>
              <li>Limpar o store Zustand completamente</li>
              <li>Criar categorias base com UUIDs reais no Supabase</li>
              <li>Recarregar a página para limpar o estado</li>
            </ul>
            <p className="text-yellow-700 mt-2">
              Use esta opção apenas quando o Supabase estiver vazio ou houver dados corrompidos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HardResetComponent;
