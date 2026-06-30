const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' }
});

async function testQuery() {
  console.log('🔍 TESTANDO QUERY .in() NO SUPABASE\n');

  // Test 1: Query com array
  console.log('1️⃣ Teste: .in("status", ["closed", "paid"])');
  const { data: data1, error: error1 } = await supabase
    .from('orders')
    .select('id, status, total_amount')
    .in('status', ['closed', 'paid']);

  if (error1) {
    console.log('   ❌ Erro:', error1.message);
    console.log('   Código:', error1.code);
  } else {
    console.log('   ✅ Sucesso:', data1.length, 'registros');
    data1.forEach(o => console.log(`      - ${o.id.substring(0,8)}: ${o.status} (${o.total_amount} Kz)`));
  }

  // Test 2: Query simples sem filtro
  console.log('\n2️⃣ Teste: sem filtro .in()');
  const { data: data2, error: error2 } = await supabase
    .from('orders')
    .select('id, status, total_amount')
    .limit(5);

  if (error2) {
    console.log('   ❌ Erro:', error2.message);
  } else {
    console.log('   ✅ Sucesso:', data2.length, 'registros');
  }

  // Test 3: Query com eq
  console.log('\n3️⃣ Teste: .eq("status", "paid")');
  const { data: data3, error: error3 } = await supabase
    .from('orders')
    .select('id, status, total_amount')
    .eq('status', 'paid');

  if (error3) {
    console.log('   ❌ Erro:', error3.message);
  } else {
    console.log('   ✅ Sucesso:', data3.length, 'registros');
  }

  console.log('\n📊 RESUMO:');
  console.log('   Se o teste 1 falhar com 400, o problema é na formatação do .in()');
  console.log('   Se o teste 2 funcionar, a conexão está OK');
}

testQuery();
