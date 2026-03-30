const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function checkStatusValues() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 VERIFICANDO STATUS NA TABELA ORDERS\n');
    await client.connect();

    // Verificar valores únicos de status
    const result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status 
      ORDER BY count DESC
    `);

    console.log('📊 Status encontrados:');
    for (const row of result.rows) {
      console.log(`   '${row.status}': ${row.count} registros`);
    }

    // Verificar sample de orders
    const sample = await client.query(`
      SELECT id, status, total_amount, created_at 
      FROM orders 
      LIMIT 3
    `);

    console.log('\n📋 Sample de orders:');
    for (const row of sample.rows) {
      console.log(`   ID: ${row.id.substring(0, 8)}... Status: '${row.status}' Total: ${row.total_amount}`);
    }

    await client.end();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkStatusValues();
