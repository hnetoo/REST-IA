import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Table, Order, Dish, Customer, PaymentMethod, User, SystemSettings, Notification, MenuCategory, OrderType, Employee, AttendanceRecord, StockItem, Reservation, WorkShift, OrderItem, PermissionTemplate, AuditLog, PaymentMethodConfig } from '../../types';
import { MOCK_MENU, MOCK_TABLES, MOCK_CUSTOMERS, MOCK_USERS, MOCK_CATEGORIES, MOCK_STOCK, MOCK_RESERVATIONS } from '../../constants';
import defaultLogo from '/logo.png';

interface AppStore {
  // User state
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  
  // Settings
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  
  // Data
  activeOrders: Order[];
  menu: Dish[];
  tables: Table[];
  customers: Customer[];
  users: User[];
  stock: StockItem[];
  reservations: Reservation[];
  
  // Notifications
  notifications: Notification[];
  addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  removeNotification: (id: string) => void;
  
  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  
  // Payment configs
  paymentConfigs: PaymentMethodConfig[];
  addPaymentConfig: (config: PaymentMethodConfig) => void;
  updatePaymentConfig: (id: string, updates: Partial<PaymentMethodConfig>) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      settings: {
        restaurantName: 'Tasca do Vereda',
        address: 'Luanda, Angola',
        phone: '+244 923 456 789',
        email: 'info@tascadovereda.ao',
        nif: '123456789',
        logo: defaultLogo,
        currency: 'AOA',
        language: 'pt-AO',
        theme: 'dark',
        isSidebarCollapsed: false,
      },
      activeOrders: [],
      menu: MOCK_MENU,
      tables: MOCK_TABLES,
      customers: MOCK_CUSTOMERS,
      users: MOCK_USERS,
      stock: MOCK_STOCK,
      reservations: MOCK_RESERVATIONS,
      notifications: [],
      paymentConfigs: [
        { id: '1', name: 'Numerário', type: 'NUMERARIO', icon: 'Banknote', isActive: true },
        { id: '2', name: 'Multicaixa', type: 'POS', icon: 'CreditCard', isActive: true },
        { id: '3', name: 'Transferência', type: 'TRANSFER', icon: 'ArrowRightLeft', isActive: true },
      ],
      
      // Actions
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),
      
      addNotification: (type, message) => {
        const id = Date.now().toString();
        const notification: Notification = {
          id,
          type,
          message,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [...state.notifications, notification]
        }));
        
        // Auto remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(id);
        }, 5000);
      },
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      addOrder: (order) => set((state) => ({
        activeOrders: [...state.activeOrders, order]
      })),
      
      updateOrder: (id, updates) => set((state) => ({
        activeOrders: state.activeOrders.map(order =>
          order.id === id ? { ...order, ...updates } : order
        )
      })),
      
      deleteOrder: (id) => set((state) => ({
        activeOrders: state.activeOrders.filter(order => order.id !== id)
      })),
      
      addPaymentConfig: (config) => set((state) => ({
        paymentConfigs: [...state.paymentConfigs, config]
      })),
      
      updatePaymentConfig: (id, updates) => set((state) => ({
        paymentConfigs: state.paymentConfigs.map(config =>
          config.id === id ? { ...config, ...updates } : config
        )
      })),
    }),
    {
      name: 'vereda-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
