// 🎯 TIPOS PARA ELECTRON IPC

export interface ElectronAPI {
  // 📊 MÉTRICAS
  getMetrics(): Promise<{
    vendasHoje: number;
    vendasTotais: number;
    despesasHoje: number;
    despesasTotais: number;
    folhaSalarial: number;
    impostos: number;
    lucroLiquido: number;
    margem: number;
    historicoExterno: number;
    rendimentoGlobal: number;
  }>;

  // 📦 ORDERS
  getOrders(status?: string): Promise<any[]>;
  insertOrder(orderData: any): Promise<any>;

  // 💸 EXPENSES
  getExpenses(): Promise<any[]>;
  insertExpense(expenseData: any): Promise<any>;

  // 👥 STAFF
  getStaff(): Promise<any[]>;
  updateStaff(staffData: any): Promise<any>;

  // 📚 EXTERNAL HISTORY
  getExternalHistory(): Promise<any[]>;

  // 💾 OUTRAS OPERAÇÕES
  syncWithSupabase(): Promise<void>;
  exportData(): Promise<any>;
}

// 🎯 EXTENDER WINDOW PARA INCLUIR ELECTRON
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    electron?: ElectronAPI; // Alias para compatibilidade
  }
}

export {};
