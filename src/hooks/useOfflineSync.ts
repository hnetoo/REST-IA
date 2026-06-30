import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciamento de conectividade e sync offline
 * @returns {Object} Status de conexão e funções de sync
 */
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Atualiza status de conexão
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOfflineSync] 🌐 Conexão restaurada');
      setIsOnline(true);
      // Tenta sincronizar quando volta online
      requestBackgroundSync();
    };

    const handleOffline = () => {
      console.log('[useOfflineSync] 📴 Conexão perdida');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Registrar sync em background
  const requestBackgroundSync = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.ready) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar se Background Sync é suportado
      if ('sync' in registration) {
        // Registrar sync para pedidos
        await (registration as any).sync.register('sync-orders');
        
        // Registrar sync para despesas
        await (registration as any).sync.register('sync-expenses');
        
        console.log('[useOfflineSync] 🔄 Background sync registrado');
      }
    } catch (error) {
      console.error('[useOfflineSync] ❌ Erro ao registrar sync:', error);
    }
  }, []);

  // Adicionar item à fila de sync
  const addToSyncQueue = useCallback((type: string, data: any) => {
    // Armazenar no localStorage para sync posterior
    const queueKey = `sync-queue-${type}`;
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
    queue.push({
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    });
    localStorage.setItem(queueKey, JSON.stringify(queue));
    setPendingSyncCount(prev => prev + 1);
    
    // Se estiver online, tenta sync imediato
    if (isOnline) {
      requestBackgroundSync();
    }
  }, [isOnline, requestBackgroundSync]);

  // Processar fila de sync
  const processSyncQueue = useCallback(async (type: string, syncFunction: (data: any) => Promise<void>) => {
    const queueKey = `sync-queue-${type}`;
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
    
    if (queue.length === 0) return;

    setIsSyncing(true);
    const failed = [];

    for (const item of queue) {
      try {
        await syncFunction(item.data);
        console.log(`[useOfflineSync] ✅ Sync ${type} bem-sucedido:`, item.id);
      } catch (error) {
        console.error(`[useOfflineSync] ❌ Sync ${type} falhou:`, item.id, error);
        item.attempts++;
        if (item.attempts < 3) {
          failed.push(item); // Mantém na fila para retry
        }
      }
    }

    // Atualiza fila (remove bem-sucedidos, mantém falhados)
    localStorage.setItem(queueKey, JSON.stringify(failed));
    setPendingSyncCount(failed.length);
    setIsSyncing(false);
  }, []);

  // Limpar cache do Service Worker
  const clearCache = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage('clearCache');
      console.log('[useOfflineSync] 🧹 Cache limpo');
    } catch (error) {
      console.error('[useOfflineSync] ❌ Erro ao limpar cache:', error);
    }
  }, []);

  // Forçar update do Service Worker
  const updateServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      console.log('[useOfflineSync] 🔄 Service Worker atualizado');
    } catch (error) {
      console.error('[useOfflineSync] ❌ Erro ao atualizar SW:', error);
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingSyncCount,
    addToSyncQueue,
    processSyncQueue,
    requestBackgroundSync,
    clearCache,
    updateServiceWorker
  };
};

export default useOfflineSync;
