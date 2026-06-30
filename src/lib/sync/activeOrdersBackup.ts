/**
 * 🔒 SISTEMA DE BACKUP PARA ORDENS ATIVAS - INDEXEDDB
 *
 * SOLUÇÃO DEFINITIVA: IndexedDB tem quota de GBs (até 50% do disco)
 * vs localStorage que tem apenas 5-10MB.
 *
 * Protege contra perda de dados das mesas ocupadas.
 * Cria backup automático em intervalos e permite restauração.
 */

const DB_NAME = 'tasca_vereda_backup_db';
const DB_VERSION = 1;
const STORE_NAME = 'active_orders_backup';
const BACKUP_INTERVAL = 30000; // 30 segundos

// 🔥 Gerenciar conexão IndexedDB
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// 🔐 Gerar hash simples para verificação de integridade
function generateHash(orders: any[]): string {
  const str = JSON.stringify(orders.map(o => o.id).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// 💾 Salvar backup das ordens ativas no IndexedDB
export async function saveActiveOrdersBackup(orders: any[]): Promise<void> {
  try {
    if (!orders || orders.length === 0) return;

    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const backup = {
      id: 'latest',
      timestamp: new Date().toISOString(),
      orders: orders,
      hash: generateHash(orders)
    };

    const request = store.put(backup);

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log('[ACTIVE_ORDERS_BACKUP] 💾 Backup salvo no IndexedDB:', {
      orders: orders.length,
      hash: backup.hash
    });
  } catch (error: any) {
    console.error('[ACTIVE_ORDERS_BACKUP] ❌ Erro ao salvar backup:', {
      error: error?.message || error?.name || String(error),
      stack: error?.stack,
      dbName: DB_NAME,
      storeName: STORE_NAME
    });
  }
}

// 🔄 Carregar backup mais recente do IndexedDB
export async function loadActiveOrdersBackup(): Promise<any[] | null> {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('latest');

    const result = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!result) return null;

    // Verificar integridade
    const currentHash = generateHash(result.orders);
    if (currentHash !== result.hash) {
      console.warn('[ACTIVE_ORDERS_BACKUP] ⚠️ Hash não corresponde - backup corrompido');
      return null;
    }

    console.log('[ACTIVE_ORDERS_BACKUP] ✅ Backup carregado do IndexedDB:', {
      orders: result.orders.length,
      timestamp: result.timestamp,
      hash: result.hash
    });

    return result.orders;
  } catch (error) {
    console.error('[ACTIVE_ORDERS_BACKUP] ❌ Erro ao carregar backup:', error);
    return null;
  }
}

// 🛡️ Verificar se ordens foram perdidas e restaurar se necessário
export async function checkAndRestoreActiveOrders(currentOrders: any[]): Promise<any[]> {
  // Se temos ordens atuais, tudo OK
  if (currentOrders && currentOrders.length > 0) {
    // Salvar backup anyway
    await saveActiveOrdersBackup(currentOrders);
    return currentOrders;
  }

  // Se não temos ordens, tentar restaurar do backup
  console.warn('[ACTIVE_ORDERS_BACKUP] 🚨 Ordens ativas vazias - tentando restaurar...');
  const backup = await loadActiveOrdersBackup();

  if (backup && backup.length > 0) {
    console.log('[ACTIVE_ORDERS_BACKUP] ✅ Restauração concluída:', backup.length, 'ordens');
    return backup;
  }

  console.log('[ACTIVE_ORDERS_BACKUP] ℹ️ Nenhum backup disponível');
  return currentOrders;
}

// 🧹 Limpar backups antigos
export async function clearActiveOrdersBackup(): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete('latest');
    console.log('[ACTIVE_ORDERS_BACKUP] 🗑️ Backups limpos');
  } catch (error) {
    console.error('[ACTIVE_ORDERS_BACKUP] ❌ Erro ao limpar backup:', error);
  }
}

// ⏱️ Iniciar backup automático
let backupIntervalId: NodeJS.Timeout | null = null;

export function startAutoBackup(getOrdersFn: () => any[]): void {
  stopAutoBackup(); // Limpar intervalo anterior se existir

  backupIntervalId = setInterval(() => {
    const orders = getOrdersFn();
    saveActiveOrdersBackup(orders);
  }, BACKUP_INTERVAL);

  console.log('[ACTIVE_ORDERS_BACKUP] ⏱️ Auto-backup iniciado (30s) - IndexedDB');
}

export function stopAutoBackup(): void {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
  }
}
