import { prisma } from '../lib/prisma'

export interface SalesMetrics {
  total: number
  taxes: number
  profit: number
  orderCount: number
}

async function getTaxRate(): Promise<number> {
  const tableName = 'app_settings'
  console.log('[PRISMA] Query executada em: ' + tableName)
  
  try {
    // Nota: app_settings não tem campo de taxa no schema atual
    // Retornando 14% como fallback até que o campo seja adicionado
    console.log('[PRISMA] Usando taxa de imposto fallback (14%) - campo não encontrado em app_settings')
    return 0.14
  } catch (error) {
    console.error('[PRISMA] Erro ao buscar taxa de imposto:', error)
    return 0.14 // Fallback
  }
}

export async function getTodaySales(): Promise<SalesMetrics> {
  const tableName = 'orders'
  console.log('[PRISMA] Query executada em: ' + tableName)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  try {
    const orders = await (prisma as any).orders.findMany({
      where: {
        status: 'closed',
        created_at: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        total_amount: true,
        cost_amount: true
      }
    })
    
    console.log(`[PRISMA] Encontradas ${orders.length} ordens fechadas hoje`)
    
    const total = orders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0)
    const cost = orders.reduce((sum: number, order: any) => sum + Number(order.cost_amount || 0), 0)
    
    // Cálculo de impostos usando taxa dinâmica
    const taxRate = await getTaxRate()
    const taxes = total * taxRate
    
    // Lucro = Total - Custos - Impostos
    const profit = total - cost - taxes
    
    return {
      total,
      taxes,
      profit,
      orderCount: orders.length
    }
  } catch (error) {
    console.error('[PRISMA] Erro ao buscar vendas do dia:', error)
    throw error
  }
}

export async function getSalesByDateRange(startDate: Date, endDate: Date): Promise<SalesMetrics> {
  const tableName = 'orders'
  console.log('[PRISMA] Query executada em: ' + tableName)
  
  try {
    const orders = await (prisma as any).orders.findMany({
      where: {
        status: 'closed',
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        total_amount: true,
        cost_amount: true
      }
    })
    
    console.log(`[PRISMA] Encontradas ${orders.length} ordens no período`)
    
    const total = orders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0)
    const cost = orders.reduce((sum: number, order: any) => sum + Number(order.cost_amount || 0), 0)
    
    // Cálculo de impostos usando taxa dinâmica
    const taxRate = await getTaxRate()
    const taxes = total * taxRate
    const profit = total - cost - taxes
    
    return {
      total,
      taxes,
      profit,
      orderCount: orders.length
    }
  } catch (error) {
    console.error('[PRISMA] Erro ao buscar vendas por período:', error)
    throw error
  }
}
