const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mapeamento correto baseado nos nomes dos produtos
const categoryMapping = {
  'Bebidas': '60e813bb-62af-4ae6-b90d-1f3ebda738f9',
  'Pratos Principais': '43b27bae-68f6-4620-b78a-6b5aa83c0bf3',
  'Entradas e Sopas': '95e3a4f5-b1cf-4668-9598-1dc15565b516',
  'Sobremesas': '28ba8778-272e-4710-8ba1-ebebfe753d47',
  'Petiscos': '5da5f9df-ba68-46f2-b74a-9530c18c5324',
  'Fast Food': '565f8271-5af4-428c-83c3-fe7582a25b70',
  'Pequeno Almoço e Sandes': 'efabb575-e8a0-46bb-88e1-b746c7bcb44b',
  'Pizzas': '83d0a506-b9f1-4e60-be2f-43641b46c3b0',
  'Guarnições': '2981b710-2a5b-4c31-9787-36d74b601cba',
  'Grelhados': 'b575f9c3-184a-4889-b006-97362611c30f',
  'Vinhos': '87e1eb83-efca-45aa-9bb6-e94507062296',
  'Bebidas não Alcóolicas': 'ea25ded3-021f-4b0b-9165-1a79e5fb54eb',
  'Fino': '536e8aec-251c-46d0-833f-1876021ee436'
};

function categorizeProduct(productName) {
  const name = productName.toLowerCase();
  
  // Bebidas alcoólicas
  if (name.includes('cuca') || name.includes('ngola') || name.includes('cerva') || name.includes('vinho') || name.includes('fino')) {
    return categoryMapping['Bebidas'];
  }
  
  // Bebidas não alcoólicas
  if (name.includes('refrigerante') || name.includes('sumo') || name.includes('água') || name.includes('suco')) {
    return categoryMapping['Bebidas não Alcóolicas'];
  }
  
  // Pratos principais
  if (name.includes('moamba') || name.includes('parmegiana') || name.includes('picanha') || name.includes('peito') || name.includes('entremeada') || name.includes('frango')) {
    return categoryMapping['Pratos Principais'];
  }
  
  // Peixe
  if (name.includes('peixe') || name.includes('atum') || name.includes('bacalhau')) {
    return categoryMapping['Pratos Principais'];
  }
  
  // Entradas e Sopas
  if (name.includes('sopa') || name.includes('paté') || name.includes('molho') || name.includes('entrada')) {
    return categoryMapping['Entradas e Sopas'];
  }
  
  // Sobremesas
  if (name.includes('doce') || name.includes('sobremesa') || name.includes('pudim') || name.includes('mousse')) {
    return categoryMapping['Sobremesas'];
  }
  
  // Petiscos
  if (name.includes('petisco') || name.includes('kitaba') || name.includes('pão') || name.includes('tosta')) {
    return categoryMapping['Petiscos'];
  }
  
  // Fast Food
  if (name.includes('burger') || name.includes('hambúrguer') || name.includes('pizza') || name.includes('sandwich') || name.includes('sandes')) {
    return categoryMapping['Fast Food'];
  }
  
  // Guarnições
  if (name.includes('batata') || name.includes('arroz') || name.includes('feijão') || name.includes('salada')) {
    return categoryMapping['Guarnições'];
  }
  
  // Grelhados
  if (name.includes('grelhado') || name.includes('grelhados')) {
    return categoryMapping['Grelhados'];
  }
  
  // Pequeno Almoço
  if (name.includes('omelete') || name.includes('pequeno almoço') || name.includes('café')) {
    return categoryMapping['Pequeno Almoço e Sandes'];
  }
  
  // Default para Pratos Principais se não conseguir categorizar
  return categoryMapping['Pratos Principais'];
}

async function fixCategories() {
  try {
    console.log('A buscar produtos corrompidos...');
    const { data: products, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return;
    }
    
    console.log(`Encontrados ${products.length} produtos para corrigir...`);
    
    let corrected = 0;
    const corrections = [];
    
    for (const product of products) {
      const correctCategoryId = categorizeProduct(product.name);
      
      if (product.category_id !== correctCategoryId) {
        corrections.push({
          id: product.id,
          name: product.name,
          old_category: product.category_id,
          new_category: correctCategoryId
        });
        
        // Atualizar produto
        const { error: updateError } = await supabase
          .from('products')
          .update({ category_id: correctCategoryId })
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar produto ${product.name}:`, updateError);
        } else {
          corrected++;
          console.log(`✅ Corrigido: ${product.name} -> Categoria: ${correctCategoryId}`);
        }
      }
    }
    
    console.log(`\n📊 RESUMO DA CORREÇÃO:`);
    console.log(`- Total de produtos: ${products.length}`);
    console.log(`- Produtos corrigidos: ${corrected}`);
    console.log(`- Produtos mantidos: ${products.length - corrected}`);
    
    // Mostrar primeiras 20 correções
    console.log(`\n🔧 PRIMEIRAS 20 CORREÇÕES:`);
    corrections.slice(0, 20).forEach(c => {
      console.log(`- ${c.name}: ${c.old_category} -> ${c.new_category}`);
    });
    
    if (corrections.length > 20) {
      console.log(`... e mais ${corrections.length - 20} correções`);
    }
    
  } catch (err) {
    console.error('Erro crítico:', err);
  }
}

fixCategories();
