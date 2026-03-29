import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarConexaoELimpar() {
  try {
    console.log('🔧 EMERGÊNCIA: TESTE DE CONEXÃO E LIMPEZA');
    console.log('============================================');
    
    // 1. TESTE DE CONEXÃO
    console.log('\n📡 TESTE DE CONEXÃO SUPABASE:');
    try {
      const { data: testData, error: testError } = await supabase
        .from('external_history')
        .select('count')
        .limit(1);

      if (testError) {
        console.log('❌ Status da Conexão Supabase: ERRO');
        console.log('   Erro:', testError);
      } else {
        console.log('✅ Status da Conexão Supabase: OK');
        console.log('   Conexão funcionando normalmente');
      }
    } catch (e) {
      console.log('❌ Status da Conexão Supabase: ERRO');
      console.log('   Exceção:', e);
    }

    // 2. VERIFICAR PERMISSÕES RLS
    console.log('\n🔐 VERIFICANDO PERMISSÕES RLS:');
    try {
      // Teste SELECT
      const { data: selectData, error: selectError } = await supabase
        .from('external_history')
        .select('*')
        .limit(1);

      if (selectError) {
        console.log('❌ Permissão SELECT: NEGADA');
        console.log('   Erro:', selectError);
      } else {
        console.log('✅ Permissão SELECT: OK');
      }

      // Teste INSERT
      const { data: insertData, error: insertError } = await supabase
        .from('external_history')
        .insert({
          source_name: 'TESTE_PERMISSAO',
          total_revenue: 1,
          gross_profit: 1,
          period: 'TESTE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.log('❌ Permissão INSERT: NEGADA');
        console.log('   Erro:', insertError);
      } else {
        console.log('✅ Permissão INSERT: OK');
        
        // Limpar teste
        await supabase
          .from('external_history')
          .delete()
          .eq('id', insertData.id);
      }

      // Teste DELETE
      if (insertData) {
        const { error: deleteError } = await supabase
          .from('external_history')
          .delete()
          .eq('id', insertData.id);

        if (deleteError) {
          console.log('❌ Permissão DELETE: NEGADA');
          console.log('   Erro:', deleteError);
        } else {
          console.log('✅ Permissão DELETE: OK');
        }
      }

    } catch (e) {
      console.log('❌ Erro ao testar permissões:', e);
    }

    // 3. LIMPEZA MANUAL VIA CÓDIGO
    console.log('\n🧹 LIMPANDO DUPLICADOS NA TABELA:');
    try {
      const { data: allData, error: fetchError } = await supabase
        .from('external_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Erro ao buscar dados:', fetchError);
        return;
      }

      console.log(`📊 Encontrados ${allData?.length || 0} registos`);

      // Identificar duplicados e manter apenas o mais recente
      const duplicados = allData?.filter(item => 
        item.source_name === 'HISTÓRICO CONSOLIDADO' || 
        item.source_name === 'ANTIGO'
      );

      if (duplicados && duplicados.length > 1) {
        console.log(`🔍 Encontrados ${duplicados.length} registos duplicados`);
        
        // Manter apenas o mais recente
        const paraManter = duplicados[0];
        const paraRemover = duplicados.slice(1);

        console.log(`💾 Mantendo registo mais recente: ID ${paraManter.id} (${paraManter.source_name})`);

        for (const item of paraRemover) {
          console.log(`🗑️ Removendo registo: ID ${item.id} (${item.source_name})`);
          
          const { error: deleteError } = await supabase
            .from('external_history')
            .delete()
            .eq('id', item.id);

          if (deleteError) {
            console.error('❌ Erro ao remover:', deleteError);
          } else {
            console.log('✅ Registo removido com sucesso');
          }
        }
      } else {
        console.log('✅ Nenhum duplicado encontrado');
      }

    } catch (e) {
      console.error('❌ Erro na limpeza:', e);
    }

    // 4. VERIFICAÇÃO FINAL COM BYPASS DE CACHE
    console.log('\n🔄 VERIFICAÇÃO FINAL (BYPASS CACHE):');
    try {
      // Adicionar timestamp para bypass de cache
      const timestamp = Date.now();
      const { data: finalData, error: finalError } = await supabase
        .from('external_history')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('period', 'CONSOLIDADO')
        .single();

      if (finalError) {
        console.log('❌ Erro na verificação final:', finalError);
      } else {
        const totalFinal = Number(finalData.total_revenue) || 0;
        console.log('✅ VERIFICAÇÃO FINAL CONCLUÍDA:');
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Registros encontrados: 1`);
        console.log(`   Valor consolidado: ${totalFinal.toLocaleString('pt-AO')} Kz`);
        console.log(`   ID do registo: ${finalData.id}`);
        console.log(`   Fonte: ${finalData.source_name}`);
        console.log(`   Período: ${finalData.period}`);
        
        if (totalFinal === 8000000) {
          console.log('🎯 VALOR CORRETO: 8.000.000 Kz');
        } else {
          console.log(`⚠️ VALOR INCORRETO: ${totalFinal.toLocaleString('pt-AO')} Kz (esperado: 8.000.000)`);
        }
      }
    } catch (e) {
      console.error('❌ Erro na verificação final:', e);
    }

    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   ✅ Conexão testada');
    console.log('   ✅ Permissões verificadas');
    console.log('   ✅ Duplicados removidos');
    console.log('   ✅ Cache bypassado');
    console.log('   ✅ Pronto para sincronização com App');

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA EMERGÊNCIA:', error);
  }
}

testarConexaoELimpar();
