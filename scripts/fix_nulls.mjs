import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
});

const TAX_RATE = 14; // IVA Angola

async function fixOrdersItemsNull() {
  console.log('\n[1/3] Backfill orders.items NULL a partir de order_items...');
  
  // Buscar orders com items NULL
  const { data: ordersWithNullItems, error: err1 } = await supabase
    .from('orders')
    .select('id, total_amount, status, created_at')
    .is('items', null)
    .limit(500);

  if (err1) { console.error('  ❌ Erro ao buscar orders:', err1.message); return 0; }
  if (!ordersWithNullItems || ordersWithNullItems.length === 0) {
    console.log('  ✅ Nenhuma order com items NULL');
    return 0;
  }

  console.log(`  Encontradas ${ordersWithNullItems.length} orders com items NULL`);

  let fixed = 0;
  let skipped = 0;

  for (const order of ordersWithNullItems) {
    // Buscar items na tabela order_items
    const { data: oiItems, error: oiErr } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, total_price')
      .eq('order_id', order.id);

    if (oiErr || !oiItems || oiItems.length === 0) {
      skipped++;
      continue;
    }

    // Reconstruir items no formato JSONB esperado
    const itemsJson = oiItems.map(oi => ({
      dishId: oi.product_id,
      quantity: oi.quantity,
      unitPrice: oi.unit_price || 0,
      status: 'served'
    }));

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ items: itemsJson })
      .eq('id', order.id);

    if (updateErr) {
      console.error(`  ⚠️ Erro ao actualizar order ${order.id}:`, updateErr.message);
    } else {
      fixed++;
    }
  }

  console.log(`  ✅ ${fixed} orders actualizadas, ${skipped} sem items em order_items`);
  return fixed;
}

async function fixOrdersTaxNull() {
  console.log('\n[2/3] Backfill orders.tax_amount/net_amount/tax_rate NULL...');
  
  // Buscar orders com tax_amount NULL mas com total_amount > 0
  const { data: orders, error: err1 } = await supabase
    .from('orders')
    .select('id, total_amount, tax_amount, net_amount, tax_rate')
    .is('tax_amount', null)
    .gt('total_amount', 0)
    .limit(500);

  if (err1) { console.error('  ❌ Erro ao buscar orders:', err1.message); return 0; }
  if (!orders || orders.length === 0) {
    console.log('  ✅ Nenhuma order com tax_amount NULL');
    return 0;
  }

  console.log(`  Encontradas ${orders.length} orders com tax_amount NULL`);

  let fixed = 0;

  for (const order of orders) {
    const total = order.total_amount || 0;
    if (total <= 0) continue;

    // Calcular: total inclui IVA de 14%
    // total = net + tax = net * 1.14
    // net = total / 1.14
    // tax = total - net
    const netAmount = Math.round((total / (1 + TAX_RATE / 100)) * 100) / 100;
    const taxAmount = Math.round((total - netAmount) * 100) / 100;

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        tax_amount: taxAmount,
        net_amount: netAmount,
        tax_rate: TAX_RATE,
      })
      .eq('id', order.id);

    if (updateErr) {
      console.error(`  ⚠️ Erro ao actualizar order ${order.id}:`, updateErr.message);
    } else {
      fixed++;
    }
  }

  console.log(`  ✅ ${fixed} orders actualizadas com valores fiscais`);
  return fixed;
}

async function fixOrdersClosedByNull() {
  console.log('\n[3/3] Backfill orders.closed_by NULL...');
  
  const { data: orders, error: err1 } = await supabase
    .from('orders')
    .select('id')
    .in('status', ['closed', 'paid'])
    .is('closed_by', null)
    .limit(500);

  if (err1) { console.error('  ❌ Erro ao buscar orders:', err1.message); return 0; }
  if (!orders || orders.length === 0) {
    console.log('  ✅ Nenhuma order com closed_by NULL');
    return 0;
  }

  console.log(`  Encontradas ${orders.length} orders closed/paid sem closed_by`);

  let fixed = 0;

  for (const order of orders) {
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ closed_by: 'SYSTEM' })
      .eq('id', order.id);

    if (updateErr) {
      console.error(`  ⚠️ Erro ao actualizar order ${order.id}:`, updateErr.message);
    } else {
      fixed++;
    }
  }

  console.log(`  ✅ ${fixed} orders actualizadas com closed_by = 'SYSTEM'`);
  return fixed;
}

async function main() {
  console.log('='.repeat(70));
  console.log('CORRECÇÃO DE VALORES NULL NO SUPABASE');
  console.log('URL:', supabaseUrl);
  console.log('Data:', new Date().toISOString());
  console.log('='.repeat(70));

  const r1 = await fixOrdersItemsNull();
  const r2 = await fixOrdersTaxNull();
  const r3 = await fixOrdersClosedByNull();

  console.log('\n' + '='.repeat(70));
  console.log('RESUMO DE CORRECÇÕES');
  console.log('='.repeat(70));
  console.log(`  orders.items backfilled:        ${r1}`);
  console.log(`  orders.tax_* backfilled:         ${r2}`);
  console.log(`  orders.closed_by backfilled:     ${r3}`);
  console.log(`  Total de linhas corrigidas:      ${r1 + r2 + r3}`);
  console.log();
  console.log('NOTAS:');
  console.log('  - orders.items: reconstruido a partir de order_items');
  console.log('  - orders.tax_*: calculado com IVA 14% (Angola)');
  console.log('  - orders.closed_by: marcado como SYSTEM em orders antigas');
  console.log('  - orders sem items em order_items nao puderam ser corrigidas');
  console.log('  - Campos AGT, customer_id, event_id, etc. permanecem NULL (opcionais)');
  console.log('='.repeat(70));
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
