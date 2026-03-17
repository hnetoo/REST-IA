import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  TrendingUp, DollarSign, Banknote, LayoutDashboard, History, PiggyBank,
  Printer, ShieldCheck, FileText, Lock, Database, Search, Download, 
  ArrowUpRight, PieChart, BarChart as BarChartIcon, Activity, Loader2,
  CreditCard, ArrowRightLeft, QrCode, Plus, Trash2, Edit2, Check
} from 'lucide-react';
import { printThermalInvoice, printFinanceReport } from '../lib/printService';
import { generateSAFT, downloadSAFT } from '../lib/saftService';
import { PaymentMethodConfig, Order, Expense, ExpenseCategory, ExpenseStatus } from '../../types';

const Finance = () => {
  const { activeOrders, settings, menu, customers, addNotification, paymentConfigs, addPaymentConfig, updatePaymentConfig, expenses, addExpense, updateExpense, removeExpense, approveExpense } = useStore();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALES' | 'AUDIT' | 'LEGAL' | 'CONFIG' | 'EXPENSES'>('OVERVIEW');
  const [saftLoading, setSaftLoading] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<Omit<PaymentMethodConfig, 'id'>>({
    name: '',
    type: 'NUMERARIO',
    icon: 'Banknote',
    isActive: true
  });
  
  // Estados para despesas
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // ESTADO DE CARREGAMENTO
  const [loading, setLoading] = useState(false); // ESTADO DE BLOQUEIO TOTAL
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>({
    description: '',
    amount: 0,
    category: '', // CATEGORIA VAZIA - USUÁRIO ESCREVE TEXTO EXATO
    status: 'PENDENTE',
    createdAt: new Date(),
    paymentMethod: 'NUMERARIO',
    receipt: '',
    notes: ''
  });

  const closedOrders = useMemo(() => activeOrders.filter(o => o.status === 'FECHADO'), [activeOrders]);
  const today = new Date().toLocaleString('en-US', { timeZone: 'Africa/Luanda' }).split(',')[0];

  const metrics = useMemo(() => {
    const gross = closedOrders.reduce((acc, o) => acc + o.total, 0);
    const tax = closedOrders.reduce((acc, o) => acc + o.taxTotal, 0);
    const profit = closedOrders.reduce((acc, o) => acc + o.profit, 0);
    const todayOrders = closedOrders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === today);
    const todayGross = todayOrders.reduce((acc, o) => acc + o.total, 0);
    const todayProfit = todayOrders.reduce((acc, o) => acc + o.profit, 0);
    
    // Agrupar pagamentos por método
    const payments = closedOrders.reduce((acc: any, o) => {
      const methodId = o.paymentMethod || 'OUTRO';
      acc[methodId] = (acc[methodId] || 0) + o.total;
      return acc;
    }, {});

    return { gross, tax, profit, todayGross, todayProfit, payments };
  }, [closedOrders, today]);

  const handleExportSAFT = async () => {
    setSaftLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const xml = generateSAFT(activeOrders, customers, menu, settings, { month: new Date().getMonth(), year: new Date().getFullYear() });
      downloadSAFT(xml, `SAFT_AO_${settings.nif}.xml`);
      addNotification('success', 'SAF-T AO Gerado com Sucesso.');
    } finally {
      setSaftLoading(false);
    }
  };

  const handleExportFinanceReport = () => {
    if (closedOrders.length === 0) {
      addNotification('warning', 'Nenhuma venda para exportar.');
      return;
    }
    
    const title = 'Relatório Financeiro Geral';
    const columns = ['Documento', 'Data', 'Total (Kz)', 'IVA (Kz)', 'Método'];
    const data = closedOrders.map(o => [
      o.invoiceNumber,
      new Date(o.timestamp).toLocaleString('pt-AO'),
      formatKz(o.total),
      formatKz(o.taxTotal),
      o.paymentMethod || 'N/A'
    ]);

    printFinanceReport(title, data, columns, settings);
    addNotification('success', 'Relatório exportado com sucesso.');
  };

  // Funções para despesas
  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      addNotification('error', 'Preencha todos os campos obrigatórios.');
      return;
    }
    
    // BLOQUEIO TOTAL - IMPEDIR CLIQUES DUPLOS
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // Adicionar ao estado local (Optimistic UI)
      addExpense(newExpense);
      
      // LIMPEZA DE FORMULÁRIO IMEDIATA
      setNewExpense({
        description: '',
        amount: 0,
        category: '', // CATEGORIA VAZIA - USUÁRIO ESCREVE TEXTO EXATO
        status: 'PENDENTE',
        createdAt: new Date(),
        paymentMethod: 'NUMERARIO',
        receipt: '',
        notes: ''
      });
      setIsAddingExpense(false);
      
      // PERSISTÊNCIA NO SUPABASE (APENAS UMA VEZ)
      const { addExpenseWithPersistence } = useStore.getState();
      if (addExpenseWithPersistence) {
        await addExpense({
          id: `exp-${Date.now()}`,
          description: newExpense.description,
          amount: newExpense.amount,
          category: newExpense.category,
          status: newExpense.status,
          createdAt: newExpense.createdAt,
          paymentMethod: newExpense.paymentMethod,
          receipt: newExpense.receipt,
          notes: newExpense.notes
        });
      }
      
      addNotification('success', 'Despesa adicionada com sucesso.');
      
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      addNotification('error', 'Erro ao adicionar despesa. Tente novamente.');
      
      // REATIVAR BOTÃO APENAS EM CASO DE ERRO
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      status: expense.status,
      createdAt: expense.createdAt,
      paymentMethod: expense.paymentMethod,
      receipt: expense.receipt || '',
      notes: expense.notes || ''
    });
  };

  const handleUpdateExpense = () => {
    if (!editingExpense || !newExpense.description || newExpense.amount <= 0) {
      addNotification('error', 'Preencha todos os campos obrigatórios.');
      return;
    }
    
    updateExpense(editingExpense.id, {
      ...newExpense,
      createdAt: newExpense.createdAt,
      updatedAt: new Date()
    });
    setEditingExpense(null);
    setNewExpense({
      description: '',
      amount: 0,
      category: 'OUTROS',
      status: 'PENDENTE',
      createdAt: new Date(),
      paymentMethod: 'NUMERARIO',
      receipt: '',
      notes: ''
    });
    addNotification('success', 'Despesa atualizada com sucesso.');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Tem certeza que deseja apagar esta despesa?')) {
      removeExpense(id);
      addNotification('success', 'Despesa removida com sucesso.');
    }
  };

  const handleApproveExpense = (expense: Expense) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    approveExpense(expense.id, currentUser.name || 'Sistema');
    addNotification('success', 'Despesa aprovada com sucesso.');
  };

  const formatKz = (val: number | undefined | null) => {
    const safeVal = val?.toString()?.replace(/[^\d.-]/g, '') || "0";
    const numVal = parseFloat(safeVal) || 0;
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(numVal);
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    switch (category) {
      case 'ALIMENTACAO': return 'text-orange-500';
      case 'BEBIDAS': return 'text-blue-500';
      case 'MATERIAL_LIMPEZA': return 'text-green-500';
      case 'UTILIDADES': return 'text-yellow-500';
      case 'REPARACOES': return 'text-red-500';
      case 'MARKETING': return 'text-purple-500';
      default: return 'text-slate-500';
    }
  };

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case 'PENDENTE': return 'text-yellow-500';
      case 'APROVADO': return 'text-blue-500';
      case 'PAGO': return 'text-green-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
             <PiggyBank size={18} className="animate-pulse" />
             <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase">Módulo de Integridade Financeira</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Finanças & Legal</h2>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleExportFinanceReport}
            className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Download size={16} /> Exportar Relatório
          </button>
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
             {[
               { id: 'OVERVIEW', label: 'Rendimento', icon: LayoutDashboard },
               { id: 'SALES', label: 'Vendas', icon: History },
               { id: 'CONFIG', label: 'Pagamentos', icon: Banknote },
               { id: 'EXPENSES', label: 'Despesas', icon: DollarSign },
               { id: 'AUDIT', label: 'Auditoria AGT', icon: FileText },
               { id: 'LEGAL', label: 'Certificação', icon: ShieldCheck }
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap
                   ${activeTab === tab.id ? 'bg-primary text-black shadow-glow' : 'text-slate-500 hover:text-slate-300'}
                 `}
               >
                 <tab.icon size={16} /> {tab.label}
               </button>
             ))}
          </div>
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
                        <h3 className="text-5xl font-mono font-bold text-white text-glow mb-4">{formatKz(metrics.todayProfit)}</h3>
                        <div className="flex items-center gap-6 mt-6">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Faturação Bruta</span>
                                <span className="text-lg font-mono font-bold text-white">{formatKz(metrics.todayGross)}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Margem Diária</span>
                                <span className="text-lg font-mono font-bold text-emerald-500">
                                    {metrics.todayGross > 0 ? ((metrics.todayProfit / metrics.todayGross) * 100).toFixed(1) : '0'}%
                                </span>
                            </div>
                        </div>
                   </div>
                </div>
                <div className="glass-panel p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={16}/> Fluxo por Modalidade</h4>
                   <div className="space-y-4">
                      {paymentConfigs.filter(c => c.isActive).map((config) => (
                        <div key={config.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                           <div className="flex items-center gap-3">
                              <span className="text-primary"><Banknote size={16}/></span>
                              <span className="text-[10px] font-black text-slate-400 uppercase">{config.name}</span>
                           </div>
                           <span className="text-sm font-mono font-bold text-white">{formatKz(metrics.payments[config.id] || 0)}</span>
                        </div>
                      ))}
                      {/* Mostrar outros se houverem */}
                      {Object.entries(metrics.payments).filter(([id]) => !paymentConfigs.some(c => c.id === id)).map(([id, val]: any) => (
                        <div key={id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-[10px] font-black text-slate-400 uppercase">{id.replace('_', ' ')}</span>
                           <span className="text-sm font-mono font-bold text-white">{formatKz(val)}</span>
                        </div>
                      ))}
                   </div>
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
                   {closedOrders.slice(-20).map(o => (
                     <tr key={o.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-8 py-6 font-bold text-white text-xs">{o.invoiceNumber}</td>
                        <td className="px-8 py-6 text-xs text-slate-500 font-mono">{new Date(o.timestamp).toLocaleString()}</td>
                        <td className="px-8 py-6 font-mono font-bold text-white">{formatKz(o.total)}</td>
                        <td className="px-8 py-6 font-mono text-orange-500">{formatKz(o.taxTotal)}</td>
                        <td className="px-8 py-6 text-right">
                           <button onClick={() => printThermalInvoice(o, menu, settings, customers.find(c => c.id === o.customerId))} className="p-3 bg-white/5 text-slate-400 hover:text-primary rounded-xl transition-all"><Printer size={18}/></button>
                        </td>
                     </tr>
                   ))}
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
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Gestão de Despesas</h3>
              <button 
                onClick={() => setIsAddingExpense(true)}
                className="px-6 py-3 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all"
              >
                <Plus size={16} /> Nova Despesa
              </button>
            </div>

            {/* Lista de Despesas */}
            <div className="glass-panel rounded-[3rem] border border-white/5 overflow-hidden">
              {/* Total de Despesas - Card em Destaque */}
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Total de Despesas</h3>
                      <p className="text-sm text-red-300">Soma de todas as despesas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-white">
                      {formatKz(expenses?.reduce((acc, exp) => acc + Number(exp.amount_kz || exp.amount || 0), 0))}
                    </div>
                    <p className="text-xs text-red-300 uppercase tracking-wider">
                      {expenses?.length || 0} despesas
                    </p>
                  </div>
                </div>
              </div>
              
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(expenses || []).slice(-20).map(expense => (
                    <tr key={expense.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-white text-sm">{expense.description}</div>
                          {expense.notes && <div className="text-[8px] text-slate-400 mt-1">{expense.notes}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase ${getCategoryColor(expense.category)}`}>
                          {expense.category?.replace('_', ' ') || 'OUTROS'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">{formatKz(expense.amount || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase ${getStatusColor(expense.status)}`}>
                          {expense.status?.replace('_', ' ') || 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {new Date(expense.createdAt || new Date()).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => handleEditExpense(expense)}
                            className="p-2 bg-white/5 text-slate-400 hover:text-primary rounded-lg transition-all"
                            title="Editar despesa"
                          >
                            <Edit2 size={16} />
                          </button>
                          {expense.status === 'PENDENTE' && (
                            <button 
                              onClick={() => handleApproveExpense(expense)}
                              className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all"
                              title="Aprovar despesa"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                            title="Apagar despesa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Categoria</label>
                <input 
                  type="text"
                  className="w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  placeholder="Ex: REPARACOES, ALIMENTACAO, etc."
                  value={newExpense.category}
                  onChange={e => setNewExpense({...newExpense, category: e.target.value.toUpperCase()})}
                />
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
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Método de Pagamento</label>
                <select 
                  className="w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  value={newExpense.paymentMethod}
                  onChange={e => setNewExpense({...newExpense, paymentMethod: e.target.value as PaymentMethod})}
                >
                  <option value="NUMERARIO">Numerário</option>
                  <option value="TPA">TPA / Cartão</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="QR_CODE">QR Code / Referência</option>
                  <option value="PAGAR_DEPOIS">Conta Corrente / Pagar Depois</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  value={newExpense.createdAt instanceof Date ? String(newExpense.createdAt.toISOString() || '').split('T')[0] : String(newExpense.createdAt || '').split('T')[0]}
                  onChange={e => setNewExpense({...newExpense, createdAt: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Recibo</label>
                <input 
                  type="text"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary"
                  placeholder="Número do recibo (opcional)"
                  value={newExpense.receipt}
                  onChange={e => setNewExpense({...newExpense, receipt: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Notas</label>
                <textarea 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary resize-none"
                  placeholder="Observações adicionais (opcional)"
                  rows={3}
                  value={newExpense.notes}
                  onChange={e => setNewExpense({...newExpense, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setIsAddingExpense(false);
                    setEditingExpense(null);
                    setNewExpense({
                      description: '',
                      amount: 0,
                      category: '', // CATEGORIA VAZIA - USUÁRIO ESCREVE TEXTO EXATO
                      status: 'PENDENTE',
                      date: new Date(),
                      paymentMethod: 'NUMERARIO',
                      receipt: '',
                      notes: ''
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




