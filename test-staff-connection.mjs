import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStaffConnection() {
  try {
    console.log('🔍 TESTE DE CONEXÃO ABSOLUTO - TABELA STAFF');
    console.log('==========================================');
    
    const { data: staffData, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ ERRO NA CONEXÃO:', error);
      return;
    }

    console.log('✅ CONEXÃO BEM-SUCEDIDA!');
    console.log('📊 Total de funcionários:', staffData?.length || 0);
    
    if (staffData && staffData.length > 0) {
      console.log('👥 NOMES REAIS DOS FUNCIONÁRIOS:');
      staffData.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.full_name || staff.name || 'SEM NOME'}`);
      });
      
      console.log('\n💰 ENCARGOS MENSUAIS INDIVIDUAIS:');
      staffData.forEach((staff, index) => {
        const salario_base = Number(staff.salario_base) || Number(staff.base_salary_kz) || 0;
        const subsidios = Number(staff.subsidios) || 0;
        const bonus = Number(staff.bonus) || 0;
        const horas_extras = Number(staff.horas_extras) || 0;
        const descontos = Number(staff.descontos) || 0;
        const totalLiquido = (salario_base + subsidios + bonus + horas_extras) - descontos;
        
        console.log(`${index + 1}. ${staff.full_name || staff.name || 'SEM NOME'}: ${totalLiquido.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}`);
      });
      
      const totalEncargos = staffData.reduce((sum, staff) => {
        const salario_base = Number(staff.salario_base) || Number(staff.base_salary_kz) || 0;
        const subsidios = Number(staff.subsidios) || 0;
        const bonus = Number(staff.bonus) || 0;
        const horas_extras = Number(staff.horas_extras) || 0;
        const descontos = Number(staff.descontos) || 0;
        const totalLiquido = (salario_base + subsidios + bonus + horas_extras) - descontos;
        return sum + totalLiquido;
      }, 0);
      
      console.log('\n💰 TOTAL DE ENCARGOS MENSAL:', totalEncargos.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }));
    } else {
      console.log('⚠️ Tabela staff vazia no Supabase');
    }
    
  } catch (err) {
    console.error('❌ ERRO CRÍTICO:', err);
  }
}

testStaffConnection();
