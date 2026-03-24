// Test API Finance - Simular chamada do Dashboard
const testFinanceAPI = async () => {
  try {
    console.log('🧪 Testando API Finance...');
    
    const response = await fetch('/api/finance.js');
    const data = await response.json();
    
    console.log('✅ Resposta da API:', data);
    
    if (data.success) {
      console.log('💰 Dados financeiros:');
      console.log('- Despesas Hoje:', data.data.totalExpensesToday, 'Kz');
      console.log('- Despesas Mês:', data.data.totalExpensesMonth, 'Kz');
      console.log('- Staff:', data.data.staffTotal, 'Kz');
      console.log('- External:', data.data.externalTotal, 'Kz');
    } else {
      console.error('❌ Erro na API:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erro ao chamar API:', error);
  }
};

// Executar teste
testFinanceAPI();
