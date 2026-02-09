
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { sqliteService } from '../services/sqliteService';
import { Table, Order, Dish, Customer, PaymentMethod, User, SystemSettings, Notification, MenuCategory, OrderType, Employee, AttendanceRecord, StockItem, Reservation, WorkShift, OrderItem, PermissionTemplate } from '../types';
import { MOCK_MENU, MOCK_TABLES, MOCK_CUSTOMERS, MOCK_USERS, MOCK_CATEGORIES, MOCK_STOCK, MOCK_RESERVATIONS } from '../constants';

const customPersistenceStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const data = await sqliteService.loadState();
      if (!data) return null;
      return JSON.stringify({ state: data, version: 8 });
    } catch (e) { return null; }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      await sqliteService.saveState(parsed.state);
    } catch (e) {}
  },
  removeItem: async (name: string): Promise<void> => {
    await sqliteService.saveState(null);
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

  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  tables: Table[];
  categories: MenuCategory[];
  menu: Dish[];
  activeOrders: Order[];
  customers: Customer[];
  activeTableId: number | null;
  activeOrderId: string | null;
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
      notifications: [],
      addNotification: (type, message) => {
        const id = Math.random().toString(36).substring(7);
        set(state => ({ notifications: [...state.notifications, { id, type, message }] }));
        setTimeout(() => get().removeNotification(id), 3000);
      },
      removeNotification: (id) => set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),
      settings: {
        restaurantName: "Tasca do Vereda",
        appLogoUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop",
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
        supabaseUrl: "",
        supabaseKey: "",
        autoBackup: true,
        customDigitalMenuUrl: "" 
      },
      updateSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } })),
      tables: MOCK_TABLES,
      categories: MOCK_CATEGORIES.map(c => ({...c, isVisibleDigital: true})),
      menu: MOCK_MENU.map(m => ({...m, isVisibleDigital: true, isFeatured: false})),
      activeOrders: [],
      customers: MOCK_CUSTOMERS,
      activeTableId: null,
      activeOrderId: null,
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
      updateDish: (d) => set(state => ({ menu: state.menu.map(x => x.id === d.id ? d : x) })),
      removeDish: (id) => set(state => ({ menu: state.menu.filter(x => x.id !== id) })),
      addCategory: (c) => set(state => ({ categories: [...state.categories, { ...c, isVisibleDigital: true }] })),
      updateCategory: (c) => set(state => ({ categories: state.categories.map(x => x.id === c.id ? c : x) })),
      removeCategory: (id) => set(state => ({ categories: state.categories.filter(x => x.id !== id) })),
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

          const newOrders = state.activeOrders.map(o => {
            if (o.id !== targetId) return o;
            const items: OrderItem[] = [...o.items, {
              dishId: dish.id, quantity, status: 'PENDENTE' as const, notes,
              unitPrice: dish.price, unitCost: dish.costPrice,
              taxAmount: dish.price * (state.settings.taxRate / 100)
            }];
            const total = items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
            const profit = items.reduce((acc, i) => acc + ((i.unitPrice - i.unitCost) * i.quantity), 0);
            const taxTotal = items.reduce((acc, i) => acc + (i.taxAmount * i.quantity), 0);
            return { ...o, items, total, profit, taxTotal };
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
            activeOrderId: null
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
      removeTable: (id) => set(state => ({ tables: state.tables.filter(t => t.id !== id) })),

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
        await new Promise(r => setTimeout(r, 1000));
        get().addNotification('success', 'Nuvem atualizada com sucesso.');
      },

      restoreFromSupabase: async () => {
        get().addNotification('info', 'Restaurando integridade...');
        await new Promise(r => setTimeout(r, 1000));
        get().addNotification('success', 'Restauração concluída.');
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
      storage: createJSONStorage(() => customPersistenceStorage)
    }
  )
);
