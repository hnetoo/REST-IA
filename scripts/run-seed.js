const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string do .env
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function runSeed() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🌱 Conectando ao Supabase...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, '..', 'supabase', 'seed_data.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📦 Executando seed...\n');
    
    // Executar o SQL
    await client.query(sql);

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('');
    console.log('📊 Dados inseridos:');
    
    // Verificar contagem
    const categoriesCount = await client.query('SELECT COUNT(*) FROM categories');
    const productsCount = await client.query('SELECT COUNT(*) FROM products');
    const staffCount = await client.query('SELECT COUNT(*) FROM staff');
    
    console.log(`   • ${categoriesCount.rows[0].count} categorias`);
    console.log(`   • ${productsCount.rows[0].count} produtos`);
    console.log(`   • ${staffCount.rows[0].count} funcionários`);
    console.log('');
    console.log('🚀 Próximo passo: Faça uma venda de teste no POS!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
