const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseKey = 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔄 Iniciando teste de conexão...');
  
  try {
    // Testar Orders
    console.log('📊 Testando Orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .eq('status', 'pending');
    
    if (ordersError) {
      console.error('❌ Erro Orders:', ordersError);
    } else {
      const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
      console.log(`✅ Orders: ${orders.length} registros, Total: ${totalRevenue} Kz`);
    }
    
    // Testar Cash Flow
    console.log('💰 Testando Cash Flow...');
    const { data: cashFlow, error: cashFlowError } = await supabase
      .from('cash_flow')
      .select('amount, type, created_at')
      .eq('type', 'saida');
    
    if (cashFlowError) {
      console.error('❌ Erro Cash Flow:', cashFlowError);
    } else {
      const totalExpenses = cashFlow.reduce((acc, cf) => acc + Number(cf.amount || 0), 0);
      console.log(`✅ Cash Flow Saídas: ${cashFlow.length} registros, Total: ${totalExpenses} Kz`);
    }
    
    // Testar Expenses
    console.log('💸 Testando Expenses...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount_kz, created_at');
    
    if (expensesError) {
      console.error('❌ Erro Expenses:', expensesError);
    } else {
      const totalExp = expenses.reduce((acc, exp) => acc + Number(exp.amount_kz || 0), 0);
      console.log(`✅ Expenses: ${expenses.length} registros, Total: ${totalExp} Kz`);
    }
    
    // Resumo Final
    const revenue = orders ? orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0) : 0;
    const expenses_total = cashFlow ? cashFlow.reduce((acc, cf) => acc + Number(cf.amount || 0), 0) : 0;
    const profit = revenue - expenses_total;
    
    console.log('\n📊 Resumo Dashboard Esperado:');
    console.log(`Rendimento Global: ${revenue} Kz`);
    console.log(`Despesas de Hoje: ${expenses_total} Kz`);
    console.log(`Lucro Líquido: ${profit} Kz`);
    console.log('Status: 🟢 Teste Concluído');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testConnection();
