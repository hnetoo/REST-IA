import { useState, useCallback } from 'react';
import { useStockAdvanced } from '../../hooks/useStockAdvanced';
import { useStore } from '../../store/useStore';
import { createSupplier, updateSupplier, deleteSupplier, Supplier } from '../../lib/stockAdvancedService';
import { Truck, Plus, Edit2, Trash2, X, Phone, Mail, MapPin, User } from 'lucide-react';

const StockSuppliers = () => {
  const { suppliers, refresh } = useStockAdvanced();
  const { addNotification } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Supplier>({
    name: '', nif: '', phone: '', email: '', address: '', contact_person: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', nif: '', phone: '', email: '', address: '', contact_person: '' });
    setShowModal(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({ ...supplier });
    setShowModal(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name?.trim()) { addNotification('error', 'Nome é obrigatório'); return; }
    if (editing?.id) {
      const ok = await updateSupplier(editing.id, form);
      if (ok) { addNotification('success', 'Fornecedor actualizado!'); setShowModal(false); refresh(); }
      else addNotification('error', 'Erro ao actualizar');
    } else {
      const result = await createSupplier(form);
      if (result) { addNotification('success', 'Fornecedor criado!'); setShowModal(false); refresh(); }
      else addNotification('error', 'Erro ao criar fornecedor');
    }
  }, [form, editing, addNotification, refresh]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Desactivar fornecedor "${name}"?`)) return;
    const ok = await deleteSupplier(id);
    if (ok) { addNotification('success', 'Fornecedor desactivado'); refresh(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Truck size={20} className="text-primary" />
          Fornecedores ({suppliers.length})
        </h3>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-110">
          <Plus size={16} /> Novo Fornecedor
        </button>
      </div>

      <div className="glass-panel rounded-xl border border-white/5 p-6">
        {suppliers.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">Sem fornecedores registados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(s => (
              <div key={s.id} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-white">{s.name}</p>
                    {s.nif && <p className="text-xs text-slate-400">NIF: {s.nif}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg" title="Editar">
                      <Edit2 size={14} className="text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(s.id!, s.name)} className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg" title="Desactivar">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  {s.phone && <p className="flex items-center gap-2"><Phone size={12} /> {s.phone}</p>}
                  {s.email && <p className="flex items-center gap-2"><Mail size={12} /> {s.email}</p>}
                  {s.address && <p className="flex items-center gap-2"><MapPin size={12} /> {s.address}</p>}
                  {s.contact_person && <p className="flex items-center gap-2"><User size={12} /> {s.contact_person}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-700 rounded-lg" aria-label="Fechar">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Nome do fornecedor" placeholder="Ex: Distribuidora ABC" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">NIF</label>
                  <input type="text" value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="NIF do fornecedor" placeholder="Ex: 5000000000" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Telefone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Telefone" placeholder="Ex: +244 923..." />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Email" placeholder="Ex: info@fornecedor.com" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-2">Endereço</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Endereço" placeholder="Ex: Luanda, Angola" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-2">Pessoa de Contacto</label>
                <input type="text" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Pessoa de contacto" placeholder="Ex: João Silva" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20">Cancelar</button>
                <button onClick={handleSave} className="px-6 py-2 bg-primary text-black rounded-lg text-sm font-bold hover:brightness-110">
                  {editing ? 'Actualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSuppliers;
