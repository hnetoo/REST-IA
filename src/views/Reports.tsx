import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Package, DollarSign, UserCheck, Activity, Target, Clock, BarChart3, FileDown, CreditCard, PieChart, TrendingUp, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSyncCore } from '../hooks/useSyncCore';
import { supabase } from '../supabase_standalone';

const Reports = () => {
  const { addNotification, menu } = useStore();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // 🚀 CONECTAR AO MOTOR SYNC CORE
  const {
    totalRevenue,
    totalExpenses,
    staffCosts,
    netProfit,
    alerts,
    predictions,
    isLoading: syncLoading
  } = useSyncCore();

  // Estados para os relatórios
  const [vendasPorArtigo, setVendasPorArtigo] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [financasDetalhadas, setFinancasDetalhadas] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [rhEFaltas, setRhEFaltas] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [mapaDespesas, setMapaDespesas] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [topRentabilidade, setTopRentabilidade] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [fluxoPorTurno, setFluxoPorTurno] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  
  // 🆕 NOVOS RELATÓRIOS
  const [vendasPorMesa, setVendasPorMesa] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [metodosPagamento, setMetodosPagamento] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [horarioPico, setHorarioPico] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [desempenhoCategoria, setDesempenhoCategoria] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });

  const formatKz = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  const savePDF = (doc: jsPDF, filename: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        doc.save(filename);
        addNotification('success', `PDF salvo: ${filename}`);
      } else {
        doc.save(filename);
        addNotification('success', `PDF baixado: ${filename}`);
      }
    } catch (error) {
      console.error('[PDF] Erro ao salvar:', error);
      addNotification('error', 'Erro ao salvar PDF');
    }
  };

  // Funções para buscar dados
  const fetchVendasPorArtigo = async () => {
    setVendasPorArtigo({ ...vendasPorArtigo, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando vendas por artigo do Supabase...');
      
      // Buscar order_items do Supabase
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price');
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar order_items:', error);
        setVendasPorArtigo({ data: [], loading: false });
        return;
      }
      
      if (!orderItems || orderItems.length === 0) {
        console.log('[RELATÓRIO] Nenhum order_item encontrado');
        setVendasPorArtigo({ data: [], loading: false });
        return;
      }
      
      console.log('[RELATÓRIO] Order items encontrados:', orderItems.length);
      
      // Agrupar por produto
      const productSales: Record<string, { produto: string, quantidade: number, total: number }> = {};
      
      orderItems.forEach((item: any) => {
        const productId = item.product_id;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const total = quantity * unitPrice;
        
        // Buscar nome do produto do menu
        const dish = menu.find(m => m.id === productId);
        const productName = dish?.name || `Produto ${productId?.substring(0, 8) || 'Desconhecido'}`;
        
        if (!productSales[productId]) {
          productSales[productId] = {
            produto: productName,
            quantidade: 0,
            total: 0
          };
        }
        
        productSales[productId].quantidade += quantity;
        productSales[productId].total += total;
      });
      
      const result = Object.values(productSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10); // Top 10 produtos
      
      console.log('[RELATÓRIO] Vendas por artigo calculadas:', result);
      setVendasPorArtigo({ data: result, loading: false });
      
    } catch (error) {
      console.error('[RELATÓRIO] Erro ao buscar vendas por artigo:', error);
      setVendasPorArtigo({ data: [], loading: false });
    }
  };

  const fetchFinancasDetalhadas = async () => {
    setFinancasDetalhadas({ ...financasDetalhadas, loading: true });
    try {
      // 🚀 USAR DADOS DO MOTOR SYNC CORE
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulação de carregamento
      
      // Dados reais do motor sync
      const financialData = [{
        receita: totalRevenue,
        despesas: totalExpenses,
        lucro: netProfit,
        custosStaff: staffCosts,
        margem: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0
      }];
      
      setFinancasDetalhadas({ data: financialData, loading: false });
    } catch (error) {
      console.error(error);
      setFinancasDetalhadas({ data: [], loading: false });
    }
  };

  const fetchRhEFaltas = async () => {
    setRhEFaltas({ ...rhEFaltas, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando dados de RH do Supabase...');
      
      // Buscar funcionários do Supabase
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('id, full_name, base_salary_kz, role, is_active');
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar staff:', error);
        setRhEFaltas({ data: [], loading: false });
        return;
      }
      
      if (!staffData || staffData.length === 0) {
        console.log('[RELATÓRIO] Nenhum funcionário encontrado');
        setRhEFaltas({ data: [], loading: false });
        return;
      }
      
      console.log('[RELATÓRIO] Funcionários encontrados:', staffData.length);
      
      // Buscar faltas do mês (tabela attendance)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('staff_id, status, date')
        .gte('date', startOfMonth.toISOString())
        .eq('status', 'absent');
      
      if (attendanceError) {
        console.log('[RELATÓRIO] Erro ao buscar faltas:', attendanceError);
      }
      
      // Contar faltas por funcionário
      const faltasPorFuncionario: Record<string, number> = {};
      if (attendanceData) {
        attendanceData.forEach((record: any) => {
          const staffId = record.staff_id;
          faltasPorFuncionario[staffId] = (faltasPorFuncionario[staffId] || 0) + 1;
        });
      }
      
      // Calcular descontos (salário/30 * faltas)
      const result = staffData
        .filter((staff: any) => staff.is_active !== false) // Apenas ativos
        .map((staff: any) => {
          const salary = Number(staff.base_salary_kz || 0);
          const faltas = faltasPorFuncionario[staff.id] || 0;
          const desconto = faltas > 0 ? (salary / 30) * faltas : 0;
          
          return {
            funcionario: staff.full_name || 'Funcionário',
            cargo: staff.role || 'N/A',
            salario: salary,
            faltas: faltas,
            desconto: Math.round(desconto)
          };
        })
        .sort((a, b) => b.desconto - a.desconto);
      
      console.log('[RELATÓRIO] RH e Faltas calculado:', result);
      setRhEFaltas({ data: result, loading: false });
      
    } catch (error) {
      console.error('[RELATÓRIO] Erro ao buscar RH:', error);
      setRhEFaltas({ data: [], loading: false });
    }
  };

  const fetchMapaDespesas = async () => {
    setMapaDespesas({ ...mapaDespesas, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando mapa de despesas do Supabase...');
      
      // Buscar despesas do Supabase
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('category, amount_kz');
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar despesas:', error);
        setMapaDespesas({ data: [], loading: false });
        return;
      }
      
      if (!expenses || expenses.length === 0) {
        console.log('[RELATÓRIO] Nenhuma despesa encontrada');
        setMapaDespesas({ data: [], loading: false });
        return;
      }
      
      console.log('[RELATÓRIO] Despesas encontradas:', expenses.length);
      
      // Agrupar por categoria
      const categoryTotals: Record<string, number> = {};
      
      expenses.forEach((expense: any) => {
        const category = expense.category || 'Outros';
        const amount = Number(expense.amount_kz || 0);
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += amount;
      });
      
      const result = Object.entries(categoryTotals)
        .map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor);
      
      console.log('[RELATÓRIO] Mapa de despesas calculado:', result);
      setMapaDespesas({ data: result, loading: false });
      
    } catch (error) {
      console.error('[RELATÓRIO] Erro ao buscar mapa de despesas:', error);
      setMapaDespesas({ data: [], loading: false });
    }
  };

  const fetchTopRentabilidade = async () => {
    setTopRentabilidade({ ...topRentabilidade, loading: true });
    try {
      console.log('[RELATÓRIO] Calculando top rentabilidade...');
      
      // Buscar order_items do Supabase
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price');
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar order_items:', error);
        setTopRentabilidade({ data: [], loading: false });
        return;
      }
      
      if (!orderItems || orderItems.length === 0) {
        console.log('[RELATÓRIO] Nenhum order_item encontrado');
        setTopRentabilidade({ data: [], loading: false });
        return;
      }
      
      // Calcular rentabilidade por produto
      const productStats: Record<string, { 
        produto: string, 
        receita: number, 
        quantidade: number,
        custo: number 
      }> = {};
      
      orderItems.forEach((item: any) => {
        const productId = item.product_id;
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const revenue = quantity * unitPrice;
        
        // Buscar produto no menu para obter custo
        const dish = menu.find(m => m.id === productId);
        const productName = dish?.name || `Produto ${productId?.substring(0, 8) || 'Desconhecido'}`;
        // Estimar custo como 40% do preço (markup típico de restaurante)
        const estimatedCost = unitPrice * 0.4;
        
        if (!productStats[productId]) {
          productStats[productId] = {
            produto: productName,
            receita: 0,
            quantidade: 0,
            custo: 0
          };
        }
        
        productStats[productId].receita += revenue;
        productStats[productId].quantidade += quantity;
        productStats[productId].custo += estimatedCost * quantity;
      });
      
      // Calcular margem para cada produto
      const result = Object.values(productStats)
        .map((stats: any) => {
          const lucro = stats.receita - stats.custo;
          const margem = stats.receita > 0 ? ((lucro / stats.receita) * 100) : 0;
          
          return {
            produto: stats.produto,
            margem: Math.round(margem),
            lucro: Math.round(lucro),
            receita: Math.round(stats.receita)
          };
        })
        .sort((a, b) => b.margem - a.margem)
        .slice(0, 10); // Top 10
      
      console.log('[RELATÓRIO] Top rentabilidade calculada:', result);
      setTopRentabilidade({ data: result, loading: false });
      
    } catch (error) {
      console.error('[RELATÓRIO] Erro ao calcular rentabilidade:', error);
      setTopRentabilidade({ data: [], loading: false });
    }
  };

  const fetchFluxoPorTurno = async () => {
    setFluxoPorTurno({ ...fluxoPorTurno, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando fluxo por turno...');
      
      // Buscar orders do Supabase com created_at
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar orders:', error);
        setFluxoPorTurno({ data: [], loading: false });
        return;
      }
      
      if (!orders || orders.length === 0) {
        console.log('[RELATÓRIO] Nenhuma order encontrada');
        setFluxoPorTurno({ data: [], loading: false });
        return;
      }
      
      // Definir turnos (horário de Angola - UTC+1)
      // Manhã: 06:00 - 12:00
      // Tarde: 12:00 - 18:00
      // Noite: 18:00 - 23:00
      const turnos = {
        'Manhã': { start: 6, end: 12, total: 0 },
        'Tarde': { start: 12, end: 18, total: 0 },
        'Noite': { start: 18, end: 23, total: 0 }
      };
      
      orders.forEach((order: any) => {
        const date = new Date(order.created_at);
        const hour = date.getHours();
        const amount = Number(order.total_amount || 0);
        
        if (hour >= 6 && hour < 12) {
          turnos['Manhã'].total += amount;
        } else if (hour >= 12 && hour < 18) {
          turnos['Tarde'].total += amount;
        } else if (hour >= 18 && hour < 23) {
          turnos['Noite'].total += amount;
        }
      });
      
      const result = Object.entries(turnos)
        .map(([turno, data]) => ({
          turno,
          total: data.total,
          pedidos: orders.filter((o: any) => {
            const hour = new Date(o.created_at).getHours();
            return hour >= data.start && hour < data.end;
          }).length
        }))
        .filter(t => t.total > 0)
        .sort((a, b) => b.total - a.total);
      
      console.log('[RELATÓRIO] Fluxo por turno calculado:', result);
      setFluxoPorTurno({ data: result, loading: false });
      
    } catch (error) {
      console.error('[RELATÓRIO] Erro ao buscar fluxo por turno:', error);
      setFluxoPorTurno({ data: [], loading: false });
    }
  };

  // 🆕 NOVOS RELATÓRIOS - FETCH FUNCTIONS

  const fetchVendasPorMesa = async () => {
    setVendasPorMesa({ ...vendasPorMesa, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando vendas por mesa...');
      
      // Buscar pedidos dos últimos 30 dias sem filtro de data restritivo
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('table_id, total_amount, status, created_at')
        .in('status', ['closed', 'paid', 'finalized'])
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (error) {
        console.error('[RELATÓRIO] Erro ao buscar orders:', error);
        setVendasPorMesa({ data: [], loading: false });
        return [];
      }
      
      console.log('[RELATÓRIO] Pedidos encontrados:', orders?.length || 0);
      
      if (!orders || orders.length === 0) {
        setVendasPorMesa({ data: [{ mesa: 'Nenhuma venda nos últimos 30 dias', total: 0, pedidos: 0 }], loading: false });
        return [];
      }
      
      // Agrupar por mesa
      const mesaSales: Record<string, { mesa: string, total: number, pedidos: number }> = {};
      
      orders.forEach((order: any) => {
        // Ignorar pedidos sem mesa definida
        if (!order.table_id || order.table_id === 'null' || order.table_id === '') {
          return;
        }
        
        const mesaId = order.table_id;
        const mesaName = mesaId.startsWith('Mesa') ? mesaId : `Mesa ${mesaId}`;
        
        if (!mesaSales[mesaId]) {
          mesaSales[mesaId] = { mesa: mesaName, total: 0, pedidos: 0 };
        }
        mesaSales[mesaId].total += Number(order.total_amount || 0);
        mesaSales[mesaId].pedidos += 1;
      });
      
      const result = Object.values(mesaSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      // Se não houver mesas com dados, mostrar mensagem
      if (result.length === 0) {
        setVendasPorMesa({ data: [{ mesa: 'Nenhuma mesa com vendas', total: 0, pedidos: 0 }], loading: false });
        return [];
      }
      
      setVendasPorMesa({ data: result, loading: false });
      return result;
    } catch (error) {
      console.error('[RELATÓRIO] Erro:', error);
      setVendasPorMesa({ data: [], loading: false });
      return [];
    }
  };

  const fetchMetodosPagamento = async () => {
    setMetodosPagamento({ ...metodosPagamento, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando métodos de pagamento...');
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('payment_method, total_amount')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (error) {
        console.error('[RELATÓRIO] Erro:', error);
        setMetodosPagamento({ data: [], loading: false });
        return;
      }
      
      // Agrupar por método
      const metodos: Record<string, { metodo: string, total: number, transacoes: number }> = {};
      
      orders?.forEach((order: any) => {
        const metodo = order.payment_method || 'N/A';
        if (!metodos[metodo]) {
          metodos[metodo] = { metodo, total: 0, transacoes: 0 };
        }
        metodos[metodo].total += Number(order.total_amount || 0);
        metodos[metodo].transacoes += 1;
      });
      
      const result = Object.values(metodos).sort((a, b) => b.total - a.total);
      setMetodosPagamento({ data: result, loading: false });
    } catch (error) {
      console.error('[RELATÓRIO] Erro:', error);
      setMetodosPagamento({ data: [], loading: false });
    }
  };

  const fetchHorarioPico = async () => {
    setHorarioPico({ ...horarioPico, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando horário de pico...');
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (error) {
        console.error('[RELATÓRIO] Erro:', error);
        setHorarioPico({ data: [], loading: false });
        return;
      }
      
      // Agrupar por hora
      const horas: Record<number, { hora: string, total: number, pedidos: number }> = {};
      
      for (let i = 6; i < 24; i++) {
        horas[i] = { hora: `${i.toString().padStart(2, '0')}h`, total: 0, pedidos: 0 };
      }
      
      orders?.forEach((order: any) => {
        const hour = new Date(order.created_at).getHours();
        if (hour >= 6 && hour < 24) {
          horas[hour].total += Number(order.total_amount || 0);
          horas[hour].pedidos += 1;
        }
      });
      
      const result = Object.values(horas).filter(h => h.total > 0).sort((a, b) => b.total - a.total);
      setHorarioPico({ data: result, loading: false });
    } catch (error) {
      console.error('[RELATÓRIO] Erro:', error);
      setHorarioPico({ data: [], loading: false });
    }
  };

  const fetchDesempenhoCategoria = async () => {
    setDesempenhoCategoria({ ...desempenhoCategoria, loading: true });
    try {
      console.log('[RELATÓRIO] Buscando desempenho por categoria...');
      
      // Buscar order_items dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (itemsError) {
        console.error('[RELATÓRIO] Erro ao buscar order_items:', itemsError);
        setDesempenhoCategoria({ data: [{ categoria: 'Erro ao buscar dados', total: 0, itens: 0 }], loading: false });
        return;
      }
      
      console.log('[RELATÓRIO] Order items encontrados:', orderItems?.length || 0);
      
      // Buscar todos os produtos do menu para mapear categorias
      const { data: menuProducts, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, category');
      
      if (menuError) {
        console.error('[RELATÓRIO] Erro ao buscar menu_items:', menuError);
      }
      
      // Criar mapa de produtos por ID (usar menu local + Supabase)
      const productMap = new Map();
      
      // Primeiro adicionar do menu local (Zustand)
      menu.forEach((item: any) => {
        productMap.set(item.id, item);
      });
      
      // Depois adicionar/atualizar do Supabase
      menuProducts?.forEach((item: any) => {
        productMap.set(item.id, item);
      });
      
      // Agrupar por categoria
      const categorias: Record<string, { categoria: string, total: number, itens: number }> = {};
      let categorizados = 0;
      let naoCategorizados = 0;
      
      orderItems?.forEach((item: any) => {
        const product = productMap.get(item.product_id);
        const categoria = product?.category || product?.category_name || null;
        
        if (!categoria) {
          naoCategorizados++;
          return; // Ignorar itens sem categoria
        }
        
        categorizados++;
        
        if (!categorias[categoria]) {
          categorias[categoria] = { categoria, total: 0, itens: 0 };
        }
        categorias[categoria].total += Number(item.unit_price || 0) * Number(item.quantity || 0);
        categorias[categoria].itens += Number(item.quantity || 0);
      });
      
      console.log(`[RELATÓRIO] Categorias: ${categorizados} itens categorizados, ${naoCategorizados} sem categoria`);
      
      const result = Object.values(categorias).sort((a, b) => b.total - a.total);
      
      if (result.length === 0) {
        setDesempenhoCategoria({ data: [{ categoria: 'Nenhuma categoria encontrada', total: 0, itens: 0 }], loading: false });
        return;
      }
      
      setDesempenhoCategoria({ data: result, loading: false });
    } catch (error) {
      console.error('[RELATÓRIO] Erro:', error);
      setDesempenhoCategoria({ data: [], loading: false });
    }
  };

  // Funções para gerar PDFs
  const generateVendasPorArtigoPDF = async () => {
    setPdfLoading('vendas');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Vendas por Artigo', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = vendasPorArtigo.data.map((item: any) => [
        item.produto || 'Produto',
        item.quantidade || 0,
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Quantidade', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'vendas-por-artigo.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateFinancasDetalhadasPDF = async () => {
    setPdfLoading('financas');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Finanças Detalhadas', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = financasDetalhadas.data.map((item: any) => [
        'Receita',
        formatKz(item.receita || 0),
        'Despesas',
        formatKz(item.despesas || 0),
        'Lucro',
        formatKz(item.lucro || 0)
      ]);
      
      autoTable(doc, {
        head: [['Tipo', 'Valor']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'financas-detalhadas.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateRhEFaltasPDF = async () => {
    setPdfLoading('rh');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - RH e Faltas', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = rhEFaltas.data.map((item: any) => [
        item.funcionario || 'Funcionário',
        item.faltas || 0,
        formatKz(item.desconto || 0)
      ]);
      
      autoTable(doc, {
        head: [['Funcionário', 'Faltas', 'Desconto']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'rh-e-faltas.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateMapaDespesasPDF = async () => {
    setPdfLoading('despesas');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Mapa de Despesas', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = mapaDespesas.data.map((item: any) => [
        item.categoria || 'Categoria',
        formatKz(item.valor || 0)
      ]);
      
      autoTable(doc, {
        head: [['Categoria', 'Valor']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'mapa-despesas.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateTopRentabilidadePDF = async () => {
    setPdfLoading('rentabilidade');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Top Rentabilidade', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = topRentabilidade.data.map((item: any) => [
        item.produto || 'Produto',
        `${item.margem || 0}%`
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Margem']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'top-rentabilidade.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateFluxoPorTurnoPDF = async () => {
    setPdfLoading('fluxo');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Fluxo por Turno', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = fluxoPorTurno.data.map((item: any) => [
        item.turno || 'Turno',
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Turno', 'Total Faturado']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'fluxo-por-turno.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  // 🆕 PDF FUNCTIONS PARA NOVOS RELATÓRIOS
  const generateVendasPorMesaPDF = async () => {
    setPdfLoading('mesas');
    try {
      // Buscar dados diretamente se não tiver
      let data = vendasPorMesa.data;
      if (!data || data.length === 0) {
        console.log('[PDF] Buscando dados...');
        data = await fetchVendasPorMesa();
      }
      
      // Verificar se tem dados
      if (!data || data.length === 0) {
        alert('Nenhuma venda por mesa encontrada para exportar.');
        setPdfLoading(null);
        return;
      }
      
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Vendas por Mesa', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = data.map((item: any) => [
        item.mesa || 'Mesa',
        item.pedidos || 0,
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Mesa', 'Pedidos', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'vendas-por-mesa.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateMetodosPagamentoPDF = async () => {
    setPdfLoading('pagamentos');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Métodos de Pagamento', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = metodosPagamento.data.map((item: any) => [
        item.metodo || 'Método',
        item.transacoes || 0,
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Método', 'Transações', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'metodos-pagamento.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateHorarioPicoPDF = async () => {
    setPdfLoading('horario');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Horário de Pico', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = horarioPico.data.map((item: any) => [
        item.hora || 'Hora',
        item.pedidos || 0,
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Hora', 'Pedidos', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'horario-pico.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateDesempenhoCategoriaPDF = async () => {
    setPdfLoading('categoria');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Desempenho por Categoria', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      const tableData = desempenhoCategoria.data.map((item: any) => [
        item.categoria || 'Categoria',
        item.itens || 0,
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Categoria', 'Itens Vendidos', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'desempenho-categoria.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const loadAllCards = async () => {
    setLoading(true);
    await Promise.all([
      fetchVendasPorArtigo(),
      fetchFinancasDetalhadas(),
      fetchRhEFaltas(),
      fetchMapaDespesas(),
      fetchTopRentabilidade(),
      fetchFluxoPorTurno(),
      fetchVendasPorMesa(),
      fetchMetodosPagamento(),
      fetchHorarioPico(),
      fetchDesempenhoCategoria()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadAllCards();
    }
  }, [dateRange]);

  // Componente Card
  const Card = ({ title, icon, description, data, loading, onGenerate, onGeneratePDF, color }: any) => (
    <div className="glass-panel p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg text-white bg-dynamic`} style={{'--dynamic-color': color} as React.CSSProperties}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{title}</h3>
          <p className="text-xs text-slate-400 line-clamp-2">{description}</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-300">
            {Array.isArray(data) && data.length > 0 ? (
              data.length === 1 && data[0].mensagem ? (
                <span>{data[0].mensagem}</span>
              ) : (
                <span>{data.length} registros encontrados</span>
              )
            ) : (
              <span>Sem dados disponíveis</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onGenerate}
              className="flex-1 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-1"
            >
              <BarChart3 size={14} />
              Gerar
            </button>
            
            <button
              onClick={onGeneratePDF}
              disabled={pdfLoading !== null}
              className="py-2 px-2 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF"
            >
              {pdfLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                </>
              ) : (
                <>
                  <FileDown size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 h-full overflow-y-auto no-scrollbar bg-background text-sm">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Relatórios</h2>
            <p className="text-slate-400 text-sm mt-1">Sistema de relatórios e análises</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs"
            placeholder="Data Início"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs"
            placeholder="Data Fim"
          />
          
          <button 
            onClick={loadAllCards}
            disabled={loading}
            className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            ) : (
              <BarChart3 size={14} />
            )}
            Atualizar
          </button>
        </div>
      </header>

      {/* Layout Grid com 7 Cards Dinâmicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          title="Vendas por Artigo"
          icon={<Package size={20} />}
          description="Query que soma quantity por product_id"
          data={vendasPorArtigo.data}
          loading={vendasPorArtigo.loading}
          onGenerate={fetchVendasPorArtigo}
          onGeneratePDF={generateVendasPorArtigoPDF}
          color="#06b6d4"
        />
        
        <Card
          title="Finanças Detalhadas"
          icon={<DollarSign size={20} />}
          description="Balanço orders vs expenses"
          data={financasDetalhadas.data}
          loading={financasDetalhadas.loading}
          onGenerate={fetchFinancasDetalhadas}
          onGeneratePDF={generateFinancasDetalhadasPDF}
          color="#10b981"
        />
        
        <Card
          title="RH e Faltas"
          icon={<UserCheck size={20} />}
          description="Lógica de cálculo (salario/30) * faltas"
          data={rhEFaltas.data}
          loading={rhEFaltas.loading}
          onGenerate={fetchRhEFaltas}
          onGeneratePDF={generateRhEFaltasPDF}
          color="#f59e0b"
        />
        
        <Card
          title="Mapa de Despesas"
          icon={<Activity size={20} />}
          description="Agrupamento por categoria"
          data={mapaDespesas.data}
          loading={mapaDespesas.loading}
          onGenerate={fetchMapaDespesas}
          onGeneratePDF={generateMapaDespesasPDF}
          color="#ef4444"
        />
        
        <Card
          title="Top Rentabilidade"
          icon={<Target size={20} />}
          description="Cálculo de margem bruta"
          data={topRentabilidade.data}
          loading={topRentabilidade.loading}
          onGenerate={fetchTopRentabilidade}
          onGeneratePDF={generateTopRentabilidadePDF}
          color="#8b5cf6"
        />
        
        <Card
          title="Fluxo por Turno"
          icon={<Clock size={20} />}
          description="Filtro por created_at (HH:mm)"
          data={fluxoPorTurno.data}
          loading={fluxoPorTurno.loading}
          onGenerate={fetchFluxoPorTurno}
          onGeneratePDF={generateFluxoPorTurnoPDF}
          color="#ec4899"
        />
        
        <Card
          title="Vendas por Mesa"
          icon={<Users size={20} />}
          description="Top mesas mais rentáveis"
          data={vendasPorMesa.data}
          loading={vendasPorMesa.loading}
          onGenerate={fetchVendasPorMesa}
          onGeneratePDF={generateVendasPorMesaPDF}
          color="#14b8a6"
        />
        
        <Card
          title="Métodos de Pagamento"
          icon={<CreditCard size={20} />}
          description="Dinheiro vs Cartão vs Outros"
          data={metodosPagamento.data}
          loading={metodosPagamento.loading}
          onGenerate={fetchMetodosPagamento}
          onGeneratePDF={generateMetodosPagamentoPDF}
          color="#f97316"
        />
        
        <Card
          title="Horário de Pico"
          icon={<TrendingUp size={20} />}
          description="Análise de fluxo por hora"
          data={horarioPico.data}
          loading={horarioPico.loading}
          onGenerate={fetchHorarioPico}
          onGeneratePDF={generateHorarioPicoPDF}
          color="#0ea5e9"
        />
        
        <Card
          title="Desempenho por Categoria"
          icon={<PieChart size={20} />}
          description="Vendas por categoria de produto"
          data={desempenhoCategoria.data}
          loading={desempenhoCategoria.loading}
          onGenerate={fetchDesempenhoCategoria}
          onGeneratePDF={generateDesempenhoCategoriaPDF}
          color="#8b5cf6"
        />
      </div>
    </div>
  );
};

export default Reports;
