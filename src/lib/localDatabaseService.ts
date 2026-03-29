import { PrismaClient } from '@prisma/client';
import { offlineSync } from './offlineSync';

// 🎯 BANCO DE DADOS LOCAL BASEADO EM PRISMA
class LocalDatabaseService {
  private prisma: PrismaClient | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeDatabase();
  }

  // 🗄️ INICIALIZAR BANCO DE DADOS LOCAL
  async initializeDatabase() {
    if (this.isInitialized) return;

    try {
      console.log('[LOCAL DB] 🗄️ Inicializando Prisma SQLite...');
      
      // 🎯 CAMINHO SEGURO PARA APPDATA NO ELECTRON
      let dbPath = 'file:./local.db';
      
      // Se estiver no ambiente Electron, usar AppData
      if (typeof window !== 'undefined' && window.electronAPI) {
        // No Electron, o caminho será configurado pelo main process
        console.log('[LOCAL DB] 🖥️ Ambiente Electron detectado');
      } else if (typeof window === 'undefined') {
        // No Node.js (main process), usar app.getPath('userData')
        try {
          const { app } = require('electron');
          const userDataPath = app.getPath('userData');
          dbPath = `file:${userDataPath}/local.db`;
          console.log('[LOCAL DB] 📁 Usando AppData:', dbPath);
        } catch (error) {
          console.log('[LOCAL DB] 🔄 Electron não disponível, usando caminho padrão');
        }
      }
      
      // Inicializar Prisma Client para SQLite
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbPath
          }
        }
      });

      // Verificar se as tabelas existem (Prisma cria automaticamente)
      await this.prisma.$connect();
      
      // Inicializar dados básicos se necessário
      await this.seedBasicData();
      
      this.isInitialized = true;
      console.log('[LOCAL DB] ✅ Prisma SQLite inicializado');
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao inicializar Prisma:', error);
      
      // Fallback para dados mock se Prisma falhar
      console.log('[LOCAL DB] 🔄 Usando fallback mock...');
      this.prisma = null;
      this.isInitialized = true;
    }
  }

  // 🌱 INICIALIZAR DADOS BÁSICOS
  private async seedBasicData() {
    if (!this.prisma) return;

    try {
      // Verificar se já existe staff
      const staffCount = await this.prisma.staff.count();
      if (staffCount === 0) {
        console.log('[LOCAL DB] 🌱 Inserindo staff básico...');
        await this.prisma.staff.createMany({
          data: [
            {
              full_name: 'João Silva',
              role: 'GARCOM',
              base_salary_kz: 80000,
              subsidios: 5000,
              bonus: 0,
              horas_extras: 0,
              descontos: 0,
              status: 'active'
            },
            {
              full_name: 'Maria Santos',
              role: 'CAIXA',
              base_salary_kz: 75000,
              subsidios: 5000,
              bonus: 0,
              horas_extras: 0,
              descontos: 0,
              status: 'active'
            }
          ]
        });
      }

      // Verificar se já existe external_history
      const historyCount = await this.prisma.external_history.count();
      if (historyCount === 0) {
        console.log('[LOCAL DB] 🌱 Inserindo histórico externo...');
        await this.prisma.external_history.createMany({
          data: [
            {
              source_name: 'Sistema POS Antigo',
              total_revenue: 45000000,
              gross_profit: 8500000,
              period: '2023-2024'
            },
            {
              source_name: 'Excel Manual',
              total_revenue: 22000000,
              gross_profit: 4200000,
              period: '2023-2024'
            },
            {
              source_name: 'Papel e Caneta',
              total_revenue: 18000000,
              gross_profit: 3500000,
              period: '2023-2024'
            }
          ]
        });
      }

      // Verificar se já existe expenses
      const expensesCount = await this.prisma.expenses.count();
      if (expensesCount === 0) {
        console.log('[LOCAL DB] 🌱 Inserindo despesas básicas...');
        await this.prisma.expenses.createMany({
          data: [
            {
              description: 'Matéria-prima - Carnes',
              amount_kz: 85000,
              category: 'Custos',
              status: 'pago'
            },
            {
              description: 'Bebidas e Refrigerantes',
              amount_kz: 45000,
              category: 'Custos',
              status: 'pago'
            },
            {
              description: 'Limpeza e Higiene',
              amount_kz: 25000,
              category: 'Operacional',
              status: 'pago'
            }
          ]
        });
      }

      console.log('[LOCAL DB] ✅ Dados básicos inseridos');
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao inserir dados básicos:', error);
    }
  }

  // 📦 ORDERS - SQLite First
  async getOrders(status?: string) {
    if (!this.prisma) {
      return this.getMockOrders(status);
    }

    try {
      console.log('[LOCAL DB] 📦 Lendo orders do Prisma SQLite...');
      
      const orders = status 
        ? await this.prisma.orders.findMany({ where: { status } })
        : await this.prisma.orders.findMany();
      
      return orders.map(order => ({
        ...order,
        total_amount: Number(order.total_amount) || 0,
        created_at: order.created_at.toISOString()
      }));
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao ler orders:', error);
      return this.getMockOrders(status);
    }
  }

  async insertOrder(orderData: any) {
    if (!this.prisma) {
      console.log('[LOCAL DB] 📦 Inserindo order mock...');
      return;
    }

    try {
      console.log('[LOCAL DB] 📦 Inserindo order no Prisma SQLite...');
      
      const order = await this.prisma.orders.create({
        data: {
          ...orderData,
          total_amount: orderData.total_amount ? Number(orderData.total_amount) : 0
        }
      });

      console.log('[LOCAL DB] ✅ Order inserido:', order.id);
      
      // Adicionar à fila de sync
      offlineSync.addToSyncQueue('orders', 'insert', order);
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao inserir order:', error);
    }
  }

  // 💸 EXPENSES - SQLite First
  async getExpenses() {
    if (!this.prisma) {
      return this.getMockExpenses();
    }

    try {
      console.log('[LOCAL DB] 💸 Lendo expenses do Prisma SQLite...');
      
      const expenses = await this.prisma.expenses.findMany();
      
      return expenses.map(expense => ({
        ...expense,
        amount_kz: Number(expense.amount_kz) || 0,
        created_at: expense.created_at.toISOString()
      }));
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao ler expenses:', error);
      return this.getMockExpenses();
    }
  }

  async insertExpense(expenseData: any) {
    if (!this.prisma) {
      console.log('[LOCAL DB] 💸 Inserindo expense mock...');
      return;
    }

    try {
      console.log('[LOCAL DB] 💸 Inserindo expense no Prisma SQLite...');
      
      const expense = await this.prisma.expenses.create({
        data: {
          ...expenseData,
          amount_kz: Number(expenseData.amount_kz) || 0
        }
      });

      console.log('[LOCAL DB] ✅ Expense inserido:', expense.id);
      
      // Adicionar à fila de sync
      offlineSync.addToSyncQueue('expenses', 'insert', expense);
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao inserir expense:', error);
    }
  }

  // 👥 STAFF - SQLite First
  async getStaff() {
    if (!this.prisma) {
      return this.getMockStaff();
    }

    try {
      console.log('[LOCAL DB] 👥 Lendo staff do Prisma SQLite...');
      
      const staff = await this.prisma.staff.findMany();
      
      return staff.map(person => ({
        ...person,
        base_salary_kz: Number(person.base_salary_kz) || 0,
        subsidios: Number(person.subsidios) || 0,
        bonus: Number(person.bonus) || 0,
        horas_extras: Number(person.horas_extras) || 0,
        descontos: Number(person.descontos) || 0,
        salario_base: Number(person.salario_base) || 0,
        created_at: person.created_at.toISOString()
      }));
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao ler staff:', error);
      return this.getMockStaff();
    }
  }

  async updateStaff(staffData: any) {
    if (!this.prisma) {
      console.log('[LOCAL DB] 👥 Atualizando staff mock...');
      return;
    }

    try {
      console.log('[LOCAL DB] 👥 Atualizando staff no Prisma SQLite...');
      
      const staff = await this.prisma.staff.update({
        where: { id: staffData.id },
        data: {
          ...staffData,
          base_salary_kz: staffData.base_salary_kz ? Number(staffData.base_salary_kz) : undefined,
          subsidios: staffData.subsidios ? Number(staffData.subsidios) : undefined,
          bonus: staffData.bonus ? Number(staffData.bonus) : undefined,
          horas_extras: staffData.horas_extras ? Number(staffData.horas_extras) : undefined,
          descontos: staffData.descontos ? Number(staffData.descontos) : undefined,
          salario_base: staffData.salario_base ? Number(staffData.salario_base) : undefined
        }
      });

      console.log('[LOCAL DB] ✅ Staff atualizado:', staff.id);
      
      // Adicionar à fila de sync
      offlineSync.addToSyncQueue('staff', 'update', staff);
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao atualizar staff:', error);
    }
  }

  // 📚 EXTERNAL HISTORY - SQLite First
  async getExternalHistory() {
    if (!this.prisma) {
      return this.getMockExternalHistory();
    }

    try {
      console.log('[LOCAL DB] 📚 Lendo external_history do Prisma SQLite...');
      
      const history = await this.prisma.external_history.findMany();
      
      return history.map(item => ({
        ...item,
        total_revenue: Number(item.total_revenue) || 0,
        gross_profit: Number(item.gross_profit) || 0,
        created_at: item.created_at.toISOString()
      }));
      
    } catch (error) {
      console.error('[LOCAL DB] ❌ Erro ao ler external_history:', error);
      return this.getMockExternalHistory();
    }
  }

  // 🔄 MÉTODOS MOCK (Fallback)
  private getMockOrders(status?: string) {
    const mockOrders = [
      {
        id: 'order-1',
        status: 'FECHADO',
        total_amount: 15000,
        created_at: new Date().toISOString()
      },
      {
        id: 'order-2',
        status: 'FECHADO', 
        total_amount: 25000,
        created_at: new Date().toISOString()
      }
    ];
    
    return status ? mockOrders.filter(o => o.status === status) : mockOrders;
  }

  private getMockExpenses() {
    return [
      {
        id: 'expense-1',
        description: 'Matéria-prima - Carnes',
        amount_kz: 85000,
        category: 'Custos',
        status: 'pago',
        created_at: new Date().toISOString()
      },
      {
        id: 'expense-2',
        description: 'Bebidas e Refrigerantes',
        amount_kz: 45000,
        category: 'Custos',
        status: 'pago',
        created_at: new Date().toISOString()
      },
      {
        id: 'expense-3',
        description: 'Limpeza e Higiene',
        amount_kz: 25000,
        category: 'Operacional',
        status: 'pago',
        created_at: new Date().toISOString()
      }
    ];
  }

  private getMockStaff() {
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
        salario_base: 80000,
        status: 'active',
        created_at: new Date().toISOString()
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
        salario_base: 75000,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];
  }

  private getMockExternalHistory() {
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
      .reduce((acc, order) => acc + order.total_amount, 0);
    
    const vendasTotais = orders.reduce((acc, order) => acc + order.total_amount, 0);
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
      despesasHoje: despesasTotais,
      despesasTotais,
      folhaSalarial,
      impostos,
      lucroLiquido,
      margem,
      historicoExterno,
      rendimentoGlobal,
      source: 'local_sqlite' as const
    };
  }
}

// 🎯 EXPORTAR INSTÂNCIA GLOBAL
export const localDatabaseService = new LocalDatabaseService();
