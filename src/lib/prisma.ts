import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:Veredapos%232026@db.tboiuiwlqfzcvakxrsmj.supabase.co:5432/postgres",
    },
  },
})

export default prisma
