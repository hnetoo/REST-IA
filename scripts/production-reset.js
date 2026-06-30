const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 🔑 CONFIGURAÇÃO - Substitui com os dados do teu Supabase
const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Service Role Key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 📋 TABELAS SISTEMA (nunca apagar)
const SYSTEM_TABLES = [
  'categories',
  'menu_items', 
  'pos_tables',
  'payment_methods',
  'app_settings'
];

// 📋 TABELAS DADOS (para backup e limpeza)
const DATA_TABLES = [
  'orders',
  'order_items',
  'expenses',
  'cash_flow',
  'staff',
  'attendance',
  'purchase_requests',
  'external_history',
  'reservations'
];

// 🎯 BACKUP COMPLETO
async function backupAll() {
  console.log('💾 CRIANDO BACKUP COMPLETO...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/${timestamp}`;
  
  // Criar pasta
  if (!fs.existsSync('./backups')) fs.mkdirSync('./backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  
  const backup = {
    timestamp: new Date().toISOString(),
    tables: {}
  };
  
  // Backup de todas as tabelas
  for (const table of [...SYSTEM_TABLES, ...DATA_TABLES]) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.log(`⚠️ ${table}: ${error.message}`);
        backup.tables[table] = { error: error.message };
      } else {
        backup.tables[table] = data || [];
        console.log(`✅ ${table}: ${data?.length || 0} registos`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      backup.tables[table] = { error: err.message };
    }
  }
  
  // Salvar ficheiro
  const filename = `${backupDir}/backup-full.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  
  console.log(`\n🎯 Backup salvo: ${filename}`);
  console.log(`📊 Total: ${Object.keys(backup.tables).length} tabelas`);
  
  return filename;
}

// 🧹 CENÁRIO A: Reset Tasca (Manter Estrutura)
async function resetTascaScenario() {
  console.log('\n🧹 CENÁRIO A: RESET TASCA DO VEREDA\n');
  console.log('Preservando: Categorias, Produtos, Mesas\n');
  
  const operations = [
    { table: 'order_items', name: 'Itens de Pedido' },
    { table: 'orders', name: 'Pedidos/Vendas' },
    { table: 'attendance', name: 'Assiduidade' },
    { table: 'staff', name: 'Funcionários' },
    { table: 'purchase_requests', name: 'Pedidos de Compra' },
    { table: 'external_history', name: 'Histórico Externo' },
    { table: 'reservations', name: 'Reservas' },
    { table: 'cash_flow', name: 'Fluxo de Caixa' },
    { table: 'expenses', name: 'Despesas' }
  ];
  
  for (const op of operations) {
    try {
      const { error } = await supabase.from(op.table).delete().neq('id', '0');
      if (error) {
        console.log(`❌ ${op.name}: ${error.message}`);
      } else {
        console.log(`✅ ${op.name} removidos`);
      }
    } catch (err) {
      console.log(`❌ ${op.name}: ${err.message}`);
    }
  }
  
  console.log('\n🎉 Reset Tasca concluído!');
  console.log('📊 Estrutura mantida:');
  console.log('   • Categorias (preservadas)');
  console.log('   • Menu/Produtos (preservados)');
  console.log('   • Mesas (preservadas)');
}

// 🆕 CENÁRIO B: Novo Cliente (Reset Total)
async function resetNewClientScenario() {
  console.log('\n🆕 CENÁRIO B: NOVO CLIENTE (RESET TOTAL)\n');
  
  // Dados padrão
  const DEFAULT_CATEGORIES = [
    { name: 'Bebidas', icon: '🥤', sort_order: 1 },
    { name: 'Entradas', icon: '🥗', sort_order: 2 },
    { name: 'Pratos Principais', icon: '🍽️', sort_order: 3 },
    { name: 'Sobremesas', icon: '🍰', sort_order: 4 }
  ];

  const DEFAULT_TABLES = [
    { name: 'Mesa 1', number: 1, x: 100, y: 100, capacity: 4, status: 'available' },
    { name: 'Mesa 2', number: 2, x: 300, y: 100, capacity: 4, status: 'available' },
    { name: 'Mesa 3', number: 3, x: 500, y: 100, capacity: 2, status: 'available' },
    { name: 'Mesa 4', number: 4, x: 700, y: 100, capacity: 6, status: 'available' },
    { name: 'Bar', number: 99, x: 400, y: 300, capacity: 8, status: 'available' }
  ];

  const DEFAULT_PRODUCTS = [
    { name: 'Coca-Cola 33cl', price: 200, cost_price: 100, is_active: true },
    { name: 'Água 50cl', price: 150, cost_price: 80, is_active: true },
    { name: 'Sumo Natural', price: 350, cost_price: 150, is_active: true },
    { name: 'Bruschetta', price: 800, cost_price: 300, is_active: true },
    { name: 'Hambúrguer', price: 1500, cost_price: 600, is_active: true }
  ];

  // 1. Limpar TUDO
  console.log('1. Limpando todas as tabelas...\n');
  
  const allTables = [
    'order_items', 'orders', 'expenses', 'cash_flow',
    'attendance', 'staff', 'purchase_requests', 
    'external_history', 'reservations', 'menu_items',
    'categories', 'pos_tables'
  ];
  
  for (const table of allTables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '0');
      if (error) {
        console.log(`⚠️ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table} limpo`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  // 2. Criar dados padrão
  console.log('\n2. Criando dados padrão...\n');
  
  // Categorias
  const { data: cats, error: catError } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES)
    .select();
  
  if (catError) {
    console.log('❌ Erro ao criar categorias:', catError.message);
  } else {
    console.log(`✅ ${cats.length} categorias criadas`);
  }
  
  // Mesas
  const { data: tables, error: tableError } = await supabase
    .from('pos_tables')
    .insert(DEFAULT_TABLES)
    .select();
  
  if (tableError) {
    console.log('❌ Erro ao criar mesas:', tableError.message);
  } else {
    console.log(`✅ ${tables.length} mesas criadas`);
  }
  
  // Produtos (associados à primeira categoria)
  if (cats && cats[0]) {
    const productsWithCat = DEFAULT_PRODUCTS.map(p => ({
      ...p,
      category_id: cats[0].id
    }));
    
    const { data: prods, error: prodError } = await supabase
      .from('menu_items')
      .insert(productsWithCat)
      .select();
    
    if (prodError) {
      console.log('❌ Erro ao criar produtos:', prodError.message);
    } else {
      console.log(`✅ ${prods.length} produtos criados`);
    }
  }
  
  console.log('\n🎉 Novo cliente configurado com sucesso!');
}

// 🎬 MENU PRINCIPAL
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('🎯 REST-IA - PRODUÇÃO LIMPA');
  console.log('═══════════════════════════════════════════\n');
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'backup':
      await backupAll();
      break;
      
    case 'reset-tasca':
      const backupFile = await backupAll();
      console.log(`\n💾 Backup criado: ${backupFile}`);
      await resetTascaScenario();
      break;
      
    case 'reset-new':
      const backupFile2 = await backupAll();
      console.log(`\n💾 Backup criado: ${backupFile2}`);
      await resetNewClientScenario();
      break;
      
    default:
      console.log('📖 USO:\n');
      console.log('  node production-reset.js backup      → Apenas backup');
      console.log('  node production-reset.js reset-tasca  → Reset Tasca (Manter estrutura)');
      console.log('  node production-reset.js reset-new     → Novo cliente (Reset total)\n');
      console.log('⚠️  AVISO: Sempre fazer backup antes de reset!\n');
  }
  
  console.log('\n═══════════════════════════════════════════');
}

main().catch(console.error);
