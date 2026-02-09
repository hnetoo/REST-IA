
/**
 * Serviço de Base de Dados SQLite para Windows (via Tauri)
 * Fallback automático para LocalStorage em ambiente Web
 */
class SqliteService {
  private db: any = null;
  private isTauri = !!(window as any).__TAURI_INTERNALS__;
  private initPromise: Promise<boolean> | null = null;

  async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.isTauri) {
        console.log("Ambiente Web Detectado: Utilizando LocalStorage");
        return true;
      }

      try {
        const { default: Database } = await import("@tauri-apps/plugin-sql");
        this.db = await Database.load("sqlite:tasca_vereda_v3.db");
        
        await this.db.execute(`
          CREATE TABLE IF NOT EXISTS application_state (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        return true;
      } catch (e) {
        console.warn("Falha ao carregar plugin SQL Tauri, usando fallback LocalStorage:", e);
        this.isTauri = false;
        return true;
      }
    })();

    return this.initPromise;
  }

  async saveState(state: any): Promise<void> {
    if (state === undefined) return;
    
    try {
      const dataStr = JSON.stringify(state);
      
      if (this.isTauri && this.db) {
        await this.db.execute(
          "INSERT OR REPLACE INTO application_state (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
          ["current_state", dataStr]
        );
      } else {
        localStorage.setItem('tasca_vereda_storage_v6', dataStr);
      }
    } catch (e) {
      console.error("Erro ao persistir estado:", e);
    }
  }

  async loadState(): Promise<any> {
    try {
      if (this.isTauri) {
        // Garantir que o init terminou se estivermos em Tauri
        await this.init();
        if (this.db) {
          const result: any[] = await this.db.select(
            "SELECT data FROM application_state WHERE id = ? ORDER BY updated_at DESC LIMIT 1",
            ["current_state"]
          );
          if (result.length > 0) return JSON.parse(result[0].data);
        }
      }
      
      const data = localStorage.getItem('tasca_vereda_storage_v6');
      if (!data) return null;

      const parsed = JSON.parse(data);
      return (typeof parsed === 'object') ? parsed : null;
    } catch (e) {
      console.error("Erro ao carregar estado:", e);
      return null;
    }
  }
}

export const sqliteService = new SqliteService();
