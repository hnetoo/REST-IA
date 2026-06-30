import { Dish, MenuCategory } from '../../types';

/**
 * SERVIÇO DE RECUPERAÇÃO DE PRODUTOS CORROMPIDOS
 * 
 * PROBLEMA IDENTIFICADO:
 * - Todos os produtos foram movidos para "Bebidas" 
 * - URLs das imagens desapareceram (image_url: null)
 * - Incompatibilidade de campos: categoryId vs category_id, image vs image_url
 */

interface ProductData {
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
  categoryId?: string | null;
  image_url?: string | null;
  image?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  is_available?: boolean | null;
  costPrice?: number;
}

interface CategoryData {
  id: string;
  name: string;
  image_url?: string | null;
}

class ProductRecoveryService {
  // ✅ DESATIVADO: Produtos hardcoded removidos
  // Os produtos devem ser gerenciados apenas pelo Supabase
  private readonly ORIGINAL_CATEGORIES: any[] = [];

  private readonly ORIGINAL_PRODUCTS: any[] = [];

  /**
   * Analisa o estado atual dos dados e identifica a corrupção
   */
  analyzeDataCorruption(categories: any[], products: any[]): {
    isCorrupted: boolean;
    issues: string[];
    corruptedProducts: any[];
    missingCategories: string[];
  } {
    const issues: string[] = [];
    const corruptedProducts: any[] = [];
    const missingCategories: string[] = [];

    // Verificar se todas as categorias originais existem
    this.ORIGINAL_CATEGORIES.forEach(originalCat => {
      const exists = categories.some(cat => cat.id === originalCat.id);
      if (!exists) {
        missingCategories.push(originalCat.id);
        issues.push(`Categoria ausente: ${originalCat.name} (${originalCat.id})`);
      }
    });

    // Verificar corrupção nos produtos
    products.forEach(product => {
      let productIssues: string[] = [];

      // Verificar se está na categoria errada (forçado para "Bebidas")
      if (product.category_id === 'cat_bebidas' || product.categoryId === 'cat_bebidas') {
        const originalProduct = this.ORIGINAL_PRODUCTS.find(p => p.id === product.id);
        if (originalProduct && originalProduct.categoryId !== 'cat_bebidas') {
          productIssues.push(`Categoria errada: deveria ser ${originalProduct.categoryId}`);
        }
      }

      // Verificar se a imagem está ausente
      if (!product.image && !product.image_url) {
        productIssues.push('Imagem ausente');
      }

      // Verificar campos inconsistentes
      if (product.category_id && product.categoryId && product.category_id !== product.categoryId) {
        productIssues.push('Campos category_id e categoryId inconsistentes');
      }

      if (product.image && product.image_url && product.image !== product.image_url) {
        productIssues.push('Campos image e image_url inconsistentes');
      }

      if (productIssues.length > 0) {
        corruptedProducts.push({
          product,
          issues: productIssues
        });
        issues.push(`Produto "${product.name}" corrompido: ${productIssues.join(', ')}`);
      }
    });

    return {
      isCorrupted: issues.length > 0,
      issues,
      corruptedProducts,
      missingCategories
    };
  }

  /**
   * Recupera os produtos corrompidos restaurando os dados originais
   */
  recoverProducts(categories: any[], products: any[]): {
    recoveredCategories: MenuCategory[];
    recoveredProducts: Dish[];
    recoveryReport: {
      categoriesRestored: number;
      productsRestored: number;
      imagesRestored: number;
      errors: string[];
    };
  } {
    const recoveryReport = {
      categoriesRestored: 0,
      productsRestored: 0,
      imagesRestored: 0,
      errors: [] as string[]
    };

    // 1. Recuperar categorias ausentes
    let recoveredCategories = [...categories];
    this.ORIGINAL_CATEGORIES.forEach(originalCat => {
      const exists = recoveredCategories.some(cat => cat.id === originalCat.id);
      if (!exists) {
        recoveredCategories.push({
          id: originalCat.id,
          name: originalCat.name,
          icon: originalCat.icon,
          isVisibleDigital: true,
          products: []
        } as MenuCategory);
        recoveryReport.categoriesRestored++;
      }
    });

    // 2. Recuperar produtos corrompidos
    let recoveredProducts = products.map(product => {
      const originalProduct = this.ORIGINAL_PRODUCTS.find(p => p.id === product.id);
      
      if (originalProduct) {
        // Restaurar dados originais
        const recovered: Dish = {
          ...product,
          name: originalProduct.name,
          description: originalProduct.description,
          price: originalProduct.price,
          costPrice: originalProduct.costPrice,
          categoryId: originalProduct.categoryId,
          image: originalProduct.image,
          taxCode: originalProduct.taxCode || 'NOR',
          isVisibleDigital: true,
          isFeatured: false
        };

        // Corrigir campos para compatibilidade com Supabase
        if (product.category_id !== undefined) {
          (recovered as any).category_id = originalProduct.categoryId;
        }
        if (product.image_url !== undefined) {
          (recovered as any).image_url = originalProduct.image;
        }

        recoveryReport.productsRestored++;
        
        if (!product.image && !product.image_url) {
          recoveryReport.imagesRestored++;
        }

        return recovered;
      }

      return product;
    });

    // 3. Garantir que todos os produtos originais existam
    this.ORIGINAL_PRODUCTS.forEach(originalProduct => {
      const exists = recoveredProducts.some(p => p.id === originalProduct.id);
      if (!exists) {
        const newProduct: Dish = {
          id: originalProduct.id,
          name: originalProduct.name,
          description: originalProduct.description,
          price: originalProduct.price,
          costPrice: originalProduct.costPrice,
          category_id: originalProduct.categoryId || '',
          image: originalProduct.image,
          taxCode: originalProduct.taxCode || 'NOR',
          isVisibleDigital: true,
          isFeatured: false
        };

        // Adicionar campos para compatibilidade com Supabase
        (newProduct as any).category_id = originalProduct.categoryId;
        (newProduct as any).image_url = originalProduct.image;
        (newProduct as any).is_active = true;
        (newProduct as any).is_available = true;

        recoveredProducts.push(newProduct);
        recoveryReport.productsRestored++;
        recoveryReport.imagesRestored++;
      }
    });

    return {
      recoveredCategories,
      recoveredProducts,
      recoveryReport
    };
  }

  /**
   * Executa a recuperação completa dos dados
   */
  async executeFullRecovery(currentState: any): Promise<{
    success: boolean;
    recoveredState: any;
    report: any;
  }> {
    try {
      const { categories = [], menu = [] } = currentState;
      
      console.log('[PRODUCT RECOVERY] Iniciando análise de corrupção...');
      
      // Análise inicial
      const analysis = this.analyzeDataCorruption(categories, menu);
      
      if (!analysis.isCorrupted) {
        console.log('[PRODUCT RECOVERY] Nenhuma corrupção detectada.');
        return {
          success: true,
          recoveredState: currentState,
          report: {
            message: 'Nenhuma corrupção detectada',
            issues: []
          }
        };
      }

      console.log('[PRODUCT RECOVERY] Corrupção detectada:', analysis);
      
      // Executar recuperação
      const recovery = this.recoverProducts(categories, menu);
      
      const recoveredState = {
        ...currentState,
        categories: recovery.recoveredCategories,
        menu: recovery.recoveredProducts
      };

      console.log('[PRODUCT RECOVERY] Recuperação concluída:', recovery.recoveryReport);

      return {
        success: true,
        recoveredState,
        report: {
          analysis,
          recovery: recovery.recoveryReport,
          message: `Recuperação concluída: ${recovery.recoveryReport.categoriesRestored} categorias, ${recovery.recoveryReport.productsRestored} produtos, ${recovery.recoveryReport.imagesRestored} imagens restauradas`
        }
      };

    } catch (error: any) {
      console.error('[PRODUCT RECOVERY] Erro na recuperação:', error);
      return {
        success: false,
        recoveredState: currentState,
        report: {
          error: error.message,
          message: 'Falha na recuperação de produtos'
        }
      };
    }
  }
}

export const productRecoveryService = new ProductRecoveryService();
