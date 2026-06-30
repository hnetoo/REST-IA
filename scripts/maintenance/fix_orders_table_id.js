const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixOrdersTableId() {
  console.log('🔧 Iniciando correção de table_id...\n');

  // 1. Buscar primeira mesa disponível
  const { data: tables, error: tableError } = await supabase
    .from('pos_tables')
    .select('id, name')
    .order('id', { ascending: true })
    .limit(1);

  if (tableError) {
    console.error('❌ Erro ao buscar mesas:', tableError);
    return;
  }

  if (!tables || tables.length === 0) {
    console.error('❌ Nenhuma mesa encontrada no sistema!');
    return;
  }

  const mesa = tables[0];
  console.log(`✅ Mesa encontrada: ${mesa.name} (ID: ${mesa.id})\n`);

  // 2. Contar pedidos sem mesa
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .is('table_id', null);

  if (countError) {
    console.error('❌ Erro ao contar pedidos:', countError);
    return;
  }

  console.log(`📊 Pedidos sem mesa: ${count}\n`);

  if (count === 0) {
    console.log('✅ Nenhum pedido para atualizar!');
    return;
  }

  // 3. Atualizar pedidos
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ table_id: mesa.id })
    .is('table_id', null)
    .select('id');

  if (updateError) {
    console.error('❌ Erro ao atualizar pedidos:', updateError);
    return;
  }

  console.log(`✅ ${updated.length} pedidos atualizados com sucesso!`);
  console.log(`   Todos foram atribuídos à mesa: ${mesa.name}\n`);

  // 4. Verificar resultado
  const { data: result } = await supabase
    .from('orders')
    .select('table_id, count(*) as total', { count: 'exact' })
    .eq('status', 'closed')
    .group('table_id');

  console.log('📊 Resumo por mesa:');
  result?.forEach(r => {
    console.log(`   - Mesa ${r.table_id}: ${r.total} pedidos`);
  });
}

fixOrdersTableId().catch(console.error);
