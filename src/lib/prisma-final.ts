import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || "postgresql://postgres.tboiuiwlqfzcvakxrsmj:%5BBVYOcg03fmKqofm6%5D@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
