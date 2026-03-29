// 🌐 IMPORTAÇÕES CONDICIONAIS - EVITAR ERROS NO BUILD WEB
let Database: any, join: any, app: any;

if (typeof window === 'undefined' && typeof require !== 'undefined') {
  // Ambiente Node.js/Electron
  try {
    // Importar better-sqlite3 apenas no Electron
    Database = require('better-sqlite3').default;
    
    const path = require('path');
    join = path.join;
    
    // Tentar importar app apenas se estiver no Electron
    try {
      const electron = require('electron');
      app = electron.app;
    } catch (e) {
      // Não está no Electron
      console.log('[LOCAL_DB] Não está no ambiente Electron');
    }
  } catch (e) {
    console.log('[LOCAL_DB] Módulos Node.js não disponíveis');
  }
}

// 🗄️ BANCO DE DADOS LOCAL SQLITE PARA OFFLINE-FIRST
let db: any = null;

// Inicializar banco de dados local
export const initializeLocalDatabase = () => {
  try {
    // Verificar se estamos no ambiente Electron com Database disponível
    if (!Database) {
      console.log('[LOCAL_DB] Database não disponível - ambiente web detectado');
      return false;
    }
    
    // Caminho para o banco de dados na pasta de dados do usuário
    const dbPath = app ? join(app.getPath('userData'), 'rest-ia.db') : './rest-ia.db';
    
    db = new Database(dbPath);
    
    // Habilitar chaves estrangeiras
    db.pragma('foreign_keys = ON');
    
    // Criar tabelas se não existirem
    createTables();
    
    console.log('[LOCAL_DB] Banco de dados inicializado:', dbPath);
    return true;
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao inicializar banco:', error);
    return false;
  }
};

// Criar tabelas locais
const createTables = () => {
  if (!db) return;

  // Tabela de vendas locais
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      total_amount REAL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    )
  `);

  // Tabela de despesas locais
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_expenses (
      id TEXT PRIMARY KEY,
      description TEXT,
      amount REAL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    )
  `);

  // Tabela de cash_flow local
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_cash_flow (
      id TEXT PRIMARY KEY,
      amount REAL,
      type TEXT DEFAULT 'saida',
      category TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    )
  `);

  // Tabela de staff local
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_staff (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      base_salary_kz REAL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    )
  `);

  // Índices para performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_local_orders_synced ON local_orders(synced);
    CREATE INDEX IF NOT EXISTS idx_local_expenses_synced ON local_expenses(synced);
    CREATE INDEX IF NOT EXISTS idx_local_cash_flow_synced ON local_cash_flow(synced);
    CREATE INDEX IF NOT EXISTS idx_local_staff_synced ON local_staff(synced);
  `);
};

// 📊 FUNÇÕES DE LEITURA LOCAL (OFFLINE-FIRST)

// Obter vendas locais
export const getLocalOrders = () => {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM local_orders ORDER BY created_at DESC');
    return stmt.all() as any[];
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao buscar vendas locais:', error);
    return [];
  }
};

// Obter despesas locais
export const getLocalExpenses = () => {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM local_expenses ORDER BY created_at DESC');
    return stmt.all() as any[];
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao buscar despesas locais:', error);
    return [];
  }
};

// Obter cash_flow local
export const getLocalCashFlow = () => {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM local_cash_flow ORDER BY created_at DESC');
    return stmt.all() as any[];
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao buscar cash_flow local:', error);
    return [];
  }
};

// Obter staff local
export const getLocalStaff = () => {
  if (!db) return [];
  
  try {
    const stmt = db.prepare('SELECT * FROM local_staff ORDER BY created_at DESC');
    return stmt.all() as any[];
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao buscar staff local:', error);
    return [];
  }
};

// 💾 FUNÇÕES DE GRAVAÇÃO LOCAL

// Inserir venda local
export const insertLocalOrder = (order: any) => {
  if (!db) return false;
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO local_orders 
      (id, customer_name, customer_phone, total_amount, status, created_at, updated_at, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    
    stmt.run(
      order.id,
      order.customer_name || '',
      order.customer_phone || '',
      order.total_amount || 0,
      order.status || 'pending',
      order.created_at || new Date().toISOString(),
      new Date().toISOString()
    );
    
    console.log('[LOCAL_DB] Venda inserida localmente:', order.id);
    return true;
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao inserir venda local:', error);
    return false;
  }
};

// Inserir despesa local
export const insertLocalExpense = (expense: any) => {
  if (!db) return false;
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO local_expenses 
      (id, description, amount, category, created_at, updated_at, synced)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    
    stmt.run(
      expense.id,
      expense.description || '',
      expense.amount || 0,
      expense.category || 'Outras',
      expense.created_at || new Date().toISOString(),
      new Date().toISOString()
    );
    
    console.log('[LOCAL_DB] Despesa inserida localmente:', expense.id);
    return true;
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao inserir despesa local:', error);
    return false;
  }
};

// Inserir cash_flow local
export const insertLocalCashFlow = (cashFlow: any) => {
  if (!db) return false;
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO local_cash_flow 
      (id, amount, type, category, description, created_at, updated_at, synced)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    
    stmt.run(
      cashFlow.id,
      cashFlow.amount || 0,
      cashFlow.type || 'saida',
      cashFlow.category || 'Outras',
      cashFlow.description || '',
      cashFlow.created_at || new Date().toISOString(),
      new Date().toISOString()
    );
    
    console.log('[LOCAL_DB] Cash flow inserido localmente:', cashFlow.id);
    return true;
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao inserir cash_flow local:', error);
    return false;
  }
};

// 🔄 FUNÇÕES DE SINCRONIZAÇÃO

// Marcar como sincronizado
export const markAsSynced = (table: string, id: string) => {
  if (!db) return false;
  
  try {
    const stmt = db.prepare(`UPDATE ${table} SET synced = 1 WHERE id = ?`);
    stmt.run(id);
    return true;
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao marcar como sincronizado:', error);
    return false;
  }
};

// Obter dados não sincronizados
export const getUnsyncedData = () => {
  if (!db) return { orders: [], expenses: [], cashFlow: [], staff: [] };
  
  try {
    const orders = db.prepare('SELECT * FROM local_orders WHERE synced = 0').all() as any[];
    const expenses = db.prepare('SELECT * FROM local_expenses WHERE synced = 0').all() as any[];
    const cashFlow = db.prepare('SELECT * FROM local_cash_flow WHERE synced = 0').all() as any[];
    const staff = db.prepare('SELECT * FROM local_staff WHERE synced = 0').all() as any[];
    
    return { orders, expenses, cashFlow, staff };
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao buscar dados não sincronizados:', error);
    return { orders: [], expenses: [], cashFlow: [], staff: [] };
  }
};

// 🧹 FUNÇÕES DE MANUTENÇÃO

// Fechar banco de dados
export const closeLocalDatabase = () => {
  if (db) {
    db.close();
    db = null;
    console.log('[LOCAL_DB] Banco de dados fechado');
  }
};

// Limpar dados antigos (opcional)
export const cleanupOldData = (daysToKeep: number = 30) => {
  if (!db) return;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const stmt = db.prepare('DELETE FROM local_orders WHERE created_at < ? AND synced = 1');
    stmt.run(cutoffDate.toISOString());
    
    console.log('[LOCAL_DB] Dados antigos limpos');
  } catch (error) {
    console.error('[LOCAL_DB] Erro ao limpar dados antigos:', error);
  }
};

// Verificar status online/offline
export const isOnline = (): boolean => {
  // Verificar se estamos no ambiente Electron
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return navigator.onLine;
  }
  
  // Para ambiente web, verificar conectividade
  return navigator.onLine;
};

export default {
  initializeLocalDatabase,
  getLocalOrders,
  getLocalExpenses,
  getLocalCashFlow,
  getLocalStaff,
  insertLocalOrder,
  insertLocalExpense,
  insertLocalCashFlow,
  markAsSynced,
  getUnsyncedData,
  closeLocalDatabase,
  cleanupOldData,
  isOnline
};
