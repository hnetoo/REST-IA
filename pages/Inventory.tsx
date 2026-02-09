
import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Package, Plus, Trash2, Box, Pencil, X, Utensils, 
  Tag, Save, Upload, Image as ImageIcon, Link as LinkIcon,
  Smartphone, QrCode, Sparkles, Eye, EyeOff, Star,
  ExternalLink, Printer, Copy, Check, Share2, Info
} from 'lucide-react';
import { Dish, MenuCategory } from '../types';
import LazyImage from '../components/LazyImage';

const Inventory = () => {
  const { 
    menu, stock, categories, 
    addDish, updateDish, removeDish, 
    addCategory, updateCategory, removeCategory,
    updateStockQuantity,
    toggleDishVisibility, toggleDishFeatured, toggleCategoryVisibility,
    settings, addNotification
  } = useStore();

  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'stock' | 'digital'>('menu');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dishForm, setDishForm] = useState<Partial<Dish>>({
    name: '', price: 0, costPrice: 0, categoryId: '', description: '', image: '', taxCode: 'NOR'
  });

  const [catForm, setCatForm] = useState<Partial<MenuCategory>>({
    name: '', icon: 'Grid3X3'
  });

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  // URL do Menu Digital - Prioriza o URL customizado ou gera um fallback
  const digitalMenuUrl = useMemo(() => {
    if (settings.customDigitalMenuUrl) return settings.customDigitalMenuUrl;
    return `https://vereda-menu.netlify.app/restaurant/${settings.nif}`;
  }, [settings.customDigitalMenuUrl, settings.nif]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(digitalMenuUrl)}&margin=10&bgcolor=ffffff&color=000000`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(digitalMenuUrl);
    setHasCopied(true);
    addNotification('success', 'Link do Menu copiado!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Menu - ${settings.restaurantName}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { border: 2px solid #000; padding: 40px; border-radius: 20px; max-width: 400px; }
            img { width: 300px; height: 300px; margin: 20px 0; }
            h1 { margin: 0; text-transform: uppercase; font-size: 24px; }
            p { color: #666; margin-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${settings.restaurantName}</h1>
            <p>DIGITAL MENU</p>
            <img src="${qrImageUrl}" />
            <p>Aponte a câmara para pedir</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenDishModal = (dish?: Dish) => {
    if (dish) {
      setEditingId(dish.id);
      setDishForm(dish);
    } else {
      setEditingId(null);
      setDishForm({ 
        name: '', price: 0, costPrice: 0, categoryId: categories[0]?.id || '', 
        description: '', image: '', taxCode: 'NOR' 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenCatModal = (cat?: MenuCategory) => {
    if (cat) {
      setEditingId(cat.id);
      setCatForm(cat);
    } else {
      setEditingId(null);
      setCatForm({ name: '', icon: 'Grid3X3' });
    }
    setIsCatModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDishForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitDish = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';
    if (editingId) {
      updateDish({ ...dishForm, id: editingId, image: dishForm.image || defaultImage } as Dish);
    } else {
      addDish({
        id: `dish-${Date.now()}`,
        name: dishForm.name!,
        price: Number(dishForm.price),
        costPrice: Number(dishForm.costPrice || 0),
        categoryId: dishForm.categoryId!,
        description: dishForm.description || '',
        image: dishForm.image || defaultImage,
        taxCode: 'NOR',
        isVisibleDigital: true
      });
    }
    setIsModalOpen(false);
  };

  const handleSubmitCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateCategory({ ...catForm, id: editingId } as MenuCategory);
    } else {
      addCategory({
        id: `cat-${Date.now()}`,
        name: catForm.name!,
        icon: catForm.icon || 'Grid3X3',
        isVisibleDigital: true
      });
    }
    setIsCatModalOpen(false);
  };

  const tabs = [
    { id: 'menu', label: 'Produtos', icon: Utensils },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'stock', label: 'Stock & Inventário', icon: Box },
    { id: 'digital', label: 'QR Menu & Marketing', icon: QrCode }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Catálogo & Inventário</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Gestão Central de Mercadorias</p>
        </div>
        
        {activeTab !== 'digital' && (
          <button 
            onClick={() => activeTab === 'menu' ? handleOpenDishModal() : activeTab === 'categories' ? handleOpenCatModal() : null}
            className="bg-primary text-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
          >
            <Plus size={20} />
            {activeTab === 'menu' ? 'Novo Prato' : activeTab === 'categories' ? 'Nova Categoria' : 'Ajustar Ficha'}
          </button>
        )}
      </header>

      <div className="flex gap-4 mb-8 border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-6 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Icon size={16} /> {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow"></div>}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {menu.map(dish => {
              const cat = categories.find(c => c.id === dish.categoryId);
              return (
                <div key={dish.id} className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden group hover:border-primary/50 transition-all duration-300">
                  <div className="aspect-video w-full overflow-hidden relative">
                    <LazyImage 
                      src={dish.image} 
                      alt={dish.name} 
                      containerClassName="w-full h-full"
                      className="group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 z-20">
                      {cat?.name || 'Sem Categoria'}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white text-sm truncate pr-2" title={dish.name}>{dish.name}</h3>
                      <span className="text-primary font-mono font-bold text-xs whitespace-nowrap">{formatKz(dish.price)}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] line-clamp-2 italic mb-4 min-h-[30px]">{dish.description}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenDishModal(dish)} className="flex-1 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all">Editar</button>
                      <button onClick={() => removeDish(dish.id)} className="w-10 py-2 rounded-lg border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} className="mx-auto" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map(cat => (
              <div key={cat.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 flex items-center justify-between hover:border-primary/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg tracking-tight leading-none">{cat.name}</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {menu.filter(d => d.categoryId === cat.id).length} Produtos
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenCatModal(cat)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"><Pencil size={14}/></button>
                  <button onClick={() => removeCategory(cat.id)} className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-8 py-6">Item de Inventário</th>
                    <th className="px-8 py-6">Quantidade Actual</th>
                    <th className="px-8 py-6">Nível Crítico</th>
                    <th className="px-8 py-6 text-right">Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stock.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6 font-bold text-white">{item.name}</td>
                      <td className="px-8 py-6 font-mono text-xs">
                        <span className={item.quantity <= item.minThreshold ? 'text-red-500' : 'text-green-500'}>
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-slate-500 font-mono text-xs">{item.minThreshold} {item.unit}</td>
                      <td className="px-8 py-6 text-right">
                        <div className="inline-flex gap-2">
                            <button onClick={() => updateStockQuantity(item.id, -1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">-</button>
                            <button onClick={() => updateStockQuantity(item.id, 1)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black flex items-center justify-center">+</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}

        {activeTab === 'digital' && (
          <div className="space-y-12 pb-20">
            {/* QR MENU STUDIO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-1 glass-panel p-8 rounded-[3rem] border-primary/30 bg-primary/5 flex flex-col items-center text-center">
                  <div className="w-full aspect-square bg-white rounded-3xl p-4 shadow-glow mb-6 flex items-center justify-center overflow-hidden">
                     <img src={qrImageUrl} alt="Restaurant QR" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">QR Menu Oficial</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 mb-8">Gerado via Vereda Digital Engine</p>
                  
                  <div className="grid grid-cols-2 gap-3 w-full">
                     <button onClick={handlePrintQR} className="flex items-center justify-center gap-2 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all">
                        <Printer size={16}/> Imprimir
                     </button>
                     <button onClick={handleCopyUrl} className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                        {hasCopied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>} {hasCopied ? 'Copiado' : 'Link'}
                     </button>
                  </div>
               </div>

               <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary"><Smartphone size={20}/></div>
                       <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Estado da Montra Digital</h3>
                    </div>
                    <div className="space-y-4 mb-10">
                       <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                          <div>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">URL de Destino</p>
                             <p className="text-sm font-mono text-primary mt-1 truncate max-w-md">{digitalMenuUrl}</p>
                          </div>
                          <a href={digitalMenuUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"><ExternalLink size={20}/></a>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produtos Ativos</p>
                             <p className="text-2xl font-mono font-bold text-emerald-500">{menu.filter(d => d.isVisibleDigital).length}</p>
                          </div>
                          <div className="p-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categorias Live</p>
                             <p className="text-2xl font-mono font-bold text-purple-500">{categories.filter(c => c.isVisibleDigital).length}</p>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex gap-4">
                     <Info size={24} className="text-blue-500 shrink-0" />
                     <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        <b>Dica IA:</b> Pratos com fotos de alta qualidade e marcados como "Destaque" têm uma taxa de conversão 40% superior no menu digital. Garanta que as suas fotos estão apelativas.
                     </p>
                  </div>
               </div>
            </div>

            <div className="w-full h-px bg-white/5 my-12"></div>

            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Tag size={16} /> Visibilidade de Categorias no QR
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => toggleCategoryVisibility(cat.id)}
                    className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${cat.isVisibleDigital ? 'bg-primary/5 border-primary shadow-glow' : 'bg-white/5 border-white/5 opacity-40'}`}
                  >
                    <div className={`p-3 rounded-2xl ${cat.isVisibleDigital ? 'bg-primary text-black' : 'bg-slate-800 text-slate-500'}`}>
                      <Tag size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-center">{cat.name}</span>
                    {cat.isVisibleDigital ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-red-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Utensils size={16} /> Destaques & Disponibilidade Mobile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {menu.map(dish => {
                  const cat = categories.find(c => c.id === dish.categoryId);
                  return (
                    <div key={dish.id} className={`glass-panel p-6 rounded-[2.5rem] border transition-all flex items-center gap-6 ${dish.isVisibleDigital ? 'border-primary/20' : 'border-white/5 grayscale opacity-40'}`}>
                      <div className="w-20 h-20 rounded-2xl overflow-hidden relative shrink-0">
                          <img src={dish.image} className="w-full h-full object-cover" alt="" />
                          {dish.isFeatured && <div className="absolute top-2 right-2 p-1.5 bg-yellow-500 text-black rounded-full shadow-lg"><Sparkles size={10}/></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{cat?.name}</p>
                          <h4 className="text-white font-bold truncate text-sm">{dish.name}</h4>
                          <p className="text-primary font-mono font-bold text-xs mt-1">{formatKz(dish.price)}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => toggleDishVisibility(dish.id)}
                            className={`p-3 rounded-xl transition-all ${dish.isVisibleDigital ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                          >
                            {dish.isVisibleDigital ? <Eye size={16}/> : <EyeOff size={16}/>}
                          </button>
                          <button 
                            onClick={() => toggleDishFeatured(dish.id)}
                            className={`p-3 rounded-xl transition-all ${dish.isFeatured ? 'bg-yellow-500 text-black shadow-glow' : 'bg-white/5 text-slate-500'}`}
                          >
                            <Star size={16} fill={dish.isFeatured ? 'currentColor' : 'none'} />
                          </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PRODUTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-[3rem] w-full max-w-2xl p-10 border border-white/10 shadow-2xl relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleSubmitDish} className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome do Prato / Produto</label>
                    <input required type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={dishForm.name} onChange={e => setDishForm({...dishForm, name: e.target.value})} />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Preço ({settings.currency})</label>
                       <input required type="number" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary" value={dishForm.price} onChange={e => setDishForm({...dishForm, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Custo ({settings.currency})</label>
                       <input required type="number" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary" value={dishForm.costPrice} onChange={e => setDishForm({...dishForm, costPrice: Number(e.target.value)})} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoria</label>
                    <select className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary appearance-none" value={dishForm.categoryId} onChange={e => setDishForm({...dishForm, categoryId: e.target.value})}>
                       {categories.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                    </select>
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição Comercial</label>
                    <textarea className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary min-h-[120px] text-sm leading-relaxed" value={dishForm.description} onChange={e => setDishForm({...dishForm, description: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Imagem do Produto</label>
                    <div className="aspect-video w-full rounded-2xl bg-white/5 border border-dashed border-white/10 overflow-hidden flex items-center justify-center relative group">
                        {dishForm.image ? (
                          <LazyImage src={dishForm.image} alt="Preview" containerClassName="w-full h-full" />
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="mx-auto text-slate-600 mb-2" size={32} />
                            <p className="text-[10px] text-slate-500 uppercase font-black">Nenhuma Imagem</p>
                          </div>
                        )}
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20"
                        >
                          <Upload size={24} className="text-primary" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Carregar Ficheiro Local</span>
                        </button>
                    </div>
                    <input 
                      type="file" 
                      hidden 
                      ref={fileInputRef} 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Ou Link Externo (URL)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input 
                        type="text" 
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="w-full p-4 pl-12 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary text-xs" 
                        value={dishForm.image?.startsWith('data:') ? '' : dishForm.image} 
                        onChange={e => setDishForm({...dishForm, image: e.target.value})} 
                      />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-5 bg-primary text-black rounded-[1.5rem] font-black uppercase tracking-widest shadow-glow flex items-center justify-center gap-3 mt-auto">
                    <Save size={18} /> Guardar Produto
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIA */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-[3rem] w-full max-w-md p-10 border border-white/10 shadow-2xl relative">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
               <button onClick={() => setIsCatModalOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleSubmitCat} className="space-y-6">
               <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Categoria</label>
                  <input required type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
               </div>
               
               <button type="submit" className="w-full py-5 bg-primary text-black rounded-[1.5rem] font-black uppercase tracking-widest shadow-glow flex items-center justify-center gap-3">
                  <Save size={18} /> Guardar Categoria
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
