import { supabase } from '../supabase_standalone';

// 🎯 ARQUITETURA OFFLINE-FIRST + SYNC
interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

class OfflineFirstSync {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Escutar eventos de conectividade
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Iniciar sync automático a cada 30 segundos
    this.startAutoSync();
  }

  // 🔄 INICIAR SYNC AUTOMÁTICO
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, 30000); // 30 segundos
  }

  // 📤 ADICIONAR À FILA DE SYNC
  addToSyncQueue(table: string, operation: 'insert' | 'update' | 'delete', data: any) {
    const queueItem: SyncQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      table,
      operation,
      data,
      timestamp: Date.now()
    };

    this.syncQueue.push(queueItem);
    console.log('[SYNC] 📤 Adicionado à fila:', queueItem);

    // Se online, processar imediatamente
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // 🔄 PROCESSAR FILA DE SYNC
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    console.log(`[SYNC] 🔄 Processando ${this.syncQueue.length} itens da fila...`);

    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToProcess) {
      try {
        await this.syncToSupabase(item);
        console.log('[SYNC] ✅ Sync bem-sucedido:', item.table, item.operation);
      } catch (error) {
        console.error('[SYNC] ❌ Erro no sync:', error);
        // Se falhar, voltar para a fila
        this.syncQueue.push(item);
      }
    }
  }

  // 📤 SYNC PARA SUPABASE
  private async syncToSupabase(item: SyncQueueItem) {
    switch (item.table) {
      case 'orders':
        return this.syncOrder(item);
      case 'expenses':
        return this.syncExpense(item);
      case 'staff':
        return this.syncStaff(item);
      default:
        console.warn('[SYNC] ⚠️ Tabela não reconhecida:', item.table);
    }
  }

  // 📦 SYNC DE PEDIDOS
  private async syncOrder(item: SyncQueueItem) {
    if (item.operation === 'insert' || item.operation === 'update') {
      const { data, error } = await supabase
        .from('orders')
        .upsert(item.data, { onConflict: 'id' })
        .select();
      
      if (error) throw error;
      return data;
    }
  }

  // 💸 SYNC DE DESPESAS
  private async syncExpense(item: SyncQueueItem) {
    if (item.operation === 'insert' || item.operation === 'update') {
      const { data, error } = await supabase
        .from('expenses')
        .upsert(item.data, { onConflict: 'id' })
        .select();
      
      if (error) throw error;
      return data;
    }
  }

  // 👥 SYNC DE STAFF
  private async syncStaff(item: SyncQueueItem) {
    if (item.operation === 'insert' || item.operation === 'update') {
      const { data, error } = await supabase
        .from('staff')
        .upsert(item.data, { onConflict: 'id' })
        .select();
      
      if (error) throw error;
      return data;
    }
  }

  // 📊 OBTER DADOS DO SQLITE (LOCAL)
  async getLocalData(table: string): Promise<any[]> {
    // Simulação - na implementação real, ler do SQLite local
    console.log(`[SYNC] 📊 Lendo dados locais da tabela ${table}...`);
    
    // Aqui seria a query real ao SQLite
    // const db = await openDatabase();
    // return await db.all(`SELECT * FROM ${table}`);
    
    return [];
  }

  // 📊 OBTER DADOS DO SUPABASE (REMOTE)
  async getRemoteData(table: string): Promise<any[]> {
    console.log(`[SYNC] 📊 Lendo dados remotos da tabela ${table}...`);
    
    const { data, error } = await supabase
      .from(table)
      .select('*');
    
    if (error) {
      console.error('[SYNC] ❌ Erro ao ler dados remotos:', error);
      return [];
    }
    
    return data || [];
  }

  // 🔄 FORÇAR SYNC MANUAL
  async forceSync() {
    console.log('[SYNC] 🔄 Forçando sync manual...');
    await this.processSyncQueue();
  }

  // 📊 STATUS DO SYNC
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      lastSync: localStorage.getItem('last_sync_time') || null
    };
  }

  // 💾 SALVAR STATUS
  saveSyncStatus() {
    localStorage.setItem('last_sync_time', new Date().toISOString());
  }
}

// 🎯 EXPORTAR INSTÂNCIA GLOBAL
export const offlineSync = new OfflineFirstSync();
