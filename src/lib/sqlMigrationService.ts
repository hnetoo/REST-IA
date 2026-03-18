import { SystemSettings, Order } from '../../types';
import { supabase } from './supabaseService';

/**
 * SQL Kernel: Migração Inteligente e Segura
 * Arquitetura: Local First -> Cloud Sync (Push Only)
 * Objetivo: Alimentar Menu Digital e Mobile Dashboard sem interferir na estabilidade local.
 */
export const sqlMigrationService = {
  /**
   * autoMigrate: Sincroniza os dados locais para a nuvem.
   */
  async autoMigrate(settings: SystemSettings, localData: any): Promise<boolean> {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      throw new Error("Instância SQL não configurada. Insira o URL e a Key.");
    }

    console.log("SQLSync:autoMigrate:start", {
      categories: localData.categories ? localData.categories.length : 0,
      menu: localData.menu ? localData.menu.length : 0
    });

    try {
      if (localData.categories) {
        const validCategories = localData.categories.filter((c: any) => c && c.id && c.name);
        const duplicateCategoryIds = validCategories
          .map((c: any) => c.id)
          .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) !== index);
        if (duplicateCategoryIds.length > 0) {
          console.warn("SQLSync:categories:duplicated_ids", duplicateCategoryIds);
        }
        console.log("SQLSync:categories:prepare", { total: localData.categories.length, valid: validCategories.length });
        const { error: catError } = await supabase
          .from('categories')
          .upsert(validCategories.map((c: any) => ({
            id: c.id,
            name: c.name
            // REMOVIDO: visible (coluna inexistente - PGRST204)
          })));
        if (catError) console.error('Erro sincronizando categorias:', catError);
      }

      if (localData.menu) {
        // ✅ CORREÇÃO: Obter primeira categoria válida como padrão
        const validCategories = localData.categories || [];
        const firstValidCategory = validCategories.length > 0 ? validCategories[0].id : null;
        
        // ✅ SINCRONIZAÇÃO TOTAL: Enviar TODOS os itens com categoria padrão se necessário
        const allDishes = localData.menu.filter((m: any) => m && m.id && m.name && typeof m.price === 'number');
        console.log("SQLSync:menu:prepare", { total: localData.menu.length, valid: allDishes.length, defaultCategory: firstValidCategory });
        
        const { error: menuError } = await supabase
          .from('products')
          .upsert(allDishes.map((m: any) => ({
            id: m.id,
            name: m.name,
            price: m.price,
            description: m.description,
            image_url: m.image,
            category_id: m.categoryId || firstValidCategory, // ✅ Usa categoria padrão, não NULL
            // REMOVIDO: is_visible_digital (coluna inexistente - PGRST204)
            is_active: true
          })));
        if (menuError) console.error('Erro sincronizando menu:', menuError);
      }

      if (localData.activeOrders) {
        const validOrders = localData.activeOrders.filter((o: any) => o && o.id && o.status && typeof o.total === 'number');
        console.log("SQLSync:orders:prepare", { total: localData.activeOrders.length, valid: validOrders.length });
        
        // Apenas sincronizar ordens fechadas/pagas
        const closedOrders = validOrders.filter((o: any) => o.status === 'FECHADO' || o.status === 'closed' || o.status === 'paid');
        
        // ✅ SINCRONIZAÇÃO FORÇADA: Enviar ordens mesmo sem UUID mapeado
        const tables = localData.tables || [];
        const tableMap = new Map();
        
        // Criar mapeamento seguro de ID -> UUID
        tables.forEach((t: any) => {
          if (t.id && t.uuid) {
            tableMap.set(String(t.id), t.uuid);
          }
        });
        
        const closedOrdersToSync = closedOrders.map((o: any) => {
          // Tentar obter UUID real da tabela
          const tableUuid = tableMap.get(String(o.tableId));
          
          // Se não encontrar UUID, enviar com table_id null (não bloquear)
          if (!tableUuid) {
            console.warn("SQLSync:orders:table_uuid_not_found", { 
              id: o.id, 
              tableId: o.tableId,
              action: "sending_with_null_table_id"
            });
          }
          
          return {
            ...o,
            _tableUuid: tableUuid || null // UUID ou null, mas não bloqueia
          };
        });
        
        console.log("SQLSync:orders:prepare", { total: closedOrders.length, valid: closedOrdersToSync.length });
        
        // ✅ SINCRONIZAÇÃO FORÇADA: Enviar todas as ordens
        const { error: ordersError } = await supabase
          .from('orders')
          .upsert(closedOrdersToSync.map((o: any) => ({
            id: o.id, // Mantém ID original
            table_id: o._tableUuid, // UUID real ou null
            total_amount: o.total,
            status: o.status === 'FECHADO' ? 'closed' : o.status,
            payment_method: o.paymentMethod,
            invoice_number: o.invoiceNumber,
            created_at: o.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })));
          
          if (ordersError) {
            console.error('Erro sincronizando ordens:', ordersError);
          } else {
            console.log("SQLSync:orders:success", { count: closedOrders.length });
          }
        }

        const { error: stateError } = await supabase
          .from('app_settings') // ✅ CORRIGIDO: app_settings em vez de application_state
          .upsert({
            // REMOVIDO: id (pode ser auto-incremento ou UUID gerado pelo DB)
            restaurant_name: localData.settings?.restaurantName || 'REST IA OS',
            // REMOVIDO: data (coluna inexistente)
            updated_at: new Date().toISOString()
          });
        if (stateError) console.error('Erro sincronizando estado:', stateError);

        console.log("SQLSync:autoMigrate:done");

        return true;
    } catch (err: any) {
      console.error('Erro na migração SQL:', err);
      return false;
    }
  }
};
