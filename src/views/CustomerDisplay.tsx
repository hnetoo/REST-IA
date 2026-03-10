
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ChefHat, ShoppingBasket, Sparkles, CheckCircle2, UtensilsCrossed, Star, Clock, CreditCard, ArrowLeft } from 'lucide-react';
import LazyImage from '../components/LazyImage';

const CustomerDisplay = () => {
  const { tableId } = useParams();
  const { 
    activeOrders, menu, settings, tables, 
    customerDisplayMode, setCustomerDisplayMode,
    addNotification, updateTable
  } = useStore();
  
  // Sincronização em tempo real entre abas/janelas
  useEffect(() => {
    const channel = new BroadcastChannel('vereda_state_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'STATE_UPDATE') {
        useStore.persist.rehydrate();
      }
    };
    return () => channel.close();
  }, []);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Relógio e Saudação Dinâmica
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Bom Dia";
    if (hour < 18) return "Boa Tarde";
    return "Boa Noite";
  }, [currentTime]);

  const table = tables.find(t => t.id === Number(tableId));
  const tableOrders = activeOrders.filter(o => o.tableId === Number(tableId) && o.status === 'ABERTO');
  
  const allItems = useMemo(() => tableOrders.flatMap(o => o.items), [tableOrders]);
  const currentOrder = tableOrders[0];
  const total = useMemo(() => tableOrders.reduce((acc, o) => acc + o.total, 0), [tableOrders]);
  
  // O modo de exibição agora é controlado explicitamente pelo operador ou pelo estado do pedido
  const isOrderActive = useMemo(() => {
    const mode = customerDisplayMode[Number(tableId)] || 'MARKETING';
    return mode === 'ORDER_SUMMARY' && allItems.length > 0;
  }, [customerDisplayMode, tableId, allItems]);

  const handleConfirmAndPay = () => {
    if (table) {
      // Sinaliza ao POS que o cliente está pronto
      updateTable({ ...table, status: 'PAGAMENTO' });
      addNotification('info', `Cliente na ${table.name} solicitou fechamento.`);
      
      // Feedback visual ao cliente
      const btn = document.getElementById('btn-confirm-pay');
      if (btn) {
        btn.innerHTML = '<span class="flex items-center gap-2"><div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Aguardando Operador...</span>';
        btn.classList.add('opacity-70', 'cursor-not-allowed');
      }
    }
  };

  const handleGoBack = () => {
    if (tableId) {
      setCustomerDisplayMode(Number(tableId), 'MARKETING');
    }
  };

  const featuredItems = useMemo(() => {
    const visible = menu.filter(d => d.isVisibleDigital).slice(0, 10);
    if (visible.length > 0) return visible;
    if (menu.length > 0) return menu.slice(0, 5);
    return [];
  }, [menu]);

  // Fallback images
  const fallbackImages = [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
  ];

  // Efeito de Slideshow (Marketing)
  useEffect(() => {
    if (!isOrderActive) {
      const interval = setInterval(() => {
        setSlideshowIndex(prev => {
          if (featuredItems.length > 0) {
            return (prev + 1) % featuredItems.length;
          }
          return (prev + 1) % fallbackImages.length;
        });
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [isOrderActive, featuredItems.length, fallbackImages.length]);

  const formatKz = (val: number) => {
    return `${new Intl.NumberFormat('pt-AO', { 
      maximumFractionDigits: 0 
    }).format(val)} ${settings.currency || 'Kz'}`;
  };

  // MODO SLIDESHOW (Marketing quando não há pedido)
  if (!isOrderActive) {
    const currentSlide = featuredItems[slideshowIndex];
    const displayImage = currentSlide?.image || fallbackImages[slideshowIndex % fallbackImages.length];
    const displayName = currentSlide?.name || "Sabores Inesquecíveis";
    const displayDesc = currentSlide?.description || "Descubra a nossa paixão pela gastronomia em cada detalhe.";
    const displayPrice = currentSlide?.price ? formatKz(currentSlide.price) : null;

    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col font-sans text-slate-200 overflow-hidden relative">
        {/* Background Visual Cinematográfico com gradientes animados */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        
        {/* Header Superior Dinâmico */}
        <div className="p-6 lg:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center z-10 relative gap-6 lg:gap-0">
          <div className="flex items-center gap-4 lg:gap-8">
            {settings.appLogoUrl ? (
              <img 
                src={settings.appLogoUrl} 
                alt="Logo" 
                className="w-16 h-16 lg:w-24 lg:h-24 object-contain rounded-[2rem] lg:rounded-[2.5rem] shadow-glow border-4 border-slate-900 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500 bg-white/5 p-2" 
              />
            ) : (
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-primary rounded-[2rem] lg:rounded-[2.5rem] flex items-center justify-center text-black shadow-glow border-4 border-slate-900 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <ChefHat size={32} className="lg:hidden" />
                <ChefHat size={48} className="hidden lg:block" />
              </div>
            )}
            <div>
               <div className="flex items-center gap-3 mb-1">
                 <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary/30">
                   {greeting}
                 </span>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] opacity-80">Seja Bem-vindo à</p>
               </div>
               <h1 className="text-4xl lg:text-7xl font-black text-white italic uppercase tracking-tighter leading-none">
                 {settings.restaurantName || "Tasca do Vereda"}
               </h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
             <div className="flex items-center justify-between lg:justify-end gap-4 bg-white/5 border border-white/10 px-6 py-3 lg:px-8 lg:py-4 rounded-[2rem] lg:rounded-[2.5rem] backdrop-blur-md shadow-2xl w-full lg:w-auto">
                <div className="flex flex-col items-start lg:items-end">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Horário Local</span>
                  <span className="text-2xl lg:text-4xl font-mono font-bold text-white leading-none">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="w-px h-10 bg-white/10 mx-2"></div>
                <Clock size={24} className="text-primary animate-pulse lg:hidden" />
                <Clock size={32} className="text-primary animate-pulse hidden lg:block" />
             </div>
          </div>
        </div>

        {/* Área Principal de Slideshow */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-12 p-6 lg:p-10 pt-0 lg:pt-4 z-10 relative overflow-hidden overflow-y-auto lg:overflow-y-hidden">
           <div className="flex-1 rounded-[2.5rem] lg:rounded-[4.5rem] overflow-hidden border-4 border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative group min-h-[400px]">
              <div key={slideshowIndex} className="w-full h-full animate-in fade-in zoom-in duration-1000">
                <LazyImage 
                  src={displayImage} 
                  containerClassName="w-full h-full" 
                  className="scale-110 animate-[slideshow_20s_linear_infinite] object-cover"
                />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-20 left-20 right-20">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="flex items-center gap-2 bg-primary text-black px-6 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                       <Sparkles size={16} fill="black" /> {currentSlide ? 'Destaque do Dia' : 'Sugestão'}
                    </div>
                    {displayPrice && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 rounded-2xl font-mono font-bold text-xl">
                        {displayPrice}
                      </div>
                    )}
                 </div>
                 
                 <h2 className="text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.85] mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] max-w-4xl">
                    {displayName}
                 </h2>
                 <p className="text-3xl text-slate-200 max-w-3xl leading-relaxed italic opacity-95 drop-shadow-lg font-medium">
                    "{displayDesc}"
                 </p>
              </div>

              {/* Indicadores de Slide */}
              <div className="absolute bottom-10 right-20 flex gap-3 items-center bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/5">
                 {featuredItems.map((_, i) => (
                   <div 
                    key={i} 
                    className={`h-2 rounded-full transition-all duration-700 ${i === slideshowIndex ? 'w-16 bg-primary shadow-glow' : 'w-4 bg-white/10 hover:bg-white/30'}`}
                   ></div>
                 ))}
              </div>
           </div>

           {/* Painel Lateral Informativo */}
           <div className="w-[480px] flex flex-col gap-8">
              <div className="flex-1 glass-panel p-12 rounded-[4rem] border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                 
                 <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mb-10 group-hover:scale-110 transition-transform duration-500 shadow-inner border border-primary/20">
                    <UtensilsCrossed size={64} className="animate-pulse" />
                 </div>
                 
                 <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6 leading-none">Menu Digital</h3>
                 <p className="text-slate-400 text-xl leading-relaxed mb-12 font-medium">
                   Escaneie o QR Code na sua mesa para explorar o menu completo e fazer pedidos diretamente.
                 </p>
                 
                 <div className="w-full space-y-6">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex items-center gap-6 group-hover:bg-white/10 transition-all">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-black text-xs shadow-glow">QR</div>
                       <div className="text-left">
                          <p className="text-white font-black uppercase text-sm tracking-widest">Acesso Rápido</p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Sempre Atualizado</p>
                       </div>
                    </div>
                    
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                       <div className="h-full bg-primary rounded-full animate-[progress_6s_linear_infinite] shadow-glow"></div>
                    </div>
                 </div>
              </div>

              <div className="p-12 bg-primary rounded-[4rem] text-black shadow-glow flex flex-col justify-center items-center text-center transform hover:scale-[1.02] transition-transform duration-500 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                 <ChefHat size={56} className="mb-6 animate-bounce" />
                 <p className="text-4xl font-black uppercase tracking-tighter leading-none italic">Experiência Única</p>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4 opacity-80">Qualidade • Inovação • Sabor</p>
              </div>
           </div>
        </div>

        <style>{`
          @keyframes slideshow { 
            0% { transform: scale(1.1) translate(0, 0); } 
            50% { transform: scale(1.15) translate(-1%, -1%); }
            100% { transform: scale(1.1) translate(0, 0); } 
          }
          @keyframes progress { from { width: 0%; } to { width: 100%; } }
          .text-glow { text-shadow: 0 0 20px rgba(6, 182, 212, 0.5); }
        `}</style>
      </div>
    );
  }

  // MODO PEDIDO ATIVO (Mostra a conta em tempo real)
  return (
    <div className="h-screen w-full bg-slate-950 overflow-hidden flex flex-col font-sans p-10 text-slate-200 animate-in fade-in duration-1000">
      <div className="flex justify-between items-center mb-10 shrink-0 gap-8">
        <div className="flex items-center gap-6 min-w-0 flex-1">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-black shadow-glow border border-white/10 shrink-0">
            <ChefHat size={40} />
          </div>
          <div className="min-w-0">
            <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none truncate">
              {settings.restaurantName}
            </h1>
            <p className="text-slate-500 text-lg font-bold uppercase tracking-[0.4em] mt-2 opacity-60">Sua Conta • {table?.name || 'Mesa'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-8 py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-500 shrink-0 shadow-lg">
           <CheckCircle2 size={28} />
           <span className="text-sm font-black uppercase tracking-[0.2em]">Pedido Ativo e Seguro</span>
        </div>
      </div>

      <div className="flex-1 flex gap-10 overflow-hidden">
        <div className="flex-1 glass-panel rounded-[4rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
              <ShoppingBasket className="text-primary" /> Carrinho de Consumo
            </h2>
            <span className="bg-primary/20 border border-primary/30 text-primary px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">{allItems.length} Itens</span>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-4 no-scrollbar bg-slate-900/10">
            <div className="grid grid-cols-12 gap-4 mb-6 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <div className="col-span-6">Produto</div>
              <div className="col-span-2 text-center">Qtd</div>
              <div className="col-span-2 text-right">Unitário</div>
              <div className="col-span-2 text-right">Subtotal</div>
            </div>

            {allItems.map((item, idx) => {
              const dish = menu.find(d => d.id === item.dishId);
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center p-6 bg-white/[0.03] rounded-[2rem] border border-white/5 group hover:border-primary/20 transition-all animate-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="col-span-6 flex items-center gap-6">
                     <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-primary/30 transition-all shrink-0">
                        <LazyImage src={dish?.image || ''} className="w-full h-full object-cover" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-xl font-black text-white uppercase tracking-tighter italic truncate">{dish?.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Categoria: {menu.find(m => m.id === item.dishId)?.categoryId || 'Geral'}</p>
                     </div>
                  </div>
                  
                  <div className="col-span-2 flex justify-center">
                    <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-black rounded-xl border border-primary/20">
                      {item.quantity}
                    </span>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="text-slate-400 font-mono text-sm">{formatKz(item.unitPrice)}</span>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="text-2xl font-mono font-bold text-white group-hover:text-primary transition-colors">
                      {formatKz(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="p-12 bg-slate-900/60 backdrop-blur-xl border-t border-white/10 shrink-0 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 animate-pulse"></div>
             
             <div className="flex gap-10 items-center">
                <div>
                   <p className="text-slate-500 font-black uppercase tracking-[0.4em] mb-3 text-[10px]">TOTAL DA ENCOMENDA</p>
                   <p className="text-8xl font-mono font-bold text-primary text-glow leading-none">{formatKz(total)}</p>
                </div>
                
                <div className="h-20 w-px bg-white/10 mx-4"></div>
                
                <div className="flex gap-4">
                   <button 
                     onClick={handleGoBack}
                     className="flex flex-col items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
                   >
                      <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
                   </button>
                   
                   <button 
                     id="btn-confirm-pay"
                     onClick={handleConfirmAndPay}
                     className="flex items-center gap-4 px-12 py-4 bg-primary text-black rounded-[2rem] font-black uppercase text-lg tracking-tighter shadow-glow hover:scale-105 active:scale-95 transition-all"
                   >
                      <CreditCard size={28} />
                      Confirmar e Pagar
                   </button>
                </div>
             </div>

             <div className="text-right hidden xl:block">
                <p className="text-[9px] text-slate-500 max-w-[180px] leading-relaxed font-bold uppercase tracking-widest mb-4 italic opacity-60">Confirme todos os itens antes de prosseguir para o pagamento.</p>
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Terminal Seguro</span>
                </div>
             </div>
          </div>
        </div>

        <div className="w-[400px] flex flex-col gap-10">
           <div className="flex-1 glass-panel rounded-[4rem] overflow-hidden relative group border-white/5">
              <LazyImage 
                src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80" 
                containerClassName="w-full h-full opacity-40 group-hover:scale-110 transition-transform duration-[10s]" 
                alt="Promo" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10">
                 <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">Experimente as nossas Bebidas Naturais</h3>
                 <p className="text-slate-400 text-sm leading-relaxed">Feitas na hora com as melhores frutas da época de Angola.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplay;
