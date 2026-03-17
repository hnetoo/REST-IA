import { useState } from 'react';
import { X, Database, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
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
      // Salvar no localStorage
      localStorage.setItem('SUPABASE_URL', supabaseUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey);
      
      // Tentar salvar no Tauri Store (se disponível)
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
          const { Store } = await import('@tauri-apps/plugin-store');
          const store = new Store('.settings.dat');
          await store.set('supabase_url', supabaseUrl);
          await store.set('supabase_key', supabaseKey);
        }
      } catch (storeError) {
        console.warn('Tauri Store não disponível, usando apenas localStorage:', storeError);
      }

      // Atualizar o cliente Supabase global
      (window as any).supabase = createClient(supabaseUrl, supabaseKey);

      onComplete();
    } catch (err: any) {
      setError('Erro ao salvar configuração: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Configuração Inicial
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
            <p className="text-gray-600">
              Configure a conexão com o Supabase para iniciar a aplicação
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supabase URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://seu-projeto.supabase.co"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supabase Anon Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
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
              {isLoading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            Tasca do Vereda POS v1.0.6 - Configuração de Base de Dados
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
