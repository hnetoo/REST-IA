const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function fixSchemaPermissions() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 CORREÇÃO DE PERMISSÕES DE SCHEMA\n');
    await client.connect();

    // 1. Garantir permissões no schema public
    console.log('1️⃣ Concedendo permissões de schema...');
    await client.query('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role');
    await client.query('GRANT CREATE ON SCHEMA public TO anon, authenticated, service_role');
    console.log('   ✅ Schema public liberado\n');

    // 2. Garantir permissões em TODAS as tabelas
    console.log('2️⃣ Concedendo permissões em tabelas...');
    const tables = [
      'products', 'categories', 'staff', 'orders', 'order_items',
      'expenses', 'customers', 'pos_tables', 'purchase_requests',
      'salary_payments', 'staff_schedules', 'application_state',
      'external_history', 'cash_flow'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`GRANT ALL ON "${table}" TO anon, authenticated, service_role`);
        process.stdout.write(`✅ ${table} `);
      } catch (e) {
        process.stdout.write(`⚠️  ${table} `);
      }
    }
    console.log('\n');

    // 3. Garantir permissões em sequences
    console.log('3️⃣ Concedendo permissões em sequences...');
    await client.query('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role');
    console.log('   ✅ Sequences liberadas\n');

    // 4. Verificar permissões
    console.log('4️⃣ Verificando permissões...');
    const result = await client.query(`
      SELECT grantee, table_name, privilege_type 
      FROM information_schema.table_privileges 
      WHERE table_schema = 'public' 
      AND table_name = 'products'
      AND grantee = 'anon'
    `);
    
    if (result.rows.length > 0) {
      console.log('   ✅ Permissões confirmadas para tabela products');
    }

    console.log('\n✅ PERMISSÕES DE SCHEMA CORRIGIDAS!');
    console.log('🚀 Execute: npm run build && vercel --prod');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

fixSchemaPermissions();
