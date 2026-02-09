
import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  Users, UserPlus, Calendar, Clock, Phone, DollarSign, Trash2, 
  Edit2, X, Plus, Save, Fingerprint, ChefHat, Wallet, Utensils,
  ShieldCheck, Timer
} from 'lucide-react';
import { Employee, WorkShift, UserRole } from '../types';

const Employees = () => {
  const { 
    employees, workShifts, addEmployee, updateEmployee, removeEmployee, 
    addWorkShift, updateWorkShift, removeWorkShift,
    clockIn, clockOut, attendance, addNotification 
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'LIST' | 'SCHEDULE' | 'ATTENDANCE'>('LIST');
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() || 1);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);

  // Form States
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    name: '', role: 'GARCOM', phone: '', salary: 0, status: 'ATIVO', color: '#06b6d4', workDaysPerMonth: 22, dailyWorkHours: 8, externalBioId: ''
  });

  const [shiftForm, setShiftForm] = useState<Partial<WorkShift>>({
    employeeId: '', dayOfWeek: 1, startTime: '08:00', endTime: '16:00'
  });

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  const totalPayroll = useMemo(() => employees.reduce((acc, emp) => acc + emp.salary, 0), [employees]);

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) {
      updateEmployee({ ...editingEmp, ...empForm } as Employee);
    } else {
      addEmployee({
        id: `emp-${Date.now()}`,
        name: empForm.name || '',
        role: empForm.role as UserRole,
        phone: empForm.phone || '',
        salary: Number(empForm.salary) || 0,
        status: 'ATIVO',
        color: empForm.color || '#06b6d4',
        workDaysPerMonth: Number(empForm.workDaysPerMonth) || 22,
        dailyWorkHours: Number(empForm.dailyWorkHours) || 8,
        externalBioId: empForm.externalBioId || `${Math.floor(Math.random() * 9999)}`
      });
    }
    setIsEmpModalOpen(false);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.employeeId) return;
    if (editingShift) {
      updateWorkShift({ ...editingShift, ...shiftForm } as WorkShift);
    } else {
      addWorkShift({
        id: `shift-${Date.now()}`,
        employeeId: shiftForm.employeeId!,
        dayOfWeek: shiftForm.dayOfWeek!,
        startTime: shiftForm.startTime!,
        endTime: shiftForm.endTime!
      });
    }
    setIsShiftModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return { icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Gerente' };
      case 'COZINHA': return { icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Chef' };
      case 'CAIXA': return { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Caixa' };
      case 'GARCOM': return { icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Garçom' };
      default: return { icon: Users, color: 'text-slate-500', bg: 'bg-slate-500/10', label: role };
    }
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredShifts = workShifts.filter(s => s.dayOfWeek === selectedDay);

  const daysOfWeek = [
    { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' }, 
    { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }, { id: 0, label: 'Dom' }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
             <Fingerprint size={18} className="animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">Gestão de Capital Humano</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Hub da Equipa</h2>
        </div>
        
        <div className="flex bg-white/5 p-2 rounded-2xl border border-white/5">
          <div className="px-6 py-2 border-r border-white/5">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Staff</p>
             <p className="text-lg font-mono font-bold text-white">{employees.length}</p>
          </div>
          <div className="px-6 py-2">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Encargo Mensal</p>
             <p className="text-lg font-mono font-bold text-primary">{formatKz(totalPayroll)}</p>
          </div>
        </div>
      </header>

      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4 border-b border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'LIST', label: 'Funcionários', icon: Users },
            { id: 'SCHEDULE', label: 'Escalas de Turno', icon: Calendar },
            { id: 'ATTENDANCE', label: 'Ponto & Picagem', icon: Clock }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-4 px-6 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>
              <tab.icon size={16} /> {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow"></div>}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {activeTab === 'LIST' && (
            <button 
                onClick={() => { setEditingEmp(null); setIsEmpModalOpen(true); }}
                className="px-6 py-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center gap-2"
            >
                <UserPlus size={18} /> Novo Staff
            </button>
          )}
          {activeTab === 'SCHEDULE' && (
             <button 
                onClick={() => { setEditingShift(null); setShiftForm({employeeId: employees[0]?.id, dayOfWeek: selectedDay, startTime: '08:00', endTime: '16:00'}); setIsShiftModalOpen(true); }}
                className="px-6 py-3 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center gap-2"
             >
                <Plus size={18} /> Criar Escala
             </button>
          )}
        </div>
      </div>

      <div className="animate-in fade-in duration-500 pb-20">
        {activeTab === 'LIST' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {filteredEmployees.map(emp => {
              const roleInfo = getRoleBadge(emp.role);
              const RoleIcon = roleInfo.icon;
              return (
                <div key={emp.id} className="glass-panel p-8 rounded-[3rem] border border-white/5 group hover:border-primary/40 transition-all relative flex flex-col">
                  <div className="absolute top-0 right-0 p-6 opacity-5 text-white group-hover:scale-110 transition-transform"><RoleIcon size={64} /></div>
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl text-2xl font-black shrink-0" style={{ backgroundColor: emp.color }}>
                        {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-white text-lg tracking-tight truncate">{emp.name}</h3>
                        <div className={`mt-1 px-3 py-1 rounded-full ${roleInfo.bg} ${roleInfo.color} text-[8px] font-black uppercase tracking-widest w-fit`}>
                            {roleInfo.label}
                        </div>
                    </div>
                  </div>
                  <div className="space-y-4 mb-10 flex-1">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Phone size={14} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-tight">{emp.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-xs font-mono font-bold text-white">{formatKz(emp.salary)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingEmp(emp); setEmpForm(emp); setIsEmpModalOpen(true); }} className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest">Editar</button>
                    <button onClick={() => removeEmployee(emp.id)} className="px-5 py-4 rounded-2xl border border-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'SCHEDULE' && (
          <div className="space-y-8">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
              {daysOfWeek.map(day => (
                <button 
                  key={day.id} 
                  onClick={() => setSelectedDay(day.id)}
                  className={`px-8 py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${selectedDay === day.id ? 'bg-primary border-primary text-black shadow-glow' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {filteredShifts.map(shift => {
                 const emp = employees.find(e => e.id === shift.employeeId);
                 return (
                   <div key={shift.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary"><Clock size={20}/></div>
                        <div className="min-w-0">
                          <h4 className="text-white font-bold text-sm truncate uppercase">{emp?.name || 'Desconhecido'}</h4>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{emp?.role}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
                        <span className="text-xs font-mono font-bold text-primary">{shift.startTime}</span>
                        <div className="w-4 h-0.5 bg-slate-800"></div>
                        <span className="text-xs font-mono font-bold text-orange-500">{shift.endTime}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingShift(shift); setShiftForm(shift); setIsShiftModalOpen(true); }} className="flex-1 py-3 bg-white/5 text-[9px] font-black text-slate-400 uppercase rounded-xl hover:text-white transition-colors">Ajustar</button>
                        <button onClick={() => removeWorkShift(shift.id)} className="p-3 text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 )
               })}
            </div>
          </div>
        )}

        {activeTab === 'ATTENDANCE' && (
          <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5">
                   <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-8 py-6">Funcionário</th>
                      <th className="px-8 py-6 text-center">Data</th>
                      <th className="px-8 py-6 text-center">Entrada</th>
                      <th className="px-8 py-6 text-center">Saída</th>
                      <th className="px-8 py-6 text-right">Estado Real</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {attendance.slice(-20).map((record, i) => {
                     const emp = employees.find(e => e.id === record.employeeId);
                     return (
                       <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6 font-bold text-white uppercase text-xs">{emp?.name}</td>
                          <td className="px-8 py-6 text-center text-xs font-mono text-slate-400">{record.date}</td>
                          <td className="px-8 py-6 text-center font-mono text-emerald-500">{record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '--:--'}</td>
                          <td className="px-8 py-6 text-center font-mono text-orange-500">{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '--:--'}</td>
                          <td className="px-8 py-6 text-right">
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${record.clockOut ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {record.clockOut ? 'Finalizado' : 'Em Turno'}
                             </span>
                          </td>
                       </tr>
                     )
                   })}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {/* Modais de Funcionário e Turno omitidos para brevidade */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
          <div className="glass-panel rounded-[4rem] w-full max-w-2xl p-12 border border-white/10 shadow-2xl relative">
            <button onClick={() => setIsEmpModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white"><X size={32} /></button>
            <div className="flex items-center gap-4 mb-12">
               <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-glow"><UserPlus size={32} /></div>
               <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">{editingEmp ? 'Atualizar Staff' : 'Admissão de Staff'}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REST IA OS Human Resources</p>
               </div>
            </div>
            <form onSubmit={handleSaveEmployee} className="grid grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nome Completo</label>
                  <input required type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Papel</label>
                  <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold appearance-none" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value as UserRole})}>
                    <option value="GARCOM">Garçom</option>
                    <option value="COZINHA">Chef / Cozinha</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="ADMIN">Gerente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Salário (Kz)</label>
                  <input required type="number" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-mono" value={empForm.salary} onChange={e => setEmpForm({...empForm, salary: Number(e.target.value)})} />
                </div>
                <div className="col-span-2 pt-6">
                  <button type="submit" className="w-full py-6 bg-primary text-black rounded-[2rem] font-black uppercase text-xs shadow-glow flex items-center justify-center gap-3 transition-all hover:brightness-110">
                    <Save size={22} /> Guardar Cadastro
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
           <div className="glass-panel rounded-[4rem] w-full max-w-md p-12 border border-white/10 shadow-2xl relative">
              <button onClick={() => setIsShiftModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white"><X size={32} /></button>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3"><Timer className="text-primary"/> Configurar Turno</h3>
              <form onSubmit={handleSaveShift} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Selecionar Colaborador</label>
                    <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold" value={shiftForm.employeeId} onChange={e => setShiftForm({...shiftForm, employeeId: e.target.value})}>
                       {employees.map(e => <option key={e.id} value={e.id} className="bg-slate-900">{e.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Início</label>
                       <input type="time" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-mono" value={shiftForm.startTime} onChange={e => setShiftForm({...shiftForm, startTime: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fim</label>
                       <input type="time" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-mono" value={shiftForm.endTime} onChange={e => setShiftForm({...shiftForm, endTime: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-primary text-black rounded-[2rem] font-black uppercase text-xs shadow-glow">Confirmar Escala</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
