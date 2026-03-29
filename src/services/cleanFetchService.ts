import { supabase } from '../lib/supabaseService';
import { useStore } from '../store/useStore';

/**
 * CLEAN FETCH SERVICE - Busca limpa do Supabase sem corrupção
 * 
 * PROBLEMA RESOLVIDO:
 * - Mapeamento FIEL: category_id -> categoryId, image_url -> image
 * - SEM defaults forçados ("Bebidas", null)
 * - SINCRONIZAÇÃO DIRETA: O que está no Supabase aparece na App
 */
export const cleanFetchService = {
  /**
   * Buscar produtos do Supabase sem corrupção
   */
  async fetchCleanProducts(): Promise<any[]> {
    console.log('[CleanFetch] 🔄 Buscando produtos LIMPOS do Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          image_url,
          category_id,
          is_active,
          is_available,
          created_at,
          updated_at
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('[CleanFetch] ❌ Erro ao buscar produtos:', error);
        throw error;
      }

      if (!data) {
        console.warn('[CleanFetch] ⚠️ Nenhum produto encontrado');
        return [];
      }

      // ✅ MAPEAMENTO FIEL: Converter para formato local sem perdas
      const cleanProducts = data.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.image_url, // ✅ Mapeamento direto
        categoryId: product.category_id, // ✅ Mapeamento direto
        isVisibleDigital: true,
        isFeatured: false,
        is_active: product.is_active,
        is_available: product.is_available,
        created_at: product.created_at,
        updated_at: product.updated_at,
        // Manter campos originais para compatibilidade
        image_url: product.image_url,
        category_id: product.category_id
      }));

      console.log('[CleanFetch] ✅ Produtos mapeados com FIDELIDADE:', {
        total: cleanProducts.length,
        sample: cleanProducts.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          categoryId: p.categoryId,
          hasImage: !!p.image
        }))
      });

      return cleanProducts;
    } catch (error) {
      console.error('[CleanFetch] ❌ Erro crítico no fetch de produtos:', error);
      throw error;
    }
  },

  /**
   * Buscar categorias do Supabase sem corrupção
   */
  async fetchCleanCategories(): Promise<any[]> {
    console.log('[CleanFetch] 🔄 Buscando categorias LIMPAS do Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          image_url,
          created_at,
          updated_at
        `)
        .order('name');

      if (error) {
        console.error('[CleanFetch] ❌ Erro ao buscar categorias:', error);
        throw error;
      }

      if (!data) {
        console.warn('[CleanFetch] ⚠️ Nenhuma categoria encontrada');
        return [];
      }

      // ✅ MAPEAMENTO FIEL: Converter para formato local
      const cleanCategories = data.map(category => ({
        id: category.id,
        name: category.name,
        icon: this.getCategoryIcon(category.name),
        isVisibleDigital: true,
        image_url: category.image_url,
        created_at: category.created_at,
        updated_at: category.updated_at
      }));

      console.log('[CleanFetch] ✅ Categorias mapeadas com FIDELIDADE:', {
        total: cleanCategories.length,
        categories: cleanCategories.map(c => c.name)
      });

      return cleanCategories;
    } catch (error) {
      console.error('[CleanFetch] ❌ Erro crítico no fetch de categorias:', error);
      throw error;
    }
  },

  /**
   * Obter ícone baseado no nome da categoria
   */
  getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      'Entradas': 'Coffee',
      'Pratos Principais': 'Pizza',
      'Bebidas': 'Beer',
      'Sobremesas': 'IceCream',
      'Grelhados': 'Flame',
      'Petiscos': 'Coffee',
      'Sumos': 'Glass',
      'Águas': 'Droplet'
    };

    // Procurar correspondência exata
    if (iconMap[categoryName]) {
      return iconMap[categoryName];
    }

    // Procurar correspondência parcial
    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }

    return 'Tag'; // Default
  },

  /**
   * Limpar cache corrompido e buscar dados limpos
   */
  async cleanAndFetch(): Promise<void> {
    console.log('[CleanFetch] 🧹 LIMPANDO CACHE CORROMPIDO...');
    
    try {
      const store = useStore.getState();
      const localProducts = store.menu || [];
      const localCategories = store.categories || [];
      
      // 1. Limpar dados locais corrompidos
      console.log('[CleanFetch] 🗑️ Limpando dados locais...');
      
      // Usar método removeDish para limpar produtos
      localProducts.forEach((product: any) => {
        if (store.removeDish) {
          store.removeDish(product.id);
        }
      });
      
      // Usar método removeCategory para limpar categorias
      localCategories.forEach((category: any) => {
        if (store.removeCategory) {
          store.removeCategory(category.id);
        }
      });
      
      // Limpar localStorage
      localStorage.removeItem('tasca_db_backups');
      localStorage.removeItem('tasca_db_logs');
      
      console.log('[CleanFetch] ✅ Cache limpo');
      
      // 2. Buscar dados limpos do Supabase
      console.log('[CleanFetch] 📦 Buscando dados LIMPOS do Supabase...');
      
      const [cleanProducts, cleanCategories] = await Promise.all([
        this.fetchCleanProducts(),
        this.fetchCleanCategories()
      ]);
      
      // 3. Atualizar store com dados limpos
      console.log('[CleanFetch] 🔄 Atualizando store com dados LIMPOS...');
      
      // Adicionar categorias limpas
      cleanCategories.forEach(category => {
        if (store.addCategory) {
          store.addCategory(category);
        }
      });
      
      // Adicionar produtos limpos
      cleanProducts.forEach(product => {
        if (store.addDish) {
          store.addDish(product);
        }
      });
      
      console.log('[CleanFetch] ✅ DADOS LIMPOS CARREGADOS:', {
        products: cleanProducts.length,
        categories: cleanCategories.length,
        categoriesList: cleanCategories.map(c => c.name)
      });
      
      // 4. Notificar sucesso
      if (store.addNotification) {
        store.addNotification('success', `Carregados ${cleanProducts.length} produtos e ${cleanCategories.length} categorias do Supabase`);
      }
      
    } catch (error: any) {
      console.error('[CleanFetch] ❌ Erro na limpeza e fetch:', error);
      
      const store = useStore.getState();
      if (store.addNotification) {
        store.addNotification('error', `Erro ao carregar dados: ${error.message}`);
      }
      
      throw error;
    }
  },

  /**
   * Verificar integridade dos dados atuais
   */
  async checkIntegrity(): Promise<{
    isCorrupted: boolean;
    issues: string[];
    localProducts: number;
    localCategories: number;
  }> {
    console.log('[CleanFetch] 🔍 Verificando integridade dos dados...');
    
    try {
      const store = useStore.getState();
      const localProducts = store.menu || [];
      const localCategories = store.categories || [];
      
      const issues: string[] = [];
      
      // Verificar produtos sem categoria válida
      const productsWithoutCategory = localProducts.filter(p => 
        !p.categoryId || p.categoryId === 'cat_bebidas' && p.name && !p.name.toLowerCase().includes('cuca') && !p.name.toLowerCase().includes('bebida')
      );
      
      if (productsWithoutCategory.length > 0) {
        issues.push(`${productsWithoutCategory.length} produtos sem categoria válida ou forçados para "Bebidas"`);
      }
      
      // Verificar produtos sem imagem
      const productsWithoutImage = localProducts.filter(p => !p.image && !p.image_url);
      
      if (productsWithoutImage.length > 0) {
        issues.push(`${productsWithoutImage.length} produtos sem imagem`);
      }
      
      // Verificar categorias duplicadas
      const categoryNames = localCategories.map(c => c.name);
      const duplicateCategories = categoryNames.filter((name, index) => categoryNames.indexOf(name) !== index);
      
      if (duplicateCategories.length > 0) {
        issues.push(`Categorias duplicadas: ${duplicateCategories.join(', ')}`);
      }
      
      const isCorrupted = issues.length > 0;
      
      console.log('[CleanFetch] 📊 Verificação de integridade:', {
        isCorrupted,
        issues,
        localProducts: localProducts.length,
        localCategories: localCategories.length
      });
      
      return {
        isCorrupted,
        issues,
        localProducts: localProducts.length,
        localCategories: localCategories.length
      };
      
    } catch (error) {
      console.error('[CleanFetch] ❌ Erro na verificação de integridade:', error);
      return {
        isCorrupted: true,
        issues: ['Erro na verificação de integridade'],
        localProducts: 0,
        localCategories: 0
      };
    }
  }
};
