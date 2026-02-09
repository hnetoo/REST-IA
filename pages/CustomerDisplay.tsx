
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ChefHat, ShoppingBasket, Sparkles, CheckCircle2, UtensilsCrossed, Star, Clock } from 'lucide-react';
import LazyImage from '../components/LazyImage';

const CustomerDisplay = () => {
  const { tableId } = useParams();
  const { activeOrders, menu, settings, tables } = useStore();
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const table = tables.find(t => t.id === Number(tableId));
  const tableOrders = activeOrders.filter(o => o.tableId === Number(tableId) && o.status === 'ABERTO');
  
  const allItems = useMemo(() => tableOrders.flatMap(o => o.items), [tableOrders]);
  const total = useMemo(() => tableOrders.reduce((acc, o) => acc + o.total, 0), [tableOrders]);
  const isOrderActive = allItems.length > 0;

  const featuredItems = useMemo(() => {
    return menu.filter(d => d.isVisibleDigital).slice(0, 10);
  }, [menu]);

  // Efeito de Slideshow (Marketing)
  useEffect(() => {
    if (!isOrderActive) {
      const interval = setInterval(() => {
        setSlideshowIndex(prev => (prev + 1) % featuredItems.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [isOrderActive, featuredItems.length]);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', currency: 'AOA', maximumFractionDigits: 0 
  }).format(val);

  // MODO SLIDESHOW (Marketing quando não há pedido)
  if (!isOrderActive) {
    const currentSlide = featuredItems[slideshowIndex];
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col font-sans text-slate-200 overflow-hidden relative">
        {/* Background Visual Cinematográfico */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.1)_0%,_transparent_70%)] animate-pulse"></div>
        
        {/* Header Superior */}
        <div className="p-10 flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-black shadow-glow border-4 border-slate-900 shrink-0">
               <ChefHat size={48} />
            </div>
            <div>
               <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">
                 {settings.restaurantName || "Tasca do Vereda"}
               </h1>
               <p className="text-primary text-xl font-bold uppercase tracking-[0.4em] opacity-80">Experiência Gastronómica Única</p>
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-8 py-4 rounded-[2rem]">
                <Clock size={24} className="text-primary" />
                <span className="text-3xl font-mono font-bold text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             </div>
          </div>
        </div>

        {/* Área Principal de Slideshow */}
        <div className="flex-1 flex gap-12 p-10 pt-0 z-10 relative">
           <div className="flex-1 rounded-[4rem] overflow-hidden border-4 border-white/5 shadow-2xl relative animate-in fade-in zoom-in duration-1000 key={slideshowIndex}">
              <LazyImage 
                src={currentSlide?.image} 
                containerClassName="w-full h-full" 
                className="scale-110 animate-[slideshow_15s_linear_infinite]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
              
              <div className="absolute bottom-20 left-20 right-20">
                 <div className="flex items-center gap-3 mb-6 bg-yellow-500 text-black w-fit px-6 py-2 rounded-full font-black uppercase text-sm tracking-widest shadow-lg">
                    <Star size={18} fill="black" /> Sugestão do Chef
                 </div>
                 <h2 className="text-8xl font-black text-white italic uppercase tracking-tighter leading-tight mb-4 drop-shadow-2xl">
                    {currentSlide?.name}
                 </h2>
                 <p className="text-2xl text-slate-300 max-w-3xl leading-relaxed italic opacity-90 drop-shadow-lg">
                    "{currentSlide?.description}"
                 </p>
              </div>
           </div>

           <div className="w-[450px] flex flex-col gap-8">
              <div className="flex-1 glass-panel p-10 rounded-[3rem] border-white/5 flex flex-col items-center justify-center text-center">
                 <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8 animate-bounce">
                    <Sparkles size={48} />
                 </div>
                 <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Seja Bem-vindo!</h3>
                 <p className="text-slate-400 text-lg leading-relaxed mb-10">Estamos a preparar o melhor para si. Enquanto espera, conheça as nossas especialidades através do QR Code na mesa.</p>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-[progress_6s_linear_infinite]"></div>
                 </div>
              </div>

              <div className="p-10 bg-primary rounded-[3rem] text-black shadow-glow flex flex-col justify-center items-center text-center">
                 <UtensilsCrossed size={48} className="mb-4" />
                 <p className="text-3xl font-black uppercase tracking-tighter leading-none">BOM APETITE</p>
              </div>
           </div>
        </div>

        <style>{`
          @keyframes slideshow { from { transform: scale(1); } to { transform: scale(1.2); } }
          @keyframes progress { from { width: 0%; } to { width: 100%; } }
        `}</style>
      </div>
    );
  }

  // MODO PEDIDO ATIVO (Mostra a conta em tempo real)
  return (
    <div className="h-screen w-full bg-slate-950 overflow-hidden flex flex-col font-sans p-10 text-slate-200">
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

          <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
            {allItems.map((item, idx) => {
              const dish = menu.find(d => d.id === item.dishId);
              return (
                <div key={idx} className="flex items-center justify-between group animate-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-8">
                     <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-white/5 group-hover:border-primary/50 transition-all">
                        <img src={dish?.image} className="w-full h-full object-cover" />
                     </div>
                     <div>
                        <p className="text-2xl font-black text-white uppercase tracking-tighter italic">{dish?.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="px-3 py-1 bg-white/5 text-primary text-xs font-black rounded-lg">{item.quantity}x</span>
                           <span className="text-slate-500 font-mono text-sm">{formatKz(item.unitPrice)}</span>
                        </div>
                     </div>
                  </div>
                  <p className="text-3xl font-mono font-bold text-white group-hover:text-primary transition-colors">{formatKz(item.unitPrice * item.quantity)}</p>
                </div>
              );
            })}
          </div>
          
          <div className="p-12 bg-slate-900 border-t border-white/10 shrink-0 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 animate-pulse"></div>
             <div>
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] mb-3 text-sm">VALOR TOTAL A LIQUIDAR</p>
                <p className="text-8xl font-mono font-bold text-primary text-glow leading-none">{formatKz(total)}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed font-bold uppercase tracking-widest mb-4">Este documento não serve de fatura. Solicite o documento fiscal ao colaborador.</p>
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizado via AGT Kernel</span>
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
