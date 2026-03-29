import React, { useState, useEffect } from 'react';

interface DebugInfo {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  details?: any;
}

export const DebugOverlay = () => {
  const [logs, setLogs] = useState<DebugInfo[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Adicionar logs ao estado
  const addLog = (level: DebugInfo['level'], message: string, details?: any) => {
    const newLog: DebugInfo = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    
    setLogs(prev => [...prev.slice(-19), newLog]); // Manter últimos 20 logs
    
    // 🪟 TAMBÉM ESCREVER NO CONSOLE DO INSPECTOR
    const consoleMessage = `[DEBUG_OVERLAY] ${level}: ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage, details);
        break;
      case 'WARN':
        console.warn(consoleMessage, details);
        break;
      case 'INFO':
        console.info(consoleMessage, details);
        break;
      default:
        console.log(consoleMessage, details);
    }
  };

  // Interceptar erros globais
  useEffect(() => {
    // Capturar erros de JavaScript
    const handleError = (event: ErrorEvent) => {
      addLog('ERROR', `JavaScript Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };

    // Capturar rejeições não tratadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('ERROR', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason,
        stack: event.reason?.stack
      });
    };

    // 🪟 VERIFICAR AMBIENTE TAURI
    const checkTauriEnvironment = () => {
      addLog('INFO', 'Verificando ambiente Tauri...', {
        hasTauri: typeof window !== 'undefined' && '__TAURI__' in window,
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // 🪟 VERIFICAR SE ESTÁ NO AMBIENTE WINDOWS
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        addLog('INFO', 'Ambiente Tauri detectado', {
          platform: window.__TAURI__?.os?.platform || 'unknown',
          arch: window.__TAURI__?.os?.arch || 'unknown'
        });
      }
    };

    // 🪟 VERIFICAR ESTADO DO STORE
    const checkStoreState = () => {
      try {
        // Import dinâmico para evitar erros de importação
        import('../store/useStore').then(({ useStore }) => {
          const store = useStore.getState();
          addLog('INFO', 'Estado do Store carregado', {
            hasCurrentUser: !!store.currentUser,
            hasMenu: !!store.menu,
            menuLength: store.menu?.length || 0,
            hasCategories: !!store.categories,
            categoriesLength: store.categories?.length || 0,
            hasActiveOrders: !!store.activeOrders,
            activeOrdersLength: store.activeOrders?.length || 0
          });
        }).catch(error => {
          addLog('ERROR', 'Erro ao carregar Store', error);
        });
      } catch (error) {
        addLog('ERROR', 'Erro crítico ao verificar Store', error);
      }
    };

    // 🪟 VERIFICAR SUPABASE
    const checkSupabaseConnection = () => {
      try {
        import('../lib/supabase').then(({ supabase }) => {
          addLog('INFO', 'Supabase carregado', {
            hasClient: !!supabase,
            url: supabase.supabaseUrl?.substring(0, 20) + '...'
          });
        }).catch(error => {
          addLog('ERROR', 'Erro ao carregar Supabase', error);
        });
      } catch (error) {
        addLog('ERROR', 'Erro crítico ao verificar Supabase', error);
      }
    };

    // Registrar listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Verificações iniciais
    setTimeout(() => {
      addLog('INFO', 'DebugOverlay montado - Iniciando verificações...');
      checkTauriEnvironment();
      checkStoreState();
      checkSupabaseConnection();
    }, 1000);

    // Atalho de teclado para mostrar/ocultar (Ctrl+Shift+D)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Se não estiver visível, não renderizar nada
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-white font-bold text-lg">Debug Overlay - Emergency Logs</h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Logs */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
          {logs.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              Nenhum log capturado ainda...
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  log.level === 'ERROR'
                    ? 'bg-red-900/20 border-red-500 text-red-300'
                    : log.level === 'WARN'
                    ? 'bg-yellow-900/20 border-yellow-500 text-yellow-300'
                    : log.level === 'INFO'
                    ? 'bg-blue-900/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800 border-slate-500 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs">
                    {log.timestamp}
                  </span>
                  <span className="text-xs font-bold uppercase">
                    {log.level}
                  </span>
                </div>
                <div className="font-mono text-sm mb-2">
                  {log.message}
                </div>
                {log.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer hover:text-white">
                      Ver detalhes
                    </summary>
                    <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800 px-4 py-3 border-t border-slate-700">
          <div className="text-slate-400 text-xs">
            <div>• Pressione Ctrl+Shift+D para mostrar/ocultar</div>
            <div>• Logs são enviados para o console do Inspector também</div>
            <div>• Ambiente: {typeof window !== 'undefined' && '__TAURI__' in window ? 'TAURI WINDOWS' : 'WEB'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 🪟 FUNÇÃO GLOBAL PARA ADICIONAR LOGS DE QUALQUER LUGAR
declare global {
  interface Window {
    __DEBUG_OVERLAY__?: {
      addLog: (level: DebugInfo['level'], message: string, details?: any) => void;
    };
  }
}

export const initDebugOverlay = () => {
  if (typeof window !== 'undefined') {
    window.__DEBUG_OVERLAY__ = {
      addLog: (level, message, details) => {
        // Enviar para o console também
        const consoleMessage = `[GLOBAL_DEBUG] ${level}: ${message}`;
        switch (level) {
          case 'ERROR':
            console.error(consoleMessage, details);
            break;
          case 'WARN':
            console.warn(consoleMessage, details);
            break;
          case 'INFO':
            console.info(consoleMessage, details);
            break;
          default:
            console.log(consoleMessage, details);
        }
      }
    };
  }
};
