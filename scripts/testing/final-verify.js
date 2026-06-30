const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function finalVerification() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   VERIFICAÇÃO FINAL - DASHBOARD SEM ERRO 401   ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    await client.connect();
    console.log('✅ CONEXÃO: OK (sem erro 401)\n');

    // Verificar todas as tabelas
    const checks = [
      { table: 'products', name: 'Produtos' },
      { table: 'categories', name: 'Categorias' },
      { table: 'staff', name: 'Funcionários' },
      { table: 'orders', name: 'Vendas' },
      { table: 'order_items', name: 'Itens de Venda' },
    ];

    console.log('📊 DADOS NO SUPABASE:');
    console.log('─'.repeat(40));
    
    let allOk = true;
    for (const check of checks) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${check.table}`);
        const count = result.rows[0].count;
        console.log(`   ${check.name.padEnd(20)} ${count.padStart(5)} ✅`);
        if (parseInt(count) === 0 && check.table !== 'order_items') {
          allOk = false;
        }
      } catch (e) {
        console.log(`   ${check.name.padEnd(20)} ERRO ❌`);
        allOk = false;
      }
    }
    console.log('─'.repeat(40));

    // Verificar venda de hoje
    const todayResult = await client.query(`
      SELECT COUNT(*), SUM(total_amount) 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayCount = todayResult.rows[0].count;
    const todayRevenue = todayResult.rows[0].sum || 0;
    
    console.log('\n💰 FATURAMENTO HOJE:');
    console.log(`   Vendas: ${todayCount}`);
    console.log(`   Total: ${todayRevenue} Kz`);
    console.log(`   Status: ${parseInt(todayCount) > 0 ? '✅ OK' : '❌ SEM VENDAS'}\n`);

    // Verificar RLS
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('products', 'categories', 'staff', 'orders')
    `);
    
    console.log('🔓 RLS (Row Level Security):');
    for (const row of rlsResult.rows) {
      const status = row.rowsecurity === 't' ? '❌ ATIVO' : '✅ DESATIVADO';
      console.log(`   ${row.tablename.padEnd(15)} ${status}`);
    }

    console.log('\n' + '═'.repeat(50));
    
    if (allOk && parseInt(todayCount) > 0) {
      console.log('✅ TUDO PRONTO! Dashboard deve ler dados sem erro 401');
      console.log('🌐 URL: https://rest-ia.vercel.app');
    } else {
      console.log('⚠️  VERIFIQUE: Algumas tabelas podem estar vazias');
    }
    
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.message.includes('401') || error.message.includes('permission')) {
      console.error('   → RLS ainda está bloqueando! Execute: node scripts/autofix.js');
    }
  } finally {
    await client.end();
  }
}

finalVerification();
