
import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Users, Phone, Calendar, Wallet, Printer, CheckCircle, X, Plus, Pencil, Trash2, Search, Fingerprint, TrendingUp, Star } from 'lucide-react';
import { Customer } from '../../types';

const Customers = () => {
  const { customers, settleCustomerDebt, addCustomer, updateCustomer, removeCustomer, currentUser, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModal, setPaymentModal] = useState<{ id: string, name: string, debt: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
      name: '', phone: '', nif: '', points: 0, balance: 0
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const stats = useMemo(() => ({
    total: customers.length,
    totalDebt: customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0),
    totalPoints: customers.reduce((sum, c) => sum + (c.points || 0), 0),
    totalVisits: customers.reduce((sum, c) => sum + (c.visits || 0), 0),
  }), [customers]);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  const handleOpenCustomerModal = (customer?: Customer) => {
      if (customer) {
          setEditingCustomer(customer);
          setCustomerForm(customer);
      } else {
          setEditingCustomer(null);
          setCustomerForm({ name: '', phone: '', nif: '', points: 0, balance: 0 });
      }
      setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
      e.preventDefault();
      const { name, phone, nif, balance, points } = customerForm;

      if (!name || !phone) return;

      // REQUISITO: Se o NIF estiver vazio, atribui o padrão 999999999
      const finalNif = nif?.trim() || '999999999';

      if (editingCustomer) {
          updateCustomer({
              ...editingCustomer,
              name,
              phone,
              nif: finalNif,
              balance: Number(balance || 0),
              points: Number(points || 0)
          });
      } else {
          addCustomer({
              id: `cust-${Date.now()}`,
              name,
              phone,
              nif: finalNif,
              points: Number(points || 0),
              balance: Number(balance || 0),
              visits: 0,
              lastVisit: new Date()
          });
      }
      setIsCustomerModalOpen(false);
  };

  const handleDeleteCustomer = (id: string) => {
      if (window.confirm("Deseja remover este cliente permanentemente?")) {
          removeCustomer(id);
      }
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Fingerprint size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">CRM & Loyalty Engine</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Fidelização</h2>
        </div>
        
        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:border-primary outline-none w-64 transition-all focus:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button 
             onClick={() => handleOpenCustomerModal()}
             className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3 hover:scale-105 transition-all"
           >
             <Plus size={20} /> Novo Cliente
           </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 group hover:border-primary/20 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Clientes</p>
          </div>
          <p className="text-2xl font-mono font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 group hover:border-red-500/20 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-red-400" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Dívida Total</p>
          </div>
          <p className="text-2xl font-mono font-bold text-red-400">{formatKz(stats.totalDebt)}</p>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 group hover:border-amber-500/20 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-amber-400" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pontos Totais</p>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-400">{stats.totalPoints.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 group hover:border-emerald-500/20 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Visitas Totais</p>
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-400">{stats.totalVisits.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start pb-20">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center opacity-20">
             <Users size={100} className="mb-6" />
             <h3 className="text-2xl font-black uppercase italic tracking-widest">Nenhum Cliente Registado</h3>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div key={customer.id} className="glass-panel p-8 rounded-[3rem] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:border-primary/50 transition-colors">
                    <Users size={28} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenCustomerModal(customer)} className="p-2 text-slate-500 hover:text-white transition-colors" title="Editar cliente" aria-label="Editar cliente"><Pencil size={18}/></button>
                    <button onClick={() => handleDeleteCustomer(customer.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors" title="Apagar cliente" aria-label="Apagar cliente"><Trash2 size={18}/></button>
                  </div>
               </div>

               <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-1 truncate">{customer.name}</h4>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Phone size={12} className="text-primary"/> {customer.phone}
               </p>

               <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Pontos</p>
                     <p className="text-lg font-mono font-bold text-primary">{customer.points}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Visitas</p>
                     <p className="text-lg font-mono font-bold text-white">{customer.visits}</p>
                  </div>
               </div>

               <div className="mt-auto space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Saldo Conta Corrente</span>
                    <span className={`text-sm font-mono font-bold ${customer.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {formatKz(customer.balance)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPaymentModal({ id: customer.id, name: customer.name, debt: customer.balance })}
                      disabled={customer.balance <= 0}
                      className="flex-1 py-4 bg-primary text-black rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-glow disabled:opacity-20 hover:brightness-110 transition-all"
                    >
                      Liquidar
                    </button>
                    <button className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all" title="Imprimir ficha" aria-label="Imprimir ficha">
                      <Printer size={18} />
                    </button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Cliente */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass-panel rounded-[3rem] w-full max-w-lg p-10 border border-white/10 text-center animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8">{editingCustomer ? 'Atualizar Cliente' : 'Novo Cliente'}</h3>
              <form onSubmit={handleSaveCustomer} className="space-y-6 text-left">
                  <div className="space-y-4">
                      <div>
                        <label htmlFor="customer-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                        <input id="customer-name" required type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Nome do cliente" />
                      </div>
                      <div>
                        <label htmlFor="customer-phone" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                        <input id="customer-phone" required type="tel" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="Telefone do cliente" />
                      </div>
                      <div>
                        <label htmlFor="customer-nif" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">NIF (Opcional - Padrão: 999999999)</label>
                        <input id="customer-nif" type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary" value={customerForm.nif} onChange={e => setCustomerForm({...customerForm, nif: e.target.value})} placeholder="999999999" />
                      </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow">Guardar Ficha de Cliente</button>
                  <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="w-full py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Customers;




