import { getTodaySales } from './src/services/salesService'

async function testConnection() {
  console.log('🔗 Testando conexão com Supabase SDK...')
  
  try {
    const sales = await getTodaySales()
    console.log('✅ Conexão bem-sucedida!')
    console.log('📊 Métricas de vendas de hoje:', sales)
  } catch (error) {
    console.error('❌ Erro na conexão:', error)
  }
}

testConnection()
