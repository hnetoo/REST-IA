
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Calendar as CalIcon, Users, Clock, Plus, Search, 
  ChevronRight, CheckCircle2, MoreVertical, Sparkles 
} from 'lucide-react';

const Reservations = () => {
  const { reservations, addReservation } = useStore();
  const [filter, setFilter] = useState('');

  const filteredReservations = reservations.filter(r => 
    r.customerName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8 h-full bg-background flex flex-col overflow-hidden animate-in slide-in-from-right duration-700">
      <header className="flex justify-between items-center mb-10">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Online Booking engine</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Reservas & Agenda</h2>
        </div>
        
        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar reserva..." 
                className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none w-64 transition-all focus:w-80"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
           </div>
           <button className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3 hover:scale-105 transition-all">
             <Plus size={20} /> Novo Agendamento
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start pb-20">
        {filteredReservations.length === 0 ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-20">
             <CalIcon size={100} className="mb-6" />
             <h3 className="text-2xl font-black uppercase italic tracking-widest">Sem Reservas Próximas</h3>
          </div>
        ) : (
          filteredReservations.map(res => (
            <div key={res.id} className="glass-panel p-8 rounded-[3rem] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
               {/* Accent Gradient */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

               <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center group-hover:border-primary/50 transition-colors">
                    <span className="text-lg font-black text-white">{new Date(res.date).getDate()}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase">{new Intl.DateTimeFormat('pt-AO', { month: 'short' }).format(new Date(res.date))}</span>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${res.status === 'CONFIRMADA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {res.status}
                  </div>
               </div>

               <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-4 truncate">{res.customerName}</h4>

               <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Clock size={16} className="text-primary" />
                    <span className="text-xs font-mono font-bold">{new Date(res.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Users size={16} className="text-primary" />
                    <span className="text-xs font-bold">{res.people} Pessoas</span>
                  </div>
               </div>

               <div className="flex gap-2">
                  <button className="flex-1 py-4 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all">Cancelar</button>
                  <button className="flex-1 py-4 bg-primary/10 border border-primary/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all">Chegada</button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reservations;
