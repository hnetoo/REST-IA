
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { sqliteService } from '../services/sqliteService';
import { supabase } from '../services/supabaseService';
import { versionControlService } from '../services/versionControlService';
import { sqlMigrationService } from '../services/sqlMigrationService';
import { databaseService } from '../services/databaseService';
import { Table, Order, Dish, Customer, PaymentMethod, User, SystemSettings, Notification, MenuCategory, OrderType, Employee, AttendanceRecord, StockItem, Reservation, WorkShift, OrderItem, PermissionTemplate, AuditLog, PaymentMethodConfig } from '../types';
import { MOCK_MENU, MOCK_TABLES, MOCK_CUSTOMERS, MOCK_USERS, MOCK_CATEGORIES, MOCK_STOCK, MOCK_RESERVATIONS } from '../constants';
import defaultLogo from '../logo.png';

const syncChannel = new BroadcastChannel('vereda_state_sync');

const customPersistenceStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const data = await sqliteService.loadState();
      if (data) return JSON.stringify({ state: data, version: 8 });
      
      // Fallback for Web: Try Supabase
      const isTauri = !!(window as any).__TAURI_INTERNALS__;
      if (!isTauri) {
        const { data: remoteData } = await supabase
          .from('application_state')
          .select('data')
          .eq('id', 'current_state')
          .single();
        if (remoteData?.data) return JSON.stringify({ state: JSON.parse(remoteData.data), version: 8 });
      }
      
      return null;
    } catch (e) { return null; }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      await sqliteService.saveState(parsed.state);
      // Notify other tabs/windows
      syncChannel.postMessage({ type: 'STATE_UPDATE' });
    } catch (e) {}
  },
  removeItem: async (name: string): Promise<void> => {
    await sqliteService.saveState(null);
    syncChannel.postMessage({ type: 'STATE_UPDATE' });
  }
};

interface StoreState {
  users: User[];
  currentUser: User | null;
  login: (pin: string, userId?: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  removeUser: (id: string) => void;
  
  permissionTemplates: PermissionTemplate[];
  addPermissionTemplate: (template: PermissionTemplate) => void;
  updatePermissionTemplate: (template: PermissionTemplate) => void;
  removePermissionTemplate: (id: string) => void;

  transferTable: (fromTableId: number, toTableId: number) => void;
  cancelEmptyTable: (tableId: number) => void;
  addSubAccount: (tableId: number, name: string) => void;
  removeSubAccount: (orderId: string) => void;
  
  // Pagamentos
  addPaymentConfig: (config: Omit<PaymentMethodConfig, 'id'>) => void;
  updatePaymentConfig: (id: string, config: Partial<PaymentMethodConfig>) => void;
  
  // Configurações e UI
  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  auditLogs: AuditLog[];
  paymentConfigs: PaymentMethodConfig[];
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => void;
  tables: Table[];
  categories: MenuCategory[];
  menu: Dish[];
  activeOrders: Order[];
  customers: Customer[];
  activeTableId: number | null;
  activeOrderId: string | null;
  customerDisplayMode: Record<number, 'MARKETING' | 'ORDER_SUMMARY'>;
  setCustomerDisplayMode: (tableId: number, mode: 'MARKETING' | 'ORDER_SUMMARY') => void;
  invoiceCounter: number;
  employees: Employee[];
  attendance: AttendanceRecord[];
  stock: StockItem[];
  reservations: Reservation[];
  workShifts: WorkShift[];
  
  setActiveTable: (id: number | null) => void;
  setActiveOrder: (id: string | null) => void;
  createNewOrder: (tableId: number | null, name?: string, type?: OrderType) => string;
  transferOrder: (orderId: string, targetTableId: number) => void;
  addToOrder: (tableId: number | null, dish: Dish, quantity?: number, notes?: string, orderId?: string) => void;
  checkoutTable: (orderId: string, paymentMethod: PaymentMethod, customerId?: string) => void;
  updateOrderPaymentMethod: (orderId: string, newMethod: PaymentMethod) => void;
  
  updateTablePosition: (id: number, x: number, y: number) => void;
  addTable: (table: Table) => void;
  updateTable: (table: Table) => void;
  removeTable: (id: number) => void;
  closeTable: (id: number) => void;

  updateOrderItemStatus: (orderId: string, itemIndex: number, status: OrderItem['status']) => void;
  markOrderAsServed: (orderId: string) => void;

  toggleDishVisibility: (id: string) => void;
  toggleDishFeatured: (id: string) => void;
  toggleCategoryVisibility: (id: string) => void;

  addDish: (dish: Dish) => void;
  updateDish: (dish: Dish) => void;
  removeDish: (id: string) => void;
  addCategory: (cat: MenuCategory) => void;
  updateCategory: (cat: MenuCategory) => void;
  removeCategory: (id: string) => void;
  duplicateDish: (id: string) => void;
  duplicateCategory: (id: string) => void;
  updateStockQuantity: (id: string, delta: number) => void;

  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomer: (id: string) => void;
  settleCustomerDebt: (id: string, amount: number) => void;

  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  removeEmployee: (id: string) => void;
  clockIn: (employeeId: string) => void;
  clockOut: (employeeId: string) => void;
  externalClockSync: (bioId: string) => void;

  addWorkShift: (shift: WorkShift) => void;
  updateWorkShift: (shift: WorkShift) => void;
  removeWorkShift: (id: string) => void;

  addReservation: (res: Reservation) => void;

  backupToSupabase: () => Promise<void>;
  restoreFromSupabase: () => Promise<void>;
  resetFinancialData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      users: [...MOCK_USERS, { id: '5', name: 'Proprietário', role: 'OWNER', pin: '0000', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'], status: 'ATIVO' }],
      currentUser: null,
      permissionTemplates: [
        { id: 'tp-waiter', name: 'Perfil Garçom', description: 'Permissões básicas para atendimento de mesas.', permissions: ['POS_SALES'] },
        { id: 'tp-cashier', name: 'Perfil Caixa', description: 'Acesso a vendas e descontos.', permissions: ['POS_SALES', 'POS_DISCOUNT'] },
        { id: 'tp-manager', name: 'Perfil Gerente', description: 'Acesso total operativo e financeiro.', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE'] },
        { id: 'tp-owner', name: 'Perfil Proprietário', description: 'Controlo total e acesso ao Owner Hub.', permissions: ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'OWNER_ACCESS', 'AGT_CONFIG'] }
      ],
      addPermissionTemplate: (t) => set(state => ({ permissionTemplates: [...state.permissionTemplates, t] })),
      updatePermissionTemplate: (t) => set(state => ({ permissionTemplates: state.permissionTemplates.map(x => x.id === t.id ? t : x) })),
      removePermissionTemplate: (id) => set(state => ({ permissionTemplates: state.permissionTemplates.filter(x => x.id !== id) })),

      login: (pin, userId) => {
        const user = get().users.find(u => (userId ? u.id === userId : true) && u.pin === pin);
        if (user) { 
          set({ currentUser: user }); 
          get().addNotification('success', `Acesso autorizado: ${user.name}`);
          return true; 
        }
        get().addNotification('error', 'PIN Inválido');
        return false;
      },
      logout: () => set({ currentUser: null }),
      addUser: (user) => set(state => ({ users: [...state.users, user] })),
      updateUser: (user) => set(state => ({ users: state.users.map(u => u.id === user.id ? user : u) })),
      removeUser: (id) => set(state => ({ users: state.users.filter(u => u.id !== id) })),
      auditLogs: [],
      paymentConfigs: [
        { id: '1', name: 'Numerário', type: 'NUMERARIO', icon: 'Banknote', isActive: true },
        { id: '2', name: 'TPA / Multicaixa', type: 'TPA', icon: 'CreditCard', isActive: true },
        { id: '3', name: 'Transferência', type: 'TRANSFERENCIA', icon: 'ArrowRightLeft', isActive: true },
        { id: '4', name: 'Referência QR', type: 'QR_CODE', icon: 'QrCode', isActive: true },
      ],
      notifications: [],
      addNotification: (type, message) => {
        const id = Math.random().toString(36).substring(7);
        set(state => ({ notifications: [...state.notifications, { id, type, message }] }));
        setTimeout(() => get().removeNotification(id), 5000);
      },
      removeNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      addAuditLog: (log) => {
        const currentUser = get().currentUser || { id: 'sys', name: 'Sistema' };
        const newLog: AuditLog = {
          ...log,
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          userId: currentUser.id,
          userName: currentUser.name
        };
        set(state => ({ auditLogs: [newLog, ...state.auditLogs].slice(0, 1000) }));
      },
      settings: {
        restaurantName: "Tasca do Vereda",
        appLogoUrl: defaultLogo,
        currency: "Kz",
        taxRate: 14,
        taxRegime: 'GERAL',
        phone: "+244 923 000 000",
        address: "Via AL 15, Talatona, Luanda",
        nif: "5000000000",
        commercialReg: "L001-2025",
        capitalSocial: "100.000,00 Kz",
        conservatoria: "Conservatória do Registo Comercial de Luanda",
        agtCertificate: "000/AGT/2025",
        invoiceSeries: "2025",
        kdsEnabled: true,
        isSidebarCollapsed: false,
        apiToken: "V-OS-QUBIT-777",
        supabaseUrl: "https://ratzyxwpzrqbtpheygch.supabase.co",
        supabaseKey: "sb_publishable_brYx8iH2oCK5uVUowtUhTQ_c7X4nrAo",
        autoBackup: true,
        customDigitalMenuUrl: "https://tasca-do-vereda.vercel.app/menu-digital" 
      },
      updateSettings: (s) => {
        const oldState = get();
        versionControlService.createRestorePoint('Auto-backup antes de alteração de definições', oldState);
        
        // Se auto-backup estiver ativo, criar um backup real no DB Hub
        if (s.autoBackup && !get().settings.autoBackup) {
          databaseService.createBackup('Ativação de Auto-Backup', oldState);
        }

        set(state => {
          const merged = { ...state.settings, ...s };
          const baseUrl = "https://tasca-do-vereda.vercel.app/menu-digital";
          const shareUrl = (merged.supabaseUrl && merged.supabaseKey)
            ? `${baseUrl}?supabaseUrl=${encodeURIComponent(merged.supabaseUrl)}&anonKey=${encodeURIComponent(merged.supabaseKey)}`
            : baseUrl;
          return { settings: { ...merged, customDigitalMenuUrl: shareUrl } };
        });
        
        // Auto-sync to Supabase if enabled
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },
      tables: MOCK_TABLES,
      categories: MOCK_CATEGORIES.map(c => ({...c, isVisibleDigital: true})),
      menu: MOCK_MENU.map(m => ({...m, isVisibleDigital: true, isFeatured: false})),
      activeOrders: [],
      customers: MOCK_CUSTOMERS,
      activeTableId: null,
      activeOrderId: null,
      customerDisplayMode: {},
      setCustomerDisplayMode: (tableId, mode) => set(state => ({
        customerDisplayMode: { ...state.customerDisplayMode, [tableId]: mode }
      })),
      invoiceCounter: 1,
      employees: [],
      attendance: [],
      stock: MOCK_STOCK,
      reservations: MOCK_RESERVATIONS,
      workShifts: [],

      setActiveTable: (id) => set({ activeTableId: id }),
      setActiveOrder: (id) => set({ activeOrderId: id }),

      toggleDishVisibility: (id) => set(state => ({
        menu: state.menu.map(d => d.id === id ? { ...d, isVisibleDigital: !d.isVisibleDigital } : d)
      })),
      toggleDishFeatured: (id) => set(state => ({
        menu: state.menu.map(d => d.id === id ? { ...d, isFeatured: !d.isFeatured } : d)
      })),
      toggleCategoryVisibility: (id) => set(state => ({
        categories: state.categories.map(c => c.id === id ? { ...c, isVisibleDigital: !c.isVisibleDigital } : c)
      })),

      addDish: (d) => set(state => ({ menu: [...state.menu, { ...d, isVisibleDigital: true }] })),
      updateDish: (d) => {
        versionControlService.createRestorePoint(`Alteração no prato: ${d.name}`, get());
        set(state => ({ menu: state.menu.map(x => x.id === d.id ? d : x) }));
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },
      removeDish: (id) => {
        const dish = get().menu.find(x => x.id === id);
        versionControlService.createRestorePoint(`Remoção do prato: ${dish?.name || id}`, get());
        set(state => ({ menu: state.menu.filter(x => x.id !== id) }));
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },
      addCategory: (c) => {
        set(state => ({ categories: [...state.categories, { ...c, isVisibleDigital: true }] }));
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },
      updateCategory: (c) => {
        versionControlService.createRestorePoint(`Alteração na categoria: ${c.name}`, get());
        set(state => ({ categories: state.categories.map(x => x.id === c.id ? c : x) }));
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },
      removeCategory: (id: string) => set(state => ({ categories: state.categories.filter(x => x.id !== id) })),

      duplicateDish: (id: string) => {
        const original = get().menu.find(d => d.id === id);
        if (!original) return;

        const newDish: Dish = {
          ...original,
          id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: `${original.name} (Cópia)`,
          isVisibleDigital: original.isVisibleDigital,
          isFeatured: original.isFeatured
        };

        set(state => ({ menu: [...state.menu, newDish] }));
        get().addAuditLog({
          module: 'SYSTEM',
          action: 'DUPLICAR_PRODUTO',
          details: `Produto duplicado: ${original.name} (ID: ${original.id}) -> ${newDish.name} (ID: ${newDish.id})`
        });
        get().addNotification('success', `Produto "${original.name}" duplicado com sucesso.`);
        
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },

      duplicateCategory: (id: string) => {
        const original = get().categories.find(c => c.id === id);
        if (!original) return;

        const newCatId = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newCategory: MenuCategory = {
          ...original,
          id: newCatId,
          name: `${original.name} (Cópia)`
        };

        // Duplicar também os produtos desta categoria
        const categoryProducts = get().menu.filter(d => d.categoryId === id);
        const newDishes = categoryProducts.map(d => ({
          ...d,
          id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: `${d.name} (Cópia)`,
          categoryId: newCatId
        }));
        
        set(state => ({ 
          categories: [...state.categories, newCategory],
          menu: [...state.menu, ...newDishes]
        }));

        get().addAuditLog({
          module: 'SYSTEM',
          action: 'DUPLICAR_CATEGORIA',
          details: `Categoria duplicada: ${original.name} (ID: ${original.id}) -> ${newCategory.name} (ID: ${newCategory.id}). ${newDishes.length} produtos duplicados.`
        });
        get().addNotification('success', `Categoria "${original.name}" e ${newDishes.length} produtos duplicados com sucesso.`);

        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },

      updateStockQuantity: (id, delta) => set(state => ({
        stock: state.stock.map(s => s.id === id ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s)
      })),

      createNewOrder: (tableId, name, type: OrderType = 'LOCAL') => {
        const id = `ord-${Date.now()}`;
        const newOrder: Order = {
          id, tableId, type, items: [], status: 'ABERTO' as const, timestamp: new Date(),
          total: 0, taxTotal: 0, profit: 0, subAccountName: name || 'Principal'
        };
        set(state => ({
          activeOrders: [...state.activeOrders, newOrder],
          activeOrderId: id,
          tables: tableId ? state.tables.map(t => t.id === tableId ? { ...t, status: 'OCUPADO' as const } : t) : state.tables
        }));
        return id;
      },

      transferOrder: (orderId, targetTableId) => {
        set(state => {
          const order = state.activeOrders.find(o => o.id === orderId);
          if (!order) return state;
          
          const oldTableId = order.tableId;
          const newOrders = state.activeOrders.map(o => o.id === orderId ? { ...o, tableId: targetTableId } : o);
          
          const oldTableStillHasOrders = newOrders.some(o => o.tableId === oldTableId && o.status === 'ABERTO');
          
          return {
            activeOrders: newOrders,
            tables: state.tables.map(t => {
              if (t.id === targetTableId) return { ...t, status: 'OCUPADO' as const };
              if (t.id === oldTableId && !oldTableStillHasOrders) return { ...t, status: 'LIVRE' as const };
              return t;
            }),
            activeTableId: targetTableId
          };
        });
      },

      addToOrder: (tableId, dish, quantity = 1, notes = '', orderId) => {
        const targetId = orderId || get().activeOrderId;
        set(state => {
          const orderExists = state.activeOrders.find(o => o.id === targetId);
          
          if (!orderExists && tableId) {
             const newId = `ord-${Date.now()}`;
             const newOrder: Order = {
               id: newId, tableId, type: 'LOCAL', items: [{
                  dishId: dish.id, quantity, status: 'PENDENTE' as const, notes,
                  unitPrice: dish.price, unitCost: dish.costPrice,
                  taxAmount: dish.price * (state.settings.taxRate / 100)
               }], status: 'ABERTO' as const, timestamp: new Date(),
               total: dish.price * quantity, taxTotal: (dish.price * (state.settings.taxRate / 100)) * quantity, 
               profit: (dish.price - dish.costPrice) * quantity, subAccountName: 'Principal'
             };
             return { 
                activeOrders: [...state.activeOrders, newOrder],
                activeOrderId: newId,
                tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'OCUPADO' as const } : t)
             };
          }

          if (!orderExists) return state;

          const newOrders = state.activeOrders.map(o => {
            if (o.id !== targetId) return o;
            
            // Lógica de Otimização: Agrupar itens duplicados
            // Apenas agrupa se as notas forem idênticas e o status for PENDENTE
            const existingItemIndex = o.items.findIndex(item => 
              item.dishId === dish.id && 
              item.notes === notes && 
              item.status === 'PENDENTE'
            );

            let newItems: OrderItem[];
            if (existingItemIndex !== -1) {
              newItems = o.items.map((item, idx) => 
                idx === existingItemIndex 
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
              get().addNotification('success', `Quantidade de ${dish.name} incrementada.`);
            } else {
              newItems = [...o.items, {
                dishId: dish.id, quantity, status: 'PENDENTE' as const, notes,
                unitPrice: dish.price, unitCost: dish.costPrice,
                taxAmount: dish.price * (state.settings.taxRate / 100)
              }];
            }

            const total = newItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
            const profit = newItems.reduce((acc, i) => acc + ((i.unitPrice - i.unitCost) * i.quantity), 0);
            const taxTotal = newItems.reduce((acc, i) => acc + (i.taxAmount * i.quantity), 0);
            return { ...o, items: newItems, total, profit, taxTotal };
          });
          
          return { activeOrders: newOrders };
        });
      },

      checkoutTable: (orderId, paymentMethod, customerId) => {
        const series = get().settings.invoiceSeries;
        const count = get().invoiceCounter;
        const invoiceNumber = `FR VER${series}/${count}`;
        const hash = Math.random().toString(36).substring(2, 12).toUpperCase();
        
        set(state => {
          const order = state.activeOrders.find(o => o.id === orderId);
          if (!order) return state;

          const orderTotal = order.total;
          
          const newCustomers = customerId && paymentMethod === 'PAGAR_DEPOIS' 
            ? state.customers.map(c => c.id === customerId ? { ...c, balance: c.balance + orderTotal } : c)
            : state.customers;

          const newOrders: Order[] = state.activeOrders.map(o => 
            o.id === orderId ? { ...o, status: 'FECHADO' as const, paymentMethod, customerId, invoiceNumber, hash } : o
          );
          
          const tableId = order.tableId;
          const tableHasMoreOrders = newOrders.some(o => o.tableId === tableId && o.status === 'ABERTO');

          return {
            customers: newCustomers,
            activeOrders: newOrders,
            tables: tableId ? state.tables.map(t => t.id === tableId && !tableHasMoreOrders ? { ...t, status: 'LIVRE' as const } : t) : state.tables,
            invoiceCounter: count + 1,
            activeTableId: null,
            activeOrderId: null,
            customerDisplayMode: tableId ? { ...state.customerDisplayMode, [tableId]: 'MARKETING' as const } : state.customerDisplayMode
          };
        });
      },

      updateOrderPaymentMethod: (orderId, newMethod) => {
        set(state => {
          // Localizar a conta original para gerir saldos de clientes
          const originalOrder = state.activeOrders.find(o => o.id === orderId);
          if (!originalOrder) return state;

          const oldMethod = originalOrder.paymentMethod;
          let newCustomers = [...state.customers];

          // Se tiver cliente associado, gerir a conta corrente
          if (originalOrder.customerId) {
            // Se saiu de PAGAR_DEPOIS para um imediato, remove o débito do cliente
            if (oldMethod === 'PAGAR_DEPOIS' && newMethod !== 'PAGAR_DEPOIS') {
              newCustomers = newCustomers.map(c => c.id === originalOrder.customerId ? { ...c, balance: Math.max(0, c.balance - originalOrder.total) } : c);
            } 
            // Se entrou em PAGAR_DEPOIS agora, adiciona o débito ao cliente
            else if (oldMethod !== 'PAGAR_DEPOIS' && newMethod === 'PAGAR_DEPOIS') {
              newCustomers = newCustomers.map(c => c.id === originalOrder.customerId ? { ...c, balance: c.balance + originalOrder.total } : c);
            }
          }

          const newOrders = state.activeOrders.map(o => {
            if (o.id !== orderId) return o;
            return { ...o, paymentMethod: newMethod };
          });

          return { 
            activeOrders: newOrders,
            customers: newCustomers 
          };
        });
      },

      updateTablePosition: (id, x, y) => set(state => ({
        tables: state.tables.map(t => t.id === id ? { ...t, x, y } : t)
      })),
      addTable: (table) => set(state => ({ tables: [...state.tables, table] })),
      updateTable: (table) => set(state => ({ tables: state.tables.map(t => t.id === table.id ? table : t) })),
      removeTable: (id) => {
        const tableToRemove = get().tables.find(t => t.id === id);
        if (!tableToRemove) return;

        const hasActiveOrders = get().activeOrders.some(o => o.tableId === id && o.status === 'ABERTO');
        if (hasActiveOrders) {
          get().addNotification('error', `Não é possível apagar a mesa ${tableToRemove.name} porque tem pedidos ativos.`);
          return;
        }

        versionControlService.createRestorePoint(`Remoção da mesa: ${tableToRemove.name}`, get());
        set(state => ({ 
          tables: state.tables.filter(t => t.id !== id),
          activeOrders: state.activeOrders.filter(o => o.tableId !== id) // Remove any closed/voided orders associated
        }));
        get().addAuditLog({
          module: 'TABLES',
          action: 'REMOVER_MESA',
          details: `Mesa ${tableToRemove.name} (ID: ${id}) removida.`
        });
        get().addNotification('success', `Mesa ${tableToRemove.name} removida com sucesso.`);
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },
      closeTable: (id: number) => {
        const tableToClose = get().tables.find(t => t.id === id);
        if (!tableToClose) return;

        // Verificar se existem pedidos com itens (que não podem ser fechados sem pagamento)
        const hasOrdersWithItems = get().activeOrders.some(o => o.tableId === id && o.status === 'ABERTO' && o.items.length > 0);
        
        if (hasOrdersWithItems) {
          get().addNotification('error', `Não é possível fechar a mesa ${tableToClose.name} porque tem pedidos ativos com itens.`);
          return;
        }

        versionControlService.createRestorePoint(`Fecho da mesa: ${tableToClose.name}`, get());
        
        set(state => ({
          tables: state.tables.map(t => t.id === id ? { ...t, status: 'LIVRE' as const } : t),
          // Remove pedidos vazios da mesa
          activeOrders: state.activeOrders.filter(o => !(o.tableId === id && o.status === 'ABERTO')),
          activeTableId: state.activeTableId === id ? null : state.activeTableId,
          activeOrderId: state.activeTableId === id ? null : state.activeOrderId
        }));

        get().addAuditLog({
          module: 'TABLES',
          action: 'FECHAR_MESA',
          details: `Mesa ${tableToClose.name} (ID: ${id}) fechada e definida como LIVRE.`
        });
        get().addNotification('success', `Mesa ${tableToClose.name} fechada com sucesso e definida como LIVRE.`);
        if (get().settings.autoBackup && get().settings.supabaseUrl) {
          sqlMigrationService.autoMigrate(get().settings, get());
        }
      },


      cancelEmptyTable: (tableId: number) => {
        const state = get();
        const order = state.activeOrders.find(o => o.tableId === tableId && o.status === 'ABERTO');
        
        if (!order) {
          state.addNotification('error', 'Nenhum pedido aberto encontrado para esta mesa.');
          return;
        }

        if (order.items.length > 0) {
          state.addNotification('error', 'Não é possível fechar uma mesa com itens. Use a função de pagamento.');
          return;
        }

        set(state => ({
          activeOrders: state.activeOrders.filter(o => o.id !== order.id),
          tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'LIVRE' as const } : t),
          activeTableId: state.activeTableId === tableId ? null : state.activeTableId,
          activeOrderId: state.activeOrderId === order.id ? null : state.activeOrderId
        }));

        get().addAuditLog({
          module: 'TABLES',
          action: 'CANCEL_EMPTY_TABLE',
          details: `Mesa ${tableId} fechada (vazia) manualmente.`
        });
        state.addNotification('success', `Mesa ${tableId} fechada com sucesso.`);
      },

      transferTable: (fromTableId, toTableId) => {
        const fromOrders = get().activeOrders.filter(o => o.tableId === fromTableId && o.status === 'ABERTO');
        if (fromOrders.length === 0) {
          get().addNotification('error', 'Não existem pedidos abertos na mesa de origem.');
          return;
        }

        const toTable = get().tables.find(t => t.id === toTableId);
        if (!toTable) return;

        set(state => ({
          activeOrders: state.activeOrders.map(o => 
            (o.tableId === fromTableId && o.status === 'ABERTO') 
              ? { ...o, tableId: toTableId } 
              : o
          ),
          tables: state.tables.map(t => {
            if (t.id === fromTableId) return { ...t, status: 'LIVRE' as const };
            if (t.id === toTableId) return { ...t, status: 'OCUPADO' as const };
            return t;
          })
        }));

        get().addAuditLog({
          module: 'TABLES',
          action: 'TRANSFERENCIA_MESA',
          details: `Transferência da Mesa ${fromTableId} para Mesa ${toTableId}. ${fromOrders.length} conta(s) transferida(s).`
        });
        get().addNotification('success', `Mesa ${fromTableId} transferida para Mesa ${toTableId}.`);
      },

      addSubAccount: (tableId, name) => {
        const newId = `ord-${Date.now()}`;
        const newOrder: Order = {
          id: newId,
          tableId,
          type: 'LOCAL',
          items: [],
          status: 'ABERTO',
          timestamp: new Date(),
          total: 0,
          taxTotal: 0,
          profit: 0,
          subAccountName: name
        };
        
        set(state => ({
          activeOrders: [...state.activeOrders, newOrder],
          activeOrderId: newId
        }));
        
        get().addAuditLog({
          module: 'POS',
          action: 'CRIAR_SUBCONTA',
          details: `Nova subconta "${name}" criada para Mesa ${tableId}.`
        });
        get().addNotification('success', `Subconta "${name}" criada.`);
      },

      removeSubAccount: (orderId) => {
        const order = get().activeOrders.find(o => o.id === orderId);
        if (!order) return;
        
        if (order.items.length > 0) {
          get().addNotification('error', 'Não é possível remover uma subconta com itens. Transfira ou anule os itens primeiro.');
          return;
        }

        set(state => ({
          activeOrders: state.activeOrders.filter(o => o.id !== orderId),
          activeOrderId: state.activeOrderId === orderId ? null : state.activeOrderId
        }));
        
        get().addNotification('info', `Subconta "${order.subAccountName}" removida.`);
      },

      addPaymentConfig: (config) => {
        const id = `pay-${Date.now()}`;
        set(state => ({ paymentConfigs: [...state.paymentConfigs, { ...config, id }] }));
        get().addAuditLog({
          module: 'SYSTEM',
          action: 'CONFIG_PAGAMENTO',
          details: `Adicionado novo modo de pagamento: ${config.name}`
        });
      },

      updatePaymentConfig: (id, config) => {
        set(state => ({
          paymentConfigs: state.paymentConfigs.map(c => c.id === id ? { ...c, ...config } : c)
        }));
      },

      updateOrderItemStatus: (orderId, itemIndex, status) => set(state => ({
        activeOrders: state.activeOrders.map(o => {
          if (o.id !== orderId) return o;
          const items = o.items.map((item, idx) => 
            idx === itemIndex ? { ...item, status } : item
          );
          return { ...o, items };
        })
      })),
      markOrderAsServed: (orderId) => set(state => ({
        activeOrders: state.activeOrders.map(o => {
          if (o.id !== orderId) return o;
          const items = o.items.map(item => ({ ...item, status: 'ENTREGUE' as const }));
          return { ...o, items };
        })
      })),

      addCustomer: (c) => set(state => ({ customers: [...state.customers, c] })),
      updateCustomer: (c) => set(state => ({ customers: state.customers.map(x => x.id === c.id ? c : x) })),
      removeCustomer: (id) => set(state => ({ customers: state.customers.filter(x => x.id !== id) })),
      settleCustomerDebt: (id, amount) => set(state => ({
        customers: state.customers.map(c => c.id === id ? { ...c, balance: Math.max(0, c.balance - amount) } : c)
      })),

      addEmployee: (e) => set(state => ({ employees: [...state.employees, e] })),
      updateEmployee: (e) => set(state => ({ employees: state.employees.map(x => x.id === e.id ? e : x) })),
      removeEmployee: (id) => set(state => ({ employees: state.employees.filter(x => x.id !== id) })),
      clockIn: (empId) => {
        const today = new Date().toISOString().split('T')[0];
        set(state => ({
          attendance: [...state.attendance, { employeeId: empId, date: today, clockIn: new Date() }]
        }));
      },
      clockOut: (empId) => {
        const today = new Date().toISOString().split('T')[0];
        set(state => ({
          attendance: state.attendance.map(a => 
            a.employeeId === empId && a.date === today ? { ...a, clockOut: new Date() } : a
          )
        }));
      },
      externalClockSync: (bioId) => {
        const emp = get().employees.find(e => e.externalBioId === bioId);
        if (emp) {
          const today = new Date().toISOString().split('T')[0];
          const record = get().attendance.find(a => a.employeeId === emp.id && a.date === today);
          if (!record || !record.clockIn) get().clockIn(emp.id);
          else if (!record.clockOut) get().clockOut(emp.id);
        }
      },

      addWorkShift: (s) => set(state => ({ workShifts: [...state.workShifts, s] })),
      updateWorkShift: (s) => set(state => ({ workShifts: state.workShifts.map(x => x.id === s.id ? s : x) })),
      removeWorkShift: (id) => set(state => ({ workShifts: state.workShifts.filter(x => x.id !== id) })),

      addReservation: (res) => set(state => ({ reservations: [...state.reservations, res] })),

      backupToSupabase: async () => {
        get().addNotification('info', 'Backup quântico em progresso...');
        try {
          const state = get();
          const { error } = await supabase
            .from('application_state')
            .upsert({ 
              id: 'current_state', 
              data: JSON.stringify(state),
              updated_at: new Date().toISOString()
            });
          
          if (error) throw error;
          get().addNotification('success', 'Nuvem atualizada com sucesso.');
        } catch (err: any) {
          console.error('Erro backup Supabase:', err);
          get().addNotification('error', 'Falha no backup Supabase.');
        }
      },

      restoreFromSupabase: async () => {
        get().addNotification('info', 'Restaurando integridade...');
        try {
          const { data, error } = await supabase
            .from('application_state')
            .select('data')
            .eq('id', 'current_state')
            .single();
          
          if (error) throw error;
          if (data && data.data) {
            const parsed = JSON.parse(data.data);
            set(parsed);
            get().addNotification('success', 'Restauração concluída.');
          }
        } catch (err: any) {
          console.error('Erro restore Supabase:', err);
          get().addNotification('error', 'Falha na restauração Supabase.');
        }
      },

      resetFinancialData: () => {
        set(state => ({
          activeOrders: [],
          invoiceCounter: 1,
          activeTableId: null,
          activeOrderId: null,
          tables: state.tables.map(t => ({ ...t, status: 'LIVRE' as const }))
        }));
      }
    }),
    {
      name: 'vereda-quantum-store-v8',
      storage: createJSONStorage(() => customPersistenceStorage),
    }
  )
);
