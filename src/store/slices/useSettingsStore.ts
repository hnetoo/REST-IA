import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SystemSettings, Notification, AuditLog, PaymentMethodConfig } from '../../../types';
import defaultLogo from '/logo.png';

interface SettingsState {
  // Estado
  settings: SystemSettings;
  notifications: Notification[];
  auditLogs: AuditLog[];
  paymentConfigs: PaymentMethodConfig[];

  // Ações de configurações
  updateSettings: (settings: Partial<SystemSettings>) => void;
  resetLocalState: () => void;
  clearZustandPersist: () => void;

  // Ações de notificações
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;

  // Ações de audit logs
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => void;

  // Ações de pagamentos
  addPaymentConfig: (config: Omit<PaymentMethodConfig, 'id'>) => void;
  updatePaymentConfig: (id: string, config: Partial<PaymentMethodConfig>) => void;
}

const defaultSettings = {
  language: 'pt',
  timezone: 'Africa/Luanda',
  currency: 'AOA',
  taxRate: 0,
  serviceCharge: 0,
  logo: defaultLogo as string,
  receiptFooter: 'Obrigado pela preferência!',
  receiptHeader: '',
  autoPrint: false,
  autoCloseTable: false,
  theme: 'dark',
  accentColor: '#10b981'
} as SystemSettings;

export const useSettingsStore = create<SettingsState>()(
  // persist(
    (set, get) => ({
      // Estado inicial
      settings: { ...defaultSettings },
      notifications: [],
      auditLogs: [],
      paymentConfigs: [],

      // Configurações
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),

      resetLocalState: () => {
        console.log('[resetLocalState] Resetando estado local...');
        localStorage.clear();
        set({
          settings: { ...defaultSettings },
          notifications: [],
          auditLogs: [],
          paymentConfigs: []
        });
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      },

      clearZustandPersist: () => {
        console.log('[clearZustandPersist] Limpando persistência...');
        localStorage.clear();
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      },

      // Notificações
      addNotification: (type, message) => {
        const notification: Notification = {
          id: `notif-${Date.now()}`,
          type,
          message,
          timestamp: new Date().toISOString(),
          read: false
        };
        set((state) => ({
          notifications: [...state.notifications, notification]
        }));

        // Auto-remove após 5 segundos
        setTimeout(() => {
          get().removeNotification(notification.id);
        }, 5000);
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        })),

      // Audit Logs
      addAuditLog: (log) => {
        const auditLog: AuditLog = {
          ...log,
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'system',
          userName: 'Sistema'
        };
        set((state) => ({
          auditLogs: [...state.auditLogs.slice(-99), auditLog] // Manter últimos 100
        }));
      },

      // Pagamentos
      addPaymentConfig: (config) =>
        set((state) => ({
          paymentConfigs: [...state.paymentConfigs, { ...config, id: `pay-${Date.now()}` }]
        })),

      updatePaymentConfig: (id, config) =>
        set((state) => ({
          paymentConfigs: state.paymentConfigs.map((c) =>
            c.id === id ? { ...c, ...config } : c
          )
        }))
    })
  // ),
  // {
  //   name: 'settings-storage',
  //   partialize: (state) => ({
  //     settings: state.settings,
  //     paymentConfigs: state.paymentConfigs
  //   })
  // }
);
