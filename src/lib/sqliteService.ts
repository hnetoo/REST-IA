
import initSqlJs from 'sql.js';

/**
 * Serviço de Base de Dados SQLite usando sql.js (WebAssembly)
 * 100% JavaScript - Sem módulos nativos
 * Compatível com Electron, Web e Mobile
 */
class SqliteService {
  private db: any = null;
  private SQL: any = null;
  private initPromise: Promise<boolean> | null = null;

  async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Inicializar sql.js (SQLite em WASM)
        this.SQL = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });

        // Tentar carregar banco existente do localStorage ou criar novo
        const savedDb = localStorage.getItem('rest_ia_sqlite_db');
        if (savedDb) {
          const data = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
          this.db = new this.SQL.Database(data);
          console.log('[SQLite] Banco carregado do localStorage');
        } else {
          this.db = new this.SQL.Database();
          console.log('[SQLite] Novo banco criado');
        }

        // Criar tabelas se não existirem
        this.createTables();

        console.log('[SQLite] sql.js inicializado com sucesso');
        return true;
      } catch (error) {
        console.error('[SQLite] Erro ao inicializar sql.js:', error);
        return false;
      }
    })();

    return this.initPromise;
  }

  private createTables(): void {
    if (!this.db) return;

    // Tabela de estado da aplicação
    this.db.run(`
      CREATE TABLE IF NOT EXISTS application_state (
        id TEXT PRIMARY KEY,
        data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de pedidos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        table_id TEXT,
        items TEXT,
        total REAL,
        status TEXT,
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de despesas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        description TEXT,
        amount REAL,
        category TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de fluxo de caixa
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cash_flow (
        id TEXT PRIMARY KEY,
        type TEXT,
        amount REAL,
        description TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de funcionários
    this.db.run(`
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        salary REAL,
        active INTEGER DEFAULT 1
      )
    `);

    this.persist();
  }

  private persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const base64 = btoa(String.fromCharCode(...data));
      localStorage.setItem('rest_ia_sqlite_db', base64);
    } catch (e) {
      console.error('[SQLite] Erro ao persistir:', e);
    }
  }

  async saveState(state: any): Promise<void> {
    if (state === undefined || !this.db) return;

    try {
      await this.init();
      const dataStr = JSON.stringify(state);

      this.db.run(
        `INSERT OR REPLACE INTO application_state (id, data, updated_at) VALUES (?, ?, datetime('now'))`,
        ['current_state', dataStr]
      );

      this.persist();
      console.log('[SQLite] Estado persistido');
    } catch (e) {
      console.error('[SQLite] Erro ao persistir estado:', e);
      // Fallback para localStorage
      localStorage.setItem('tasca_vereda_storage_v6', JSON.stringify(state));
    }
  }

  async loadState(): Promise<any> {
    try {
      await this.init();

      if (this.db) {
        const result = this.db.exec(
          `SELECT data FROM application_state WHERE id = 'current_state' ORDER BY updated_at DESC LIMIT 1`
        );

        if (result && result.length > 0 && result[0].values.length > 0) {
          const data = result[0].values[0][0];
          return JSON.parse(data as string);
        }
      }

      // Fallback para localStorage
      const data = localStorage.getItem('tasca_vereda_storage_v6');
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('[SQLite] Erro ao carregar estado:', e);
      // Fallback para localStorage
      const data = localStorage.getItem('tasca_vereda_storage_v6');
      if (!data) return null;
      return JSON.parse(data);
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      await this.init();

      if (this.db) {
        this.db.run(`DELETE FROM expenses WHERE id = ?`, [expenseId]);
        this.persist();
        console.log('[SQLite] Despesa apagada:', expenseId);
      }

      // Também remover do localStorage como backup
      const data = localStorage.getItem('tasca_vereda_storage_v6');
      if (data) {
        const state = JSON.parse(data);
        state.expenses = state.expenses?.filter((e: any) => e.id !== expenseId) || [];
        localStorage.setItem('tasca_vereda_storage_v6', JSON.stringify(state));
      }
    } catch (error) {
      console.error('[SQLite] Erro ao apagar despesa:', error);
      throw error;
    }
  }

  // Métodos utilitários para queries
  exec(sql: string, params?: any[]): any {
    if (!this.db) return null;
    try {
      return this.db.exec(sql, params);
    } catch (e) {
      console.error('[SQLite] Erro na query:', e);
      return null;
    }
  }

  run(sql: string, params?: any[]): void {
    if (!this.db) return;
    try {
      this.db.run(sql, params);
      this.persist();
    } catch (e) {
      console.error('[SQLite] Erro ao executar:', e);
    }
  }
}

export const sqliteService = new SqliteService();
