const URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';
const h = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY };

const allTables = [
  'orders','order_items','order_payment_splits','products','categories','dishes',
  'customers','expenses','stock_movements','stock_purchases','stock_purchase_items',
  'stock_inventories','stock_inventory_items','suppliers','events','event_orders','event_packages',
  'application_state','pos_active_sessions','_backup_orders_data_pre_agt',
  'audit_logs','settings','app_settings','staff','attendance','payroll_receipts',
  'salary_payments','invoice_sequences','invoice_series','agt_series','agt_compliance_logs',
  'agt_documents','cash_flow','compliance_reports','closed_days','documents',
  'external_history','fecho_diagnostico_logs','pos_operators','pos_shift_records',
  'pos_tables','purchase_requests','purchase-documents','show_expenses','show_revenue',
  'tax_rates','terminal_sync','tables'
];

console.log('=== AUDITORIA COMPLETA TABELAS SUPABASE ===\n');
console.log(`${'TABELA'.padEnd(40)} | ${'EXISTE'.padEnd(8)} | REGISTOS`);
console.log('-'.repeat(70));

const results = { exists: [], empty: [], missing: [] };

for (const table of allTables) {
  try {
    const res = await fetch(`${URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: { ...h, 'Prefer': 'count=exact' }
    });
    
    if (res.status === 200 || res.status === 206) {
      const countHeader = res.headers.get('content-range');
      const total = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
      const status = total === 0 ? '⚠️  VAZIA' : `✅ ${total}`;
      console.log(`${table.padEnd(40)} | EXISTE   | ${status}`);
      if (total === 0) results.empty.push(table);
      else results.exists.push({ table, total });
    } else if (res.status === 404) {
      console.log(`${table.padEnd(40)} | ❌ NÃO    | -`);
      results.missing.push(table);
    } else {
      const body = await res.text().then(t => t.slice(0,60));
      console.log(`${table.padEnd(40)} | ⛔ ERR${res.status} | ${body}`);
    }
  } catch (e) {
    console.log(`${table.padEnd(40)} | ❌ ERRO   | ${e.message.slice(0,40)}`);
    results.missing.push(table);
  }
}

console.log('\n=== RESUMO ===');
console.log(`✅ Tabelas com dados: ${results.exists.length}`);
console.log(`⚠️  Tabelas VAZIAS (existem mas sem dados): ${results.empty.length}`);
results.empty.forEach(t => console.log(`   - ${t}`));
console.log(`❌ Tabelas que NÃO EXISTEM no Supabase: ${results.missing.length}`);
results.missing.forEach(t => console.log(`   - ${t}`));
