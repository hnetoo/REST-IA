import { createClient } from '@supabase/supabase-js';

// Configuração Supabase direta com chaves do .env.local
const supabaseUrl = process.env.SUPABASE_URL || 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCompleteDatabaseSupabase() {
  console.log('🌱 SEED COMPLETO AUTOMÁTICO VIA SUPABASE - Todas as tabelas');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dayBefore = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  try {
    // 1. LIMPAR DADOS EXISTENTES
    console.log('🧹 Limpando dados existentes...');
    await supabase.from('cash_flow').delete().neq('id', '');
    await supabase.from('expenses').delete().neq('id', '');
    await supabase.from('external_history').delete().neq('id', '');
    await supabase.from('staff').delete().neq('id', '');
    
    // 2. CASH_FLOW - 4 despesas de teste
    console.log('💰 Inserindo CASH_FLOW...');
    const { error: cashFlowError } = await supabase.from('cash_flow').insert([
      {
        amount: 25000,
        type: 'saida',
        category: 'Material de Escritório',
        description: 'Papel, canetas, impressora',
        created_at: today.toISOString()
      },
      {
        amount: 15000,
        type: 'saida',
        category: 'Limpeza e Manutenção',
        description: 'Serviços de limpeza mensal',
        created_at: today.toISOString()
      },
      {
        amount: 35000,
        type: 'saida',
        category: 'Utilidades',
        description: 'Fatura de água e luz',
        created_at: yesterday.toISOString()
      },
      {
        amount: 12000,
        type: 'saida',
        category: 'Telecomunicações',
        description: 'Internet e telefone',
        created_at: dayBefore.toISOString()
      }
    ]);
    
    if (cashFlowError) throw cashFlowError;
    
    // 3. EXPENSES - 4 despesas compatíveis com código existente
    console.log('📋 Inserindo EXPENSES...');
    const { error: expensesError } = await supabase.from('expenses').insert([
      {
        description: 'Material de escritório',
        amount_kz: 25000,
        category: 'Material',
        status: 'pago',
        created_at: today.toISOString()
      },
      {
        description: 'Limpeza mensal',
        amount_kz: 15000,
        category: 'Serviços',
        status: 'pago',
        created_at: today.toISOString()
      },
      {
        description: 'Água e luz',
        amount_kz: 35000,
        category: 'Utilidades',
        status: 'pago',
        created_at: yesterday.toISOString()
      },
      {
        description: 'Internet',
        amount_kz: 12000,
        category: 'Telecomunicações',
        status: 'pago',
        created_at: dayBefore.toISOString()
      }
    ]);
    
    if (expensesError) throw expensesError;
    
    // 4. EXTERNAL_HISTORY - 8.700.000 Kz histórico
    console.log('📊 Inserindo EXTERNAL_HISTORY...');
    const { error: externalError } = await supabase.from('external_history').insert({
      source_name: 'Sistema Legado',
      total_revenue: 8700000,
      gross_profit: 6500000,
      period: 'CONSOLIDADO',
      created_at: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    if (externalError) throw externalError;
    
    // 5. STAFF - 3 funcionários (385.000 Kz total)
    console.log('👥 Inserindo STAFF...');
    const { error: staffError } = await supabase.from('staff').insert([
      {
        full_name: 'João Silva',
        role: 'Gerente',
        base_salary_kz: 150000,
        salario_base: 150000,
        status: 'active',
        created_at: today.toISOString()
      },
      {
        full_name: 'Maria Santos',
        role: 'Chefe de Cozinha',
        base_salary_kz: 120000,
        salario_base: 120000,
        status: 'active',
        created_at: today.toISOString()
      },
      {
        full_name: 'Pedro Costa',
        role: 'Garçom',
        base_salary_kz: 115000,
        salario_base: 115000,
        status: 'active',
        created_at: today.toISOString()
      }
    ]);
    
    if (staffError) throw staffError;
    
    // 6. VERIFICAÇÃO - Mostrar totais
    console.log('\n📈 VERIFICAÇÃO DE DADOS:');
    
    const { data: cashFlowData } = await supabase
      .from('cash_flow')
      .select('amount')
      .eq('type', 'saida');
    
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount_kz');
    
    const { data: externalData } = await supabase
      .from('external_history')
      .select('total_revenue');
    
    const { data: staffData } = await supabase
      .from('staff')
      .select('base_salary_kz');
    
    const cashFlowTotal = cashFlowData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    const expensesTotal = expensesData?.reduce((sum, item) => sum + Number(item.amount_kz), 0) || 0;
    const externalTotal = externalData?.reduce((sum, item) => sum + Number(item.total_revenue), 0) || 0;
    const staffTotal = staffData?.reduce((sum, item) => sum + Number(item.base_salary_kz), 0) || 0;
    
    console.log('\n💰 TOTAIS INSERIDOS:');
    console.log(`CASH_FLOW: ${cashFlowData?.length || 0} registros = ${cashFlowTotal} Kz`);
    console.log(`EXPENSES: ${expensesData?.length || 0} registros = ${expensesTotal} Kz`);
    console.log(`EXTERNAL_HISTORY: ${externalData?.length || 0} registros = ${externalTotal} Kz`);
    console.log(`STAFF: ${staffData?.length || 0} registros = ${staffTotal} Kz`);
    
    console.log('\n✅ SEED COMPLETO FINALIZADO COM SUCESSO!');
    console.log('🚀 O app está 100% pronto para funcionar automaticamente!');
    console.log('📊 Dashboard mostrará despesas reais imediatamente!');
    
  } catch (error) {
    console.error('❌ Erro no seed completo:', error);
  }
}

async function main() {
  await seedCompleteDatabaseSupabase();
}

main();
