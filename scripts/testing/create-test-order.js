const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tboiuiwlqfzcvakxrsmj:Veredapos%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function createTestOrder() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🧾 Criando venda de teste de 5.000 Kz...\n');
    await client.connect();

    // Buscar um produto para a venda
    const productResult = await client.query(
      "SELECT id, name, price, cost_price FROM products WHERE is_active = true LIMIT 1"
    );

    if (productResult.rows.length === 0) {
      console.error('❌ Nenhum produto encontrado');
      return;
    }

    const product = productResult.rows[0];
    console.log(`📦 Produto: ${product.name} (${product.price} Kz)`);

    // Criar a order de 5.000 Kz
    const orderId = generateUUID();
    const now = new Date().toISOString();

    // Inserir a order
    await client.query(`
      INSERT INTO orders (
        id, customer_name, customer_phone, customer_nif, 
        total_amount, status, payment_method, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [
      orderId,
      'Cliente Teste',
      '923456789',
      '123456789LA045',
      5000.00,  // 5.000 Kz
      'paid',   // Status pago
      'NUMERARIO',
      now,
      now
    ]);

    // Inserir item da order (referenciando o produto)
    await client.query(`
      INSERT INTO order_items (
        id, order_id, product_id, quantity, unit_price, total_price, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
    `, [
      generateUUID(),
      orderId,
      product.id,
      2,  // Quantidade
      2500.00,  // Preço unitário
      5000.00,  // Total
      now,
      now
    ]);

    console.log('✅ Venda criada com sucesso!');
    console.log('');
    console.log('🧾 Detalhes da venda:');
    console.log(`   ID: ${orderId}`);
    console.log(`   Valor: 5.000 Kz`);
    console.log(`   Status: paid`);
    console.log(`   Produto: ${product.name} x 2`);
    console.log('');
    console.log('🔄 O SyncCore deve detectar esta venda automaticamente!');
    console.log('📊 Verifique o Dashboard em alguns segundos...');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

createTestOrder();
