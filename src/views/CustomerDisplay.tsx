
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ChefHat, ShoppingBasket, Sparkles, CheckCircle2, UtensilsCrossed, Star, Clock, CreditCard, ArrowLeft, Banknote, Smartphone, Wifi } from 'lucide-react';
import QRCode from 'qrcode';

const CustomerDisplay = () => {
  const { tableId } = useParams();
  const { 
    activeOrders, menu, settings, tables, 
    customerDisplayMode, setCustomerDisplayMode,
    addNotification, updateTable
  } = useStore();
  
  const [isActivated, setIsActivated] = useState(false);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCursor, setShowCursor] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [nextSlideIndex, setNextSlideIndex] = useState(1);
  const rehydrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Throttled rehydrate (max 1x per second)
  const throttledRehydrate = useCallback(() => {
    if (rehydrateTimerRef.current) return;
    rehydrateTimerRef.current = setTimeout(() => {
      try { useStore.persist.rehydrate(); } catch (e) { /* silent */ }
      rehydrateTimerRef.current = null;
    }, 1000);
  }, []);

  // Sincronização em tempo real entre abas/janelas
  useEffect(() => {
    const generalChannel = new BroadcastChannel('vereda_state_sync');
    const tableChannel = new BroadcastChannel(`vereda_table_${tableId}`);
    
    generalChannel.onmessage = (event) => {
      if (event.data?.type === 'STATE_UPDATE') throttledRehydrate();
    };
    tableChannel.onmessage = () => throttledRehydrate();
    
    return () => {
      generalChannel.close();
      tableChannel.close();
    };
  }, [tableId, throttledRehydrate]);

  // Auto-esconder cursor após 3s de inactividade
  useEffect(() => {
    if (!isActivated) return;
    const handleMouseMove = () => {
      setShowCursor(true);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
      cursorTimeoutRef.current = setTimeout(() => setShowCursor(false), 3000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    cursorTimeoutRef.current = setTimeout(() => setShowCursor(false), 3000);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    };
  }, [isActivated]);

  // Auto-activar fullscreen ao carregar (sem precisar de clique)
  useEffect(() => {
    const autoActivate = async () => {
      setIsActivated(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        // Fullscreen pode falhar sem user gesture — tentar ao primeiro clique/tecla
        console.warn('[CustomerDisplay] Auto-fullscreen falhou, tentará no primeiro input:', e);
        const retryFullscreen = () => {
          document.documentElement.requestFullscreen?.().catch(() => {});
          document.removeEventListener('click', retryFullscreen);
          document.removeEventListener('keydown', retryFullscreen);
        };
        document.addEventListener('click', retryFullscreen, { once: true });
        document.addEventListener('keydown', retryFullscreen, { once: true });
      }
    };
    autoActivate();
  }, []);

  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Relógio
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

  const fullDate = useMemo(() => {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${dias[currentTime.getDay()]}, ${currentTime.getDate()} de ${meses[currentTime.getMonth()]}`;
  }, [currentTime]);

  const table = tables.find(t => t.id === Number(tableId));
  const tableOrders = activeOrders.filter(o => o.tableId === Number(tableId) && o.status === 'ABERTO');
  
  const allItems = useMemo(() => tableOrders.flatMap(o => o.items), [tableOrders]);
  const currentOrder = tableOrders[0];
  const total = useMemo(() => tableOrders.reduce((acc, o) => acc + o.total, 0), [tableOrders]);
  
  const isOrderActive = useMemo(() => {
    const mode = customerDisplayMode[Number(tableId)] || 'MARKETING';
    return mode === 'ORDER_SUMMARY' && allItems.length > 0;
  }, [customerDisplayMode, tableId, allItems]);

  // Gerar QR Code real para menu público da mesa
  useEffect(() => {
    const generateQR = async () => {
      try {
        const baseUrl = window.location.origin;
        const menuUrl = `${baseUrl}/#/menu-public?mesa=${tableId || ''}`;
        const qr = await QRCode.toDataURL(menuUrl, {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M'
        });
        setQrCodeUrl(qr);
      } catch (e) {
        console.warn('[CustomerDisplay] QR generation failed:', e);
      }
    };
    generateQR();
  }, [tableId]);

  const handleConfirmAndPay = () => {
    if (table) {
      updateTable({ ...table, status: 'PAGAMENTO' });
      addNotification('info', `Cliente na ${table.name} solicitou fechamento.`);
      
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

  const fallbackImages = [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
  ];

  // Slideshow com pré-load da próxima imagem
  useEffect(() => {
    if (!isOrderActive) {
      const interval = setInterval(() => {
        setSlideshowIndex(prev => {
          if (featuredItems.length > 0) {
            const next = (prev + 1) % featuredItems.length;
            setNextSlideIndex((next + 1) % featuredItems.length);
            return next;
          }
          const next = (prev + 1) % fallbackImages.length;
          setNextSlideIndex((next + 1) % fallbackImages.length);
          return next;
        });
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [isOrderActive, featuredItems.length, fallbackImages.length]);

  // Pré-carregar próxima imagem
  useEffect(() => {
    const nextSlide = featuredItems[nextSlideIndex];
    if (nextSlide?.image) {
      const img = new Image();
      img.src = nextSlide.image;
    }
  }, [nextSlideIndex, featuredItems]);

  // Métodos de pagamento aceites
  const acceptedPayments = useMemo(() => [
    { icon: Banknote, label: 'Numerário' },
    { icon: CreditCard, label: 'TPA / Multicaixa' },
    { icon: Smartphone, label: 'Transferência' },
  ], []);

  const formatKz = (val: number) => {
    return `${new Intl.NumberFormat('pt-AO', { 
      maximumFractionDigits: 0 
    }).format(val)} ${settings.currency || 'Kz'}`;
  };

  // Resolver URL de imagem (relativa Supabase → URL completa)
  const resolveImageUrl = (imageSrc?: string): string => {
    if (!imageSrc) return '';
    if (imageSrc.startsWith('data:image') || imageSrc.startsWith('http')) return imageSrc;
    const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public/products/${imageSrc}`;
  };

  // MODO SLIDESHOW (Marketing quando não há pedido)
  if (!isOrderActive) {
    const currentSlide = featuredItems[slideshowIndex];
    const rawImage = currentSlide?.image || currentSlide?.image_url || '';
    const displayImage = resolveImageUrl(rawImage) || fallbackImages[slideshowIndex % fallbackImages.length];
    const displayName = currentSlide?.name || "Sabores Inesquecíveis";
    const displayDesc = currentSlide?.description || "Descubra a nossa paixão pela gastronomia em cada detalhe.";
    const displayPrice = currentSlide?.price ? formatKz(currentSlide.price) : null;
    const secondSlide = featuredItems[(slideshowIndex + 1) % Math.max(featuredItems.length, 1)];

    return (
      <div className={`h-screen w-full bg-slate-950 flex flex-col font-sans text-slate-200 overflow-hidden relative ${!showCursor ? 'cursor-none' : ''}`}>
        {/* Background gradientes animados */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" ref={(el) => { if (el) el.style.animationDelay = '2s'; }}></div>
          <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" ref={(el) => { if (el) el.style.animationDelay = '4s'; }}></div>
        </div>
        
        {/* Header com logo, saudação, relógio e data completa */}
        <div className="p-6 lg:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center z-10 relative gap-6 lg:gap-0">
          <div className="flex items-center gap-4 lg:gap-8">
            {settings.appLogoUrl ? (
              <img 
                src={settings.appLogoUrl} 
                alt="Logo" 
                className="w-16 h-16 lg:w-24 lg:h-24 object-contain rounded-[2rem] lg:rounded-[2.5rem] shadow-glow border-4 border-slate-900 shrink-0 bg-white/5 p-2" 
              />
            ) : (
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-primary rounded-[2rem] lg:rounded-[2.5rem] flex items-center justify-center text-black shadow-glow border-4 border-slate-900 shrink-0">
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
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{fullDate}</span>
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

        {/* Área Principal — Slideshow + Painel Lateral */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-12 p-6 lg:p-10 pt-0 lg:pt-4 z-10 relative overflow-hidden overflow-y-auto lg:overflow-y-hidden">
           <div className="flex-1 rounded-[2.5rem] lg:rounded-[4.5rem] overflow-hidden border-4 border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative group min-h-0">
              <div key={slideshowIndex} className="absolute inset-0 animate-in fade-in slide-in-from-right-4 zoom-in-105 duration-1000">
                <img 
                  src={displayImage} 
                  alt={displayName}
                  loading="eager"
                  fetchPriority="high"
                  className="w-full h-full object-cover animate-[kenburns_25s_ease-in-out_infinite_alternate]"
                />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6 lg:bottom-12 lg:left-12 lg:right-12 max-h-[60%] overflow-hidden flex flex-col justify-end">
                 <div className="flex items-center gap-3 mb-4 lg:mb-6 flex-wrap">
                    <div className="flex items-center gap-2 bg-primary text-black px-4 py-2 lg:px-6 lg:py-2.5 rounded-xl lg:rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-widest shadow-xl">
                       <Sparkles size={14} fill="black" /> {currentSlide ? 'Destaque do Dia' : 'Sugestão'}
                    </div>
                    {displayPrice && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 lg:px-6 lg:py-2.5 rounded-xl lg:rounded-2xl font-mono font-bold text-base lg:text-xl">
                        {displayPrice}
                      </div>
                    )}
                 </div>
                 
                 <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black text-white italic uppercase tracking-tighter leading-[0.9] mb-3 lg:mb-5 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] line-clamp-3">
                    {displayName}
                 </h2>
                 <p className="text-lg md:text-xl lg:text-2xl text-slate-200 leading-snug italic opacity-95 drop-shadow-lg font-medium line-clamp-2">
                    "{displayDesc}"
                 </p>
              </div>

              {/* Indicadores de Slide */}
              <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-12 flex gap-2 lg:gap-3 items-center bg-black/30 backdrop-blur-sm px-4 py-2 lg:px-6 lg:py-3 rounded-full border border-white/5">
                 {featuredItems.map((_, i) => (
                   <div 
                    key={i} 
                    className={`h-1.5 lg:h-2 rounded-full transition-all duration-700 ${i === slideshowIndex ? 'w-8 lg:w-16 bg-primary shadow-glow' : 'w-3 lg:w-4 bg-white/10 hover:bg-white/30'}`}
                   ></div>
                 ))}
              </div>
           </div>

           {/* Painel Lateral — QR Code real + 2º destaque rotativo (apenas >1400px) */}
           <div className="hidden 2xl:flex w-[480px] flex-col gap-8">
              {/* QR Code para menu público */}
              <div className="glass-panel p-6 rounded-[3rem] border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                 
                 <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">Menu Digital</h3>
                 <p className="text-slate-400 text-sm leading-snug mb-4 font-medium">
                   Escaneie para ver o menu
                 </p>
                 
                 {qrCodeUrl ? (
                   <div className="w-36 h-36 bg-white rounded-2xl p-2 shadow-glow mb-3">
                     <img src={qrCodeUrl} alt="QR Code Menu" className="w-full h-full" />
                   </div>
                 ) : (
                   <div className="w-36 h-36 bg-white/10 rounded-2xl mb-3 animate-pulse flex items-center justify-center">
                     <span className="text-slate-500 text-xs">A gerar QR...</span>
                   </div>
                 )}
                 
                 <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                   <Wifi size={12} className="text-primary" />
                   Acesso Rápido
                 </div>
              </div>

              {/* 2º produto em destaque rotativo */}
              {secondSlide && (
                <div className="p-10 bg-primary rounded-[4rem] text-black shadow-glow flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[280px]">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                   {secondSlide?.image && (
                     <div className="absolute inset-0 opacity-20">
                       <img src={resolveImageUrl(secondSlide.image || secondSlide.image_url)} alt={secondSlide.name} className="w-full h-full object-cover" />
                     </div>
                   )}
                   <div className="relative z-10">
                     <Star size={40} className="mb-4 animate-bounce" fill="black" />
                     <p className="text-3xl font-black uppercase tracking-tighter leading-none italic mb-2">{secondSlide.name}</p>
                     {secondSlide.price && (
                       <p className="text-xl font-mono font-bold mt-3">{formatKz(secondSlide.price)}</p>
                     )}
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4 opacity-80">Próximo Destaque</p>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Rodapé — Métodos de pagamento aceites */}
        <div className="p-4 lg:p-6 border-t border-white/5 z-10 relative">
          <div className="flex items-center justify-center gap-6 lg:gap-12">
            {acceptedPayments.map((pm, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-500">
                <pm.icon size={18} className="text-primary/60" />
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">{pm.label}</span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes kenburns { 
            0% { transform: scale(1.02) translate(0, 0); } 
            100% { transform: scale(1.08) translate(-1%, -1%); }
          }
          @keyframes progress { from { width: 0%; } to { width: 100%; } }
          .text-glow { text-shadow: 0 0 20px rgba(6, 182, 212, 0.5); }
        `}</style>
      </div>
    );
  }

  // MODO PEDIDO ATIVO (Mostra a conta em tempo real com cards + gorjetas)
  return (
    <div className={`h-screen w-full bg-slate-950 overflow-hidden flex flex-col font-sans p-8 lg:p-10 text-slate-200 animate-in fade-in duration-700 ${!showCursor ? 'cursor-none' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0 gap-8">
        <div className="flex items-center gap-6 min-w-0 flex-1">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-black shadow-glow border border-white/10 shrink-0">
            <ChefHat size={40} />
          </div>
          <div className="min-w-0">
            <h1 className="text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none truncate">
              {settings.restaurantName}
            </h1>
            <p className="text-slate-500 text-base lg:text-lg font-bold uppercase tracking-[0.4em] mt-2 opacity-60">Sua Conta • {table?.name || 'Mesa'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-500 shrink-0 shadow-lg">
           <CheckCircle2 size={24} />
           <span className="text-xs font-black uppercase tracking-[0.2em]">Pedido Ativo</span>
        </div>
      </div>

      {/* Conteúdo principal — pedido à esquerda, branding à direita */}
      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Coluna esquerda — Itens do pedido em cards */}
        <div className="flex-1 glass-panel rounded-[3rem] lg:rounded-[4rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
            <h2 className="text-xl lg:text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
              <ShoppingBasket className="text-primary" /> Seu Pedido
            </h2>
            <span className="bg-primary/20 border border-primary/30 text-primary px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest">{allItems.length} Itens</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-3 no-scrollbar bg-slate-900/10">
            {allItems.map((item, idx) => {
              const dish = menu.find(d => d.id === item.dishId);
              return (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 p-4 lg:p-5 bg-white/[0.03] rounded-[1.5rem] lg:rounded-[2rem] border border-white/5 group hover:border-primary/20 transition-all animate-in slide-in-from-right-5 duration-500"
                  ref={(el) => { if (el) el.style.animationDelay = `${idx * 60}ms`; }}
                >
                   <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-primary/30 transition-all shrink-0 bg-slate-800">
                      {dish?.image ? (
                        <img src={resolveImageUrl(dish.image || dish.image_url)} alt={dish?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <UtensilsCrossed size={20} />
                        </div>
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-lg lg:text-xl font-black text-white uppercase tracking-tighter italic truncate">{dish?.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 font-mono">{formatKz(item.unitPrice)}</span>
                        <span className="text-slate-600 text-xs">×</span>
                        <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-black rounded-lg border border-primary/20">{item.quantity}</span>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <span className="text-xl lg:text-2xl font-mono font-bold text-white group-hover:text-primary transition-colors">
                        {formatKz(item.unitPrice * item.quantity)}
                      </span>
                   </div>
                </div>
              );
            })}
          </div>
          
          {/* Rodapé — Total + Sugestões de gorjeta + Botões */}
          <div className="p-8 lg:p-10 bg-slate-900/60 backdrop-blur-xl border-t border-white/10 shrink-0 flex flex-col gap-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 animate-pulse"></div>
             
             {/* Total + Gorjetas */}
             <div className="flex items-center justify-between gap-8">
                <div>
                   <p className="text-slate-500 font-black uppercase tracking-[0.4em] mb-2 text-[10px]">TOTAL DA ENCOMENDA</p>
                   <p className="text-6xl lg:text-7xl font-mono font-bold text-primary text-glow leading-none">{formatKz(total)}</p>
                </div>
                
                {/* Sugestões de gorjeta (padrão SkyTab/LINGA) */}
                <div className="flex flex-col gap-2">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Gorjeta</p>
                   <div className="flex gap-2">
                     {[5, 10, 15].map(pct => (
                       <div key={pct} className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-center">
                         <span className="text-sm font-black text-slate-300">{pct}%</span>
                         <p className="text-[9px] text-slate-500 font-mono mt-0.5">{formatKz(total * pct / 100)}</p>
                       </div>
                     ))}
                   </div>
                </div>
             </div>

             {/* Botões de ação */}
             <div className="flex gap-4 items-center">
                <button 
                  onClick={handleGoBack}
                  className="flex flex-col items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
                >
                   <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
                </button>
                
                <button 
                  id="btn-confirm-pay"
                  onClick={handleConfirmAndPay}
                  className="flex-1 flex items-center justify-center gap-4 px-10 py-4 bg-primary text-black rounded-[2rem] font-black uppercase text-lg tracking-tighter shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
                >
                   <CreditCard size={26} />
                   Confirmar e Pagar
                </button>
             </div>
          </div>
        </div>

        {/* Coluna direita — Branding + QR Code (padrão Toast/Lightspeed) */}
        <div className="hidden lg:flex w-[360px] xl:w-[400px] flex-col gap-6">
           {/* Logo + Nome do restaurante */}
           <div className="glass-panel rounded-[3rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
              {settings.appLogoUrl ? (
                <img src={settings.appLogoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-2xl bg-white/5 p-2 mb-4" />
              ) : (
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-black mb-4">
                  <ChefHat size={36} />
                </div>
              )}
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{settings.restaurantName}</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Obrigado pela sua visita!</p>
           </div>

           {/* QR Code para menu digital */}
           <div className="glass-panel rounded-[3rem] p-8 flex flex-col items-center text-center flex-1 justify-center">
              <h4 className="text-lg font-black text-white uppercase italic tracking-tighter mb-4">Menu Digital</h4>
              {qrCodeUrl ? (
                <div className="w-40 h-40 bg-white rounded-3xl p-3 shadow-glow mb-4">
                  <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
                </div>
              ) : (
                <div className="w-40 h-40 bg-white/10 rounded-3xl mb-4 animate-pulse" />
              )}
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Escaneie para ver o menu</p>
           </div>

           {/* Métodos de pagamento aceites */}
           <div className="glass-panel rounded-[3rem] p-6 flex flex-col gap-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-2">Pagamentos Aceites</p>
              <div className="flex justify-center gap-4">
                {acceptedPayments.map((pm, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                      <pm.icon size={18} className="text-primary/70" />
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{pm.label}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplay;




