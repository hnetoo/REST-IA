/**
 * Sincronizador automático: ao voltar online, envia pending_sync_orders para o Supabase.
 */
import { useEffect } from 'react';
import { supabase } from '../supabase_standalone';
import { useStore } from '../store/useStore';
import { getPendingSyncOrders, removePendingSyncOrder } from '../lib/pendingSyncOrders';

export function usePendingSyncOrders() {
  const addNotification = useStore(s => s.addNotification);

  useEffect(() => {
    const syncPending = async () => {
      const pending = getPendingSyncOrders();
      if (pending.length === 0) return;

      let synced = 0;
      for (const order of pending) {
        try {
          const orderPayload: Record<string, unknown> = {
            id: order.id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone || '999999999',
            delivery_address: order.delivery_address || 'ENDEREÇO_PADRAO',
            total_amount: order.total_amount,
            status: 'closed',
            payment_method: order.payment_method,
            created_at: order.created_at,
            updated_at: order.updated_at
          };
          if (order.user_id != null) orderPayload.user_id = order.user_id;
          if (order.invoice_number) orderPayload.invoice_number = order.invoice_number;

          const { error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload);

          if (orderError) {
            console.warn('[SYNC] Erro ao enviar ordem pendente:', order.id, orderError);
            continue;
          }

          if (order.items && order.items.length > 0) {
            const validItems = order.items.filter(
              i => typeof i.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(i.product_id)
            );
            if (validItems.length > 0) {
              const { error: itemsError } = await supabase
                .from('order_items')
                .insert(validItems);

              if (itemsError) {
                console.warn('[SYNC] Erro ao enviar itens da ordem:', order.id, itemsError);
              }
            }
          }

          removePendingSyncOrder(order.id);
          synced++;
        } catch (err) {
          console.warn('[SYNC] Exceção ao sincronizar ordem:', order.id, err);
        }
      }

      if (synced > 0) {
        addNotification('success', `${synced} venda(s) sincronizada(s) com sucesso.`);
      }
    };

    const handleOnline = () => {
      syncPending();
    };

    window.addEventListener('online', handleOnline);

    // Sincronizar imediatamente se já estiver online
    if (navigator.onLine) {
      syncPending();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [addNotification]);
}
