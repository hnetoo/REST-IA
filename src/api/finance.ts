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
    
    // Buscar despesas de hoje da tabela cash_flow
    const todayExpenses = await prisma.cash_flow.aggregate({
      where: {
        type: 'saida',
        created_at: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });
    
    // Buscar despesas do mês
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthExpenses = await prisma.cash_flow.aggregate({
      where: {
        type: 'saida',
        created_at: {
          gte: firstDayOfMonth,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });
    
    // Buscar staff expenses (385.000 Kz)
    const staffExpenses = await prisma.staff.aggregate({
      where: {
        status: 'active'
      },
      _sum: {
        base_salary_kz: true
      },
      _count: {
        id: true
      }
    });
    
    // Buscar external_history (8.700.000 Kz)
    const externalHistory = await prisma.external_history.aggregate({
      _sum: {
        total_revenue: true
      },
      _count: {
        id: true
      }
    });
    
    const response = {
      success: true,
      data: {
        todayExpenses: {
          total: Number(todayExpenses._sum.amount || 0),
          count: todayExpenses._count.id
        },
        monthExpenses: {
          total: Number(monthExpenses._sum.amount || 0),
          count: monthExpenses._count.id
        },
        staffExpenses: {
          total: Number(staffExpenses._sum.base_salary_kz || 0),
          count: staffExpenses._count.id
        },
        externalHistory: {
          total: Number(externalHistory._sum.total_revenue || 0),
          count: externalHistory._count.id
        },
        totalExpensesToday: Number(todayExpenses._sum.amount || 0),
        totalExpensesMonth: Number(monthExpenses._sum.amount || 0),
        staffTotal: Number(staffExpenses._sum.base_salary_kz || 0),
        externalTotal: Number(externalHistory._sum.total_revenue || 0)
      }
    };
    
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
