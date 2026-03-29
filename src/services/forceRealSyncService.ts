import { supabase } from '../lib/supabase';
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
        // Usar clearAllData se existir, ou limpar manualmente
        if (typeof store.clearAllData === 'function') {
          store.clearAllData();
        } else {
          // Limpar manualmente se não tiver clearAllData
          store.setMenu([]);
          store.setCategories([]);
        }
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

      // ATUALIZAR STORE COM DADOS REAIS
      if (realProducts) {
        // Validar se todos os produtos têm UUIDs válidos
        const invalidProducts = realProducts.filter(p => !this.isValidUUID(p.id));
        if (invalidProducts.length > 0) {
          console.error('[ForceRealSync] ❌ PRODUTOS COM UUIDS INVÁLIDOS:', invalidProducts);
          throw new Error(`Encontrados ${invalidProducts.length} produtos com UUIDs inválidos`);
        }

        store.setMenu(realProducts);
        console.log('[ForceRealSync] ✅ PRODUTOS SINCRONIZADOS:', realProducts.length);
      }

      if (realCategories) {
        // Validar se todas as categorias têm UUIDs válidos
        const invalidCategories = realCategories.filter(c => !this.isValidUUID(c.id));
        if (invalidCategories.length > 0) {
          console.error('[ForceRealSync] ❌ CATEGORIAS COM UUIDS INVÁLIDOS:', invalidCategories);
          throw new Error(`Encontradas ${invalidCategories.length} categorias com UUIDs inválidos`);
        }

        store.setCategories(realCategories);
        console.log('[ForceRealSync] ✅ CATEGORIAS SINCRONIZADAS:', realCategories.length);
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
  }
};
