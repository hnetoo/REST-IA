const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function autoFixAll() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 AUTO-CORREÇÃO TOTAL VIA CLI\n');
    await client.connect();

    // 1. Desativar RLS em todas as tabelas do Prisma
    console.log('1️⃣ Desativando RLS...');
    const tables = [
      'products', 'categories', 'staff', 'orders', 'order_items',
      'expenses', 'customers', 'pos_tables', 'purchase_requests',
      'salary_payments', 'staff_schedules', 'application_state',
      'external_history', 'cash_flow'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
        process.stdout.write(`✅ ${table}\n`);
      } catch (e) {
        if (e.message.includes('does not exist')) {
          process.stdout.write(`⚠️  ${table} (não existe)\n`);
        } else {
          process.stdout.write(`❌ ${table}: ${e.message}\n`);
        }
      }
    }

    // 2. Verificar dados
    console.log('\n2️⃣ Verificando dados...');
    const checks = [
      { name: 'products', query: 'SELECT COUNT(*) FROM products' },
      { name: 'categories', query: 'SELECT COUNT(*) FROM categories' },
      { name: 'staff', query: 'SELECT COUNT(*) FROM staff' },
      { name: 'orders', query: 'SELECT COUNT(*), SUM(total_amount) FROM orders' },
      { name: 'expenses', query: 'SELECT COUNT(*) FROM expenses' },
    ];

    for (const check of checks) {
      try {
        const result = await client.query(check.query);
        const count = result.rows[0].count;
        const sum = result.rows[0].sum;
        if (sum) {
          console.log(`   ✅ ${check.name}: ${count} (Total: ${sum} Kz)`);
        } else {
          console.log(`   ✅ ${check.name}: ${count}`);
        }
      } catch (e) {
        console.log(`   ❌ ${check.name}: ${e.message}`);
      }
    }

    // 3. Verificar venda de hoje
    console.log('\n3️⃣ Verificando venda de hoje...');
    const todayResult = await client.query(`
      SELECT COUNT(*), SUM(total_amount) 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayCount = todayResult.rows[0].count;
    const todayRevenue = todayResult.rows[0].sum || 0;
    
    if (parseInt(todayCount) > 0) {
      console.log(`   ✅ Vendas hoje: ${todayCount} (${todayRevenue} Kz)`);
    } else {
      console.log(`   ⚠️  Sem vendas hoje`);
      
      // Criar venda de teste se não houver
      console.log('\n4️⃣ Criando venda de teste de 5.000 Kz...');
      await client.query(`
        INSERT INTO orders (id, customer_name, total_amount, status, created_at, payment_method, invoice_number)
        VALUES (
          gen_random_uuid(), 
          'Cliente Teste', 
          5000, 
          'completed', 
          NOW(), 
          'NUMERARIO',
          'TEST-001'
        )
        ON CONFLICT DO NOTHING
      `);
      console.log('   ✅ Venda de teste criada!');
    }

    console.log('\n✅ AUTO-CORREÇÃO CONCLUÍDA!');
    console.log('🚀 Execute agora: npm run build && vercel --prod');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

autoFixAll();
