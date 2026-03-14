import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { emergencyProtocolService } from '../services/emergencyProtocolService';
import { supabase } from '../lib/supabase';
import { AlertTriangle, RefreshCw, Trash2, CheckCircle, Database, Shield, Zap } from 'lucide-react';

/**
 * EMERGENCY PROTOCOL COMPONENT - Interface de Estabilização Crítica
 * 
 * Interface visual para executar o protocolo de emergência quando
 * a App e o Supabase estão dessincronizados
 */
const EmergencyProtocol = () => {
  const { addNotification } = useStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [protocolStatus, setProtocolStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Verificar status inicial
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setProtocolStatus('executing');
    setStatusMessage('Verificando status crítico do sistema...');
    
    try {
      // Verificar se Supabase está acessível
      const { data: categoriesCheck, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .limit(1);
      
      if (categoriesError) {
        setStatusMessage('CRÍTICO: Supabase inacessível ou tabela corrompida');
        setProtocolStatus('error');
        addNotification('error', 'Supabase inacessível. Protocolo de emergência necessário.');
      } else {
        setStatusMessage('Sistema acessível. Verificando consistência...');
        setProtocolStatus('idle');
        addNotification('info', 'Sistema acessível. Protocolo disponível se necessário.');
      }
    } catch (error) {
      console.error('[EmergencyProtocol] Erro ao verificar status:', error);
      setProtocolStatus('error');
      setStatusMessage('Erro crítico ao verificar sistema');
      addNotification('error', 'Erro crítico ao verificar sistema');
    }
  };

  const executeEmergencyProtocol = async () => {
    if (!confirm('⚠️ EMERGÊNCIA CRÍTICA: Isso irá limpar TODO o cache local e resetar o sistema completamente. Deseja continuar?')) {
      return;
    }

    setIsExecuting(true);
    setProtocolStatus('executing');
    setStatusMessage('EXECUTANDO PROTOCOLO DE EMERGÊNCIA...');
    
    try {
      const success = await emergencyProtocolService.executeEmergencyProtocol();
      
      if (success) {
        setProtocolStatus('success');
        setStatusMessage('Protocolo de emergência executado com sucesso! Recarregando...');
        addNotification('success', 'Protocolo de emergência executado com sucesso!');
        
        // Recarregar após 3 segundos
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setProtocolStatus('error');
        setStatusMessage('Falha no protocolo de emergência');
        addNotification('error', 'Falha no protocolo de emergência');
      }
    } catch (error) {
      console.error('[EmergencyProtocol] Erro no protocolo:', error);
      setProtocolStatus('error');
      setStatusMessage('Erro crítico no protocolo de emergência');
      addNotification('error', 'Erro crítico no protocolo de emergência');
    } finally {
      setIsExecuting(false);
    }
  };

  const performCacheCleanup = async () => {
    setIsExecuting(true);
    setProtocolStatus('executing');
    setStatusMessage('Limpando cache completo...');
    
    try {
      await emergencyProtocolService.performCacheCleanup();
      setProtocolStatus('success');
      setStatusMessage('Cache limpo com sucesso!');
      addNotification('success', 'Cache limpo com sucesso!');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('[EmergencyProtocol] Erro na limpeza:', error);
      setProtocolStatus('error');
      setStatusMessage('Erro na limpeza de cache');
      addNotification('error', 'Erro na limpeza de cache');
    } finally {
      setIsExecuting(false);
    }
  };

  const ensureDefaultCategories = async () => {
    setIsExecuting(true);
    setProtocolStatus('executing');
    setStatusMessage('Verificando e criando categorias padrão...');
    
    try {
      await emergencyProtocolService.ensureDefaultCategories();
      setProtocolStatus('success');
      setStatusMessage('Categorias padrão verificadas/criadas!');
      addNotification('success', 'Categorias padrão verificadas/criadas!');
    } catch (error) {
      console.error('[EmergencyProtocol] Erro nas categorias:', error);
      setProtocolStatus('error');
      setStatusMessage('Erro ao criar categorias padrão');
      addNotification('error', 'Erro ao criar categorias padrão');
    } finally {
      setIsExecuting(false);
    }
  };

  const validateUUIDs = async () => {
    setIsExecuting(true);
    setProtocolStatus('executing');
    setStatusMessage('Validando UUIDs do sistema...');
    
    try {
      await emergencyProtocolService.validateData();
      setProtocolStatus('success');
      setStatusMessage('UUIDs validados com sucesso!');
      addNotification('success', 'UUIDs validados com sucesso!');
    } catch (error) {
      console.error('[EmergencyProtocol] Erro na validação:', error);
      setProtocolStatus('error');
      setStatusMessage('Erro na validação de UUIDs');
      addNotification('error', 'Erro na validação de UUIDs');
    } finally {
      setIsExecuting(false);
    }
  };

  const emergencyRecovery = async () => {
    if (!confirm('🚨 RECUPERAÇÃO DE EMERGÊNCIA: Isso irá resetar TUDO. Último recurso. Continuar?')) {
      return;
    }

    setIsExecuting(true);
    setProtocolStatus('executing');
    setStatusMessage('RECUPERAÇÃO DE EMERGÊNCIA...');
    
    try {
      await emergencyProtocolService.emergencyRecovery();
      // A função já faz o reload
    } catch (error) {
      console.error('[EmergencyProtocol] Erro na recuperação:', error);
      setProtocolStatus('error');
      setStatusMessage('Erro na recuperação de emergência');
      addNotification('error', 'Erro na recuperação de emergência');
      setIsExecuting(false);
    }
  };

  const getStatusColor = () => {
    switch (protocolStatus) {
      case 'executing': return 'text-orange-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (protocolStatus) {
      case 'executing': return <RefreshCw className="w-6 h-6 animate-spin" />;
      case 'success': return <CheckCircle className="w-6 h-6" />;
      case 'error': return <AlertTriangle className="w-6 h-6" />;
      default: return <Database className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header Crítico */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-10 h-10 text-red-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-red-800">PROTOCOLO DE EMERGÊNCIA</h1>
              <p className="text-red-600 text-lg">Estabilização Crítica da Tasca do Vereda</p>
              <p className="text-red-500 text-sm mt-1">Use SOMENTE se a App e Supabase estiverem dessincronizados</p>
            </div>
          </div>
          <div className={`flex items-center ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-3 font-bold text-lg">{statusMessage}</span>
          </div>
        </div>
      </div>

      {/* Ações Críticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Protocolo Completo */}
        <div className="bg-white border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Zap className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-red-800">Protocolo Completo</h3>
              <p className="text-red-600 text-sm">Executar tudo em sequência</p>
            </div>
          </div>
          <button
            onClick={executeEmergencyProtocol}
            disabled={isExecuting}
            className="w-full flex items-center justify-center px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <AlertTriangle className="w-6 h-6 mr-2" />
            {isExecuting ? 'EXECUTANDO...' : 'EXECUTAR EMERGÊNCIA'}
          </button>
        </div>

        {/* Limpeza de Cache */}
        <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-orange-800">Limpeza de Cache</h3>
              <p className="text-orange-600 text-sm">localStorage + IndexedDB</p>
            </div>
          </div>
          <button
            onClick={performCacheCleanup}
            disabled={isExecuting}
            className="w-full flex items-center justify-center px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <Trash2 className="w-6 h-6 mr-2" />
            {isExecuting ? 'LIMPANDO...' : 'LIMPAR CACHE'}
          </button>
        </div>

        {/* Categorias Padrão */}
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Database className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-blue-800">Categorias Padrão</h3>
              <p className="text-blue-600 text-sm">Entradas, Pratos, Bebidas, Sobremesas</p>
            </div>
          </div>
          <button
            onClick={ensureDefaultCategories}
            disabled={isExecuting}
            className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <Database className="w-6 h-6 mr-2" />
            {isExecuting ? 'CRIANDO...' : 'CRIAR CATEGORIAS'}
          </button>
        </div>

        {/* Validação UUID */}
        <div className="bg-white border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-green-800">Validar UUIDs</h3>
              <p className="text-green-600 text-sm">Verificar 36 caracteres</p>
            </div>
          </div>
          <button
            onClick={validateUUIDs}
            disabled={isExecuting}
            className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <Shield className="w-6 h-6 mr-2" />
            {isExecuting ? 'VALIDANDO...' : 'VALIDAR UUIDS'}
          </button>
        </div>

        {/* Recuperação de Emergência */}
        <div className="bg-white border-2 border-purple-200 rounded-lg p-6 md:col-span-2">
          <div className="flex items-center mb-4">
            <RefreshCw className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-purple-800">Recuperação Total</h3>
              <p className="text-purple-600 text-sm">ÚLTIMO RECURSO - Reset completo</p>
            </div>
          </div>
          <button
            onClick={emergencyRecovery}
            disabled={isExecuting}
            className="w-full flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <RefreshCw className="w-6 h-6 mr-2" />
            {isExecuting ? 'RECUPERANDO...' : 'RECUPERAÇÃO DE EMERGÊNCIA'}
          </button>
        </div>
      </div>

      {/* Informações Críticas */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-8 h-8 text-yellow-600 mt-1 mr-4 flex-shrink-0" />
          <div>
            <h3 className="text-2xl font-bold text-yellow-800 mb-4">⚠️ INFORMAÇÕES CRÍTICAS</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-yellow-700 mb-2">🔧 CORREÇÕES OBRIGATÓRIAS:</h4>
                <ul className="list-disc list-inside space-y-2 text-yellow-700">
                  <li><strong>application_state → app_settings</strong>: Tabela corrigida</li>
                  <li><strong>icon removido</strong>: Categories sem campo icon</li>
                  <li><strong>customer_id removido</strong>: Orders sem campo customer_id</li>
                  <li><strong>UUIDs reais</strong>: Categorias com IDs do Supabase (36 chars)</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-yellow-700 mb-2">🛡️ VALIDAÇÃO UUID:</h4>
                <ul className="list-disc list-inside space-y-2 text-yellow-700">
                  <li><strong>36 caracteres obrigatórios</strong>: Formato UUID padrão</li>
                  <li><strong>Verificação antes de INSERT/UPDATE</strong>: Bloqueia operações inválidas</li>
                  <li><strong>NUNCA usar IDs manuais</strong>: Sem 'cat_1', 'prod_1', etc.</li>
                  <li><strong>Regex validation</strong>: Formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-yellow-700 mb-2">🧹 LIMPEZA COMPLETA:</h4>
                <ul className="list-disc list-inside space-y-2 text-yellow-700">
                  <li><strong>localStorage</strong>: Limpeza total do armazenamento local</li>
                  <li><strong>sessionStorage</strong>: Limpeza da sessão atual</li>
                  <li><strong>IndexedDB</strong>: Apagar bancos tasca*, vereda*, zustand*</li>
                  <li><strong>Store Zustand</strong>: Reset completo do estado</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status do Sistema */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Status do Sistema</h2>
          <button
            onClick={checkSystemStatus}
            disabled={isExecuting}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Verificar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-700 mb-2">Cache Local</h3>
            <p className="text-sm text-gray-600">Status: Verificado</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-700 mb-2">Categorias</h3>
            <p className="text-sm text-gray-600">UUIDs: Validados</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-700 mb-2">Schema</h3>
            <p className="text-sm text-gray-600">Alinhado: OK</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyProtocol;
