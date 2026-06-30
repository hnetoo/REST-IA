// Script para verificar orders com total mas sem items (dados perdidos)
// Corre com: node scripts/check-lost-items.js

const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

async function query(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  return res.json();
}

async function main() {
  console.log('=== VERIFICAÇÃO DE ORDERS COM ITEMS PERDIDOS ===\n');

  // 1. Orders ABERTAS com total > 0
  const abertas = await query(`orders?status=eq.ABERTO&total_amount=gt.0&order=updated_at.desc&select=id,table_id,total_amount,items,updated_at,customer_name`);
  
  console.log(`Orders ABERTAS com total > 0: ${abertas.length}`);
  
  const comItems = abertas.filter(o => Array.isArray(o.items) && o.items.length > 0);
  const semItems = abertas.filter(o => !o.items || o.items.length === 0);
  
  console.log(`  ✅ Com items: ${comItems.length}`);
  console.log(`  ❌ Sem items (perdidos): ${semItems.length}\n`);

  if (semItems.length > 0) {
    console.log('--- Orders sem items (total existe mas items perdidos) ---');
    semItems.forEach(o => {
      const updated = new Date(o.updated_at).toLocaleString('pt-PT');
      console.log(`  Mesa ${o.table_id || 'N/A'} | ${o.customer_name} | Total: ${o.total_amount} Kz | Atualizado: ${updated} | ID: ${o.id}`);
    });
    console.log('');
  }

  // 2. Verificar se há items na tabela order_items para essas orders
  if (semItems.length > 0) {
    const ids = semItems.map(o => `"${o.id}"`).join(',');
    console.log('--- Verificando tabela order_items para estas orders ---');
    
    for (const order of semItems) {
      const orderItems = await query(
        `order_items?order_id=eq.${order.id}&select=product_id,quantity,unit_price,products(name)`
      );
      
      if (orderItems.length > 0) {
        const updated = new Date(order.updated_at).toLocaleString('pt-PT');
        console.log(`\n✅ RECUPERÁVEL! Mesa ${order.table_id} | Total: ${order.total_amount} Kz | ${updated}`);
        orderItems.forEach(item => {
          const name = item.products?.name || item.product_id;
          console.log(`   - ${item.quantity}x ${name} @ ${item.unit_price} Kz`);
        });
      } else {
        const updated = new Date(order.updated_at).toLocaleString('pt-PT');
        console.log(`  ❌ NÃO recuperável: Mesa ${order.table_id} | Total: ${order.total_amount} Kz | ${updated}`);
      }
    }
  }

  // 3. Verificar application_state backup
  console.log('\n--- Verificando backup em application_state ---');
  const backup = await query(`application_state?select=state_data,updated_at&order=updated_at.desc&limit=3`);
  
  if (backup.length > 0) {
    console.log(`Backups encontrados: ${backup.length}`);
    backup.forEach((b, i) => {
      const updated = new Date(b.updated_at).toLocaleString('pt-PT');
      const state = b.state_data;
      const activeOrders = state?.activeOrders || [];
      const ordersWithItems = activeOrders.filter(o => o.items && o.items.length > 0);
      console.log(`  Backup ${i+1}: ${updated} | ${activeOrders.length} orders, ${ordersWithItems.length} com items`);
      
      if (ordersWithItems.length > 0) {
        console.log(`  🔥 ITENS ENCONTRADOS NO BACKUP application_state!`);
        ordersWithItems.forEach(o => {
          console.log(`    Mesa ${o.tableId} | Total: ${o.total} | ${o.items.length} items:`);
          o.items.forEach(item => {
            console.log(`      - ${item.quantity}x ${item.name || item.dishId} @ ${item.unitPrice}`);
          });
        });
      }
    });
  } else {
    console.log('Nenhum backup em application_state');
  }

  // 4. Orders ABERTAS das últimas 24h (hoje)
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentes = await query(`orders?status=eq.ABERTO&updated_at=gte.${cutoff24h}&order=updated_at.desc&select=id,table_id,total_amount,items,updated_at,customer_name`);
  
  console.log(`\n--- Orders ABERTAS nas últimas 24h: ${recentes.length} ---`);
  recentes.forEach(o => {
    const itemCount = Array.isArray(o.items) ? o.items.length : 0;
    const updated = new Date(o.updated_at).toLocaleString('pt-PT');
    const status = itemCount > 0 ? `✅ ${itemCount} items` : '❌ SEM ITEMS';
    console.log(`  Mesa ${o.table_id || 'N/A'} | ${o.total_amount} Kz | ${status} | ${updated}`);
    if (itemCount > 0) {
      o.items.forEach(item => {
        console.log(`    - ${item.quantity}x ${item.name} @ ${item.unitPrice} Kz`);
      });
    }
  });
}

main().catch(console.error);
