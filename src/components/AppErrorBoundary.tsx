import { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY] Erro capturado:', error, errorInfo);
    
    // Se for erro de 'g', mostrar botão de reset
    if (error.message.includes('Cannot access \'g\' before initialization')) {
      console.warn('[ERROR BOUNDARY] Erro de inicialização detectado - oferecendo reset');
    }
  }

  handleResetCache = () => {
    console.log('[ERROR BOUNDARY] Fazendo reset do cache...');
    
    // Limpar cache do Supabase
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-tboiuiwlqfzcvakxrsmj-auth-token');
      localStorage.removeItem('tasca_vered_id');
    }
    
    // Recarregar página
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isInitializationError = this.state.error?.message.includes('Cannot access \'g\' before initialization');
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Erro de Inicialização</h1>
              <p className="text-slate-400 mb-6">
                {isInitializationError 
                  ? 'O sistema encontrou um erro de inicialização. Isso pode ser causado por cache corrompido.'
                  : 'Ocorreu um erro inesperado na aplicação.'}
              </p>
            </div>
            
            <div className="space-y-4">
              {isInitializationError && (
                <button
                  onClick={this.handleResetCache}
                  className="w-full bg-primary text-black px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw size={20} />
                  Reset de Cache
                </button>
              )}
            </div>
            
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-slate-400 hover:text-white transition-colors mb-2">
                Detalhes Técnicos
              </summary>
              <pre className="bg-slate-800 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-40">
                <strong>Erro:</strong> {this.state.error?.message}
                <br />
                <strong>Stack:</strong>
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
