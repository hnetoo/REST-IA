import { supabase } from '../supabase_standalone';

// ============================================================
// TIPOS
// ============================================================

export interface Supplier {
  id?: string;
  name: string;
  nif?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface StockPurchase {
  id?: string;
  supplier_id?: string;
  supplier_name?: string;
  purchase_date: string;
  invoice_number?: string;
  total_amount: number;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  created_by?: string;
  items?: StockPurchaseItem[];
}

export interface StockPurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  expiry_date?: string;
  lot_number?: string;
}

export interface StockInventory {
  id?: string;
  inventory_date: string;
  status: 'OPEN' | 'COUNTED' | 'RECONCILED';
  notes?: string;
  created_by?: string;
  items?: StockInventoryItem[];
}

export interface StockInventoryItem {
  id?: string;
  inventory_id?: string;
  product_id: string;
  product_name: string;
  system_quantity: number;
  counted_quantity: number | null;
  difference: number;
  notes?: string;
}

export interface ProductStockInfo {
  product_id: string;
  product_name: string;
  category_name?: string;
  stock_quantity: number;
  min_stock: number;
  unit: string;
  price: number;
  cost_price: number;
  sku?: string;
  cmp: number;
  stock_value_cost: number;
  stock_value_sale: number;
  potential_profit: number;
  status: 'OK' | 'LOW' | 'OUT';
  avg_daily_consumption: number;
  days_until_empty: number | null;
  suggested_reorder: number;
  abc_class: 'A' | 'B' | 'C';
}

// ============================================================
// FORNECEDORES
// ============================================================

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) { console.error('[STOCK] fetchSuppliers:', error); return []; }
    return data || [];
  } catch (e) { console.error('[STOCK] fetchSuppliers:', e); return []; }
};

export const createSupplier = async (supplier: Supplier): Promise<Supplier | null> => {
  try {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
    if (error) { console.error('[STOCK] createSupplier:', error); return null; }
    return data;
  } catch (e) { console.error('[STOCK] createSupplier:', e); return null; }
};

export const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<boolean> => {
  try {
    const { error } = await supabase.from('suppliers').update(updates).eq('id', id);
    if (error) { console.error('[STOCK] updateSupplier:', error); return false; }
    return true;
  } catch (e) { console.error('[STOCK] updateSupplier:', e); return false; }
};

export const deleteSupplier = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', id);
    if (error) { console.error('[STOCK] deleteSupplier:', error); return false; }
    return true;
  } catch (e) { console.error('[STOCK] deleteSupplier:', e); return false; }
};

// ============================================================
// COMPRAS
// ============================================================

export const fetchPurchases = async (limit = 50): Promise<StockPurchase[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_purchases')
      .select(`
        *,
        supplier:suppliers(name),
        items:stock_purchase_items(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('[STOCK] fetchPurchases:', error); return []; }
    return (data || []).map((p: any) => ({
      ...p,
      supplier_name: p.supplier?.name,
      items: p.items || [],
    }));
  } catch (e) { console.error('[STOCK] fetchPurchases:', e); return []; }
};

export const createPurchase = async (purchase: StockPurchase): Promise<string | null> => {
  try {
    const { data, error } = await supabase.from('stock_purchases').insert({
      supplier_id: purchase.supplier_id,
      purchase_date: purchase.purchase_date,
      invoice_number: purchase.invoice_number,
      total_amount: purchase.total_amount,
      status: purchase.status,
      notes: purchase.notes,
      created_by: purchase.created_by,
    }).select().single();

    if (error || !data) { console.error('[STOCK] createPurchase:', error); return null; }

    const purchaseId = data.id;

    if (purchase.items && purchase.items.length > 0) {
      const items = purchase.items.map(item => ({
        purchase_id: purchaseId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        expiry_date: item.expiry_date || null,
        lot_number: item.lot_number || null,
      }));
      const { error: itemsError } = await supabase.from('stock_purchase_items').insert(items);
      if (itemsError) console.error('[STOCK] createPurchase items:', itemsError);
    }

    return purchaseId;
  } catch (e) { console.error('[STOCK] createPurchase:', e); return null; }
};

export const receivePurchase = async (purchaseId: string, items: StockPurchaseItem[], userId?: string): Promise<boolean> => {
  try {
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity, cost_price')
        .eq('id', item.product_id)
        .single();

      const currentStock = product?.stock_quantity || 0;
      const currentCost = product?.cost_price || 0;
      const newStock = currentStock + item.quantity;
      const newCmp = newStock > 0
        ? ((currentStock * currentCost) + (item.quantity * item.unit_cost)) / newStock
        : item.unit_cost;

      await supabase.from('products').update({
        stock_quantity: newStock,
        cost_price: newCmp,
      }).eq('id', item.product_id);

      await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'ENTRADA',
        quantity: item.quantity,
        reference_type: 'PURCHASE',
        reference_id: purchaseId,
        previous_quantity: currentStock,
        new_quantity: newStock,
        user_id: userId || 'SYSTEM',
        notes: `Compra ${item.product_name} (${item.quantity} x ${item.unit_cost})`,
      });
    }

    await supabase.from('stock_purchases').update({ status: 'RECEIVED' }).eq('id', purchaseId);
    return true;
  } catch (e) { console.error('[STOCK] receivePurchase:', e); return false; }
};

export const cancelPurchase = async (purchaseId: string): Promise<boolean> => {
  try {
    await supabase.from('stock_purchases').update({ status: 'CANCELLED' }).eq('id', purchaseId);
    return true;
  } catch (e) { console.error('[STOCK] cancelPurchase:', e); return false; }
};

// ============================================================
// INVENTÁRIO FÍSICO
// ============================================================

export const fetchInventories = async (): Promise<StockInventory[]> => {
  try {
    let allData: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('stock_inventories')
        .select(`*, items:stock_inventory_items(*)`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error || !data || data.length === 0) { hasMore = false; break; }
      allData.push(...data);
      if (data.length < pageSize) hasMore = false;
      else offset += pageSize;
    }
    return allData;
  } catch (e) { console.error('[STOCK] fetchInventories:', e); return []; }
};

export const createInventory = async (products: any[], userId?: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.from('stock_inventories').insert({
      status: 'OPEN',
      created_by: userId || 'SYSTEM',
    }).select().single();

    if (error || !data) { console.error('[STOCK] createInventory:', error); return null; }

    const inventoryId = data.id;
    const items = products.map(p => ({
      inventory_id: inventoryId,
      product_id: p.id,
      product_name: p.name,
      system_quantity: p.stock_quantity || 0,
      counted_quantity: null,
      difference: 0,
    }));

    const { error: itemsError } = await supabase.from('stock_inventory_items').insert(items);
    if (itemsError) console.error('[STOCK] createInventory items:', itemsError);

    return inventoryId;
  } catch (e) { console.error('[STOCK] createInventory:', e); return null; }
};

export const updateInventoryItem = async (itemId: string, countedQty: number, notes?: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('stock_inventory_items').update({
      counted_quantity: countedQty,
      difference: countedQty, 
      notes,
    }).eq('id', itemId);
    if (error) { console.error('[STOCK] updateInventoryItem:', error); return false; }
    return true;
  } catch (e) { console.error('[STOCK] updateInventoryItem:', e); return false; }
};

export const reconcileInventory = async (inventoryId: string, items: StockInventoryItem[], userId?: string): Promise<boolean> => {
  try {
    for (const item of items) {
      if (item.counted_quantity === null) continue;
      const diff = item.counted_quantity - item.system_quantity;
      if (diff === 0) continue;

      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      const currentStock = product?.stock_quantity || 0;

      await supabase.from('products').update({
        stock_quantity: item.counted_quantity,
      }).eq('id', item.product_id);

      await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'AJUSTE',
        quantity: diff,
        reference_type: 'INVENTORY',
        reference_id: inventoryId,
        previous_quantity: currentStock,
        new_quantity: item.counted_quantity,
        user_id: userId || 'SYSTEM',
        notes: `Inventário físico — ${item.product_name}: ${item.system_quantity} → ${item.counted_quantity}`,
      });
    }

    await supabase.from('stock_inventories').update({ status: 'RECONCILED' }).eq('id', inventoryId);
    return true;
  } catch (e) { console.error('[STOCK] reconcileInventory:', e); return false; }
};

export const deleteInventory = async (inventoryId: string): Promise<boolean> => {
  try {
    await supabase.from('stock_inventory_items').delete().eq('inventory_id', inventoryId);
    const { error } = await supabase.from('stock_inventories').delete().eq('id', inventoryId);
    if (error) { console.error('[STOCK] deleteInventory:', error); return false; }
    return true;
  } catch (e) { console.error('[STOCK] deleteInventory:', e); return false; }
};

export const deleteInventoryItem = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('stock_inventory_items').delete().eq('id', itemId);
    if (error) { console.error('[STOCK] deleteInventoryItem:', error); return false; }
    return true;
  } catch (e) { console.error('[STOCK] deleteInventoryItem:', e); return false; }
};

// ============================================================
// ANÁLISE AVANÇADA — CMP, PREVISÕES, ABC
// ============================================================

export const calculateProductStockInfo = (
  product: any,
  categoryName: string,
  salesData: { product_id: string; total_qty: number; days: number }[]
): ProductStockInfo => {
  const stock = product.stock_quantity || 0;
  const minStock = product.min_stock || 10;
  const price = product.price || 0;
  const costPrice = product.cost_price || price * 0.6;
  const cmp = costPrice;

  const status: 'OK' | 'LOW' | 'OUT' = stock === 0 ? 'OUT' : stock <= minStock ? 'LOW' : 'OK';

  const salesEntry = salesData.find(s => s.product_id === product.id);
  const totalQtySold = salesEntry?.total_qty || 0;
  const days = salesEntry?.days || 1;
  const avgDaily = totalQtySold / days;
  const daysUntilEmpty = avgDaily > 0 ? Math.round(stock / avgDaily) : null;
  const suggestedReorder = avgDaily > 0 ? Math.max(0, Math.ceil(avgDaily * 7) - stock + minStock) : 0;

  return {
    product_id: product.id,
    product_name: product.name,
    category_name: categoryName,
    stock_quantity: stock,
    min_stock: minStock,
    unit: product.unit || 'un',
    price,
    cost_price: costPrice,
    cmp,
    stock_value_cost: stock * cmp,
    stock_value_sale: stock * price,
    potential_profit: stock * (price - cmp),
    status,
    avg_daily_consumption: avgDaily,
    days_until_empty: daysUntilEmpty,
    suggested_reorder: suggestedReorder,
    abc_class: 'C',
  };
};

export const classifyABC = (products: ProductStockInfo[]): ProductStockInfo[] => {
  const sorted = [...products].sort((a, b) => b.stock_value_sale - a.stock_value_sale);
  const totalValue = sorted.reduce((sum, p) => sum + p.stock_value_sale, 0);
  let cumulative = 0;

  return sorted.map(p => {
    cumulative += p.stock_value_sale;
    const percentage = totalValue > 0 ? cumulative / totalValue : 0;
    const abcClass: 'A' | 'B' | 'C' = percentage <= 0.8 ? 'A' : percentage <= 0.95 ? 'B' : 'C';
    return { ...p, abc_class: abcClass };
  });
};

export const fetchSalesDataForStock = async (days: number = 30): Promise<{ product_id: string; total_qty: number; days: number }[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Buscar orders paginado (Supabase REST limita a 1000 por query)
    let allOrders: any[] = [];
    let ordOffset = 0;
    const ordPageSize = 1000;
    let ordHasMore = true;
    while (ordHasMore) {
      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .in('status', ['closed', 'paid'])
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .range(ordOffset, ordOffset + ordPageSize - 1);
      if (error || !data || data.length === 0) { ordHasMore = false; break; }
      allOrders.push(...data);
      if (data.length < ordPageSize) ordHasMore = false;
      else ordOffset += ordPageSize;
    }

    const productQtyMap: Record<string, number> = {};
    for (const order of allOrders) {
      const items = order.items || [];
      for (const item of items) {
        const dishId = item.dishId || item.dish_id || item.id || item.product_id;
        if (dishId) {
          productQtyMap[dishId] = (productQtyMap[dishId] || 0) + (item.quantity || 0);
        }
      }
    }

    // Sempre buscar também de order_items (paginado) para garantir dados completos
    let oiAllData: any[] = [];
    let oiOffset = 0;
    const oiPageSize = 1000;
    let oiHasMore = true;
    while (oiHasMore) {
      const { data: oiData, error: oiError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: false })
        .range(oiOffset, oiOffset + oiPageSize - 1);
      if (oiError || !oiData || oiData.length === 0) { oiHasMore = false; break; }
      oiAllData.push(...oiData);
      if (oiData.length < oiPageSize) oiHasMore = false;
      else oiOffset += oiPageSize;
    }
    if (oiAllData.length > 0) {

      for (const oi of oiAllData) {
        if (oi.product_id) {
          productQtyMap[oi.product_id] = (productQtyMap[oi.product_id] || 0) + (oi.quantity || 0);
        }
      }
    }

    return Object.entries(productQtyMap).map(([product_id, total_qty]) => ({
      product_id,
      total_qty,
      days,
    }));
  } catch (e) { console.error('[STOCK] fetchSalesData:', e); return []; }
};

// ============================================================
// ALERTAS
// ============================================================

export const checkStockAlerts = (products: ProductStockInfo[]): { type: string; product: ProductStockInfo; message: string }[] => {
  const alerts: { type: string; product: ProductStockInfo; message: string }[] = [];

  for (const p of products) {
    if (p.status === 'OUT') {
      alerts.push({ type: 'OUT_OF_STOCK', product: p, message: `${p.product_name} está ESGOTADO!` });
    } else if (p.status === 'LOW') {
      alerts.push({ type: 'LOW_STOCK', product: p, message: `Stock baixo: ${p.product_name} (${p.stock_quantity} ${p.unit})` });
    }
    if (p.days_until_empty !== null && p.days_until_empty <= 3 && p.days_until_empty > 0) {
      alerts.push({ type: 'EXPIRY_SOON', product: p, message: `${p.product_name} esgota em ${p.days_until_empty} dias!` });
    }
  }

  return alerts;
};

// ============================================================
// MOVIMENTOS
// ============================================================

export const fetchAllStockMovements = async (limit = 1000, offset = 0): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) { console.error('[STOCK] fetchAllMovements:', error); return []; }
    return data || [];
  } catch (e) { console.error('[STOCK] fetchAllMovements:', e); return []; }
};

export const fetchMovementsByDateRange = async (startDate: string, endDate: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59')
      .order('timestamp', { ascending: false });
    if (error) { console.error('[STOCK] fetchMovementsByDate:', error); return []; }
    return data || [];
  } catch (e) { console.error('[STOCK] fetchMovementsByDate:', e); return []; }
};

// ============================================================
// STOCK DANIFICADO
// ============================================================

export const registerDamagedStock = async (
  productId: string,
  productName: string,
  quantity: number,
  reason: string,
  userId?: string
): Promise<boolean> => {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    const currentStock = product?.stock_quantity || 0;
    const newStock = Math.max(0, currentStock - quantity);

    await supabase.from('products').update({
      stock_quantity: newStock,
    }).eq('id', productId);

    await supabase.from('stock_movements').insert({
      product_id: productId,
      movement_type: 'DANIFICADO',
      quantity: -quantity,
      reference_type: 'DAMAGE',
      previous_quantity: currentStock,
      new_quantity: newStock,
      user_id: userId || 'SYSTEM',
      notes: reason,
    });

    return true;
  } catch (e) {
    console.error('[STOCK] registerDamagedStock:', e);
    return false;
  }
};

export const fetchDamagedStockMovements = async (limit?: number): Promise<any[]> => {
  try {
    let allData: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('movement_type', 'DANIFICADO')
        .order('timestamp', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error || !data || data.length === 0) { hasMore = false; break; }
      allData.push(...data);
      if (data.length < pageSize) hasMore = false;
      else offset += pageSize;
    }
    return allData;
  } catch (e) { console.error('[STOCK] fetchDamagedStock:', e); return []; }
};
