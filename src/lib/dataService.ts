import { supabase } from '../supabase_standalone';
import { formatKz } from './dateUtils';

// 🎯 BRIDGE DE DADOS - Remove Prisma do Frontend
export interface MetricsData {
  vendasHoje: number;
  vendasTotais: number;
  despesasHoje: number;
  despesasTotais: number;
  folhaSalarial: number;
  impostos: number;
  lucroLiquido: number;
  margem: number;
  historicoExterno: number;
  rendimentoGlobal: number;
  source: 'local_sqlite' | 'supabase_remote' | 'electron_ipc';
}

class DataServiceBridge {
  // 🎯 VERIFICAR AMBIENTE
  private isElectron(): boolean {
    return !!(typeof window !== 'undefined' && window.electronAPI);
  }

  // 💾 REIDRATAÇÃO DE DADOS - Evita perda em novas instalações
  async rehydrateDataFromSupabase(): Promise<void> {
    if (!this.isElectron()) {
      console.log('[DATA BRIDGE] 💾 Reidratação apenas necessária no Electron');
      return;
    }

    try {
      console.log('[DATA BRIDGE] 💾 Iniciando reidratação de dados do Supabase...');
      
      // 📅 Obter data atual em Luanda (hojeWAT)
      const today = new Date();
      const luandaOffset = 1; // WAT is UTC+1
      const luandaTime = new Date(today.getTime() + (luandaOffset * 60 * 60 * 1000));
      const hojeWAT = luandaTime.toISOString().split('T')[0];
      
      console.log('[DATA BRIDGE] 💾 Data hojeWAT:', hojeWAT);

      // 📊 Buscar vendas do dia atual no Supabase
      const { data: vendasHojeData, error: vendasError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'FECHADO')
        .gte('created_at', `${hojeWAT}T00:00:00Z`)
        .lte('created_at', `${hojeWAT}T23:59:59Z`);

      if (vendasError) {
        console.error('[DATA BRIDGE] ❌ Erro ao buscar vendas do dia:', vendasError);
      } else if (vendasHojeData && vendasHojeData.length > 0) {
        console.log(`[DATA BRIDGE] 💾 Encontradas ${vendasHojeData.length} vendas do dia no Supabase`);
        
        // 💾 Inserir vendas no SQLite local via IPC
        for (const venda of vendasHojeData) {
          try {
            await window.electronAPI?.insertOrder({
              id: venda.id,
              total_amount: venda.total_amount,
              status: venda.status,
              created_at: venda.created_at,
              customer_name: venda.customer_name,
              table_number: venda.table_number,
              items: venda.items || []
            });
            console.log('[DATA BRIDGE] 💾 Venda reidratada:', venda.id);
          } catch (insertError) {
            console.error('[DATA BRIDGE] ❌ Erro ao inserir venda local:', insertError);
          }
        }
      }

      // 💸 Buscar despesas do dia atual no Supabase
      const { data: despesasHojeData, error: despesasError } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', `${hojeWAT}T00:00:00Z`)
        .lte('created_at', `${hojeWAT}T23:59:59Z`);

      if (despesasError) {
        console.error('[DATA BRIDGE] ❌ Erro ao buscar despesas do dia:', despesasError);
      } else if (despesasHojeData && despesasHojeData.length > 0) {
        console.log(`[DATA BRIDGE] 💾 Encontradas ${despesasHojeData.length} despesas do dia no Supabase`);
        
        // 💾 Inserir despesas no SQLite local via IPC
        for (const despesa of despesasHojeData) {
          try {
            await window.electronAPI?.insertExpense({
              id: despesa.id,
              description: despesa.description,
              amount_kz: despesa.amount_kz,
              category: despesa.category,
              status: despesa.status,
              created_at: despesa.created_at
            });
            console.log('[DATA BRIDGE] 💾 Despesa reidratada:', despesa.id);
          } catch (insertError) {
            console.error('[DATA BRIDGE] ❌ Erro ao inserir despesa local:', insertError);
          }
        }
      }

      console.log('[DATA BRIDGE] 💾 Reidratação de dados concluída com sucesso!');
      
    } catch (error) {
      console.error('[DATA BRIDGE] ❌ Erro na reidratação de dados:', error);
    }
  }

  // 🔄 INVALIDAR CACHE - Forçar refresh após deleção
  async invalidateCache(): Promise<void> {
    console.log('[DATA BRIDGE] 🔄 Invalidando cache forçado...');
    
    try {
      // 1. Limpar cache local se existir
      if (typeof window !== 'undefined') {
        (window as any).DATA_BRIDGE_CACHE = null;
        console.log('[DATA BRIDGE] 🗑️ Cache local limpo');
      }
      
      // 2. Forçar reload do store
      const { loadExpenses } = await import('../store/useStore').then(m => m.useStore.getState());
      await loadExpenses();
      console.log('[DATA BRIDGE] 🔄 Store reload forçado');
      
      // 3. Disparar evento de atualização
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('data-bridge-invalidated', { 
          detail: { timestamp: new Date().toISOString() } 
        });
        window.dispatchEvent(event);
        console.log('[DATA BRIDGE] 📢 Evento data-bridge-invalidated disparado');
      }
      
    } catch (error) {
      console.error('[DATA BRIDGE] ❌ Erro ao invalidar cache:', error);
    }
  }

  // 🎯 OBTER MÉTRICAS - Bridge Principal
  async getMetrics(): Promise<MetricsData> {
    console.log('[DATA BRIDGE] 🎯 Obtendo métricas...');
    
    try {
      // 🖥️ ELECTRON: Usar IPC
      if (this.isElectron()) {
        console.log('[DATA BRIDGE] 🖥️ Ambiente Electron detectado - Usando IPC');
        
        // 💾 VERIFICAR SE PRECISA REIDRATAR
        const localData = await window.electronAPI?.getMetrics();
        if (localData && (localData.vendasHoje === 0 && localData.despesasHoje === 0)) {
          console.log('[DATA BRIDGE] 💾 SQLite vazio - Iniciando reidratação...');
          await this.rehydrateDataFromSupabase();
        }
        
        return await this.getElectronMetrics();
      }
      
      // 🌐 WEB: Usar Supabase
      console.log('[DATA BRIDGE] 🌐 Ambiente Web detectado - Usando Supabase');
      return await this.getSupabaseMetrics();
      
    } catch (error) {
      console.error('[DATA BRIDGE] ❌ Erro ao obter métricas:', error);
      
      // 🛡️ FALLBACK SEGURO
      return {
        vendasHoje: 0,
        vendasTotais: 0,
        despesasHoje: 0,
        despesasTotais: 0,
        folhaSalarial: 0,
        impostos: 0,
        lucroLiquido: 0,
        margem: 0,
        historicoExterno: 0,
        rendimentoGlobal: 0,
        source: 'supabase_remote'
      };
    }
  }

  // 🖥️ ELECTRON IPC - Chamada para o backend
  private async getElectronMetrics(): Promise<MetricsData> {
    try {
      console.log('[DATA BRIDGE] 🖥️ Chamando window.electron.getMetrics()...');
      
      // Chamada IPC para o backend Electron
      const metrics = await window.electronAPI?.getMetrics();
      
      if (!metrics) {
        throw new Error('Electron API não disponível');
      }
      
      console.log('[DATA BRIDGE] ✅ Métricas recebidas do Electron:', metrics);
      
      return {
        ...metrics,
        source: 'electron_ipc'
      };
      
    } catch (error) {
      console.error('[DATA BRIDGE] ❌ Erro no IPC do Electron:', error);
      
      // Fallback para Supabase se IPC falhar
      console.log('[DATA BRIDGE] 🔄 Fallback para Supabase...');
      return await this.getSupabaseMetrics();
    }
  }

  // 🌐 SUPABASE - Chamada direta para o backend
  private async getSupabaseMetrics(): Promise<MetricsData> {
    console.log('[DATA BRIDGE] 🌐 Buscando métricas do Supabase...');
    
    // 📅 Filtro para hoje em Luanda (GMT+1)
    const hojeLuanda = new Date();
    const inicioDia = new Date(hojeLuanda.getFullYear(), hojeLuanda.getMonth(), hojeLuanda.getDate(), 0, 0, 0);
    const fimDia = new Date(hojeLuanda.getFullYear(), hojeLuanda.getMonth(), hojeLuanda.getDate(), 23, 59, 59);
    
    // Ajustar para UTC+1 (Luanda)
    const inicioDiaUTC = new Date(inicioDia.getTime() + (1 * 60 * 60 * 1000));
    const fimDiaUTC = new Date(fimDia.getTime() + (1 * 60 * 60 * 1000));
    
    console.log('[DATA BRIDGE] 📅 Filtro Hoje (Luanda UTC+1):', {
      inicio: inicioDiaUTC.toISOString(),
      fim: fimDiaUTC.toISOString()
    });

    // 🔑 1. VENDAS DE HOJE - Faturação Hoje (total_amount, status = 'FECHADO', filtro data)
    const { data: vendasHojeData, error: vendasHojeError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'FECHADO')
      .gte('created_at', inicioDiaUTC.toISOString())
      .lte('created_at', fimDiaUTC.toISOString());

    let vendasHoje = 0;
    if (!vendasHojeError && vendasHojeData) {
      vendasHoje = vendasHojeData.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
      console.log('[DATA BRIDGE] 📊 Vendas Hoje (FECHADO):', vendasHoje);
    } else {
      console.log('[DATA BRIDGE] ⚠️ Vendas Hoje - Erro ou vazio:', vendasHojeError?.message);
    }

    // 🔑 2. VENDAS TOTAIS - Apenas tabela orders (SEM histórico externo)
    const { data: vendasTotaisData, error: vendasTotaisError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'FECHADO');

    let vendasTotais = 0;
    if (!vendasTotaisError && vendasTotaisData) {
      vendasTotais = vendasTotaisData.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
      console.log('[DATA BRIDGE] 💰 Vendas Totais (apenas orders):', vendasTotais);
    } else {
      console.log('[DATA BRIDGE] ⚠️ Vendas Totais - Erro ou vazio:', vendasTotaisError?.message);
    }

    // 🔑 3. DESPESAS HOJE - Filtro rigoroso CURRENT_DATE
    const { data: despesasHojeData, error: despesasHojeError } = await supabase
      .from('expenses')
      .select('amount_kz, created_at')
      .gte('created_at', inicioDiaUTC.toISOString())
      .lte('created_at', fimDiaUTC.toISOString());

    let despesasHoje = 0;
    if (!despesasHojeError && despesasHojeData) {
      despesasHoje = despesasHojeData.reduce((acc, expense) => acc + (Number(expense.amount_kz) || 0), 0);
      console.log('[DATA BRIDGE] 💸 Despesas Hoje (filtro data):', despesasHoje);
    } else {
      console.log('[DATA BRIDGE] ⚠️ Despesas Hoje - Erro ou vazio:', despesasHojeError?.message);
    }

    // 🔑 4. DESPESAS TOTAIS - Todas as despesas sem filtro de data
    const { data: despesasTotaisData, error: despesasTotaisError } = await supabase
      .from('expenses')
      .select('amount_kz');

    let despesasTotais = 0;
    if (!despesasTotaisError && despesasTotaisData) {
      despesasTotais = despesasTotaisData.reduce((acc, expense) => acc + (Number(expense.amount_kz) || 0), 0);
      console.log('[DATA BRIDGE] 💸 Despesas Totais (sem filtro):', despesasTotais);
    } else {
      console.log('[DATA BRIDGE] ⚠️ Despesas Totais - Erro ou vazio:', despesasTotaisError?.message);
    }

    // 🔑 5. FOLHA SALARIAL - base_salary_kz (schema unificado)
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('base_salary_kz, subsidios, bonus, horas_extras, descontos, salario_base');

    let folhaSalarial = 0;
    if (!staffError && staffData) {
      folhaSalarial = staffData.reduce((acc, staff) => {
        const baseSalary = Number(staff.base_salary_kz) || Number(staff.salario_base) || 0;
        const subsidios = Number(staff.subsidios) || 0;
        const bonus = Number(staff.bonus) || 0;
        const horasExtras = Number(staff.horas_extras) || 0;
        const descontos = Number(staff.descontos) || 0;
        
        // Salário total = base + subsídios + bónus + horas extras - descontos
        const salarioTotal = baseSalary + subsidios + bonus + horasExtras - descontos;
        return acc + salarioTotal;
      }, 0);
      console.log('[DATA BRIDGE] 👥 Folha Salarial:', folhaSalarial);
    } else {
      console.log('[DATA BRIDGE] ⚠️ Staff - Erro ou vazio:', staffError?.message);
    }

    // 🔑 6. HISTÓRICO EXTERNO - total_revenue (para rendimento global)
    const { data: historicoData, error: historicoError } = await supabase
      .from('external_history')
      .select('total_revenue');

    let historicoExterno = 0;
    if (!historicoError && historicoData) {
      historicoExterno = historicoData.reduce((acc, item) => acc + (Number(item.total_revenue) || 0), 0);
      console.log('[DATA BRIDGE] 📚 Histórico Externo:', historicoExterno);
    } else {
      console.log('[DATA BRIDGE] ⚠️ Histórico Externo - Erro ou vazio:', historicoError?.message);
    }

    // 🔑 7. CUSTOS DE PRODUTOS - Inventory Cost (preço de custo dos produtos vendidos)
    let custosProdutos = 0;
    let orderItemsData: any[] | null = null;
    try {
      // Buscar itens das orders com status FECHADO para calcular custo
      const { data: orderItemsResult, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          products!inner(
            cost_price
          )
        `);

      orderItemsData = orderItemsResult;

      if (!orderItemsError && orderItemsData) {
        custosProdutos = orderItemsData.reduce((acc, item) => {
          const products = item.products as any;
          const costPrice = Number(products?.cost_price) || 0;
          const quantity = Number(item.quantity) || 0;
          return acc + (costPrice * quantity);
        }, 0);
        console.log('[DATA BRIDGE] 📦 Custos de Produtos (Inventory Cost):', custosProdutos);
      } else {
        console.log('[DATA BRIDGE] ⚠️ Custos de Produtos - Erro ou vazio:', orderItemsError?.message);
      }
    } catch (error) {
      console.log('[DATA BRIDGE] ⚠️ Erro ao calcular custos de produtos:', error);
    }

    // 🔑 8. CÁLCULOS FINAIS CORRIGIDOS
    
    // Impostos = Apenas 7% sobre Vendas Totais (SEM histórico externo)
    const impostos = vendasTotais * 0.07;
    console.log('[DATA BRIDGE] 💰 Impostos (7% apenas sobre Vendas Totais):', impostos);
    
    // Rendimento Global = Vendas Totais + Histórico Externo
    const rendimentoGlobal = vendasTotais + historicoExterno;
    
    // Custos Totais = Custo Staff + Custo Produtos + Despesas Totais
    const custosTotais = folhaSalarial + custosProdutos + despesasTotais;
    console.log('[DATA BRIDGE] 📊 Custos Totais (Staff + Produtos + Despesas):', custosTotais);
    
    // Lucro Líquido = Rendimento Global - Custos Totais
    const lucroLiquido = rendimentoGlobal - custosTotais;
    
    // Margem = (Lucro Líquido / Rendimento Global) * 100
    const margem = rendimentoGlobal > 0 ? (lucroLiquido / rendimentoGlobal) * 100 : 0;

    const metrics: MetricsData = {
      vendasHoje,           // Faturação Hoje
      vendasTotais,         // Apenas orders (sem histórico)
      despesasHoje,         // Com filtro de data rigoroso
      despesasTotais,       // Todas as despesas
      folhaSalarial,
      impostos,             // 7% apenas sobre vendas_totais
      lucroLiquido,
      margem,
      historicoExterno,
      rendimentoGlobal,
      source: 'supabase_remote'
    };

    // 📊 LOG DE VALIDAÇÃO - Comparar valores calculados com brutos
    console.log('[DATA BRIDGE] 📊 ===== RELATÓRIO DE VALIDAÇÃO =====');
    console.log('[DATA BRIDGE] 📊 Valores Brutos da Base de Dados:');
    console.log('  • Vendas Hoje (bruto):', vendasHojeData?.length || 0, 'registros');
    console.log('  • Vendas Totais (bruto):', vendasTotaisData?.length || 0, 'registros');
    console.log('  • Despesas Hoje (bruto):', despesasHojeData?.length || 0, 'registros');
    console.log('  • Despesas Totais (bruto):', despesasTotaisData?.length || 0, 'registros');
    console.log('  • Staff (bruto):', staffData?.length || 0, 'registros');
    console.log('  • Histórico Externo (bruto):', historicoData?.length || 0, 'registros');
    console.log('  • Order Items (bruto):', orderItemsData?.length || 0, 'registros');
    
    console.log('[DATA BRIDGE] 📊 Valores Calculados:');
    console.log('  • Faturação Hoje:', formatKz(vendasHoje));
    console.log('  • Vendas Totais (apenas orders):', formatKz(vendasTotais));
    console.log('  • Despesas Hoje (com filtro data):', formatKz(despesasHoje));
    console.log('  • Despesas Totais (sem filtro):', formatKz(despesasTotais));
    console.log('  • Folha Salarial:', formatKz(folhaSalarial));
    console.log('  • Custos de Produtos (Inventory Cost):', formatKz(custosProdutos));
    console.log('  • Impostos (7% apenas sobre vendas):', formatKz(impostos));
    console.log('  • Custos Totais (Staff + Produtos + Despesas):', formatKz(custosTotais));
    console.log('  • Rendimento Global (Vendas + Histórico):', formatKz(rendimentoGlobal));
    console.log('  • Lucro Líquido:', formatKz(lucroLiquido));
    console.log('  • Margem (%):', margem.toFixed(2) + '%');
    console.log('[DATA BRIDGE] 📊 ===== FIM DO RELATÓRIO =====');

    return metrics;
  }

  // 🔄 OUTROS MÉTODOS DA BRIDGE

  // 📦 ORDERS
  async getOrders(status?: string) {
    if (this.isElectron()) {
      return await window.electronAPI?.getOrders(status) || [];
    }
    
    const query = status 
      ? supabase.from('orders').select('*').eq('status', status)
      : supabase.from('orders').select('*');
    
    const { data, error } = await query;
    return error ? [] : data || [];
  }

  // 💸 EXPENSES
  async getExpenses() {
    if (this.isElectron()) {
      return await window.electronAPI?.getExpenses() || [];
    }
    
    const { data, error } = await supabase.from('expenses').select('*');
    return error ? [] : data || [];
  }

  // 👥 STAFF
  async getStaff() {
    if (this.isElectron()) {
      return await window.electronAPI?.getStaff() || [];
    }
    
    const { data, error } = await supabase.from('staff').select('*');
    return error ? [] : data || [];
  }

  // 📚 EXTERNAL HISTORY
  async getExternalHistory() {
    if (this.isElectron()) {
      return await window.electronAPI?.getExternalHistory() || [];
    }
    
    const { data, error } = await supabase.from('external_history').select('*');
    return error ? [] : data || [];
  }

  // 💾 INSERÇÃO DE DADOS
  async insertOrder(orderData: any) {
    if (this.isElectron()) {
      return await window.electronAPI?.insertOrder(orderData);
    }
    
    const { data, error } = await supabase.from('orders').insert(orderData).select();
    return error ? null : data;
  }

  async insertExpense(expenseData: any) {
    if (this.isElectron()) {
      return await window.electronAPI?.insertExpense(expenseData);
    }
    
    const { data, error } = await supabase.from('expenses').insert(expenseData).select();
    return error ? null : data;
  }

  async updateStaff(staffData: any) {
    if (this.isElectron()) {
      return await window.electronAPI?.updateStaff(staffData);
    }
    
    const { data, error } = await supabase
      .from('staff')
      .update(staffData)
      .eq('id', staffData.id)
      .select();
    
    return error ? null : data;
  }
}

// 🎯 EXPORTAR INSTÂNCIA GLOBAL
export const dataServiceBridge = new DataServiceBridge();
