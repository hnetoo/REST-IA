// Serviço de Limpeza de IDs - Converte IDs locais para UUIDs do Supabase
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

interface LocalProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string;
  is_active: boolean;
  costPrice?: number;
  categoryId?: string;
  description?: string;
  image?: string;
  createdAt?: string;
}

export const idCleanupService = {
  // Verifica se um ID é incompatível (curto/numérico)
  isIncompatibleId: (id: string): boolean => {
    if (!id) return false;
    
    // IDs curtos ou numéricos são incompatíveis com UUID
    const isShort = id.length < 10;
    const isNumeric = /^\d+$/.test(id);
    
    return isShort || isNumeric;
  },

  // Limpa produtos com IDs incompatíveis
  cleanupLocalProducts: async () => {
    console.log('[ID Cleanup] Iniciando limpeza de IDs incompatíveis...');
    
    try {
      // Buscar todos os produtos locais
      const { menu } = useStore.getState();
      const incompatibleProducts = menu.filter(product => 
        idCleanupService.isIncompatibleId(product.id)
      );
      
      if (incompatibleProducts.length === 0) {
        console.log('[ID Cleanup] Nenhum produto incompatível encontrado.');
        return;
      }
      
      console.log(`[ID Cleanup] Encontrados ${incompatibleProducts.length} produtos incompatíveis:`, 
        incompatibleProducts.map(p => ({ id: p.id, name: p.name }))
      );
      
      // Para cada produto incompatível, criar novo no Supabase sem ID
      for (const localProduct of incompatibleProducts) {
        console.log(`[ID Cleanup] Processando produto: ${localProduct.name} (ID: ${localProduct.id})`);
        
        // Criar novo produto no Supabase sem passar ID (deixa Supabase gerar UUID)
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            name: localProduct.name,
            price: localProduct.price,
            image_url: localProduct.image_url,
            is_active: localProduct.is_active,
            category_id: localProduct.category_id
          })
          .select()
          .single();
        
        if (insertError) {
          console.error(`[ID Cleanup] Erro ao criar produto ${localProduct.name}:`, insertError);
          continue;
        }
        
        if (!newProduct || !newProduct.id) {
          console.error(`[ID Cleanup] Produto criado sem ID: ${localProduct.name}`);
          continue;
        }
        
        console.log(`[ID Cleanup] ✅ Produto recriado com UUID: ${localProduct.name} -> ${newProduct.id}`);
        
        // Atualizar store local com novo UUID
        const { updateDish, removeDish, addDish } = useStore.getState();
        
        // Remover produto antigo com ID incompatível
        removeDish(localProduct.id);
        
        // Adicionar produto novo com UUID do Supabase
        const updatedProduct: LocalProduct = {
          ...localProduct,
          id: newProduct.id, // ✅ UUID real do Supabase
          costPrice: localProduct.costPrice || localProduct.price * 0.6,
          categoryId: localProduct.category_id,
          description: localProduct.description || '',
          image: localProduct.image || '',
          image_url: newProduct.image_url || localProduct.image_url,
          createdAt: newProduct.created_at || new Date().toISOString()
        };
        
        addDish(updatedProduct);
        console.log(`[ID Cleanup] ✅ Produto atualizado no store: ${newProduct.id}`);
      }
      
      console.log(`[ID Cleanup] ✅ Limpeza concluída. ${incompatibleProducts.length} produtos convertidos para UUIDs.`);
      
    } catch (error) {
      console.error('[ID Cleanup] Erro durante limpeza:', error);
      throw error;
    }
  },

  // Verifica status da limpeza
  getCleanupStatus: () => {
    const { menu } = useStore.getState();
    const incompatibleProducts = menu.filter(product => 
      idCleanupService.isIncompatibleId(product.id)
    );
    
    return {
      total: menu.length,
      incompatible: incompatibleProducts.length,
      compatible: menu.length - incompatibleProducts.length,
      needsCleanup: incompatibleProducts.length > 0
    };
  }
};
