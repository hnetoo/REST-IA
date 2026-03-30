import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// 🔥 DEBOUNCE SYNC CONFIG
const DEBOUNCE_DELAY = 30000; // 30 segundos
const BATCH_SIZE = 10; // Máximo de operações em lote

// 🏗️ TIPOS DO MOTOR DE SINCRONIZAÇÃO
interface TopMarginProduct {
  name: string;
  profit: number;
  qty: number;
}

interface SyncData {
  totalRevenue: number;        // Soma total de todas as orders
  todayRevenue: number;        // Faturamento de hoje
  totalExpenses: number;      // Soma total de todas as expenses
  todayExpenses: number;      // Despesas de hoje
  todayExpensesCount: number;  // 🔥 ADICIONADO: Contagem de despesas de hoje
  staffCosts: number;         // Custo total com staff
  staffCount: number;         // ✅ ADICIONADO: Número de funcionários ativos
  netProfit: number;          // Lucro líquido (Revenue - Expenses - Staff)
  externalHistory: number;     // ✅ ADICIONADO: Histórico externo da tabela external_history
  topMarginProducts: TopMarginProduct[]; // 🔥 ADICIONADO: Top produtos por margem
  lastUpdate: string;         // Timestamp da última atualização
  lastUpdated: Date | null;   // Data da última atualização (compatibilidade)
  isLoading: boolean;         // Status de carregamento
  error: string | null;       // Erro se houver
  // 🧠 INTELIGÊNCIA E ALERTAS
  alerts: Alert[];
  predictions: Predictions;
}


interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

interface Predictions {
  monthlyForecast: number;
  dailyAverage: number;
  projectedMonthEnd: number;
  marginTrend: 'increasing' | 'decreasing' | 'stable';
}

interface ExpenseCategory {
  staff: number;              // Despesas com pessoal
  operational: number;         // Custos operacionais
  maintenance: number;         // Manutenção
  supplies: number;           // Suprimentos
  other: number;             // Outras despesas
}

// MOTOR PRINCIPAL - LÓGICA PURA DE CÁLCULO
export const useSyncCore = () => {
  // ESTADO CENTRALIZADO
  const [syncData, setSyncData] = useState<SyncData>({
    totalRevenue: 0,
    todayRevenue: 0,
    totalExpenses: 0,
    todayExpenses: 0,
    todayExpensesCount: 0,    // 🔥 ADICIONADO: Contagem de despesas de hoje
    staffCosts: 0,
    staffCount: 0,            // ✅ ADICIONADO: Contagem de funcionários
    netProfit: 0,
    externalHistory: 0,        // ✅ ADICIONADO: Histórico externo
    topMarginProducts: [],     // 🔥 ADICIONADO: Top produtos por margem
    isLoading: false,
    error: null,
    lastUpdated: null,
    lastUpdate: new Date().toISOString(),
    // INTELIGÊNCIA E ALERTAS
    alerts: [],
    predictions: {
      monthlyForecast: 0,
      dailyAverage: 0,
      projectedMonthEnd: 0,
      marginTrend: 'stable'
    }
  });

  // 🧠 INTELIGÊNCIA - Previsões e Alertas
  const calculateIntelligence = useCallback(async (revenue: number, expenses: number, staffCosts: number) => {
    try {
      // � PREVISÃO DE FECHO COM BASE NA MÉDIA DIÁRIA
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const remainingDays = daysInMonth - currentDay;
      
      // Calcular média diária (últimos 7 dias)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'pending')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const dailyAverage = recentOrders?.reduce((acc, order) => acc + Number(order.total_amount || 0), 0) / 7 || 0;
      const projectedMonthEnd = revenue + (dailyAverage * remainingDays);
      const monthlyForecast = dailyAverage * daysInMonth;
      
      // 🚨 ALERTAS - Verificar margem de lucro
      const profitMargin = revenue > 0 ? ((revenue - expenses - staffCosts) / revenue) * 100 : 0;
      const alerts: Alert[] = [];
      
      if (profitMargin < 20 && profitMargin > 0) {
        alerts.push({
          id: `margin-warning-${Date.now()}`,
          type: 'warning',
          title: 'Margem de Lucro Baixa',
          message: `Margem atual: ${profitMargin.toFixed(1)}%. Abaixo do ideal de 20%.`,
          threshold: 20,
          currentValue: profitMargin,
          timestamp: new Date()
        });
      }
      
      if (profitMargin < 10 && profitMargin > 0) {
        alerts.push({
          id: `margin-danger-${Date.now()}`,
          type: 'danger',
          title: 'Margem de Lucro Crítica',
          message: `Margem atual: ${profitMargin.toFixed(1)}%. Necessária intervenção imediata!`,
          threshold: 10,
          currentValue: profitMargin,
          timestamp: new Date()
        });
      }
      
      // 📊 TENDÊNCIA DE MARGEM
      const marginTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'; // TODO: Implementar análise histórica
      
      return {
        monthlyForecast,
        dailyAverage,
        projectedMonthEnd,
        marginTrend,
        alerts
      };
      
    } catch (error) {
      console.error('[SYNC_CORE] Erro no cálculo de inteligência:', error);
      return {
        monthlyForecast: 0,
        dailyAverage: 0,
        projectedMonthEnd: 0,
        marginTrend: 'stable' as const,
        alerts: []
      };
    }
  }, []);
  const subscriptionsRef = useRef<{
    orders: any;
    expenses: any;
    staff: any;
    cashFlow: any;
  }>({ orders: null, expenses: null, staff: null, cashFlow: null });

  // 📅 FUNÇÃO AUXILIAR - DATA DE LUANDA
  const getLuandaDate = useCallback(() => {
    const today = new Date();
    const luandaOffset = 1; // WAT is UTC+1
    return new Date(today.getTime() + (luandaOffset * 60 * 60 * 1000));
  }, []);

  // 🏦 REVENUE ENGINE - Cálculo dinâmico de faturamento
  const calculateRevenue = useCallback(async (): Promise<{
    total: number;
    today: number;
    externalHistory: number;     // ✅ ADICIONADO: Retornar external_history
  }> => {
    try {
      console.log('[SYNC_CORE] 🔄 Iniciando Revenue Engine...');
      
      // 📚 Buscar external_history (tabela de configurações/meta)
      console.log('[SYNC_CORE] 📚 Buscando external_history...');
      const { data: externalHistoryData, error: externalError } = await supabase
        .from('external_history')
        .select('total_revenue')
        .limit(1); // 🔥 CORREÇÃO: Remover .single() e usar .limit(1) para evitar PGRST116
      
      let externalHistory = 0;
      if (!externalError && externalHistoryData && externalHistoryData.length > 0) {
        externalHistory = Number(externalHistoryData[0].total_revenue) || 0; // 🔥 CORREÇÃO: Acessar primeiro item do array
        console.log('[SYNC_CORE] ✅ External history encontrado:', externalHistory);
        console.log('[SYNC_CORE] 📊 Dados brutos:', externalHistoryData);
      } else {
        console.log('[SYNC_CORE] ℹ️ Nenhum external history encontrado - usando 0');
        console.log('[SYNC_CORE] 📊 Erro:', externalError);
        externalHistory = 0;  // ✅ FORÇAR 0 quando não há dados
      }
      
      // 💰 Buscar todas as orders com status variados (não apenas 'pending')
      console.log('[SYNC_CORE] 💰 Buscando todas as orders...');
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        // 🔥 CORREÇÃO: Aceitar múltiplos status para incluir vendas reais
        .in('status', ['pending', 'closed', 'paid', 'FECHADO', 'PAGO', 'completed', 'delivered', 'DELIVERED']);
      
      let totalRevenue = 0;
      if (!allOrdersError && allOrdersData && Array.isArray(allOrdersData)) {
        console.log('[SYNC_CORE] 📊 Orders encontradas com status:', allOrdersData.map(o => ({ id: o.id, status: o.status, amount: o.total_amount })));
        totalRevenue = allOrdersData.reduce((acc, order) => {
          return acc + Number(order.total_amount || 0);
        }, 0);
        console.log('[SYNC_CORE] ✅ Orders encontradas:', allOrdersData.length, 'Total:', totalRevenue);
      } else {
        console.log('[SYNC_CORE] ℹ️ Nenhuma order encontrada ou erro na busca');
      }
      
      // 📅 Buscar orders de hoje com status variados
      const hojeUTC = new Date().toISOString().split('T')[0]; // 🔥 CORREÇÃO: Usar UTC diretamente
      
      console.log('[SYNC_CORE] 📅 Buscando orders de hoje (', hojeUTC, ')...');
      console.log('[SYNC_CORE] 📅 Data atual:', new Date().toISOString());
      
      const { data: todayOrdersData, error: todayOrdersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        // 🔥 CORREÇÃO: Aceitar múltiplos status para incluir vendas reais
        .in('status', ['pending', 'closed', 'paid', 'FECHADO', 'PAGO', 'completed', 'delivered', 'DELIVERED'])
        .gte('created_at', `${hojeUTC}T00:00:00Z`)
        .lte('created_at', `${hojeUTC}T23:59:59Z`);
      
      console.log('[SYNC_CORE] 📊 Resultado da busca:', { error: todayOrdersError, dataLength: todayOrdersData?.length });
      
      // 🔥 TESTE: Buscar todas as orders sem filtro de data
      const { data: allTodayOrders, error: allTodayError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        .in('status', ['pending', 'closed', 'paid', 'FECHADO', 'PAGO'])
        .limit(10);
      
      console.log('[SYNC_CORE] 🔍 TESTE - Todas as orders recentes:', { error: allTodayError, data: allTodayOrders });
      
      // 🔥 DEBUG: Verificar data das orders
      if (allTodayOrders && allTodayOrders.length > 0) {
        console.log('[SYNC_CORE] 📅 DATAS DAS ORDERS:');
        allTodayOrders.forEach(order => {
          const orderDate = new Date(order.created_at).toISOString().split('T')[0];
          const hoje = new Date().toISOString().split('T')[0];
          console.log(`Order ${order.id}: ${order.created_at} -> ${orderDate} (Hoje: ${hoje}) - É hoje? ${orderDate === hoje}`);
        });
      }
      
      let todayRevenue = 0;
      if (!todayOrdersError && todayOrdersData && Array.isArray(todayOrdersData)) {
        console.log('[SYNC_CORE] 📊 Orders de hoje encontradas:', todayOrdersData.map(o => ({ id: o.id, status: o.status, amount: o.total_amount, created: o.created_at })));
        todayRevenue = todayOrdersData.reduce((acc, order) => {
          return acc + Number(order.total_amount || 0);
        }, 0);
        console.log('[SYNC_CORE] ✅ Orders de hoje:', todayOrdersData.length, 'Total:', todayRevenue);
      } else {
        console.log('[SYNC_CORE] ℹ️ Nenhuma order de hoje encontrada');
        console.log('[SYNC_CORE] ❌ Erro detalhado:', todayOrdersError);
      }
      
      // 🚀 Cálculo final do Revenue Engine
      const finalTotal = externalHistory + totalRevenue;
      
      return {
        total: finalTotal,
        today: todayRevenue,
        externalHistory: externalHistory   // ✅ ADICIONADO: Retornar external_history
      };
      
    } catch (error) {
      // Tratamento específico para Erro 400 e outros erros
      if (error && typeof error === 'object' && 'status' in error) {
        const errorStatus = (error as any).status;
        if (errorStatus === 400) {
          console.error('[SYNC_CORE] ❌ Erro 400 - Bad Request:', error);
        }
      }
      console.error('[SYNC_CORE] ❌ Revenue Engine error:', error);
      return { total: 0, today: 0, externalHistory: 0 };  // ✅ ADICIONADO: Retorno padrão
    }
  }, [getLuandaDate]);

  // 💸 EXPENSE ENGINE - Categorização automática de despesas (expenses + cash_flow)
  const calculateExpenses = useCallback(async (): Promise<{
    total: number;
    today: number;
    todayCount: number;       // 🔥 ADICIONADO: Contagem de despesas de hoje
    categories: ExpenseCategory;
  }> => {
    try {
      console.log('[SYNC_CORE] 🔄 Iniciando Expense Engine...');
      
      // 📊 Buscar expenses tradicionais
      console.log('[SYNC_CORE] 📊 Buscando expenses...');
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount_kz, category, description, created_at');
      
      if (expensesError) {
        console.error('[SYNC_CORE] ❌ Erro ao buscar expenses:', expensesError);
      } else {
        console.log('[SYNC_CORE] ✅ Expenses encontrados:', expensesData?.length || 0);
      }
      
      // 💰 Buscar cash_flow do tipo 'saida'
      console.log('[SYNC_CORE] 💰 Buscando cash_flow (saídas)...');
      const { data: cashFlowData, error: cashFlowError } = await supabase
        .from('cash_flow')
        .select('amount, category, description, created_at')
        .eq('type', 'saida');
      
      if (cashFlowError) {
        console.error('[SYNC_CORE] ❌ Erro ao buscar cash_flow:', cashFlowError);
      } else {
        console.log('[SYNC_CORE] ✅ Cash flow saídas encontradas:', cashFlowData?.length || 0);
      }
      
      const categories: ExpenseCategory = {
        staff: 0,
        operational: 0,
        maintenance: 0,
        supplies: 0,
        other: 0
      };
      
      let totalExpenses = 0;
      let todayExpenses = 0;
      let todayExpensesCount = 0;  // 🔥 ADICIONADO: Contagem de despesas de hoje
      
      // 🔄 Processar expenses tradicionais
      if (!expensesError && expensesData && Array.isArray(expensesData)) {
        console.log('[SYNC_CORE] 🔄 Processando', expensesData.length, 'expenses...');
        totalExpenses += expensesData.reduce((acc, expense) => {
          const amount = Number(expense.amount_kz || 0);
          const category = (expense.category || '').toLowerCase();
          const description = (expense.description || '').toLowerCase();
          
          // 🤖 Categorização automática baseada em palavras-chave
          if (category.includes('staff') || category.includes('salario') || 
              description.includes('salario') || description.includes('ordenado') ||
              description.includes('staff') || description.includes('funcionario')) {
            categories.staff += amount;
          } else if (category.includes('operacional') || category.includes('operação') ||
                     description.includes('aluguel') || description.includes('agua') ||
                     description.includes('luz') || description.includes('internet')) {
            categories.operational += amount;
          } else if (category.includes('manutenção') || category.includes('repair') ||
                     description.includes('manuten') || description.includes('conserto')) {
            categories.maintenance += amount;
          } else if (category.includes('suprimento') || category.includes('supply') ||
                     description.includes('compra') || description.includes('material')) {
            categories.supplies += amount;
          } else {
            categories.other += amount;
          }
          
          return acc + amount;
        }, 0);
        
        // 📅 Calcular despesas de hoje (expenses)
        const hojeUTC = new Date().toISOString().split('T')[0]; // 🔥 CORREÇÃO: Usar UTC diretamente
        
        if (expensesData && Array.isArray(expensesData)) {
          todayExpenses += expensesData.reduce((acc, expense) => {
            const expenseDate = new Date(expense.created_at || '').toISOString().split('T')[0];
            if (expenseDate === hojeUTC) {
              todayExpensesCount++; // 🔥 ADICIONADO: Contar despesa de hoje
              return acc + Number(expense.amount_kz || 0);
            }
            return acc;
          }, 0);
        }
      } else {
        console.log('[SYNC_CORE] ℹ️ Nenhum expense encontrado ou erro na busca');
      }
      
      // 💰 Processar cash_flow do tipo 'saida'
      if (!cashFlowError && cashFlowData && Array.isArray(cashFlowData)) {
        console.log('[SYNC_CORE] 💰 Processando', cashFlowData.length, 'cash_flow saídas...');
        totalExpenses += cashFlowData.reduce((acc, cashFlow) => {
          const amount = Number(cashFlow.amount || 0);
          const category = (cashFlow.category || '').toLowerCase();
          const description = (cashFlow.description || '').toLowerCase();
          
          // 🤖 Categorização automática para cash_flow
          if (category.includes('staff') || category.includes('salario') || 
              description.includes('salario') || description.includes('ordenado') ||
              description.includes('staff') || description.includes('funcionario')) {
            categories.staff += amount;
          } else if (category.includes('operacional') || category.includes('operação') ||
                     description.includes('aluguel') || description.includes('agua') ||
                     description.includes('luz') || description.includes('internet')) {
            categories.operational += amount;
          } else if (category.includes('manutenção') || category.includes('repair') ||
                     description.includes('manuten') || description.includes('conserto')) {
            categories.maintenance += amount;
          } else if (category.includes('suprimento') || category.includes('supply') ||
                     description.includes('compra') || description.includes('material')) {
            categories.supplies += amount;
          } else {
            categories.other += amount;
          }
          
          return acc + amount;
        }, 0);
        
        // 📅 Calcular despesas de hoje (cash_flow)
        const hojeUTC = new Date().toISOString().split('T')[0]; // 🔥 CORREÇÃO: Usar UTC diretamente
        
        todayExpenses += cashFlowData.reduce((acc, cashFlow) => {
          const cashFlowDate = new Date(cashFlow.created_at || '').toISOString().split('T')[0];
          if (cashFlowDate === hojeUTC) {
            todayExpensesCount++; // 🔥 ADICIONADO: Contar cash flow de hoje
            return acc + Number(cashFlow.amount || 0);
          }
          return acc;
        }, 0);
      } else {
        console.log('[SYNC_CORE] ℹ️ Nenhum cash_flow saída encontrado ou erro na busca');
      }
      
      return {
        total: totalExpenses,
        today: todayExpenses,
        todayCount: todayExpensesCount, // 🔥 ADICIONADO: Retornar contagem
        categories
      };
      
    } catch (error) {
      // Tratamento específico para Erro 400 e outros erros
      if (error && typeof error === 'object' && 'status' in error) {
        const errorStatus = (error as any).status;
        if (errorStatus === 400) {
          console.error('[SYNC_CORE] ❌ Erro 400 - Bad Request em Expenses:', error);
        }
      }
      console.error('[SYNC_CORE] ❌ Expense Engine error:', error);
      return { 
        total: 0, 
        today: 0,
        todayCount: 0, // 🔥 ADICIONADO: Retorno padrão
        categories: { staff: 0, operational: 0, maintenance: 0, supplies: 0, other: 0 }
      };
    }
  }, []);

  // 👥 STAFF ENGINE - Cálculo da folha salarial e contagem
  const calculateStaffCosts = useCallback(async (): Promise<{ costs: number; count: number }> => {
    try {
      console.log('[SYNC_CORE] 👥 Iniciando Staff Engine...');
      console.log('[SYNC_CORE] 📡 Conectando ao Supabase...');
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, full_name, role, base_salary_kz, phone, status, created_at, subsidios, bonus, horas_extras, descontos, salario_base'); // ✅ PRISMA: Campos exatos
      
      let totalStaffCosts = 0;
      
      if (!staffError && staffData) {
        console.log('[SYNC_CORE] 📊 Staff encontrado:', staffData.length, 'funcionários');
        console.log('[SYNC_CORE] 📋 Detalhes do staff (PRISMA):', staffData.map(s => ({ 
          id: s.id, 
          full_name: s.full_name,
          role: s.role,
          base_salary_kz: s.base_salary_kz,
          salario_base: s.salario_base,
          status: s.status,
          subsidios: s.subsidios,
          bonus: s.bonus,
          horas_extras: s.horas_extras,
          descontos: s.descontos
        })));
        
        totalStaffCosts = staffData.reduce((acc, staff) => {
          // Apenas considerar staff ativo (PRISMA: status default "active")
          console.log('[SYNC_CORE] 🔍 Verificando staff (PRISMA):', {
            id: staff.id,
            full_name: staff.full_name,
            status: staff.status,
            statusLower: staff.status ? staff.status.toLowerCase() : 'undefined'
          });
          
          // 🔥 CORREÇÃO: Aceitar múltiplos status para staff ativo
          const isActiveStaff = staff.status && (
            staff.status.toLowerCase() === 'active' || 
            staff.status.toLowerCase() === 'ativo' ||
            staff.status.toLowerCase() === 'ATIVO'
          );
          
          if (!isActiveStaff) {
            console.log('[SYNC_CORE] ⏭️ Pulando staff não ativo:', staff.full_name, 'status:', staff.status);
            return acc;
          }
          
          // ✅ PRISMA: Usar campos exatos do schema
          const baseSalary = Number(staff.base_salary_kz) || Number(staff.salario_base) || 0;
          const subsidios = Number(staff.subsidios) || 0;
          const bonus = Number(staff.bonus) || 0;
          const horasExtras = Number(staff.horas_extras) || 0;
          const descontos = Number(staff.descontos) || 0;
          
          // Cálculo completo do salário
          const salaryTotal = baseSalary + subsidios + bonus + horasExtras - descontos;
          
          console.log('[SYNC_CORE] 💰 Cálculo detalhado (PRISMA):', {
            full_name: staff.full_name,
            baseSalary,
            subsidios,
            bonus,
            horasExtras,
            descontos,
            salaryTotal,
            acumuladoAnterior: acc,
            novoTotal: acc + salaryTotal
          });
          
          return acc + salaryTotal;
        }, 0);
        
        console.log('[SYNC_CORE] ✅ Cálculo staff final (PRISMA):', {
          totalCosts: totalStaffCosts,
          staffCount: staffData.length,
          averagePerStaff: staffData.length > 0 ? totalStaffCosts / staffData.length : 0
        });
        
        // Retornar tanto os custos quanto a contagem
        return {
          costs: totalStaffCosts,
          count: staffData.length
        };
      } else {
        console.log('[SYNC_CORE] ❌ Erro ao buscar staff:', staffError);
        return {
          costs: 0,
          count: 0
        };
      }
      
    } catch (error) {
      // Tratamento específico para Erro 400 e outros erros
      if (error && typeof error === 'object' && 'status' in error) {
        const errorStatus = (error as any).status;
        if (errorStatus === 400) {
          console.error('[SYNC_CORE] ❌ Erro 400 - Bad Request em Staff:', error);
        }
      }
      console.error('[SYNC_CORE] ❌ Staff Engine error:', error);
      return {
        costs: 0,
        count: 0
      };
    }
  }, []);

  // 🍽️ TOP MARGINS ENGINE - Cálculo de produtos mais rentáveis
  const calculateTopMargins = useCallback(async (): Promise<TopMarginProduct[]> => {
    try {
      console.log('[SYNC_CORE] 🍽️ Iniciando Top Margins Engine...');
      
      // Buscar orders com items detalhados e menu
      const [ordersResult, menuResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, items, status')
          .in('status', ['closed', 'FECHADO', 'paid', 'PAGO', 'completed', 'delivered']),
        supabase
          .from('menu')
          .select('id, name, price, cost_price')
      ]);
      
      const orders = ordersResult.data || [];
      const menu = menuResult.data || [];
      
      console.log('[SYNC_CORE] 🍽️ Dados carregados:', {
        ordersCount: orders.length,
        menuCount: menu.length
      });
      
      const productProfit: Record<string, { name: string, profit: number, qty: number }> = {};
      
      orders.forEach(order => {
        // Parse items se for string
        let items = order.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch (e) {
            items = [];
          }
        }
        
        if (!Array.isArray(items)) return;
        
        items.forEach((item: any) => {
          const dishId = item?.dishId || item?.dish_id;
          const quantity = item?.quantity || item?.quantidade || 0;
          
          if (!dishId) return;
          
          const dish = menu.find(m => m.id === dishId);
          if (!dish) return;
          
          if (!productProfit[dishId]) {
            productProfit[dishId] = { name: dish.name || 'Desconhecido', profit: 0, qty: 0 };
          }
          
          const price = Number(dish.price) || 0;
          const costPrice = Number(dish.cost_price) || 0;
          const itemProfit = (price - costPrice) * quantity;
          
          productProfit[dishId].profit += itemProfit;
          productProfit[dishId].qty += quantity;
        });
      });
      
      const topProducts = Object.values(productProfit)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);
      
      console.log('[SYNC_CORE] 🍽️ Top Margins calculado:', topProducts);
      return topProducts;
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Top Margins Engine error:', error);
      return [];
    }
  }, []);

  // 🔄 RECÁLCULO COMPLETO
  const recalculateAll = useCallback(async () => {
    console.log('[SYNC_CORE] 🔄 Iniciando recalculateAll...');
    console.log('[SYNC_CORE] 🔄 Stack trace:', new Error().stack);
    setSyncData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('[SYNC_CORE] 🚀 Executando engines em paralelo...');
      // Executar todos os engines em paralelo
      const [revenueResult, expensesResult, staffResult, topMarginsResult] = await Promise.all([
        calculateRevenue(),
        calculateExpenses(),
        calculateStaffCosts(),
        calculateTopMargins()
      ]);
      
      console.log('[SYNC_CORE] ✅ Engines executados:', {
        revenueResult,
        expensesResult,
        staffResult
      });
      
      // 🚀 Cálculo final do net profit
      const netProfit = revenueResult.total - expensesResult.total - staffResult.costs;
      
      // Atualizar estado final
      const finalSyncData: SyncData = {
        totalRevenue: revenueResult.total,
        todayRevenue: revenueResult.today,
        totalExpenses: expensesResult.total,
        todayExpenses: expensesResult.today,
        todayExpensesCount: expensesResult.todayCount, // 🔥 ADICIONADO: Contagem de despesas de hoje
        staffCosts: staffResult.costs,
        staffCount: staffResult.count,  // ✅ ADICIONADO: Contagem de funcionários
        netProfit,
        externalHistory: revenueResult.externalHistory,  // ✅ ADICIONADO: Valor do external_history
        topMarginProducts: topMarginsResult,  // 🔥 ADICIONADO: Top produtos por margem
        lastUpdate: new Date().toISOString(),
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
        // 🧠 INTELIGÊNCIA E ALERTAS
        alerts: [],
        predictions: {
          monthlyForecast: 0,
          dailyAverage: 0,
          projectedMonthEnd: 0,
          marginTrend: 'stable'
        }
      };
      
      setSyncData(finalSyncData);
      
      // 🔄 Atualizar WINDOWS_SYNC se disponível
      if (typeof window !== 'undefined') {
        (window as any).WINDOWS_SYNC = {
          faturacaoHoje: revenueResult.today,
          totalRevenue: revenueResult.total,
          despesasTotais: expensesResult.total,
          folhaSalarial: staffResult.costs,
          lucroLiquido: netProfit,
          timestamp: new Date().toISOString(),
          source: 'SYNC_CORE_PURE'
        };
      }
      
    } catch (error) {
      console.error('[SYNC_CORE] ❌ Erro no recálculo completo:', error);
      setSyncData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, [calculateRevenue, calculateExpenses, calculateStaffCosts, calculateTopMargins]);

  // 🔄 CONFIGURAR SUBSCRIPTIONS REALTIME
  const setupRealtimeSubscriptions = useCallback(() => {
    
    // Orders subscription
    const ordersSubscription = supabase
      .channel('sync-core-orders')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[SYNC_CORE] 📊 Orders mudou - recalculando...', payload);
          recalculateAll();
        }
      )
      .subscribe();

    // Expenses subscription
    const expensesSubscription = supabase
      .channel('sync-core-expenses')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          console.log('[SYNC_CORE] 💸 Expenses mudou - recalculando...', payload);
          console.log('[SYNC_CORE] 💸 Chamando recalculateAll()...');
          recalculateAll();
        }
      )
      .subscribe();

    // Staff subscription
    const staffSubscription = supabase
      .channel('sync-core-staff')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        (payload) => {
          console.log('[SYNC_CORE] 👥 Staff mudou - recalculando...', payload);
          recalculateAll();
        }
      )
      .subscribe();

    // Cash Flow subscription (saídas)
    const cashFlowSubscription = supabase
      .channel('sync-core-cash-flow')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cash_flow' },
        (payload) => {
          console.log('[SYNC_CORE] 💰 Cash Flow mudou - recalculando...', payload);
          recalculateAll();
        }
      )
      .subscribe();

    // Salvar referências
    subscriptionsRef.current = {
      orders: ordersSubscription,
      expenses: expensesSubscription,
      staff: staffSubscription,
      cashFlow: cashFlowSubscription
    };
  }, [recalculateAll]);

  // 🔥 DEBOUNCE SYNC IMPLEMENTATION
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<any[]>([]);
  
  const debouncedRecalculate = useCallback(() => {
    // Adicionar operação à fila
    pendingOperationsRef.current.push({ timestamp: Date.now() });
    
    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Configurar novo timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('[SYNC_CORE] 🔄 Debounce Sync - Processando lote de operações:', {
        operations: pendingOperationsRef.current.length,
        delay: DEBOUNCE_DELAY
      });
      
      // Processar operações em lote
      pendingOperationsRef.current = [];
      recalculateAll();
    }, DEBOUNCE_DELAY);
  }, [recalculateAll]);
  
  // 🧹 LIMPAR SUBSCRIPTIONS
  const cleanupSubscriptions = useCallback(() => {
    
    const { orders, expenses, staff, cashFlow } = subscriptionsRef.current;
    
    if (orders) supabase.removeChannel(orders);
    if (expenses) supabase.removeChannel(expenses);
    if (staff) supabase.removeChannel(staff);
    if (cashFlow) supabase.removeChannel(cashFlow);
    
    subscriptionsRef.current = { orders: null, expenses: null, staff: null, cashFlow: null };
  }, []);

  // 🚀 INICIALIZAÇÃO
  useEffect(() => {
    
    // Buscar dados iniciais
    recalculateAll();
    
    // Configurar realtime
    setupRealtimeSubscriptions();
    
    // 🔥 ADICIONADO: Polling de 5 segundos como fallback para garantir sincronização
    const pollingInterval = setInterval(() => {
      console.log('[SYNC_CORE] 🔄 Polling automático - verificando atualizações...');
      recalculateAll();
    }, 5000); // 5 segundos
    
    // Cleanup
    return () => {
      cleanupSubscriptions();
      clearInterval(pollingInterval); // 🔥 Limpar polling ao desmontar
    };
  }, [recalculateAll, setupRealtimeSubscriptions, cleanupSubscriptions]);

  // 🔄 EXPORTAR DADOS E FUNÇÕES
  console.log('[SYNC_CORE] 📊 RETORNO DO MOTOR:', {
    staffCosts: syncData.staffCosts,
    staffCount: syncData.staffCount,
    totalRevenue: syncData.totalRevenue,
    todayRevenue: syncData.todayRevenue
  });
  
  return {
    // Estado completo
    syncData,
    
    // Funções de controle
    recalculate: recalculateAll,
    
    // Valores individuais (conveniência)
    totalRevenue: syncData.totalRevenue,
    todayRevenue: syncData.todayRevenue,
    totalExpenses: syncData.totalExpenses,
    todayExpenses: syncData.todayExpenses,
    todayExpensesCount: syncData.todayExpensesCount, // 🔥 ADICIONADO: Contagem de despesas de hoje
    externalHistory: syncData.externalHistory, // 🔥 ADICIONADO: Histórico externo
    staffCosts: syncData.staffCosts,
    staffCount: syncData.staffCount,  // ✅ ADICIONADO: Contagem de funcionários
    netProfit: syncData.netProfit,
    
    topMarginProducts: syncData.topMarginProducts,  // 🔥 ADICIONADO: Top produtos por margem
    
    // Status
    isLoading: syncData.isLoading,
    error: syncData.error,
    
    // 🧠 INTELIGÊNCIA E ALERTAS
    alerts: syncData.alerts,
    predictions: syncData.predictions,
    
    // Funções específicas dos engines
    calculateRevenue,
    calculateExpenses,
    calculateStaffCosts
  };
};

// 🎯 EXPORTAR TIPOS
export type { SyncData, ExpenseCategory, TopMarginProduct };
