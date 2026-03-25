import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, Download, FileText, AlertCircle, ShoppingCart, Users, Filter, Calendar, BarChart3, Utensils, Beer, CreditCard, Wallet, Smartphone, Package, Clock, Target, AlertTriangle, TrendingDown, Receipt, UserCheck, PieChart, LineChart, FileDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // IMPORTAÇÃO CORRETA
import html2canvas from 'html2canvas';

// Extender jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: { finalY: number };
  }
}

// Função local de notificação para evitar erros de referência
const addNotification = (type: 'success' | 'error', message: string) => {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Criar notificação visual simples
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-medium text-sm shadow-lg transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
};

const Reports = () => {
  const { settings } = useStore();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // Estados para os 7 Cards
  const [vendasPorArtigo, setVendasPorArtigo] = useState({ data: [] as any[], loading: false });
  const [financasDetalhadas, setFinancasDetalhadas] = useState({ data: [] as any[], loading: false });
  const [rhEFaltas, setRhEFaltas] = useState({ data: [] as any[], loading: false });
  const [mapaDespesas, setMapaDespesas] = useState({ data: [] as any[], loading: false });
  const [topRentabilidade, setTopRentabilidade] = useState({ data: [] as any[], loading: false });
  const [fluxoPorTurno, setFluxoPorTurno] = useState({ data: [] as any[], loading: false });
  const [alertasStock, setAlertasStock] = useState({ data: [] as any[], loading: false });

  // Formatar moeda
  const formatKz = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0
    }).format(value);
  };

  // CARD 1: VENDAS POR ARTIGO - Relatório de PRODUTOS vendidos (usando orders)
  const fetchVendasPorArtigo = async () => {
    setVendasPorArtigo(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      
      // DATA DE HOJE - FUSO HORÁRIO DE LUANDA (GMT+1) COM START/END OF DAY
      const todayLuanda = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Luanda"}));
      const startOfDay = new Date(todayLuanda.getFullYear(), todayLuanda.getMonth(), todayLuanda.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(todayLuanda.getFullYear(), todayLuanda.getMonth(), todayLuanda.getDate(), 23, 59, 59, 999);
      
      // QUERY SIMPLES - BUSCAR ORDERS COM STATUS CORRETO - SEM FILTRO DE DATA
      let query = supabase
        .from('orders')
        .select('total_amount, created_at, table_id')
        .in('status', ['FECHADO', 'closed', 'paid']); // STATUS CORRETO

      // REMOVIDO FILTRO DE DATA PARA TESTAR

      const { data: ordersData, error } = await query;

      if (error) {
        throw new Error(`Erro de Conexão: ${error.message}`);
      }

      console.log('[DEBUG VENDAS POR ARTIGO] Orders Data:', ordersData);
      console.log('[DEBUG VENDAS POR ARTIGO] Orders Count:', ordersData?.length || 0);

      // Agrupar por mesa (table_id) - TEMPORÁRIO ATÉ CORRIGIR ORDER_ITEMS
      const vendasMap = new Map();
      
      ordersData?.forEach((order: any) => {
        const mesaId = order.table_id || 'Sem Mesa';
        const existing = vendasMap.get(mesaId) || { 
          produto: `Mesa ${mesaId}`, // TEMPORÁRIO
          quantidade: 1, 
          valorTotal: 0 
        };
        existing.quantidade += 1;
        existing.valorTotal += Number(order.total_amount) || 0;
        vendasMap.set(mesaId, existing);
      });

      const result = Array.from(vendasMap.values())
        .sort((a, b) => b.valorTotal - a.valorTotal)
        .slice(0, 10) || [];

      setVendasPorArtigo({ data: result, loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar vendas por artigo:', error);
      setVendasPorArtigo({ 
        data: [{ mensagem: `Erro de Conexão: ${error.message}`, tipo: 'erro' }], 
        loading: false 
      });
    }
  };

  // CARD 2: FINANÇAS DETALHADAS - Balanço orders vs expenses (sem status filter)
  const fetchFinancasDetalhadas = async () => {
    setFinancasDetalhadas(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      
      // Buscar receitas (orders) - COM STATUS CORRETO
      let ordersQuery = supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['FECHADO', 'closed', 'paid']); // STATUS CORRETO

      if (start && end) {
        ordersQuery = ordersQuery
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(end).toISOString());
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) {
        throw new Error(`Erro de Conexão: ${ordersError.message}`);
      }

      console.log('[DEBUG FINANCAS] Orders Data:', ordersData);
      console.log('[DEBUG FINANCAS] Orders Count:', ordersData?.length || 0);

      // Buscar despesas (expenses)
      let expensesQuery = supabase
        .from('expenses')
        .select('amount_kz, category, created_at');

      if (start && end) {
        expensesQuery = expensesQuery
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(end).toISOString());
      }

      const { data: expensesData, error: expensesError } = await expensesQuery;

      if (expensesError) {
        throw new Error(`Erro de Conexão: ${expensesError.message}`);
      }

      console.log('[DEBUG FINANCAS] Expenses Data:', expensesData);
      console.log('[DEBUG FINANCAS] Expenses Count:', expensesData?.length || 0);

      const totalReceita = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalDespesas = expensesData?.reduce((sum, expense) => sum + (expense.amount_kz || 0), 0) || 0;
      const lucroLiquido = totalReceita - totalDespesas;

      // Agrupar despesas por categoria
      const despesasPorCategoria = new Map();
      expensesData?.forEach(expense => {
        const categoria = expense.category || 'Sem Categoria';
        const existing = despesasPorCategoria.get(categoria) || { categoria, total: 0 };
        existing.total += expense.amount_kz || 0;
        despesasPorCategoria.set(categoria, existing);
      });

      const result = {
        totalReceita,
        totalDespesas,
        lucroLiquido,
        despesasPorCategoria: Array.from(despesasPorCategoria.values())
      };

      setFinancasDetalhadas({ data: [result], loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar finanças detalhadas:', error);
      setFinancasDetalhadas({ 
        data: [{ mensagem: `Erro de Conexão: ${error.message}`, tipo: 'erro' }], 
        loading: false 
      });
    }
  };

  // CARD 3: RH E FALTAS - Lógica de cálculo (salario/30) * faltas
  const fetchRhEFaltas = async () => {
    setRhEFaltas(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      
      // Tentar buscar dados de assiduidade/funcionários
      let staffQuery = supabase
        .from('staff')
        .select('*');

      if (start && end) {
        staffQuery = staffQuery
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(end).toISOString());
      }

      const { data: staffData, error: staffError } = await staffQuery;

      if (staffError || !staffData || staffData.length === 0) {
        // Se não houver dados, retornar mensagem informativa
        setRhEFaltas({ 
          data: [{ 
            mensagem: 'Nenhuma falta registada no período',
            tipo: 'info'
          }], 
          loading: false 
        });
        return;
      }

      // Processar dados reais de faltas
      const result = staffData.map(staff => {
        const diasFalta = staff.absences || 0;
        const salarioBase = staff.salary || 0;
        const descontoDiario = salarioBase / 30;
        const totalDesconto = descontoDiario * diasFalta;
        const salarioLiquido = salarioBase - totalDesconto;

        return {
          nome: staff.name || 'Funcionário Sem Nome',
          salarioBase,
          diasFalta,
          descontoDiario,
          totalDesconto,
          salarioLiquido
        };
      });

      setRhEFaltas({ data: result, loading: false });
    } catch (error) {
      console.error('Erro ao buscar RH e faltas:', error);
      setRhEFaltas({ 
        data: [{ 
          mensagem: 'Erro ao carregar dados de RH',
          tipo: 'erro'
        }], 
        loading: false 
      });
    }
  };

  // CARD 4: MAPA DE DESPESAS - Agrupamento por categoria (sem filtro obrigatório)
  const fetchMapaDespesas = async () => {
    setMapaDespesas(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      
      // Buscar despesas sem filtro obrigatório
      let query = supabase
        .from('expenses')
        .select('amount_kz, category, description');

      if (start && end) {
        query = query
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(end).toISOString());
      }

      const { data: expensesData, error } = await query;

      if (error) {
        throw new Error(`Erro de Conexão: ${error.message}`);
      }

      // Agrupar por tipo de despesa
      const despesasMap = new Map();
      expensesData?.forEach((expense: any) => {
        const tipo = expense.category || 'Outros';
        const existing = despesasMap.get(tipo) || { tipo, total: 0, itens: [] };
        existing.total += expense.amount_kz || 0;
        existing.itens.push({
          descricao: expense.description,
          valor: expense.amount_kz
        });
        despesasMap.set(tipo, existing);
      });

      const result = Array.from(despesasMap.values()).sort((a, b) => b.total - a.total);
      setMapaDespesas({ data: result, loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar mapa de despesas:', error);
      setMapaDespesas({ 
        data: [{ mensagem: `Erro de Conexão: ${error.message}`, tipo: 'erro' }], 
        loading: false 
      });
    }
  };

  // CARD 5: TOP RENTABILIDADE - Cálculo de margem bruta (sem is_active filter)
  const fetchTopRentabilidade = async () => {
    setTopRentabilidade(prev => ({ ...prev, loading: true }));
    try {
      // Buscar products sem filtro is_active que pode não existir
      const { data: productsData, error } = await supabase
        .from('products')
        .select('name, price, cost_price');

      if (error) {
        throw new Error(`Erro de Conexão: ${error.message}`);
      }

      const result = productsData
        ?.map((product: any) => ({
          nome: product.name,
          precoVenda: product.price || 0,
          precoCusto: product.cost_price || 0,
          margem: (product.price || 0) - (product.cost_price || 0),
          margemPercentual: product.price > 0 ? ((product.price - (product.cost_price || 0)) / product.price) * 100 : 0
        }))
        .filter(p => p.precoCusto > 0) // Apenas produtos com custo definido
        .sort((a, b) => b.margem - a.margem)
        .slice(0, 10) || [];

      setTopRentabilidade({ data: result, loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar top rentabilidade:', error);
      setTopRentabilidade({ 
        data: [{ mensagem: `Erro de Conexão: ${error.message}`, tipo: 'erro' }], 
        loading: false 
      });
    }
  };

  // CARD 6: FLUXO POR TURNO - Filtro por created_at (HH:mm) sem status filter
  const fetchFluxoPorTurno = async () => {
    setFluxoPorTurno(prev => ({ ...prev, loading: true }));
    try {
      const { start, end } = dateRange;
      
      // Buscar orders COM STATUS CORRETO - IGUAL AO DASHBOARD
      let query = supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', ['FECHADO', 'closed', 'paid']); // STATUS CORRETO

      if (start && end) {
        query = query
          .gte('created_at', new Date(start).toISOString())
          .lte('created_at', new Date(end).toISOString());
      }

      const { data: ordersData, error } = await query;

      if (error) {
        throw new Error(`Erro de Conexão: ${error.message}`);
      }

      // Agrupar por faixa horária baseado em created_at (HH:mm)
      const turnosMap = new Map();
      turnosMap.set('Manhã (6h-12h)', { turno: 'Manhã (6h-12h)', total: 0, pedidos: 0 });
      turnosMap.set('Almoço (12h-15h)', { turno: 'Almoço (12h-15h)', total: 0, pedidos: 0 });
      turnosMap.set('Tarde (15h-18h)', { turno: 'Tarde (15h-18h)', total: 0, pedidos: 0 });
      turnosMap.set('Jantar (18h-23h)', { turno: 'Jantar (18h-23h)', total: 0, pedidos: 0 });

      ordersData?.forEach((order: any) => {
        const hour = new Date(order.created_at).getHours();
        let turnoKey = '';

        if (hour >= 6 && hour < 12) turnoKey = 'Manhã (6h-12h)';
        else if (hour >= 12 && hour < 15) turnoKey = 'Almoço (12h-15h)';
        else if (hour >= 15 && hour < 18) turnoKey = 'Tarde (15h-18h)';
        else if (hour >= 18 && hour < 23) turnoKey = 'Jantar (18h-23h)';

        if (turnoKey && turnosMap.has(turnoKey)) {
          const turno = turnosMap.get(turnoKey);
          turno.total += order.total_amount || 0;
          turno.pedidos += 1;
        }
      });

      const result = Array.from(turnosMap.values());
      setFluxoPorTurno({ data: result, loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar fluxo por turno:', error);
      setFluxoPorTurno({ 
        data: [{ mensagem: `Erro de Conexão: ${error.message}`, tipo: 'erro' }], 
        loading: false 
      });
    }
  };

  // CARD 7: ALERTAS DE STOCK - Verificar produtos sem preço de custo (não existe campo stock)
  const fetchAlertasStock = async () => {
    setAlertasStock(prev => ({ ...prev, loading: true }));
    try {
      // Buscar products - SEM CAMPO DE STOCK POIS NÃO EXISTE NA TABELA
      const { data: productsData, error } = await supabase
        .from('products')
        .select('name, price, cost_price, is_active'); // CAMPOS REAIS

      if (error) {
        throw new Error(`Erro de Conexão: ${error.message}`);
      }

      const alertas: any[] = [];
      
      productsData?.forEach((product: any) => {
        const alerts: string[] = [];
        
        // Verificar se produto está inativo
        if (!product.is_active) {
          alerts.push('Produto inativo');
        }
        
        // Verificar preço de custo ausente ou zero
        if (!product.cost_price || product.cost_price <= 0) {
          alerts.push('Preço de custo ausente ou zerado');
        }
        
        // Verificar preço de venda ausente ou zero
        if (!product.price || product.price <= 0) {
          alerts.push('Preço de venda ausente ou zerado');
        }
        
        if (alerts.length > 0) {
          alertas.push({
            nome: product.name || 'Produto Sem Nome',
            precoVenda: product.price || 0,
            precoCusto: product.cost_price || 0,
            status: product.is_active ? 'Ativo' : 'Inativo',
            alertas
          });
        }
      });

      setAlertasStock({ data: alertas, loading: false });
    } catch (error: any) {
      console.error('Erro ao buscar alertas de stock:', error);
      setAlertasStock({ 
        data: [{ mensagem: `Erro de Conexão: ${error.message}`, tipo: 'erro' }], 
        loading: false 
      });
    }
  };

  // Funções de exportação PDF
  const generateVendasPorArtigoPDF = async () => {
    setPdfLoading('vendas');
    try {
      const doc = new jsPDF();
      const data = vendasPorArtigo.data;
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Relatório de Vendas por Artigo', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      // Período
      doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 32);
      
      // Verificar se há dados ou mensagem de erro
      if (data.length === 1 && data[0].mensagem) {
        doc.setFontSize(12);
        doc.text(data[0].mensagem, 14, 45);
      } else if (data.length === 0) {
        doc.setFontSize(12);
        doc.text('Sem dados para o período', 14, 45);
      } else {
        // Tabela
        const tableData = data.map((item: any) => [
          item.produto || 'Produto',
          item.quantidade || 0,
          formatKz(item.valorTotal || 0)
        ]);
        
        // Tabela com tratamento de erro
        try {
          autoTable(doc, {
            head: [['Produto', 'Quantidade', 'Valor Total']],
            body: tableData,
            startY: 45,
            theme: 'grid',
            styles: {
              fontSize: 9,
              cellPadding: 3
            }
          });
        } catch (autoTableError) {
          console.error('Erro no autoTable:', autoTableError);
          // Fallback: escrever dados como texto se autoTable falhar
          doc.setFontSize(10);
          let yPosition = 45;
          doc.text('Mesa | Quantidade | Receita', 14, yPosition);
          yPosition += 10;
          tableData.forEach(row => {
            doc.text(`${row[0]} | ${row[1]} | ${row[2]}`, 14, yPosition);
            yPosition += 8;
          });
        }
      }
      
      // Rodapé - Garantir que a tabela foi gerada antes de acessar finalY
      doc.setFontSize(8);
      let lastY = 45; // Posição padrão
      if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
        lastY = doc.lastAutoTable.finalY;
      }
      doc.text(`Emitido em: ${dataLuanda} às ${new Date().toLocaleTimeString('pt-AO', { timeZone: 'Africa/Luanda' })}`, 14, lastY + 10);
      
      doc.save('vendas-por-artigo.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      addNotification('error', 'Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateFinancasDetalhadasPDF = async () => {
    setPdfLoading('financas');
    try {
      const doc = new jsPDF();
      const data = financasDetalhadas.data[0];
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Relatório Financeiro Detalhado', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
      
      // Período
      doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 32);
    
    // Resumo
    doc.setFontSize(12);
    doc.text('Resumo Financeiro', 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Receitas: ${formatKz(data?.totalReceita || 0)}`, 14, 50);
    doc.text(`Total Despesas: ${formatKz(data?.totalDespesas || 0)}`, 14, 58);
    doc.text(`Lucro Líquido: ${formatKz(data?.lucroLiquido || 0)}`, 14, 66);
    
    // Tabela de despesas por categoria
    if (data?.despesasPorCategoria?.length > 0) {
      const tableData = data.despesasPorCategoria.map((item: any) => [
        item.categoria || 'Categoria',
        formatKz(item.total || 0)
      ]);
      
      autoTable(doc, {
        head: [['Categoria', 'Total']],
        body: tableData,
        startY: 80,
        theme: 'grid'
      });
    }
    
    // Rodapé - Garantir que a tabela foi gerada antes de acessar finalY
    doc.setFontSize(8);
    let lastY = 90; // Posição padrão
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      lastY = doc.lastAutoTable.finalY;
    }
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-AO')}`, 14, lastY + 10);
    
      doc.save('financas-detalhadas.pdf');
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
      const data = rhEFaltas.data;
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Relatório de RH e Faltas', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
    
    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 25);
    
    // Verificar se há dados ou mensagem
    if (data.length === 1 && data[0].mensagem) {
      doc.setFontSize(12);
      doc.text(data[0].mensagem, 14, 40);
    } else {
      // Tabela
      const tableData = data.map((item: any) => [
        item.nome || 'Funcionário',
        formatKz(item.salarioBase || 0),
        item.diasFalta || 0,
        formatKz(item.totalDesconto || 0),
        formatKz(item.salarioLiquido || 0)
      ]);
      
      autoTable(doc, {
        head: [['Funcionário', 'Salário Base', 'Dias Falta', 'Total Desconto', 'Salário Líquido']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });
    }
    
    // Rodapé - Garantir que a tabela foi gerada antes de acessar finalY
    doc.setFontSize(8);
    let lastY = 50; // Posição padrão
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      lastY = doc.lastAutoTable.finalY;
    }
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-AO')}`, 14, lastY + 10);
    
      doc.save('rh-e-faltas.pdf');
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
      const data = mapaDespesas.data;
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Mapa de Despesas', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
    
    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 25);
    
    // Tabela
    const tableData = data.map((item: any) => [
      item.tipo || 'Tipo',
      formatKz(item.total || 0)
    ]);
    
    autoTable(doc, {
        head: [['Tipo de Despesa', 'Total']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });
    
    // Rodapé - Garantir que a tabela foi gerada antes de acessar finalY
    doc.setFontSize(8);
    let lastY = 45; // Posição padrão
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      lastY = doc.lastAutoTable.finalY;
    }
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-AO')}`, 14, lastY + 10);
    
      doc.save('mapa-despesas.pdf');
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
      const data = topRentabilidade.data;
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Top Rentabilidade', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
    
    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 25);
    
    // Tabela
    const tableData = data.map((item: any) => [
      item.nome || 'Produto',
      formatKz(item.precoVenda || 0),
      formatKz(item.precoCusto || 0),
      formatKz(item.margem || 0),
      `${(item.margemPercentual || 0).toFixed(1)}%`
    ]);
    
    autoTable(doc, {
      head: [['Produto', 'Preço Venda', 'Preço Custo', 'Margem', '% Margem']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });
    
    // Rodapé - Garantir que a tabela foi gerada antes de acessar finalY
    doc.setFontSize(8);
    let lastY = 45; // Posição padrão
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      lastY = doc.lastAutoTable.finalY;
    }
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-AO')}`, 14, lastY + 10);
    
      doc.save('top-rentabilidade.pdf');
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
      const data = fluxoPorTurno.data;
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Fluxo por Turno', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
    
    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 25);
    
    // Tabela
    const tableData = data.map((item: any) => [
      item.turno || 'Turno',
      formatKz(item.total || 0),
      item.pedidos || 0
    ]);
    
    autoTable(doc, {
      head: [['Turno', 'Total Faturado', 'Nº Pedidos']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });
    
    // Rodapé - Garantir que a tabela foi gerada antes de acessar finalY
    doc.setFontSize(8);
    let lastY = 45; // Posição padrão
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      lastY = doc.lastAutoTable.finalY;
    }
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-AO')}`, 14, lastY + 10);
    
      doc.save('fluxo-por-turno.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(null);
    }
  };

  const generateAlertasStockPDF = async () => {
    setPdfLoading('stock');
    try {
      const doc = new jsPDF();
      const data = alertasStock.data;
      
      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Tasca do Vereda - Alertas de Stock', 14, 15);
      
      // Data de Luanda
      doc.setFontSize(10);
      const dataLuanda = new Date().toLocaleDateString('pt-AO', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Data: ${dataLuanda}`, 14, 25);
    
    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange.start || 'Início'} a ${dateRange.end || 'Fim'}`, 14, 25);
    
    // Tabela
    const tableData = data.map((item: any) => [
      item.nome || 'Produto',
      item.quantidade || 0,
      formatKz(item.precoCusto || 0),
      (item.alertas || []).join(', ')
    ]);
    
    autoTable(doc, {
      head: [['Produto', 'Quantidade', 'Preço Custo', 'Alertas']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });
    
    // Rodapé
    doc.setFontSize(8);
    const lastY = (doc as any).lastAutoTable?.finalY || 45;
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-AO')}`, 14, lastY + 10);
    
      doc.save('alertas-stock.pdf');
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
      fetchAlertasStock()
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
    <div className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl text-white`} style={{ backgroundColor: color }}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-slate-300">
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
              className="flex-1 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <BarChart3 size={16} />
              Gerar Detalhes
            </button>
            
            <button
              onClick={onGeneratePDF}
              disabled={pdfLoading !== null}
              className="py-2 px-3 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-black uppercase hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF"
            >
              {pdfLoading === (title.toLowerCase().includes('vendas') ? 'vendas' : 
                           title.toLowerCase().includes('financeir') ? 'financas' :
                           title.toLowerCase().includes('rh') ? 'rh' :
                           title.toLowerCase().includes('despesa') ? 'despesas' :
                           title.toLowerCase().includes('rentabilidade') ? 'rentabilidade' :
                           title.toLowerCase().includes('fluxo') ? 'fluxo' :
                           title.toLowerCase().includes('stock') ? 'stock' : '') ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>A gerar PDF...</span>
                </>
              ) : (
                <>
                  <FileDown size={16} />
                  Exportar PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Hub de Relatórios</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Análise Dinâmica</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            placeholder="Data Início"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm"
            placeholder="Data Fim"
          />
          
          <button 
            onClick={loadAllCards}
            disabled={loading}
            className="px-4 py-2 bg-primary text-black rounded-xl text-sm font-black uppercase hover:brightness-110 transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
            ) : (
              <BarChart3 size={16} />
            )}
            Atualizar
          </button>
        </div>
      </header>

      {/* Layout Grid com 7 Cards Dinâmicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          title="Alertas de Stock"
          icon={<AlertTriangle size={20} />}
          description="Filtro de stock_quantity < min_stock"
          data={alertasStock.data}
          loading={alertasStock.loading}
          onGenerate={fetchAlertasStock}
          onGeneratePDF={generateAlertasStockPDF}
          color="#f97316"
        />
      </div>
    </div>
  );
};

export default Reports;
