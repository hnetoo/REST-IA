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

  // 🔥 FORÇAR SINCRONIZAÇÃO IMEDIATA APÓS VENDA
  const triggerImmediateSync = useCallback((event: SyncEvent) => {
    console.log('[REALTIME_SYNC] 🚀 Evento recebido:', event);
    
    // Limpar timeout anterior
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Forçar recálculo imediato
    console.log('[REALTIME_SYNC] 🔄 Forçando recálculo imediato...');
    recalculate();

    // Notificar usuário
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

    // Atualizar timestamp para evitar duplicações
    const key = `${event.type}_${event.action}`;
    lastSyncRef.current[key] = Date.now();

    // Segundo refresh após 2 segundos para garantir consistência
    syncTimeoutRef.current = setTimeout(() => {
      console.log('[REALTIME_SYNC] 🔄 Segundo refresh para consistência...');
      recalculate();
    }, 2000);
  }, [recalculate, addNotification]);

  // 🔥 ESCUTAR EVENTOS DO SISTEMA
  useEffect(() => {
    // Escutar eventos de vendas
    const handleOrderEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[REALTIME_SYNC] 🚀 Evento order-completed recebido:', customEvent.detail);
      triggerImmediateSync({
        type: 'order',
        action: customEvent.detail?.action || 'created',
        data: customEvent.detail
      });
    };

    // Escutar eventos de refresh global
    const handleForceRefresh = () => {
      console.log('[REALTIME_SYNC] 🔄 Evento force-refresh recebido');
      recalculate();
    };

    // Escutar eventos de despesas
    const handleExpenseEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      triggerImmediateSync({
        type: 'expense',
        action: customEvent.detail?.action || 'created',
        data: customEvent.detail
      });
    };

    // Escutar eventos de staff
    const handleStaffEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      triggerImmediateSync({
        type: 'staff',
        action: customEvent.detail?.action || 'created',
        data: customEvent.detail
      });
    };

    // Registrar listeners
    window.addEventListener('order-completed', handleOrderEvent);
    window.addEventListener('force-refresh', handleForceRefresh);
    window.addEventListener('expense-added', handleExpenseEvent);
    window.addEventListener('staff-updated', handleStaffEvent);

    // Cleanup
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

  // 🔥 VERIFICAÇÃO AUTOMÁTICA A CADA 5 SEGUNDOS
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[REALTIME_SYNC] ⏰ Verificação automática de dados...');
      recalculate();
    }, 5000);

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

    // Verificar se houve mudança significativa
    if (
      Math.abs(current.todayRevenue - previous.todayRevenue) > 1 ||
      Math.abs(current.totalExpenses - previous.totalExpenses) > 1 ||
      Math.abs(current.netProfit - previous.netProfit) > 1
    ) {
      console.log('[REALTIME_SYNC] 📊 Mudança detectada:', {
        anterior: previous,
        atual: current,
        diferenca: {
          revenue: current.todayRevenue - previous.todayRevenue,
          expenses: current.totalExpenses - previous.totalExpenses,
          profit: current.netProfit - previous.netProfit
        }
      });

      // Atualizar valores anteriores
      previousValuesRef.current = current;
    }
  }, [todayRevenue, totalExpenses, netProfit]);

  return {
    triggerImmediateSync,
    lastSync: lastSyncRef.current
  };
};
