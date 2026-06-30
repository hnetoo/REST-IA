/**
 * Supabase-First com suporte offline.
 * Estrutura usa EXATAMENTE os nomes de coluna do banco: total_amount, payment_method, customer_name.
 * 🔥 CONGELAMENTO DE DIAS PASSADOS: Orders de dias anteriores não podem ser sincronizadas
 */

const PENDING_SYNC_KEY = 'pending_sync_orders';
import { supabase } from '../../supabase_standalone';

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
  data_contabil?: string; // 🔑 Dia Operacional - preservado para evitar mudança durante sincronização offline
  items: PendingSyncOrderItem[];
  tableId?: number; // 🛡️ ID da mesa para liberar offline
}

// 🔥 Verificar se order pode ser sincronizada (não é de dia passado)
export async function canSyncOrder(order: PendingSyncOrder): Promise<boolean> {
  const orderDate = new Date(order.created_at).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  // Se order é de hoje ou futuro, permite sync
  if (orderDate >= today) {
    return true;
  }
  
  // Se order é de dia passado, verifica se o dia está fechado
  const closedDays = await getClosedDays();
  if (closedDays.includes(orderDate)) {
    console.warn(`[SYNC] Order ${order.id?.slice(-8)} de dia fechado ${orderDate} bloqueada`);
    return false;
  }
  
  // Se o dia já passou (não é hoje), bloqueia sync
  if (orderDate < today) {
    console.warn(`[SYNC] Order ${order.id?.slice(-8)} de dia passado ${orderDate} bloqueada`);
    return false;
  }
  
  return true;
}

// 🔥 Obter dias fechados do Supabase usando função RPC segura
export async function getClosedDays(): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_closed_days_safe');
    
    if (error) {
      console.error('[SYNC] Erro ao buscar dias fechados:', error);
      return [];
    }
    
    return data?.map((d: { date: string }) => d.date) || [];
  } catch {
    return [];
  }
}

// 🔥 Marcar dia como fechado no Supabase usando função RPC segura
export async function markDayAsClosed(date: string): Promise<void> {
  try {
    const closedDays = await getClosedDays();
    if (!closedDays.includes(date)) {
      const { error } = await supabase.rpc('mark_day_closed_safe', { p_date: date });
      
      if (error) {
        console.error('[SYNC] Erro ao marcar dia como fechado:', error);
      } else {
        console.log(`[SYNC] Dia ${date} marcado como fechado no Supabase`);
      }
    }
  } catch (err) {
    console.error('[SYNC] Erro ao marcar dia como fechado:', err);
  }
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

// 🔥 Obter apenas orders que podem ser sincronizadas (filtrar dias passados)
export async function getSyncablePendingOrders(): Promise<PendingSyncOrder[]> {
  const pending = getPendingSyncOrders();
  const syncable: PendingSyncOrder[] = [];
  
  for (const order of pending) {
    const canSync = await canSyncOrder(order);
    if (canSync) {
      syncable.push(order);
    }
  }
  
  return syncable;
}
