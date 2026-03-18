import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStaffEndpoint() {
  try {
    console.log('🔍 TESTE DE ROTA: /rest/v1/staff');
    console.log('==========================================');
    
    // Testar endpoint específico
    const { data: staffData, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '403' || error.message?.includes('Forbidden')) {
        console.error('❌ ERRO 403 FORBIDDEN - BLOQUEIO ATIVO:', error);
        console.error('🚫 O SyncBlocker está bloqueando a leitura!');
      } else {
        console.error('❌ ERRO NA ROTA:', error);
      }
      return;
    }

    console.log('✅ ROTA LIBERADA - 200 OK!');
    console.log('📊 Total de funcionários:', staffData?.length || 0);
    
    if (staffData && staffData.length > 0) {
      console.log('👥 FUNCIONÁRIOS ENCONTRADOS:');
      staffData.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.full_name || staff.name || 'SEM NOME'}`);
      });
      
      const totalSalarios = staffData.reduce((sum, staff) => {
        const salario_base = Number(staff.salario_base) || Number(staff.base_salary_kz) || 0;
        const subsidios = Number(staff.subsidios) || 0;
        const bonus = Number(staff.bonus) || 0;
        const horas_extras = Number(staff.horas_extras) || 0;
        const descontos = Number(staff.descontos) || 0;
        const totalLiquido = (salario_base + subsidios + bonus + horas_extras) - descontos;
        return sum + totalLiquido;
      }, 0);
      
      console.log('\n💰 TOTAL DE SALÁRIOS (ENCARGOS):', totalSalarios.toLocaleString('pt-AO', {
        style: 'currency',
        currency: 'AOA'
      }));
    } else {
      console.log('⚠️ Tabela staff vazia - nenhum funcionário encontrado');
    }
    
  } catch (err) {
    console.error('❌ ERRO CRÍTICO NO TESTE:', err);
  }
}

testStaffEndpoint();
