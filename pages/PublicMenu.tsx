
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ShoppingBasket, Search, Check, ChefHat, X, Send, Sparkles, Loader2, Plus, Minus, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { getAIWaiterRecommendation } from '../services/geminiService';
import LazyImage from '../components/LazyImage';

const PublicMenu = () => {
  const { tableId } = useParams();
  const { menu, categories, addToOrder, settings } = useStore();
  
  const [selectedCatId, setSelectedCatId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<string, { quantity: number; notes: string }>>({});
  
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filtragem Digital: Se não houver itens marcados como digitais, mostramos todos (fallback de segurança)
  const digitalMenu = useMemo(() => {
    const filtered = menu.filter(d => d.isVisibleDigital);
    return filtered.length > 0 ? filtered : menu;
  }, [menu]);

  const digitalCategories = useMemo(() => {
    const filtered = categories.filter(c => c.isVisibleDigital);
    return filtered.length > 0 ? filtered : categories;
  }, [categories]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const filteredMenu = useMemo(() => {
    return digitalMenu.filter(dish => {
      const matchesCategory = selectedCatId === 'TODOS' || dish.categoryId === selectedCatId;
      const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [digitalMenu, selectedCatId, searchTerm]);

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

  const cartTotal = (Object.entries(cart) as [string, { quantity: number }][]).reduce((acc, [id, data]) => {
    const dish = digitalMenu.find(d => d.id === id);
    return acc + (dish?.price || 0) * data.quantity;
  }, 0);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsAILoading(true);
    const response = await getAIWaiterRecommendation(msg, digitalMenu);
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    setIsAILoading(false);
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden font-sans">
      {/* Botão Flutuante IA */}
      <button 
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-28 right-6 z-50 w-16 h-16 bg-primary rounded-full shadow-glow flex items-center justify-center text-black border-4 border-slate-900 animate-bounce hover:scale-110 transition-transform"
      >
        <Sparkles size={28} />
      </button>

      {/* Chat IA */}
      {isAIChatOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col h-[70vh] animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary"><Sparkles size={20}/></div>
                 <h3 className="text-white font-black uppercase text-sm italic tracking-tighter">Chef IA da Tasca</h3>
              </div>
              <button onClick={() => setIsAIChatOpen(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-slate-300 text-xs italic">
                Olá! Sou o Chef Virtual. Posso sugerir pratos angolanos ou harmonizações de bebidas. Como posso ajudar?
              </div>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-3xl text-sm ${msg.role === 'user' ? 'bg-primary text-black rounded-tr-none' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAILoading && <Loader2 className="animate-spin text-primary mx-auto" />}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleAISubmit} className="p-6 border-t border-white/5 flex gap-3">
               <input type="text" placeholder="Pergunte ao Chef..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-primary" value={chatMessage} onChange={e => setChatMessage(e.target.value)} />
               <button type="submit" className="w-12 h-12 bg-primary text-black rounded-2xl flex items-center justify-center shadow-glow"><Send size={20}/></button>
            </form>
          </div>
        </div>
      )}

      {/* Header com Nome Completo e Logo */}
      <header className="p-8 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4 mb-6">
          {settings.appLogoUrl ? (
            <img src={settings.appLogoUrl} alt="Logo" className="w-14 h-14 object-contain rounded-xl bg-white/5 p-1" />
          ) : (
            <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
               <UtensilsCrossed size={28} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight">
              {settings.restaurantName || "Tasca Do VEREDA - REST IA"}
            </h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] opacity-70">Menu Digital Interativo</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input type="text" placeholder="Pesquisar no menu..." className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-primary transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
      </header>

      {/* Categorias */}
      <div className="px-8 py-6 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setSelectedCatId('TODOS')} 
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedCatId === 'TODOS' ? 'bg-primary border-primary text-black shadow-glow' : 'bg-white/5 border-white/10 text-slate-500'}`}
        >
          Todos os Pratos
        </button>
        {digitalCategories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setSelectedCatId(cat.id)} 
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedCatId === cat.id ? 'bg-primary border-primary text-black shadow-glow' : 'bg-white/5 border-white/10 text-slate-500'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Lista de Pratos */}
      <div className="flex-1 overflow-y-auto px-8 pb-32 space-y-4 no-scrollbar">
        {filteredMenu.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
             <Search size={64} className="mb-4" />
             <h3 className="text-xl font-black uppercase italic">Nenhum prato encontrado</h3>
             <p className="text-xs uppercase font-bold mt-2">Tente ajustar a sua pesquisa</p>
          </div>
        ) : (
          filteredMenu.map(dish => {
            const itemInCart = cart[dish.id];
            return (
              <div key={dish.id} className={`bg-white/5 rounded-[2rem] p-5 border border-white/5 flex gap-5 hover:border-primary/30 transition-all relative overflow-hidden group ${dish.isFeatured ? 'border-yellow-500/30 ring-1 ring-yellow-500/20' : ''}`}>
                 {dish.isFeatured && <div className="absolute top-0 right-0 px-4 py-1.5 bg-yellow-500 text-black text-[9px] font-black uppercase rounded-bl-2xl shadow-lg z-10">Recomendado</div>}
                 
                 <div className="w-28 h-28 shrink-0 relative">
                    <LazyImage 
                        src={dish.image} 
                        alt={dish.name} 
                        containerClassName="w-full h-full rounded-2xl shadow-xl" 
                        className="group-hover:scale-110 transition-transform duration-700"
                    />
                 </div>

                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-black text-white text-base uppercase tracking-tighter truncate leading-tight">{dish.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic leading-relaxed h-8">{dish.description}</p>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-primary font-mono font-black text-lg">
                        {(new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(dish.price))}
                      </span>
                      
                      <div className="flex items-center gap-4 bg-black/40 rounded-2xl p-1.5 border border-white/5">
                        <button onClick={() => updateCart(dish.id, -1)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all"><Minus size={16}/></button>
                        <span className="text-white font-black text-sm min-w-[1.5rem] text-center">{itemInCart?.quantity || 0}</span>
                        <button onClick={() => updateCart(dish.id, 1)} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black hover:brightness-110 transition-all"><Plus size={16}/></button>
                      </div>
                    </div>
                 </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer do Carrinho */}
      {cartTotal > 0 && (
        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-40">
           <button 
              onClick={() => { 
                (Object.entries(cart) as [string, { quantity: number; notes: string }][]).forEach(([id, data]) => { 
                  const d = digitalMenu.find(x => x.id === id); 
                  if(d) addToOrder(Number(tableId) || 0, d, data.quantity, data.notes); 
                }); 
                setCart({}); 
                alert('Pedido enviado para a cozinha! Bom apetite.');
              }} 
              className="w-full bg-primary py-5 rounded-[2rem] flex items-center justify-between px-10 shadow-glow transition-all active:scale-[0.98] hover:brightness-110"
           >
              <div className="flex items-center gap-4 text-black">
                <ShoppingBasket size={28} />
                <div>
                  <p className="font-black text-lg uppercase tracking-tighter leading-none">Confirmar Pedido</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Enviar para a cozinha</p>
                </div>
              </div>
              <p className="text-2xl font-mono font-black text-black">
                {(new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(cartTotal))}
              </p>
           </button>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
