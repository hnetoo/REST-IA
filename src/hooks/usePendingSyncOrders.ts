/**
 * Sincronizador automático: ao voltar online, envia pending_sync_orders para o Supabase.
 */
import { useEffect } from 'react';
import { orderTransactionService } from '../lib/orderTransactionService';
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
          const orderPayload = {
            id: order.id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone || '999999999',
            delivery_address: order.delivery_address || 'ENDEREÇO_PADRAO',
            total_amount: order.total_amount,
            status: 'closed' as const,
            payment_method: order.payment_method,
            invoice_number: order.invoice_number,
            created_at: order.created_at,
            updated_at: order.updated_at,
            table_id: order.tableId || null
          };

          const orderItems = (order.items || []).map((item: any) => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }));

          const validItems = orderItems.filter(
            (i: any) => typeof i.product_id === 'string' && /^[0-9a-f-]{36}$/i.test(i.product_id)
          );

          // 🛡️ USAR TRANSAÇÃO ATÔMICA - Não separar order e items
          const result = await orderTransactionService.executeTransaction(orderPayload, validItems);

          if (result.success) {
            removePendingSyncOrder(order.id);
            synced++;
          } else {
            console.error('[SYNC] Falha na transação:', result.error);
          }
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

    if (navigator.onLine) {
      syncPending();
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [addNotification]);
}
