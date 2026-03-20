/**
 * Supabase-First com suporte offline.
 * Estrutura usa EXATAMENTE os nomes de coluna do banco: total_amount, payment_method, customer_name.
 */

const PENDING_SYNC_KEY = 'pending_sync_orders';

export interface PendingSyncOrderItem {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PendingSyncOrder {
  id: string;
  total_amount: number;
  payment_method: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  status: string;
  user_id?: string | null;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
  items: PendingSyncOrderItem[];
  tableId?: number; // 🛡️ ID da mesa para liberar offline
}

export function getPendingSyncOrders(): PendingSyncOrder[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addPendingSyncOrder(order: PendingSyncOrder): void {
  const pending = getPendingSyncOrders();
  pending.push(order);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

export function removePendingSyncOrder(id: string): void {
  const pending = getPendingSyncOrders().filter(o => o.id !== id);
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
}

export function clearPendingSyncOrders(): void {
  localStorage.removeItem(PENDING_SYNC_KEY);
}
