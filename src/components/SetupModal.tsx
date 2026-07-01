import { useState } from 'react';
import { X, Database, Check, AlertCircle, Key, Globe, Copy, ExternalLink, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { schemaSQL } from '../lib/autoSchema';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (supabaseUrl: string, supabaseKey: string) => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySQL = () => {
    navigator.clipboard.writeText(schemaSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openSupabaseEditor = () => {
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    window.open(`https://supabase.com/dashboard/project/${projectRef}/sql/new`, '_blank');
  };

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

      // Avançar para passo 2 (instruções de BD)
      setStep(2);
      setIsLoading(false);
      return;
      
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configuração do Supabase</h2>
              <p className="text-xs text-gray-400">Passo {step} de 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" title="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── PASSO 1: Credenciais ── */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="text-center mb-4">
              <p className="text-gray-600 mb-2">Configure a conexão com o Supabase para iniciar o sistema</p>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <Key className="w-4 h-4" />
                <span>Credenciais guardadas localmente</span>
              </div>
            </div>

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
                <p className="text-xs text-gray-500 mt-1">Ex: https://abcd1234.supabase.co</p>
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
              </div>
            </div>

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

            <div className="flex gap-3 pt-2">
              <button
                onClick={testConnection}
                disabled={isTesting || !supabaseUrl || !supabaseKey}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTesting ? 'A testar...' : 'Testar Conexão'}
              </button>
              <button
                onClick={saveConfiguration}
                disabled={isLoading || !success || !supabaseUrl || !supabaseKey}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? 'A guardar...' : (<>Seguinte <ChevronRight className="w-4 h-4" /></>)}
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Onde encontrar estas informações?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Acesse <span className="font-mono">supabase.com</span></li>
                <li>2. Selecione o seu projecto</li>
                <li>3. Vá em Settings → API</li>
                <li>4. Copie a URL e a Anon Key</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── PASSO 2: Criar tabelas ── */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Credenciais guardadas!</p>
                <p className="text-xs text-green-700 mt-1 font-mono break-all">{supabaseUrl}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Criar tabelas na base de dados</h3>
              <p className="text-sm text-gray-600">
                É necessário correr o SQL abaixo no <strong>SQL Editor</strong> do Supabase para criar todas as tabelas do sistema.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={openSupabaseEditor}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir SQL Editor do Supabase
                </button>
                <button
                  onClick={copySQL}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar SQL'}
                </button>
              </div>

              <div className="p-3 bg-gray-900 rounded-lg max-h-36 overflow-y-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                  {schemaSQL.slice(0, 400)}...
                </pre>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-2 text-sm">Passos:</h4>
              <ol className="text-sm text-amber-800 space-y-1">
                <li>1. Clique <strong>"Abrir SQL Editor"</strong> acima</li>
                <li>2. Clique <strong>"Copiar SQL"</strong> e cole no editor</li>
                <li>3. Clique <strong>"Run"</strong> no Supabase</li>
                <li>4. Volte aqui e clique <strong>"Concluir"</strong></li>
              </ol>
            </div>

            <button
              onClick={() => onComplete(supabaseUrl, supabaseKey)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" /> Concluir — Iniciar Sistema
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl flex items-center justify-between">
          <p className="text-xs text-gray-500">POS v1.1.8</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
