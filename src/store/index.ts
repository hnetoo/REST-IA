// Exportar todos os stores divididos
export { useOrderStore } from './slices/useOrderStore';
export { useUserStore } from './slices/useUserStore';
export { useFinanceStore } from './slices/useFinanceStore';
export { useMenuStore } from './slices/useMenuStore';
export { useSettingsStore } from './slices/useSettingsStore';

// Re-exportar funções utilitárias
export {
  validateSupabaseConnection,
  performStartupSync,
  validateSupabaseConfig,
  startRealtimeSubscriptions,
  getExternalHistoryTotal,
  getTodaySalesTotal,
  syncOrderToSupabase
} from './useStore.utils';

// Store legado unificado - usar apenas durante migração
// Preferir usar os stores individuais acima
// export { default as useStoreLegacy } from './useStoreLegacy';
