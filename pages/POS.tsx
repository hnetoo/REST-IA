
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Search, Minus, Plus, CreditCard, LayoutGrid, Printer, 
  Banknote, X, Utensils, MoveHorizontal, Sparkles, Loader2,
  ChevronRight, Grid3X3, Tag, ShoppingBasket, FileText,
  UserPlus, History, LogOut, CheckCircle2, MoreVertical,
  ChevronLeft, Layout, Clock, QrCode, ArrowRightLeft, User, Users, Monitor, Shield
} from 'lucide-react';
import { Dish, PaymentMethod, Order, Table, Customer } from '../types';
import { printThermalInvoice, printTableReview, printCashClosing } from '../services/printService';
import LazyImage from '../components/LazyImage';

const POS = () => {
  const { 
    tables, activeTableId, setActiveTable, 
    menu, categories, activeOrders, activeOrderId, setActiveOrder, 
    createNewOrder, addToOrder, transferOrder,
    checkoutTable, updateOrderPaymentMethod, settings, addNotification, customers, currentUser
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSubaccountModalOpen, setIsSubaccountModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isChangePaymentModalOpen, setIsChangePaymentModalOpen] = useState(false);
  
  const [orderToChangeId, setOrderToChangeId] = useState<string | null>(null);
  
  const currentOrder = activeOrders.find(o => o.id === activeOrderId);
  
  const closedToday = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return activeOrders.filter(o => {
      if (o.status !== 'FECHADO') return false;
      const orderDate = new Date(o.timestamp).toLocaleDateString('en-CA');
      return orderDate === todayStr;
    });
  }, [activeOrders]);

  const handleTableClick = (table: Table) => {
    setActiveTable(table.id);
    const existingOrder = activeOrders.find(o => o.tableId === table.id && o.status === 'ABERTO');
    if (existingOrder) {
      setActiveOrder(existingOrder.id);
    } else {
      const newId = createNewOrder(table.id);
      setActiveOrder(newId);
    }
  };

  const handleOpenCustomerDisplay = () => {
    const targetTable = activeTableId || 0;
    // Fix para garantir que o URL do monitor abre corretamente em qualquer ambiente
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}#/customer-display/${targetTable}`;
    window.open(url, 'VeredaCustomerDisplay', 'width=1200,height=800');
    addNotification('info', 'Monitor do Cliente ativo.');
  };

  /**
   * CRITICAL: Cash closing logic needs immediate window opening to avoid browser block
   */
  const handleCashClosingClick = () => {
    if (closedToday.length === 0) {
      addNotification('warning', 'Nenhuma venda fechada hoje.');
      return;
    }

    // ABRIR JANELA IMEDIATAMENTE (Obrigatório para evitar bloqueio de popup)
    const printWindow = window.open('', '_blank', 'width=450,height=800');
    if (!printWindow) {
      alert("⚠️ BLOQUEIO DE POPUP: Por favor, autorize popups para imprimir o fecho.");
      return;
    }

    try {
      printCashClosing(closedToday, settings, currentUser?.name || 'Operador', printWindow);
      addNotification('success', 'Relatório de Fecho Gerado.');
    } catch (err) {
      printWindow.close();
      addNotification('error', 'Falha ao processar fecho.');
    }
  };

  const handleChangePayment = (method: PaymentMethod) => {
    if (!orderToChangeId) return;
    // Apenas atualiza o banco local para o relatório de fecho sair perfeito
    updateOrderPaymentMethod(orderToChangeId, method);
    addNotification('success', 'Meio de pagamento atualizado administrativamente.');
    setIsChangePaymentModalOpen(false);
    setOrderToChangeId(null);
  };

  const handleCheckoutFinal = (method: PaymentMethod, customerId?: string) => {
    if (!currentOrder) return;
    const orderToPrintId = currentOrder.id;
    checkoutTable(currentOrder.id, method, customerId);
    setIsCheckoutModalOpen(false);
    
    setTimeout(() => {
        const order = useStore.getState().activeOrders.find(o => o.id === orderToPrintId);
        if (order) {
            printThermalInvoice(order, menu, settings, customers.find(c => c.id === order.customerId));
        }
    }, 200);
  };

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', currency: 'AOA', maximumFractionDigits: 0 
  }).format(val);

  return (
    <div className="flex h-full overflow-hidden bg-background font-sans select-none">
      
      {/* Sidebar Categorias */}
      <div className="w-24 bg-slate-950 border-r border-white/5 flex flex-col items-center py-10 gap-8 z-40">
         <button onClick={() => setSelectedCategoryId('TODOS')} className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all ${selectedCategoryId === 'TODOS' ? 'bg-primary text-black shadow-glow' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>
            <Grid3X3 size={24} />
         </button>
         {categories.map(cat => (
           <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all group ${selectedCategoryId === cat.id ? 'bg-primary text-black shadow-glow' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>
              <Tag size={20} />
              <span className="text-[7px] font-black uppercase mt-1 opacity-60 truncate w-full text-center px-1">{cat.name}</span>
           </button>
         ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-slate-900/40 backdrop-blur-md border-b border-white/5 flex items-center px-10 justify-between shrink-0">
           <div className="flex items-center gap-6">
              <button onClick={() => { setActiveTable(null); setActiveOrder(null); }} className="group flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                <Layout size={20} /> 
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Mesas</span>
              </button>
              {activeTableId && (
                <div className="flex items-center gap-4">
                   <div className="w-1 h-8 bg-primary rounded-full shadow-glow"></div>
                   <div>
                      <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Mesa {activeTableId}</h2>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">{currentOrder?.subAccountName}</p>
                   </div>
                </div>
              )}
           </div>
           
           <div className="flex items-center gap-4">
              <button onClick={handleOpenCustomerDisplay} className="flex items-center gap-2 px-5 py-3.5 bg-primary/10 border border-primary/30 text-primary rounded-xl hover:bg-primary hover:text-black transition-all shadow-lg hover:shadow-primary/20">
                <Monitor size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Ativar 2.º Ecrã</span>
              </button>
              <div className="relative w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-primary outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={() => setIsHistoryOpen(true)} className="p-3.5 bg-white/5 text-slate-400 hover:text-primary transition-all rounded-xl border border-white/5"><History size={20}/></button>
              <button onClick={handleCashClosingClick} className="px-6 py-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-black transition-all shadow-lg hover:shadow-emerald-500/20">
                Fecho de Caixa
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
           {!activeTableId ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8 animate-in fade-in zoom-in duration-500">
                 {tables.map((table) => {
                    const isOccupied = activeOrders.some(o => o.tableId === table.id && o.status === 'ABERTO');
                    return (
                      <button 
                        key={table.id} 
                        onClick={() => handleTableClick(table)}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${!isOccupied ? 'border-white/5 bg-white/[0.02] hover:border-primary' : 'border-primary bg-primary/10 shadow-glow'}`}
                      >
                         <span className="text-[9px] font-black uppercase text-slate-500">{table.name}</span>
                         <span className={`text-4xl font-black italic tracking-tighter ${!isOccupied ? 'text-white' : 'text-primary'}`}>{table.id}</span>
                      </button>
                    );
                 })}
              </div>
           ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-4">
                 {menu.filter(d => selectedCategoryId === 'TODOS' || d.categoryId === selectedCategoryId).filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((dish) => (
                    <button key={dish.id} onClick={() => addToOrder(activeTableId, dish)} className="group bg-white/5 rounded-xl border border-white/5 hover:border-primary/50 overflow-hidden flex flex-col transition-all active:scale-95">
                       <div className="aspect-[4/3] w-full overflow-hidden relative">
                          <LazyImage src={dish.image} alt={dish.name} containerClassName="w-full h-full" className="group-hover:scale-110 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90"></div>
                          <div className="absolute bottom-4 left-6 right-6 text-left">
                             <p className="text-[11px] font-black text-primary uppercase mb-1">{formatKz(dish.price)}</p>
                             <h4 className="text-white font-bold text-sm truncate uppercase tracking-tighter leading-none">{dish.name}</h4>
                          </div>
                       </div>
                    </button>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* Painel Lateral do Pedido */}
      <div className={`w-[450px] border-l border-white/5 bg-slate-950 flex flex-col h-full transition-all duration-500 shadow-2xl z-50 ${!activeOrderId ? 'translate-x-full' : ''}`}>
         {activeOrderId && (
           <>
             <div className="p-10 border-b border-white/5">
                <div className="flex items-center gap-3 justify-between mb-6">
                   <div>
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Pedido #{activeOrderId.slice(-4)}</h3>
                      <p className="text-[11px] font-black text-primary uppercase mt-1 flex items-center gap-2"><CheckCircle2 size={14}/> {currentOrder?.subAccountName}</p>
                   </div>
                   <button onClick={() => { setActiveOrder(null); setActiveTable(null); }} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all"><X size={20}/></button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => printTableReview(currentOrder!, menu, settings)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 flex items-center justify-center gap-2 hover:bg-white/10 transition-all"><Printer size={16}/> Consulta</button>
                    <button onClick={() => setActiveOrder(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white">Suspender</button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                {currentOrder?.items.map((item, idx) => (
                  <div key={idx} className="flex gap-5 items-center p-5 bg-white/5 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm uppercase truncate">{menu.find(d => d.id === item.dishId)?.name}</h4>
                        <p className="text-[11px] font-mono font-bold text-primary mt-1">{formatKz(item.unitPrice * item.quantity)}</p>
                     </div>
                     <div className="flex items-center gap-4 bg-black/40 rounded-xl p-1.5 border border-white/5">
                        <button onClick={() => addToOrder(activeTableId, menu.find(d => d.id === item.dishId)!, -1)} className="w-9 h-9 rounded-lg bg-white/5 text-slate-500 hover:text-white">-</button>
                        <span className="font-black text-white text-sm min-w-[1.2rem] text-center">{item.quantity}</span>
                        <button onClick={() => addToOrder(activeTableId, menu.find(d => d.id === item.dishId)!, 1)} className="w-9 h-9 rounded-lg bg-primary text-black shadow-glow">+</button>
                     </div>
                  </div>
                ))}
             </div>

             <div className="p-10 bg-slate-900 border-t border-white/5">
                <div className="flex justify-between items-end mb-10">
                   <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Total</span>
                   <h3 className="text-5xl font-mono font-bold text-primary text-glow">{formatKz(currentOrder?.total || 0)}</h3>
                </div>
                <button onClick={() => setIsCheckoutModalOpen(true)} disabled={!currentOrder?.items.length} className="w-full py-8 bg-primary text-black rounded-xl font-black uppercase text-sm tracking-[0.3em] shadow-glow hover:brightness-110 active:scale-95 disabled:opacity-20">Finalizar Pedido</button>
             </div>
           </>
         )}
      </div>

      {/* Histórico e Modal de Alteração de Pagamento */}
      {isHistoryOpen && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 z-[120] p-12 animate-in slide-in-from-right duration-500 shadow-2xl">
           <div className="flex justify-between items-center mb-12">
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Turno Atual</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="p-4 bg-white/5 rounded-xl text-slate-500 hover:text-white"><X size={24}/></button>
           </div>
           <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar pr-2">
              {closedToday.map(order => (
                <div key={order.id} className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 flex flex-col gap-4 group hover:border-primary/40 transition-all">
                   <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase mb-2 tracking-widest">{order.invoiceNumber}</p>
                        <h4 className="text-white font-bold text-lg italic tracking-tighter">Mesa {order.tableId} • {formatKz(order.total)}</h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full mt-2 inline-block">{order.paymentMethod?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setOrderToChangeId(order.id); setIsChangePaymentModalOpen(true); }} className="p-4 bg-white/5 rounded-xl text-slate-400 hover:text-primary transition-all" title="Mudar Pagamento (Sem re-imprimir)"><ArrowRightLeft size={20}/></button>
                        <button onClick={() => printThermalInvoice(order, menu, settings, customers.find(c => c.id === order.customerId))} className="p-4 bg-white/5 rounded-xl text-slate-400 hover:text-primary transition-all border border-white/5" title="Reimprimir"><Printer size={20}/></button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Modal Alterar Pagamento - Puramente Administrativo */}
      {isChangePaymentModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-8 backdrop-blur-xl animate-in zoom-in duration-300">
           <div className="glass-panel p-12 rounded-[3rem] w-full max-w-4xl border border-white/10 text-center">
              <div className="flex items-center justify-center gap-4 text-orange-500 mb-6 font-black uppercase text-xs tracking-widest bg-orange-500/10 w-fit mx-auto px-6 py-2 rounded-full border border-orange-500/20">
                 <Shield size={16}/> Atualização no Histórico de Fecho
              </div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-10">Mudar Forma de Pagamento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {[
                   { id: 'NUMERARIO', label: 'Dinheiro', icon: Banknote },
                   { id: 'TPA', label: 'Multicaixa', icon: CreditCard },
                   { id: 'QR_CODE', label: 'Express', icon: QrCode },
                   { id: 'TRANSFERENCIA', label: 'Transf.', icon: ArrowRightLeft }
                 ].map(method => (
                   <button 
                     key={method.id} 
                     onClick={() => handleChangePayment(method.id as PaymentMethod)}
                     className="p-10 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-primary hover:bg-primary/10 transition-all transform active:scale-95"
                   >
                      <method.icon size={40} className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{method.label}</span>
                   </button>
                 ))}
              </div>
              <button onClick={() => setIsChangePaymentModalOpen(false)} className="mt-10 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all">Cancelar</button>
           </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-8 backdrop-blur-xl animate-in zoom-in duration-300">
           <div className="glass-panel p-12 rounded-[3rem] w-full max-w-4xl border border-white/10 shadow-2xl animate-in zoom-in duration-500">
              <div className="text-center mb-10">
                 <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Escolha o Meio de Pagamento</h3>
                 <p className="text-sm text-primary font-mono font-bold mt-2">Pagar: {formatKz(currentOrder?.total || 0)}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 {[
                   { id: 'NUMERARIO', label: 'Dinheiro', icon: Banknote, color: 'emerald' },
                   { id: 'TPA', label: 'Multicaixa', icon: CreditCard, color: 'primary' },
                   { id: 'QR_CODE', label: 'QR Code', icon: QrCode, color: 'blue' },
                   { id: 'TRANSFERENCIA', label: 'Transferência', icon: ArrowRightLeft, color: 'orange' },
                   { id: 'PAGAR_DEPOIS', label: 'Pagar Depois', icon: User, color: 'purple' }
                 ].map(method => (
                   <button 
                     key={method.id} 
                     onClick={() => handleCheckoutFinal(method.id as PaymentMethod)}
                     className="p-10 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-primary hover:bg-primary/5 transition-all transform active:scale-95"
                   >
                      <method.icon size={40} className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{method.label}</span>
                   </button>
                 ))}
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="w-full mt-10 py-5 bg-white/5 border border-white/10 rounded-xl text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all">Voltar ao Pedido</button>
           </div>
        </div>
      )}

    </div>
  );
};

export default POS;
