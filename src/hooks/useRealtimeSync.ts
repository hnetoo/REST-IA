import { useEffect, useRef, useCallback } from 'react';
import { useSyncCoreSmart } from './useSyncCoreSmart';
import { useStore } from '../store/useStore';

interface SyncEvent {
  type: 'order' | 'expense' | 'staff';
  action: 'created' | 'updated' | 'deleted';
  data: any;
}

export const useRealtimeSync = () => {
  const { recalculate, todayRevenue, totalExpenses, netProfit } = useSyncCoreSmart();
  const { addNotification } = useStore();
  const lastSyncRef = useRef<{ [key: string]: number }>({});
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerImmediateSync = useCallback((event: SyncEvent) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    recalculate();

    const messages = {
      order: {
        created: 'Venda registrada com sucesso!',
        updated: 'Venda atualizada!',
        deleted: 'Venda cancelada!'
      },
      expense: {
        created: 'Despesa registrada!',
        updated: 'Despesa atualizada!',
        deleted: 'Despesa removida!'
      },
      staff: {
        created: 'Funcionário adicionado!',
        updated: 'Funcionário atualizado!',
        deleted: 'Funcionário removido!'
      }
    };

    const message = messages[event.type]?.[event.action] || 'Dados atualizados!';
    addNotification('success', message);

    const key = `${event.type}_${event.action}`;
    lastSyncRef.current[key] = Date.now();

    syncTimeoutRef.current = setTimeout(() => {
      recalculate();
    }, 2000);
  }, [recalculate, addNotification]);

  useEffect(() => {
    const handleOrderEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      triggerImmediateSync({
        type: 'order',
        action: customEvent.detail?.action || 'created',
        data: customEvent.detail
      });
    };

    const handleForceRefresh = () => {
      recalculate();
    };

    const handleExpenseEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      triggerImmediateSync({
        type: 'expense',
        action: customEvent.detail?.action || 'created',
        data: customEvent.detail
      });
    };

    const handleStaffEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      triggerImmediateSync({
        type: 'staff',
        action: customEvent.detail?.action || 'created',
        data: customEvent.detail
      });
    };

    window.addEventListener('order-completed', handleOrderEvent);
    window.addEventListener('force-refresh', handleForceRefresh);
    window.addEventListener('expense-added', handleExpenseEvent);
    window.addEventListener('staff-updated', handleStaffEvent);

    return () => {
      window.removeEventListener('order-completed', handleOrderEvent);
      window.removeEventListener('force-refresh', handleForceRefresh);
      window.removeEventListener('expense-added', handleExpenseEvent);
      window.removeEventListener('staff-updated', handleStaffEvent);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [triggerImmediateSync, recalculate]);

  // Verificação automática a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      recalculate();
    }, 30000);

    return () => clearInterval(interval);
  }, [recalculate]);

  // 🔥 DETECTAR MUDANÇAS NOS VALORES
  const previousValuesRef = useRef({
    todayRevenue: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  useEffect(() => {
    const current = {
      todayRevenue: todayRevenue || 0,
      totalExpenses: totalExpenses || 0,
      netProfit: netProfit || 0
    };

    const previous = previousValuesRef.current;

    if (
      Math.abs(current.todayRevenue - previous.todayRevenue) > 1 ||
      Math.abs(current.totalExpenses - previous.totalExpenses) > 1 ||
      Math.abs(current.netProfit - previous.netProfit) > 1
    ) {
      previousValuesRef.current = current;
    }
  }, [todayRevenue, totalExpenses, netProfit]);

  return {
    triggerImmediateSync,
    lastSync: lastSyncRef.current
  };
};
