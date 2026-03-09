
import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  CalendarDays, Clock, Plus, Trash2, X, Save, 
  Users, ChefHat, Utensils, Wallet, ShieldCheck, 
  ChevronLeft, ChevronRight, Timer, AlertCircle
} from 'lucide-react';
import { WorkShift, Employee, UserRole } from '../types';

const Schedules = () => {
  const { employees, workShifts, addWorkShift, updateWorkShift, removeWorkShift, addNotification } = useStore();
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1); // Default to Monday if Sunday (0)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);

  // Form State
  const [form, setForm] = useState<Partial<WorkShift>>({
    employeeId: '', dayOfWeek: 1, startTime: '08:00', endTime: '16:00'
  });

  const daysOfWeek = [
    { id: 1, label: 'Segunda' },
    { id: 2, label: 'Terça' },
    { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' },
    { id: 5, label: 'Sexta' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' }
  ];

  const filteredShifts = useMemo(() => 
    workShifts.filter(s => s.dayOfWeek === selectedDay),
    [workShifts, selectedDay]
  );

  const totalCoverageHours = useMemo(() => {
    return filteredShifts.reduce((acc, shift) => {
      const [h1, m1] = shift.startTime.split(':').map(Number);
      const [h2, m2] = shift.endTime.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; // Over midnight shift
      return acc + (diff / 60);
    }, 0);
  }, [filteredShifts]);

  const handleOpenModal = (shift?: WorkShift) => {
    if (shift) {
      setEditingShift(shift);
      setForm(shift);
    } else {
      setEditingShift(null);
      setForm({ employeeId: employees[0]?.id || '', dayOfWeek: selectedDay, startTime: '08:00', endTime: '16:00' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) {
      addNotification('error', 'Selecione um funcionário.');
      return;
    }

    if (editingShift) {
      updateWorkShift({ ...editingShift, ...form } as WorkShift);
      addNotification('success', 'Turno atualizado.');
    } else {
      addWorkShift({
        id: `shift-${Date.now()}`,
        employeeId: form.employeeId!,
        dayOfWeek: form.dayOfWeek!,
        startTime: form.startTime!,
        endTime: form.endTime!
      });
      addNotification('success', 'Escala adicionada.');
    }
    setIsModalOpen(false);
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN': return <ShieldCheck size={16} className="text-purple-500" />;
      case 'COZINHA': return <ChefHat size={16} className="text-orange-500" />;
      case 'CAIXA': return <Wallet size={16} className="text-blue-500" />;
      case 'GARCOM': return <Utensils size={16} className="text-emerald-500" />;
      default: return <Users size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <CalendarDays size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Resource Planner • Tasca OS</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Escalas de Turno</h2>
        </div>
        
        <div className="flex bg-white/5 p-2 rounded-2xl border border-white/5">
           <div className="px-6 py-2 border-r border-white/5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Horas/Dia</p>
              <p className="text-lg font-mono font-bold text-primary">{totalCoverageHours.toFixed(1)}h</p>
           </div>
           <div className="px-6 py-2">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Staff Escalado</p>
              <p className="text-lg font-mono font-bold text-white">{filteredShifts.length}</p>
           </div>
        </div>
      </header>

      {/* Day Selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
        {daysOfWeek.map(day => (
          <button 
            key={day.id} 
            onClick={() => setSelectedDay(day.id)}
            className={`px-6 py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap
              ${selectedDay === day.id ? 'bg-primary border-primary text-black shadow-glow' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}
            `}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
         <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <Timer size={20} className="text-primary" />
            Agenda para {daysOfWeek.find(d => d.id === selectedDay)?.label}
         </h3>
         <button 
           onClick={() => handleOpenModal()}
           className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
         >
           <Plus size={16} /> Adicionar Escala
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-20">
        {filteredShifts.length === 0 ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-10">
             <Clock size={80} className="mb-4" />
             <p className="text-xl font-black uppercase italic tracking-widest">Nenhum turno planeado</p>
          </div>
        ) : (
          filteredShifts.map(shift => {
            const emp = getEmployee(shift.employeeId);
            return (
              <div key={shift.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg text-lg font-black" style={{ backgroundColor: emp?.color || '#334155' }}>
                     {emp?.name.substring(0, 2).toUpperCase()}
                   </div>
                   <div className="min-w-0">
                      <h4 className="font-bold text-white truncate text-sm">{emp?.name || 'Staff Desconhecido'}</h4>
                      <div className="flex items-center gap-1 mt-1">
                         {getRoleIcon(emp?.role)}
                         <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{emp?.role}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-3 mb-6">
                   <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Início</span>
                      <span className="text-sm font-mono font-bold text-primary">{shift.startTime}</span>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fim</span>
                      <span className="text-sm font-mono font-bold text-orange-500">{shift.endTime}</span>
                   </div>
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={() => handleOpenModal(shift)}
                     className="flex-1 py-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all"
                   >
                     Editar
                   </button>
                   <button 
                     onClick={() => { if(window.confirm('Eliminar esta escala?')) removeWorkShift(shift.id); }}
                     className="px-4 py-3 rounded-xl border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Turno */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
           <div className="glass-panel rounded-[4rem] w-full max-w-md p-12 border border-white/10 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white"><X size={32} /></button>
              
              <div className="flex items-center gap-4 mb-10">
                 <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-glow">
                    <Clock size={32} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{editingShift ? 'Atualizar Turno' : 'Nova Escala'}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Planeamento de Operações</p>
                 </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Funcionário</label>
                    <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold appearance-none" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})}>
                       <option value="" className="bg-slate-900">Selecionar Staff...</option>
                       {employees.map(e => <option key={e.id} value={e.id} className="bg-slate-900">{e.name} ({e.role})</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Dia da Semana</label>
                    <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold appearance-none" value={form.dayOfWeek} onChange={e => setForm({...form, dayOfWeek: Number(e.target.value)})}>
                       {daysOfWeek.map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.label}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Entrada</label>
                       <input required type="time" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-mono font-bold" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Saída</label>
                       <input required type="time" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-mono font-bold" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-6 bg-primary text-black rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-3 mt-4">
                    <Save size={20} /> Guardar Escala
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
