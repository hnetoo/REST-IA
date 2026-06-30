const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function verifyConnection() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 VERIFICAÇÃO DE CONEXÃO E DADOS\n');
    await client.connect();
    console.log('✅ Conectado ao Supabase sem erro 401!\n');

    // Verificar produtos
    const productsResult = await client.query('SELECT COUNT(*) FROM products');
    const productsCount = parseInt(productsResult.rows[0].count);
    console.log(`📦 Produtos: ${productsCount} ${productsCount > 0 ? '✅' : '❌'}`);
    
    if (productsCount > 0) {
      const sampleProduct = await client.query('SELECT name, price FROM products LIMIT 1');
      console.log(`   Exemplo: ${sampleProduct.rows[0].name} (${sampleProduct.rows[0].price} Kz)`);
    }

    // Verificar staff
    const staffResult = await client.query('SELECT COUNT(*) FROM staff');
    const staffCount = parseInt(staffResult.rows[0].count);
    console.log(`\n👥 Funcionários: ${staffCount} ${staffCount > 0 ? '✅' : '❌'}`);
    
    if (staffCount > 0) {
      const sampleStaff = await client.query('SELECT full_name, role FROM staff LIMIT 1');
      console.log(`   Exemplo: ${sampleStaff.rows[0].full_name} - ${sampleStaff.rows[0].role}`);
    }

    // Verificar orders
    const ordersResult = await client.query('SELECT COUNT(*), SUM(total_amount) FROM orders');
    const ordersCount = parseInt(ordersResult.rows[0].count);
    const totalRevenue = ordersResult.rows[0].sum || 0;
    console.log(`\n🧾 Vendas: ${ordersCount} ${ordersCount > 0 ? '✅' : '❌'}`);
    console.log(`   Faturamento Total: ${totalRevenue} Kz`);

    // Verificar se tem venda de hoje
    const todayResult = await client.query(`
      SELECT COUNT(*), SUM(total_amount) 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayCount = parseInt(todayResult.rows[0].count);
    const todayRevenue = todayResult.rows[0].sum || 0;
    console.log(`\n📅 Vendas Hoje: ${todayCount} ${todayCount > 0 ? '✅' : '❌'}`);
    console.log(`   Faturamento Hoje: ${todayRevenue} Kz`);

    // Resumo
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO:');
    console.log(`   Produtos: ${productsCount > 0 ? 'OK ✅' : 'VAZIO ❌'}`);
    console.log(`   Staff: ${staffCount > 0 ? 'OK ✅' : 'VAZIO ❌'}`);
    console.log(`   Vendas: ${ordersCount > 0 ? 'OK ✅' : 'VAZIO ❌'}`);
    console.log(`   Vendas Hoje: ${todayRevenue} Kz`);
    console.log('='.repeat(50));

    if (productsCount === 0 || staffCount === 0) {
      console.log('\n⚠️  DADOS AUSENTES! Execute o seed:');
      console.log('   node scripts/run-seed.js');
    }

    if (ordersCount === 0) {
      console.log('\n⚠️  SEM VENDAS! Crie uma venda de teste:');
      console.log('   node scripts/create-test-order.js');
    }

    if (todayRevenue === 0 && ordersCount > 0) {
      console.log('\n⚠️  SEM VENDAS HOJE! A venda existe mas é de outro dia.');
    }

  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('   → ERRO 401: RLS ainda está ativo!');
    }
  } finally {
    await client.end();
  }
}

verifyConnection();
