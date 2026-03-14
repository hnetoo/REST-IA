import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

/**
 * FIX UUID SERVICE - Correção CRÍTICA de IDs
 * 
 * Serviço para corrigir IDs incorretos e garantir UUIDs reais
 */
export const fixUUIDService = {
  /**
   * LIMPEZA REAL - Apagar produtos e categorias com ID "1"
   */
  async cleanupInvalidIDs(): Promise<void> {
    console.log('[FixUUID] 🧹 INICIANDO LIMPEZA DE IDS INVÁLIDOS...');
    
    try {
      // Apagar produtos com ID "1"
      const { data: invalidProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', ['1', 1, 'cat_1', 'prod_1']);

      if (invalidProducts && invalidProducts.length > 0) {
        console.log('[FixUUID] 🗑️ APAGANDO PRODUTOS INVÁLIDOS:', invalidProducts);
        
        for (const product of invalidProducts) {
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', product.id);
          
          if (deleteError) {
            console.error('[FixUUID] ❌ ERRO AO APAGAR PRODUTO:', product.id, deleteError);
          } else {
            console.log('[FixUUID] ✅ PRODUTO APAGADO:', product.id);
          }
        }
      }

      // Apagar categorias com ID "1"
      const { data: invalidCategories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', ['1', 1, 'cat_1', 'prod_1']);

      if (invalidCategories && invalidCategories.length > 0) {
        console.log('[FixUUID] 🗑️ APAGANDO CATEGORIAS INVÁLIDAS:', invalidCategories);
        
        for (const category of invalidCategories) {
          const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', category.id);
          
          if (deleteError) {
            console.error('[FixUUID] ❌ ERRO AO APAGAR CATEGORIA:', category.id, deleteError);
          } else {
            console.log('[FixUUID] ✅ CATEGORIA APAGADA:', category.id);
          }
        }
      }

      console.log('[FixUUID] ✅ LIMPEZA DE IDS INVÁLIDOS CONCLUÍDA');
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO NA LIMPEZA:', error);
      throw error;
    }
  },

  /**
   * VERIFICAR SE EXISTEM IDS INVÁLIDOS
   */
  async checkInvalidIDs(): Promise<{ products: any[], categories: any[] }> {
    console.log('[FixUUID] 🔍 VERIFICANDO IDS INVÁLIDOS...');
    
    try {
      // Verificar produtos com IDs inválidos
      const { data: invalidProducts } = await supabase
        .from('products')
        .select('id, name')
        .in('id', ['1', 1, 'cat_1', 'prod_1']);

      // Verificar categorias com IDs inválidos
      const { data: invalidCategories } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', ['1', 1, 'cat_1', 'prod_1']);

      console.log('[FixUUID] 📊 STATUS IDS INVÁLIDOS:', {
        products: invalidProducts?.length || 0,
        categories: invalidCategories?.length || 0
      });

      return {
        products: invalidProducts || [],
        categories: invalidCategories || []
      };
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO AO VERIFICAR IDS:', error);
      return { products: [], categories: [] };
    }
  },

  /**
   * VALIDAR UUID - Verificação rigorosa de 36 caracteres
   */
  isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      console.log('[FixUUID] ❌ UUID INVÁLIDO - Tipo ou nulo:', uuid);
      return false;
    }
    
    // ✅ VERIFICAR SE TEM 36 CARACTERES OBRIGATORIAMENTE
    if (uuid.length !== 36) {
      console.log('[FixUUID] ❌ UUID INVÁLIDO - TAMANHO ERRADO:', {
        uuid,
        length: uuid.length,
        expected: 36
      });
      return false;
    }
    
    // Verificar formato UUID regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    
    if (!isValid) {
      console.log('[FixUUID] ❌ UUID INVÁLIDO - FORMATO ERRADO:', uuid);
    }
    
    return isValid;
  },

  /**
   * CRIAR PRODUTO CORRETAMENTE - SEM ENVIAR ID
   */
  async createProductCorrectly(productData: any): Promise<any> {
    console.log('[FixUUID] 🏗️ CRIANDO PRODUTO CORRETAMENTE...');
    
    try {
      // ✅ NÃO ENVIAR O CAMPO ID - DEIXAR O SUPABASE GERAR
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          description: productData.description || '',
          price: Number(productData.price),
          cost_price: Number(productData.cost_price || productData.price * 0.6),
          image_url: productData.image_url || null,
          is_active: productData.is_active !== false,
          category_id: productData.category_id // ✅ category_id NÃO categoryId
          // ✅ SEM CAMPO ID - SUPABASE VAI GERAR AUTOMATICAMENTE
        })
        .select()
        .single();

      if (error) {
        console.error('[FixUUID] ❌ ERRO AO CRIAR PRODUTO:', error);
        throw error;
      }

      if (!data || !data.id) {
        console.error('[FixUUID] ❌ PRODUTO CRIADO SEM ID:', data);
        throw new Error('Produto criado sem ID retornado');
      }

      // ✅ VALIDAR SE O ID RETORNADO É UUID VÁLIDO
      if (!this.isValidUUID(data.id)) {
        console.error('[FixUUID] ❌ ID RETORNADO NÃO É UUID VÁLIDO:', data.id);
        throw new Error(`ID inválido retornado: ${data.id} (comprimento: ${data.id.length})`);
      }

      console.log('[FixUUID] ✅ PRODUTO CRIADO COM UUID VÁLIDO:', {
        id: data.id,
        name: data.name,
        uuidLength: data.id.length,
        isValidUUID: this.isValidUUID(data.id)
      });

      return data;
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO CRÍTICO AO CRIAR PRODUTO:', error);
      throw error;
    }
  },

  /**
   * CRIAR CATEGORIA CORRETAMENTE - SEM ENVIAR ID
   */
  async createCategoryCorrectly(categoryData: any): Promise<any> {
    console.log('[FixUUID] 🏗️ CRIANDO CATEGORIA CORRETAMENTE...');
    
    try {
      // ✅ NÃO ENVIAR O CAMPO ID - DEIXAR O SUPABASE GERAR
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: categoryData.name
          // ✅ SEM CAMPO ID - SUPABASE VAI GERAR AUTOMATICAMENTE
        })
        .select()
        .single();

      if (error) {
        console.error('[FixUUID] ❌ ERRO AO CRIAR CATEGORIA:', error);
        throw error;
      }

      if (!data || !data.id) {
        console.error('[FixUUID] ❌ CATEGORIA CRIADA SEM ID:', data);
        throw new Error('Categoria criada sem ID retornado');
      }

      // ✅ VALIDAR SE O ID RETORNADO É UUID VÁLIDO
      if (!this.isValidUUID(data.id)) {
        console.error('[FixUUID] ❌ ID RETORNADO NÃO É UUID VÁLIDO:', data.id);
        throw new Error(`ID inválido retornado: ${data.id} (comprimento: ${data.id.length})`);
      }

      console.log('[FixUUID] ✅ CATEGORIA CRIADA COM UUID VÁLIDO:', {
        id: data.id,
        name: data.name,
        uuidLength: data.id.length,
        isValidUUID: this.isValidUUID(data.id)
      });

      return data;
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO CRÍTICO AO CRIAR CATEGORIA:', error);
      throw error;
    }
  },

  /**
   * VERIFICAR TODOS OS PRODUTOS - Alertar se encontrar IDs inválidos
   */
  async validateAllProducts(): Promise<{ valid: number, invalid: any[] }> {
    console.log('[FixUUID] 🔍 VALIDANDO TODOS OS PRODUTOS...');
    
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name');

      if (error) {
        console.error('[FixUUID] ❌ ERRO AO BUSCAR PRODUTOS:', error);
        return { valid: 0, invalid: [] };
      }

      const invalid = products?.filter(p => !this.isValidUUID(p.id)) || [];
      const valid = products?.filter(p => this.isValidUUID(p.id))?.length || 0;

      if (invalid.length > 0) {
        console.error('[FixUUID] ❌ PRODUTOS COM UUIDS INVÁLIDOS:', invalid);
      }

      console.log('[FixUUID] 📊 VALIDAÇÃO DE PRODUTOS:', {
        total: products?.length || 0,
        valid,
        invalid: invalid.length
      });

      return { valid, invalid };
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO NA VALIDAÇÃO:', error);
      return { valid: 0, invalid: [] };
    }
  },

  /**
   * VERIFICAR TODAS AS CATEGORIAS - Alertar se encontrar IDs inválidos
   */
  async validateAllCategories(): Promise<{ valid: number, invalid: any[] }> {
    console.log('[FixUUID] 🔍 VALIDANDO TODAS AS CATEGORIAS...');
    
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name');

      if (error) {
        console.error('[FixUUID] ❌ ERRO AO BUSCAR CATEGORIAS:', error);
        return { valid: 0, invalid: [] };
      }

      const invalid = categories?.filter(c => !this.isValidUUID(c.id)) || [];
      const valid = categories?.filter(c => this.isValidUUID(c.id))?.length || 0;

      if (invalid.length > 0) {
        console.error('[FixUUID] ❌ CATEGORIAS COM UUIDS INVÁLIDOS:', invalid);
      }

      console.log('[FixUUID] 📊 VALIDAÇÃO DE CATEGORIAS:', {
        total: categories?.length || 0,
        valid,
        invalid: invalid.length
      });

      return { valid, invalid };
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO NA VALIDAÇÃO:', error);
      return { valid: 0, invalid: [] };
    }
  },

  /**
   * CORREÇÃO COMPLETA - Executar todas as correções
   */
  async performCompleteFix(): Promise<boolean> {
    console.log('[FixUUID] 🔧 INICIANDO CORREÇÃO COMPLETA...');
    
    try {
      // 1. Limpar IDs inválidos
      await this.cleanupInvalidIDs();
      
      // 2. Validar produtos
      const productValidation = await this.validateAllProducts();
      
      // 3. Validar categorias
      const categoryValidation = await this.validateAllCategories();
      
      // 4. Verificar se ainda existem problemas
      const invalidCheck = await this.checkInvalidIDs();
      
      const success = invalidCheck.products.length === 0 && 
                     invalidCheck.categories.length === 0 &&
                     productValidation.invalid.length === 0 &&
                     categoryValidation.invalid.length === 0;

      console.log('[FixUUID] 📊 RESULTADO CORREÇÃO COMPLETA:', {
        success,
        invalidProducts: invalidCheck.products.length,
        invalidCategories: invalidCheck.categories.length,
        invalidProductUUIDs: productValidation.invalid.length,
        invalidCategoryUUIDs: categoryValidation.invalid.length
      });

      return success;
    } catch (error) {
      console.error('[FixUUID] ❌ ERRO NA CORREÇÃO COMPLETA:', error);
      return false;
    }
  }
};
