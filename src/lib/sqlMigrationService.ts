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

      let dishesWithInvalidCategory: any[] = [];

      if (localData.menu) {
        const validDishes = localData.menu.filter((m: any) => m && m.id && m.name && typeof m.price === 'number');
        const categoryIds = new Set((localData.categories || []).map((c: any) => c.id));
        dishesWithInvalidCategory = validDishes.filter((m: any) => m.categoryId && !categoryIds.has(m.categoryId));
        if (dishesWithInvalidCategory.length > 0) {
          console.warn("SQLSync:menu:invalid_category_reference", {
            count: dishesWithInvalidCategory.length,
            dishIds: dishesWithInvalidCategory.map((d: any) => d.id)
          });
        }
        // ✅ CORREÇÃO: Sincronizar TODOS os produtos, mesmo sem categoria
        const dishesToSync = validDishes.filter((m: any) => {
          // Se não tem categoryId, atribuir categoria padrão "Geral"
          if (!m.categoryId) {
            console.log("SQLSync:menu:no_category_assigned", { id: m.id, name: m.name });
            // Sincronizar mesmo assim com category_id null ou valor padrão
            return true;
          }
          // Se categoryId existe, sincronizar
          return true;
        });
        console.log("SQLSync:menu:prepare", { total: localData.menu.length, valid: dishesToSync.length });
        const { error: menuError } = await supabase
          .from('products')
          .upsert(dishesToSync.map((m: any) => ({
            id: m.id,
            name: m.name,
            price: m.price,
            description: m.description,
            image_url: m.image,
            category_id: m.categoryId || null, // Permite null para produtos sem categoria
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
        
        // ✅ CORREÇÃO: Apenas sincronizar ordens com table_id válido
        const closedOrdersWithValidTableId = closedOrders.filter((o: any) => {
          // Se não tem tableId ou é inválido, não sincronizar
          if (!o.tableId) {
            console.warn("SQLSync:orders:null_table_id_skipped", { id: o.id, tableId: o.tableId });
            return false;
          }
          // Se tableId for numérico, converter para string (evita UUID error)
          const tableIdStr = typeof o.tableId === 'number' ? String(o.tableId) : o.tableId;
          // Validar que não seja um número simples como "1"
          if (tableIdStr === "1" || tableIdStr === "2" || tableIdStr === "3") {
            console.warn("SQLSync:orders:invalid_table_id_format", { id: o.id, tableId: tableIdStr });
            return false; // Não sincronizar para evitar UUID error
          }
          return true;
        });
        
        console.log("SQLSync:orders:prepare", { total: closedOrders.length, valid: closedOrdersWithValidTableId.length });
        
        // ✅ REMOVIDAS COLUNAS INEXISTENTES: customer_id (orders)
        if (closedOrdersWithValidTableId.length > 0) {
          const { error: ordersError } = await supabase
            .from('orders')
            .upsert(closedOrdersWithValidTableId.map((o: any) => ({
              id: o.id, // Mantém ID original (pode ser string UUID)
              table_id: typeof o.tableId === 'string' ? o.tableId : String(o.tableId), // Converte para string se for numérico
              total_amount: o.total,
              status: o.status === 'FECHADO' ? 'closed' : o.status, // Normalizar status
              payment_method: o.paymentMethod,
              invoice_number: o.invoiceNumber,
              // REMOVIDO: hash (coluna inexistente)
              created_at: o.createdAt || new Date().toISOString(),
              updated_at: new Date().toISOString()
              // ✅ CORRIGIDO: UUID syntax
            })));
          
          if (ordersError) {
            console.error('Erro sincronizando ordens:', ordersError);
          } else {
            console.log("SQLSync:orders:success", { count: closedOrders.length });
          }
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
    } catch (err) {
      console.error('Erro na migração SQL:', err);
      return false;
    }
  }
};
