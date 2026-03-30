/**
 * 🛠️ SCRIPT DE CORREÇÃO: Atualizar orders pending -> closed
 * 
 * Este script atualiza todas as orders com status 'pending' para 'closed'
 * no Supabase, garantindo que o Dashboard mostre os valores corretos.
 */

import { supabase } from '../src/supabase_standalone';

async function fixPendingOrders(): Promise<{
  updated: number;
  errors: string[];
}> {
  console.log('🔧 [FIX_PENDING] Iniciando correção de orders pending...');
  
  const result = {
    updated: 0,
    errors: [] as string[]
  };

  try {
    // 1. Buscar todas as orders com status 'pending'
    console.log('🔍 [FIX_PENDING] Buscando orders com status pending...');
    
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('status', 'pending');

    if (fetchError) {
      console.error('❌ [FIX_PENDING] Erro ao buscar orders:', fetchError);
      result.errors.push(`Erro ao buscar: ${fetchError.message}`);
      return result;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('✅ [FIX_PENDING] Nenhuma order pending encontrada. Sistema limpo!');
      return result;
    }

    console.log(`📊 [FIX_PENDING] Encontradas ${pendingOrders.length} orders pending:`);
    pendingOrders.forEach(order => {
      console.log(`   - ${order.id}: ${order.total_amount} Kz (${order.created_at})`);
    });

    // 2. Atualizar cada order para 'closed'
    for (const order of pendingOrders) {
      try {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'closed',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ [FIX_PENDING] Erro ao atualizar ${order.id}:`, updateError);
          result.errors.push(`Order ${order.id}: ${updateError.message}`);
        } else {
          console.log(`✅ [FIX_PENDING] Order ${order.id} atualizada: pending -> closed`);
          result.updated++;
        }
      } catch (err: any) {
        console.error(`❌ [FIX_PENDING] Erro crítico em ${order.id}:`, err);
        result.errors.push(`Order ${order.id}: ${err.message}`);
      }
    }

    // 3. Verificar se há items órfãos para essas orders
    console.log('🔍 [FIX_PENDING] Verificando integridade de dados...');
    
    for (const order of pendingOrders) {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', order.id);

      if (itemsError) {
        console.error(`⚠️ [FIX_PENDING] Erro ao verificar items de ${order.id}:`, itemsError);
      } else if (!items || items.length === 0) {
        console.warn(`⚠️ [FIX_PENDING] Order ${order.id} NÃO TEM ITENS! Dado inconsistente.`);
      } else {
        console.log(`✅ [FIX_PENDING] Order ${order.id} tem ${items.length} items`);
      }
    }

    console.log('\n📊 [FIX_PENDING] RESUMO:');
    console.log(`   - Orders atualizadas: ${result.updated}`);
    console.log(`   - Erros: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('   - Detalhes dos erros:');
      result.errors.forEach(err => console.log(`      * ${err}`));
    }

    return result;

  } catch (error: any) {
    console.error('💥 [FIX_PENDING] Erro crítico:', error);
    result.errors.push(`Erro crítico: ${error.message}`);
    return result;
  }
}

// Executar se rodado diretamente
if (require.main === module) {
  fixPendingOrders()
    .then(result => {
      if (result.errors.length === 0) {
        console.log('\n🎉 [FIX_PENDING] Correção concluída com sucesso!');
        process.exit(0);
      } else {
        console.log('\n⚠️ [FIX_PENDING] Correção concluída com alguns erros.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 [FIX_PENDING] Erro fatal:', error);
      process.exit(1);
    });
}

export { fixPendingOrders };
