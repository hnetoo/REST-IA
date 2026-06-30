import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Veredapos%232026@db.tboiuiwlqfzcvakxrsmj.supabase.co:5432/postgres",
    },
  },
});

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Buscar despesas de hoje da tabela expenses (compatível com código existente)
    const todayExpenses = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount_kz), 0) as total, COUNT(*) as count
      FROM expenses 
      WHERE created_at >= ${today} 
      AND created_at < ${tomorrow}
    `;
    
    // Buscar despesas do mês
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthExpenses = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount_kz), 0) as total, COUNT(*) as count
      FROM expenses 
      WHERE created_at >= ${firstDayOfMonth} 
      AND created_at < ${tomorrow}
    `;
    
    // Buscar staff expenses (385.000 Kz)
    const staffExpenses = await prisma.$queryRaw`
      SELECT COALESCE(SUM(base_salary_kz), 0) as total, COUNT(*) as count
      FROM staff 
      WHERE status = 'active'
    `;
    
    // Buscar external_history (8.700.000 Kz)
    const externalHistory = await prisma.$queryRaw`
      SELECT COALESCE(SUM(total_revenue), 0) as total, COUNT(*) as count
      FROM external_history
    `;
    
    const response = {
      success: true,
      data: {
        todayExpenses: {
          total: Number((todayExpenses as any)[0]?.total || 0),
          count: Number((todayExpenses as any)[0]?.count || 0)
        },
        monthExpenses: {
          total: Number((monthExpenses as any)[0]?.total || 0),
          count: Number((monthExpenses as any)[0]?.count || 0)
        },
        staffExpenses: {
          total: Number((staffExpenses as any)[0]?.total || 0),
          count: Number((staffExpenses as any)[0]?.count || 0)
        },
        externalHistory: {
          total: Number((externalHistory as any)[0]?.total || 0),
          count: Number((externalHistory as any)[0]?.count || 0)
        },
        totalExpensesToday: Number((todayExpenses as any)[0]?.total || 0),
        totalExpensesMonth: Number((monthExpenses as any)[0]?.total || 0),
        staffTotal: Number((staffExpenses as any)[0]?.total || 0),
        externalTotal: Number((externalHistory as any)[0]?.total || 0)
      }
    };
    
    console.log('[API FINANCE] Dados retornados:', response);
    return Response.json(response);
    
  } catch (error) {
    console.error('API Finance Error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
