const URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';
const h = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

// Buscar lista de tabelas via information_schema
const tables = await fetch(`${URL}/rest/v1/rpc/get_tables`, { method: 'POST', headers: h, body: '{}' })
  .then(r => r.json()).catch(() => null);

// Alternativa: tentar tabelas conhecidas + algumas comuns
const knownTables = [
  'orders', 'order_items', 'products', 'categories', 'tables',
  'customers', 'users', 'employees', 'expenses', 'stock_movements',
  'stock_items', 'suppliers', 'events', 'event_orders',
  'application_state', 'pos_active_sessions', '_backup_orders_data_pre_agt',
  'shifts', 'shift_sessions', 'invoices', 'payments', 'notifications',
  'audit_logs', 'settings', 'menu_items', 'reservations', 'promotions',
  'damaged_stock', 'stock_purchases', 'permission_templates'
];

console.log('=== VERIFICAÇÃO DE TODAS AS TABELAS SUPABASE ===\n');

for (const table of knownTables) {
  try {
    const res = await fetch(`${URL}/rest/v1/${table}?select=count&limit=1`, { headers: h });
    const countRes = await fetch(`${URL}/rest/v1/${table}?select=*&limit=1`, { headers: { ...h, 'Prefer': 'count=exact', 'Range': '0-0' } });
    const countHeader = countRes.headers.get('content-range');
    const total = countHeader ? countHeader.split('/')[1] : '?';
    
    if (res.status === 200) {
      const data = await res.json();
      const cols = data.length > 0 ? Object.keys(data[0]).join(', ') : '(vazia)';
      console.log(`✅ ${table.padEnd(40)} | ${total} registos | cols: ${cols.slice(0,80)}`);
    } else if (res.status === 404 || res.status === 400) {
      // tabela não existe
    } else {
      const body = await res.text();
      console.log(`⚠️  ${table.padEnd(40)} | status ${res.status} | ${body.slice(0,80)}`);
    }
  } catch (e) {
    console.log(`❌ ${table.padEnd(40)} | erro: ${e.message}`);
  }
}
