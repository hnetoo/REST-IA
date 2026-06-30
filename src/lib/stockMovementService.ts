import { supabase } from '../supabase_standalone';

/**
 * Serviço de Movimentos de Stock para conformidade AGT
 * Regista automaticamente movimentos de stock obrigatórios
 */

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'DEVOLUCAO';
export type ReferenceType = 'INVOICE' | 'PURCHASE' | 'ADJUSTMENT' | 'INVENTORY';

export interface StockMovement {
  id?: number;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_type?: ReferenceType;
  reference_id?: string;
  previous_quantity: number;
  new_quantity: number;
  user_id?: string;
  notes?: string;
  timestamp?: string;
}

/**
 * Regista um movimento de stock
 */
export const registerStockMovement = async (
  movement: StockMovement
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stock_movements')
      .insert({
        product_id: movement.product_id,
        movement_type: movement.movement_type,
        quantity: movement.quantity,
        reference_type: movement.reference_type,
        reference_id: movement.reference_id,
        previous_quantity: movement.previous_quantity,
        new_quantity: movement.new_quantity,
        user_id: movement.user_id || 'SYSTEM',
        notes: movement.notes
      });

    if (error) {
      // Silenciar erro de permissão (RLS/tabela sem acesso) — não quebra o checkout
      if (error.code === '42501' || (error as any).status === 401) {
        console.warn('[STOCK] ⚠️ Sem permissão para stock_movements (RLS). Movimento não registado.');
        return true;
      }
      console.error('[STOCK] Erro ao registar movimento:', error);
      return false;
    }

    console.log('[STOCK] Movimento registado:', movement.movement_type, movement.quantity);
    return true;
  } catch (error) {
    console.error('[STOCK] Erro ao registar movimento:', error);
    return false;
  }
};

/**
 * Regista movimentos de stock para uma venda (fatura)
 */
export const registerStockMovementsForSale = async (
  items: any[],
  invoiceNumber: string,
  userId?: string
): Promise<boolean> => {
  try {
    const movements = items.map((item) => ({
      product_id: item.dishId || item.dish_id || '',
      movement_type: 'SAIDA' as MovementType,
      quantity: -(item.quantity || 0),
      reference_type: 'INVOICE' as ReferenceType,
      reference_id: invoiceNumber,
      previous_quantity: 0, // Será calculado se necessário
      new_quantity: 0, // Será calculado se necessário
      user_id: userId || 'SYSTEM',
      notes: `Venda automática - ${invoiceNumber}`
    }));

    for (const movement of movements) {
      await registerStockMovement(movement);
    }

    console.log('[STOCK] Movimentos de venda registados:', movements.length);
    return true;
  } catch (error) {
    console.error('[STOCK] Erro ao registar movimentos de venda:', error);
    return false;
  }
};

/**
 * Registra movimento de entrada de stock
 */
export const registerStockEntry = async (
  productId: string,
  quantity: number,
  referenceId: string,
  userId?: string
): Promise<boolean> => {
  return registerStockMovement({
    product_id: productId,
    movement_type: 'ENTRADA',
    quantity: quantity,
    reference_type: 'PURCHASE',
    reference_id: referenceId,
    previous_quantity: 0,
    new_quantity: 0,
    user_id: userId,
    notes: 'Entrada de stock'
  });
};

/**
 * Registra movimento de ajuste de stock
 */
export const registerStockAdjustment = async (
  productId: string,
  quantity: number,
  notes: string,
  userId?: string
): Promise<boolean> => {
  return registerStockMovement({
    product_id: productId,
    movement_type: 'AJUSTE',
    quantity: quantity,
    reference_type: 'ADJUSTMENT',
    reference_id: '',
    previous_quantity: 0,
    new_quantity: 0,
    user_id: userId,
    notes: notes
  });
};

/**
 * Busca movimentos de stock de um produto
 */
export const getProductStockMovements = async (
  productId: string,
  limit: number = 100
): Promise<StockMovement[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[STOCK] Erro ao buscar movimentos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[STOCK] Erro ao buscar movimentos:', error);
    return [];
  }
};

/**
 * Busca todos os movimentos de stock num período
 */
export const getStockMovementsByPeriod = async (
  startDate: string,
  endDate: string
): Promise<StockMovement[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[STOCK] Erro ao buscar movimentos por período:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[STOCK] Erro ao buscar movimentos por período:', error);
    return [];
  }
};

/**
 * Calcula saldo actual de stock de um produto
 */
export const calculateStockBalance = async (productId: string): Promise<number> => {
  try {
    const movements = await getProductStockMovements(productId, 1000);
    
    const balance = movements.reduce((acc, movement) => {
      return acc + movement.quantity;
    }, 0);

    return balance;
  } catch (error) {
    console.error('[STOCK] Erro ao calcular saldo:', error);
    return 0;
  }
};
