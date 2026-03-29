
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
        // 🔑 REMOVIDO IMPORT PROBLEMÁTICO - Usar fallback
        console.log("SQLite não disponível no build, usando fallback");
        return false;
      } catch (error) {
        console.error("Erro ao inicializar SQLite:", error);
        return false;
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

  async deleteExpense(expenseId: string): Promise<void> {
    // 🔑 SIMPLIFICADO - Usar apenas localStorage para evitar problemas de build
    try {
      const data = localStorage.getItem('tasca_vereda_storage_v6');
      if (data) {
        const state = JSON.parse(data);
        state.expenses = state.expenses?.filter((e: any) => e.id !== expenseId) || [];
        localStorage.setItem('tasca_vereda_storage_v6', JSON.stringify(state));
        console.log('[SQLITE] Despesa apagada do localStorage com sucesso:', expenseId);
      }
    } catch (error) {
      console.error('[SQLITE] Erro ao apagar despesa:', error);
      throw error;
    }
  }
}

export const sqliteService = new SqliteService();
