import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.tboiuiwlqfzcvakxrsmj:[BVYOcg03fmKqofm6]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
