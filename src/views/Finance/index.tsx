import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../supabase_standalone';
import { useSyncCore } from '../../hooks/useSyncCore';
import { calculateDataContabil } from '../../lib/dateUtils';
import { 
  TrendingUp, DollarSign, Banknote, LayoutDashboard, History, PiggyBank,
  Printer, ShieldCheck, FileText, Lock, Database, Search, Download, 
  ArrowUpRight, PieChart, BarChart as BarChartIcon, Activity, Loader2,
  CreditCard, ArrowRightLeft, QrCode, Plus, Trash2, Edit2, Check,
  Filter, CalendarDays, ArrowDown, ArrowUp
} from 'lucide-react';
import { printThermalInvoice } from '../../lib/printService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateSAFT, downloadSAFT } from '../../lib/saftService';
import { PaymentMethodConfig, Expense, ExpenseCategory, ExpenseStatus } from '../../../types';
import { formatKz, getCategoryColor, getStatusColor } from './utils';
import type { FinanceOrder } from './types';
import AGTDocumentsTab from './AGTDocumentsTab';


const Finance = () => {
  const { activeOrders, settings, menu, customers, addNotification, paymentConfigs, addPaymentConfig, updatePaymentConfig, expenses, addExpense, updateExpense, removeExpense, approveExpense } = useStore();
  
  // 🔥 CORREÇÃO: Usar useSyncCore como fonte de dados principal (igual ao Dashboard)
  const syncCore = useSyncCore();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALES' | 'AUDIT' | 'LEGAL' | 'CONFIG' | 'EXPENSES' | 'DOCUMENTS'>('OVERVIEW');
  const [saftLoading, setSaftLoading] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<any[]>([]); // DADOS REAIS DO SUPABASE
  const [expensesFromDB, setExpensesFromDB] = useState<any[]>([]); // DADOS DAS DESPESAS DO SUPABASE
  const [totalExpensesFromDB, setTotalExpensesFromDB] = useState<number>(0); // TOTAL DAS DESPESAS
  
  // Filtros de despesas
  const [expensePeriod, setExpensePeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [expenseCustomFrom, setExpenseCustomFrom] = useState('');
  const [expenseCustomTo, setExpenseCustomTo] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('ALL');
  const [expenseSortDir, setExpenseSortDir] = useState<'desc' | 'asc'>('desc');
  
  // Estados para despesas - RESTAURADOS
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>({
    description: '',
    amount: 0,
    category: 'OUTROS' as ExpenseCategory,
    status: 'PENDENTE',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [newPayment, setNewPayment] = useState<Omit<PaymentMethodConfig, 'id'>>({
    name: '',
    type: 'NUMERARIO',
    icon: 'Banknote',
    isActive: true
  });
  
  // Função para buscar despesas do Supabase
  const fetchTotalExpensesFromDB = async () => {
    try {
      // VALOR PADRÃO SEGURO - EVITAR TELA PRETA
      setExpensesFromDB([]);
      setTotalExpensesFromDB(0);

      // Buscar despesas da tabela expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expensesError) {
        console.error('[FINANCE] Erro ao buscar despesas:', expensesError);
      }

      // Buscar despesas da tabela cash_flow (type='saida' ou 'saída')
      const { data: cashFlowData, error: cashFlowError } = await supabase
        .from('cash_flow')
        .select('*')
        .in('type', ['saida', 'saída'])
        .order('created_at', { ascending: false });

      if (cashFlowError) {
        console.error('[FINANCE] Erro ao buscar cash_flow:', cashFlowError);
      }

      // TRATAMENTO SEGURO DE DADOS - EVITAR NULL/UNDEFINED
      const expenses = Array.isArray(expensesData) ? expensesData : [];
      const cashFlow = Array.isArray(cashFlowData) ? cashFlowData : [];
      
      // Combinar ambas as fontes de despesas (igual ao useSyncCore)
      const totalExpenses = expenses.reduce((sum, exp) => {
        const amount = exp?.amount_kz || exp?.amount || 0;
        return sum + (Number(amount) || 0);
      }, 0);
      
      const totalCashFlow = cashFlow.reduce((sum, cf) => {
        const amount = cf?.amount || 0;
        return sum + (Number(amount) || 0);
      }, 0);
      
      const total = totalExpenses + totalCashFlow;
      
      // Combinar arrays para exibição
      const combinedExpenses = [
        ...expenses,
        ...cashFlow.map(cf => ({
          ...cf,
          amount_kz: cf.amount,
          source: 'cash_flow'
        }))
      ];
      
      // ATUALIZAR ESTADO APENAS COM DADOS VÁLIDOS
      setExpensesFromDB(combinedExpenses);
      setTotalExpensesFromDB(total);
      
    } catch (error) {
      console.error('[FINANCE] Erro crítico ao buscar despesas:', error);
      // MANTER VALORES PADRÃO - NÃO DEIXAR TELA PRETA
      setExpensesFromDB([]);
      setTotalExpensesFromDB(0);
    }
  };

  // Carregar dados do Supabase - MESMA QUERY DO PROFIT CENTER
  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        setLoading(true);
        
        // Buscar ordens fechadas de hoje - usar data_contabil (igual ao SyncCore)
        const hojeString = calculateDataContabil(new Date());

        const { data: orders, error } = await supabase
          .from('orders')
          .select('payment_method, total_amount, created_at, data_contabil')
          .in('status', ['closed', 'paid'])
          .eq('data_contabil', hojeString)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[FINANCEIRO] Erro ao buscar ordens:', error);
          throw error;
        }

        setOrdersData(orders || []);

        // Buscar despesas do Supabase
        await fetchTotalExpensesFromDB();

      } catch (error) {
        console.error('[FINANCEIRO] Erro ao carregar dados:', error);
        addNotification('error', 'Falha ao carregar dados financeiros');
      } finally {
        setLoading(false);
      }
    };

    loadFinanceData();
  }, [addNotification]);

  const closedOrders = useMemo(() => activeOrders.filter(o => ['closed', 'paid'].includes(o.status)), [activeOrders]);
  const today = new Date().toISOString().split('T')[0]; // 🔥 CORREÇÃO: Usar formato ISO simples

  // Filtro de despesas por período, categoria, busca e ordenação
  const filteredExpenses = useMemo(() => {
    let result = [...(expensesFromDB || [])];
    
    // Filtro por período
    if (expensePeriod !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;
      
      switch (expensePeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 86400000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          startDate = expenseCustomFrom ? new Date(expenseCustomFrom) : new Date(0);
          endDate = expenseCustomTo ? new Date(expenseCustomTo + 'T23:59:59') : now;
          break;
        default:
          startDate = new Date(0);
      }
      
      result = result.filter(exp => {
        const expDate = new Date(exp?.created_at || 0);
        return expDate >= startDate && expDate <= endDate;
      });
    }
    
    // Filtro por categoria
    if (expenseCategoryFilter !== 'ALL') {
      result = result.filter(exp => (exp?.category || 'OUTROS') === expenseCategoryFilter);
    }
    
    // Filtro por busca
    if (expenseSearch.trim()) {
      const search = expenseSearch.toLowerCase().trim();
      result = result.filter(exp => 
        (exp?.description || '').toLowerCase().includes(search) ||
        (exp?.category || '').toLowerCase().includes(search)
      );
    }
    
    // Ordenação
    result.sort((a, b) => {
      const dateA = new Date(a?.created_at || 0).getTime();
      const dateB = new Date(b?.created_at || 0).getTime();
      return expenseSortDir === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [expensesFromDB, expensePeriod, expenseCustomFrom, expenseCustomTo, expenseSearch, expenseCategoryFilter, expenseSortDir]);

  const filteredExpensesTotal = useMemo(() => 
    filteredExpenses.reduce((sum, exp) => sum + (Number(exp?.amount_kz || exp?.amount || 0) || 0), 0),
    [filteredExpenses]
  );

  const expenseCategories = useMemo(() => {
    const cats = new Set<string>();
    (expensesFromDB || []).forEach(exp => cats.add(exp?.category || 'OUTROS'));
    return Array.from(cats).sort();
  }, [expensesFromDB]);

  const metrics = useMemo(() => {
    const revenue = syncCore.todayRevenue || 0;
    const variableCosts = syncCore.todayExpenses || 0;
    
    // IMPOSTOS: usar taxRate do settings (7% ou 14% conforme regime)
    const taxRate = (settings.taxRate || 7) / 100;
    const tax = revenue * taxRate;
    
    // LUCRO LÍQUIDO REAL - 🔥 CORREÇÃO: Forçar cálculo correto (syncCore.netProfit está incorreto)
    const netProfit = revenue - variableCosts - tax;
    
    // FLUXO POR MODALIDADE - usar data_contabil (igual ao SyncCore)
    const hojeString = calculateDataContabil(new Date());
    
    // Filtrar orders de hoje usando data_contabil
    const todayOrdersData = ordersData.filter((order: any) => {
      return order.data_contabil === hojeString;
    });

    // Calcular fluxo por modalidade com os dados corretos
    const payments = todayOrdersData.reduce((acc: any, o: any) => {
      const method = (o.payment_method || '').trim().toUpperCase();
      const valor = Number(o.total_amount || 0);
      
      // Mapeamento estrito de métodos de pagamento válidos
      if (method.includes('NUMER') || method.includes('DINHE')) {
        acc['NUMERÁRIO'] = (acc['NUMERÁRIO'] || 0) + valor;
      } else if (method.includes('TPA') || method.includes('MULTICAIXA') || method.includes('CARTAO')) {
        acc['TPA / MULTICAIXA'] = (acc['TPA / MULTICAIXA'] || 0) + valor;
      } else if (method.includes('TRANSF') || method.includes('TRANSFERENCIA')) {
        acc['TRANSFERENCIA'] = (acc['TRANSFERENCIA'] || 0) + valor;
      } else if (method.includes('QR') || method.includes('QRCODE') || method === 'QR CODE') {
        acc['QR CODE'] = (acc['QR CODE'] || 0) + valor;
      }
      
      return acc;
    }, {} as Record<string, number>);

    return {
      gross: revenue,
      tax: tax,
      profit: netProfit,
      todayGross: revenue,
      todayProfit: netProfit,
      todayNetProfit: netProfit,
      todayExpensesTotal: variableCosts,
      payments
    };
  }, [ordersData, expenses, syncCore.todayRevenue, syncCore.todayExpenses, syncCore.netProfit, syncCore.syncData, settings.taxRate]);

  const handleExportSAFT = async () => {
    setSaftLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const xml = await generateSAFT(activeOrders, customers, menu, settings, { month: new Date().getMonth(), year: new Date().getFullYear() });
      downloadSAFT(xml, `SAFT_AO_${settings.nif}.xml`);
      addNotification('success', 'SAF-T AO Gerado com Sucesso.');
    } finally {
      setSaftLoading(false);
    }
  };

  const handlePrintSale = (payment_method: string, total: number) => {
    // Criar dados da venda para impressão
    const saleData = {
      payment_method,
      total,
      date: new Date().toLocaleDateString('pt-AO'),
      tax: total * 0.065,
      net: total - (total * 0.065)
    };

    // Gerar conteúdo para impressão
    const printContent = `
      <html>
        <head>
          <title>Recibo de Venda - ${saleData.payment_method}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: 'Courier New', Courier, monospace; padding: 10px; font-size: 12px; width: 80mm; }
            .header { text-align: center; margin-bottom: 15px; }
            .header h2 { font-size: 14px; margin: 0; }
            .details { margin: 10px 0; }
            .details p { margin: 4px 0; }
            .total { font-weight: bold; font-size: 16px; margin-top: 15px; }
            hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RECIBO DE VENDA</h2>
            <p>${settings?.restaurantName || 'Tasca do Vereda'}</p>
            <p>NIF: ${settings?.nif || '---'}</p>
            <p>Data: ${saleData.date}</p>
          </div>
          <hr>
          <div class="details">
            <p><strong>Método:</strong> ${saleData.payment_method}</p>
            <p><strong>Valor Bruto:</strong> ${formatKz(saleData.total)}</p>
            <p><strong>IVA (6.5%):</strong> ${formatKz(saleData.tax)}</p>
            <hr>
            <p class="total"><strong>Líquido:</strong> ${formatKz(saleData.net)}</p>
          </div>
          <hr>
          <div style="margin-top: 20px; text-align: center; font-size: 10px;">
            <p>Documento processado por computador</p>
          </div>
        </body>
      </html>
    `;

    // Usar iframe oculto para impressão (compatível com Windows/Electron)
    try {
      const frameId = 'finance-print-frame';
      let printFrame = document.getElementById(frameId) as HTMLIFrameElement;
      
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = frameId;
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
      }

      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printContent);
        doc.close();
        
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            addNotification('success', 'Recibo enviado para impressão');
          } catch (err) {
            console.error('[FINANCE] Erro ao imprimir:', err);
            addNotification('error', 'Erro ao enviar para impressora.');
          }
        }, 500);
      } else {
        addNotification('error', 'Não foi possível preparar a impressão.');
      }
    } catch (err) {
      console.error('[FINANCE] Erro inesperado na impressão:', err);
      addNotification('error', 'Erro inesperado ao imprimir.');
    }
  };
    const handleExportFinanceReport = async () => {
    try {
      setLoading(true);
      addNotification('info', 'A gerar relatório financeiro...');
      
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('id, invoice_number, total_amount, tax_total, payment_method, created_at, data_contabil, status')
        .in('status', ['closed', 'paid', 'finalized'])
        .order('created_at', { ascending: false });
      
      if (error) {
        addNotification('error', 'Falha ao buscar dados do relatório.');
        return;
      }
      
      if (!allOrders || allOrders.length === 0) {
        addNotification('warning', 'Nenhuma venda encontrada na base de dados.');
        return;
      }
      
      const doc = new jsPDF();
      const today = new Date().toISOString().split('T')[0];
      
      doc.setFontSize(18);
      doc.text('RELATÓRIO FINANCEIRO GERAL', 14, 20);
      doc.setFontSize(10);
      doc.text(`${settings?.restaurantName || 'Tasca do Vereda'} • ${allOrders.length} vendas • ${today}`, 14, 28);
      
      const tableData = allOrders.map((o: any) => [
        o.invoice_number || '-',
        new Date(o.created_at).toLocaleString('pt-AO'),
        formatKz(Number(o.total_amount || 0)),
        formatKz(Number(o.tax_total || 0)),
        o.payment_method || 'N/A'
      ]);
      
      autoTable(doc, {
        head: [['Documento', 'Data', 'Total (Kz)', 'IVA (Kz)', 'Método']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [6, 182, 212], textColor: 255 },
        bodyStyles: { textColor: 0 }
      });
      
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-financeiro-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      addNotification('success', `Relatório exportado: ${allOrders.length} vendas.`);
    } catch {
      addNotification('error', 'Erro ao gerar relatório financeiro.');
    } finally {
      setLoading(false);
    }
  };

  // Funções para despesas
  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0 || !newExpense.category) {
      addNotification('error', 'Preencha todos os campos obrigatórios, incluindo a categoria.');
      return;
    }
    
    // BLOQUEIO TOTAL - IMPEDIR CLIQUES DUPLOS (DEBOUNCE)
    if (isSubmitting || loading) {
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // PERSISTÊNCIA NO SUPABASE PRIMEIRO (SEM UPDATE OTIMISTA)
      const expenseData = {
        description: newExpense.description,
        amount_kz: newExpense.amount,
        category: newExpense.category,
        status: 'PENDING', // STATUS CORRETO
        created_at: new Date().toISOString() // COLUNA CORRETA
        // REMOVIDO: paymentMethod (NÃO EXISTE NA TABELA)
      };

      // VALIDAÇÃO DE RESPOSTA - INSERT REAL NA DB
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select();

      if (error) {
        console.error('[FINANCE] Erro ao inserir despesa:', error);
        addNotification('error', `Falha ao salvar despesa: ${error.message}`);
        // LIMPEZA DE FORMULÁRIO SE FALHOU
        setNewExpense({
          description: '',
          amount: 0,
          category: 'OUTROS' as ExpenseCategory,
          status: 'PENDENTE',
          date: new Date().toISOString().split('T')[0]
          // REMOVIDO: paymentMethod (NÃO EXISTE NA TABELA)
        });
        setIsAddingExpense(false);
        return;
      }

      
      // ADICIONAR AO ESTADO APENAS APÓS CONFIRMAÇÃO DA DB
      if (data && data.length > 0) {
        addExpense(data[0]);
        addNotification('success', 'Despesa adicionada com sucesso.');
        
        // BUSCAR TOTAL ATUALIZADO DA DB
        await fetchTotalExpensesFromDB();
        
        // LIMPEZA DE FORMULÁRIO APÓS SUCESSO
        setNewExpense({
          description: '',
          amount: 0,
          category: 'OUTROS' as ExpenseCategory,
          status: 'PENDENTE',
          date: new Date().toISOString().split('T')[0]
          // REMOVIDO: paymentMethod (NÃO EXISTE NA TABELA)
        });
        setIsAddingExpense(false);
      }
      
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      addNotification('error', 'Erro ao adicionar despesa. Tente novamente.');
      
      // REATIVAR BOTÃO APENAS EM CASO DE ERRO
      setIsSubmitting(false);
      setLoading(false);
    } finally {
      // SEMPRE REATIVAR BOTÃO NO FINAL
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount, // Usar amount do tipo Expense
      category: expense.category,
      status: expense.status,
      date: expense.date || new Date().toISOString().split('T')[0]
      // REMOVIDO: paymentMethod, receipt, notes (NÃO EXISTEM NA TABELA)
    });
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !newExpense.description || newExpense.amount <= 0) {
      addNotification('error', 'Preencha todos os campos obrigatórios.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const updateData = {
        description: newExpense.description,
        amount_kz: newExpense.amount,
        category: newExpense.category,
      };

      // Tentar actualizar na tabela expenses primeiro
      const { error: expError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', editingExpense.id);
      
      if (expError) {
        // Se falhou, tentar em cash_flow
        const { error: cfError } = await supabase
          .from('cash_flow')
          .update({ description: newExpense.description, amount: newExpense.amount, category: newExpense.category })
          .eq('id', editingExpense.id);
        
        if (cfError) {
          console.error('[FINANCE] Erro ao actualizar despesa:', cfError);
          addNotification('error', 'Falha ao actualizar despesa.');
          return;
        }
      }

      // Actualizar store local também
      updateExpense(editingExpense.id, {
        ...newExpense,
        updatedAt: new Date()
      } as any);

      // Re-fetch para sincronizar a lista
      await fetchTotalExpensesFromDB();

      setEditingExpense(null);
      setNewExpense({
        description: '',
        amount: 0,
        category: 'OUTROS',
        status: 'PENDENTE',
        date: new Date().toISOString().split('T')[0]
      });
      addNotification('success', 'Despesa atualizada com sucesso.');
    } catch (error) {
      console.error('[FINANCE] Erro ao actualizar despesa:', error);
      addNotification('error', 'Erro ao actualizar despesa. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta despesa?')) return;
    
    try {
      // Tentar apagar da tabela expenses primeiro
      const { error: expError } = await supabase.from('expenses').delete().eq('id', id);
      
      if (expError) {
        // Se não encontrou em expenses, tentar em cash_flow
        const { error: cfError } = await supabase.from('cash_flow').delete().eq('id', id);
        if (cfError) {
          console.error('[FINANCE] Erro ao apagar despesa:', cfError);
          addNotification('error', 'Falha ao apagar despesa.');
          return;
        }
      }
      
      // Remover também do store local
      removeExpense(id);
      
      // Re-fetch para actualizar a lista
      await fetchTotalExpensesFromDB();
      
      addNotification('success', 'Despesa removida com sucesso.');
    } catch (error) {
      console.error('[FINANCE] Erro ao apagar despesa:', error);
      addNotification('error', 'Erro ao apagar despesa. Tente novamente.');
    }
  };

  const handleApproveExpense = (expense: Expense) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    approveExpense(expense.id, currentUser.name || 'Sistema');
    addNotification('success', 'Despesa aprovada com sucesso.');
  };


  return (
    <div className="p-3 md:p-4 lg:p-6 h-full overflow-y-auto no-scrollbar bg-background text-sm">
      {/* BLOQUEIO DE SEGURANÇA - EVITAR TELA PRETA */}
      {!activeTab && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="text-primary" size={32} />
            </div>
            <p className="text-white text-lg">Carregando módulo financeiro...</p>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
               <PiggyBank size={18} className="animate-pulse" />
               <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase">Módulo de Integridade Financeira</span>
            </div>
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Finanças & Legal</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">{ordersData.length} vendas hoje</span>
              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-[9px] font-black text-red-400 uppercase tracking-widest">{formatKz(metrics.todayExpensesTotal)} despesas hoje</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${(metrics.todayNetProfit || 0) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {formatKz(metrics.todayNetProfit || 0)} lucro hoje
              </span>
            </div>
          </div>

          <button 
            onClick={handleExportFinanceReport}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-cyan-400 text-black rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 hover:shadow-glow transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar Relatório PDF
          </button>
        </div>

        {/* Tabs modernizadas */}
        <div className="flex gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
           {[
             { id: 'OVERVIEW', label: 'Rendimento', icon: LayoutDashboard, color: 'text-primary' },
             { id: 'SALES', label: 'Vendas', icon: History, color: 'text-cyan-400' },
             { id: 'CONFIG', label: 'Pagamentos', icon: Banknote, color: 'text-emerald-400' },
             { id: 'EXPENSES', label: 'Despesas', icon: DollarSign, color: 'text-red-400' },
             { id: 'DOCUMENTS', label: 'Doc. Fiscais', icon: FileText, color: 'text-blue-400' },
             { id: 'AUDIT', label: 'Auditoria AGT', icon: ShieldCheck, color: 'text-amber-400' },
             { id: 'LEGAL', label: 'Certificação', icon: Lock, color: 'text-purple-400' }
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`relative px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap
                 ${activeTab === tab.id 
                   ? 'bg-white/[0.08] text-white' 
                   : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}
               `}
             >
               <tab.icon size={14} className={activeTab === tab.id ? tab.color : ''} />
               {tab.label}
               {activeTab === tab.id && (
                 <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
               )}
             </button>
           ))}
        </div>
      </header>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-10 rounded-[3rem] border border-primary/40 bg-primary/5 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 text-primary opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={80}/></div>
                   <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3">Lucro Líquido Real (Hoje)</p>
                        {loading ? (
                          <div className="flex items-center justify-center h-16">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <span className="ml-2 text-primary text-sm">Carregando...</span>
                          </div>
                        ) : (
                          <h3 className="text-5xl font-mono font-bold text-white text-glow mb-4">{formatKz(metrics.todayNetProfit)}</h3>
                        )}
                        <div className="flex items-center gap-6 mt-6">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Faturação Hoje</span>
                                <span className="text-lg font-mono font-bold text-white">{formatKz(metrics.todayGross)}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Despesas Hoje</span>
                                <span className="text-lg font-mono font-bold text-red-500">{formatKz(metrics.todayExpensesTotal)}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Lucro Líquido</span>
                                <span className="text-lg font-mono font-bold text-emerald-500">{formatKz(metrics.todayNetProfit)}</span>
                            </div>
                        </div>
                   </div>
                </div>
                <div className="glass-panel p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={16}/> Fluxo por Modalidade</h4>
                   <div className="space-y-4">
                   {/* CARDS ESPECÍFICOS COM ÍCONES - VALORES NORMALIZADOS */}
                   <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <span className="text-primary"><Banknote size={16}/></span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">NUMERÁRIO</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{formatKz(metrics.payments['NUMERÁRIO'] || 0)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <span className="text-primary"><CreditCard size={16}/></span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">TPA / MULTICAIXA</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{formatKz(metrics.payments['TPA / MULTICAIXA'] || 0)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <span className="text-primary"><ArrowRightLeft size={16}/></span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">TRANSFERENCIA</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{formatKz(metrics.payments['TRANSFERENCIA'] || 0)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <span className="text-primary"><QrCode size={16}/></span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">QR CODE</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">{formatKz(metrics.payments['QR CODE'] || 0)}</span>
                   </div>
                 </div>
               </div>
             </div>

             {/* Resumo Geral Acumulado */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Faturação Total</p>
                 <p className="text-xl font-mono font-bold text-white">{formatKz((syncCore.totalRevenue || 0) - (syncCore.externalHistory || 0))}</p>
                 <p className="text-[9px] text-slate-600 mt-1">vendas actuais (sem histórico)</p>
               </div>
               <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Despesas Totais</p>
                 <p className="text-xl font-mono font-bold text-red-400">{formatKz(syncCore.totalExpenses || 0)}</p>
                 <p className="text-[9px] text-slate-600 mt-1">expenses + cash_flow</p>
               </div>
               <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Folha Salarial</p>
                 <p className="text-xl font-mono font-bold text-amber-400">{formatKz(syncCore.staffCosts || 0)}</p>
                 <p className="text-[9px] text-slate-600 mt-1">{syncCore.staffCount || 0} funcionários</p>
               </div>
               <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Lucro Líquido Global</p>
                 <p className={`text-xl font-mono font-bold ${(syncCore.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatKz(syncCore.netProfit || 0)}</p>
                 <p className="text-[9px] text-slate-600 mt-1">receita total - despesas - staff</p>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'SALES' && (
          <div className="glass-panel rounded-[3rem] border border-white/5 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5">
                   <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-8 py-6">Documento</th>
                      <th className="px-8 py-6">Data</th>
                      <th className="px-8 py-6">Bruto</th>
                      <th className="px-8 py-6">IVA</th>
                      <th className="px-8 py-6 text-right">Ação</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {metrics.payments && Object.entries(metrics.payments).length > 0 ? (
                      Object.entries(metrics.payments).map(([paymentMethod, total]: any, index) => (
                        <tr key={index} className="hover:bg-white/5 transition-colors">
                           <td className="px-8 py-6 font-bold text-white text-xs">{paymentMethod}</td>
                           <td className="px-8 py-6 text-xs text-slate-500 font-mono">{new Date().toLocaleDateString('pt-AO')}</td>
                           <td className="px-8 py-6 font-mono font-bold text-white">{formatKz(total)}</td>
                           <td className="px-8 py-6 font-mono text-orange-500">{formatKz(total * 0.065)}</td>
                           <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => handlePrintSale(paymentMethod, total)}
                                className="p-3 bg-white/5 text-slate-400 hover:text-primary rounded-xl transition-all"
                                title="Imprimir recibo"
                              >
                                 <Printer size={18}/>
                              </button>
                           </td>
                        </tr>
                      ))
                   ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-12 text-center text-slate-500">
                           Nenhuma venda registrada hoje
                        </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        )}

        {activeTab === 'CONFIG' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Modos de Pagamento</h3>
                <button 
                  onClick={() => setIsAddingPayment(true)}
                  className="px-6 py-3 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <Plus size={16} /> Novo Modo
                </button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paymentConfigs.map((config) => (
                  <div key={config.id} className={`glass-panel p-6 rounded-3xl border ${config.isActive ? 'border-white/10' : 'border-red-500/20 opacity-60'} flex flex-col gap-6`}>
                     <div className="flex justify-between items-start">
                        <div className="p-4 bg-white/5 rounded-2xl text-primary">
                           <Banknote size={24} />
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => updatePaymentConfig(config.id, { isActive: !config.isActive })}
                             className={`p-2 rounded-lg border transition-all ${config.isActive ? 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-black' : 'border-slate-500/30 text-slate-500 hover:bg-slate-500 hover:text-white'}`}
                             aria-label={config.isActive ? "Desativar método de pagamento" : "Ativar método de pagamento"}
                           >
                              <Check size={16} />
                           </button>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-white font-bold uppercase tracking-tighter">{config.name}</h4>
                        <p className="text-[10px] font-black text-slate-500 uppercase mt-1">{config.type}</p>
                     </div>
                  </div>
                ))}
             </div>

             {isAddingPayment && (
               <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
                  <div className="max-w-md w-full glass-panel p-10 rounded-[3rem] border border-white/10">
                     <h3 className="text-2xl font-black text-white italic uppercase mb-8">Novo Modo de Pagamento</h3>
                     <div className="space-y-6">
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nome do Modo</label>
                           <input 
                             type="text"
                             className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                             placeholder="Ex: Multicaixa, Express, etc"
                             value={newPayment.name}
                             onChange={e => setNewPayment({...newPayment, name: e.target.value})}
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Tipo Base</label>
                           <select 
                             className="w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                             value={newPayment.type}
                             onChange={e => setNewPayment({...newPayment, type: e.target.value as any})}
                             title="Selecione o tipo de pagamento"
                           >
                              <option value="NUMERARIO">Numerário</option>
                              <option value="TPA">TPA / Cartão</option>
                              <option value="TRANSFERENCIA">Transferência</option>
                              <option value="QR_CODE">QR Code / Referência</option>
                              <option value="PAGAR_DEPOIS">Conta Corrente / Pagar Depois</option>
                           </select>
                        </div>
                        <div className="flex gap-4 pt-4">
                           <button 
                             onClick={() => setIsAddingPayment(false)}
                             className="flex-1 py-4 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                           >
                             Cancelar
                           </button>
                           <button 
                             onClick={() => {
                               if (newPayment.name) {
                                 addPaymentConfig(newPayment);
                                 setIsAddingPayment(false);
                                 setNewPayment({ name: '', type: 'NUMERARIO', icon: 'Banknote', isActive: true });
                                 addNotification('success', 'Modo de pagamento adicionado.');
                               }
                             }}
                             className="flex-1 py-4 bg-primary text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-glow"
                           >
                             Salvar
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Gestão de Despesas</h3>
              <button 
                onClick={() => setIsAddingExpense(true)}
                className="px-6 py-3 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all"
              >
                <Plus size={16} /> Nova Despesa
              </button>
            </div>

            {/* KPI Cards resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 rounded-2xl p-4">
                <p className="text-red-300 text-[10px] font-bold uppercase tracking-wider mb-1">Total Geral</p>
                <p className="text-white font-black text-xl">{formatKz(totalExpensesFromDB)}</p>
                <p className="text-red-400/60 text-xs mt-1">{expensesFromDB?.length || 0} registos</p>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">No Filtro Atual</p>
                <p className="text-white font-black text-xl">{formatKz(filteredExpensesTotal)}</p>
                <p className="text-slate-500 text-xs mt-1">{filteredExpenses.length} registos</p>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Média/Despesa</p>
                <p className="text-white font-black text-xl">{filteredExpenses.length > 0 ? formatKz(filteredExpensesTotal / filteredExpenses.length) : '—'}</p>
                <p className="text-slate-500 text-xs mt-1">valor médio</p>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-4">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Categorias</p>
                <p className="text-white font-black text-xl">{expenseCategories.length}</p>
                <p className="text-slate-500 text-xs mt-1">tipos distintos</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Filter size={13} className="text-slate-500" />
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { id: 'all', label: 'Todas' },
                    { id: 'today', label: 'Hoje' },
                    { id: 'week', label: '7 Dias' },
                    { id: 'month', label: 'Mês' },
                    { id: 'year', label: 'Ano' },
                    { id: 'custom', label: 'Período' },
                  ] as { id: typeof expensePeriod; label: string }[]).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setExpensePeriod(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        expensePeriod === p.id
                          ? 'bg-primary text-black shadow-lg shadow-primary/20'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {expensePeriod === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input type="date" title="De" value={expenseCustomFrom} onChange={e => setExpenseCustomFrom(e.target.value)} className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-white" />
                    <span className="text-slate-500 text-xs">→</span>
                    <input type="date" title="Até" value={expenseCustomTo} onChange={e => setExpenseCustomTo(e.target.value)} className="px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Busca */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar descrição..."
                    value={expenseSearch}
                    onChange={e => setExpenseSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-600"
                  />
                </div>
                {/* Filtro categoria */}
                <select
                  title="Filtrar por categoria"
                  value={expenseCategoryFilter}
                  onChange={e => setExpenseCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                >
                  <option value="ALL">Todas Categorias</option>
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                  ))}
                </select>
                {/* Ordenação */}
                <button
                  onClick={() => setExpenseSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  title={expenseSortDir === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-400 hover:text-white transition-all"
                >
                  {expenseSortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  Data
                </button>
              </div>
            </div>

            {/* Tabela de Despesas */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {filteredExpenses.length} despesa{filteredExpenses.length !== 1 ? 's' : ''} encontrada{filteredExpenses.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold text-white">
                  Total filtrado: {formatKz(filteredExpensesTotal)}
                </span>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5 sticky top-0">
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-5 py-3">Descrição</th>
                      <th className="px-5 py-3">Categoria</th>
                      <th className="px-5 py-3">Valor</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Data</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredExpenses.map((expense, index) => (
                      <tr key={expense?.id || `expense-${index}`} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-bold text-white text-sm">{expense?.description || 'Sem descrição'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getCategoryColor(expense?.category)}`}>
                            {expense?.category?.replace('_', ' ') || 'OUTROS'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-white">{formatKz(expense?.amount_kz || expense?.amount || 0)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[9px] font-black uppercase ${getStatusColor(expense?.status)}`}>
                            {expense?.status?.replace('_', ' ') || 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                          {new Date(expense?.created_at || new Date()).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button 
                              onClick={() => handleEditExpense(expense)}
                              className="p-1.5 bg-white/5 text-slate-400 hover:text-primary rounded-lg transition-all"
                              title="Editar despesa"
                              aria-label="Editar despesa"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(expense?.id || `temp-${index}`)}
                              className="p-1.5 bg-white/5 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                              title="Apagar despesa"
                              aria-label="Apagar despesa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                          {expensesFromDB.length === 0 ? 'Nenhuma despesa registada' : 'Nenhuma despesa para o filtro selecionado'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT' && (
          <div className="max-w-4xl mx-auto space-y-8">
             <div className="glass-panel p-10 rounded-[3rem] border border-primary/20 bg-primary/5 text-center">
                <ShieldCheck size={64} className="text-primary mx-auto mb-6" />
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Exportação SAF-T AO</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 max-w-xl mx-auto">Gere o ficheiro oficial de auditoria tributária conforme a Versão 1.01 da AGT Angola. Este ficheiro contém todos os registos de faturas e clientes do período atual.</p>
                <div className="flex justify-center gap-4">
                   <button onClick={handleExportSAFT} disabled={saftLoading} className="px-10 py-5 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3">
                      {saftLoading ? <Loader2 className="animate-spin" size={18}/> : <Download size={18}/>}
                      Exportar SAF-T do Mês
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'DOCUMENTS' && <AGTDocumentsTab />}

        {activeTab === 'LEGAL' && (
          <div className="glass-panel p-12 rounded-[4rem] border-white/5 bg-white text-slate-900 shadow-2xl">
             <div className="text-center mb-12">
                <h1 className="text-3xl font-black uppercase mb-2">CERTIFICAÇÃO REST IA OS</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Dossier Técnico de Conformidade Legal</p>
                <div className="w-24 h-1 bg-primary mx-auto mt-6"></div>
             </div>
             <section className="space-y-8 text-sm">
                <div>
                   <h4 className="font-black uppercase mb-4 border-b border-slate-200 pb-2">Arquitetura de Segurança</h4>
                   <p className="leading-relaxed">O sistema utiliza o algoritmo SHA-256 para geração de Hash Chaining em cada fatura, garantindo a imutabilidade dos dados. Processado por software validado pela AGT sob o certificado: <span className="font-mono font-bold">{settings.agtCertificate}</span>.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-5 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Série Autorizada</p>
                      <p className="font-bold">{settings.invoiceSeries}</p>
                   </div>
                   <div className="p-5 bg-slate-50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Regime de IVA</p>
                      <p className="font-bold">Taxa Normal (14%)</p>
                   </div>
                </div>
             </section>
          </div>
        )}
      </div>

      {/* Modal para Adicionar/Editar Despesa */}
      {(isAddingExpense || editingExpense) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-[3rem] border border-white/10">
            <h3 className="text-2xl font-black text-white italic uppercase mb-8">
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Descrição</label>
                <input 
                  type="text"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  placeholder="Ex: Compra de material de limpeza"
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Categoria *</label>
                <select 
                  className="w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  value={newExpense.category}
                  onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}
                  required
                  aria-label="Selecionar categoria da despesa"
                >
                  <option value="">Selecione uma categoria...</option>
                  <option value="STAFF">STAFF - Salários e Pessoal</option>
                  <option value="MERCADORIA">MERCADORIA - Compras e Stock</option>
                  <option value="UTILIDADES">UTILIDADES - Luz, Água, Internet</option>
                  <option value="RENDAS">RENDAS - Aluguer</option>
                  <option value="IMPOSTOS">IMPOSTOS - Taxas e Tributos</option>
                  <option value="MANUTENÇÃO">MANUTENÇÃO - Reparos e Conservação</option>
                  <option value="ALIMENTAÇÃO">ALIMENTAÇÃO - Refeições</option>
                  <option value="MARKETING">MARKETING - Publicidade</option>
                  <option value="OUTROS">OUTROS - Despesas Diversas</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Valor (Kz)</label>
                <input 
                  type="number"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              {/* REMOVIDO: Campo paymentMethod (NÃO EXISTE NA TABELA) */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  value={String(newExpense.date || new Date().toISOString().split('T')[0])}
                  onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                  title="Selecione a data da despesa"
                />
              </div>
              {/* REMOVIDO: Campos receipt e notes (NÃO EXISTEM NA TABELA) */}
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setIsAddingExpense(false);
                    setEditingExpense(null);
                    setNewExpense({
                      description: '',
                      amount: 0,
                      category: 'OUTROS', // CATEGORIA VÁLIDA
                      status: 'PENDENTE',
                      date: new Date().toISOString().split('T')[0]
                      // REMOVIDO: paymentMethod, receipt, notes (NÃO EXISTEM NA TABELA)
                    });
                  }}
                  className="flex-1 py-4 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={editingExpense ? handleUpdateExpense : handleAddExpense}
                  disabled={isSubmitting || loading} // BLOQUEIO TOTAL - CLIQUES DUPLOS
                  className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all ${
                    isSubmitting || loading
                      ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                      : 'bg-primary text-black shadow-glow hover:bg-primary/90'
                  }`}
                >
                  {(isSubmitting || loading) ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A guardar...
                    </span>
                  ) : (
                    editingExpense ? 'Atualizar' : 'Adicionar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;




