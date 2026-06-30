import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { 
  Package, DollarSign, UserCheck, Activity, Target, Clock, BarChart3, FileDown, 
  CreditCard, PieChart, TrendingUp, Users, Calendar,
  Search, RefreshCw, Download, FileText, AlertTriangle, Boxes, ClipboardList,
  Receipt, Wallet, FileCheck, Scale, ShoppingCart, TrendingDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase_standalone';
import { createReportPDF, finalizeReportPDF, formatKz as formatKzTemplate, type ReportSummary } from '../utils/pdfTemplate';

const Reports = () => {
  const { addNotification, menu, categories: menuCategories } = useStore();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Todos os relatórios buscam dados diretamente do Supabase (fonte de verdade)

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
  const [relatorioEventos, setRelatorioEventos] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });

  // 🆕 NOVOS RELATÓRIOS - LOTE 2
  const [cmv, setCmv] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [movStock, setMovStock] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [stockBaixo, setStockBaixo] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [vendasFunc, setVendasFunc] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [histSalarios, setHistSalarios] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [clientesFidel, setClientesFidel] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [despEventos, setDespEventos] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [dreSimpl, setDreSimpl] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [pedCompras, setPedCompras] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [fechDiario, setFechDiario] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [auditoria, setAuditoria] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [notasAGT, setNotasAGT] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [ticketMedio, setTicketMedio] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });

  // 🆕 LOTE 3 - ANÁLISE FINANCEIRA AVANÇADA
  const [pnlCompleto, setPnlCompleto] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [impostosPagar, setImpostosPagar] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [fluxoCaixa, setFluxoCaixa] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [margemReal, setMargemReal] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [custoPrime, setCustoPrime] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });
  const [pontoEquilibrio, setPontoEquilibrio] = useState<{ data: any[], loading: boolean }>({ data: [], loading: false });

  const formatKz = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  }, []);

  const savePDF = (doc: jsPDF, filename: string) => {
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addNotification('success', `PDF exportado: ${filename}`);
    } catch (error) {
      addNotification('error', 'Erro ao exportar PDF');
    }
  };

  const exportToCSV = useCallback((data: any[], filename: string, headers: string[]) => {
    try {
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) =>
          headers.map((h: string) => {
            const val = row[h.toLowerCase()] ?? row[h] ?? '';
            const str = String(val).replace(/,/g, ';').replace(/\n/g, ' ');
            return str;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addNotification('success', `CSV exportado: ${filename}`);
    } catch (error) {
      addNotification('error', 'Erro ao exportar CSV');
    }
  }, [addNotification]);

  // Funções para buscar dados
  const fetchVendasPorArtigo = async () => {
    setVendasPorArtigo({ ...vendasPorArtigo, loading: true });
    try {
            
      // Buscar order_items do Supabase com filtro de datas
      let query = supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, created_at');
      
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orderItems, error } = await query;
      
      if (error) {
                setVendasPorArtigo({ data: [], loading: false });
        return;
      }
      
      if (!orderItems || orderItems.length === 0) {
                setVendasPorArtigo({ data: [], loading: false });
        return;
      }
      
            
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
        .sort((a, b) => b.total - a.total);
      
            setVendasPorArtigo({ data: result, loading: false });
      
    } catch (error) {
            setVendasPorArtigo({ data: [], loading: false });
    }
  };

  const fetchFinancasDetalhadas = async () => {
    setFinancasDetalhadas({ ...financasDetalhadas, loading: true });
    try {
            
      // Buscar receita (orders fechadas) do Supabase
      let ordersQuery = supabase
        .from('orders')
        .select('id, total_amount, status, created_at, table_id')
        .in('status', ['closed', 'paid', 'finalized'])
        .order('created_at', { ascending: false });
      
      if (dateRange.start) ordersQuery = ordersQuery.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) ordersQuery = ordersQuery.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orders, error: ordersError } = await ordersQuery;
      
      if (ordersError) {
              }
      
      // Buscar despesas do Supabase
      let expQuery = supabase
        .from('expenses')
        .select('id, description, category, amount_kz, created_at')
        .order('created_at', { ascending: false });
      
      if (dateRange.start) expQuery = expQuery.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) expQuery = expQuery.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: expensesData, error: expError } = await expQuery;
      
      if (expError) {
              }
      
      // Buscar cash_flow (saídas)
      let cfQuery = supabase
        .from('cash_flow')
        .select('id, description, amount, type, created_at')
        .in('type', ['saida', 'saída'])
        .order('created_at', { ascending: false });
      
      if (dateRange.start) cfQuery = cfQuery.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfQuery = cfQuery.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: cashFlowData, error: cfError } = await cfQuery;
      
      if (cfError) {
              }
      
      // Buscar custos de staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('full_name, base_salary_kz, subsidios, bonus')
        .eq('status', 'active');
      
      if (staffError) {
              }
      
      // Construir balanço detalhado: cada registo como linha individual
      const balanco: any[] = [];
      
      // Entradas (orders)
      (orders || []).forEach((o: any) => {
        balanco.push({
          tipo: 'Entrada',
          descricao: `Pedido #${o.id?.slice(0, 8) || '---'}`,
          categoria: 'Vendas',
          valor: Number(o.total_amount || 0),
          data: o.created_at
        });
      });
      
      // Saídas (expenses)
      (expensesData || []).forEach((e: any) => {
        balanco.push({
          tipo: 'Saída',
          descricao: e.description || 'Despesa',
          categoria: e.category || 'Operacional',
          valor: -Number(e.amount_kz || 0),
          data: e.created_at
        });
      });
      
      // Saídas (cash_flow)
      (cashFlowData || []).forEach((cf: any) => {
        balanco.push({
          tipo: 'Saída',
          descricao: cf.description || 'Saída Caixa',
          categoria: 'Cash Flow',
          valor: -Number(cf.amount || 0),
          data: cf.created_at
        });
      });
      
      // Custos staff
      (staffData || []).forEach((s: any) => {
        const salarioTotal = Number(s.base_salary_kz || 0) + Number(s.subsidios || 0) + Number(s.bonus || 0);
        balanco.push({
          tipo: 'Saída',
          descricao: `Salário - ${s.full_name || 'Staff'}`,
          categoria: 'Pessoal',
          valor: -salarioTotal,
          data: null
        });
      });
      
      // Ordenar por data (mais recente primeiro)
      balanco.sort((a, b) => {
        if (!a.data) return 1;
        if (!b.data) return -1;
        return new Date(b.data).getTime() - new Date(a.data).getTime();
      });
      
      // Calcular totais para resumo
      const receita = (orders || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const despesasExp = (expensesData || []).reduce((sum: number, e: any) => sum + Number(e.amount_kz || 0), 0);
      const despesasCF = (cashFlowData || []).reduce((sum: number, cf: any) => sum + Number(cf.amount || 0), 0);
      const despesas = despesasExp + despesasCF;
      const custosStaff = (staffData || []).reduce((sum: number, s: any) => sum + Number(s.base_salary_kz || 0) + Number(s.subsidios || 0) + Number(s.bonus || 0), 0);
      const lucro = receita - despesas - custosStaff;
      const margem = receita > 0 ? ((lucro / receita) * 100) : 0;
      
            
      // Guardar resumo no primeiro item para o PDF
      if (balanco.length > 0) {
        balanco[0]._resumo = { receita, despesas, custosStaff, lucro, margem: Math.round(margem * 100) / 100, totalOrdens: (orders || []).length, totalDespesas: (expensesData || []).length + (cashFlowData || []).length };
      }
      
      setFinancasDetalhadas({ data: balanco, loading: false });
    } catch (error) {
            setFinancasDetalhadas({ data: [], loading: false });
    }
  };

  const fetchRhEFaltas = async () => {
    setRhEFaltas({ ...rhEFaltas, loading: true });
    try {
            
      // Buscar funcionários do Supabase
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('id, full_name, base_salary_kz, role, is_active');
      
      if (error) {
                setRhEFaltas({ data: [], loading: false });
        return;
      }
      
      if (!staffData || staffData.length === 0) {
                setRhEFaltas({ data: [], loading: false });
        return;
      }
      
            
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
      
            setRhEFaltas({ data: result, loading: false });
      
    } catch (error) {
            setRhEFaltas({ data: [], loading: false });
    }
  };

  const fetchMapaDespesas = async () => {
    setMapaDespesas({ ...mapaDespesas, loading: true });
    try {
            
      // Buscar despesas da tabela expenses
      let expQuery = supabase
        .from('expenses')
        .select('id, description, category, amount_kz, created_at')
        .order('created_at', { ascending: false });
      
      if (dateRange.start) expQuery = expQuery.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) expQuery = expQuery.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: expenses, error: expError } = await expQuery;
      
      if (expError) {
              }
      
      // Buscar despesas da tabela cash_flow (tipo saida)
      let cfQuery = supabase
        .from('cash_flow')
        .select('id, description, amount, type, created_at')
        .eq('type', 'saida')
        .order('created_at', { ascending: false });
      
      if (dateRange.start) cfQuery = cfQuery.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfQuery = cfQuery.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: cashFlowData, error: cfError } = await cfQuery;
      
      if (cfError) {
              }
      
      // Combinar todas as despesas numa lista completa
      const allExpenses: any[] = [];
      
      // Adicionar despesas da tabela expenses
      (expenses || []).forEach((exp: any) => {
        allExpenses.push({
          descricao: exp.description || 'Despesa sem descrição',
          categoria: exp.category || 'Outros',
          valor: Number(exp.amount_kz || 0),
          data: exp.created_at,
          fonte: 'expenses'
        });
      });
      
      // Adicionar despesas do cash_flow
      (cashFlowData || []).forEach((cf: any) => {
        allExpenses.push({
          descricao: cf.description || 'Saída de caixa',
          categoria: 'Caixa',
          valor: Number(cf.amount || 0),
          data: cf.created_at,
          fonte: 'cash_flow'
        });
      });
      
      // Ordenar por data (mais recente primeiro)
      allExpenses.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      
            
      if (allExpenses.length === 0) {
        setMapaDespesas({ data: [], loading: false });
        return;
      }
      
      setMapaDespesas({ data: allExpenses, loading: false });
      
    } catch (error) {
            setMapaDespesas({ data: [], loading: false });
    }
  };

  const fetchTopRentabilidade = async () => {
    setTopRentabilidade({ ...topRentabilidade, loading: true });
    try {
            
      // Buscar order_items do Supabase com filtro de datas
      let query = supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, created_at');
      
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orderItems, error } = await query;
      
      if (error) {
                setTopRentabilidade({ data: [], loading: false });
        return;
      }
      
      if (!orderItems || orderItems.length === 0) {
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
        // Usar custo real do menu se disponível, senão estimar 40%
        const unitCost = dish?.costPrice || (unitPrice * 0.4);
        
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
        productStats[productId].custo += unitCost * quantity;
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
        .sort((a, b) => b.margem - a.margem);
      
            setTopRentabilidade({ data: result, loading: false });
      
    } catch (error) {
            setTopRentabilidade({ data: [], loading: false });
    }
  };

  const fetchFluxoPorTurno = async () => {
    setFluxoPorTurno({ ...fluxoPorTurno, loading: true });
    try {
            
      // Buscar orders do Supabase com created_at e filtro de datas
      let query = supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orders, error } = await query;
      
      if (error) {
                setFluxoPorTurno({ data: [], loading: false });
        return;
      }
      
      if (!orders || orders.length === 0) {
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
      
            setFluxoPorTurno({ data: result, loading: false });
      
    } catch (error) {
            setFluxoPorTurno({ data: [], loading: false });
    }
  };

  // 🆕 NOVOS RELATÓRIOS - FETCH FUNCTIONS

  const fetchVendasPorMesa = async () => {
    setVendasPorMesa({ ...vendasPorMesa, loading: true });
    try {
            
      // Buscar pedidos com filtro de datas (ou todos se não houver filtro)
      let query = supabase
        .from('orders')
        .select('table_id, total_amount, status, created_at')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      }
      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      }
      
      const { data: orders, error } = await query;
      
      if (error) {
                setVendasPorMesa({ data: [], loading: false });
        return [];
      }
      
            
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
        
        const mesaId = String(order.table_id);
        const mesaName = mesaId.startsWith('Mesa') ? mesaId : `Mesa ${mesaId}`;
        
        if (!mesaSales[mesaId]) {
          mesaSales[mesaId] = { mesa: mesaName, total: 0, pedidos: 0 };
        }
        mesaSales[mesaId].total += Number(order.total_amount || 0);
        mesaSales[mesaId].pedidos += 1;
      });
      
      const result = Object.values(mesaSales)
        .sort((a, b) => b.total - a.total);
      
      // Se não houver mesas com dados, mostrar mensagem
      if (result.length === 0) {
        setVendasPorMesa({ data: [{ mesa: 'Nenhuma mesa com vendas', total: 0, pedidos: 0 }], loading: false });
        return [];
      }
      
      setVendasPorMesa({ data: result, loading: false });
      return result;
    } catch (error) {
            setVendasPorMesa({ data: [], loading: false });
      return [];
    }
  };

  const fetchMetodosPagamento = async () => {
    setMetodosPagamento({ ...metodosPagamento, loading: true });
    try {
            
      let query = supabase
        .from('orders')
        .select('payment_method, total_amount, created_at')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orders, error } = await query;
      
      if (error) {
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
            setMetodosPagamento({ data: [], loading: false });
    }
  };

  const fetchHorarioPico = async () => {
    setHorarioPico({ ...horarioPico, loading: true });
    try {
            
      let query = supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['closed', 'paid', 'finalized']);
      
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orders, error } = await query;
      
      if (error) {
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
            setHorarioPico({ data: [], loading: false });
    }
  };

  const fetchDesempenhoCategoria = async () => {
    setDesempenhoCategoria({ ...desempenhoCategoria, loading: true });
    try {
            
      // Buscar order_items do Supabase com filtro de datas
      let query = supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, created_at');
      
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      
      const { data: orderItems, error: itemsError } = await query;
      
      if (itemsError) {
                setDesempenhoCategoria({ data: [{ categoria: 'Erro ao buscar dados', total: 0, itens: 0 }], loading: false });
        return;
      }
      
            
      // Mapear produtos do menu para categoria
      const productMap = new Map();
      menu.forEach((item: any) => {
        const catId = item.category_id || item.categoryId;
        const cat = menuCategories.find((c: any) => c.id === catId);
        productMap.set(item.id, { ...item, _categoryName: cat?.name || null });
      });
      
      // Agrupar por categoria
      const categorias: Record<string, { categoria: string, total: number, itens: number }> = {};
      
      orderItems?.forEach((item: any) => {
        const product = productMap.get(item.product_id);
        const categoria = product?._categoryName || null;
        
        if (!categoria) {
          return;
        }
        
        if (!categorias[categoria]) {
          categorias[categoria] = { categoria, total: 0, itens: 0 };
        }
        categorias[categoria].total += Number(item.unit_price || 0) * Number(item.quantity || 0);
        categorias[categoria].itens += Number(item.quantity || 0);
      });
      
            
      const result = Object.values(categorias).sort((a, b) => b.total - a.total);
      
      if (result.length === 0) {
        setDesempenhoCategoria({ data: [{ categoria: 'Nenhuma categoria encontrada', total: 0, itens: 0 }], loading: false });
        return;
      }
      
      setDesempenhoCategoria({ data: result, loading: false });
    } catch (error) {
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
            alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateFinancasDetalhadasPDF = async () => {
    setPdfLoading('financas');
    try {
      const entradas = financasDetalhadas.data.filter((r: any) => r.tipo === 'Entrada');
      const saidas = financasDetalhadas.data.filter((r: any) => r.tipo === 'Saída');
      const totalEntradas = entradas.reduce((s: number, r: any) => s + Math.abs(r.valor || 0), 0);
      const totalSaidas = saidas.reduce((s: number, r: any) => s + Math.abs(r.valor || 0), 0);
      const saldo = totalEntradas - totalSaidas;

      const { doc, contentStartY } = createReportPDF({
        title: 'Balanço Financeiro Detalhado',
        subtitle: 'Entradas, saídas e saldo consolidado',
        dateRange,
        landscape: true,
        summary: [
          { label: 'Total Entradas', value: formatKz(totalEntradas), color: 'green' },
          { label: 'Total Saídas', value: formatKz(totalSaidas), color: 'red' },
          { label: 'Saldo Líquido', value: formatKz(saldo), color: saldo >= 0 ? 'green' : 'red' },
          { label: 'Transações', value: `${financasDetalhadas.data.length}`, color: 'dark' },
        ],
      });

      const tableData = financasDetalhadas.data.map((item: any) => [
        item.tipo || '-',
        item.descricao || '-',
        item.categoria || '-',
        item.valor >= 0 ? formatKz(item.valor) : `-${formatKz(Math.abs(item.valor))}`,
        item.data ? new Date(item.data).toLocaleDateString('pt-AO') : 'Mensal'
      ]);

      autoTable(doc, {
        head: [['Tipo', 'Descrição', 'Categoria', 'Valor', 'Data']],
        body: tableData,
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            if (data.cell.raw === 'Entrada') {
              data.cell.styles.textColor = [34, 197, 94];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'Saída') {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.section === 'body' && data.column.index === 3) {
            const valStr = String(data.cell.raw || '');
            if (valStr.startsWith('-')) {
              data.cell.styles.textColor = [239, 68, 68];
            } else {
              data.cell.styles.textColor = [34, 197, 94];
            }
          }
        }
      });

      // Totals row after table
      const finalY = (doc as any).lastAutoTable?.finalY || contentStartY + 20;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, finalY + 4, doc.internal.pageSize.getWidth() - 28, 10, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL ENTRADAS: ${formatKz(totalEntradas)}`, 18, finalY + 11);
      doc.text(`TOTAL SAÍDAS: ${formatKz(totalSaidas)}`, 120, finalY + 11);
      doc.text(`SALDO: ${formatKz(saldo)}`, 220, finalY + 11);

      finalizeReportPDF(doc, 'balanco-financeiro.pdf');
    } catch (error) {
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
        item.cargo || 'N/A',
        formatKz(item.salario || 0),
        item.faltas || 0,
        formatKz(item.desconto || 0)
      ]);
      
      autoTable(doc, {
        head: [['Funcionário', 'Cargo', 'Salário Base', 'Faltas', 'Desconto']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'rh-e-faltas.pdf');
    } catch (error) {
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
        item.descricao || item.categoria || 'Despesa',
        item.categoria || 'Outros',
        formatKz(item.valor || 0),
        item.data ? new Date(item.data).toLocaleDateString('pt-AO') : '-'
      ]);
      
      autoTable(doc, {
        head: [['Descrição', 'Categoria', 'Valor', 'Data']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 }
      });
      
      savePDF(doc, 'mapa-despesas.pdf');
    } catch (error) {
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
        formatKz(item.receita || 0),
        formatKz(item.lucro || 0),
        `${item.margem || 0}%`
      ]);
      
      autoTable(doc, {
        head: [['Produto', 'Receita', 'Lucro', 'Margem']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 }
      });
      
      savePDF(doc, 'top-rentabilidade.pdf');
    } catch (error) {
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
            alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const fetchRelatorioEventos = async () => {
    setRelatorioEventos({ ...relatorioEventos, loading: true });
    try {
            
      let query = supabase
        .from('events')
        .select('id, name, type, status, customer_name, customer_phone, start_date, end_date, guests_count, base_amount, extras_amount, final_amount, area, created_at')
        .order('start_date', { ascending: false });
      
      if (dateRange.start) query = query.gte('start_date', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('start_date', `${dateRange.end}T23:59:59`);
      
      const { data: events, error } = await query;
      
      if (error) {
                setRelatorioEventos({ data: [], loading: false });
        return;
      }
      
      if (!events || events.length === 0) {
        setRelatorioEventos({ data: [], loading: false });
        return;
      }
      
            
      // Mapear dados para o relatório
      const result = events.map((evt: any) => ({
        nome: evt.name,
        tipo: evt.type,
        status: evt.status,
        cliente: evt.customer_name,
        data: evt.start_date,
        convidados: evt.guests_count || 0,
        valor: Number(evt.final_amount || evt.base_amount || 0),
        area: evt.area || 'N/A'
      }));
      
      setRelatorioEventos({ data: result, loading: false });
    } catch (error) {
            setRelatorioEventos({ data: [], loading: false });
    }
  };

  const generateRelatorioEventosPDF = async () => {
    setPdfLoading('eventos');
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Relatório de Eventos', 14, 15);
      
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      // Resumo
      const total = relatorioEventos.data.length;
      const confirmados = relatorioEventos.data.filter((e: any) => e.status === 'CONFIRMADO').length;
      const concluidos = relatorioEventos.data.filter((e: any) => e.status === 'CONCLUIDO').length;
      const cancelados = relatorioEventos.data.filter((e: any) => e.status === 'CANCELADO').length;
      const receitaTotal = relatorioEventos.data.reduce((sum: number, e: any) => sum + (e.valor || 0), 0);
      
      doc.setFontSize(10);
      doc.text(`Total: ${total} eventos | Confirmados: ${confirmados} | Concluídos: ${concluidos} | Cancelados: ${cancelados} | Receita: ${formatKz(receitaTotal)}`, 14, 32);
      
      const tableData = relatorioEventos.data.map((item: any) => [
        item.nome || 'Evento',
        item.tipo || 'N/A',
        item.status || 'N/A',
        item.cliente || 'N/A',
        item.data ? new Date(item.data).toLocaleDateString('pt-AO') : '-',
        item.convidados || 0,
        formatKz(item.valor || 0)
      ]);
      
      autoTable(doc, {
        head: [['Evento', 'Tipo', 'Status', 'Cliente', 'Data', 'Convidados', 'Valor']],
        body: tableData,
        startY: 38,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 }
      });
      
      savePDF(doc, 'relatorio-eventos.pdf');
    } catch (error) {
            alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  // ===================== LOTE 2 - NOVOS RELATÓRIOS =====================

  // 1. CMV (Custo de Mercadoria Vendida)
  const fetchCMV = async () => {
    setCmv({ ...cmv, loading: true });
    try {
      let query = supabase.from('order_items').select('product_id, quantity, unit_price, created_at');
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: items, error } = await query;
      if (error || !items) { setCmv({ data: [], loading: false }); return; }

      const { data: products } = await supabase.from('products').select('id, name, cost_price');

      const productMap: Record<string, any> = {};
      (products || []).forEach((p: any) => { productMap[p.id] = p; });

      const cmvData: Record<string, { produto: string, custo: number, receita: number, margem: number }> = {};
      items.forEach((item: any) => {
        const prod = productMap[item.product_id];
        const cost = Number(item.quantity) * Number(prod?.cost_price || 0);
        const revenue = Number(item.quantity) * Number(item.unit_price);
        if (!cmvData[item.product_id]) {
          cmvData[item.product_id] = { produto: prod?.name || 'Desconhecido', custo: 0, receita: 0, margem: 0 };
        }
        cmvData[item.product_id].custo += cost;
        cmvData[item.product_id].receita += revenue;
      });

      const result = Object.values(cmvData).map((d: any) => ({
        ...d,
        margem: d.receita > 0 ? ((d.receita - d.custo) / d.receita * 100) : 0
      })).sort((a, b) => b.custo - a.custo);

      setCmv({ data: result, loading: false });
    } catch { setCmv({ data: [], loading: false }); }
  };

  const generateCMVPDF = async () => {
    setPdfLoading('cmv');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('CMV - Custo de Mercadoria Vendida', 14, 20);
      doc.setFontSize(10);
      const totalCusto = cmv.data.reduce((s: number, d: any) => s + d.custo, 0);
      const totalReceita = cmv.data.reduce((s: number, d: any) => s + d.receita, 0);
      const cmvPct = totalReceita > 0 ? (totalCusto / totalReceita * 100).toFixed(1) : '0';
      doc.text(`CMV Total: ${formatKz(totalCusto)} | Receita: ${formatKz(totalReceita)} | CMV%: ${cmvPct}%`, 14, 27);
      autoTable(doc, {
        head: [['Produto', 'Custo', 'Receita', 'Margem%']],
        body: cmv.data.map((d: any) => [d.produto, formatKz(d.custo), formatKz(d.receita), `${d.margem.toFixed(1)}%`]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'cmv.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 2. Movimentação de Stock
  const fetchMovStock = async () => {
    setMovStock({ ...movStock, loading: true });
    try {
      let query = supabase.from('stock_movements').select('*').order('timestamp', { ascending: false }).limit(100);
      if (dateRange.start) query = query.gte('timestamp', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('timestamp', `${dateRange.end}T23:59:59`);
      const { data, error } = await query;
      if (error || !data) { setMovStock({ data: [], loading: false }); return; }

      const { data: products } = await supabase.from('products').select('id, name');
      const pMap: Record<string, string> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = p.name; });

      const result = data.map((m: any) => ({
        produto: pMap[m.product_id] || `Produto ${m.product_id?.substring(0, 8) || ''}`,
        tipo: m.movement_type,
        quantidade: m.quantity,
    anterior: m.previous_quantity,
    novo: m.new_quantity,
    data: m.timestamp ? new Date(m.timestamp).toLocaleDateString('pt-AO') : '-',
    notas: m.notes || ''
      }));
      setMovStock({ data: result, loading: false });
    } catch { setMovStock({ data: [], loading: false }); }
  };

  const generateMovStockPDF = async () => {
    setPdfLoading('mov-stock');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Movimentação de Stock', 14, 20);
      doc.setFontSize(10); doc.text(`Total de movimentos: ${movStock.data.length}`, 14, 27);
      autoTable(doc, {
        head: [['Produto', 'Tipo', 'Qtd', 'Anterior', 'Novo', 'Data', 'Notas']],
        body: movStock.data.map((d: any) => [d.produto, d.tipo, d.quantidade, d.anterior, d.novo, d.data, d.notas]),
        startY: 33, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }
      });
      savePDF(doc, 'movimentacao-stock.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 3. Produtos com Stock Baixo
  const fetchStockBaixo = async () => {
    setStockBaixo({ ...stockBaixo, loading: true });
    try {
      const { data, error } = await supabase.from('products').select('name, stock_quantity, min_stock, sku, unit').eq('is_active', true);
      if (error || !data) { setStockBaixo({ data: [], loading: false }); return; }
      const result = data.filter((p: any) => p.stock_quantity <= (p.min_stock || 0)).map((p: any) => ({
        produto: p.name, atual: p.stock_quantity, minimo: p.min_stock, sku: p.sku || '-', unidade: p.unit || 'un'
      }));
      setStockBaixo({ data: result, loading: false });
    } catch { setStockBaixo({ data: [], loading: false }); }
  };

  const generateStockBaixoPDF = async () => {
    setPdfLoading('stock-baixo');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Produtos com Stock Baixo', 14, 20);
      doc.setFontSize(10); doc.text(`Total de alertas: ${stockBaixo.data.length}`, 14, 27);
      autoTable(doc, {
        head: [['Produto', 'Stock Atual', 'Stock Mínimo', 'SKU', 'Unidade']],
        body: stockBaixo.data.map((d: any) => [d.produto, d.atual, d.minimo, d.sku, d.unidade]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'stock-baixo.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 4. Vendas por Funcionário
  const fetchVendasFunc = async () => {
    setVendasFunc({ ...vendasFunc, loading: true });
    try {
      let query = supabase.from('orders').select('user_id, total_amount, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders, error } = await query;
      if (error || !orders) { setVendasFunc({ data: [], loading: false }); return; }

      const { data: staff } = await supabase.from('staff').select('id, full_name, role');
      const sMap: Record<string, any> = {};
      (staff || []).forEach((s: any) => { sMap[s.id] = s; });

      const vMap: Record<string, { funcionario: string, cargo: string, vendas: number, pedidos: number }> = {};
      orders.forEach((o: any) => {
        const uid = o.user_id || 'unknown';
        const emp = sMap[uid];
        if (!vMap[uid]) vMap[uid] = { funcionario: emp?.full_name || 'Não atribuído', cargo: emp?.role || '-', vendas: 0, pedidos: 0 };
        vMap[uid].vendas += Number(o.total_amount || 0);
        vMap[uid].pedidos++;
      });
      const result = Object.values(vMap).sort((a: any, b: any) => b.vendas - a.vendas);
      setVendasFunc({ data: result, loading: false });
    } catch { setVendasFunc({ data: [], loading: false }); }
  };

  const generateVendasFuncPDF = async () => {
    setPdfLoading('vendas-func');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Vendas por Funcionário', 14, 20);
      doc.setFontSize(10); doc.text(`Total de vendas: ${formatKz(vendasFunc.data.reduce((s: number, d: any) => s + d.vendas, 0))}`, 14, 27);
      autoTable(doc, {
        head: [['Funcionário', 'Cargo', 'Pedidos', 'Total Vendas']],
        body: vendasFunc.data.map((d: any) => [d.funcionario, d.cargo, d.pedidos, formatKz(d.vendas)]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'vendas-por-funcionario.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 5. Histórico de Pagamentos de Salários
  const fetchHistSalarios = async () => {
    setHistSalarios({ ...histSalarios, loading: true });
    try {
      const { data, error } = await supabase.from('salary_payments').select('*').order('created_at', { ascending: false }).limit(100);
      if (error || !data) { setHistSalarios({ data: [], loading: false }); return; }

      const { data: staff } = await supabase.from('staff').select('id, full_name');
      const sMap: Record<string, string> = {};
      (staff || []).forEach((s: any) => { sMap[s.id] = s.full_name; });

      const result = data.map((s: any) => ({
        funcionario: sMap[s.staff_id] || 'Desconhecido',
        mes: s.month_year,
        base: Number(s.base_salary), subsidios: Number(s.total_subsidies),
        horas_extra: Number(s.overtime_bonus), descontos: Number(s.total_discounts),
        liquido: Number(s.net_salary), status: s.status
      }));
      setHistSalarios({ data: result, loading: false });
    } catch { setHistSalarios({ data: [], loading: false }); }
  };

  const generateHistSalariosPDF = async () => {
    setPdfLoading('hist-salarios');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Histórico de Pagamentos de Salários', 14, 20);
      doc.setFontSize(10);
      const total = histSalarios.data.reduce((s: number, d: any) => s + d.liquido, 0);
      doc.text(`Total pago: ${formatKz(total)} | Registos: ${histSalarios.data.length}`, 14, 27);
      autoTable(doc, {
        head: [['Funcionário', 'Mês', 'Base', 'Subsídios', 'Horas Extra', 'Descontos', 'Líquido', 'Status']],
        body: histSalarios.data.map((d: any) => [d.funcionario, d.mes, formatKz(d.base), formatKz(d.subsidios), formatKz(d.horas_extra), formatKz(d.descontos), formatKz(d.liquido), d.status]),
        startY: 33, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }
      });
      savePDF(doc, 'historico-salarios.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 6. Clientes Fidelizados
  const fetchClientesFidel = async () => {
    setClientesFidel({ ...clientesFidel, loading: true });
    try {
      const { data, error } = await supabase.from('customers').select('name, phone, points, visits, last_visit, balance').order('visits', { ascending: false }).limit(50);
      if (error || !data) { setClientesFidel({ data: [], loading: false }); return; }
      const result = data.map((c: any) => ({
        nome: c.name, telefone: c.phone || '-', pontos: c.points || 0,
        visitas: c.visits || 0, saldo: Number(c.balance || 0),
        ultima_visita: c.last_visit ? new Date(c.last_visit).toLocaleDateString('pt-AO') : '-'
      }));
      setClientesFidel({ data: result, loading: false });
    } catch { setClientesFidel({ data: [], loading: false }); }
  };

  const generateClientesFidelPDF = async () => {
    setPdfLoading('clientes-fidel');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Clientes Fidelizados', 14, 20);
      doc.setFontSize(10); doc.text(`Total de clientes: ${clientesFidel.data.length}`, 14, 27);
      autoTable(doc, {
        head: [['Nome', 'Telefone', 'Pontos', 'Visitas', 'Saldo', 'Última Visita']],
        body: clientesFidel.data.map((d: any) => [d.nome, d.telefone, d.pontos, d.visitas, formatKz(d.saldo), d.ultima_visita]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'clientes-fidelizados.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 7. Despesas e Receitas de Eventos
  const fetchDespEventos = async () => {
    setDespEventos({ ...despEventos, loading: true });
    try {
      const { data: expenses } = await supabase.from('show_expenses').select('event_id, expense_type, description, amount, paid').order('created_at', { ascending: false }).limit(100);
      const { data: revenues } = await supabase.from('show_revenue').select('event_id, revenue_type, description, amount').order('created_at', { ascending: false }).limit(100);
      const { data: events } = await supabase.from('events').select('id, name');
      const eMap: Record<string, string> = {};
      (events || []).forEach((e: any) => { eMap[e.id] = e.name; });

      const result: any[] = [];
      (expenses || []).forEach((e: any) => result.push({ evento: eMap[e.event_id] || 'N/A', tipo: 'Despesa', categoria: e.expense_type, descricao: e.description || '-', valor: Number(e.amount), pago: e.paid ? 'Sim' : 'Não' }));
      (revenues || []).forEach((r: any) => result.push({ evento: eMap[r.event_id] || 'N/A', tipo: 'Receita', categoria: r.revenue_type, descricao: r.description || '-', valor: Number(r.amount), pago: '-' }));
      setDespEventos({ data: result, loading: false });
    } catch { setDespEventos({ data: [], loading: false }); }
  };

  const generateDespEventosPDF = async () => {
    setPdfLoading('desp-eventos');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Despesas e Receitas de Eventos', 14, 20);
      const totalDesp = despEventos.data.filter((d: any) => d.tipo === 'Despesa').reduce((s: number, d: any) => s + d.valor, 0);
      const totalRec = despEventos.data.filter((d: any) => d.tipo === 'Receita').reduce((s: number, d: any) => s + d.valor, 0);
      doc.setFontSize(10); doc.text(`Despesas: ${formatKz(totalDesp)} | Receitas: ${formatKz(totalRec)} | Saldo: ${formatKz(totalRec - totalDesp)}`, 14, 27);
      autoTable(doc, {
        head: [['Evento', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Pago']],
        body: despEventos.data.map((d: any) => [d.evento, d.tipo, d.categoria, d.descricao, formatKz(d.valor), d.pago]),
        startY: 33, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }
      });
      savePDF(doc, 'despesas-eventos.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 8. DRE Simplificado
  const fetchDRE = async () => {
    setDreSimpl({ ...dreSimpl, loading: true });
    try {
      let oq = supabase.from('orders').select('total_amount, tax_amount, net_amount, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) oq = oq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) oq = oq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders } = await oq;

      // CMV real: order_items × products.cost_price
      let iq = supabase.from('order_items').select('product_id, quantity, unit_price, created_at');
      if (dateRange.start) iq = iq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) iq = iq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orderItems } = await iq;
      const { data: products } = await supabase.from('products').select('id, cost_price');
      const pMap: Record<string, number> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = Number(p.cost_price || 0); });
      const cmvReal = (orderItems || []).reduce((s: number, item: any) => s + Number(item.quantity || 0) * (pMap[item.product_id] || 0), 0);

      let eq = supabase.from('expenses').select('amount_kz, created_at');
      if (dateRange.start) eq = eq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) eq = eq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: expenses } = await eq;

      let cfq = supabase.from('cash_flow').select('amount, type, created_at');
      if (dateRange.start) cfq = cfq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfq = cfq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: cashFlow } = await cfq;

      // Staff: salary_payments reais + fallback base_salary_kz
      const { data: salarios } = await supabase.from('salary_payments').select('net_salary, base_salary, total_subsidies, overtime_bonus, status').in('status', ['PAID', 'PENDING', 'PROCESSED']);
      const { data: staff } = await supabase.from('staff').select('base_salary_kz, subsidios, bonus').eq('status', 'active');

      const receitaBruta = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const iva = (orders || []).reduce((s: number, o: any) => s + Number(o.tax_amount || 0), 0);
      const receitaLiquida = (orders || []).reduce((s: number, o: any) => s + Number(o.net_amount || o.total_amount || 0), 0) - iva;
      const despesasExp = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount_kz || 0), 0);
      const cashFlowSaidas = (cashFlow || []).filter((cf: any) => cf.type === 'saída' || cf.type === 'saida').reduce((s: number, cf: any) => s + Number(cf.amount || 0), 0);
      const cashFlowEntradas = (cashFlow || []).filter((cf: any) => cf.type === 'entrada').reduce((s: number, cf: any) => s + Number(cf.amount || 0), 0);
      const despesasOp = despesasExp + cashFlowSaidas;

      const custosPessoalPagos = (salarios || []).reduce((s: number, sp: any) => s + Number(sp.net_salary || 0), 0);
      const custosPessoalBase = (staff || []).reduce((s: number, st: any) => s + Number(st.base_salary_kz || 0) + Number(st.subsidios || 0) + Number(st.bonus || 0), 0);
      const custosPessoal = custosPessoalPagos > 0 ? custosPessoalPagos : custosPessoalBase;

      const lucroBruto = receitaLiquida - cmvReal;
      const lucroOperacional = lucroBruto - despesasOp - custosPessoal;
      const lucroLiquido = lucroOperacional + cashFlowEntradas;

      const result = [
        { descricao: 'Receita Bruta (c/ IVA)', valor: receitaBruta },
        { descricao: '(-) IVA Recolhido', valor: -iva },
        { descricao: 'Receita Líquida', valor: receitaLiquida },
        { descricao: '(-) CMV (Custo de Mercadorias)', valor: -cmvReal },
        { descricao: 'Lucro Bruto', valor: lucroBruto },
        { descricao: '(-) Despesas Operacionais', valor: -despesasOp },
        { descricao: '(-) Custos com Pessoal (Salários)', valor: -custosPessoal },
        { descricao: '(+) Outras Entradas (Cash Flow)', valor: cashFlowEntradas },
        { descricao: 'Lucro Líquido', valor: lucroLiquido },
      ];
      setDreSimpl({ data: result, loading: false });
    } catch { setDreSimpl({ data: [], loading: false }); }
  };

  const generateDREPDF = async () => {
    setPdfLoading('dre');
    try {
      const receitaLiq = dreSimpl.data.find((d: any) => d.descricao === 'Receita Líquida')?.valor || 0;
      const lucroBruto = dreSimpl.data.find((d: any) => d.descricao === 'Lucro Bruto')?.valor || 0;
      const custosPessoal = dreSimpl.data.find((d: any) => d.descricao === '(-) Custos com Pessoal (Salários)')?.valor || 0;
      const lucroLiq = dreSimpl.data.find((d: any) => d.descricao === 'Lucro Líquido')?.valor || 0;

      const { doc, contentStartY } = createReportPDF({
        title: 'DRE - Demonstração do Resultado do Exercício',
        subtitle: 'Receitas, custos, despesas e lucro líquido',
        dateRange,
        summary: [
          { label: 'Receita Líquida', value: formatKz(receitaLiq), color: 'dark' },
          { label: 'Lucro Bruto', value: formatKz(lucroBruto), color: 'green' },
          { label: 'Custos Pessoal', value: formatKz(Math.abs(custosPessoal)), color: 'red' },
          { label: 'Lucro Líquido', value: formatKz(lucroLiq), color: lucroLiq >= 0 ? 'green' : 'red' },
        ],
      });

      autoTable(doc, {
        head: [['Descrição', 'Valor']],
        body: dreSimpl.data.map((d: any) => [d.descricao, formatKz(d.valor)]),
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 11, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const row = dreSimpl.data[data.row.index];
            if (row && (row.descricao.includes('Lucro') || row.descricao.includes('Receita Líquida'))) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 12;
              if (data.column.index === 1) {
                data.cell.styles.textColor = row.valor >= 0 ? [34, 197, 94] : [239, 68, 68];
              }
            }
            if (data.column.index === 1 && String(data.cell.raw || '').startsWith('-')) {
              data.cell.styles.textColor = [239, 68, 68];
            }
          }
        }
      });

      finalizeReportPDF(doc, 'dre-simplificado.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 9. Pedidos de Compra
  const fetchPedCompras = async () => {
    setPedCompras({ ...pedCompras, loading: true });
    try {
      const { data, error } = await supabase.from('purchase_requests').select('*').order('created_at', { ascending: false }).limit(100);
      if (error || !data) { setPedCompras({ data: [], loading: false }); return; }
      const result = data.map((p: any) => ({
        descricao: p.description, fornecedor: p.provider, valor: Number(p.amount),
        status: p.status, data: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-AO') : '-',
        notas: p.notes || ''
      }));
      setPedCompras({ data: result, loading: false });
    } catch { setPedCompras({ data: [], loading: false }); }
  };

  const generatePedComprasPDF = async () => {
    setPdfLoading('ped-compras');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Pedidos de Compra', 14, 20);
      doc.setFontSize(10); doc.text(`Total: ${pedCompras.data.length} pedidos`, 14, 27);
      autoTable(doc, {
        head: [['Descrição', 'Fornecedor', 'Valor', 'Status', 'Data', 'Notas']],
        body: pedCompras.data.map((d: any) => [d.descricao, d.fornecedor, formatKz(d.valor), d.status, d.data, d.notas]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'pedidos-compra.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 10. Fechamento Diário (Histórico)
  const fetchFechDiario = async () => {
    setFechDiario({ ...fechDiario, loading: true });
    try {
      const { data: closedDays, error: cdErr } = await supabase.from('closed_days').select('date, closed_at').order('date', { ascending: false }).limit(30);
      if (cdErr || !closedDays) { setFechDiario({ data: [], loading: false }); return; }

      const result: any[] = [];
      for (const cd of closedDays) {
        const { data: orders } = await supabase.from('orders').select('total_amount').eq('data_contabil', cd.date).in('status', ['closed', 'paid', 'finalized']);
        const faturacao = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
        result.push({
          data: new Date(cd.date).toLocaleDateString('pt-AO'),
          pedidos: (orders || []).length,
          faturacao,
          fechado_as: cd.closed_at ? new Date(cd.closed_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) : '-'
        });
      }
      setFechDiario({ data: result, loading: false });
    } catch { setFechDiario({ data: [], loading: false }); }
  };

  const generateFechDiarioPDF = async () => {
    setPdfLoading('fech-diario');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Histórico de Fechamento Diário', 14, 20);
      doc.setFontSize(10);
      const totalFat = fechDiario.data.reduce((s: number, d: any) => s + d.faturacao, 0);
      doc.text(`Dias fechados: ${fechDiario.data.length} | Faturação total: ${formatKz(totalFat)}`, 14, 27);
      autoTable(doc, {
        head: [['Data', 'Pedidos', 'Faturação', 'Fechado às']],
        body: fechDiario.data.map((d: any) => [d.data, d.pedidos, formatKz(d.faturacao), d.fechado_as]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'fechamento-diario.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 11. Auditoria de Sistema
  const fetchAuditoria = async () => {
    setAuditoria({ ...auditoria, loading: true });
    try {
      const { data, error } = await supabase.from('audit_logs').select('user_name, action, module, entity_type, timestamp').order('timestamp', { ascending: false }).limit(100);
      if (error || !data) { setAuditoria({ data: [], loading: false }); return; }
      const result = data.map((a: any) => ({
        utilizador: a.user_name || '-', acao: a.action, modulo: a.module,
        entidade: a.entity_type || '-', data: a.timestamp ? new Date(a.timestamp).toLocaleString('pt-AO') : '-'
      }));
      setAuditoria({ data: result, loading: false });
    } catch { setAuditoria({ data: [], loading: false }); }
  };

  const generateAuditoriaPDF = async () => {
    setPdfLoading('auditoria');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Auditoria de Sistema', 14, 20);
      doc.setFontSize(10); doc.text(`Total de registos: ${auditoria.data.length}`, 14, 27);
      autoTable(doc, {
        head: [['Utilizador', 'Ação', 'Módulo', 'Entidade', 'Data/Hora']],
        body: auditoria.data.map((d: any) => [d.utilizador, d.acao, d.modulo, d.entidade, d.data]),
        startY: 33, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }
      });
      savePDF(doc, 'auditoria-sistema.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 12. Notas Fiscais AGT
  const fetchNotasAGT = async () => {
    setNotasAGT({ ...notasAGT, loading: true });
    try {
      let query = supabase.from('orders').select('invoice_number, document_type, document_status, agt_status, total_amount, net_amount, tax_amount, created_at').not('invoice_number', 'is', null).order('created_at', { ascending: false }).limit(100);
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data, error } = await query;
      if (error || !data) { setNotasAGT({ data: [], loading: false }); return; }
      const result = data.map((o: any) => ({
        fatura: o.invoice_number || '-', tipo: o.document_type || 'FT',
        status_doc: o.document_status || 'N', status_agt: o.agt_status || '-',
        total: Number(o.total_amount || 0), liquido: Number(o.net_amount || 0),
        iva: Number(o.tax_amount || 0),
        data: o.created_at ? new Date(o.created_at).toLocaleDateString('pt-AO') : '-'
      }));
      setNotasAGT({ data: result, loading: false });
    } catch { setNotasAGT({ data: [], loading: false }); }
  };

  const generateNotasAGTPDF = async () => {
    setPdfLoading('notas-agt');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Notas Fiscais AGT', 14, 20);
      doc.setFontSize(10); doc.text(`Total de documentos: ${notasAGT.data.length}`, 14, 27);
      autoTable(doc, {
        head: [['Fatura', 'Tipo', 'Status Doc', 'Status AGT', 'Total', 'Líquido', 'IVA', 'Data']],
        body: notasAGT.data.map((d: any) => [d.fatura, d.tipo, d.status_doc, d.status_agt, formatKz(d.total), formatKz(d.liquido), formatKz(d.iva), d.data]),
        startY: 33, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }
      });
      savePDF(doc, 'notas-fiscais-agt.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 13. Ticket Médio por Período
  const fetchTicketMedio = async () => {
    setTicketMedio({ ...ticketMedio, loading: true });
    try {
      let query = supabase.from('orders').select('total_amount, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders, error } = await query;
      if (error || !orders) { setTicketMedio({ data: [], loading: false }); return; }

      const dayMap: Record<string, { data: string, pedidos: number, total: number }> = {};
      orders.forEach((o: any) => {
        const day = o.created_at ? new Date(o.created_at).toLocaleDateString('pt-AO') : 'N/A';
        if (!dayMap[day]) dayMap[day] = { data: day, pedidos: 0, total: 0 };
        dayMap[day].pedidos++;
        dayMap[day].total += Number(o.total_amount || 0);
      });
      const result = Object.values(dayMap).map((d: any) => ({
        ...d, ticket: d.pedidos > 0 ? d.total / d.pedidos : 0
      })).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setTicketMedio({ data: result, loading: false });
    } catch { setTicketMedio({ data: [], loading: false }); }
  };

  const generateTicketMedioPDF = async () => {
    setPdfLoading('ticket-medio');
    try {
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text('Ticket Médio por Período', 14, 20);
      const totalPedidos = ticketMedio.data.reduce((s: number, d: any) => s + d.pedidos, 0);
      const totalFat = ticketMedio.data.reduce((s: number, d: any) => s + d.total, 0);
      const tmGeral = totalPedidos > 0 ? totalFat / totalPedidos : 0;
      doc.setFontSize(10); doc.text(`Ticket médio geral: ${formatKz(tmGeral)} | Total pedidos: ${totalPedidos}`, 14, 27);
      autoTable(doc, {
        head: [['Data', 'Pedidos', 'Faturação', 'Ticket Médio']],
        body: ticketMedio.data.map((d: any) => [d.data, d.pedidos, formatKz(d.total), formatKz(d.ticket)]),
        startY: 33, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 }
      });
      savePDF(doc, 'ticket-medio.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // ===================== LOTE 3 - ANÁLISE FINANCEIRA AVANÇADA =====================

  // 14. P&L (Profit & Loss) Completo
  const fetchPnLCompleto = async () => {
    setPnlCompleto({ ...pnlCompleto, loading: true });
    try {
      let oq = supabase.from('orders').select('total_amount, tax_amount, net_amount, payment_method, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) oq = oq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) oq = oq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders } = await oq;

      // CMV real via order_items + products.cost_price
      let iq = supabase.from('order_items').select('product_id, quantity, created_at');
      if (dateRange.start) iq = iq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) iq = iq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orderItems } = await iq;
      const { data: products } = await supabase.from('products').select('id, cost_price');
      const pMap: Record<string, number> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = Number(p.cost_price || 0); });
      const cmv = (orderItems || []).reduce((s: number, item: any) => s + Number(item.quantity || 0) * (pMap[item.product_id] || 0), 0);

      let eq = supabase.from('expenses').select('amount_kz, category, created_at');
      if (dateRange.start) eq = eq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) eq = eq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: expenses } = await eq;

      let cfq = supabase.from('cash_flow').select('amount, type, description, created_at');
      if (dateRange.start) cfq = cfq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfq = cfq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: cashFlow } = await cfq;

      // Staff: salary_payments reais + fallback base_salary_kz + subsidios + bonus
      const { data: salarios } = await supabase.from('salary_payments').select('net_salary, base_salary, total_subsidies, overtime_bonus, status').in('status', ['PAID', 'PENDING', 'PROCESSED']);
      const { data: staff } = await supabase.from('staff').select('base_salary_kz, subsidios, bonus, full_name, role').eq('status', 'active');

      const receitaBruta = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const ivaRecolhido = (orders || []).reduce((s: number, o: any) => s + Number(o.tax_amount || 0), 0);
      const receitaLiquida = (orders || []).reduce((s: number, o: any) => s + Number(o.net_amount || o.total_amount || 0), 0) - ivaRecolhido;
      const lucroBruto = receitaLiquida - cmv;
      const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida * 100) : 0;

      // Despesas por categoria (expenses + cash_flow saídas)
      const despesasPorCat: Record<string, number> = {};
      (expenses || []).forEach((e: any) => {
        const cat = e.category || 'Operacional';
        despesasPorCat[cat] = (despesasPorCat[cat] || 0) + Number(e.amount_kz || 0);
      });
      (cashFlow || []).filter((cf: any) => cf.type === 'saída' || cf.type === 'saida').forEach((cf: any) => {
        const cat = cf.description || 'Caixa';
        despesasPorCat[cat] = (despesasPorCat[cat] || 0) + Number(cf.amount || 0);
      });

      const totalDespesasOp = Object.values(despesasPorCat).reduce((s: number, v: number) => s + v, 0);
      const cashFlowEntradas = (cashFlow || []).filter((cf: any) => cf.type === 'entrada').reduce((s: number, cf: any) => s + Number(cf.amount || 0), 0);

      // Custos com pessoal: salary_payments reais OU fallback staff.base_salary_kz + subsidios + bonus
      const custosPessoalPagos = (salarios || []).reduce((s: number, sp: any) => s + Number(sp.net_salary || 0), 0);
      const custosPessoalBase = (staff || []).reduce((s: number, st: any) => s + Number(st.base_salary_kz || 0) + Number(st.subsidios || 0) + Number(st.bonus || 0), 0);
      const custosPessoal = custosPessoalPagos > 0 ? custosPessoalPagos : custosPessoalBase;

      const custoPrime = cmv + custosPessoal;
      const pctCustoPrime = receitaLiquida > 0 ? (custoPrime / receitaLiquida * 100) : 0;
      const ebitda = lucroBruto - totalDespesasOp - custosPessoal + cashFlowEntradas;
      const pctEbitda = receitaLiquida > 0 ? (ebitda / receitaLiquida * 100) : 0;
      const lucroLiquido = ebitda;
      const pctLucroLiquido = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida * 100) : 0;

      const result: any[] = [
        { seccao: 'RECEITAS', descricao: 'Receita Bruta (c/ IVA)', valor: receitaBruta, pct: '-' },
        { seccao: 'RECEITAS', descricao: '(-) IVA Recolhido (14%)', valor: -ivaRecolhido, pct: '-' },
        { seccao: 'RECEITAS', descricao: 'Receita Líquida', valor: receitaLiquida, pct: '100%' },
        { seccao: 'CUSTOS', descricao: '(-) CMV (Custo de Mercadorias)', valor: -cmv, pct: `${receitaLiquida > 0 ? (cmv / receitaLiquida * 100).toFixed(1) : 0}%` },
        { seccao: 'CUSTOS', descricao: 'Lucro Bruto', valor: lucroBruto, pct: `${margemBruta.toFixed(1)}%` },
        { seccao: 'PESSOAL', descricao: '(-) Custos com Pessoal (Salários)', valor: -custosPessoal, pct: `${receitaLiquida > 0 ? (custosPessoal / receitaLiquida * 100).toFixed(1) : 0}%` },
        { seccao: 'PESSOAL', descricao: 'Custo Prime (CMV + Pessoal)', valor: custoPrime, pct: `${pctCustoPrime.toFixed(1)}%` },
      ];

      Object.entries(despesasPorCat).forEach(([cat, val]) => {
        result.push({ seccao: 'DESPESAS OP', descricao: `(-) ${cat}`, valor: -val, pct: `${receitaLiquida > 0 ? (val / receitaLiquida * 100).toFixed(1) : 0}%` });
      });

      result.push(
        { seccao: 'DESPESAS OP', descricao: 'Total Despesas Operacionais', valor: -totalDespesasOp, pct: `${receitaLiquida > 0 ? (totalDespesasOp / receitaLiquida * 100).toFixed(1) : 0}%` },
        { seccao: 'OUTRAS', descricao: '(+) Outras Entradas (Cash Flow)', valor: cashFlowEntradas, pct: '-' },
        { seccao: 'RESULTADO', descricao: 'EBITDA (Lucro Operacional)', valor: ebitda, pct: `${pctEbitda.toFixed(1)}%` },
        { seccao: 'RESULTADO', descricao: 'LUCRO LÍQUIDO', valor: lucroLiquido, pct: `${pctLucroLiquido.toFixed(1)}%` },
      );

      setPnlCompleto({ data: result, loading: false });
    } catch { setPnlCompleto({ data: [], loading: false }); }
  };

  const generatePnLCompletoPDF = async () => {
    setPdfLoading('pnl-completo');
    try {
      const receitaLiquida = pnlCompleto.data.find((d: any) => d.descricao === 'Receita Líquida')?.valor || 0;
      const lucroBruto = pnlCompleto.data.find((d: any) => d.descricao === 'Lucro Bruto')?.valor || 0;
      const ebitda = pnlCompleto.data.find((d: any) => d.descricao === 'EBITDA (Lucro Operacional)')?.valor || 0;
      const lucroLiquido = pnlCompleto.data.find((d: any) => d.descricao === 'LUCRO LÍQUIDO')?.valor || 0;

      const { doc, contentStartY } = createReportPDF({
        title: 'P&L - Demonstração de Resultados Completa',
        subtitle: 'Receitas, custos, despesas e lucro líquido com percentagens',
        dateRange,
        summary: [
          { label: 'Receita Líquida', value: formatKz(receitaLiquida), color: 'dark' },
          { label: 'Lucro Bruto', value: formatKz(lucroBruto), color: 'green' },
          { label: 'EBITDA', value: formatKz(ebitda), color: ebitda >= 0 ? 'green' : 'red' },
          { label: 'Lucro Líquido', value: formatKz(lucroLiquido), color: lucroLiquido >= 0 ? 'green' : 'red' },
        ],
      });

      let currentY = contentStartY;
      let lastSection = '';
      const sections: Record<string, [number, number, number]> = {
        'RECEITAS': [30, 41, 59],
        'CUSTOS': [139, 69, 19],
        'PESSOAL': [124, 58, 237],
        'DESPESAS OP': [234, 88, 12],
        'OUTRAS': [14, 165, 233],
        'RESULTADO': [16, 185, 129],
      };

      const sectionRows = pnlCompleto.data.reduce((acc: any[], row: any) => {
        if (row.seccao !== lastSection) {
          acc.push({ isHeader: true, seccao: row.seccao });
          lastSection = row.seccao;
        }
        acc.push({ isHeader: false, ...row });
        return acc;
      }, []);

      autoTable(doc, {
        body: sectionRows.map((r: any) => r.isHeader ? [{ content: r.seccao, colSpan: 3, styles: { fillColor: sections[r.seccao] || [100,100,100], textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 } }] : [r.descricao, formatKz(r.valor), r.pct]),
        startY: currentY,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const row = sectionRows[data.row.index];
            if (row && !row.isHeader) {
              if (row.descricao.includes('LUCRO') || row.descricao.includes('Lucro Bruto') || row.descricao.includes('EBITDA') || row.descricao.includes('Receita Líquida')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 10;
                if (data.column.index === 1) {
                  data.cell.styles.textColor = row.valor >= 0 ? [34, 197, 94] : [239, 68, 68];
                }
              }
              if (data.column.index === 1 && String(data.cell.raw || '').startsWith('-')) {
                data.cell.styles.textColor = [239, 68, 68];
              }
            }
          }
        }
      });

      finalizeReportPDF(doc, 'pnl-completo.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 15. Impostos a Pagar (IVA + Imposto Industrial)
  const fetchImpostosPagar = async () => {
    setImpostosPagar({ ...impostosPagar, loading: true });
    try {
      let oq = supabase.from('orders').select('total_amount, tax_amount, net_amount, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) oq = oq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) oq = oq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders } = await oq;

      // CMV real via order_items + products.cost_price
      let iq = supabase.from('order_items').select('product_id, quantity, created_at');
      if (dateRange.start) iq = iq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) iq = iq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orderItems } = await iq;
      const { data: products } = await supabase.from('products').select('id, cost_price');
      const pMap: Record<string, number> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = Number(p.cost_price || 0); });
      const cmv = (orderItems || []).reduce((s: number, item: any) => s + Number(item.quantity || 0) * (pMap[item.product_id] || 0), 0);

      let eq = supabase.from('expenses').select('amount_kz, created_at');
      if (dateRange.start) eq = eq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) eq = eq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: expenses } = await eq;

      let cfq = supabase.from('cash_flow').select('amount, type, created_at');
      if (dateRange.start) cfq = cfq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfq = cfq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: cashFlow } = await cfq;

      // Staff: salary_payments reais + fallback base_salary_kz + subsidios + bonus
      const { data: salarios } = await supabase.from('salary_payments').select('net_salary, status').in('status', ['PAID', 'PENDING', 'PROCESSED']);
      const { data: staff } = await supabase.from('staff').select('base_salary_kz, subsidios, bonus').eq('status', 'active');

      const ivaRecolhido = (orders || []).reduce((s: number, o: any) => s + Number(o.tax_amount || 0), 0);
      const despesasTotais = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount_kz || 0), 0)
        + (cashFlow || []).filter((cf: any) => cf.type === 'saída' || cf.type === 'saida').reduce((s: number, cf: any) => s + Number(cf.amount || 0), 0);
      const ivaInput = Math.round(despesasTotais * 0.14 / 1.14);
      const ivaAPagar = ivaRecolhido - ivaInput;

      const receitaLiquida = (orders || []).reduce((s: number, o: any) => s + Number(o.net_amount || o.total_amount || 0), 0) - ivaRecolhido;
      const custosPessoalPagos = (salarios || []).reduce((s: number, sp: any) => s + Number(sp.net_salary || 0), 0);
      const custosPessoalBase = (staff || []).reduce((s: number, st: any) => s + Number(st.base_salary_kz || 0) + Number(st.subsidios || 0) + Number(st.bonus || 0), 0);
      const custosPessoal = custosPessoalPagos > 0 ? custosPessoalPagos : custosPessoalBase;
      const lucroTributavel = receitaLiquida - cmv - despesasTotais - custosPessoal;
      const impostoIndustrial = lucroTributavel > 0 ? Math.round(lucroTributavel * 0.25) : 0;
      const pagamentoAdiantamento = lucroTributavel > 0 ? Math.round(lucroTributavel * 0.10) : 0;

      const result = [
        { imposto: 'IVA (Imposto sobre Valor Acrescentado)', base: 'Vendas + Compras', taxa: '14%', valor: ivaAPagar, observacao: `Output: ${formatKz(ivaRecolhido)} - Input: ${formatKz(ivaInput)}` },
        { imposto: 'Imposto Industrial (Provisório)', base: 'Lucro Tributável', taxa: '25%', valor: impostoIndustrial, observacao: `Lucro tributável: ${formatKz(lucroTributavel)}` },
        { imposto: 'Adiantamento Imposto Industrial', base: 'Lucro Tributável', taxa: '10%', valor: pagamentoAdiantamento, observacao: 'Pago trimestralmente' },
        { imposto: 'IRT (Retenção na fonte)', base: 'Salários', taxa: 'Progressiva', valor: 0, observacao: 'Calculado na folha de salários' },
      ];

      setImpostosPagar({ data: result, loading: false });
    } catch { setImpostosPagar({ data: [], loading: false }); }
  };

  const generateImpostosPagarPDF = async () => {
    setPdfLoading('impostos-pagar');
    try {
      const totalImpostos = impostosPagar.data.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
      const ivaValor = impostosPagar.data.find((d: any) => d.imposto.includes('IVA'))?.valor || 0;
      const iiValor = impostosPagar.data.find((d: any) => d.imposto.includes('Industrial (Provis'))?.valor || 0;

      const { doc, contentStartY } = createReportPDF({
        title: 'Impostos a Pagar - Estimativa AGT',
        subtitle: 'IVA, Imposto Industrial e retenções conforme legislação angolana',
        dateRange,
        summary: [
          { label: 'IVA a Pagar', value: formatKz(ivaValor), color: ivaValor > 0 ? 'red' : 'green' },
          { label: 'Imp. Industrial', value: formatKz(iiValor), color: iiValor > 0 ? 'red' : 'green' },
          { label: 'Total Estimado', value: formatKz(totalImpostos), color: totalImpostos > 0 ? 'red' : 'green' },
          { label: 'Impostos', value: `${impostosPagar.data.length}`, color: 'dark' },
        ],
      });

      autoTable(doc, {
        head: [['Imposto', 'Base de Incidência', 'Taxa', 'Valor a Pagar', 'Observações']],
        body: impostosPagar.data.map((d: any) => [d.imposto, d.base, d.taxa, formatKz(d.valor), d.observacao]),
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 3) {
            const valStr = String(data.cell.raw || '');
            if (valStr.includes('Kz') && !valStr.startsWith('-') && valStr !== '0,00 Kz' && valStr !== '0 Kz') {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || contentStartY + 20;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, finalY + 4, doc.internal.pageSize.getWidth() - 28, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL IMPOSTOS A PAGAR: ${formatKz(totalImpostos)}`, 18, finalY + 11);

      finalizeReportPDF(doc, 'impostos-a-pagar.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 16. Fluxo de Caixa Detalhado
  const fetchFluxoCaixa = async () => {
    setFluxoCaixa({ ...fluxoCaixa, loading: true });
    try {
      let oq = supabase.from('orders').select('total_amount, payment_method, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) oq = oq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) oq = oq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders } = await oq;

      let eq = supabase.from('expenses').select('amount_kz, category, description, created_at');
      if (dateRange.start) eq = eq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) eq = eq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: expenses } = await eq;

      let cfq = supabase.from('cash_flow').select('amount, type, description, created_at');
      if (dateRange.start) cfq = cfq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfq = cfq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: cashFlow } = await cfq;

      const movimentos: any[] = [];

      (orders || []).forEach((o: any) => {
        movimentos.push({
          data: o.created_at ? new Date(o.created_at).toLocaleDateString('pt-AO') : '-',
          tipo: 'Entrada',
          descricao: `Venda #${o.id?.slice(0, 8) || '---'}`,
          metodo: o.payment_method || '-',
          valor: Number(o.total_amount || 0),
        });
      });

      (expenses || []).forEach((e: any) => {
        movimentos.push({
          data: e.created_at ? new Date(e.created_at).toLocaleDateString('pt-AO') : '-',
          tipo: 'Saída',
          descricao: e.description || 'Despesa',
          metodo: e.category || 'Despesa',
          valor: -Number(e.amount_kz || 0),
        });
      });

      (cashFlow || []).forEach((cf: any) => {
        const isEntrada = cf.type === 'entrada';
        movimentos.push({
          data: cf.created_at ? new Date(cf.created_at).toLocaleDateString('pt-AO') : '-',
          tipo: isEntrada ? 'Entrada' : 'Saída',
          descricao: cf.description || 'Caixa',
          metodo: 'Cash Flow',
          valor: isEntrada ? Number(cf.amount || 0) : -Number(cf.amount || 0),
        });
      });

      movimentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const totalEntradas = movimentos.filter(m => m.valor > 0).reduce((s: number, m: any) => s + m.valor, 0);
      const totalSaidas = movimentos.filter(m => m.valor < 0).reduce((s: number, m: any) => s + Math.abs(m.valor), 0);
      const saldoCaixa = totalEntradas - totalSaidas;

      movimentos.push({
        data: '', tipo: 'SALDO', descricao: 'SALDO DE CAIXA', metodo: '',
        valor: saldoCaixa, _isTotal: true,
        _resumo: { totalEntradas, totalSaidas, saldoCaixa }
      });

      setFluxoCaixa({ data: movimentos, loading: false });
    } catch { setFluxoCaixa({ data: [], loading: false }); }
  };

  const generateFluxoCaixaPDF = async () => {
    setPdfLoading('fluxo-caixa');
    try {
      const resumo = fluxoCaixa.data.find((d: any) => d._isTotal)?._resumo || {};
      const totalEntradas = resumo.totalEntradas || 0;
      const totalSaidas = resumo.totalSaidas || 0;
      const saldo = resumo.saldoCaixa || 0;

      const { doc, contentStartY } = createReportPDF({
        title: 'Fluxo de Caixa Detalhado',
        subtitle: 'Todas as movimentações de entradas e saídas',
        dateRange,
        landscape: true,
        summary: [
          { label: 'Entradas', value: formatKz(totalEntradas), color: 'green' },
          { label: 'Saídas', value: formatKz(totalSaidas), color: 'red' },
          { label: 'Saldo de Caixa', value: formatKz(saldo), color: saldo >= 0 ? 'green' : 'red' },
          { label: 'Movimentos', value: `${fluxoCaixa.data.length - 1}`, color: 'dark' },
        ],
      });

      const tableData = fluxoCaixa.data.filter((d: any) => !d._isTotal).map((m: any) => [
        m.data, m.tipo, m.descricao, m.metodo, m.valor >= 0 ? formatKz(m.valor) : `-${formatKz(Math.abs(m.valor))}`
      ]);

      autoTable(doc, {
        head: [['Data', 'Tipo', 'Descrição', 'Método/Categoria', 'Valor']],
        body: tableData,
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            if (data.column.index === 1) {
              if (data.cell.raw === 'Entrada') { data.cell.styles.textColor = [34, 197, 94]; data.cell.styles.fontStyle = 'bold'; }
              else if (data.cell.raw === 'Saída') { data.cell.styles.textColor = [239, 68, 68]; data.cell.styles.fontStyle = 'bold'; }
            }
            if (data.column.index === 4) {
              const valStr = String(data.cell.raw || '');
              data.cell.styles.textColor = valStr.startsWith('-') ? [239, 68, 68] : [34, 197, 94];
            }
          }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || contentStartY + 20;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, finalY + 4, doc.internal.pageSize.getWidth() - 28, 10, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`ENTRADAS: ${formatKz(totalEntradas)}`, 18, finalY + 11);
      doc.text(`SAÍDAS: ${formatKz(totalSaidas)}`, 120, finalY + 11);
      doc.text(`SALDO: ${formatKz(saldo)}`, 220, finalY + 11);

      finalizeReportPDF(doc, 'fluxo-caixa.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 17. Margem Real por Produto
  const fetchMargemReal = async () => {
    setMargemReal({ ...margemReal, loading: true });
    try {
      let query = supabase.from('order_items').select('product_id, quantity, unit_price, created_at');
      if (dateRange.start) query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: items } = await query;

      const { data: products } = await supabase.from('products').select('id, name, cost_price, price, tax_rate');

      const pMap: Record<string, any> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = p; });

      const prodData: Record<string, { produto: string, receita: number, custo: number, lucro: number, margem: number, qty: number, precoVenda: number, custoUnit: number, ivaPct: number }> = {};

      (items || []).forEach((item: any) => {
        const prod = pMap[item.product_id];
        if (!prod) return;
        const receita = Number(item.quantity) * Number(item.unit_price);
        const custo = Number(item.quantity) * Number(prod.cost_price || 0);
        if (!prodData[item.product_id]) {
          prodData[item.product_id] = {
            produto: prod.name, receita: 0, custo: 0, lucro: 0, margem: 0,
            qty: 0, precoVenda: Number(item.unit_price), custoUnit: Number(prod.cost_price || 0),
            ivaPct: Number(prod.tax_rate || 14)
          };
        }
        prodData[item.product_id].receita += receita;
        prodData[item.product_id].custo += custo;
        prodData[item.product_id].qty += Number(item.quantity);
      });

      const result = Object.values(prodData).map((d: any) => {
        const lucro = d.receita - d.custo;
        const margem = d.receita > 0 ? (lucro / d.receita * 100) : 0;
        const margemAposIVA = d.receita > 0 ? ((d.receita * (1 - d.ivaPct / 100) - d.custo) / (d.receita * (1 - d.ivaPct / 100)) * 100) : 0;
        return { ...d, lucro, margem: Math.round(margem * 10) / 10, margemAposIVA: Math.round(margemAposIVA * 10) / 10 };
      }).sort((a: any, b: any) => b.margem - a.margem);

      setMargemReal({ data: result, loading: false });
    } catch { setMargemReal({ data: [], loading: false }); }
  };

  const generateMargemRealPDF = async () => {
    setPdfLoading('margem-real');
    try {
      const totalReceita = margemReal.data.reduce((s: number, d: any) => s + d.receita, 0);
      const totalCusto = margemReal.data.reduce((s: number, d: any) => s + d.custo, 0);
      const totalLucro = totalReceita - totalCusto;
      const margemMedia = totalReceita > 0 ? (totalLucro / totalReceita * 100) : 0;

      const { doc, contentStartY } = createReportPDF({
        title: 'Margem Real por Produto',
        subtitle: 'Receita, custo, lucro e margem após IVA por produto',
        dateRange,
        summary: [
          { label: 'Receita Total', value: formatKz(totalReceita), color: 'dark' },
          { label: 'Custo Total', value: formatKz(totalCusto), color: 'red' },
          { label: 'Lucro Total', value: formatKz(totalLucro), color: 'green' },
          { label: 'Margem Média', value: `${margemMedia.toFixed(1)}%`, color: margemMedia >= 60 ? 'green' : 'amber' },
        ],
      });

      autoTable(doc, {
        head: [['Produto', 'Qtd', 'P. Venda', 'Custo Unit', 'Receita', 'Custo', 'Lucro', 'Margem%', 'Após IVA%']],
        body: margemReal.data.map((d: any) => [
          d.produto, d.qty, formatKz(d.precoVenda), formatKz(d.custoUnit),
          formatKz(d.receita), formatKz(d.custo), formatKz(d.lucro),
          `${d.margem}%`, `${d.margemAposIVA}%`
        ]),
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 7) {
            const val = parseFloat(String(data.cell.raw || '').replace('%', ''));
            if (val >= 60) data.cell.styles.textColor = [34, 197, 94];
            else if (val >= 30) data.cell.styles.textColor = [245, 158, 11];
            else data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      finalizeReportPDF(doc, 'margem-real.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 18. Custo Prime (Prime Cost)
  const fetchCustoPrime = async () => {
    setCustoPrime({ ...custoPrime, loading: true });
    try {
      let oq = supabase.from('orders').select('total_amount, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) oq = oq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) oq = oq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders } = await oq;

      // CMV real via order_items + products.cost_price
      let iq = supabase.from('order_items').select('product_id, quantity, created_at');
      if (dateRange.start) iq = iq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) iq = iq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orderItems } = await iq;
      const { data: products } = await supabase.from('products').select('id, cost_price');
      const pMap: Record<string, number> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = Number(p.cost_price || 0); });
      const cmv = (orderItems || []).reduce((s: number, item: any) => s + Number(item.quantity || 0) * (pMap[item.product_id] || 0), 0);

      // Staff: salary_payments reais + fallback base_salary_kz + subsidios + bonus
      const { data: salarios } = await supabase.from('salary_payments').select('net_salary, base_salary, total_subsidies, overtime_bonus, status').in('status', ['PAID', 'PENDING', 'PROCESSED']);
      const { data: staff } = await supabase.from('staff').select('full_name, role, base_salary_kz, subsidios, bonus, status').eq('status', 'active');

      const receita = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const custosPessoalPagos = (salarios || []).reduce((s: number, sp: any) => s + Number(sp.net_salary || 0), 0);
      const custosPessoalBase = (staff || []).reduce((s: number, st: any) => s + Number(st.base_salary_kz || 0) + Number(st.subsidios || 0) + Number(st.bonus || 0), 0);
      const custosPessoal = custosPessoalPagos > 0 ? custosPessoalPagos : custosPessoalBase;
      const custoPrimeTotal = cmv + custosPessoal;
      const pctCustoPrime = receita > 0 ? (custoPrimeTotal / receita * 100) : 0;
      const pctCMV = receita > 0 ? (cmv / receita * 100) : 0;
      const pctPessoal = receita > 0 ? (custosPessoal / receita * 100) : 0;
      const saudavel = pctCustoPrime <= 60;

      const result: any[] = [
        { componente: 'Receita Total', valor: receita, pct: '100%', tipo: 'header' },
        { componente: 'CMV (Custo de Mercadorias)', valor: cmv, pct: `${pctCMV.toFixed(1)}%`, tipo: 'cost' },
        { componente: 'Custos com Pessoal (Salários + Subsídios + Bónus)', valor: custosPessoal, pct: `${pctPessoal.toFixed(1)}%`, tipo: 'cost' },
        { componente: 'CUSTO PRIME TOTAL', valor: custoPrimeTotal, pct: `${pctCustoPrime.toFixed(1)}%`, tipo: 'total' },
        { componente: saudavel ? 'STATUS: SAUDÁVEL (≤60%)' : 'ATENÇÃO: Custo Prime > 60%', valor: 0, pct: saudavel ? 'OK' : 'ALERTA', tipo: 'status' },
      ];

      (staff || []).forEach((s: any) => {
        const salarioTotal = Number(s.base_salary_kz || 0) + Number(s.subsidios || 0) + Number(s.bonus || 0);
        result.push({ componente: `  ${s.full_name} (${s.role || '-'})`, valor: salarioTotal, pct: `${receita > 0 ? (salarioTotal / receita * 100).toFixed(1) : 0}%`, tipo: 'detail' });
      });

      setCustoPrime({ data: result, loading: false });
    } catch { setCustoPrime({ data: [], loading: false }); }
  };

  const generateCustoPrimePDF = async () => {
    setPdfLoading('custo-prime');
    try {
      const totalRow = custoPrime.data.find((d: any) => d.tipo === 'total');
      const statusRow = custoPrime.data.find((d: any) => d.tipo === 'status');
      const custoPrimeVal = totalRow?.valor || 0;
      const pctCustoPrime = totalRow?.pct || '0%';
      const isSaudavel = statusRow?.pct === 'OK';

      const { doc, contentStartY } = createReportPDF({
        title: 'Custo Prime (Prime Cost)',
        subtitle: 'CMV + Custos com Pessoal — métrica #1 em restaurantes (meta: ≤60%)',
        dateRange,
        summary: [
          { label: 'Custo Prime', value: formatKz(custoPrimeVal), color: 'dark' },
          { label: '% da Receita', value: pctCustoPrime, color: isSaudavel ? 'green' : 'red' },
          { label: 'Status', value: isSaudavel ? 'SAUDÁVEL' : 'ATENÇÃO', color: isSaudavel ? 'green' : 'red' },
        ],
      });

      autoTable(doc, {
        head: [['Componente', 'Valor', '% Receita']],
        body: custoPrime.data.map((d: any) => [d.componente, d.valor > 0 ? formatKz(d.valor) : '-', d.pct]),
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const row = custoPrime.data[data.row.index];
            if (row?.tipo === 'total') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 11;
              data.cell.styles.fillColor = [241, 245, 249];
              if (data.column.index === 1) data.cell.styles.textColor = [30, 41, 59];
            }
            if (row?.tipo === 'status') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 11;
              if (data.column.index === 0) data.cell.styles.textColor = isSaudavel ? [34, 197, 94] : [239, 68, 68];
              if (data.column.index === 2) data.cell.styles.textColor = isSaudavel ? [34, 197, 94] : [239, 68, 68];
            }
          }
        }
      });

      finalizeReportPDF(doc, 'custo-prime.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
  };

  // 19. Ponto de Equilíbrio (Break-Even)
  const fetchPontoEquilibrio = async () => {
    setPontoEquilibrio({ ...pontoEquilibrio, loading: true });
    try {
      let oq = supabase.from('orders').select('total_amount, created_at').in('status', ['closed', 'paid', 'finalized']);
      if (dateRange.start) oq = oq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) oq = oq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orders } = await oq;

      // CMV real via order_items + products.cost_price
      let iq = supabase.from('order_items').select('product_id, quantity, created_at');
      if (dateRange.start) iq = iq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) iq = iq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: orderItems } = await iq;
      const { data: products } = await supabase.from('products').select('id, cost_price');
      const pMap: Record<string, number> = {};
      (products || []).forEach((p: any) => { pMap[p.id] = Number(p.cost_price || 0); });
      const cmv = (orderItems || []).reduce((s: number, item: any) => s + Number(item.quantity || 0) * (pMap[item.product_id] || 0), 0);

      let eq = supabase.from('expenses').select('amount_kz, created_at');
      if (dateRange.start) eq = eq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) eq = eq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: expenses } = await eq;

      let cfq = supabase.from('cash_flow').select('amount, type, created_at');
      if (dateRange.start) cfq = cfq.gte('created_at', `${dateRange.start}T00:00:00`);
      if (dateRange.end) cfq = cfq.lte('created_at', `${dateRange.end}T23:59:59`);
      const { data: cashFlow } = await cfq;

      // Staff: salary_payments reais + fallback base_salary_kz + subsidios + bonus
      const { data: salarios } = await supabase.from('salary_payments').select('net_salary, status').in('status', ['PAID', 'PENDING', 'PROCESSED']);
      const { data: staff } = await supabase.from('staff').select('base_salary_kz, subsidios, bonus').eq('status', 'active');

      const receita = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const cashFlowSaidas = (cashFlow || []).filter((cf: any) => cf.type === 'saída' || cf.type === 'saida').reduce((s: number, cf: any) => s + Number(cf.amount || 0), 0);
      const custosPessoalPagos = (salarios || []).reduce((s: number, sp: any) => s + Number(sp.net_salary || 0), 0);
      const custosPessoalBase = (staff || []).reduce((s: number, st: any) => s + Number(st.base_salary_kz || 0) + Number(st.subsidios || 0) + Number(st.bonus || 0), 0);
      const custosPessoal = custosPessoalPagos > 0 ? custosPessoalPagos : custosPessoalBase;
      const custosFixos = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount_kz || 0), 0) + cashFlowSaidas + custosPessoal;
      const margemContribuicao = receita - cmv;
      const ratioMargem = receita > 0 ? (margemContribuicao / receita) : 0;
      const pontoEquilibrioValor = ratioMargem > 0 ? (custosFixos / ratioMargem) : 0;
      const margemSeguranca = receita > pontoEquilibrioValor ? ((receita - pontoEquilibrioValor) / receita * 100) : 0;
      const lucroAtual = margemContribuicao - custosFixos;

      const result = [
        { indicador: 'Receita Total', valor: receita, observacao: `${(orders || []).length} pedidos` },
        { indicador: 'CMV (Custos Variáveis)', valor: cmv, observacao: `${receita > 0 ? (cmv / receita * 100).toFixed(1) : 0}% da receita` },
        { indicador: 'Margem de Contribuição', valor: margemContribuicao, observacao: `${receita > 0 ? (margemContribuicao / receita * 100).toFixed(1) : 0}% da receita` },
        { indicador: 'Custos Fixos (Despesas + Pessoal)', valor: custosFixos, observacao: `Pessoal: ${formatKz(custosPessoal)}` },
        { indicador: 'Ponto de Equilíbrio (Kz)', valor: pontoEquilibrioValor, observacao: `Receita mínima para não ter prejuízo` },
        { indicador: 'Margem de Segurança', valor: margemSeguranca, observacao: `${margemSeguranca.toFixed(1)}% acima do break-even` },
        { indicador: 'Lucro/Prejuízo Atual', valor: lucroAtual, observacao: lucroAtual >= 0 ? 'LUCRO' : 'PREJUÍZO' },
      ];

      setPontoEquilibrio({ data: result, loading: false });
    } catch { setPontoEquilibrio({ data: [], loading: false }); }
  };

  const generatePontoEquilibrioPDF = async () => {
    setPdfLoading('ponto-equilibrio');
    try {
      const pe = pontoEquilibrio.data.find((d: any) => d.indicador === 'Ponto de Equilíbrio (Kz)')?.valor || 0;
      const ms = pontoEquilibrio.data.find((d: any) => d.indicador === 'Margem de Segurança')?.valor || 0;
      const lucro = pontoEquilibrio.data.find((d: any) => d.indicador === 'Lucro/Prejuízo Atual')?.valor || 0;
      const receita = pontoEquilibrio.data.find((d: any) => d.indicador === 'Receita Total')?.valor || 0;

      const { doc, contentStartY } = createReportPDF({
        title: 'Ponto de Equilíbrio (Break-Even Analysis)',
        subtitle: 'Receita mínima necessária para cobrir todos os custos',
        dateRange,
        summary: [
          { label: 'Receita Atual', value: formatKz(receita), color: 'dark' },
          { label: 'Break-Even', value: formatKz(pe), color: 'amber' },
          { label: 'Margem Segurança', value: `${ms.toFixed(1)}%`, color: ms >= 20 ? 'green' : 'red' },
          { label: 'Resultado', value: formatKz(lucro), color: lucro >= 0 ? 'green' : 'red' },
        ],
      });

      autoTable(doc, {
        head: [['Indicador', 'Valor', 'Observação']],
        body: pontoEquilibrio.data.map((d: any) => [
          d.indicador,
          typeof d.valor === 'number' && d.indicador !== 'Margem de Segurança' ? formatKz(d.valor) : (d.indicador === 'Margem de Segurança' ? `${d.valor.toFixed(1)}%` : formatKz(d.valor)),
          d.observacao
        ]),
        startY: contentStartY,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            const row = pontoEquilibrio.data[data.row.index];
            if (row?.indicador.includes('Ponto de Equilíbrio') || row?.indicador.includes('Margem de Contribuição')) {
              data.cell.styles.fontStyle = 'bold';
            }
            if (row?.indicador === 'Lucro/Prejuízo Atual') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 11;
              if (data.column.index === 1) data.cell.styles.textColor = row.valor >= 0 ? [34, 197, 94] : [239, 68, 68];
            }
          }
        }
      });

      finalizeReportPDF(doc, 'ponto-equilibrio.pdf');
    } catch { alert('Erro ao gerar PDF.'); } finally { setPdfLoading(null); }
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
      fetchDesempenhoCategoria(),
      fetchRelatorioEventos(),
      fetchCMV(),
      fetchMovStock(),
      fetchStockBaixo(),
      fetchVendasFunc(),
      fetchHistSalarios(),
      fetchClientesFidel(),
      fetchDespEventos(),
      fetchDRE(),
      fetchPedCompras(),
      fetchFechDiario(),
      fetchAuditoria(),
      fetchNotasAGT(),
      fetchTicketMedio(),
      fetchPnLCompleto(),
      fetchImpostosPagar(),
      fetchFluxoCaixa(),
      fetchMargemReal(),
      fetchCustoPrime(),
      fetchPontoEquilibrio()
    ]);
    setLoading(false);
    setLastUpdate(new Date());
  };

  // Auto-carregar dados ao abrir
  useEffect(() => {
    loadAllCards();
  }, []);

  // Recarregar quando o filtro de datas mudar
  useEffect(() => {
    if (dateRange.start || dateRange.end) {
      loadAllCards();
    }
  }, [dateRange.start, dateRange.end]);

  // Atalhos de teclado: R=atualizar, E=exportar último PDF
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'r' || e.key === 'R') {
        loadAllCards();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Definição de todos os relatórios com categorias
  const allReports = useMemo(() => [
    { id: 'vendas', title: 'Vendas por Artigo', icon: <Package size={20} />, description: 'Soma de quantidades por produto', category: 'Vendas', data: vendasPorArtigo.data, loading: vendasPorArtigo.loading, onGenerate: fetchVendasPorArtigo, onGeneratePDF: generateVendasPorArtigoPDF, color: '#06b6d4', csvHeaders: ['Produto', 'Quantidade', 'Total'], csvFilename: 'vendas-por-artigo.csv' },
    { id: 'financas', title: 'Finanças Detalhadas', icon: <DollarSign size={20} />, description: 'Balanço de orders vs expenses', category: 'Financeiro', data: financasDetalhadas.data, loading: financasDetalhadas.loading, onGenerate: fetchFinancasDetalhadas, onGeneratePDF: generateFinancasDetalhadasPDF, color: '#10b981', csvHeaders: ['Tipo', 'Descrição', 'Categoria', 'Valor', 'Data'], csvFilename: 'balanco-financeiro.csv' },
    { id: 'rh', title: 'RH e Faltas', icon: <UserCheck size={20} />, description: 'Cálculo de descontos por faltas', category: 'RH', data: rhEFaltas.data, loading: rhEFaltas.loading, onGenerate: fetchRhEFaltas, onGeneratePDF: generateRhEFaltasPDF, color: '#f59e0b', csvHeaders: ['Funcionário', 'Cargo', 'Salário', 'Faltas', 'Desconto'], csvFilename: 'rh-e-faltas.csv' },
    { id: 'despesas', title: 'Mapa de Despesas', icon: <Activity size={20} />, description: 'Agrupamento por categoria', category: 'Financeiro', data: mapaDespesas.data, loading: mapaDespesas.loading, onGenerate: fetchMapaDespesas, onGeneratePDF: generateMapaDespesasPDF, color: '#ef4444', csvHeaders: ['Descrição', 'Categoria', 'Valor', 'Data'], csvFilename: 'mapa-despesas.csv' },
    { id: 'rentabilidade', title: 'Top Rentabilidade', icon: <Target size={20} />, description: 'Cálculo de margem bruta', category: 'Vendas', data: topRentabilidade.data, loading: topRentabilidade.loading, onGenerate: fetchTopRentabilidade, onGeneratePDF: generateTopRentabilidadePDF, color: '#8b5cf6', csvHeaders: ['Produto', 'Receita', 'Lucro', 'Margem'], csvFilename: 'top-rentabilidade.csv' },
    { id: 'fluxo', title: 'Fluxo por Turno', icon: <Clock size={20} />, description: 'Faturação por turno do dia', category: 'Operações', data: fluxoPorTurno.data, loading: fluxoPorTurno.loading, onGenerate: fetchFluxoPorTurno, onGeneratePDF: generateFluxoPorTurnoPDF, color: '#ec4899', csvHeaders: ['Turno', 'Total', 'Pedidos'], csvFilename: 'fluxo-por-turno.csv' },
    { id: 'mesas', title: 'Vendas por Mesa', icon: <Users size={20} />, description: 'Top mesas mais rentáveis', category: 'Vendas', data: vendasPorMesa.data, loading: vendasPorMesa.loading, onGenerate: fetchVendasPorMesa, onGeneratePDF: generateVendasPorMesaPDF, color: '#14b8a6', csvHeaders: ['Mesa', 'Pedidos', 'Total'], csvFilename: 'vendas-por-mesa.csv' },
    { id: 'pagamentos', title: 'Métodos de Pagamento', icon: <CreditCard size={20} />, description: 'Dinheiro vs Cartão vs Outros', category: 'Financeiro', data: metodosPagamento.data, loading: metodosPagamento.loading, onGenerate: fetchMetodosPagamento, onGeneratePDF: generateMetodosPagamentoPDF, color: '#f97316', csvHeaders: ['Método', 'Transações', 'Total'], csvFilename: 'metodos-pagamento.csv' },
    { id: 'horario', title: 'Horário de Pico', icon: <TrendingUp size={20} />, description: 'Análise de fluxo por hora', category: 'Operações', data: horarioPico.data, loading: horarioPico.loading, onGenerate: fetchHorarioPico, onGeneratePDF: generateHorarioPicoPDF, color: '#0ea5e9', csvHeaders: ['Hora', 'Pedidos', 'Total'], csvFilename: 'horario-pico.csv' },
    { id: 'categoria', title: 'Desempenho por Categoria', icon: <PieChart size={20} />, description: 'Vendas por categoria de produto', category: 'Vendas', data: desempenhoCategoria.data, loading: desempenhoCategoria.loading, onGenerate: fetchDesempenhoCategoria, onGeneratePDF: generateDesempenhoCategoriaPDF, color: '#8b5cf6', csvHeaders: ['Categoria', 'Itens', 'Total'], csvFilename: 'desempenho-categoria.csv' },
    { id: 'eventos', title: 'Relatório de Eventos', icon: <Calendar size={20} />, description: 'Eventos, pacotes e receita gerada', category: 'Operações', data: relatorioEventos.data, loading: relatorioEventos.loading, onGenerate: fetchRelatorioEventos, onGeneratePDF: generateRelatorioEventosPDF, color: '#d946ef', csvHeaders: ['Nome', 'Tipo', 'Status', 'Cliente', 'Data', 'Convidados', 'Valor'], csvFilename: 'relatorio-eventos.csv' },
    // LOTE 2 - NOVOS RELATÓRIOS
    { id: 'cmv', title: 'CMV - Custo de Mercadoria Vendida', icon: <Boxes size={20} />, description: 'Custo, receita e margem por produto', category: 'Financeiro', data: cmv.data, loading: cmv.loading, onGenerate: fetchCMV, onGeneratePDF: generateCMVPDF, color: '#0891b2', csvHeaders: ['Produto', 'Custo', 'Receita', 'Margem%'], csvFilename: 'cmv.csv' },
    { id: 'mov-stock', title: 'Movimentação de Stock', icon: <ClipboardList size={20} />, description: 'Entradas, saídas e ajustes de stock', category: 'Inventário', data: movStock.data, loading: movStock.loading, onGenerate: fetchMovStock, onGeneratePDF: generateMovStockPDF, color: '#6366f1', csvHeaders: ['Produto', 'Tipo', 'Qtd', 'Anterior', 'Novo', 'Data', 'Notas'], csvFilename: 'movimentacao-stock.csv' },
    { id: 'stock-baixo', title: 'Produtos com Stock Baixo', icon: <AlertTriangle size={20} />, description: 'Alertas de reposição de stock', category: 'Inventário', data: stockBaixo.data, loading: stockBaixo.loading, onGenerate: fetchStockBaixo, onGeneratePDF: generateStockBaixoPDF, color: '#dc2626', csvHeaders: ['Produto', 'Stock Atual', 'Stock Mínimo', 'SKU', 'Unidade'], csvFilename: 'stock-baixo.csv' },
    { id: 'vendas-func', title: 'Vendas por Funcionário', icon: <UserCheck size={20} />, description: 'Performance de vendas por colaborador', category: 'Vendas', data: vendasFunc.data, loading: vendasFunc.loading, onGenerate: fetchVendasFunc, onGeneratePDF: generateVendasFuncPDF, color: '#059669', csvHeaders: ['Funcionário', 'Cargo', 'Pedidos', 'Total Vendas'], csvFilename: 'vendas-por-funcionario.csv' },
    { id: 'hist-salarios', title: 'Histórico de Salários', icon: <Wallet size={20} />, description: 'Pagamentos de salários processados', category: 'RH', data: histSalarios.data, loading: histSalarios.loading, onGenerate: fetchHistSalarios, onGeneratePDF: generateHistSalariosPDF, color: '#7c3aed', csvHeaders: ['Funcionário', 'Mês', 'Base', 'Subsídios', 'Horas Extra', 'Descontos', 'Líquido', 'Status'], csvFilename: 'historico-salarios.csv' },
    { id: 'clientes-fidel', title: 'Clientes Fidelizados', icon: <Users size={20} />, description: 'Top clientes por visitas e pontos', category: 'Vendas', data: clientesFidel.data, loading: clientesFidel.loading, onGenerate: fetchClientesFidel, onGeneratePDF: generateClientesFidelPDF, color: '#db2777', csvHeaders: ['Nome', 'Telefone', 'Pontos', 'Visitas', 'Saldo', 'Última Visita'], csvFilename: 'clientes-fidelizados.csv' },
    { id: 'desp-eventos', title: 'Despesas e Receitas de Eventos', icon: <Calendar size={20} />, description: 'Rentabilidade real de eventos', category: 'Operações', data: despEventos.data, loading: despEventos.loading, onGenerate: fetchDespEventos, onGeneratePDF: generateDespEventosPDF, color: '#be185d', csvHeaders: ['Evento', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Pago'], csvFilename: 'despesas-eventos.csv' },
    { id: 'dre', title: 'DRE Simplificado', icon: <Scale size={20} />, description: 'Demonstração do Resultado do Exercício', category: 'Financeiro', data: dreSimpl.data, loading: dreSimpl.loading, onGenerate: fetchDRE, onGeneratePDF: generateDREPDF, color: '#16a34a', csvHeaders: ['Descrição', 'Valor'], csvFilename: 'dre-simplificado.csv' },
    { id: 'ped-compras', title: 'Pedidos de Compra', icon: <ShoppingCart size={20} />, description: 'Aprovações e estado de compras', category: 'Operações', data: pedCompras.data, loading: pedCompras.loading, onGenerate: fetchPedCompras, onGeneratePDF: generatePedComprasPDF, color: '#ea580c', csvHeaders: ['Descrição', 'Fornecedor', 'Valor', 'Status', 'Data', 'Notas'], csvFilename: 'pedidos-compra.csv' },
    { id: 'fech-diario', title: 'Fechamento Diário', icon: <FileCheck size={20} />, description: 'Histórico de dias fechados com faturação', category: 'Operações', data: fechDiario.data, loading: fechDiario.loading, onGenerate: fetchFechDiario, onGeneratePDF: generateFechDiarioPDF, color: '#0284c7', csvHeaders: ['Data', 'Pedidos', 'Faturação', 'Fechado às'], csvFilename: 'fechamento-diario.csv' },
    { id: 'auditoria', title: 'Auditoria de Sistema', icon: <FileText size={20} />, description: 'Registos de ações e alterações', category: 'Sistema', data: auditoria.data, loading: auditoria.loading, onGenerate: fetchAuditoria, onGeneratePDF: generateAuditoriaPDF, color: '#475569', csvHeaders: ['Utilizador', 'Ação', 'Módulo', 'Entidade', 'Data/Hora'], csvFilename: 'auditoria-sistema.csv' },
    { id: 'notas-agt', title: 'Notas Fiscais AGT', icon: <Receipt size={20} />, description: 'Documentos fiscais e status AGT', category: 'Sistema', data: notasAGT.data, loading: notasAGT.loading, onGenerate: fetchNotasAGT, onGeneratePDF: generateNotasAGTPDF, color: '#9333ea', csvHeaders: ['Fatura', 'Tipo', 'Status Doc', 'Status AGT', 'Total', 'Líquido', 'IVA', 'Data'], csvFilename: 'notas-fiscais-agt.csv' },
    { id: 'ticket-medio', title: 'Ticket Médio por Período', icon: <TrendingDown size={20} />, description: 'Valor médio por pedido por dia', category: 'Vendas', data: ticketMedio.data, loading: ticketMedio.loading, onGenerate: fetchTicketMedio, onGeneratePDF: generateTicketMedioPDF, color: '#0369a1', csvHeaders: ['Data', 'Pedidos', 'Faturação', 'Ticket Médio'], csvFilename: 'ticket-medio.csv' },
    // LOTE 3 - ANÁLISE FINANCEIRA AVANÇADA
    { id: 'pnl-completo', title: 'P&L - Demonstração de Resultados', icon: <Scale size={20} />, description: 'Receitas, custos, EBITDA e lucro líquido', category: 'Financeiro', data: pnlCompleto.data, loading: pnlCompleto.loading, onGenerate: fetchPnLCompleto, onGeneratePDF: generatePnLCompletoPDF, color: '#059669', csvHeaders: ['Seção', 'Descrição', 'Valor', '%'], csvFilename: 'pnl-completo.csv' },
    { id: 'impostos-pagar', title: 'Impostos a Pagar (AGT)', icon: <Receipt size={20} />, description: 'IVA, Imposto Industrial e retenções', category: 'Financeiro', data: impostosPagar.data, loading: impostosPagar.loading, onGenerate: fetchImpostosPagar, onGeneratePDF: generateImpostosPagarPDF, color: '#b91c1c', csvHeaders: ['Imposto', 'Base', 'Taxa', 'Valor', 'Observação'], csvFilename: 'impostos-a-pagar.csv' },
    { id: 'fluxo-caixa', title: 'Fluxo de Caixa Detalhado', icon: <Wallet size={20} />, description: 'Entradas, saídas e saldo consolidado', category: 'Financeiro', data: fluxoCaixa.data, loading: fluxoCaixa.loading, onGenerate: fetchFluxoCaixa, onGeneratePDF: generateFluxoCaixaPDF, color: '#0891b2', csvHeaders: ['Data', 'Tipo', 'Descrição', 'Método', 'Valor'], csvFilename: 'fluxo-caixa.csv' },
    { id: 'margem-real', title: 'Margem Real por Produto', icon: <Target size={20} />, description: 'Margem antes e depois do IVA', category: 'Financeiro', data: margemReal.data, loading: margemReal.loading, onGenerate: fetchMargemReal, onGeneratePDF: generateMargemRealPDF, color: '#7c3aed', csvHeaders: ['Produto', 'Qtd', 'P. Venda', 'Custo Unit', 'Receita', 'Custo', 'Lucro', 'Margem%', 'Após IVA%'], csvFilename: 'margem-real.csv' },
    { id: 'custo-prime', title: 'Custo Prime (Prime Cost)', icon: <Activity size={20} />, description: 'CMV + Pessoal — meta ≤60%', category: 'Financeiro', data: custoPrime.data, loading: custoPrime.loading, onGenerate: fetchCustoPrime, onGeneratePDF: generateCustoPrimePDF, color: '#ea580c', csvHeaders: ['Componente', 'Valor', '% Receita'], csvFilename: 'custo-prime.csv' },
    { id: 'ponto-equilibrio', title: 'Ponto de Equilíbrio (Break-Even)', icon: <TrendingUp size={20} />, description: 'Receita mínima para cobrir custos', category: 'Financeiro', data: pontoEquilibrio.data, loading: pontoEquilibrio.loading, onGenerate: fetchPontoEquilibrio, onGeneratePDF: generatePontoEquilibrioPDF, color: '#d97706', csvHeaders: ['Indicador', 'Valor', 'Observação'], csvFilename: 'ponto-equilibrio.csv' },
  ], [vendasPorArtigo, financasDetalhadas, rhEFaltas, mapaDespesas, topRentabilidade, fluxoPorTurno, vendasPorMesa, metodosPagamento, horarioPico, desempenhoCategoria, relatorioEventos, cmv, movStock, stockBaixo, vendasFunc, histSalarios, clientesFidel, despEventos, dreSimpl, pedCompras, fechDiario, auditoria, notasAGT, ticketMedio, pnlCompleto, impostosPagar, fluxoCaixa, margemReal, custoPrime, pontoEquilibrio]);

  // Filtrar relatórios por pesquisa
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return allReports;
    return allReports.filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allReports, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = allReports.length;
    const withData = allReports.filter(r => Array.isArray(r.data) && r.data.length > 0).length;
    const empty = total - withData;
    return { total, withData, empty };
  }, [allReports]);

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = [...new Set(allReports.map(r => r.category))];
    return cats;
  }, [allReports]);

  return (
    <div className="p-6 h-full overflow-y-auto no-scrollbar bg-background text-sm">
      {/* Header Modernizado */}
      <header className="mb-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                <FileText size={10} className="text-primary" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{stats.total} Relatórios</span>
              </div>
              {lastUpdate && (
                <span className="text-[10px] text-slate-600">
                  Atualizado: {lastUpdate.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Relatórios</h2>
            <p className="text-slate-500 text-xs mt-0.5">Sistema de relatórios e análises</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats pills */}
            <div className="hidden md:flex items-center gap-1.5">
              <div className="px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">{stats.withData} com dados</span>
              </div>
              {stats.empty > 0 && (
                <div className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{stats.empty} vazios</span>
                </div>
              )}
            </div>

            <button
              onClick={loadAllCards}
              disabled={loading}
              className="p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-400 hover:text-primary transition-all"
              title="Atualizar todos (R)"
              aria-label="Atualizar todos os relatórios"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pesquisa */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar relatório..."
              className="w-full pl-9 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-primary/30 transition-all"
              aria-label="Pesquisar relatório"
            />
          </div>

          {/* Date pickers */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-primary/30 transition-all"
            aria-label="Data inicial"
            title="Data inicial"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-primary/30 transition-all"
            aria-label="Data final"
            title="Data final"
          />

          <button
            onClick={loadAllCards}
            disabled={loading}
            className="px-4 py-2.5 bg-primary text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black" />
            ) : (
              <BarChart3 size={14} />
            )}
            Atualizar
          </button>
        </div>
      </header>

      {/* Categorias */}
      {categories.map(cat => {
        const catReports = filteredReports.filter(r => r.category === cat);
        if (catReports.length === 0) return null;

        return (
          <div key={cat} className="mb-6">
            {/* Categoria header */}
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{cat}</h3>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] font-bold text-slate-600">{catReports.length}</span>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catReports.map((report) => (
                <Card key={report.id} report={report} pdfLoading={pdfLoading} formatKz={formatKz} exportToCSV={exportToCSV} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty search results */}
      {filteredReports.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
            <Search size={28} className="text-slate-600" />
          </div>
          <p className="text-sm font-bold text-slate-500">Nenhum relatório encontrado</p>
          <p className="text-xs text-slate-600 mt-1">Tente pesquisar por outro termo</p>
        </div>
      )}
    </div>
  );
};

export default Reports;

// Skeleton component
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

// Card component - memoized to prevent re-renders when other cards' data changes
const Card = React.memo(({ report, pdfLoading, formatKz, exportToCSV }: {
  report: any;
  pdfLoading: string | null;
  formatKz: (value: number) => string;
  exportToCSV: (data: any[], filename: string, headers: string[]) => void;
}) => {
  const { title, icon, description, data, loading, onGenerate, onGeneratePDF, color, category, csvHeaders, csvFilename } = report;
  const hasData = Array.isArray(data) && data.length > 0;
  const previewItems = hasData ? data.slice(0, 3) : [];

  return (
    <div
      className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-white/15 hover:bg-white/[0.05] transition-colors group overflow-hidden"
    >
      {/* Gradient accent top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" ref={(el) => { if (el) { el.style.background = `linear-gradient(to right, ${color}, transparent)`; } }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            ref={(el) => { if (el) { el.style.backgroundColor = `${color}15`; el.style.color = color; } }}
          >
            {React.cloneElement(icon, { size: 18 })}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-white truncate uppercase tracking-wider">{title}</h3>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md" ref={(el) => { if (el) { el.style.backgroundColor = `${color}10`; el.style.color = color; } }}>{category}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">{description}</p>

      {/* Body */}
      {loading ? (
        <div className="space-y-2 mb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : hasData ? (
        <div className="space-y-1.5 mb-3">
          {/* Preview top 3 */}
          {previewItems.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px] py-1 px-2 bg-white/[0.02] rounded-lg">
              <span className="text-slate-400 truncate max-w-[60%]">
                {item.produto || item.descricao || item.funcionario || item.turno || item.mesa || item.metodo || item.hora || item.categoria || item.nome || '—'}
              </span>
              <span className="text-slate-300 font-bold shrink-0">
                {item.total != null ? formatKz(item.total) :
                 item.valor != null ? formatKz(Math.abs(item.valor)) :
                 item.receita != null ? formatKz(item.receita) :
                 item.margem != null ? `${item.margem}%` :
                 item.faltas != null ? `${item.faltas} faltas` :
                 item.pedidos != null ? `${item.pedidos} pedidos` :
                 item.quantidade != null ? `${item.quantidade} un` : '—'}
              </span>
            </div>
          ))}
          {data.length > 3 && (
            <p className="text-[9px] text-slate-600 text-center pt-1">+{data.length - 3} mais registos</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 mb-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-2">
            {React.cloneElement(icon, { size: 20, className: 'text-slate-600' })}
          </div>
          <p className="text-[10px] font-bold text-slate-500">Sem dados disponíveis</p>
          <p className="text-[9px] text-slate-600 mt-0.5">Clique em "Gerar" para buscar</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={onGenerate}
          className="flex-1 py-2 bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1"
        >
          <BarChart3 size={12} />
          Gerar
        </button>

        <button
          onClick={onGeneratePDF}
          disabled={pdfLoading !== null || !hasData}
          className="py-2 px-2.5 bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Exportar PDF"
          aria-label={`Exportar ${title} em PDF`}
        >
          {pdfLoading === report.id ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
          ) : (
            <FileDown size={12} />
          )}
        </button>

        <button
          onClick={() => hasData && exportToCSV(data, csvFilename, csvHeaders)}
          disabled={!hasData}
          className="py-2 px-2.5 bg-white/[0.05] border border-white/[0.08] text-slate-300 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Exportar CSV"
          aria-label={`Exportar ${title} em CSV`}
        >
          <Download size={12} />
        </button>
      </div>
    </div>
  );
});
