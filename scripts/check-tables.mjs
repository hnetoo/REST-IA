const URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';
const h = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY };

const [backup, sessions] = await Promise.all([
  fetch(`${URL}/rest/v1/_backup_orders_data_pre_agt?select=id,items,total_amount,status,created_at&limit=200`, { headers: h }).then(r => r.json()),
  fetch(`${URL}/rest/v1/pos_active_sessions?select=*&limit=50`, { headers: h }).then(r => r.json()),
]);

console.log('=== _backup_orders_data_pre_agt ===');
console.log('Total registos:', backup.length);
const comItems = backup.filter(o => Array.isArray(o.items) && o.items.length > 0);
const semItems = backup.filter(o => !o.items || o.items.length === 0);
console.log('Com items:', comItems.length);
console.log('Sem items:', semItems.length);
if (backup.length > 0) {
  const cols = Object.keys(backup[0]);
  console.log('Colunas:', cols.join(', '));
  console.log('Exemplo (1º registo):', JSON.stringify(backup[0], null, 2).slice(0, 500));
}

console.log('\n=== pos_active_sessions ===');
console.log('Total registos:', sessions.length);
if (sessions.length > 0) {
  console.log('Colunas:', Object.keys(sessions[0]).join(', '));
  console.log('Dados:', JSON.stringify(sessions, null, 2));
} else {
  console.log('Tabela vazia');
}
