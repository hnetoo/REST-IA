
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Calendar as CalIcon, Users, Clock, Plus, Search, 
  ChevronRight, CheckCircle2, MoreVertical, Sparkles, X
} from 'lucide-react';

const Reservations = () => {
  const { reservations, addReservation, cancelReservation, updateReservation, deleteReservation } = useStore();
  const [filter, setFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

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
           <button 
             onClick={() => setShowCreateModal(true)}
             className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3 hover:scale-105 transition-all"
           >
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
                  {res.status === 'CANCELADA' ? (
                    <button 
                      onClick={() => {
                        if (confirm('Tem certeza que deseja APAGAR permanentemente esta reserva cancelada?')) {
                          deleteReservation(res.id);
                        }
                      }}
                      className="flex-1 py-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Apagar
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setSelectedReservation(res);
                        setShowEditModal(true);
                      }}
                      className="flex-1 py-4 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Editar
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (confirm('Tem certeza que deseja cancelar esta reserva?')) {
                        cancelReservation(res.id);
                      }
                    }}
                    disabled={res.status === 'CANCELADA'}
                    className="flex-1 py-4 bg-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => updateReservation(res.id, { status: 'CONFIRMADA' })}
                    disabled={res.status === 'CONFIRMADA' || res.status === 'CANCELADA'}
                    className="flex-1 py-4 bg-primary/10 border border-primary/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Criação de Reserva */}
      {showCreateModal && (
        <CreateReservationModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}

      {/* Modal de Edição de Reserva */}
      {showEditModal && selectedReservation && (
        <EditReservationModal 
          reservation={selectedReservation}
          onClose={() => {
            setShowEditModal(false);
            setSelectedReservation(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedReservation(null);
          }}
        />
      )}
    </div>
  );
};

// Modal para criar nova reserva
const CreateReservationModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { addReservation } = useStore();
  const [formData, setFormData] = useState({
    customerName: '',
    date: '',
    time: '',
    people: 2,
    phone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dateTime = new Date(`${formData.date}T${formData.time || '12:00'}`);
      await addReservation({
        id: `res-${Date.now()}`,
        customerName: formData.customerName,
        date: dateTime,
        people: formData.people,
        status: 'PENDENTE'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Nova Reserva</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" title="Fechar" aria-label="Fechar"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="res-name" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Cliente</label>
            <input 
              id="res-name"
              type="text" 
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.customerName}
              onChange={e => setFormData({...formData, customerName: e.target.value})}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-date" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Data</label>
              <input 
                id="res-date"
                type="date" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="res-time" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Hora</label>
              <input 
                id="res-time"
                type="time" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="res-people" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nº de Pessoas</label>
              <input 
                id="res-people"
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.people}
                onChange={e => setFormData({...formData, people: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <label htmlFor="res-phone" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Telefone</label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+244 xxx xxx xxx"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Observações</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas adicionais..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold uppercase tracking-widest text-black hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para editar reserva
const EditReservationModal = ({ reservation, onClose, onSuccess }: { reservation: any; onClose: () => void; onSuccess: () => void }) => {
  const { updateReservation } = useStore();
  const [formData, setFormData] = useState({
    customerName: reservation.customerName || '',
    date: reservation.date ? new Date(reservation.date).toISOString().split('T')[0] : '',
    time: reservation.date ? new Date(reservation.date).toTimeString().slice(0, 5) : '',
    people: reservation.people || 2,
    phone: reservation.phone || '',
    notes: reservation.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dateTime = new Date(`${formData.date}T${formData.time || '12:00'}`);
      await updateReservation(reservation.id, {
        customerName: formData.customerName,
        date: dateTime,
        people: formData.people
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Editar Reserva</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" title="Fechar" aria-label="Fechar"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-res-name" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nome do Cliente</label>
            <input 
              id="edit-res-name"
              type="text" 
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
              value={formData.customerName}
              onChange={e => setFormData({...formData, customerName: e.target.value})}
              placeholder="Nome do cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-res-date" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Data</label>
              <input 
                id="edit-res-date"
                type="date" 
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="edit-res-time" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Hora</label>
              <input 
                id="edit-res-time"
                type="time" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-res-people" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Nº de Pessoas</label>
              <input 
                id="edit-res-people"
                type="number" 
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.people}
                onChange={e => setFormData({...formData, people: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <label htmlFor="edit-res-phone" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Telefone</label>
              <input 
                id="edit-res-phone"
                type="tel" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+244 xxx xxx xxx"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-res-notes" className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">Observações</label>
            <textarea 
              id="edit-res-notes"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary outline-none resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas adicionais..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 rounded-2xl text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary rounded-2xl text-sm font-bold uppercase tracking-widest text-black hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Reservations;




