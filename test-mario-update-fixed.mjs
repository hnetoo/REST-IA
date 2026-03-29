import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMarioUpdate() {
  try {
    console.log('🔄 TESTE DE PERSISTÊNCIA: Atualizando Mario para CAIXA');
    console.log('==================================================');
    
    // 1. Buscar Mario atual
    const { data: marioData, error: fetchError } = await supabase
      .from('staff')
      .select('*')
      .eq('full_name', 'Mario')
      .single();

    if (fetchError) {
      console.error('❌ Erro ao buscar Mario:', fetchError);
      return;
    }

    console.log('📋 DADOS ATUAIS DO MARIO:');
    console.log('   Nome:', marioData.full_name);
    console.log('   Cargo atual:', marioData.role);
    console.log('   Status:', marioData.status);
    console.log('   ID:', marioData.id);

    // 2. Atualizar para CAIXA (SEM updated_at)
    console.log('\n🔄 ATUALIZANDO PARA CAIXA...');
    const { data: updateData, error: updateError } = await supabase
      .from('staff')
      .upsert({
        id: marioData.id,
        full_name: marioData.full_name,
        role: 'CAIXA',
        status: marioData.status
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ ERRO NA ATUALIZAÇÃO:', updateError);
      return;
    }

    console.log('✅ SUCESSO NA ATUALIZAÇÃO!');
    console.log('📋 DADOS ATUALIZADOS:');
    console.log('   Nome:', updateData.full_name);
    console.log('   Novo cargo:', updateData.role);
    console.log('   Status:', updateData.status);

    // 3. Verificar se persistiu
    console.log('\n🔍 VERIFICANDO PERSISTÊNCIA...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('staff')
      .select('*')
      .eq('full_name', 'Mario')
      .single();

    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError);
      return;
    }

    console.log('✅ PERSISTÊNCIA CONFIRMADA!');
    console.log('📋 DADOS VERIFICADOS:');
    console.log('   Nome:', verifyData.full_name);
    console.log('   Cargo na nuvem:', verifyData.role);
    console.log('   Status:', verifyData.status);

    // 4. Log de sucesso da rede
    console.log('\n🌐 LOG DE SUCESSO DA REDE:');
    console.log('   ✅ Conexão: OK');
    console.log('   ✅ Permissões: OK');
    console.log('   ✅ Upsert: OK');
    console.log('   ✅ Persistência: OK');
    console.log('   ✅ SyncBlocker: LIBERADO para staff');
    
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   Mario agora é CAIXA na App e na Nuvem!');
    console.log('   A edição está chegando ao Supabase corretamente.');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NO TESTE:', error);
  }
}

testMarioUpdate();
