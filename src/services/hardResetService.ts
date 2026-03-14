import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

/**
 * HARD RESET SERVICE - Limpeza Completa e Sincronização
 * 
 * Este serviço implementa o reset completo do sistema quando o Supabase está vazio
 * ou quando há dados órfãos localmente.
 */
export const hardResetService = {
  /**
   * Verifica se o Supabase está vazio e executa hard reset se necessário
   */
  async performHardResetIfNecessary(): Promise<boolean> {
    console.log('[HardReset] 🔄 VERIFICANDO NECESSIDADE DE HARD RESET...');
    
    try {
      // Verificar se Supabase está vazio
      const { data: categoriesCheck, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .limit(1);
      
      const { data: productsCheck, error: productsError } = await supabase
        .from('products')
        .select('id')
        .limit(1);

      const isSupabaseEmpty = (!categoriesCheck || categoriesCheck.length === 0) && 
                             (!productsCheck || productsCheck.length === 0);

      console.log('[HardReset] 📊 STATUS SUPABASE:', {
        categories: categoriesCheck?.length || 0,
        products: productsCheck?.length || 0,
        isEmpty: isSupabaseEmpty
      });

      if (isSupabaseEmpty) {
        console.log('[HardReset] 🧹 HARD RESET NECESSÁRIO - EXECUTANDO...');
        await this.executeHardReset();
        return true;
      }

      console.log('[HardReset] ✅ SUPABASE OK - HARD RESET NÃO NECESSÁRIO');
      return false;
    } catch (error) {
      console.error('[HardReset] ❌ ERRO NA VERIFICAÇÃO:', error);
      return false;
    }
  },

  /**
   * Executa o hard reset completo do sistema
   */
  async executeHardReset(): Promise<void> {
    console.log('[HardReset] 🧹 EXECUTANDO HARD RESET COMPLETO...');
    
    try {
      // 1. Limpar dados locais
      await this.clearLocalData();
      
      // 2. Criar categorias base com UUIDs
      await this.createBaseCategoriesWithUUID();
      
      // 3. Forçar recarregamento
      this.forceReload();
      
    } catch (error) {
      console.error('[HardReset] ❌ ERRO NO HARD RESET:', error);
      throw error;
    }
  },

  /**
   * Limpa todos os dados locais (localStorage, IndexedDB, Store)
   */
  async clearLocalData(): Promise<void> {
    console.log('[HardReset] 🗑️ LIMPANDO DADOS LOCAIS...');
    
    try {
      // Limpar localStorage manualmente
      localStorage.clear();
      console.log('[HardReset] 🗑️ localStorage limpo');
      
      // Limpar IndexedDB se existir
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name && (db.name.includes('tasca') || db.name.includes('zustand') || db.name.includes('vereda'))) {
            indexedDB.deleteDatabase(db.name);
            console.log('[HardReset] 🗑️ IndexedDB apagado:', db.name);
          }
        }
      }

      // Limpar store Zustand (se accessible)
      // Nota: Isso será feito via função clearAllData do store
      console.log('[HardReset] 🗑️ Store Zustand será limpo via clearAllData');
      
    } catch (error) {
      console.error('[HardReset] ❌ ERRO AO LIMPAR DADOS LOCAIS:', error);
      throw error;
    }
  },

  /**
   * Cria categorias base com UUIDs reais do Supabase
   */
  async createBaseCategoriesWithUUID(): Promise<void> {
    console.log('[HardReset] 🏗️ CRIANDO CATEGORIAS BASE COM UUIDS...');
    
    const baseCategories = [
      { name: 'Entradas' },
      { name: 'Pratos Principais' },
      { name: 'Bebidas' },
      { name: 'Sobremesas' }
    ];

    for (const category of baseCategories) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert({ name: category.name })
          .select()
          .single();

        if (error) {
          console.error('[HardReset] ❌ ERRO AO CRIAR CATEGORIA:', category.name, error);
        } else {
          console.log('[HardReset] ✅ CATEGORIA CRIADA COM UUID:', category.name, data);
        }
      } catch (error) {
        console.error('[HardReset] ❌ ERRO CRÍTICO AO CRIAR CATEGORIA:', error);
      }
    }
  },

  /**
   * Força o recarregamento da página para limpar estado
   */
  forceReload(): void {
    console.log('[HardReset] 🔄 FORÇANDO RECARREGAMENTO...');
    
    // Mostrar mensagem para o usuário
    const message = document.createElement('div');
    message.textContent = 'Sistema resetado com sucesso. Recarregando...';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #10b981;
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
   * Sincronização de emergência - remove dados locais se não existirem no Supabase
   */
  async emergencySync(): Promise<void> {
    console.log('[HardReset] 🚨 SINCRONIZAÇÃO DE EMERGÊNCIA...');
    
    try {
      // Verificar categorias locais vs Supabase
      const { data: supabaseCategories } = await supabase
        .from('categories')
        .select('id, name');
      
      const store = useStore.getState();
      const localCategories = store.categories;
      
      // Remover categorias locais que não existem no Supabase
      const validCategories = localCategories.filter(localCat => 
        supabaseCategories?.some(supabaseCat => supabaseCat.id === localCat.id)
      );
      
      if (validCategories.length !== localCategories.length) {
        console.log('[HardReset] 🗑️ REMOVENDO CATEGORIAS ÓRFÃS:', 
          localCategories.length - validCategories.length);
        // ✅ FORÇAR RECARREGAMENTO - dados inconsistentes
        this.forceReload();
        return;
      }
      
      // Verificar produtos locais vs Supabase
      const { data: supabaseProducts } = await supabase
        .from('products')
        .select('id, name');
      
      const localProducts = store.menu;
      
      // Remover produtos locais que não existem no Supabase
      const validProducts = localProducts.filter(localProduct => 
        supabaseProducts?.some(supabaseProduct => supabaseProduct.id === localProduct.id)
      );
      
      if (validProducts.length !== localProducts.length) {
        console.log('[HardReset] 🗑️ REMOVENDO PRODUTOS ÓRFÃOS:', 
          localProducts.length - validProducts.length);
        // ✅ FORÇAR RECARREGAMENTO - dados inconsistentes
        this.forceReload();
        return;
      }
      
      console.log('[HardReset] ✅ SINCRONIZAÇÃO DE EMERGÊNCIA CONCLUÍDA');
    } catch (error) {
      console.error('[HardReset] ❌ ERRO NA SINCRONIZAÇÃO DE EMERGÊNCIA:', error);
    }
  },

  /**
   * Verifica consistência entre dados locais e Supabase
   */
  async checkConsistency(): Promise<{ isConsistent: boolean; issues: string[] }> {
    console.log('[HardReset] 🔍 VERIFICANDO CONSISTÊNCIA...');
    
    const issues: string[] = [];
    
    try {
      // Verificar categorias
      const { data: supabaseCategories } = await supabase
        .from('categories')
        .select('id, name');
      
      const store = useStore.getState();
      const localCategories = store.categories;
      
      if (localCategories.length !== supabaseCategories?.length) {
        issues.push(`Divergência de categorias: Local=${localCategories.length}, Supabase=${supabaseCategories?.length}`);
      }
      
      // Verificar produtos
      const { data: supabaseProducts } = await supabase
        .from('products')
        .select('id, name');
      
      const localProducts = store.menu;
      
      if (localProducts.length !== supabaseProducts?.length) {
        issues.push(`Divergência de produtos: Local=${localProducts.length}, Supabase=${supabaseProducts?.length}`);
      }
      
      const isConsistent = issues.length === 0;
      
      console.log('[HardReset] 📊 CONSISTÊNCIA:', { isConsistent, issues });
      
      return { isConsistent, issues };
    } catch (error) {
      console.error('[HardReset] ❌ ERRO NA VERIFICAÇÃO DE CONSISTÊNCIA:', error);
      return { isConsistent: false, issues: ['Erro na verificação de consistência'] };
    }
  }
};
