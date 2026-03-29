import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { sqlMigrationService } from '../lib/sqlMigrationService';

/**
 * OFFLINE-FIRST SERVICE - Sistema Offline-First Completo
 * 
 * Implementa sistema offline-first com UUIDs sempre, sincronização de fundo
 * e resolução de conflitos com "Livro Central" (Supabase) prevalecendo
 */
export const offlineFirstService = {
  /**
   * GERAÇÃO UUID SEMPRE - Offline ou Online
   */
  generateUUID(): string {
    // ✅ SEMPRE usar crypto.randomUUID() mesmo offline
    const uuid = crypto.randomUUID();
    console.log('[OfflineFirst] 🎯 UUID GERADO:', uuid);
    return uuid;
  },

  /**
   * CRIAÇÃO OFFLINE-FIRST - Produto com UUID sempre
   */
  createProductOffline(productData: any): any {
    console.log('[OfflineFirst] 🏗️ CRIANDO PRODUTO OFFLINE-FIRST...');
    
    // ✅ SEMPRE gerar UUID mesmo offline
    const productId = this.generateUUID();
    
    const product = {
      id: productId, // ✅ UUID sempre
      name: productData.name,
      price: Number(productData.price),
      description: productData.description || '',
      cost_price: Number(productData.cost_price) || Number(productData.price) * 0.6,
      category_id: productData.category_id,
      image_url: productData.image_url || null,
      is_active: productData.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // ✅ METADADOS OFFLINE-FIRST
      _offlineCreated: true,
      _offlineModified: new Date().toISOString(),
      _syncStatus: 'pending',
      _conflictResolved: false
    };

    console.log('[OfflineFirst] ✅ PRODUTO CRIADO OFFLINE:', {
      id: product.id,
      name: product.name,
      isUUID: this.isValidUUID(product.id),
      offlineCreated: product._offlineCreated
    });

    return product;
  },

  /**
   * CRIAÇÃO OFFLINE-FIRST - Categoria com UUID sempre
   */
  createCategoryOffline(categoryData: any): any {
    console.log('[OfflineFirst] 🏗️ CRIANDO CATEGORIA OFFLINE-FIRST...');
    
    // ✅ SEMPRE gerar UUID mesmo offline
    const categoryId = this.generateUUID();
    
    const category = {
      id: categoryId, // ✅ UUID sempre
      name: categoryData.name,
      icon: categoryData.icon || 'Tag',
      isVisibleDigital: categoryData.isVisibleDigital !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // ✅ METADADOS OFFLINE-FIRST
      _offlineCreated: true,
      _offlineModified: new Date().toISOString(),
      _syncStatus: 'pending',
      _conflictResolved: false
    };

    console.log('[OfflineFirst] ✅ CATEGORIA CRIADA OFFLINE:', {
      id: category.id,
      name: category.name,
      isUUID: this.isValidUUID(category.id),
      offlineCreated: category._offlineCreated
    });

    return category;
  },

  /**
   * ATUALIZAÇÃO OFFLINE-FIRST - Produto com controle de versão
   */
  updateProductOffline(productId: string, updates: any): any {
    console.log('[OfflineFirst] 📝 ATUALIZANDO PRODUTO OFFLINE:', productId);
    
    const store = useStore.getState();
    const existingProduct = store.menu.find(p => p.id === productId);
    
    if (!existingProduct) {
      console.error('[OfflineFirst] ❌ Produto não encontrado:', productId);
      throw new Error('Produto não encontrado');
    }

    // ✅ VALIDAR UUID
    if (!this.isValidUUID(productId)) {
      console.error('[OfflineFirst] ❌ UUID inválido para update:', productId);
      throw new Error('UUID inválido para update');
    }

    const updatedProduct = {
      ...existingProduct,
      ...updates,
      updated_at: new Date().toISOString(),
      // ✅ METADADOS OFFLINE-FIRST
      _offlineModified: new Date().toISOString(),
      _syncStatus: 'pending',
      _localVersion: (existingProduct._localVersion || 0) + 1,
      _conflictResolved: false
    };

    console.log('[OfflineFirst] ✅ PRODUTO ATUALIZADO OFFLINE:', {
      id: updatedProduct.id,
      version: updatedProduct._localVersion,
      offlineModified: updatedProduct._offlineModified
    });

    return updatedProduct;
  },

  /**
   * SINCRONIZAÇÃO DE FUNDO - Detecção automática de internet
   */
  startBackgroundSync(): void {
    console.log('[OfflineFirst] 🔄 INICIANDO SINCRONIZAÇÃO DE FUNDO...');
    
    // Monitorar status da internet
    const syncInterval = setInterval(async () => {
      try {
        // ✅ DETECTAR SE A INTERNET VOLTOU
        const isOnline = navigator.onLine;
        const canReachSupabase = await this.canReachSupabase();
        
        console.log('[OfflineFirst] 📡 STATUS INTERNET:', { isOnline, canReachSupabase });
        
        if (isOnline && canReachSupabase) {
          console.log('[OfflineFirst] 🌐 INTERNET DISPONÍVEL - SINCRONIZANDO...');
          await this.performBackgroundSync();
        }
      } catch (error) {
        console.error('[OfflineFirst] ❌ ERRO NA VERIFICAÇÃO DE CONEXÃO:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    // Event listeners para mudanças de conexão
    window.addEventListener('online', () => {
      console.log('[OfflineFirst] 🌐 CONEXÃO RESTABELECIDA');
      this.performBackgroundSync();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineFirst] 📵 CONEXÃO PERDIDA - MODO OFFLINE');
    });
  },

  /**
   * VERIFICAR SE SUPABASE ESTÁ ACESSÍVEL
   */
  async canReachSupabase(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
        .timeout(3000); // Timeout de 3 segundos

      return !error;
    } catch (error) {
      console.log('[OfflineFirst] ❌ Supabase inacessível:', error);
      return false;
    }
  },

  /**
   * SINCRONIZAÇÃO DE FUNDO - Push sem bloquear interface
   */
  async performBackgroundSync(): Promise<void> {
    console.log('[OfflineFirst] 🔄 EXECUTANDO SINCRONIZAÇÃO DE FUNDO...');
    
    try {
      const store = useStore.getState();
      
      // ✅ SINCRONIZAR CATEGORIAS PENDENTES
      await this.syncPendingCategories(store.categories);
      
      // ✅ SINCRONIZAR PRODUTOS PENDENTES
      await this.syncPendingProducts(store.menu);
      
      // ✅ RESOLVER CONFLITOS
      await this.resolveConflicts();
      
      console.log('[OfflineFirst] ✅ SINCRONIZAÇÃO DE FUNDO CONCLUÍDA');
    } catch (error) {
      console.error('[OfflineFirst] ❌ ERRO NA SINCRONIZAÇÃO DE FUNDO:', error);
    }
  },

  /**
   * SINCRONIZAR CATEGORIAS PENDENTES
   */
  async syncPendingCategories(localCategories: any[]): Promise<void> {
    console.log('[OfflineFirst] 📂 SINCRONIZANDO CATEGORIAS PENDENTES...');
    
    const pendingCategories = localCategories.filter(cat => 
      cat._offlineCreated || cat._syncStatus === 'pending'
    );

    for (const category of pendingCategories) {
      try {
        // ✅ VERIFICAR SE JÁ EXISTE NO SUPABASE
        const { data: existing, error: checkError } = await supabase
          .from('categories')
          .select('id, updated_at')
          .eq('id', category.id)
          .single();

        if (!checkError && existing) {
          // ✅ CONFLITO: VERSÃO DO SUPABASE PREVALECE
          console.log('[OfflineFirst] ⚠️ CONFLITO DETECTADO - Categoria existe no Supabase:', category.id);
          await this.resolveCategoryConflict(category, existing);
        } else {
          // ✅ CRIAR NO SUPABASE
          const { data, error } = await supabase
            .from('categories')
            .insert({
              id: category.id,
              name: category.name
            })
            .select()
            .single();

          if (error) {
            console.error('[OfflineFirst] ❌ ERRO AO SINCRONIZAR CATEGORIA:', error);
          } else {
            console.log('[OfflineFirst] ✅ CATEGORIA SINCRONIZADA:', category.id);
            // Atualizar status local
            this.updateCategorySyncStatus(category.id, 'synced');
          }
        }
      } catch (error) {
        console.error('[OfflineFirst] ❌ ERRO CRÍTICO AO SINCRONIZAR CATEGORIA:', error);
      }
    }
  },

  /**
   * SINCRONIZAR PRODUTOS PENDENTES
   */
  async syncPendingProducts(localProducts: any[]): Promise<void> {
    console.log('[OfflineFirst] 📦 SINCRONIZANDO PRODUTOS PENDENTES...');
    
    const pendingProducts = localProducts.filter(product => 
      product._offlineCreated || product._syncStatus === 'pending'
    );

    for (const product of pendingProducts) {
      try {
        // ✅ VERIFICAR SE JÁ EXISTE NO SUPABASE
        const { data: existing, error: checkError } = await supabase
          .from('products')
          .select('id, updated_at')
          .eq('id', product.id)
          .single();

        if (!checkError && existing) {
          // ✅ CONFLITO: VERSÃO DO SUPABASE PREVALECE
          console.log('[OfflineFirst] ⚠️ CONFLITO DETECTADO - Produto existe no Supabase:', product.id);
          await this.resolveProductConflict(product, existing);
        } else {
          // ✅ CRIAR NO SUPABASE
          const { data, error } = await supabase
            .from('products')
            .insert({
              id: product.id,
              name: product.name,
              price: product.price,
              description: product.description,
              cost_price: product.cost_price,
              category_id: product.category_id,
              image_url: product.image_url,
              is_active: product.is_active
            })
            .select()
            .single();

          if (error) {
            console.error('[OfflineFirst] ❌ ERRO AO SINCRONIZAR PRODUTO:', error);
          } else {
            console.log('[OfflineFirst] ✅ PRODUTO SINCRONIZADO:', product.id);
            // Atualizar status local
            this.updateProductSyncStatus(product.id, 'synced');
          }
        }
      } catch (error) {
        console.error('[OfflineFirst] ❌ ERRO CRÍTICO AO SINCRONIZAR PRODUTO:', error);
      }
    }
  },

  /**
   * RESOLVER CONFLITOS - Livro Central (Supabase) prevalece
   */
  async resolveConflicts(): Promise<void> {
    console.log('[OfflineFirst] ⚖️ RESOLVENDO CONFLITOS...');
    
    try {
      const store = useStore.getState();
      
      // ✅ RESOLVER CONFLITOS DE CATEGORIAS
      await this.resolveCategoryConflicts(store.categories);
      
      // ✅ RESOLVER CONFLITOS DE PRODUTOS
      await this.resolveProductConflicts(store.menu);
      
      console.log('[OfflineFirst] ✅ CONFLITOS RESOLVIDOS');
    } catch (error) {
      console.error('[OfflineFirst] ❌ ERRO AO RESOLVER CONFLITOS:', error);
    }
  },

  /**
   * RESOLVER CONFLITO DE CATEGORIA - Supabase prevalece
   */
  async resolveCategoryConflict(localCategory: any, supabaseCategory: any): Promise<void> {
    console.log('[OfflineFirst] ⚖️ RESOLVENDO CONFLITO DE CATEGORIA:', localCategory.id);
    
    try {
      // ✅ LIVRO CENTRAL PREVALECE: Usar dados do Supabase
      const store = useStore.getState();
      
      // Buscar dados completos do Supabase
      const { data: fullSupabaseCategory } = await supabase
        .from('categories')
        .select('*')
        .eq('id', localCategory.id)
        .single();

      if (fullSupabaseCategory) {
        // ✅ SUBSTITUIR LOCAL PELO SUPABASE
        const updatedCategory = {
          ...fullSupabaseCategory,
          _conflictResolved: true,
          _conflictResolution: 'supabase_wins',
          _localVersion: 0,
          _syncStatus: 'synced'
        };

        // Atualizar no store local
        store.updateCategory?.(updatedCategory);
        
        console.log('[OfflineFirst] ✅ CONFLITO RESOLVIDO - Supabase prevaleceu:', localCategory.id);
      }
    } catch (error) {
      console.error('[OfflineFirst] ❌ ERRO AO RESOLVER CONFLITO DE CATEGORIA:', error);
    }
  },

  /**
   * RESOLVER CONFLITO DE PRODUTO - Supabase prevalece
   */
  async resolveProductConflict(localProduct: any, supabaseProduct: any): Promise<void> {
    console.log('[OfflineFirst] ⚖️ RESOLVENDO CONFLITO DE PRODUTO:', localProduct.id);
    
    try {
      // ✅ LIVRO CENTRAL PREVALECE: Usar dados do Supabase
      const store = useStore.getState();
      
      // Buscar dados completos do Supabase
      const { data: fullSupabaseProduct } = await supabase
        .from('products')
        .select('*')
        .eq('id', localProduct.id)
        .single();

      if (fullSupabaseProduct) {
        // ✅ SUBSTITUIR LOCAL PELO SUPABASE
        const updatedProduct = {
          ...fullSupabaseProduct,
          _conflictResolved: true,
          _conflictResolution: 'supabase_wins',
          _localVersion: 0,
          _syncStatus: 'synced'
        };

        // Atualizar no store local
        store.updateDish?.(updatedProduct);
        
        console.log('[OfflineFirst] ✅ CONFLITO RESOLVIDO - Supabase prevaleceu:', localProduct.id);
      }
    } catch (error) {
      console.error('[OfflineFirst] ❌ ERRO AO RESOLVER CONFLITO DE PRODUTO:', error);
    }
  },

  /**
   * ATUALIZAR STATUS DE SINCRONIZAÇÃO
   */
  updateCategorySyncStatus(categoryId: string, status: 'pending' | 'synced' | 'error'): void {
    const store = useStore.getState();
    const category = store.categories.find(c => c.id === categoryId);
    
    if (category) {
      const updatedCategory = {
        ...category,
        _syncStatus: status,
        _offlineModified: status === 'synced' ? null : new Date().toISOString()
      };
      
      store.updateCategory?.(updatedCategory);
    }
  },

  updateProductSyncStatus(productId: string, status: 'pending' | 'synced' | 'error'): void {
    const store = useStore.getState();
    const product = store.menu.find(p => p.id === productId);
    
    if (product) {
      const updatedProduct = {
        ...product,
        _syncStatus: status,
        _offlineModified: status === 'synced' ? null : new Date().toISOString()
      };
      
      store.updateDish?.(updatedProduct);
    }
  },

  /**
   * VALIDAÇÃO UUID - Verificação rigorosa
   */
  isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    if (uuid.length !== 36) return false;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * STATUS OFFLINE-FIRST
   */
  getOfflineStatus(): {
    isOnline: boolean;
    canReachSupabase: boolean;
    pendingSyncs: number;
    conflicts: number;
  } {
    const store = useStore.getState();
    
    const pendingCategories = store.categories.filter(c => c._syncStatus === 'pending').length;
    const pendingProducts = store.menu.filter(p => p._syncStatus === 'pending').length;
    const conflicts = store.categories.filter(c => c._conflictResolved === false).length + 
                     store.menu.filter(p => p._conflictResolved === false).length;
    
    return {
      isOnline: navigator.onLine,
      canReachSupabase: false, // Será verificado async
      pendingSyncs: pendingCategories + pendingProducts,
      conflicts
    };
  },

  /**
   * FORÇAR SINCRONIZAÇÃO MANUAL
   */
  async forceSyncNow(): Promise<boolean> {
    console.log('[OfflineFirst] 🔄 FORÇANDO SINCRONIZAÇÃO MANUAL...');
    
    try {
      await this.performBackgroundSync();
      return true;
    } catch (error) {
      console.error('[OfflineFirst] ❌ ERRO NA SINCRONIZAÇÃO MANUAL:', error);
      return false;
    }
  }
};
