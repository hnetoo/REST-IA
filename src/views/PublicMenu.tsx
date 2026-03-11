import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase, getSupabaseMenu, getSupabaseCategories } from '../lib/supabaseService';
import { 
  Search, X, Send, Sparkles, Loader2, Plus, Minus, 
  UtensilsCrossed, Wifi, WifiOff, ShoppingBag, ChevronRight,
  Info, RefreshCw, Phone, MessageCircle
} from 'lucide-react';
import { getAIWaiterRecommendation } from '../lib/geminiService';
import LazyImage from '../components/LazyImage';
import appLogo from '/logo.png';

// Cache keys
const CACHE_KEY_MENU = 'public_menu_data';
const CACHE_KEY_CATS = 'public_cats_data';
const CACHE_KEY_TIMESTAMP = 'public_data_timestamp';

const PublicMenu = () => {
  const { tableId } = useParams();
  const isViewOnly = !tableId;
  const { menu: localMenu, categories: localCategories, addToOrder, settings } = useStore();
  
  // State
  const [menu, setMenu] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [selectedCatId, setSelectedCatId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<string, { quantity: number; notes: string }>>({});
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  
  // AI Chat State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Logic: Sync & Cache ---

  const saveToCache = (items: any[], cats: any[]) => {
    try {
      localStorage.setItem(CACHE_KEY_MENU, JSON.stringify(items));
      localStorage.setItem(CACHE_KEY_CATS, JSON.stringify(cats));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Cache save failed", e);
    }
  };

  const loadFromCache = () => {
    try {
      const cachedMenu = localStorage.getItem(CACHE_KEY_MENU);
      const cachedCats = localStorage.getItem(CACHE_KEY_CATS);
      const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);

      if (cachedMenu && cachedCats) {
        setMenu(JSON.parse(cachedMenu));
        setCategories(JSON.parse(cachedCats));
        if (timestamp) setLastUpdated(new Date(timestamp));
        return true;
      }
    } catch (e) {
      console.error("Cache load failed", e);
    }
    return false;
  };

  const fetchCloudData = async () => {
    setIsSyncing(true);
    try {
      const dishes = await getSupabaseMenu();
      const cats = await getSupabaseCategories();

      const validDishes = (dishes || []).filter((d: any) => d && d.id && d.name && typeof d.price === 'number');
      const validCategories = (cats || []).filter((c: any) => c && c.id && c.name);

      const formattedMenu = validDishes.map((d: any) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        description: d.description,
        image: d.image_url,
        categoryId: d.category_id,
        isVisibleDigital: typeof d.is_visible_digital === 'boolean' ? d.is_visible_digital : true,
        isFeatured: d.is_featured || false,
      }));

      const formattedCats = validCategories.map((c: any) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        isVisibleDigital: typeof c.visible === 'boolean' ? c.visible : true
      }));

      setMenu(formattedMenu);
      setCategories(formattedCats);
      saveToCache(formattedMenu, formattedCats);
    } catch (e) {
      console.error("Cloud fetch error:", e);
      // Fallback to local store if available (Tauri mode) or Cache
      if (!loadFromCache() && localMenu.length > 0) {
        setMenu(localMenu);
        setCategories(localCategories);
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    console.log("[PublicMenu] Montado", { 
      url: window.location.href, 
      path: window.location.pathname, 
      hash: window.location.hash,
      isViewOnly, 
      tableId 
    });

    const isTauri = !!(window as any).__TAURI_INTERNALS__;
    
    // 1. Try Cache First (Fast Paint)
    const hasCache = loadFromCache();
    if (!hasCache) setIsLoading(true);

    // 2. Decide Source
    if (isTauri) {
      setMenu(localMenu);
      setCategories(localCategories);
      setIsLoading(false);
    } else {
      // Web Mode: Fetch from Supabase
      fetchCloudData();

      // Realtime Subscription
      const channel = supabase
        .channel('public-menu-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes' }, () => {
          fetchCloudData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          fetchCloudData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // Network Status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tableId]);

  // Sync Tauri Local State updates if in Tauri mode
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) {
      setMenu(localMenu);
      setCategories(localCategories);
    }
  }, [localMenu, localCategories, tableId]);


  // --- Filtering & Memoization ---

  const digitalMenu = useMemo(() => {
    const filtered = menu.filter(d => d.isVisibleDigital !== false); // Default true
    return filtered.length > 0 ? filtered : menu;
  }, [menu]);

  const digitalCategories = useMemo(() => {
    const filtered = categories.filter(c => c.isVisibleDigital !== false);
    return filtered.length > 0 ? filtered : categories;
  }, [categories]);

  const filteredMenu = useMemo(() => {
    return digitalMenu.filter(dish => {
      const matchesCategory = selectedCatId === 'TODOS' || dish.categoryId === selectedCatId;
      const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [digitalMenu, selectedCatId, searchTerm]);

  // --- Cart Logic ---

  const updateCart = (dishId: string, delta: number) => {
    setCart(prev => {
      const current = prev[dishId] || { quantity: 0, notes: '' };
      const newQty = Math.max(0, current.quantity + delta);
      if (newQty === 0) {
        const { [dishId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dishId]: { ...current, quantity: newQty } };
    });
  };

  const cartTotal = useMemo(() => {
    return (Object.entries(cart) as [string, { quantity: number }][]).reduce((acc, [id, data]) => {
      const dish = digitalMenu.find(d => d.id === id);
      return acc + (dish?.price || 0) * data.quantity;
    }, 0);
  }, [cart, digitalMenu]);

  const cartCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);

  // --- AI Chat Logic ---
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsAILoading(true);
    try {
      const response = await getAIWaiterRecommendation(msg, digitalMenu);
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Desculpe, estou com dificuldades em conectar ao meu cérebro agora. Tente novamente." }]);
    } finally {
      setIsAILoading(false);
    }
  };

  // --- Formatting ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val).replace('Kz', '').trim();
  };

  // --- WhatsApp Integration ---
  const handleWhatsAppOrder = () => {
    const phoneNumber = '+244976825520'; // Número do restaurante
    const message = cartCount > 0 
      ? `Olá! Gostaria de fazer um pedido com ${cartCount} itens no valor total de ${formatCurrency(cartTotal)} Kz.`
      : 'Olá! Gostaria de fazer um pedido.';
    
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // --- Render ---

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden font-sans text-slate-200 selection:bg-primary/30">
      
      {/* 1. Header Premium Mobile-First */}
      <header className="shrink-0 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        {/* Logo e Identidade */}
        <div className="max-w-[2000px] mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <img 
              src={appLogo} 
              alt="Tasca do Vereda" 
              loading="eager"
              className="w-[120px] h-[36px] md:w-[150px] md:h-[45px] object-contain" 
            />
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                TASCA DO VEREDA
              </h1>
              <p className="text-xs text-primary font-bold uppercase tracking-widest">
                Inteligência Gastronómica
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Order Section */}
        <div className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-md border-t border-white/10">
          <div className="max-w-[2000px] mx-auto px-4 sm:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Contact Info */}
              <div className="flex items-center gap-3 text-slate-300">
                <Phone size={18} className="text-primary" />
                <span className="text-sm font-medium">+244976825520</span>
              </div>
              
              {/* Order Button */}
              <button 
                onClick={handleWhatsAppOrder}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  cartCount > 0 
                    ? 'bg-primary text-black hover:scale-105 shadow-primary/30 animate-pulse' 
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
                title="Faça a sua encomenda via WhatsApp"
                aria-label="Faça a sua encomenda via WhatsApp"
              >
                <MessageCircle size={18} />
                Faça a sua Encomenda
                {cartCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-black/20 rounded-full text-xs">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Categorias Carousel */}
        <div className="bg-slate-950/50 backdrop-blur-sm">
          <div className="max-w-[2000px] mx-auto px-4 sm:px-8 py-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
              <button 
                onClick={() => setSelectedCatId('TODOS')} 
                className={`snap-start px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap border ${
                  selectedCatId === 'TODOS' 
                    ? 'bg-primary text-black border-primary shadow-lg scale-105' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Todos
              </button>
              {digitalCategories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCatId(cat.id)} 
                  className={`snap-start px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap border ${
                    selectedCatId === cat.id 
                      ? 'bg-primary text-black border-primary shadow-lg scale-105' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Padding para não sobrepor header */}
      <main className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 relative pt-4">
        <div className="max-w-[2000px] mx-auto px-4 sm:px-8 py-4">
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto sm:max-w-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Procurar pratos..." 
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:bg-white/10 focus:border-primary/30 transition-all" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-500 animate-pulse">
               <Loader2 size={48} className="animate-spin text-primary" />
               <p className="text-xs font-bold uppercase tracking-widest">A preparar a cozinha...</p>
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
               <Search size={64} className="mb-6 text-slate-700" />
               <h3 className="text-lg font-bold text-slate-500">Nenhum prato encontrado</h3>
               <p className="text-sm text-slate-600 mt-2">Tente ajustar a sua pesquisa.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-24">
              {filteredMenu.map(dish => {
                const itemInCart = cart[dish.id];
                return (
                  <div 
                    key={dish.id} 
                    onClick={() => setSelectedDish(dish)}
                    className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 hover:border-primary/30 hover:bg-slate-900 transition-all duration-300 flex gap-4 relative overflow-hidden cursor-pointer"
                  >
                     
                     {/* Imagem Compacta */}
                     <div className="aspect-square w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-950 shadow-inner">
                        <LazyImage 
                            src={dish.image} 
                            alt={dish.name} 
                            containerClassName="w-full h-full" 
                            className="object-cover w-full h-full"
                        />
                     </div>

                     {/* Informações do Prato */}
                     <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-bold text-white text-base leading-tight mb-1">{dish.name}</h3>
                          <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 font-medium opacity-80">{dish.description}</p>
                        </div>
                        
                        {/* Footer: Preço e Quantidade */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço</span>
                            <span className="text-lg font-black text-primary tracking-tight">
                              {formatCurrency(dish.price)} Kz
                            </span>
                          </div>
                          
                          {!isViewOnly && (
                            itemInCart?.quantity ? (
                            <div 
                              className="flex items-center gap-1 bg-primary rounded-xl p-1 shadow-lg shadow-primary/20"
                              onClick={(e) => e.stopPropagation()} 
                            >
                              <button 
                                onClick={() => updateCart(dish.id, -1)} 
                                className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/30 flex items-center justify-center text-black transition-colors"
                                title="Remover quantidade"
                                aria-label="Remover quantidade"
                              >
                                <Minus size={14} strokeWidth={3}/>
                              </button>
                              <span className="font-black text-black text-sm min-w-[1.2rem] text-center">{itemInCart.quantity}</span>
                              <button 
                                onClick={() => updateCart(dish.id, 1)} 
                                className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                                title="Adicionar quantidade"
                                aria-label="Adicionar quantidade"
                              >
                                <Plus size={14} strokeWidth={3}/>
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCart(dish.id, 1);
                              }}
                              className="w-10 h-10 rounded-xl bg-white/5 text-primary border border-white/10 flex items-center justify-center hover:bg-primary hover:text-black hover:border-transparent transition-all active:scale-95"
                              aria-label={`Adicionar ${dish.name} ao pedido`}
                            >
                              <Plus size={20} />
                            </button>
                          )
                          )}
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) - WhatsApp Order */}
      {!isViewOnly && (
        <button 
          onClick={handleWhatsAppOrder}
          className={`fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            cartCount > 0 
              ? 'bg-primary text-black hover:scale-110 shadow-primary/30 animate-pulse' 
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
          }`}
          title="Faça a sua encomenda via WhatsApp"
          aria-label="Faça a sua encomenda via WhatsApp"
        >
          <MessageCircle size={24} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-slate-950">
              {cartCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Action Bar (Carrinho) */}
      {!isViewOnly && cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-32 md:w-96 z-40 animate-in slide-in-from-bottom-10 fade-in duration-500">
           <button 
              onClick={() => { 
                (Object.entries(cart) as [string, { quantity: number; notes: string }][]).forEach(([id, data]) => { 
                  const d = digitalMenu.find(x => x.id === id); 
                  if(d) addToOrder(Number(tableId) || 0, d, data.quantity, data.notes); 
                }); 
                setCart({}); 
              }}
              className="w-full bg-white text-black p-1.5 pl-6 pr-2 rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-between group overflow-hidden relative hover:scale-[1.02] transition-transform"
              title="Confirmar pedido"
              aria-label="Confirmar pedido"
           >
              <div className="flex flex-col items-start">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{cartCount} Itens</span>
                 <span className="text-xl font-black tracking-tight">{formatCurrency(cartTotal)} <span className="text-sm">Kz</span></span>
              </div>

              <div className="bg-black text-white px-6 py-4 rounded-[1.5rem] flex items-center gap-3 font-bold uppercase tracking-wider text-xs group-hover:bg-primary group-hover:text-black transition-colors">
                 Confirmar <ChevronRight size={16} />
              </div>
           </button>
        </div>
      )}

      {/* Modal Detalhes do Produto */}
      {selectedDish && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedDish(null)}>
          <div 
            className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedDish(null)} 
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all"
              title="Fechar detalhes"
              aria-label="Fechar detalhes"
            >
              <X size={20}/>
            </button>

            {/* Image */}
            <div className="aspect-[4/3] w-full relative">
              <LazyImage 
                src={selectedDish.image} 
                alt={selectedDish.name} 
                containerClassName="w-full h-full" 
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
            </div>

            {/* Content */}
            <div className="p-8 -mt-12 relative">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-black text-white leading-tight flex-1 pr-4">{selectedDish.name}</h2>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-2xl font-black text-primary tracking-tight">
                    {formatCurrency(selectedDish.price)}<span className="text-sm text-white ml-0.5">Kz</span>
                  </span>
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed font-medium text-base mb-8">{selectedDish.description}</p>

              {/* Actions */}
              {!isViewOnly && (
                <div className="flex gap-4">
                  {cart[selectedDish.id]?.quantity ? (
                    <div className="flex items-center gap-2 bg-slate-800 rounded-2xl p-2 w-full justify-between border border-white/5">
                      <button onClick={() => updateCart(selectedDish.id, -1)} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"><Minus size={20}/></button>
                      <span className="font-black text-white text-xl">{cart[selectedDish.id].quantity}</span>
                      <button onClick={() => updateCart(selectedDish.id, 1)} className="w-12 h-12 rounded-xl bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform"><Plus size={20}/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => updateCart(selectedDish.id, 1)}
                      className="w-full py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Adicionar ao Pedido
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Chat IA */}
      {isAIChatOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 w-full max-w-2xl sm:rounded-[2.5rem] rounded-t-[2.5rem] border border-white/10 shadow-2xl flex flex-col h-[90vh] sm:h-[80vh] animate-in slide-in-from-bottom-10 duration-300 overflow-hidden relative">
            
            {/* Header Chat */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl absolute top-0 left-0 right-0 z-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-gradient-to-br from-primary to-cyan-400 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-primary/20">
                    <Sparkles size={24} fill="black"/>
                 </div>
                 <div>
                    <h3 className="text-white font-black uppercase text-lg italic tracking-tighter leading-none">Sommelier IA</h3>
                    <p className="text-xs text-primary font-bold tracking-widest mt-1">Assistente Gastronómico</p>
                 </div>
              </div>
              <button onClick={() => setIsAIChatOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X size={20}/></button>
            </div>
            
            {/* Body Chat */}
            <div className="flex-1 overflow-y-auto p-6 pt-28 pb-32 space-y-6 no-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-950 to-slate-950">
              <div className="flex gap-4 animate-in slide-in-from-left-4 fade-in duration-500">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mt-1"><Sparkles size={14}/></div>
                <div className="bg-white/5 p-5 rounded-3xl rounded-tl-none border border-white/5 text-slate-300 text-sm leading-relaxed shadow-lg max-w-[85%]">
                  Olá! Sou a sua inteligência artificial gastronómica. 🍷<br/><br/>
                  Posso sugerir pratos baseados no seu humor, recomendar vinhos ou explicar detalhes dos ingredientes. O que lhe apetece hoje?
                </div>
              </div>
              
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse animate-in slide-in-from-right-4' : 'animate-in slide-in-from-left-4'} fade-in duration-300`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}>
                    {msg.role === 'user' ? <div className="w-2 h-2 bg-black rounded-full"/> : <Sparkles size={14}/>}
                  </div>
                  <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-primary text-black rounded-tr-none font-medium' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isAILoading && (
                <div className="flex gap-4 animate-in fade-in">
                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0"><Sparkles size={14}/></div>
                   <div className="flex gap-1 items-center h-12 px-5 bg-white/5 rounded-3xl rounded-tl-none border border-white/5">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Chat */}
            <form onSubmit={handleAISubmit} className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-xl pb-6 sm:pb-6">
               <div className="relative flex gap-2 max-w-3xl mx-auto">
                  <input 
                    type="text" 
                    placeholder="Ex: 'Quero algo leve com peixe' ou 'Qual o vinho recomendado?'" 
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all placeholder:text-slate-500 shadow-xl" 
                    value={chatMessage} 
                    onChange={e => setChatMessage(e.target.value)} 
                  />
                  <button type="submit" className="w-14 bg-primary text-black rounded-2xl flex items-center justify-center shadow-glow hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100" disabled={!chatMessage.trim() || isAILoading}>
                    {isAILoading ? <Loader2 size={20} className="animate-spin"/> : <Send size={20}/>}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;




