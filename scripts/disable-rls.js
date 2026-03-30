const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function disableRLS() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔓 Desativando RLS nas tabelas...\n');
    await client.connect();

    const tables = [
      'orders',
      'order_items', 
      'products',
      'categories',
      'staff',
      'expenses',
      'cash_flow',
      'external_history',
      'pos_tables',
      'purchase_requests',
      'salary_payments',
      'staff_schedules',
      'application_state'
    ];

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
        console.log(`✅ RLS desativado: ${table}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️ Tabela não existe: ${table}`);
        } else {
          console.error(`❌ Erro em ${table}:`, error.message);
        }
      }
    }

    console.log('\n🎉 RLS desativado em todas as tabelas!');
    console.log('🚀 Faça build e deploy agora.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

disableRLS();
