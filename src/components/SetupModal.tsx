import { useState } from 'react';
import { X, Database, Check, AlertCircle, Key, Globe } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (supabaseUrl: string, supabaseKey: string) => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const testConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsTesting(true);
    setError('');
    setSuccess(false);

    try {
      // Criar cliente temporário para teste
      const testClient = createClient(supabaseUrl, supabaseKey);
      
      // Testar conexão com uma query simples
      const { error } = await testClient
        .from('products')
        .select('id')
        .limit(1);

      if (error) {
        setError('Erro ao conectar: ' + error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (err: any) {
      setError('Erro de conexão: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfiguration = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!success) {
      setError('Por favor, teste a conexão antes de salvar');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validar formato da URL
      if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
        throw new Error('URL do Supabase inválida. Use: https://seu-projeto.supabase.co');
      }

      // Validar formato da chave
      if (!supabaseKey.startsWith('eyJ') || supabaseKey.length < 100) {
        throw new Error('Chave do Supabase inválida. Verifique se está usando a chave anônima correta');
      }

      // Chamar função de complete com as credenciais
      await onComplete(supabaseUrl, supabaseKey);
      
    } catch (err: any) {
      setError('Erro ao salvar configuração: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Configuração do Banco de Dados
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center mb-4">
            <p className="text-gray-600 mb-2">
              Configure a conexão com o Supabase para iniciar o sistema
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <Key className="w-4 h-4" />
              <span>Suas credenciais são salvas localmente</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Supabase URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://seu-projeto.supabase.co"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: https://abcd1234.supabase.co
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                Supabase Anon Key
              </label>
              <textarea
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm h-24 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Chave anônima do projeto Supabase
              </p>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-700 text-sm">Conexão testada com sucesso!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={testConnection}
              disabled={isTesting || !supabaseUrl || !supabaseKey}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </button>

            <button
              onClick={saveConfiguration}
              disabled={isLoading || !success || !supabaseUrl || !supabaseKey}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Configurando...' : 'Configurar Sistema'}
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Onde encontrar estas informações?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. Acesse <span className="font-mono">supabase.com</span></li>
              <li>2. Selecione seu projeto</li>
              <li>3. Vá em Settings → API</li>
              <li>4. Copie a URL e a chave anônima</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Tasca do Vereda POS v1.0.6
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Database className="w-3 h-3" />
              <span>Setup Automático</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
