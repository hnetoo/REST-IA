/**
 * SYNC BLOCKER SERVICE - Bloqueio de sincronização automática
 * 
 * PROTEÇÃO: Impedir que a app continue corrompendo dados
 * OBJETIVO: Manter dados limpos vindos do Supabase
 */

export const syncBlockerService = {
  /**
   * Desativar auto-sync para evitar corrupção
   */
  disableAutoSync(): void {
    console.log('[SyncBlocker] 🚫 BLOQUEANDO AUTO-SYNC PARA PROTEGER DADOS...');
    
    try {
      // 1. Limpar timers de sync
      if (typeof window !== 'undefined') {
        // Limpar todos os timers que possam ser sync
        const maxTimerId = Number.MAX_SAFE_INTEGER;
        for (let i = 1; i < 10000; i++) {
          clearTimeout(i);
        }
      }
      
      // 2. Desativar eventos de sync
      if (typeof window !== 'undefined' && window.removeEventListener) {
        // Remover listeners de beforeunload que possam sync
        const anyHandler = (event: any) => {
          console.warn('[SyncBlocker] 🚫 TENTATIVA DE SYNC INTERCEPTADA:', event.type);
          event.preventDefault();
          event.stopPropagation();
          return false;
        };
        
        window.removeEventListener('beforeunload', anyHandler);
        window.removeEventListener('pagehide', anyHandler);
      }
      
      // 3. Sobrescrever métodos de sync globalmente
      if (typeof window !== 'undefined') {
        // Bloquear fetch para endpoints de sync
        const originalFetch = window.fetch;
        
        window.fetch = function(input: any, init?: any) {
          const url = typeof input === 'string' ? input : input.url;
          
          // Bloquear APENAS operações de escrita perigosas (EXCETO staff)
          if (url && (
            url.includes('/products') || 
            url.includes('/categories') ||
            (url.includes('supabase') && 
             (url.includes('upsert') || url.includes('insert') || url.includes('update')) &&
             !url.includes('/staff'))
          )) {
            console.warn('[SyncBlocker] 🚫 TENTATIVA DE ESCRITA BLOQUEADA:', url);
            return Promise.reject(new Error('Escrita automática bloqueada para proteger dados'));
          }
          
          // PERMITIR ESCRITA da tabela staff
          if (url && url.includes('/staff')) {
            console.log('[SyncBlocker] ✅ ESCRITA AUTORIZADA para staff:', url);
            return originalFetch.call(this, input, init);
          }
          
          // PERMITIR LEITURA da tabela staff e outras operações seguras
          if (url && (
            url.includes('/staff') ||
            url.includes('select') ||
            url.includes('GET')
          )) {
            console.log('[SyncBlocker] ✅ LEITURA AUTORIZADA:', url);
            return originalFetch.call(this, input, init);
          }
          
          // Permitir outros fetches
          return originalFetch.call(this, input, init);
        };
        
        console.log('[SyncBlocker] ✅ Fetch interceptado e sync bloqueado');
      }
      
      // 4. Sinalizar no localStorage que sync está bloqueado
      localStorage.setItem('tasca_sync_blocked', 'true');
      localStorage.setItem('tasca_sync_blocked_time', new Date().toISOString());
      
      console.log('[SyncBlocker] ✅ AUTO-SYNC BLOQUEADO COM SUCESSO');
    } catch (error) {
      console.error('[SyncBlocker] ❌ Erro ao bloquear auto-sync:', error);
    }
  },
  
  /**
   * Verificar se sync está bloqueado
   */
  isSyncBlocked(): boolean {
    try {
      return localStorage.getItem('tasca_sync_blocked') === 'true';
    } catch {
      return false;
    }
  },
  
  /**
   * Obter hora do bloqueio
   */
  getBlockTime(): string | null {
    try {
      return localStorage.getItem('tasca_sync_blocked_time');
    } catch {
      return null;
    }
  },
  
  /**
   * Reativar sync com cuidado
   */
  enableSync(): void {
    console.log('[SyncBlocker] ✅ REATIVANDO SYNC COM CUIDADO...');
    
    try {
      // Remover bloqueio
      localStorage.removeItem('tasca_sync_blocked');
      localStorage.removeItem('tasca_sync_blocked_time');
      
      // Restaurar fetch original (se possível)
      if (typeof window !== 'undefined' && (window as any).originalFetch) {
        window.fetch = (window as any).originalFetch;
      }
      
      console.log('[SyncBlocker] ✅ SYNC REATIVADO');
    } catch (error) {
      console.error('[SyncBlocker] ❌ Erro ao reativar sync:', error);
    }
  },
  
  /**
   * Handler genérico para capturar tentativas de sync
   */
  anySyncHandler: (event: any) => {
    console.warn('[SyncBlocker] 🚫 TENTATIVA DE SYNC INTERCEPTADA:', event.type);
    event.preventDefault();
    event.stopPropagation();
    return false;
  },
  
  /**
   * Status atual do bloqueio
   */
  getBlockStatus(): {
    isBlocked: boolean;
    blockTime: string | null;
    message: string;
  } {
    const isBlocked = this.isSyncBlocked();
    const blockTime = this.getBlockTime();
    
    let message = 'Sync ativo';
    if (isBlocked) {
      const timeDiff = blockTime ? Date.now() - new Date(blockTime).getTime() : 0;
      const minutes = Math.floor(timeDiff / (1000 * 60));
      
      if (minutes < 1) {
        message = 'Sync bloqueado agora';
      } else if (minutes < 60) {
        message = `Sync bloqueado há ${minutes} minutos`;
      } else {
        const hours = Math.floor(minutes / 60);
        message = `Sync bloqueado há ${hours} horas`;
      }
    }
    
    return {
      isBlocked,
      blockTime,
      message
    };
  }
};
