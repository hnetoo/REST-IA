import { supabase } from '../supabase_standalone';

// 🔑 SUPABASE FIRST - Realtime Subscriptions para espelho perfeito
export class RealtimeService {
  private subscriptions: Map<string, any> = new Map();
  private store: any = null;

  constructor(store: any) {
    this.store = store;
  }

  // Iniciar todas as subscriptions
  startAllSubscriptions() {
    console.log('[REALTIME] 🚀 Iniciando subscriptions para espelho perfeito...');
    
    this.subscribeToOrders();
    this.subscribeToExpenses();
    this.subscribeToEmployees();
    this.subscribeToMenuItems();
    
    console.log('[REALTIME] ✅ Todas as subscriptions ativas');
  }

  // Parar todas as subscriptions
  stopAllSubscriptions() {
    console.log('[REALTIME] 🛑 Parando todas as subscriptions...');
    
    this.subscriptions.forEach((subscription, key) => {
      supabase.removeChannel(subscription);
      console.log(`[REALTIME] ❌ Subscription ${key} removida`);
    });
    
    this.subscriptions.clear();
  }

  // Orders - Vendas
  private subscribeToOrders() {
    const channel = supabase
      .channel('orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('[REALTIME] 📊 Mudança em orders:', payload);
          this.handleOrderChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('orders', channel);
    console.log('[REALTIME] ✅ Subscription orders ativa');
  }

  // Expenses - Despesas
  private subscribeToExpenses() {
    const channel = supabase
      .channel('expenses_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          console.log('[REALTIME] 💰 Mudança em expenses:', payload);
          this.handleExpenseChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('expenses', channel);
    console.log('[REALTIME] ✅ Subscription expenses ativa');
  }

  // Employees - Funcionários
  private subscribeToEmployees() {
    const channel = supabase
      .channel('employees_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff'
        },
        (payload) => {
          console.log('[REALTIME] 👥 Mudança em staff:', payload);
          this.handleEmployeeChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('employees', channel);
    console.log('[REALTIME] ✅ Subscription employees ativa');
  }

  // Menu Items - Produtos
  private subscribeToMenuItems() {
    const channel = supabase
      .channel('menu_items_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        (payload) => {
          console.log('[REALTIME] 🍽️ Mudança em menu_items:', payload);
          this.handleMenuItemChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('menu_items', channel);
    console.log('[REALTIME] ✅ Subscription menu_items ativa');
  }

  // Handlers para cada tipo de mudança
  private handleOrderChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        console.log('[REALTIME] 📈 Nova order inserida:', newRecord);
        // Adicionar ao estado local se necessário
        break;
      case 'UPDATE':
        console.log('[REALTIME] 📝 Order atualizada:', newRecord);
        // Atualizar estado local
        break;
      case 'DELETE':
        console.log('[REALTIME] 🗑️ Order removida:', oldRecord);
        // Remover do estado local
        break;
    }

    // Forçar atualização do dashboard
    if (this.store?.getState()?.fetchMetrics) {
      this.store.getState().fetchMetrics();
    }
  }

  private handleExpenseChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        console.log('[REALTIME] 💸 Nova despesa inserida:', newRecord);
        this.store.getState().addExpense(newRecord);
        break;
      case 'UPDATE':
        console.log('[REALTIME] 📝 Despesa atualizada:', newRecord);
        // Atualizar despesa no estado
        break;
      case 'DELETE':
        console.log('[REALTIME] 🗑️ Despesa removida:', oldRecord);
        // Remover do estado local (já é feito pelo removeExpense)
        break;
    }

    // Forçar atualização do dashboard
    if (this.store?.getState()?.fetchMetrics) {
      this.store.getState().fetchMetrics();
    }
  }

  private handleEmployeeChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        console.log('[REALTIME] 👤 Novo funcionário inserido:', newRecord);
        this.store.getState().addEmployee(newRecord);
        break;
      case 'UPDATE':
        console.log('[REALTIME] 📝 Funcionário atualizado:', newRecord);
        // Atualizar funcionário no estado
        break;
      case 'DELETE':
        console.log('[REALTIME] 🗑️ Funcionário removido:', oldRecord);
        this.store.getState().employees = this.store.getState().employees.filter((emp: any) => emp.id !== oldRecord.id);
        break;
    }

    // Forçar atualização do dashboard
    if (this.store?.getState()?.fetchMetrics) {
      this.store.getState().fetchMetrics();
    }
  }

  private handleMenuItemChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        console.log('[REALTIME] 🍽️ Novo item inserido:', newRecord);
        this.store.getState().addDish(newRecord);
        break;
      case 'UPDATE':
        console.log('[REALTIME] 📝 Item atualizado:', newRecord);
        this.store.getState().updateDish(newRecord);
        break;
      case 'DELETE':
        console.log('[REALTIME] 🗑️ Item removido:', oldRecord);
        this.store.getState().removeDish(oldRecord.id);
        break;
    }
  }
}

// Singleton para manter apenas uma instância
let realtimeService: RealtimeService | null = null;

export const getRealtimeService = (store: any): RealtimeService => {
  if (!realtimeService) {
    realtimeService = new RealtimeService(store);
  }
  return realtimeService;
};

export const stopRealtimeService = () => {
  if (realtimeService) {
    realtimeService.stopAllSubscriptions();
    realtimeService = null;
  }
};
