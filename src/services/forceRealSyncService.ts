import { supabase } from '../supabase_standalone';
import { useStore } from '../store/useStore';

/**
 * FORCE REAL SYNC SERVICE - Sincronização REAL com Supabase
 * 
 * Serviço para forçar sincronização real com o banco de dados
 * e eliminar dados locais falsos
 */
export const forceRealSyncService = {
  /**
   * FORÇA SINCRONIZAÇÃO REAL - Fetch obrigatório do Supabase
   */
  async forceRealSync(): Promise<void> {
    console.log('[ForceRealSync] 🔄 FORÇANDO SINCRONIZAÇÃO REAL COM SUPABASE...');
    
    try {
      // 1. VERIFICAR STATUS REAL DO SUPABASE
      const { data: productsCheck, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .limit(5);

      const { data: categoriesCheck, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .limit(5);

      console.log('[ForceRealSync] 📊 STATUS REAL DO SUPABASE:', {
        products: productsCheck?.length || 0,
        categories: categoriesCheck?.length || 0,
        productsError: productsError?.message,
        categoriesError: categoriesError?.message
      });

      // 2. SE TABELAS ESTIVEREM VAZIAS, LIMPAR DADOS LOCAIS
      if ((!productsCheck || productsCheck.length === 0) || 
          (!categoriesCheck || categoriesCheck.length === 0)) {
        console.log('[ForceRealSync] 🧹 TABELAS VAZIAS DETECTADAS - LIMPANDO DADOS LOCAIS...');
        await this.clearLocalData();
        
        // 3. CRIAR CATEGORIAS REAIS NO BANCO
        if (!categoriesCheck || categoriesCheck.length === 0) {
          console.log('[ForceRealSync] 🏗️ CRIANDO CATEGORIAS REAIS NO BANCO...');
          await this.createRealCategories();
        }
        
        // 4. FORÇAR RECARREGAMENTO DA APP
        this.forceReload();
      } else {
        // 5. SE TIVER DADOS, SINCRONIZAR COM O BANCO
        console.log('[ForceRealSync] 📦 SINCRONIZANDO DADOS REAIS DO BANCO...');
        await this.syncFromSupabase();
      }
      
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO NA SINCRONIZAÇÃO FORÇADA:', error);
      throw error;
    }
  },

  /**
   * LIMPAR DADOS LOCAIS FALSOS
   */
  async clearLocalData(): Promise<void> {
    console.log('[ForceRealSync] 🗑️ LIMPANDO DADOS LOCAIS FALSOS...');
    
    try {
      const store = useStore.getState();
      
      // Limpar produtos locais falsos
      if (store.menu && store.menu.length > 0) {
        console.log('[ForceRealSync] 🗑️ APAGANDO PRODUTOS LOCAIS:', store.menu.length);
        // Limpar manualmente
        store.setMenu([]);
        store.setCategories([]);
      }
      
      // Limpar localStorage
      localStorage.clear();
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      console.log('[ForceRealSync] ✅ DADOS LOCAIS LIMPOS');
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO AO LIMPAR DADOS LOCAIS:', error);
    }
  },

  /**
   * 🔍 DIAGNOSTICAR E CORRIGIR CATEGORIAS INVÁLIDAS NO SUPABASE
   * 
   * Verifica quais categorias têm IDs inválidos e oferece opções de correção
   */
  async diagnoseAndFixCategories(): Promise<{ invalid: any[], valid: any[], action?: string }> {
    console.log('[ForceRealSync] 🔍 DIAGNOSTICANDO CATEGORIAS NO SUPABASE...');
    
    try {
      // Buscar TODAS as categorias do Supabase
      const { data: allCategories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('[ForceRealSync] ❌ ERRO AO BUSCAR CATEGORIAS:', error);
        throw error;
      }
      
      if (!allCategories || allCategories.length === 0) {
        console.log('[ForceRealSync] ⚠️ NENHUMA CATEGORIA ENCONTRADA NO SUPABASE');
        return { invalid: [], valid: [] };
      }
      
      console.log('[ForceRealSync] 📊 TOTAL DE CATEGORIAS:', allCategories.length);
      
      // Separar válidas e inválidas
      const invalidCategories: any[] = [];
      const validCategories: any[] = [];
      
      allCategories.forEach((cat: any) => {
        const isValid = this.isValidUUID(cat.id);
        if (isValid) {
          validCategories.push(cat);
        } else {
          invalidCategories.push({
            ...cat,
            idLength: cat.id?.length || 0,
            idType: typeof cat.id
          });
        }
      });
      
      console.log('[ForceRealSync] 📋 DIAGNÓSTICO:', {
        total: allCategories.length,
        valid: validCategories.length,
        invalid: invalidCategories.length
      });
      
      if (invalidCategories.length > 0) {
        console.warn('[ForceRealSync] ❌ CATEGORIAS COM IDs INVÁLIDOS:', 
          invalidCategories.map(c => ({ 
            id: c.id, 
            name: c.name, 
            length: c.idLength,
            type: c.idType 
          }))
        );
        
        // Verificar se há produtos usando essas categorias inválidas
        const { data: productsWithInvalidCats } = await supabase
          .from('products')
          .select('id, name, category_id')
          .in('category_id', invalidCategories.map(c => c.id));
        
        console.log('[ForceRealSync] 🔗 PRODUTOS USANDO CATEGORIAS INVÁLIDAS:', 
          productsWithInvalidCats?.length || 0
        );
        
        // 🚨 CORREÇÃO AUTOMÁTICA - Deletar categorias inválidas sem confirmação
        console.log('[ForceRealSync] 🛠️ CORRIGINDO AUTOMATICAMENTE CATEGORIAS INVÁLIDAS...');
        await this.fixInvalidCategories(invalidCategories, 'delete');
        console.log('[ForceRealSync] ✅ CATEGORIAS INVÁLIDAS CORRIGIDAS AUTOMATICAMENTE');
        
        return { 
          invalid: invalidCategories, 
          valid: validCategories,
          action: 'AUTO_FIXED'
        };
      }
      
      console.log('[ForceRealSync] ✅ TODAS AS CATEGORIAS TÊM UUIDS VÁLIDOS');
      return { invalid: [], valid: validCategories };
      
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO NO DIAGNÓSTICO:', error);
      throw error;
    }
  },

  /**
   * 🛠️ CORRIGIR CATEGORIAS INVÁLIDAS
   * 
   * Opções:
   * 1. 'delete' - Apagar categorias inválidas (e produtos vinculados)
   * 2. 'recreate' - Recriar categorias com UUIDs válidos
   * 3. 'migrate' - Migrar produtos para categoria válida existente
   */
  async fixInvalidCategories(
    invalidCategories: any[], 
    strategy: 'delete' | 'recreate' | 'migrate' = 'delete',
    targetCategoryId?: string
  ): Promise<void> {
    console.log('[ForceRealSync] 🛠️ CORRIGINDO CATEGORIAS INVÁLIDAS...', { strategy });
    
    try {
      for (const cat of invalidCategories) {
        console.log(`[ForceRealSync] Processando categoria inválida: ${cat.name} (${cat.id})`);
        
        if (strategy === 'delete') {
          // Apagar produtos vinculados primeiro (se houver)
          const { data: linkedProducts } = await supabase
            .from('products')
            .select('id')
            .eq('category_id', cat.id);
          
          if (linkedProducts && linkedProducts.length > 0) {
            console.log(`[ForceRealSync] 🗑️ Apagando ${linkedProducts.length} produtos vinculados...`);
            await supabase
              .from('products')
              .delete()
              .eq('category_id', cat.id);
          }
          
          // Apagar categoria inválida
          const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', cat.id);
          
          if (deleteError) {
            console.error(`[ForceRealSync] ❌ Erro ao apagar categoria ${cat.name}:`, deleteError);
          } else {
            console.log(`[ForceRealSync] ✅ Categoria apagada: ${cat.name}`);
          }
          
        } else if (strategy === 'recreate') {
          // Criar nova categoria com UUID válido
          const { data: newCat, error: createError } = await supabase
            .from('categories')
            .insert({ name: cat.name })
            .select()
            .single();
          
          if (createError) {
            console.error(`[ForceRealSync] ❌ Erro ao recriar categoria ${cat.name}:`, createError);
            continue;
          }
          
          console.log(`[ForceRealSync] ✅ Categoria recriada: ${cat.name} → ${newCat.id}`);
          
          // Migrar produtos para nova categoria
          const { data: linkedProducts } = await supabase
            .from('products')
            .select('id')
            .eq('category_id', cat.id);
          
          if (linkedProducts && linkedProducts.length > 0) {
            console.log(`[ForceRealSync] 🔄 Migrando ${linkedProducts.length} produtos...`);
            for (const prod of linkedProducts) {
              await supabase
                .from('products')
                .update({ category_id: newCat.id })
                .eq('id', prod.id);
            }
          }
          
          // Apagar categoria antiga
          await supabase.from('categories').delete().eq('id', cat.id);
          console.log(`[ForceRealSync] ✅ Categoria antiga removida: ${cat.id}`);
          
        } else if (strategy === 'migrate' && targetCategoryId) {
          // Migrar produtos para categoria existente
          const { data: linkedProducts } = await supabase
            .from('products')
            .select('id')
            .eq('category_id', cat.id);
          
          if (linkedProducts && linkedProducts.length > 0) {
            console.log(`[ForceRealSync] 🔄 Migrando ${linkedProducts.length} produtos para ${targetCategoryId}...`);
            await supabase
              .from('products')
              .update({ category_id: targetCategoryId })
              .eq('category_id', cat.id);
          }
          
          // Apagar categoria inválida
          await supabase.from('categories').delete().eq('id', cat.id);
          console.log(`[ForceRealSync] ✅ Categoria migrada e removida: ${cat.name}`);
        }
      }
      
      console.log('[ForceRealSync] ✅ CORREÇÃO CONCLUÍDA');
      
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO AO CORRIGIR CATEGORIAS:', error);
      throw error;
    }
  },

  /**
   * CRIAR CATEGORIAS REAIS NO BANCO
   */
  async createRealCategories(): Promise<void> {
    console.log('[ForceRealSync] 🏗️ CRIANDO CATEGORIAS REAIS NO SUPABASE...');
    
    try {
      const realCategories = [
        { name: 'Entradas' },
        { name: 'Pratos Principais' },
        { name: 'Bebidas' },
        { name: 'Sobremesas' }
      ];

      for (const category of realCategories) {
        // ✅ NÃO ENVIAR ID - DEIXAR O SUPABASE GERAR
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: category.name
          })
          .select()
          .single();

        if (error) {
          console.error('[ForceRealSync] ❌ ERRO AO CRIAR CATEGORIA:', category.name, error);
          throw error;
        }

        if (!data || !data.id) {
          console.error('[ForceRealSync] ❌ CATEGORIA CRIADA SEM ID:', category.name);
          throw new Error(`Categoria criada sem ID: ${category.name}`);
        }

        // ✅ VALIDAR SE O ID TEM 36 CARACTERES
        if (data.id.length !== 36) {
          console.error('[ForceRealSync] ❌ ID INVÁLIDO RETORNADO:', {
            name: category.name,
            id: data.id,
            length: data.id.length,
            expected: 36
          });
          throw new Error(`ID inválido para categoria ${category.name}: ${data.id}`);
        }

        console.log('[ForceRealSync] ✅ CATEGORIA REAL CRIADA:', {
          name: category.name,
          uuid: data.id,
          length: data.id.length
        });
      }

      console.log('[ForceRealSync] ✅ TODAS AS CATEGORIAS REAIS CRIADAS');
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO AO CRIAR CATEGORIAS REAIS:', error);
      throw error;
    }
  },

  /**
   * SINCRONIZAR DO SUPABASE - Buscar dados reais
   */
  async syncFromSupabase(): Promise<void> {
    console.log('[ForceRealSync] 📦 SINCRONIZANDO DO SUPABASE...');
    
    try {
      const store = useStore.getState();
      
      // Buscar produtos reais
      const { data: realProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) {
        console.error('[ForceRealSync] ❌ ERRO AO BUSCAR PRODUTOS:', productsError);
        throw productsError;
      }

      // Buscar categorias reais
      const { data: realCategories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        console.error('[ForceRealSync] ❌ ERRO AO BUSCAR CATEGORIAS:', categoriesError);
        throw categoriesError;
      }

      console.log('[ForceRealSync] 📊 DADOS REAIS DO SUPABASE:', {
        products: realProducts?.length || 0,
        categories: realCategories?.length || 0
      });

      // 🔍 VERIFICAR SE PRODUTOS TÊM CATEGORIAS
      if (realProducts && realProducts.length > 0) {
        const productsWithCategories = realProducts.filter(p => p.category_id);
        const productsWithoutCategories = realProducts.filter(p => !p.category_id);
        console.log('[ForceRealSync] 📊 PRODUTOS COM CATEGORIAS:', {
          comCategoria: productsWithCategories.length,
          semCategoria: productsWithoutCategories.length,
          exemplosSemCategoria: productsWithoutCategories.slice(0, 3).map(p => ({ id: p.id, name: p.name }))
        });
      }

      // 🔍 VERIFICAR CATEGORIAS
      if (realCategories && realCategories.length > 0) {
        console.log('[ForceRealSync] 📋 CATEGORIAS ENCONTRADAS:', realCategories.map(c => ({ id: c.id, name: c.name })));
      }

      // ATUALIZAR STORE COM DADOS REAIS
      if (realProducts) {
        // Validar se todos os produtos têm UUIDs válidos
        const invalidProducts = realProducts.filter(p => !this.isValidUUID(p.id));
        if (invalidProducts.length > 0) {
          console.warn('[ForceRealSync] ⚠️ PRODUTOS COM UUIDS INVÁLIDOS (serão ignorados):', invalidProducts);
          // Filtrar apenas produtos válidos em vez de lançar erro
          const validProducts = realProducts.filter(p => this.isValidUUID(p.id));
          if (validProducts.length > 0) {
            store.setMenu(validProducts);
            console.log('[ForceRealSync] ✅ PRODUTOS VÁLIDOS SINCRONIZADOS:', validProducts.length);
          } else {
            console.error('[ForceRealSync] ❌ NENHUM PRODUTO VÁLIDO ENCONTRADO');
          }
        } else {
          store.setMenu(realProducts);
          console.log('[ForceRealSync] ✅ PRODUTOS SINCRONIZADOS:', realProducts.length);
        }
      }

      if (realCategories) {
        // Validar se todas as categorias têm UUIDs válidos
        const invalidCategories = realCategories.filter(c => !this.isValidUUID(c.id));
        if (invalidCategories.length > 0) {
          console.warn('[ForceRealSync] ⚠️ CATEGORIAS COM UUIDS INVÁLIDOS (serão ignoradas):', invalidCategories);
          // Filtrar apenas categorias válidas em vez de lançar erro
          const validCategories = realCategories.filter(c => this.isValidUUID(c.id));
          if (validCategories.length > 0) {
            store.setCategories(validCategories);
            console.log('[ForceRealSync] ✅ CATEGORIAS VÁLIDAS SINCRONIZADAS:', validCategories.length);
          } else {
            console.error('[ForceRealSync] ❌ NENHUMA CATEGORIA VÁLIDA ENCONTRADA');
          }
        } else {
          store.setCategories(realCategories);
          console.log('[ForceRealSync] ✅ TODAS CATEGORIAS SINCRONIZADAS:', realCategories.length);
        }
      }

      console.log('[ForceRealSync] ✅ SINCRONIZAÇÃO DO SUPABASE CONCLUÍDA');
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO NA SINCRONIZAÇÃO DO SUPABASE:', error);
      throw error;
    }
  },

  /**
   * VALIDAR UUID - 36 caracteres obrigatórios
   */
  isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    if (uuid.length !== 36) return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * FORÇAR RECARREGAMENTO
   */
  forceReload(): void {
    console.log('[ForceRealSync] 🔄 FORÇANDO RECARREGAMENTO DA APP...');
    
    // Mostrar mensagem para o usuário
    const message = document.createElement('div');
    message.textContent = 'Sincronização real com Supabase. Recarregando...';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #3b82f6;
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 9999;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(message);
    
    // Recarregar após 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  },

  /**
   * CRIAR PRODUTO REAL NO BANCO PRIMEIRO
   */
  async createRealProduct(productData: any): Promise<any> {
    console.log('[ForceRealSync] 🏗️ CRIANDO PRODUTO REAL NO BANCO PRIMEIRO...');
    
    try {
      // ✅ VALIDAÇÃO DE COMPRIMENTO - BLOQUEAR IDS CURTOS
      if (productData.id && productData.id.toString().length < 10) {
        throw new Error('ID INVÁLIDO DETECTADO: IDs curtos não são permitidos');
      }

      // ✅ VALIDAR CATEGORIA - DEVE SER UUID REAL
      if (productData.category_id) {
        const { data: categoryCheck, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('id', productData.category_id)
          .single();

        if (categoryError || !categoryCheck) {
          console.error('[ForceRealSync] ❌ CATEGORIA INVÁLIDA:', productData.category_id);
          throw new Error(`Categoria inválida: ${productData.category_id}`);
        }

        // ✅ VALIDAR SE CATEGORY_ID É UUID VÁLIDO
        if (!this.isValidUUID(productData.category_id)) {
          throw new Error(`category_id inválido: ${productData.category_id} (deve ser UUID de 36 caracteres)`);
        }

        console.log('[ForceRealSync] ✅ CATEGORIA VALIDADA:', productData.category_id);
      }

      // ✅ BLOQUEIO DE ESCRITA NO ID - REMOVER ID SE EXISTIR
      const { id, ...dataToSave } = productData;

      // ✅ INSERIR NO BANCO PRIMEIRO - SEM ID
      const { data, error } = await supabase
        .from('products')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('[ForceRealSync] ❌ ERRO AO CRIAR PRODUTO NO BANCO:', error);
        throw error;
      }

      if (!data || !data.id) {
        console.error('[ForceRealSync] ❌ PRODUTO CRIADO SEM ID:', data);
        throw new Error('Produto criado sem ID retornado');
      }

      // ✅ VALIDAR SE O ID RETORNADO É UUID VÁLIDO
      if (!this.isValidUUID(data.id)) {
        console.error('[ForceRealSync] ❌ ID INVÁLIDO RETORNADO:', data.id);
        throw new Error(`ID inválido retornado: ${data.id} (comprimento: ${data.id.length})`);
      }

      console.log('[ForceRealSync] ✅ PRODUTO REAL CRIADO NO BANCO:', {
        id: data.id,
        name: data.name,
        uuidLength: data.id.length
      });

      // ✅ CAPTURAR O RETORNO DO SUPABASE - USAR O UUID REAL
      return data;
    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO AO CRIAR PRODUTO REAL:', error);
      throw error;
    }
  },

  /**
   * VERIFICAR STATUS ATUAL
   */
  async checkCurrentStatus(): Promise<void> {
    console.log('[ForceRealSync] 🔍 VERIFICANDO STATUS ATUAL...');
    
    try {
      const store = useStore.getState();
      
      // Verificar produtos locais
      const localProducts = store.menu || [];
      const localProductsWithInvalidIDs = localProducts.filter(p => 
        p.id && p.id.toString().length < 10
      );

      // Verificar categorias locais
      const localCategories = store.categories || [];
      const localCategoriesWithInvalidIDs = localCategories.filter(c => 
        c.id && c.id.toString().length < 10
      );

      // Verificar produtos no Supabase
      const { data: supabaseProducts } = await supabase
        .from('products')
        .select('id, name')
        .limit(5);

      // Verificar categorias no Supabase
      const { data: supabaseCategories } = await supabase
        .from('categories')
        .select('id, name')
        .limit(5);

      console.log('[ForceRealSync] 📊 STATUS ATUAL:', {
        localProducts: localProducts.length,
        localProductsWithInvalidIDs: localProductsWithInvalidIDs.length,
        localCategories: localCategories.length,
        localCategoriesWithInvalidIDs: localCategoriesWithInvalidIDs.length,
        supabaseProducts: supabaseProducts?.length || 0,
        supabaseCategories: supabaseCategories?.length || 0
      });

      // ALERTAR SE HOUVER PROBLEMAS
      if (localProductsWithInvalidIDs.length > 0) {
        console.error('[ForceRealSync] ❌ PRODUTOS LOCAIS COM IDS INVÁLIDOS:', localProductsWithInvalidIDs);
      }

      if (localCategoriesWithInvalidIDs.length > 0) {
        console.error('[ForceRealSync] ❌ CATEGORIAS LOCAIS COM IDS INVÁLIDOS:', localCategoriesWithInvalidIDs);
      }

      if ((supabaseProducts?.length || 0) === 0 || (supabaseCategories?.length || 0) === 0) {
        console.warn('[ForceRealSync] ⚠️ TABELAS DO SUPABASE ESTÃO VAZIAS');
      }

    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO AO VERIFICAR STATUS:', error);
    }
  },

  /**
   * 🔍 DIAGNOSTICAR E CORRIGIR PRODUTOS COM PREÇO INVÁLIDO NO SUPABASE
   * 
   * Verifica produtos sem preço ou categoria e corrige automaticamente
   */
  async diagnoseAndFixProducts(): Promise<{
    valid: any[];
    invalidPrice: any[];
    noCategory: any[];
    needsFix: boolean;
  }> {
    console.log('[ForceRealSync] 🔍 DIAGNOSTICANDO PRODUTOS NO SUPABASE...');

    try {
      // Buscar TODOS os produtos do Supabase
      const { data: products, error } = await supabase
        .from('products')
        .select('*');

      if (error) {
        console.error('[ForceRealSync] ❌ ERRO AO BUSCAR PRODUTOS:', error);
        throw error;
      }

      if (!products || products.length === 0) {
        console.log('[ForceRealSync] ℹ️ NENHUM PRODUTO ENCONTRADO NO SUPABASE');
        return { valid: [], invalidPrice: [], noCategory: [], needsFix: false };
      }

      console.log(`[ForceRealSync] 📊 TOTAL DE PRODUTOS: ${products.length}`);

      // Separar produtos válidos e inválidos
      const valid: any[] = [];
      const invalidPrice: any[] = [];
      const noCategory: any[] = [];

      products.forEach(product => {
        const hasValidPrice = typeof product.price === 'number' && !isNaN(product.price) && product.price >= 0;
        const hasCategory = product.category_id && this.isValidUUID(product.category_id);

        if (!hasValidPrice) {
          invalidPrice.push({
            ...product,
            issue: 'preço inválido',
            priceValue: product.price
          });
        }

        if (!hasCategory) {
          noCategory.push({
            ...product,
            issue: 'sem categoria',
            categoryId: product.category_id
          });
        }

        if (hasValidPrice && hasCategory) {
          valid.push(product);
        }
      });

      console.log('[ForceRealSync] 📊 DIAGNÓSTICO DE PRODUTOS:', {
        total: products.length,
        valid: valid.length,
        invalidPrice: invalidPrice.length,
        noCategory: noCategory.length
      });

      if (invalidPrice.length > 0) {
        console.warn('[ForceRealSync] ⚠️ PRODUTOS COM PREÇO INVÁLIDO:', invalidPrice.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price
        })));
      }

      if (noCategory.length > 0) {
        console.warn('[ForceRealSync] ⚠️ PRODUTOS SEM CATEGORIA:', noCategory.map(p => ({
          id: p.id,
          name: p.name,
          category_id: p.category_id
        })));
      }

      return {
        valid,
        invalidPrice,
        noCategory,
        needsFix: invalidPrice.length > 0 || noCategory.length > 0
      };

    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO NO DIAGNÓSTICO:', error);
      throw error;
    }
  },

  /**
   * 🛠️ CORRIGIR PRODUTOS INVÁLIDOS NO SUPABASE
   */
  async fixInvalidProducts(
    invalidProducts: any[],
    strategy: 'setPriceZero' | 'delete' = 'setPriceZero'
  ): Promise<void> {
    console.log('[ForceRealSync] 🛠️ CORRIGINDO PRODUTOS INVÁLIDOS...', { strategy });

    try {
      // Buscar uma categoria válida para usar como padrão
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1);

      const defaultCategoryId = categories?.[0]?.id;

      for (const product of invalidProducts) {
        const updates: any = {};

        // Corrigir preço
        if (typeof product.price !== 'number' || isNaN(product.price) || product.price < 0) {
          updates.price = 0;
        }

        // Corrigir categoria
        if (!product.category_id || !this.isValidUUID(product.category_id)) {
          if (defaultCategoryId) {
            updates.category_id = defaultCategoryId;
          }
        }

        if (Object.keys(updates).length > 0) {
          console.log(`[ForceRealSync] 📝 Atualizando produto ${product.id} (${product.name}):`, updates);

          const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', product.id);

          if (error) {
            console.error(`[ForceRealSync] ❌ Erro ao atualizar produto ${product.id}:`, error);
          } else {
            console.log(`[ForceRealSync] ✅ Produto ${product.id} atualizado com sucesso`);
          }
        }
      }

      console.log('[ForceRealSync] ✅ CORREÇÃO DE PRODUTOS CONCLUÍDA');

    } catch (error) {
      console.error('[ForceRealSync] ❌ ERRO AO CORRIGIR PRODUTOS:', error);
      throw error;
    }
  }
};
