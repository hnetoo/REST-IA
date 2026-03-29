import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { fixUUIDService } from '../services/fixUUIDService';
import { AlertTriangle, Trash2, CheckCircle, RefreshCw, Database, Wrench } from 'lucide-react';

/**
 * FIX UUID COMPONENT - Correção CRÍTICA de IDs
 * 
 * Interface para corrigir IDs incorretos e garantir UUIDs reais
 */
const FixUUIDComponent = () => {
  const { addNotification } = useStore();
  const [isFixing, setIsFixing] = useState(false);
  const [fixStatus, setFixStatus] = useState<'idle' | 'checking' | 'fixing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [invalidIDs, setInvalidIDs] = useState<any>({ products: [], categories: [] });
  const [validationResults, setValidationResults] = useState<any>({ products: { valid: 0, invalid: [] }, categories: { valid: 0, invalid: [] } });

  useEffect(() => {
    checkInvalidIDs();
  }, []);

  const checkInvalidIDs = async () => {
    setFixStatus('checking');
    setStatusMessage('Verificando IDs inválidos...');
    
    try {
      const invalid = await fixUUIDService.checkInvalidIDs();
      setInvalidIDs(invalid);
      
      const productValidation = await fixUUIDService.validateAllProducts();
      const categoryValidation = await fixUUIDService.validateAllCategories();
      
      setValidationResults({
        products: productValidation,
        categories: categoryValidation
      });
      
      const totalInvalid = invalid.products.length + invalid.categories.length + 
                          productValidation.invalid.length + categoryValidation.invalid.length;
      
      if (totalInvalid > 0) {
        setStatusMessage(`CRÍTICO: ${totalInvalid} IDs inválidos encontrados`);
        setFixStatus('error');
        addNotification('error', `Encontrados ${totalInvalid} IDs inválidos. Correção necessária.`);
      } else {
        setStatusMessage('Todos os IDs são válidos');
        setFixStatus('success');
        addNotification('success', 'Todos os IDs são válidos');
      }
    } catch (error) {
      console.error('[FixUUID] Erro ao verificar IDs:', error);
      setFixStatus('error');
      setStatusMessage('Erro ao verificar IDs');
      addNotification('error', 'Erro ao verificar IDs');
    }
  };

  const performCompleteFix = async () => {
    if (!confirm('⚠️ CORREÇÃO CRÍTICA: Isso irá apagar produtos/categorias com IDs inválidos e validar todos os UUIDs. Deseja continuar?')) {
      return;
    }

    setIsFixing(true);
    setFixStatus('fixing');
    setStatusMessage('Executando correção completa...');
    
    try {
      const success = await fixUUIDService.performCompleteFix();
      
      if (success) {
        setFixStatus('success');
        setStatusMessage('Correção concluída com sucesso!');
        addNotification('success', 'Correção concluída com sucesso!');
        
        // Recarregar dados
        await checkInvalidIDs();
      } else {
        setFixStatus('error');
        setStatusMessage('Falha na correção');
        addNotification('error', 'Falha na correção');
      }
    } catch (error) {
      console.error('[FixUUID] Erro na correção:', error);
      setFixStatus('error');
      setStatusMessage('Erro na correção');
      addNotification('error', 'Erro na correção');
    } finally {
      setIsFixing(false);
    }
  };

  const cleanupInvalidIDs = async () => {
    if (!confirm('⚠️ LIMPEZA: Isso irá apagar permanentemente produtos/categorias com IDs "1", "cat_1", etc. Deseja continuar?')) {
      return;
    }

    setIsFixing(true);
    setFixStatus('fixing');
    setStatusMessage('Limpando IDs inválidos...');
    
    try {
      await fixUUIDService.cleanupInvalidIDs();
      
      setFixStatus('success');
      setStatusMessage('Limpeza concluída!');
      addNotification('success', 'Limpeza de IDs inválidos concluída!');
      
      // Recarregar dados
      await checkInvalidIDs();
    } catch (error) {
      console.error('[FixUUID] Erro na limpeza:', error);
      setFixStatus('error');
      setStatusMessage('Erro na limpeza');
      addNotification('error', 'Erro na limpeza');
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusColor = () => {
    switch (fixStatus) {
      case 'checking': return 'text-blue-600';
      case 'fixing': return 'text-orange-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (fixStatus) {
      case 'checking': return <RefreshCw className="w-6 h-6 animate-spin" />;
      case 'fixing': return <RefreshCw className="w-6 h-6 animate-spin" />;
      case 'success': return <CheckCircle className="w-6 h-6" />;
      case 'error': return <AlertTriangle className="w-6 h-6" />;
      default: return <Database className="w-6 h-6" />;
    }
  };

  const totalInvalid = invalidIDs.products.length + invalidIDs.categories.length + 
                      validationResults.products.invalid.length + validationResults.categories.invalid.length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header Crítico */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-10 h-10 text-red-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-red-800">CORREÇÃO CRÍTICA DE UUIDs</h1>
              <p className="text-red-600 text-lg">Fix para IDs "1" e UUIDs inválidos</p>
              <p className="text-red-500 text-sm mt-1">O usuário não aceita mais IDs com comprimento 1</p>
            </div>
          </div>
          <div className={`flex items-center ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-3 font-bold text-lg">{statusMessage}</span>
          </div>
        </div>
      </div>

      {/* Status dos Problemas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">IDs "1"</h3>
              <p className={`text-sm ${invalidIDs.products.length + invalidIDs.categories.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {invalidIDs.products.length + invalidIDs.categories.length} encontrados
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${invalidIDs.products.length + invalidIDs.categories.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">UUIDs Inválidos</h3>
              <p className={`text-sm ${validationResults.products.invalid.length + validationResults.categories.invalid.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {validationResults.products.invalid.length + validationResults.categories.invalid.length} encontrados
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${validationResults.products.invalid.length + validationResults.categories.invalid.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">UUIDs Válidos</h3>
              <p className="text-sm text-green-600">
                {validationResults.products.valid + validationResults.categories.valid} encontrados
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Status Total</h3>
              <p className={`text-sm ${totalInvalid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalInvalid > 0 ? 'PROBLEMAS' : 'OK'}
              </p>
            </div>
            {totalInvalid > 0 ? (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {/* Ações Críticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Wrench className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-red-800">Correção Completa</h3>
              <p className="text-red-600 text-sm">Limpar + Validar tudo</p>
            </div>
          </div>
          <button
            onClick={performCompleteFix}
            disabled={isFixing}
            className="w-full flex items-center justify-center px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <Wrench className="w-6 h-6 mr-2" />
            {isFixing ? 'CORRIGINDO...' : 'CORREÇÃO COMPLETA'}
          </button>
        </div>

        <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-orange-800">Limpar IDs "1"</h3>
              <p className="text-orange-600 text-sm">Apagar produtos/categorias com ID "1"</p>
            </div>
          </div>
          <button
            onClick={cleanupInvalidIDs}
            disabled={isFixing}
            className="w-full flex items-center justify-center px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <Trash2 className="w-6 h-6 mr-2" />
            {isFixing ? 'LIMPANDO...' : 'LIMPAR IDS "1"'}
          </button>
        </div>

        <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <RefreshCw className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-xl font-bold text-blue-800">Verificar</h3>
              <p className="text-blue-600 text-sm">Verificar status atual</p>
            </div>
          </div>
          <button
            onClick={checkInvalidIDs}
            disabled={isFixing}
            className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg"
          >
            <RefreshCw className="w-6 h-6 mr-2" />
            VERIFICAR
          </button>
        </div>
      </div>

      {/* Detalhes dos Problemas */}
      {(totalInvalid > 0) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-red-800 mb-4">🚨 PROBLEMAS DETECTADOS</h2>
          
          {/* IDs "1" */}
          {(invalidIDs.products.length > 0 || invalidIDs.categories.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-700 mb-2">IDs "1" Encontrados:</h3>
              {invalidIDs.products.length > 0 && (
                <div className="mb-3">
                  <p className="text-red-600 font-medium">Produtos ({invalidIDs.products.length}):</p>
                  <ul className="list-disc list-inside text-red-600 ml-4">
                    {invalidIDs.products.map((product: any) => (
                      <li key={product.id}>{product.name} (ID: {product.id})</li>
                    ))}
                  </ul>
                </div>
              )}
              {invalidIDs.categories.length > 0 && (
                <div className="mb-3">
                  <p className="text-red-600 font-medium">Categorias ({invalidIDs.categories.length}):</p>
                  <ul className="list-disc list-inside text-red-600 ml-4">
                    {invalidIDs.categories.map((category: any) => (
                      <li key={category.id}>{category.name} (ID: {category.id})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* UUIDs Inválidos */}
          {(validationResults.products.invalid.length > 0 || validationResults.categories.invalid.length > 0) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-700 mb-2">UUIDs Inválidos:</h3>
              {validationResults.products.invalid.length > 0 && (
                <div className="mb-3">
                  <p className="text-red-600 font-medium">Produtos ({validationResults.products.invalid.length}):</p>
                  <ul className="list-disc list-inside text-red-600 ml-4">
                    {validationResults.products.invalid.map((product: any) => (
                      <li key={product.id}>{product.name} (ID: {product.id}, comprimento: {product.id?.length})</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResults.categories.invalid.length > 0 && (
                <div className="mb-3">
                  <p className="text-red-600 font-medium">Categorias ({validationResults.categories.invalid.length}):</p>
                  <ul className="list-disc list-inside text-red-600 ml-4">
                    {validationResults.categories.invalid.map((category: any) => (
                      <li key={category.id}>{category.name} (ID: {category.id}, comprimento: {category.id?.length})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-red-700 font-bold">
            ⚠️ O usuário não aceita mais IDs com comprimento diferente de 36 caracteres!
          </p>
        </div>
      )}

      {/* Informações da Correção */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Database className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">🔧 CORREÇÕES IMPLEMENTADAS</h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-700 mb-1">PARE DE FORÇAR IDS:</h4>
                <p className="text-blue-600 text-sm">
                  Removido QUALQUER código que defina id: 1 ou id: "1". O insert() não envia mais o campo id.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">DEIXE O BANCO GERAR:</h4>
                <p className="text-blue-600 text-sm">
                  No comando .insert(), NÃO é enviado o campo id. O Supabase gera o UUID automaticamente.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">CAPTURAR O UUID:</h4>
                <p className="text-blue-600 text-sm">
                  Após o .insert(), o ID retornado pelo Supabase é validado (36 caracteres) antes de usar.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">NOME DAS COLUNAS:</h4>
                <p className="text-blue-600 text-sm">
                  Verificado se está enviando category_id e não categoryId.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-blue-700 mb-1">LIMPEZA REAL:</h4>
                <p className="text-blue-600 text-sm">
                  Se criou produtos/categorias com ID "1", eles são apagados AGORA do Supabase via código.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixUUIDComponent;
