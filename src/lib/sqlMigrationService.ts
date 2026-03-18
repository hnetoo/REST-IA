import { SystemSettings, Order } from '../../types';
import { supabase } from './supabaseService';
import { v4 as uuidv4 } from 'uuid';

/**
 * SQL Kernel: Migração Inteligente e Segura
 * Arquitetura: Local First -> Cloud Sync (Push Only)
 * Objetivo: Alimentar Menu Digital e Mobile Dashboard sem interferir na estabilidade local.
 */
export const sqlMigrationService = {
  /**
   * autoMigrate: Sincroniza os dados locais para a nuvem com segurança máxima
   */
  async autoMigrate(settings: SystemSettings, localData: any): Promise<{
    success: boolean;
    status: 'synced' | 'pending' | 'conflict';
    details: any;
  }> {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      throw new Error("Instância SQL não configurada. Insira o URL e a Key.");
    }

    console.log("SQLSync:autoMigrate:start", {
      categories: localData.categories ? localData.categories.length : 0,
      menu: localData.menu ? localData.menu.length : 0
    });

    try {
      let syncStatus: 'synced' | 'pending' | 'conflict' = 'synced';
      const syncDetails = {
        categories: { updated: 0, conflicts: 0, errors: 0 },
        products: { updated: 0, conflicts: 0, errors: 0 },
        orders: { updated: 0, conflicts: 0, errors: 0 }
      };

      // 1. SINCRONIZAÇÃO DE CATEGORIAS COM LAST-WRITE-WINS
      if (localData.categories) {
        const validCategories = localData.categories.filter((c: any) => c && c.id && c.name);
        
        for (const category of validCategories) {
          try {
            // Verificar timestamp no Supabase
            const { data: existingCategory, error: fetchError } = await supabase
              .from('categories')
              .select('updated_at')
              .eq('id', category.id)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Erro ao buscar categoria:', fetchError);
              syncDetails.categories.errors++;
              continue;
            }

            const localUpdatedAt = new Date(category.updatedAt || Date.now());
            const remoteUpdatedAt = existingCategory ? new Date(existingCategory.updated_at) : new Date(0);

            if (localUpdatedAt > remoteUpdatedAt) {
              // Local é mais recente - fazer update parcial
              const updateData: any = { name: category.name };
              
              const { error: updateError } = await supabase
                .from('categories')
                .update(updateData)
                .eq('id', category.id);

              if (updateError) {
                console.error('Erro ao atualizar categoria:', updateError);
                syncDetails.categories.errors++;
              } else {
                syncDetails.categories.updated++;
                console.log(`✅ Categoria atualizada: ${category.name}`);
              }
            } else if (remoteUpdatedAt > localUpdatedAt) {
              // Conflito - remoto mais recente
              syncDetails.categories.conflicts++;
              syncStatus = 'conflict';
              console.warn(`⚠️ Conflito na categoria ${category.name}: remoto mais recente`);
            }
          } catch (err) {
            console.error('Erro crítico na categoria:', err);
            syncDetails.categories.errors++;
          }
        }
      }

      // 2. SINCRONIZAÇÃO DE PRODUTOS COM CRIAÇÃO SEGURA E PATCH PARCIAL
      if (localData.menu) {
        const allDishes = localData.menu.filter((m: any) => m && m.id && m.name && typeof m.price === 'number');
        
        for (const product of allDishes) {
          try {
            // Garantir UUID v4 para novos produtos
            const productId = product.id.startsWith('prod-') ? uuidv4() : product.id;

            // Verificar timestamp no Supabase
            const { data: existingProduct, error: fetchError } = await supabase
              .from('products')
              .select('updated_at, price, description, image_url, category_id')
              .eq('id', productId)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Erro ao buscar produto:', fetchError);
              syncDetails.products.errors++;
              continue;
            }

            const localUpdatedAt = new Date(product.updatedAt || Date.now());
            const remoteUpdatedAt = existingProduct ? new Date(existingProduct.updated_at) : new Date(0);

            if (localUpdatedAt > remoteUpdatedAt) {
              // Local é mais recente - fazer update PARCIAL apenas dos campos alterados
              const updateData: any = { updated_at: new Date().toISOString() };
              
              // Verificar quais campos foram alterados e enviar apenas eles
              if (existingProduct) {
                if (existingProduct.price !== product.price) {
                  updateData.price = product.price;
                }
                if (existingProduct.description !== product.description) {
                  updateData.description = product.description;
                }
                // PROIBIÇÃO: Nunca enviar image_url se não foi alterado explicitamente
                if (product.imageChanged && product.image) {
                  updateData.image_url = product.image;
                }
                if (existingProduct.category_id !== product.categoryId) {
                  updateData.category_id = product.categoryId;
                }
              } else {
                // Novo produto - enviar todos os campos exceto image_url se não existir
                updateData.name = product.name;
                updateData.price = product.price;
                updateData.description = product.description;
                updateData.category_id = product.categoryId;
                updateData.is_active = true;
                if (product.image) {
                  updateData.image_url = product.image;
                }
              }

              const { error: updateError } = await supabase
                .from('products')
                .upsert({ id: productId, ...updateData });

              if (updateError) {
                console.error('Erro ao atualizar produto:', updateError);
                syncDetails.products.errors++;
              } else {
                syncDetails.products.updated++;
                console.log(`✅ Produto atualizado: ${product.name}`);
              }
            } else if (remoteUpdatedAt > localUpdatedAt) {
              // Conflito - remoto mais recente
              syncDetails.products.conflicts++;
              syncStatus = 'conflict';
              console.warn(`⚠️ Conflito no produto ${product.name}: remoto mais recente`);
            }
          } catch (err) {
            console.error('Erro crítico no produto:', err);
            syncDetails.products.errors++;
          }
        }
      }

      // 3. SINCRONIZAÇÃO DE ORDENS (APENAS FECHADAS)
      if (localData.activeOrders) {
        const validOrders = localData.activeOrders.filter((o: any) => o && o.id && o.status && typeof o.total === 'number');
        const closedOrders = validOrders.filter((o: any) => o.status === 'FECHADO' || o.status === 'closed' || o.status === 'paid');
        
        for (const order of closedOrders) {
          try {
            const { data: existingOrder, error: fetchError } = await supabase
              .from('orders')
              .select('updated_at')
              .eq('id', order.id)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Erro ao buscar ordem:', fetchError);
              syncDetails.orders.errors++;
              continue;
            }

            const localUpdatedAt = new Date(order.updatedAt || Date.now());
            const remoteUpdatedAt = existingOrder ? new Date(existingOrder.updated_at) : new Date(0);

            if (localUpdatedAt > remoteUpdatedAt) {
              const tables = localData.tables || [];
              const tableMap = new Map();
              
              tables.forEach((t: any) => {
                if (t.id && t.uuid) {
                  tableMap.set(String(t.id), t.uuid);
                }
              });
              
              const tableUuid = tableMap.get(String(order.tableId));

              const { error: updateError } = await supabase
                .from('orders')
                .upsert({
                  id: order.id,
                  table_id: tableUuid || null,
                  total_amount: order.total,
                  status: order.status === 'FECHADO' ? 'closed' : order.status,
                  payment_method: order.paymentMethod,
                  invoice_number: order.invoiceNumber,
                  created_at: order.createdAt || new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (updateError) {
                console.error('Erro ao atualizar ordem:', updateError);
                syncDetails.orders.errors++;
              } else {
                syncDetails.orders.updated++;
                console.log(`✅ Ordem atualizada: ${order.id}`);
              }
            } else if (remoteUpdatedAt > localUpdatedAt) {
              syncDetails.orders.conflicts++;
              syncStatus = 'conflict';
              console.warn(`⚠️ Conflito na ordem ${order.id}: remoto mais recente`);
            }
          } catch (err) {
            console.error('Erro crítico na ordem:', err);
            syncDetails.orders.errors++;
          }
        }
      }

      // 4. ATUALIZAR SETTINGS DA APLICAÇÃO
      try {
        const { error: stateError } = await supabase
          .from('app_settings')
          .upsert({
            restaurant_name: localData.settings?.restaurantName || 'REST IA OS',
            updated_at: new Date().toISOString()
          });
        if (stateError) console.error('Erro sincronizando estado:', stateError);
      } catch (err) {
        console.error('Erro crítico nos settings:', err);
      }

      console.log("SQLSync:autoMigrate:done", { status: syncStatus, details: syncDetails });

      return {
        success: syncDetails.categories.errors === 0 && syncDetails.products.errors === 0 && syncDetails.orders.errors === 0,
        status: syncStatus,
        details: syncDetails
      };

    } catch (err: any) {
      console.error('Erro na migração SQL:', err);
      return {
        success: false,
        status: 'pending',
        details: { error: err.message }
      };
    }
  }
};
