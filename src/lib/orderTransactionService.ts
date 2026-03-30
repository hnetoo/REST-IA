import { supabase } from '../lib/supabase';

/**
 * 🛡️ ORDER TRANSACTION SERVICE
 * 
 * Implementa transações atômicas para garantir que:
 * 1. Order e OrderItems são salvos juntos ou nada é salvo
 * 2. Se um falhar, o outro é revertido (rollback)
 * 3. Dados órfãos são eliminados
 * 
 * NOTA: Como Supabase não suporta transações diretas via REST API,
 * usamos uma abordagem de "compensação" com rollback manual
 */

export interface OrderTransactionData {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_nif?: string | null;
  delivery_address?: string;
  total_amount: number;
  status: 'closed' | 'paid' | string; // 🛡️ SEMPRE status final, mas aceita string para flexibilidade
  payment_method: string;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
  table_id?: string | null;
}

export interface OrderItemTransactionData {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface TransactionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  details?: {
    orderInserted: boolean;
    itemsInserted: number;
    rollbackPerformed: boolean;
  };
}

export const orderTransactionService = {
  /**
   * 🚀 EXECUTAR TRANSAÇÃO ATÔMICA
   * 
   * Passos:
   * 1. Inserir Order
   * 2. Se sucesso, inserir OrderItems
   * 3. Se OrderItems falhar, fazer rollback da Order (deletar)
   * 4. Retornar resultado completo
   */
  async executeTransaction(
    orderData: OrderTransactionData,
    itemsData: OrderItemTransactionData[]
  ): Promise<TransactionResult> {
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`[TRANSACTION:${transactionId}] 🚀 INICIANDO TRANSAÇÃO ATÔMICA`);
    console.log(`[TRANSACTION:${transactionId}] 📊 Order:`, {
      id: orderData.id,
      total: orderData.total_amount,
      status: orderData.status,
      items: itemsData.length
    });

    // 🛡️ VALIDAÇÃO PRÉ-TRANSAÇÃO
    if (!orderData.id || !orderData.total_amount || orderData.total_amount <= 0) {
      return {
        success: false,
        error: 'Dados da ordem inválidos: ID ou total ausente/inválido'
      };
    }

    if (!itemsData || itemsData.length === 0) {
      return {
        success: false,
        error: 'Lista de itens vazia - transação abortada'
      };
    }

    // Validar cada item
    const invalidItems = itemsData.filter(item => 
      !item.product_id || 
      !item.quantity || 
      item.quantity <= 0 ||
      !item.unit_price || 
      item.unit_price <= 0
    );

    if (invalidItems.length > 0) {
      return {
        success: false,
        error: `Itens inválidos encontrados: ${invalidItems.length} itens com dados incompletos`
      };
    }

    let orderInserted = false;
    let itemsInserted = 0;
    let rollbackPerformed = false;

    try {
      // 🔥 PASSO 1: INSERIR ORDER
      console.log(`[TRANSACTION:${transactionId}] 📝 Passo 1: Inserindo Order...`);
      
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error(`[TRANSACTION:${transactionId}] ❌ ERRO AO INSERIR ORDER:`, orderError);
        return {
          success: false,
          error: `Falha ao criar ordem: ${orderError.message}`
        };
      }

      orderInserted = true;
      console.log(`[TRANSACTION:${transactionId}] ✅ Order inserida com sucesso:`, orderResult?.id);

      // 🔥 PASSO 2: INSERIR ORDER ITEMS
      console.log(`[TRANSACTION:${transactionId}] 📝 Passo 2: Inserindo ${itemsData.length} OrderItems...`);
      
      const { data: itemsResult, error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsData)
        .select();

      if (itemsError) {
        console.error(`[TRANSACTION:${transactionId}] ❌ ERRO AO INSERIR ITEMS:`, itemsError);
        console.log(`[TRANSACTION:${transactionId}] 🔄 INICIANDO ROLLBACK...`);
        
        // 🛡️ ROLLBACK: Deletar a order que foi inserida
        const { error: rollbackError } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderData.id);

        if (rollbackError) {
          console.error(`[TRANSACTION:${transactionId}] ❌ ERRO NO ROLLBACK:`, rollbackError);
          return {
            success: false,
            error: `Falha catastrófica: items falhou e rollback falhou. Ordem órfã: ${orderData.id}`
          };
        }

        rollbackPerformed = true;
        console.log(`[TRANSACTION:${transactionId}] ✅ ROLLBACK CONCLUÍDO - Ordem removida`);
        
        return {
          success: false,
          error: `Falha ao inserir items. Rollback executado. Erro: ${itemsError.message}`
        };
      }

      itemsInserted = itemsResult?.length || 0;
      console.log(`[TRANSACTION:${transactionId}] ✅ ${itemsInserted} OrderItems inseridos`);

      // 🔥 PASSO 3: VERIFICAÇÃO FINAL
      console.log(`[TRANSACTION:${transactionId}] 🔍 Passo 3: Verificação final...`);
      
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('id', orderData.id)
        .single();

      if (verifyError || !verifyOrder) {
        console.error(`[TRANSACTION:${transactionId}] ⚠️ Verificação falhou:`, verifyError);
        // Não falha a transação, apenas loga
      } else {
        console.log(`[TRANSACTION:${transactionId}] ✅ Verificação OK:`, {
          id: verifyOrder.id,
          total: verifyOrder.total_amount,
          status: verifyOrder.status
        });
      }

      // 🔥 PASSO 4: VERIFICAR ITEMS
      const { data: verifyItems, error: verifyItemsError } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity')
        .eq('order_id', orderData.id);

      if (verifyItemsError) {
        console.error(`[TRANSACTION:${transactionId}] ⚠️ Erro ao verificar items:`, verifyItemsError);
      } else {
        console.log(`[TRANSACTION:${transactionId}] ✅ Items verificados:`, verifyItems?.length || 0);
      }

      console.log(`[TRANSACTION:${transactionId}] 🎉 TRANSAÇÃO CONCLUÍDA COM SUCESSO!`);

      return {
        success: true,
        orderId: orderData.id,
        details: {
          orderInserted,
          itemsInserted,
          rollbackPerformed
        }
      };

    } catch (error: any) {
      console.error(`[TRANSACTION:${transactionId}] 💥 ERRO CRÍTICO NA TRANSAÇÃO:`, error);
      
      // Tentar rollback se order foi inserida
      if (orderInserted && !rollbackPerformed) {
        console.log(`[TRANSACTION:${transactionId}] 🔄 Tentando rollback de emergência...`);
        try {
          await supabase.from('orders').delete().eq('id', orderData.id);
          rollbackPerformed = true;
          console.log(`[TRANSACTION:${transactionId}] ✅ Rollback de emergência concluído`);
        } catch (rollbackErr) {
          console.error(`[TRANSACTION:${transactionId}] ❌ Rollback de emergência falhou:`, rollbackErr);
        }
      }

      return {
        success: false,
        error: `Erro crítico na transação: ${error.message || 'Erro desconhecido'}`
      };
    }
  },

  /**
   * 🧹 LIMPAR DADOS ÓRFÃOS
   * 
   * Encontra e remove:
   * 1. Orders sem order_items
   * 2. Order_items sem order correspondente
   */
  async cleanupOrphanData(): Promise<{
    orphanedOrders: number;
    orphanedItems: number;
    cleaned: boolean;
  }> {
    console.log('[TRANSACTION:CLEANUP] 🧹 Iniciando limpeza de dados órfãos...');

    try {
      // Buscar todas as orders
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id');

      if (ordersError) {
        console.error('[TRANSACTION:CLEANUP] ❌ Erro ao buscar orders:', ordersError);
        return { orphanedOrders: 0, orphanedItems: 0, cleaned: false };
      }

      // Buscar todos os order_items
      const { data: allItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id');

      if (itemsError) {
        console.error('[TRANSACTION:CLEANUP] ❌ Erro ao buscar items:', itemsError);
        return { orphanedOrders: 0, orphanedItems: 0, cleaned: false };
      }

      const orderIds = new Set(allOrders?.map(o => o.id) || []);
      const orphanedItems = allItems?.filter(item => !orderIds.has(item.order_id)) || [];

      // Encontrar orders sem items (opcional - pode ser normal)
      const itemsOrderIds = new Set(allItems?.map(i => i.order_id) || []);
      const orphanedOrders = allOrders?.filter(order => !itemsOrderIds.has(order.id)) || [];

      console.log('[TRANSACTION:CLEANUP] 📊 Dados encontrados:', {
        totalOrders: orderIds.size,
        totalItems: allItems?.length || 0,
        orphanedOrders: orphanedOrders.length,
        orphanedItems: orphanedItems.length
      });

      // Remover items órfãos
      let itemsCleaned = 0;
      for (const item of orphanedItems) {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', item.id);
        
        if (!error) {
          itemsCleaned++;
        }
      }

      console.log('[TRANSACTION:CLEANUP] ✅ Limpeza concluída:', {
        itemsRemoved: itemsCleaned
      });

      return {
        orphanedOrders: orphanedOrders.length,
        orphanedItems: itemsCleaned,
        cleaned: true
      };

    } catch (error) {
      console.error('[TRANSACTION:CLEANUP] ❌ Erro na limpeza:', error);
      return { orphanedOrders: 0, orphanedItems: 0, cleaned: false };
    }
  }
};

export default orderTransactionService;
