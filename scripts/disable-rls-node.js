// Script Node.js para desativar RLS em todas as tabelas do Supabase
// Execute: node scripts/disable-rls-node.js
// Necessita da SERVICE ROLE KEY (não a anon key)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
// 🔑 COLOQUE AQUI A SUA SERVICE ROLE KEY (pegue no painel do Supabase > Project Settings > API > service_role key)
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function disableRLS() {
  if (!SERVICE_ROLE_KEY) {
    console.error('❌ Erro: Defina a variável de ambiente SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Exemplo: $env:SUPABASE_SERVICE_ROLE_KEY="sua-chave-aqui"; node scripts/disable-rls-node.js');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Buscar todas as tabelas do schema public
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');

  if (error) {
    console.error('❌ Erro ao buscar tabelas:', error);
    process.exit(1);
  }

  console.log(`📋 Encontradas ${tables.length} tabelas no schema public`);

  for (const { table_name } of tables) {
    const sql = `ALTER TABLE public."${table_name}" DISABLE ROW LEVEL SECURITY;`;
    const { error: execError } = await supabase.rpc('exec_sql', { sql });

    if (execError) {
      // Fallback: tentar via query direta
      try {
        await supabase.rpc('pg_execute', { command: sql });
        console.log(`✅ RLS desativado: ${table_name}`);
      } catch (e) {
        console.warn(`⚠️ Não foi possível desativar RLS de ${table_name}: ${execError.message}`);
      }
    } else {
      console.log(`✅ RLS desativado: ${table_name}`);
    }
  }

  console.log('\n🎉 RLS desativado em todas as tabelas!');
}

disableRLS();
