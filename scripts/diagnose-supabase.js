const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

console.log('🔍 DIAGNÓSTICO DE CONEXÃO SUPABASE\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...\n');

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: { persistSession: false },
    db: { schema: 'public' }
  }
);

async function testConnection() {
  console.log('1️⃣ Testando conexão básica...\n');
  
  // Test 1: Auth
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log('   ❌ Auth Error:', authError.message);
    } else {
      console.log('   ✅ Auth OK (sem sessão ativa)');
    }
  } catch (e) {
    console.log('   ❌ Auth Exception:', e.message);
  }

  // Test 2: Products
  console.log('\n2️⃣ Testando tabelas...');
  
  const tests = [
    { name: 'products', query: () => supabase.from('products').select('count') },
    { name: 'categories', query: () => supabase.from('categories').select('count') },
    { name: 'staff', query: () => supabase.from('staff').select('count') },
    { name: 'orders', query: () => supabase.from('orders').select('count') },
  ];

  for (const test of tests) {
    try {
      const { data, error } = await test.query();
      if (error) {
        if (error.code === '401' || error.message.includes('Unauthorized')) {
          console.log(`   ❌ ${test.name}: 401 Unauthorized`);
          console.log(`      → Chave pode estar errada ou RLS ativo`);
        } else if (error.code === '404' || error.message.includes('not found')) {
          console.log(`   ❌ ${test.name}: 404 Tabela não encontrada`);
        } else {
          console.log(`   ❌ ${test.name}: ${error.code} - ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${test.name}: OK`);
      }
    } catch (e) {
      console.log(`   ❌ ${test.name}: Exception - ${e.message}`);
    }
  }

  // Test 3: Verificar headers
  console.log('\n3️⃣ Verificando headers do cliente...');
  console.log('   Schema: public');
  console.log('   Headers customizados: x-client-info');

  console.log('\n📊 RESUMO:');
  console.log('   Se todas as tabelas derem 401:');
  console.log('   → A SUPABASE_ANON_KEY está incorreta!');
  console.log('   → Verifique a chave no painel do Supabase (Settings > API)');
  console.log('   → Atualize em .env e supabase_standalone.ts');
}

testConnection();
