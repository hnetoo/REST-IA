import { offlineSync } from './offlineSync';

// 🎯 SERVIÇO DE DADOS LOCAIS (SQLite-First)
interface LocalOrder {
  id: string;
  table_id?: number;
  items: any[];
  status: 'ABERTO' | 'FECHADO' | 'CANCELADO' | 'PENDENTE_ENTREGA';
  type: 'LOCAL' | 'ENCOMENDA' | 'TAKEAWAY';
  timestamp: string;
  total: number;
  tax_total: number;
  profit: number;
  created_at: string;
  updated_at: string;
}

interface LocalExpense {
  id: string;
  description: string;
  amount_kz: number;
  category: string;
  status: string;
  created_at: string;
}

interface LocalStaff {
  id: string;
  full_name: string;
  role: string;
  base_salary_kz: number;
  subsidios: number;
  bonus: number;
  horas_extras: number;
  descontos: number;
  status: 'ATIVO' | 'INATIVO';
}

interface LocalExternalHistory {
  id: string;
  source_name: string;
  total_revenue: number;
  gross_profit: number;
  period: string;
  created_at: string;
}

class LocalDataService {
  private db: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeDatabase();
  }

  // 🗄️ INICIALIZAR DATABASE LOCAL
  async initializeDatabase() {
    if (this.isInitialized) return;

    try {
      // Simulação de inicialização do SQLite
      // Na implementação real: import openDatabase from 'sqlite3'
      console.log('[LOCAL DB] 🗄️ Inicializando SQLite local...');
      
      // Criar tabelas se não existirem
      await this.createTables();
      
      this.isInitialized = true;
      console.log('[LOCAL DB] ✅ Database local inicializado');
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao inicializar:', error);
    }
  }

  // 📋 CRIAR TABELAS
  private async createTables() {
    // Simulação - na implementação real, executar SQL
    console.log('[LOCAL DB] 📋 Criando tabelas locais...');
    
    /*
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        table_id INTEGER,
        items TEXT,
        status TEXT,
        type TEXT,
        timestamp TEXT,
        total REAL,
        tax_total REAL,
        profit REAL,
        created_at TEXT,
        updated_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        description TEXT,
        amount_kz REAL,
        category TEXT,
        status TEXT,
        created_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        full_name TEXT,
        role TEXT,
        base_salary_kz REAL,
        subsidios REAL,
        bonus REAL,
        horas_extras REAL,
        descontos REAL,
        status TEXT
      );
      
      CREATE TABLE IF NOT EXISTS external_history (
        id TEXT PRIMARY KEY,
        source_name TEXT,
        total_revenue REAL,
        gross_profit REAL,
        period TEXT,
        created_at TEXT
      );
    `);
    */
  }

  // 📦 ORDERS - SQLite First
  async getOrders(status?: string): Promise<LocalOrder[]> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 📦 Lendo orders do SQLite...');
    
    // Simulação - na implementação real:
    // const query = status ? `SELECT * FROM orders WHERE status = ?` : `SELECT * FROM orders`;
    // return await this.db.all(query, status ? [status] : []);
    
    // Dados de exemplo para teste
    return [
      {
        id: 'order-1',
        status: 'FECHADO',
        total: 15000,
        created_at: new Date().toISOString()
      },
      {
        id: 'order-2', 
        status: 'FECHADO',
        total: 25000,
        created_at: new Date().toISOString()
      }
    ];
  }

  async insertOrder(order: LocalOrder): Promise<void> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 📦 Inserindo order no SQLite:', order);
    
    // Simulação - na implementação real:
    // await this.db.run(`
    //   INSERT INTO orders (id, status, total, created_at, updated_at)
    //   VALUES (?, ?, ?, ?, ?)
    // `, [order.id, order.status, order.total, order.created_at, new Date().toISOString()]);
    
    // Adicionar à fila de sync
    offlineSync.addToSyncQueue('orders', 'insert', order);
  }

  // 💸 EXPENSES - SQLite First
  async getExpenses(): Promise<LocalExpense[]> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 💸 Lendo expenses do SQLite...');
    
    // Dados de exemplo para teste - COM VALORES REAIS
    return [
      {
        id: 'expense-1',
        description: 'Matéria-prima - Carnes',
        amount_kz: 85000,
        category: 'Custos',
        status: 'PENDING',
        created_at: new Date().toISOString()
      },
      {
        id: 'expense-2',
        description: 'Bebidas e Refrigerantes',
        amount_kz: 45000,
        category: 'Custos',
        status: 'PENDING',
        created_at: new Date().toISOString()
      },
      {
        id: 'expense-3',
        description: 'Limpeza e Higiene',
        amount_kz: 25000,
        category: 'Operacional',
        status: 'PENDING',
        created_at: new Date().toISOString()
      }
    ];
  }

  async insertExpense(expense: LocalExpense): Promise<void> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 💸 Inserindo expense no SQLite:', expense);
    
    // Adicionar à fila de sync
    offlineSync.addToSyncQueue('expenses', 'insert', expense);
  }

  // 👥 STAFF - SQLite First
  async getStaff(): Promise<LocalStaff[]> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 👥 Lendo staff do SQLite...');
    
    // Dados de exemplo para teste
    return [
      {
        id: 'staff-1',
        full_name: 'João Silva',
        role: 'GARCOM',
        base_salary_kz: 80000,
        subsidios: 5000,
        bonus: 0,
        horas_extras: 0,
        descontos: 0,
        status: 'ATIVO'
      },
      {
        id: 'staff-2',
        full_name: 'Maria Santos',
        role: 'CAIXA',
        base_salary_kz: 75000,
        subsidios: 5000,
        bonus: 0,
        horas_extras: 0,
        descontos: 0,
        status: 'ATIVO'
      }
    ];
  }

  async updateStaff(staff: LocalStaff): Promise<void> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 👥 Atualizando staff no SQLite:', staff);
    
    // Adicionar à fila de sync
    offlineSync.addToSyncQueue('staff', 'update', staff);
  }

  // 📚 EXTERNAL HISTORY - SQLite First
  async getExternalHistory(): Promise<LocalExternalHistory[]> {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 📚 Lendo external_history do SQLite...');
    
    // Dados de exemplo para teste
    return [
      {
        id: 'hist-1',
        source_name: 'Sistema POS Antigo',
        total_revenue: 45000000,
        gross_profit: 8500000,
        period: '2023-2024',
        created_at: new Date().toISOString()
      },
      {
        id: 'hist-2',
        source_name: 'Excel Manual',
        total_revenue: 22000000,
        gross_profit: 4200000,
        period: '2023-2024',
        created_at: new Date().toISOString()
      }
    ];
  }

  // 🔄 SYNC COM SUPABASE (Background)
  async syncWithSupabase() {
    console.log('[LOCAL DB] 🔄 Iniciando sync com Supabase...');
    
    try {
      // 1. Buscar dados remotos
      const remoteOrders = await offlineSync.getRemoteData('orders');
      const remoteExpenses = await offlineSync.getRemoteData('expenses');
      const remoteStaff = await offlineSync.getRemoteData('staff');
      
      // 2. Comparar e mesclar com dados locais
      // (Implementação real de merge strategy)
      
      // 3. Forçar sync da fila
      await offlineSync.forceSync();
      
      console.log('[LOCAL DB] ✅ Sync concluído');
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro no sync:', error);
    }
  }

  // 📊 MÉTRICAS LOCAIS (Zero Latência)
  async getLocalMetrics() {
    await this.initializeDatabase();
    
    console.log('[LOCAL DB] 📊 Calculando métricas locais...');
    
    const orders = await this.getOrders('FECHADO');
    const expenses = await this.getExpenses();
    const staff = await this.getStaff();
    const externalHistory = await this.getExternalHistory();
    
    // Cálculos locais (offline-first)
    const vendasHoje = orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        const today = new Date();
        return orderDate.toDateString() === today.toDateString();
      })
      .reduce((acc, order) => acc + order.total, 0);
    
    const vendasTotais = orders.reduce((acc, order) => acc + order.total, 0);
    const despesasTotais = expenses.reduce((acc, expense) => acc + expense.amount_kz, 0);
    
    const folhaSalarial = staff.reduce((acc, person) => {
      const salarioTotal = person.base_salary_kz + person.subsidios + person.bonus + person.horas_extras - person.descontos;
      return acc + salarioTotal;
    }, 0);
    
    const historicoExterno = externalHistory.reduce((acc, item) => acc + item.total_revenue, 0);
    const rendimentoGlobal = vendasTotais + historicoExterno;
    const impostos = rendimentoGlobal * 0.07;
    const lucroLiquido = rendimentoGlobal - despesasTotais - folhaSalarial;
    const margem = rendimentoGlobal > 0 ? (lucroLiquido / rendimentoGlobal) * 100 : 0;
    
    return {
      vendasHoje,
      vendasTotais,
      despesasHoje: despesasTotais, // Simplificado
      despesasTotais,
      folhaSalarial,
      impostos,
      lucroLiquido,
      margem,
      historicoExterno,
      rendimentoGlobal,
      source: 'local_sqlite'
    };
  }
}

// 🎯 EXPORTAR INSTÂNCIA GLOBAL
export const localDataService = new LocalDataService();
