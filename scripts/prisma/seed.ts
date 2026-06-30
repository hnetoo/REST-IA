import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env' });

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Dados das categorias
const categories = [
  { name: 'Entradas', icon: 'UtensilsCrossed', is_visible_digital: true },
  { name: 'Hambúrgueres', icon: 'Beef', is_visible_digital: true },
  { name: 'Sanduíches', icon: 'Sandwich', is_visible_digital: true },
  { name: 'Wraps', icon: 'Wrap', is_visible_digital: true },
  { name: 'Pizzas', icon: 'Pizza', is_visible_digital: true },
  { name: 'Hot Dogs', icon: 'HotDog', is_visible_digital: true },
  { name: 'Saladas', icon: 'Salad', is_visible_digital: true },
  { name: 'Pratos Principais', icon: 'ChefHat', is_visible_digital: true },
  { name: 'Acompanhamentos', icon: 'Fries', is_visible_digital: true },
  { name: 'Sobremesas', icon: 'Cake', is_visible_digital: true },
  { name: 'Bebidas', icon: 'GlassWater', is_visible_digital: true },
  { name: 'Cafetaria', icon: 'Coffee', is_visible_digital: true },
  { name: 'Cocktails', icon: 'Wine', is_visible_digital: true },
];

// Dados dos 91 produtos
const productsData = [
  // Entradas (1-8)
  { name: 'Batatas Fritas Pequenas', price: 800, cost_price: 300, category: 'Entradas', description: 'Porção de 200g' },
  { name: 'Batatas Fritas Grandes', price: 1200, cost_price: 450, category: 'Entradas', description: 'Porção de 400g' },
  { name: 'Aros de Cebola', price: 1000, cost_price: 350, category: 'Entradas', description: '10 unidades crocantes' },
  { name: 'Nuggets de Frango', price: 1500, cost_price: 600, category: 'Entradas', description: '8 unidades com molho' },
  { name: 'Mozzarella Sticks', price: 1400, cost_price: 550, category: 'Entradas', description: '6 palitos de mozzarella' },
  { name: 'Tiras de Frango Crocantes', price: 1600, cost_price: 650, category: 'Entradas', description: '5 tiras grandes' },
  { name: 'Nachos com Queijo', price: 1300, cost_price: 480, category: 'Entradas', description: 'Com cheddar e jalapeños' },
  { name: 'Bruschetta Italiana', price: 1100, cost_price: 400, category: 'Entradas', description: '4 unidades com tomate e manjericão' },

  // Hambúrgueres (9-24)
  { name: 'Classic Burger', price: 2500, cost_price: 900, category: 'Hambúrgueres', description: 'Carne 150g, queijo, alface, tomate' },
  { name: 'Cheeseburger Duplo', price: 3500, cost_price: 1300, category: 'Hambúrgueres', description: '2 carnes de 150g, duplo queijo' },
  { name: 'Bacon Burger', price: 3200, cost_price: 1200, category: 'Hambúrgueres', description: 'Carne 180g, bacon crocante, cheddar' },
  { name: 'Chicken Burger', price: 2800, cost_price: 1000, category: 'Hambúrgueres', description: 'Peito de frango grelhado 200g' },
  { name: 'BBQ Burger', price: 3300, cost_price: 1150, category: 'Hambúrgueres', description: 'Carne 180g, molho barbecue, cebola caramelizada' },
  { name: 'Mushroom Swiss Burger', price: 3100, cost_price: 1100, category: 'Hambúrgueres', description: 'Carne 180g, cogumelos, queijo suíço' },
  { name: 'Spicy Jalapeño Burger', price: 3000, cost_price: 1050, category: 'Hambúrgueres', description: 'Carne 180g, jalapeños, pimenta' },
  { name: 'Veggie Burger', price: 2600, cost_price: 950, category: 'Hambúrgueres', description: 'Hambúrguer de grão de bico 150g' },
  { name: 'Fish Burger', price: 2900, cost_price: 1100, category: 'Hambúrgueres', description: 'Filete de peixe empanado 180g' },
  { name: 'Egg Bacon Burger', price: 3400, cost_price: 1250, category: 'Hambúrgueres', description: 'Carne 180g, ovo frito, bacon' },
  { name: 'Blue Cheese Burger', price: 3600, cost_price: 1350, category: 'Hambúrgueres', description: 'Carne 200g, queijo azul, cebola caramelizada' },
  { name: 'Guacamole Burger', price: 3300, cost_price: 1200, category: 'Hambúrgueres', description: 'Carne 180g, guacamole, nachos' },
  { name: 'Truffle Burger', price: 4500, cost_price: 1800, category: 'Hambúrgueres', description: 'Carne 200g, azeite de trufas, cogumelos' },
  { name: 'Pulled Pork Burger', price: 3800, cost_price: 1400, category: 'Hambúrgueres', description: 'Carne de porco desfiada, coleslaw' },
  { name: 'Surf & Turf Burger', price: 4200, cost_price: 1650, category: 'Hambúrgueres', description: 'Carne 150g + camarão empanado' },
  { name: 'Monster Burger', price: 5500, cost_price: 2100, category: 'Hambúrgueres', description: '3 carnes de 150g, triplo queijo, bacon' },

  // Sanduíches (25-36)
  { name: 'Sanduíche de Frango', price: 2200, cost_price: 800, category: 'Sanduíches', description: 'Peito de frango grelhado com maionese' },
  { name: 'Club Sandwich', price: 2800, cost_price: 1000, category: 'Sanduíches', description: 'Triplo andar com frango, bacon, ovo' },
  { name: 'Sanduíche de Atum', price: 2400, cost_price: 900, category: 'Sanduíches', description: 'Atum com alface e tomate' },
  { name: 'Bauru', price: 2500, cost_price: 950, category: 'Sanduíches', description: 'Presunto, queijo, tomate e orégano' },
  { name: 'Sanduíche de Peru', price: 2300, cost_price: 850, category: 'Sanduíches', description: 'Peito de peru defumado' },
  { name: 'Philly Cheesesteak', price: 3200, cost_price: 1200, category: 'Sanduíches', description: 'Carne fatiada, queijo derretido, pimentões' },
  { name: 'Cubano', price: 3000, cost_price: 1100, category: 'Sanduíches', description: 'Presunto, porco assado, queijo, picles' },
  { name: 'Reuben', price: 3100, cost_price: 1150, category: 'Sanduíches', description: 'Corned beef, chucrute, queijo suíço' },
  { name: 'Sanduíche de Omelete', price: 1800, cost_price: 650, category: 'Sanduíches', description: 'Omelete de queijo com ervas' },
  { name: 'BLT', price: 2400, cost_price: 900, category: 'Sanduíches', description: 'Bacon, alface, tomate, maionese' },
  { name: 'Panini Caprese', price: 2200, cost_price: 800, category: 'Sanduíches', description: 'Mozzarella, tomate, manjericão, pesto' },
  { name: 'Sanduíche de Presunto Cru', price: 2900, cost_price: 1100, category: 'Sanduíches', description: 'Prosciutto com rúcula e queijo brie' },

  // Wraps (37-42)
  { name: 'Wrap de Frango Caesar', price: 2500, cost_price: 950, category: 'Wraps', description: 'Frango grelhado, alface, molho caesar' },
  { name: 'Wrap de Atum', price: 2300, cost_price: 880, category: 'Wraps', description: 'Atum com alface e tomate' },
  { name: 'Wrap Vegetariano', price: 2100, cost_price: 780, category: 'Wraps', description: 'Hummus, vegetais grelhados, rúcula' },
  { name: 'Wrap de Falafel', price: 2200, cost_price: 820, category: 'Wraps', description: 'Bolinhos de grão com tahine' },
  { name: 'Wrap de Carne', price: 2800, cost_price: 1050, category: 'Wraps', description: 'Carne grelhada, cebola caramelizada, queijo' },
  { name: 'Wrap de Salmão', price: 3200, cost_price: 1250, category: 'Wraps', description: 'Salmão defumado com cream cheese' },

  // Pizzas (43-50)
  { name: 'Pizza Margherita', price: 3500, cost_price: 1200, category: 'Pizzas', description: 'Molho de tomate, mozzarella, manjericão' },
  { name: 'Pizza Pepperoni', price: 4200, cost_price: 1500, category: 'Pizzas', description: 'Pepperoni fatiado com mozzarella' },
  { name: 'Pizza Quatro Queijos', price: 4500, cost_price: 1600, category: 'Pizzas', description: 'Mozzarella, gorgonzola, parmesão, catupiry' },
  { name: 'Pizza Frango com Catupiry', price: 4300, cost_price: 1550, category: 'Pizzas', description: 'Frango desfiado, catupiry, milho' },
  { name: 'Pizza Calabresa', price: 4000, cost_price: 1450, category: 'Pizzas', description: 'Calabresa, cebola, azeitonas' },
  { name: 'Pizza Vegetariana', price: 3800, cost_price: 1350, category: 'Pizzas', description: 'Berinjela, abobrinha, pimentão, cogumelos' },
  { name: 'Pizza Portuguesa', price: 4400, cost_price: 1580, category: 'Pizzas', description: 'Presunto, ovos, cebola, azeitonas, ervilha' },
  { name: 'Pizza Supreme', price: 4800, cost_price: 1750, category: 'Pizzas', description: 'Pepperoni, pimentões, cebola, cogumelos' },

  // Hot Dogs (51-56)
  { name: 'Hot Dog Clássico', price: 1500, cost_price: 550, category: 'Hot Dogs', description: 'Salsicha, pão, mostarda, ketchup' },
  { name: 'Hot Dog Completo', price: 2000, cost_price: 750, category: 'Hot Dogs', description: 'Salsicha, bacon, catupiry, batata palha' },
  { name: 'Hot Dog Paulista', price: 2200, cost_price: 850, category: 'Hot Dogs', description: 'Salsicha, purê de batata, molho de tomate' },
  { name: 'Hot Dog Chicago', price: 2500, cost_price: 950, category: 'Hot Dogs', description: 'Salsicha de carne, pimentão, picles, tomate' },
  { name: 'Hot Dog Gourmet', price: 2800, cost_price: 1050, category: 'Hot Dogs', description: 'Salsicha artesanal, cebola caramelizada' },
  { name: 'Choripán', price: 2400, cost_price: 900, category: 'Hot Dogs', description: 'Linguiça chorizo, chimichurri, pão crocante' },

  // Saladas (57-62)
  { name: 'Salada Caesar', price: 2500, cost_price: 900, category: 'Saladas', description: 'Alface romana, croutons, parmesão, molho caesar' },
  { name: 'Salada Grega', price: 2800, cost_price: 1000, category: 'Saladas', description: 'Pepino, tomate, cebola, azeitonas, feta' },
  { name: 'Salada Caprese', price: 2600, cost_price: 950, category: 'Saladas', description: 'Tomate, mozzarella, manjericão, azeite' },
  { name: 'Salada de Frango Grelhado', price: 3200, cost_price: 1200, category: 'Saladas', description: 'Peito de frango, mix de folhas, croutons' },
  { name: 'Salada de Salmão', price: 3800, cost_price: 1500, category: 'Saladas', description: 'Salmão defumado, rúcula, cream cheese' },
  { name: 'Salada Cobb', price: 3400, cost_price: 1250, category: 'Saladas', description: 'Frango, bacon, ovo, abacate, queijo azul' },

  // Pratos Principais (63-70)
  { name: 'Filé Mignon', price: 6500, cost_price: 2800, category: 'Pratos Principais', description: '200g com molho madeira' },
  { name: 'Risotto de Cogumelos', price: 4200, cost_price: 1500, category: 'Pratos Principais', description: 'Arroz arbóreo, cogumelos frescos, parmesão' },
  { name: 'Salmão Grelhado', price: 5800, cost_price: 2400, category: 'Pratos Principais', description: 'Filé de salmão com legumes' },
  { name: 'Strogonoff de Frango', price: 3500, cost_price: 1300, category: 'Pratos Principais', description: 'Com batata palha' },
  { name: 'Lasagna à Bolonhesa', price: 3800, cost_price: 1400, category: 'Pratos Principais', description: 'Camadas de massa, carne, queijo, molho' },
  { name: 'Camarão ao Alho', price: 5200, cost_price: 2200, category: 'Pratos Principais', description: 'Camarões salteados com alho e azeite' },
  { name: 'Frango Parmegiana', price: 4000, cost_price: 1500, category: 'Pratos Principais', description: 'Peito empanado com molho e queijo' },
  { name: 'Bife à Parmegiana', price: 4500, cost_price: 1700, category: 'Pratos Principais', description: 'Contra-filé empanado' },

  // Acompanhamentos (71-76)
  { name: 'Arroz Branco', price: 800, cost_price: 250, category: 'Acompanhamentos', description: 'Porção individual' },
  { name: 'Arroz à Grega', price: 1000, cost_price: 350, category: 'Acompanhamentos', description: 'Com legumes e passas' },
  { name: 'Purê de Batatas', price: 900, cost_price: 300, category: 'Acompanhamentos', description: 'Com manteiga' },
  { name: 'Legumes Salteados', price: 1200, cost_price: 450, category: 'Acompanhamentos', description: 'Mix de legumes da estação' },
  { name: 'Batata Rústica', price: 1100, cost_price: 400, category: 'Acompanhamentos', description: 'Com alecrim e alho' },
  { name: 'Farofa Crocante', price: 600, cost_price: 200, category: 'Acompanhamentos', description: 'Com bacon e ovos' },

  // Sobremesas (77-84)
  { name: 'Cheesecake', price: 1800, cost_price: 650, category: 'Sobremesas', description: 'Com calda de frutas vermelhas' },
  { name: 'Tiramisù', price: 2000, cost_price: 750, category: 'Sobremesas', description: 'Clássico italiano com café' },
  { name: 'Pudim de Leite', price: 1400, cost_price: 500, category: 'Sobremesas', description: 'Cremoso com calda de caramelo' },
  { name: 'Brownie com Sorvete', price: 2200, cost_price: 800, category: 'Sobremesas', description: 'Brownie quente com bola de baunilha' },
  { name: 'Mousse de Chocolate', price: 1600, cost_price: 600, category: 'Sobremesas', description: 'Cremoso e aerado' },
  { name: 'Torta de Maçã', price: 1700, cost_price: 650, category: 'Sobremesas', description: 'Fatia com canela e sorvete' },
  { name: 'Sorvete Artesanal', price: 1200, cost_price: 450, category: 'Sobremesas', description: '2 bolas, sabores variados' },
  { name: 'Petit Gateau', price: 2500, cost_price: 900, category: 'Sobremesas', description: 'Bolo quente com sorvete' },

  // Bebidas (85-91)
  { name: 'Refrigerante Lata', price: 700, cost_price: 280, category: 'Bebidas', description: '350ml' },
  { name: 'Refrigerante 600ml', price: 1200, cost_price: 480, category: 'Bebidas', description: 'Garrafa' },
  { name: 'Água Mineral 500ml', price: 500, cost_price: 200, category: 'Bebidas', description: 'Sem gás' },
  { name: 'Água com Gás 500ml', price: 600, cost_price: 240, category: 'Bebidas', description: 'Com gás' },
  { name: 'Suco Natural', price: 1500, cost_price: 550, category: 'Bebidas', description: 'Laranja ou maracujá 400ml' },
  { name: 'Chá Gelado', price: 1000, cost_price: 380, category: 'Bebidas', description: 'Limão ou pêssego 400ml' },
  { name: 'Cerveja Long Neck', price: 1800, cost_price: 700, category: 'Bebidas', description: '355ml' },
];

// Dados dos funcionários
const staffData = [
  { full_name: 'João Silva', role: 'Gerente', base_salary_kz: 450000, phone: '923456789', status: 'active' },
  { full_name: 'Maria Santos', role: 'Chef de Cozinha', base_salary_kz: 380000, phone: '912345678', status: 'active' },
  { full_name: 'Pedro Oliveira', role: 'Cozinheiro', base_salary_kz: 250000, phone: '934567890', status: 'active' },
  { full_name: 'Ana Ferreira', role: 'Garçonete', base_salary_kz: 180000, phone: '945678901', status: 'active' },
  { full_name: 'Carlos Rodrigues', role: 'Garçom', base_salary_kz: 180000, phone: '956789012', status: 'active' },
  { full_name: 'Beatriz Costa', role: 'Atendente Caixa', base_salary_kz: 200000, phone: '967890123', status: 'active' },
  { full_name: 'Fernando Lima', role: 'Auxiliar de Cozinha', base_salary_kz: 150000, phone: '978901234', status: 'active' },
  { full_name: 'Juliana Martins', role: 'Garçonete', base_salary_kz: 180000, phone: '989012345', status: 'active' },
  { full_name: 'Ricardo Almeida', role: 'Barman', base_salary_kz: 220000, phone: '990123456', status: 'active' },
  { full_name: 'Luciana Pereira', role: 'Recepcionista', base_salary_kz: 190000, phone: '901234567', status: 'active' },
];

// Função para criar UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function seed() {
  console.log('🌱 Iniciando seed do Supabase...\n');

  try {
    // 1. Inserir categorias
    console.log('📁 Inserindo categorias...');
    const categoryMap: Record<string, string> = {};

    for (const category of categories) {
      const categoryId = generateUUID();
      const { error } = await supabase
        .from('categories')
        .insert({
          id: categoryId,
          name: category.name,
          icon: category.icon,
          is_visible_digital: category.is_visible_digital,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`❌ Erro ao inserir categoria ${category.name}:`, error.message);
      } else {
        categoryMap[category.name] = categoryId;
        console.log(`✅ Categoria: ${category.name}`);
      }
    }

    console.log(`\n📦 ${Object.keys(categoryMap).length} categorias inseridas\n`);

    // 2. Inserir produtos
    console.log('🍔 Inserindo 91 produtos...');
    let productsInserted = 0;

    for (const product of productsData) {
      const categoryId = categoryMap[product.category];

      if (!categoryId) {
        console.error(`❌ Categoria não encontrada: ${product.category}`);
        continue;
      }

      const { error } = await supabase
        .from('products')
        .insert({
          id: generateUUID(),
          name: product.name,
          price: product.price,
          cost_price: product.cost_price,
          category_id: categoryId,
          description: product.description,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`❌ Erro ao inserir ${product.name}:`, error.message);
      } else {
        productsInserted++;
        if (productsInserted % 10 === 0) {
          console.log(`⏳ ${productsInserted}/91 produtos...`);
        }
      }
    }

    console.log(`✅ ${productsInserted} produtos inseridos\n`);

    // 3. Inserir funcionários
    console.log('👥 Inserindo funcionários...');
    let staffInserted = 0;

    for (const staff of staffData) {
      const { error } = await supabase
        .from('staff')
        .insert({
          id: generateUUID(),
          full_name: staff.full_name,
          role: staff.role,
          base_salary_kz: staff.base_salary_kz,
          phone: staff.phone,
          status: staff.status,
          subsidios: 0,
          bonus: 0,
          horas_extras: 0,
          descontos: 0,
          salario_base: staff.base_salary_kz,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`❌ Erro ao inserir ${staff.full_name}:`, error.message);
      } else {
        staffInserted++;
        console.log(`✅ Funcionário: ${staff.full_name} - ${staff.role}`);
      }
    }

    console.log(`\n👥 ${staffInserted} funcionários inseridos\n`);

    // 4. Inserir histórico externo (opcional)
    console.log('📚 Inserindo external_history...');
    const { error: historyError } = await supabase
      .from('external_history')
      .insert({
        id: generateUUID(),
        source_name: 'Sistema Legacy',
        total_revenue: 8000000,
        gross_profit: 6000000,
        period: 'historico',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('❌ Erro ao inserir external_history:', historyError.message);
    } else {
      console.log('✅ External history inserido (8.000.000 Kz)\n');
    }

    console.log('🎉 Seed concluído com sucesso!');
    console.log('');
    console.log('📊 Resumo:');
    console.log(`   • ${Object.keys(categoryMap).length} categorias`);
    console.log(`   • ${productsInserted} produtos`);
    console.log(`   • ${staffInserted} funcionários`);
    console.log('');
    console.log('🚀 Próximo passo: Faça uma venda de teste no POS!');

  } catch (error) {
    console.error('❌ Erro fatal no seed:', error);
    process.exit(1);
  }
}

// Executar seed
seed();
