import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:Veredapos%232026@db.tboiuiwlqfzcvakxrsmj.supabase.co:5432/postgres"
    }
  }
});

async function seedCompleteDatabase() {
  console.log('🌱 SEED COMPLETO AUTOMÁTICO - Todas as tabelas');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dayBefore = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  try {
    // 1. LIMPAR DADOS EXISTENTES (opcional)
    console.log('🧹 Limpando dados existentes...');
    await prisma.expenses.deleteMany();
    await prisma.cash_flow.deleteMany();
    await prisma.external_history.deleteMany();
    await prisma.staff.deleteMany();
    
    // 2. CASH_FLOW - 4 despesas de teste
    console.log('💰 Inserindo CASH_FLOW...');
    await prisma.cash_flow.createMany({
      data: [
        {
          amount: 25000,
          type: 'saida',
          category: 'Material de Escritório',
          description: 'Papel, canetas, impressora',
          created_at: today
        },
        {
          amount: 15000,
          type: 'saida',
          category: 'Limpeza e Manutenção',
          description: 'Serviços de limpeza mensal',
          created_at: today
        },
        {
          amount: 35000,
          type: 'saida',
          category: 'Utilidades',
          description: 'Fatura de água e luz',
          created_at: yesterday
        },
        {
          amount: 12000,
          type: 'saida',
          category: 'Telecomunicações',
          description: 'Internet e telefone',
          created_at: dayBefore
        }
      ]
    });
    
    // 3. EXPENSES - 4 despesas compatíveis com código existente
    console.log('📋 Inserindo EXPENSES...');
    await prisma.expenses.createMany({
      data: [
        {
          description: 'Material de escritório',
          amount_kz: 25000,
          category: 'Material',
          status: 'pago',
          created_at: today
        },
        {
          description: 'Limpeza mensal',
          amount_kz: 15000,
          category: 'Serviços',
          status: 'pago',
          created_at: today
        },
        {
          description: 'Água e luz',
          amount_kz: 35000,
          category: 'Utilidades',
          status: 'pago',
          created_at: yesterday
        },
        {
          description: 'Internet',
          amount_kz: 12000,
          category: 'Telecomunicações',
          status: 'pago',
          created_at: dayBefore
        }
      ]
    });
    
    // 4. EXTERNAL_HISTORY - 8.700.000 Kz histórico
    console.log('📊 Inserindo EXTERNAL_HISTORY...');
    await prisma.external_history.create({
      data: {
        source_name: 'Sistema Legado',
        total_revenue: 8700000,
        gross_profit: 6500000,
        period: 'CONSOLIDADO',
        created_at: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    // 5. STAFF - 3 funcionários (385.000 Kz total)
    console.log('👥 Inserindo STAFF...');
    await prisma.staff.createMany({
      data: [
        {
          full_name: 'João Silva',
          role: 'Gerente',
          base_salary_kz: 150000,
          salario_base: 150000,
          status: 'active',
          created_at: today
        },
        {
          full_name: 'Maria Santos',
          role: 'Chefe de Cozinha',
          base_salary_kz: 120000,
          salario_base: 120000,
          status: 'active',
          created_at: today
        },
        {
          full_name: 'Pedro Costa',
          role: 'Garçom',
          base_salary_kz: 115000,
          salario_base: 115000,
          status: 'active',
          created_at: today
        }
      ]
    });
    
    // 6. VERIFICAÇÃO - Mostrar totais
    console.log('\n📈 VERIFICAÇÃO DE DADOS:');
    
    const cashFlowTotal = await prisma.cash_flow.aggregate({
      where: { type: 'saida' },
      _sum: { amount: true },
      _count: { id: true }
    });
    
    const expensesTotal = await prisma.expenses.aggregate({
      _sum: { amount_kz: true },
      _count: { id: true }
    });
    
    const externalTotal = await prisma.external_history.aggregate({
      _sum: { total_revenue: true },
      _count: { id: true }
    });
    
    const staffTotal = await prisma.staff.aggregate({
      _sum: { base_salary_kz: true },
      _count: { id: true }
    });
    
    console.log('\n💰 TOTAIS INSERIDOS:');
    console.log(`CASH_FLOW: ${cashFlowTotal._count.id} registros = ${cashFlowTotal._sum.amount || 0} Kz`);
    console.log(`EXPENSES: ${expensesTotal._count.id} registros = ${expensesTotal._sum.amount_kz || 0} Kz`);
    console.log(`EXTERNAL_HISTORY: ${externalTotal._count.id} registros = ${externalTotal._sum.total_revenue || 0} Kz`);
    console.log(`STAFF: ${staffTotal._count.id} registros = ${staffTotal._sum.base_salary_kz || 0} Kz`);
    
    console.log('\n✅ SEED COMPLETO FINALIZADO COM SUCESSO!');
    console.log('🚀 O app está 100% pronto para funcionar automaticamente!');
    
  } catch (error) {
    console.error('❌ Erro no seed completo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await seedCompleteDatabase();
}

main();
