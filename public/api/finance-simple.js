// API Mock simples - retornar JSON direto
export async function GET() {
  return new Response(JSON.stringify({
    success: true,
    data: {
      totalExpensesToday: 87000,
      totalExpensesMonth: 87000,
      staffTotal: 385000,
      externalTotal: 26100000
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
