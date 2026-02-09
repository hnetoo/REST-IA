
import React from 'react';
import { useStore } from '../store/useStore';
import { Eye, EyeOff, Star, Tag, Utensils, QrCode, Smartphone, Sparkles } from 'lucide-react';

const DigitalMenuManager = () => {
  const { menu, categories, toggleDishVisibility, toggleDishFeatured, toggleCategoryVisibility } = useStore();

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <QrCode size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Hub de Auto-Serviço Digital</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestão Menu Público</h2>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-3">
              <Smartphone size={20} className="text-primary" />
              <div className="text-[10px] font-black uppercase text-slate-400">Estado: <span className="text-emerald-500">Live</span></div>
           </div>
        </div>
      </header>

      <section className="space-y-12">
        {/* Gestão de Categorias */}
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Tag size={18} className="text-primary" /> Visibilidade de Categorias
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

        {/* Gestão de Pratos */}
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Utensils size={18} className="text-primary" /> Disponibilidade de Pratos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {menu.map(dish => {
              const cat = categories.find(c => c.id === dish.categoryId);
              return (
                <div key={dish.id} className={`glass-panel p-6 rounded-[2.5rem] border transition-all flex items-center gap-6 ${dish.isVisibleDigital ? 'border-primary/20' : 'border-white/5 grayscale opacity-40'}`}>
                   <div className="w-24 h-24 rounded-3xl overflow-hidden relative">
                      <img src={dish.image} className="w-full h-full object-cover" alt="" />
                      {dish.isFeatured && <div className="absolute top-2 right-2 p-1.5 bg-yellow-500 text-black rounded-full shadow-lg"><Sparkles size={12}/></div>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{cat?.name}</p>
                      <h4 className="text-white font-bold truncate">{dish.name}</h4>
                      <p className="text-primary font-mono font-bold text-xs mt-1">{formatKz(dish.price)}</p>
                   </div>
                   <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => toggleDishVisibility(dish.id)}
                        className={`p-3 rounded-2xl transition-all ${dish.isVisibleDigital ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                        title="Visibilidade"
                      >
                        {dish.isVisibleDigital ? <Eye size={18}/> : <EyeOff size={18}/>}
                      </button>
                      <button 
                        onClick={() => toggleDishFeatured(dish.id)}
                        className={`p-3 rounded-2xl transition-all ${dish.isFeatured ? 'bg-yellow-500 text-black shadow-glow' : 'bg-white/5 text-slate-500'}`}
                        title="Destaque"
                      >
                        <Star size={18} fill={dish.isFeatured ? 'currentColor' : 'none'} />
                      </button>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DigitalMenuManager;
