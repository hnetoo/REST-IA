// API Mock com dados reais para teste do Dashboard
export async function GET() {
  console.log('🧪 API Finance Mock - Retornando dados de teste');
  
  const response = {
    success: true,
    data: {
      todayExpenses: {
        total: 87000, // 25.000 + 15.000 + 35.000 + 12.000
        count: 4
      },
      monthExpenses: {
        total: 87000,
        count: 4
      },
      staffExpenses: {
        total: 385000, // 150.000 + 120.000 + 115.000
        count: 3
      },
      externalHistory: {
        total: 26100000, // 8.700.000 * 3 (seed executado 3x)
        count: 4
      },
      totalExpensesToday: 87000,
      totalExpensesMonth: 87000,
      staffTotal: 385000,
      externalTotal: 26100000
    }
  };
  
  console.log('✅ API Mock retornando:', response);
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
