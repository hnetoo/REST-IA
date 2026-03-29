const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
const supabaseAnonKey = 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupOrders() {
  try {
    console.log('🔍 Verificando orders de hoje...');
    
    // Buscar orders de hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: todayOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .gte('created_at', today)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Erro ao buscar orders:', fetchError);
      return;
    }
    
    console.log(`📊 Encontradas ${todayOrders.length} orders de hoje`);
    
    // Calcular total
    const totalToday = todayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    console.log(`💰 Total hoje: ${totalToday.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}`);
    
    if (totalToday <= 39500) {
      console.log('✅ Total está correto (≤ 39.500 Kz). Nada a apagar.');
      return;
    }
    
    // Se total > 39.500, apagar as excedentes
    console.log(`⚠️ Total excede 39.500 Kz em ${(totalToday - 39500).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}`);
    
    // Ordenar por created_at (mais recentes primeiro) e apagar excedentes
    const sortedOrders = todayOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    let currentTotal = 0;
    const ordersToDelete = [];
    
    for (const order of sortedOrders) {
      if (currentTotal + Number(order.total_amount) > 39500) {
        ordersToDelete.push(order);
      } else {
        currentTotal += Number(order.total_amount);
      }
    }
    
    console.log(`🗑️ Serão apagadas ${ordersToDelete.length} orders:`);
    ordersToDelete.forEach(order => {
      console.log(`   - ID: ${order.id}, Valor: ${Number(order.total_amount).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}, Hora: ${order.created_at}`);
    });
    
    // Apagar orders
    if (ordersToDelete.length > 0) {
      const orderIdsToDelete = ordersToDelete.map(o => o.id);
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIdsToDelete);
      
      if (deleteError) {
        console.error('❌ Erro ao apagar orders:', deleteError);
      } else {
        console.log('✅ Orders apagadas com sucesso!');
        console.log(`💾 Novo total: ${currentTotal.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro crítico:', error);
  }
}

cleanupOrders();
