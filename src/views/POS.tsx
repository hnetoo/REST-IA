
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
    createNewOrder, addToOrder, transferOrder, transferTable, closeTable,
    addSubAccount, removeSubAccount,
    checkoutTable, updateOrderPaymentMethod, settings, addNotification, customers, currentUser,
    paymentConfigs, customerDisplayMode, setCustomerDisplayMode
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [newSubAccountName, setNewSubAccountName] = useState('');
  const [transferTargetTableId, setTransferTargetTableId] = useState<number | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'METHOD' | 'CUSTOMER'>('METHOD');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSubaccountModalOpen, setIsSubaccountModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isChangePaymentModalOpen, setIsChangePaymentModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);
  
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

  const handleOpenCustomerDisplay = (targetTableId?: number | any) => {
    const target = typeof targetTableId === 'number' ? targetTableId : (activeTableId || 0);
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}#/customer-display/${target}`;
    window.open(url, 'VeredaCustomerDisplay', 'width=1200,height=800');
    addNotification('info', `Monitor do Cliente para Mesa ${target} ativo.`);
  };

  const handleCashClosingClick = () => {
    if (closedToday.length === 0) {
      addNotification('warning', 'Nenhuma venda fechada hoje.');
      return;
    }

    try {
      printCashClosing(closedToday, settings, currentUser?.name || 'Operador');
      addNotification('success', 'Relatório de Fecho Gerado.');
    } catch (err) {
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

  const handleAddSubAccount = () => {
    if (!activeTableId || !newSubAccountName.trim()) return;
    addSubAccount(activeTableId, newSubAccountName.trim());
    setNewSubAccountName('');
    setIsSubaccountModalOpen(false);
  };

  const handleTransferTable = () => {
    if (!activeTableId || !transferTargetTableId) return;
    transferTable(activeTableId, transferTargetTableId);
    setIsTransferModalOpen(false);
    setTransferTargetTableId(null);
    setActiveTable(null);
    setActiveOrder(null);
  };

  const handleAddToOrder = (dish: Dish, quantity: number = 1) => {
    if (!activeTableId) return;
    addToOrder(activeTableId, dish, quantity);
    setLastAddedItemId(dish.id);
    setTimeout(() => setLastAddedItemId(null), 2000);
  };

  const tableSubAccounts = useMemo(() => {
    if (!activeTableId) return [];
    return activeOrders.filter(o => o.tableId === activeTableId && o.status === 'ABERTO');
  }, [activeOrders, activeTableId]);

  const handleCheckoutFinal = (method: PaymentMethod, customerId?: string) => {
    if (!currentOrder) return;
    
    // Se for Pagar Depois e não tiver cliente selecionado, abrir modal de clientes
    if (method === 'PAGAR_DEPOIS' && !customerId && checkoutStep === 'METHOD') {
      setSelectedPaymentMethod(method);
      setCheckoutStep('CUSTOMER');
      return;
    }

    const orderToPrintId = currentOrder.id;
    console.log(`[POS] Finalizando pedido ${orderToPrintId} com método ${method}`);
    
    checkoutTable(currentOrder.id, method, customerId);
    setIsCheckoutModalOpen(false);
    setCheckoutStep('METHOD');
    setSelectedPaymentMethod(null);
    setSelectedCustomerId(undefined);
    
    // Aumentar o timeout e garantir que os dados estejam estáveis
    setTimeout(() => {
        const state = useStore.getState();
        const order = state.activeOrders.find(o => o.id === orderToPrintId);
        
        console.log(`[POS] Tentando imprimir pedido após checkout`, { 
            orderId: orderToPrintId, 
            encontrado: !!order,
            status: order?.status 
        });

        if (order) {
            printThermalInvoice(
                order, 
                state.menu, 
                state.settings, 
                state.customers.find(c => c.id === order.customerId)
            );
        } else {
            console.error(`[POS] Pedido ${orderToPrintId} não encontrado no estado para impressão.`);
            addNotification('error', 'Erro ao localizar pedido para impressão.');
        }
    }, 500);
  };

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', currency: 'AOA', maximumFractionDigits: 0 
  }).format(val);

  return (
    <div className="flex h-full overflow-hidden bg-background font-sans select-none">
      
      {/* Sidebar Categorias */}
      <div className="w-24 bg-slate-950 border-r border-white/5 flex flex-col items-center py-10 gap-8 z-40 relative">
         <div className="flex-1 flex flex-col items-center gap-6 overflow-y-auto no-scrollbar w-full">
           <button onClick={() => setSelectedCategoryId('TODOS')} className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center transition-all ${selectedCategoryId === 'TODOS' ? 'bg-primary text-black shadow-glow scale-105' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>
              <Grid3X3 size={24} />
           </button>
           {categories.map(cat => (
             <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`w-16 h-16 shrink-0 rounded-2xl flex flex-col items-center justify-center transition-all group ${selectedCategoryId === cat.id ? 'bg-primary text-black shadow-glow scale-105' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}>
                <Tag size={20} />
                <span className="text-[7px] font-black uppercase mt-1 opacity-60 truncate w-full text-center px-1">{cat.name}</span>
             </button>
           ))}
         </div>

         {/* Botões Administrativos na parte inferior da sidebar */}
         <div className="flex flex-col gap-4 mt-auto pt-6 border-t border-white/5 w-full items-center">
            <button 
              onClick={() => setIsHistoryOpen(true)} 
              className="w-14 h-14 rounded-2xl bg-white/5 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center group"
              title="Histórico de Turno"
            >
              <History size={22} className="group-hover:rotate-[-10deg] transition-transform" />
            </button>
            
            <button 
              onClick={handleCashClosingClick}
              className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all flex flex-col items-center justify-center gap-1 group shadow-lg shadow-emerald-500/5"
              title="Fechar Caixa"
            >
              <LogOut size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[6px] font-black uppercase tracking-tighter">FECHO</span>
            </button>
         </div>
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
                   <div className="flex items-center gap-6">
                      <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Mesa {activeTableId}</h2>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">{currentOrder?.subAccountName}</p>
                          {tableSubAccounts.length > 1 && (
                            <div className="flex gap-1">
                              {tableSubAccounts.map(sa => (
                                <button 
                                  key={sa.id}
                                  onClick={() => setActiveOrder(sa.id)}
                                  className={`w-2 h-2 rounded-full transition-all ${sa.id === activeOrderId ? 'bg-primary scale-125 shadow-glow' : 'bg-white/20 hover:bg-white/40'}`}
                                  title={sa.subAccountName}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-xl">
                          <button 
                            onClick={() => setIsSubaccountModalOpen(true)}
                            className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-primary transition-all"
                            title="Nova Subconta"
                          >
                            <UserPlus size={16} />
                          </button>
                          <button 
                            onClick={() => setIsTransferModalOpen(true)}
                            className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-orange-500 transition-all"
                            title="Transferir Mesa"
                          >
                            <ArrowRightLeft size={16} />
                          </button>
                        </div>
                        
                        <div className="h-8 w-px bg-white/10"></div>
                        
                        <button 
                          onClick={() => {
                            if (activeTableId) {
                              closeTable(activeTableId);
                              setActiveTable(null);
                              setActiveOrder(null);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all group/close"
                          title="Fechar Mesa (Libertar mesa sem pedidos)"
                        >
                          <X size={16} className="group-hover/close:rotate-90 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Fechar Mesa</span>
                        </button>
                      </div>
                   </div>
                </div>
              )}
           </div>
           
          <div className="flex items-center gap-4">
              <div className="h-10 w-px bg-white/10 mx-2 hidden xl:block"></div>

              <div className="flex items-center gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <button 
                  onClick={handleOpenCustomerDisplay} 
                  className="flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:bg-white/10 hover:text-white transition-all group" 
                  title="Abrir 2.º Ecrã"
                >
                  <Monitor size={18} className="group-hover:scale-110 transition-transform" />
                </button>

                {activeTableId && (
                  <button 
                    onClick={() => {
                      const currentMode = customerDisplayMode[activeTableId] || 'MARKETING';
                      const newMode = currentMode === 'MARKETING' ? 'ORDER_SUMMARY' : 'MARKETING';
                      setCustomerDisplayMode(activeTableId, newMode);
                      addNotification('info', `2.º Ecrã: Modo ${newMode === 'ORDER_SUMMARY' ? 'Pagamento' : 'Marketing'}`);
                    }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                      customerDisplayMode[activeTableId] === 'ORDER_SUMMARY' 
                        ? 'bg-primary text-black shadow-glow' 
                        : 'bg-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <CreditCard size={16} />
                    {customerDisplayMode[activeTableId] === 'ORDER_SUMMARY' ? 'Mostrar Marketing' : 'Enviar p/ Pagamento'}
                  </button>
                )}
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 no-scrollbar bg-slate-900/10">
           <div className="flex items-center justify-between mb-10">
             <div>
               <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Explorar Itens</p>
               <h3 className="text-xl font-black text-white tracking-tight mt-1">Selecione produtos para adicionar ao pedido</h3>
             </div>
             <div className="relative w-full max-w-xs md:max-w-sm lg:max-w-md group">
               <div className="absolute inset-0 rounded-2xl bg-primary/20 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none"></div>
               <div className="relative flex items-center gap-3 px-4 py-2.5 bg-white/[0.06] border border-primary/40 rounded-2xl shadow-glow">
                 <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-black shrink-0">
                   <Search size={16} />
                 </div>
                 <input 
                   type="text" 
                   placeholder="Pesquisar item por nome…" 
                   className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-400" 
                   value={searchTerm} 
                   onChange={e => setSearchTerm(e.target.value)} 
                 />
               </div>
             </div>
           </div>
           {!activeTableId ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-10 animate-in fade-in zoom-in duration-700">
                 {tables.map((table) => {
                    const isOccupied = activeOrders.some(o => o.tableId === table.id && o.status === 'ABERTO');
                    return (
                      <button 
                        key={table.id} 
                        onClick={() => handleTableClick(table)}
                        className={`aspect-square rounded-[2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-90 relative group ${!isOccupied ? 'border-white/5 bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.05]' : 'border-primary bg-primary/10 shadow-glow scale-105'}`}
                      >
                         <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${!isOccupied ? 'text-slate-600' : 'text-primary/60'}`}>{table.name}</span>
                         <span className={`text-5xl font-black italic tracking-tighter leading-none ${!isOccupied ? 'text-white' : 'text-primary'}`}>{table.id}</span>
                         
                         {isOccupied && (
                           <div className="absolute -top-3 -right-3 flex gap-1">
                             <div className="w-8 h-8 bg-primary text-black rounded-full flex items-center justify-center shadow-lg animate-bounce">
                               <Users size={14} />
                             </div>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 closeTable(table.id);
                               }}
                               className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all scale-0 group-hover:scale-100"
                               title="Fechar Mesa"
                             >
                               <X size={14} />
                             </button>
                           </div>
                         )}
                      </button>
                    );
                 })}
              </div>
           ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                 {menu.filter(d => selectedCategoryId === 'TODOS' || d.categoryId === selectedCategoryId).filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((dish) => (
                    <button 
                      key={dish.id} 
                      onClick={() => handleAddToOrder(dish)} 
                      className={`group bg-white/[0.03] rounded-[2.5rem] border-2 overflow-hidden flex flex-col transition-all active:scale-95 relative hover:shadow-2xl ${lastAddedItemId === dish.id ? 'border-primary shadow-glow scale-105' : 'border-white/5 hover:border-primary/30 hover:bg-white/[0.06]'}`}
                    >
                       <div className="aspect-[4/4] w-full overflow-hidden relative">
                          <LazyImage src={dish.image} alt={dish.name} containerClassName="w-full h-full" className="group-hover:scale-110 transition-all duration-1000 ease-out" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                          
                          {lastAddedItemId === dish.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in zoom-in duration-300">
                               <div className="bg-primary text-black p-4 rounded-full shadow-2xl scale-110">
                                  <Plus size={32} strokeWidth={4} />
                               </div>
                            </div>
                          )}
                          
                          <div className="absolute bottom-6 left-8 right-8 text-left transform group-hover:translate-y-[-4px] transition-transform">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="h-px w-8 bg-primary/50"></div>
                               <p className="text-[12px] font-black text-primary uppercase tracking-widest">{formatKz(dish.price)}</p>
                             </div>
                             <h4 className="text-white font-black text-lg truncate uppercase tracking-tighter leading-tight drop-shadow-lg">{dish.name}</h4>
                          </div>
                       </div>
                    </button>
                 ))}
              </div>
           )}
        </div>
      </div>

      {/* Painel Lateral do Pedido */}
      <div className={`w-[480px] border-l border-white/5 bg-slate-950 flex flex-col h-full transition-all duration-500 shadow-2xl z-50 ${!activeOrderId ? 'translate-x-full' : ''}`}>
         {activeOrderId && (
           <>
             <div className="p-8 border-b border-white/5 bg-slate-900/20">
                <div className="flex items-center gap-4 justify-between mb-8">
                   <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-glow"></div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter truncate">Pedido #{activeOrderId.slice(-4)}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 truncate">
                          <User size={12}/> {currentOrder?.subAccountName}
                        </p>
                        {currentOrder?.subAccountName !== 'Principal' && currentOrder?.items.length === 0 && (
                          <button 
                            onClick={() => removeSubAccount(currentOrder.id)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Remover Subconta"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                   </div>
                   
                   <div className="flex gap-2">
                     <button 
                        onClick={() => {
                            printTableReview(currentOrder!, menu, settings);
                        }} 
                        className="p-3 bg-white/5 text-slate-400 hover:text-primary rounded-xl border border-white/10 transition-all"
                        title="Imprimir Consulta"
                     >
                        <Printer size={20}/>
                     </button>
                     <button onClick={() => { setActiveOrder(null); setActiveTable(null); }} className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all"><X size={20}/></button>
                   </div>
                </div>
                
                {tableSubAccounts.length > 1 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-2">
                    {tableSubAccounts.map(sa => (
                      <button
                        key={sa.id}
                        onClick={() => setActiveOrder(sa.id)}
                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${sa.id === activeOrderId ? 'bg-primary text-black border-primary shadow-glow' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'}`}
                      >
                        {sa.subAccountName}
                      </button>
                    ))}
                  </div>
                )}
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar bg-slate-950/50">
                {currentOrder?.items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-40">
                    <ShoppingBasket size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Carrinho Vazio</p>
                  </div>
                ) : (
                  currentOrder?.items.map((item, idx) => {
                    const dish = menu.find(d => d.id === item.dishId);
                    return (
                      <div key={idx} className="flex gap-4 items-center p-4 bg-white/[0.03] rounded-[1.5rem] border border-white/5 group hover:border-primary/20 transition-all animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                           <LazyImage src={dish?.image || ''} alt={dish?.name || ''} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm uppercase truncate tracking-tight">{dish?.name}</h4>
                            <p className="text-[11px] font-mono font-bold text-primary/80 mt-0.5">{formatKz(item.unitPrice * item.quantity)}</p>
                         </div>
                         <div className="flex items-center gap-3 bg-black/40 rounded-xl p-1 border border-white/5">
                            <button onClick={() => addToOrder(activeTableId, dish!, -1)} className="w-8 h-8 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-colors">-</button>
                            <span className="w-6 text-center font-black text-white text-xs">{item.quantity}</span>
                            <button onClick={() => handleAddToOrder(dish!, 1)} className="w-8 h-8 rounded-lg bg-primary text-black shadow-glow transition-transform active:scale-90">+</button>
                         </div>
                      </div>
                    );
                  })
                )}
             </div>

             <div className="p-8 bg-slate-900/40 backdrop-blur-md border-t border-white/5">
                <div className="space-y-3 mb-8">
                   <div className="flex justify-between items-center text-slate-500">
                      <span className="text-[9px] font-black uppercase tracking-widest">Subtotal</span>
                      <span className="text-sm font-bold font-mono">{formatKz(currentOrder?.total || 0)}</span>
                   </div>
                   <div className="flex justify-between items-center text-slate-500">
                      <span className="text-[9px] font-black uppercase tracking-widest">Taxas (Incluso)</span>
                      <span className="text-sm font-bold font-mono">{formatKz(0)}</span>
                   </div>
                   <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Total</span>
                      <h3 className="text-4xl font-mono font-bold text-primary text-glow">{formatKz(currentOrder?.total || 0)}</h3>
                   </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setActiveOrder(null)} 
                    className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Suspender
                  </button>
                  <button 
                    onClick={() => setIsCheckoutModalOpen(true)} 
                    disabled={!currentOrder?.items.length} 
                    className="flex-[2] py-5 bg-primary text-black rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-glow hover:brightness-110 active:scale-[0.98] disabled:opacity-10 transition-all"
                  >
                    Finalizar Pedido
                  </button>
                </div>
             </div>
           </>
         )}
      </div>

      {/* Modal de Subcontas */}
      {isSubaccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white italic uppercase mb-6">Nova Subconta</h3>
            <p className="text-slate-400 text-sm mb-6">Atribua um nome personalizado para identificar este grupo na Mesa {activeTableId}.</p>
            
            <input 
              type="text" 
              value={newSubAccountName}
              onChange={e => setNewSubAccountName(e.target.value)}
              placeholder="Ex: Grupo Amigos, Família Silva..."
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary mb-8"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddSubAccount()}
            />

            <div className="flex gap-4">
              <button 
                onClick={() => setIsSubaccountModalOpen(false)}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddSubAccount}
                className="flex-1 py-4 bg-primary text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow"
              >
                Criar Subconta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência de Mesa */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full glass-panel p-10 rounded-[2.5rem] border border-white/10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white italic uppercase mb-2">Transferir Mesa {activeTableId}</h3>
            <p className="text-slate-400 text-sm mb-8">Selecione a mesa de destino. Todos os itens e subcontas serão movidos.</p>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 mb-10 max-h-[40vh] overflow-y-auto p-2 no-scrollbar">
              {tables.filter(t => t.id !== activeTableId).map(table => {
                const isOccupied = activeOrders.some(o => o.tableId === table.id && o.status === 'ABERTO');
                return (
                  <button 
                    key={table.id}
                    onClick={() => setTransferTargetTableId(table.id)}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${transferTargetTableId === table.id ? 'border-primary bg-primary/20 scale-110 shadow-glow' : isOccupied ? 'border-orange-500/30 bg-orange-500/5 opacity-60 cursor-not-allowed' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                    disabled={isOccupied}
                  >
                    <span className="text-[10px] font-black text-white">{table.id}</span>
                    {isOccupied && <span className="text-[7px] font-black text-orange-500 uppercase">Ocupada</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setIsTransferModalOpen(false); setTransferTargetTableId(null); }}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleTransferTable}
                disabled={!transferTargetTableId}
                className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-20"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

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
                        <button 
                            onClick={() => {
                                console.log(`[POS] Solicitando reimpressão do pedido ${order.invoiceNumber}`);
                                printThermalInvoice(order, menu, settings, customers.find(c => c.id === order.customerId));
                            }} 
                            className="p-4 bg-white/5 rounded-xl text-slate-400 hover:text-primary transition-all border border-white/5" 
                            title="Reimprimir"
                        >
                            <Printer size={20}/>
                        </button>
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
              
              {checkoutStep === 'METHOD' ? (
                <>
                  <div className="text-center mb-10">
                     <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Escolha o Meio de Pagamento</h3>
                     <p className="text-sm text-primary font-mono font-bold mt-2">Pagar: {formatKz(currentOrder?.total || 0)}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {paymentConfigs.filter(c => c.isActive).map(method => (
                       <button 
                         key={method.id} 
                         onClick={() => handleCheckoutFinal(method.type)}
                         className="p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-primary hover:bg-primary/5 transition-all transform active:scale-95"
                       >
                          <Banknote size={32} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{method.name}</span>
                       </button>
                     ))}
                     {/* Fallback para Pagar Depois se não estiver configurado explicitamente */}
                     {!paymentConfigs.some(c => c.type === 'PAGAR_DEPOIS' && c.isActive) && (
                       <button 
                         onClick={() => handleCheckoutFinal('PAGAR_DEPOIS')}
                         className="p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center gap-4 hover:border-purple-500 hover:bg-purple-500/5 transition-all transform active:scale-95"
                       >
                          <User size={32} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pagar Depois</span>
                       </button>
                     )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-10">
                     <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Selecionar Cliente</h3>
                     <p className="text-sm text-purple-500 font-mono font-bold mt-2">Venda a Crédito: {formatKz(currentOrder?.total || 0)}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                     {customers.map(customer => (
                       <button 
                         key={customer.id} 
                         onClick={() => handleCheckoutFinal(selectedPaymentMethod!, customer.id)}
                         className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-start gap-2 hover:border-primary hover:bg-primary/5 transition-all text-left"
                       >
                          <span className="text-white font-bold text-sm uppercase">{customer.name}</span>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo: {formatKz(customer.balance)}</span>
                       </button>
                     ))}
                  </div>
                  <button 
                    onClick={() => setCheckoutStep('METHOD')}
                    className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-white"
                  >
                    Voltar aos Métodos
                  </button>
                </>
              )}

              <button 
                onClick={() => {
                  setIsCheckoutModalOpen(false);
                  setCheckoutStep('METHOD');
                }} 
                className="w-full mt-10 py-5 bg-white/5 border border-white/10 rounded-xl text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all"
              >
                Cancelar Venda
              </button>
           </div>
        </div>
      )}

    </div>
  );
};

export default POS;
