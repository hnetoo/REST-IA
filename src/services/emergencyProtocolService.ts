import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

/**
 * EMERGENCY PROTOCOL SERVICE - Estabilização Crítica da Tasca do Vereda
 * 
 * Protocolo de emergência para dessincronização entre App e Supabase
 * Implementa limpeza de cache, categorias padrão e validação UUID
 */
export const emergencyProtocolService = {
  /**
   * Protocolo completo de emergência
   */
  async executeEmergencyProtocol(): Promise<boolean> {
    console.log('[EmergencyProtocol] 🚨 INICIANDO PROTOCOLO DE EMERGÊNCIA...');
    
    try {
      // 1. Limpeza de cache completa
      await this.performCacheCleanup();
      
      // 2. Verificar e criar categorias padrão
      await this.ensureDefaultCategories();
      
      // 3. Alinhamento de schema
      await this.alignSchema();
      
      // 4. Validação de dados
      await this.validateData();
      
      console.log('[EmergencyProtocol] ✅ PROTOCOLO DE EMERGÊNCIA CONCLUÍDO');
      return true;
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NO PROTOCOLO:', error);
      return false;
    }
  },

  /**
   * LIMPEZA DE CACHE - Force limpeza completa
   */
  async performCacheCleanup(): Promise<void> {
    console.log('[EmergencyProtocol] 🧹 LIMPANDO CACHE COMPLETO...');
    
    try {
      // Limpar localStorage completamente
      localStorage.clear();
      console.log('[EmergencyProtocol] 🗑️ localStorage limpo');
      
      // Limpar sessionStorage
      sessionStorage.clear();
      console.log('[EmergencyProtocol] 🗑️ sessionStorage limpo');
      
      // Limpar IndexedDB relacionado à app
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name && (
            db.name.includes('tasca') || 
            db.name.includes('vereda') || 
            db.name.includes('zustand') ||
            db.name.includes('supabase')
          )) {
            indexedDB.deleteDatabase(db.name);
            console.log('[EmergencyProtocol] 🗑️ IndexedDB apagado:', db.name);
          }
        }
      }
      
      // Limpar store Zustand se acessível
      try {
        const store = useStore.getState();
        // ✅ REMOVIDO: clearAllData não existe no store
        // if (store && typeof store.clearAllData === 'function') {
        //   store.clearAllData();
        //   console.log('[EmergencyProtocol] 🗑️ Store Zustand limpo');
        // }
        console.log('[EmergencyProtocol] Store Zustand não possui clearAllData, pulando...');
      } catch (error) {
        console.log('[EmergencyProtocol] Store não acessível, continuando...');
      }
      
      console.log('[EmergencyProtocol] ✅ LIMPEZA DE CACHE CONCLUÍDA');
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NA LIMPEZA DE CACHE:', error);
      throw error;
    }
  },

  /**
   * CATEGORIAS PADRÃO - Verificação e criação obrigatória
   */
  async ensureDefaultCategories(): Promise<void> {
    console.log('[EmergencyProtocol] 🏗️ VERIFICANDO CATEGORIAS PADRÃO...');
    
    try {
      // Verificar se tabela categories está vazia
      const { data: existingCategories, error: checkError } = await supabase
        .from('categories')
        .select('id, name')
        .limit(1);

      if (checkError) {
        console.error('[EmergencyProtocol] ❌ ERRO AO VERIFICAR CATEGORIAS:', checkError);
        throw checkError;
      }

      const isEmpty = !existingCategories || existingCategories.length === 0;
      console.log('[EmergencyProtocol] 📊 STATUS CATEGORIAS:', { isEmpty, count: existingCategories?.length || 0 });

      if (isEmpty) {
        console.log('[EmergencyProtocol] 🏗️ CRIANDO CATEGORIAS PADRÃO COM UUIDS...');
        
        const defaultCategories = [
          { name: 'Entradas' },
          { name: 'Pratos Principais' },
          { name: 'Bebidas' },
          { name: 'Sobremesas' }
        ];

        for (const category of defaultCategories) {
          try {
            // ✅ CRÍTICO: Usar UUID retornado pelo Supabase, NUNCA definir manualmente
            const { data, error } = await supabase
              .from('categories')
              .insert({ name: category.name })
              .select('id, name')
              .single();

            if (error) {
              console.error('[EmergencyProtocol] ❌ ERRO AO CRIAR CATEGORIA:', category.name, error);
              throw error;
            }

            if (!data || !data.id) {
              console.error('[EmergencyProtocol] ❌ CATEGORIA CRIADA SEM ID:', category.name);
              throw new Error(`Categoria ${category.name} criada sem ID`);
            }

            // ✅ VALIDAÇÃO: Verificar se é UUID válido (36 caracteres)
            if (!this.isValidUUID(data.id)) {
              console.error('[EmergencyProtocol] ❌ UUID INVÁLIDO RETORNADO:', data.id);
              throw new Error(`UUID inválido para categoria ${category.name}: ${data.id}`);
            }

            console.log('[EmergencyProtocol] ✅ CATEGORIA CRIADA COM UUID REAL:', {
              name: category.name,
              uuid: data.id,
              isValid: this.isValidUUID(data.id)
            });

          } catch (error) {
            console.error('[EmergencyProtocol] ❌ ERRO CRÍTICO AO CRIAR CATEGORIA:', category.name, error);
            throw error;
          }
        }

        console.log('[EmergencyProtocol] ✅ TODAS AS CATEGORIAS PADRÃO CRIADAS');
      } else {
        console.log('[EmergencyProtocol] ✅ CATEGORIAS JÁ EXISTEM, PULANDO CRIAÇÃO');
      }
      
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NAS CATEGORIAS PADRÃO:', error);
      throw error;
    }
  },

  /**
   * ALINHAMENTO DE SCHEMA - Correções obrigatórias
   */
  async alignSchema(): Promise<void> {
    console.log('[EmergencyProtocol] 🔧 ALINHANDO SCHEMA...');
    
    try {
      // ✅ Mudar application_state para app_settings
      console.log('[EmergencyProtocol] 🔄 Verificando app_settings...');
      
      // Testar acesso à tabela correta
      const { data: settingsTest, error: settingsError } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1);

      if (settingsError) {
        console.error('[EmergencyProtocol] ❌ ERRO ACESSANDO app_settings:', settingsError);
        console.log('[EmergencyProtocol] ⚠️ Tabela app_settings pode não existir');
      } else {
        console.log('[EmergencyProtocol] ✅ app_settings acessível');
      }

      // ✅ Remover coluna icon da sincronização de categorias
      console.log('[EmergencyProtocol] 🔄 Verificando schema de categories...');
      
      const { data: categoriesSchema, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name') // ✅ APENAS CAMPOS EXISTENTES - sem 'icon'
        .limit(1);

      if (categoriesError) {
        console.error('[EmergencyProtocol] ❌ ERRO ACESSANDO categories:', categoriesError);
      } else {
        console.log('[EmergencyProtocol] ✅ categories acessível sem campo icon');
      }

      // ✅ Remover customer_id da sincronização de pedidos (orders)
      console.log('[EmergencyProtocol] 🔄 Verificando schema de orders...');
      
      const { data: ordersSchema, error: ordersError } = await supabase
        .from('orders')
        .select('id, table_id, total_amount, status, payment_method') // ✅ APENAS CAMPOS EXISTENTES - sem 'customer_id'
        .limit(1);

      if (ordersError) {
        console.error('[EmergencyProtocol] ❌ ERRO ACESSANDO orders:', ordersError);
      } else {
        console.log('[EmergencyProtocol] ✅ orders acessível sem campo customer_id');
      }

      console.log('[EmergencyProtocol] ✅ ALINHAMENTO DE SCHEMA CONCLUÍDO');
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NO ALINHAMENTO DE SCHEMA:', error);
      throw error;
    }
  },

  /**
   * VALIDAÇÃO DE DADOS - Verificação UUID e consistência
   */
  async validateData(): Promise<void> {
    console.log('[EmergencyProtocol] 🔍 VALIDANDO DADOS...');
    
    try {
      // Validar categorias existentes
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');

      if (categoriesError) {
        console.error('[EmergencyProtocol] ❌ ERRO AO VALIDAR CATEGORIAS:', categoriesError);
        throw categoriesError;
      }

      if (categories) {
        console.log('[EmergencyProtocol] 📊 VALIDANDO UUIDs DAS CATEGORIAS...');
        
        for (const category of categories) {
          if (!this.isValidUUID(category.id)) {
            console.error('[EmergencyProtocol] ❌ UUID INVÁLIDO ENCONTRADO:', {
              name: category.name,
              id: category.id,
              isValid: false
            });
            throw new Error(`UUID inválido encontrado: ${category.id} para categoria ${category.name}`);
          }
        }

        console.log('[EmergencyProtocol] ✅ TODOS OS UUIDs DE CATEGORIAS SÃO VÁLIDOS');
      }

      // Validar produtos existentes
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category_id');

      if (productsError) {
        console.error('[EmergencyProtocol] ❌ ERRO AO VALIDAR PRODUTOS:', productsError);
        throw productsError;
      }

      if (products) {
        console.log('[EmergencyProtocol] 📊 VALIDANDO UUIDs DOS PRODUTOS...');
        
        for (const product of products) {
          // Validar ID do produto
          if (!this.isValidUUID(product.id)) {
            console.error('[EmergencyProtocol] ❌ UUID DE PRODUTO INVÁLIDO:', {
              name: product.name,
              id: product.id,
              isValid: false
            });
            throw new Error(`UUID de produto inválido: ${product.id} para ${product.name}`);
          }

          // Validar category_id se existir
          if (product.category_id && !this.isValidUUID(product.category_id)) {
            console.error('[EmergencyProtocol] ❌ CATEGORY_ID INVÁLIDO:', {
              productName: product.name,
              categoryId: product.category_id,
              isValid: false
            });
            throw new Error(`category_id inválido: ${product.category_id} para produto ${product.name}`);
          }
        }

        console.log('[EmergencyProtocol] ✅ TODOS OS UUIDs DE PRODUTOS SÃO VÁLIDOS');
      }

      console.log('[EmergencyProtocol] ✅ VALIDAÇÃO DE DADOS CONCLUÍDA');
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NA VALIDAÇÃO DE DADOS:', error);
      throw error;
    }
  },

  /**
   * VALIDAÇÃO DE UUID - Verificação rigorosa
   */
  isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    // ✅ CRÍTICO: Verificar se tem 36 caracteres (UUID padrão)
    if (uuid.length !== 36) {
      console.log('[EmergencyProtocol] ❌ UUID COM TAMANHO INVÁLIDO:', {
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
      console.log('[EmergencyProtocol] ❌ UUID COM FORMATO INVÁLIDO:', {
        uuid,
        regex: uuidRegex.toString()
      });
    }

    return isValid;
  },

  /**
   * VALIDAÇÃO ANTES DE INSERT/UPDATE - Verificação obrigatória
   */
  validateBeforeOperation(data: any, operation: 'insert' | 'update'): { isValid: boolean; error?: string } {
    console.log(`[EmergencyProtocol] 🔍 VALIDANDO ANTES DE ${operation.toUpperCase()}...`, data);

    try {
      // Para produtos, validar category_id
      if (data.category_id) {
        if (!this.isValidUUID(data.category_id)) {
          const error = `category_id inválido: ${data.category_id}. Deve ser UUID de 36 caracteres.`;
          console.error('[EmergencyProtocol] ❌', error);
          return { isValid: false, error };
        }
      }

      // Validar ID se for update
      if (operation === 'update' && data.id) {
        if (!this.isValidUUID(data.id)) {
          const error = `ID inválido para update: ${data.id}. Deve ser UUID de 36 caracteres.`;
          console.error('[EmergencyProtocol] ❌', error);
          return { isValid: false, error };
        }
      }

      console.log(`[EmergencyProtocol] ✅ VALIDAÇÃO ${operation.toUpperCase()} APROVADA`);
      return { isValid: true };
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NA VALIDAÇÃO:', error);
      return { isValid: false, error: 'Erro na validação dos dados' };
    }
  },

  /**
   * RECUPERAÇÃO DE EMERGÊNCIA - Reset completo
   */
  async emergencyRecovery(): Promise<void> {
    console.log('[EmergencyProtocol] 🚨 RECUPERAÇÃO DE EMERGÊNCIA...');
    
    try {
      // 1. Limpeza completa
      await this.performCacheCleanup();
      
      // 2. Forçar reload para limpar estado
      console.log('[EmergencyProtocol] 🔄 FORÇANDO RECARREGAMENTO...');
      
      // Mostrar mensagem para usuário
      const message = document.createElement('div');
      message.textContent = 'Protocolo de emergência executado. Recarregando...';
      message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc2626;
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;
      document.body.appendChild(message);
      
      // Recarregar após 3 segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('[EmergencyProtocol] ❌ ERRO NA RECUPERAÇÃO:', error);
      throw error;
    }
  }
};
