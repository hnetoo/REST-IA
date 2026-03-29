import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:Veredapos%232026@db.tboiuiwlqfzcvakxrsmj.supabase.co:5432/postgres"
    }
  }
});

async function seedCashFlow() {
  console.log('🌱 Inserindo despesas de teste na tabela cash_flow...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Despesa 1: Compra de material
  await prisma.cash_flow.create({
    data: {
      amount: 25000,
      type: 'saida',
      category: 'Material de Escritório',
      description: 'Papel, canetas, impressora',
      created_at: today
    }
  });
  
  // Despesa 2: Limpeza
  await prisma.cash_flow.create({
    data: {
      amount: 15000,
      type: 'saida',
      category: 'Limpeza e Manutenção',
      description: 'Serviços de limpeza mensal',
      created_at: today
    }
  });
  
  // Despesa 3: Água e Luz
  await prisma.cash_flow.create({
    data: {
      amount: 35000,
      type: 'saida',
      category: 'Utilidades',
      description: 'Fatura de água e luz',
      created_at: new Date(today.getTime() - 24 * 60 * 60 * 1000) // Ontem
    }
  });
  
  // Despesa 4: Internet
  await prisma.cash_flow.create({
    data: {
      amount: 12000,
      type: 'saida',
      category: 'Telecomunicações',
      description: 'Internet e telefone',
      created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) // Anteontem
    }
  });
  
  console.log('✅ 4 despesas de teste inseridas com sucesso!');
  
  // Verificar total
  const totalDespesas = await prisma.cash_flow.aggregate({
    where: {
      type: 'saida'
    },
    _sum: {
      amount: true
    }
  });
  
  console.log(`💰 Total de despesas: ${totalDespesas._sum.amount || 0} Kz`);
}

async function main() {
  try {
    await seedCashFlow();
  } catch (error) {
    console.error('❌ Erro ao inserir despesas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
