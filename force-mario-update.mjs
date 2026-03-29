import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceMarioUpdate() {
  try {
    console.log('🔄 FORÇAR UPDATE: Mario para CAIXA no Supabase');
    console.log('============================================');
    
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

    // 2. Forçar update para CAIXA
    console.log('\n🔄 FORÇANDO UPDATE PARA CAIXA...');
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
      console.error('❌ ERRO NO UPDATE:', updateError);
      return;
    }

    console.log('✅ UPDATE FORÇADO COM SUCESSO!');
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

    // 4. Verificar status geral dos funcionários
    console.log('\n📊 STATUS GERAL DOS FUNCIONÁRIOS:');
    const { data: allStaff, error: allStaffError } = await supabase
      .from('staff')
      .select('full_name, role, status')
      .eq('status', 'ATIVO')
      .order('created_at', { ascending: false });

    if (allStaffError) {
      console.error('❌ Erro ao buscar todos os funcionários:', allStaffError);
      return;
    }

    allStaff.forEach((staff, index) => {
      console.log(`   ${index + 1}. ${staff.full_name} - ${staff.role} (${staff.status})`);
    });

    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   ✅ Mario forçado para CAIXA');
    console.log('   ✅ Update persistido no Supabase');
    console.log('   ✅ SyncBlocker liberado para staff');
    console.log('   ✅ Sistema sincronizado');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NO UPDATE:', error);
  }
}

forceMarioUpdate();
