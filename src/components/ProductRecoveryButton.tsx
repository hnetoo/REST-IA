import { useState } from 'react';
import { useStore } from '../store/useStore';
import { productRecoveryService } from '../services/productRecoveryService';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface RecoveryReport {
  analysis?: any;
  recovery?: any;
  message?: string;
  error?: string;
}

export const ProductRecoveryButton: React.FC = () => {
  const { categories, menu, updateCategory, updateDish, addNotification } = useStore();
  const [isRecovering, setIsRecovering] = useState(false);
  const [report, setReport] = useState<RecoveryReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleRecovery = async () => {
    setIsRecovering(true);
    setReport(null);

    try {
      console.log('[RECOVERY] Iniciando recuperação de produtos...');
      
      const currentState = { categories, menu };
      const result = await productRecoveryService.executeFullRecovery(currentState);

      if (result.success && result.recoveredState) {
        // Aplicar as categorias recuperadas
        const recoveredCategories = result.recoveredState.categories;
        const recoveredProducts = result.recoveredState.menu;

        // Atualizar categorias existentes e adicionar novas
        recoveredCategories.forEach((category: any) => {
          const existingCategory = categories.find(c => c.id === category.id);
          if (existingCategory) {
            updateCategory(category);
          } else {
            // Adicionar nova categoria (se necessário)
            console.log('[RECOVERY] Nova categoria encontrada:', category.name);
          }
        });

        // Atualizar produtos
        recoveredProducts.forEach((product: any) => {
          const existingProduct = menu.find(p => p.id === product.id);
          if (existingProduct) {
            updateDish(product);
          } else {
            // Adicionar novo produto (se necessário)
            console.log('[RECOVERY] Novo produto encontrado:', product.name);
          }
        });

        setReport(result.report);
        addNotification('success', result.report.message || 'Recuperação concluída com sucesso');
        
        // Forçar reload da página para garantir que as mudanças sejam aplicadas
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } else {
        setReport(result.report);
        addNotification('error', result.report?.error || 'Falha na recuperação de produtos');
      }

    } catch (error: any) {
      console.error('[RECOVERY] Erro durante recuperação:', error);
      setReport({ 
        error: error.message,
        message: 'Erro crítico durante recuperação'
      });
      addNotification('error', 'Erro crítico durante recuperação de produtos');
    } finally {
      setIsRecovering(false);
    }
  };

  const checkCurrentState = () => {
    const analysis = productRecoveryService.analyzeDataCorruption(categories, menu);
    setReport({ analysis, message: 'Análise concluída' });
    setShowDetails(true);
  };

  return (
    <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-700">Recuperação de Produtos</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkCurrentState}
            disabled={isRecovering}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Verificar Estado
          </button>
          <button
            onClick={handleRecovery}
            disabled={isRecovering}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Recuperando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Recuperar Produtos
              </>
            )}
          </button>
        </div>
      </div>

      {report && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
          <div className="flex items-center gap-2 mb-2">
            {report.error ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="font-medium">{report.message}</span>
          </div>

          {report.analysis && (
            <div className="mt-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:underline"
              >
                {showDetails ? 'Ocultar' : 'Mostrar'} detalhes da análise
              </button>
              
              {showDetails && (
                <div className="mt-2 p-2 bg-white border rounded">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>Status:</strong> {report.analysis.isCorrupted ? 'Corrompido' : 'OK'}
                    </div>
                    <div>
                      <strong>Produtos Corrompidos:</strong> {report.analysis.corruptedProducts?.length || 0}
                    </div>
                    <div>
                      <strong>Categorias Ausentes:</strong> {report.analysis.missingCategories?.length || 0}
                    </div>
                    <div>
                      <strong>Total de Issues:</strong> {report.analysis.issues?.length || 0}
                    </div>
                  </div>
                  
                  {report.analysis.issues && report.analysis.issues.length > 0 && (
                    <div className="mt-2">
                      <strong>Problemas encontrados:</strong>
                      <ul className="mt-1 space-y-1">
                        {report.analysis.issues.map((issue: string, index: number) => (
                          <li key={index} className="text-red-600">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {report.recovery && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <strong>Recuperação executada:</strong>
              <div className="mt-1 text-xs grid grid-cols-3 gap-2">
                <div>Categorias: {report.recovery.categoriesRestored}</div>
                <div>Produtos: {report.recovery.productsRestored}</div>
                <div>Imagens: {report.recovery.imagesRestored}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600">
        <strong>AVISO:</strong> Esta ferramenta corrige produtos que foram movidos incorretamente para "Bebidas" 
        e restaura as URLs das imagens que desapareceram. Use apenas se os produtos estiverem corrompidos.
      </div>
    </div>
  );
};
