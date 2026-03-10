
import { SystemSettings } from '../types';
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
            name: c.name,
            icon: c.icon,
            visible: typeof c.isVisibleDigital === 'boolean' ? c.isVisibleDigital : true
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
        const dishesWithValidCategory = validDishes.filter((m: any) => !m.categoryId || categoryIds.has(m.categoryId));
        console.log("SQLSync:menu:prepare", { total: localData.menu.length, valid: dishesWithValidCategory.length });
        const { error: menuError } = await supabase
          .from('dishes')
          .upsert(dishesWithValidCategory.map((m: any) => ({
            id: m.id,
            name: m.name,
            price: m.price,
            description: m.description,
            image_url: m.image,
            category_id: m.categoryId,
            is_visible_digital: typeof m.isVisibleDigital === 'boolean' ? m.isVisibleDigital : true,
            is_featured: typeof m.isFeatured === 'boolean' ? m.isFeatured : false
          })));
        if (menuError) console.error('Erro sincronizando menu:', menuError);
      }

      const { error: stateError } = await supabase
        .from('application_state')
        .upsert({
          id: 'current_state',
          data: JSON.stringify(localData),
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
