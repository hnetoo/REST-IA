import { useState, useCallback } from 'react';
import { useStockAdvanced } from '../../hooks/useStockAdvanced';
import { useStore } from '../../store/useStore';
import { createPurchase, receivePurchase, cancelPurchase, StockPurchaseItem } from '../../lib/stockAdvancedService';
import { ShoppingCart, Plus, Trash2, Check, X, Package } from 'lucide-react';

const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', {
  style: 'currency', currency: 'AOA', maximumFractionDigits: 0
}).format(val);

const StockPurchases = () => {
  const { suppliers, purchases, refresh } = useStockAdvanced();
  const { menu, addNotification, currentUser } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockPurchaseItem[]>([]);

  const addItem = () => {
    setItems(prev => [...prev, {
      product_id: '', product_name: '', quantity: 1, unit_cost: 0, total_cost: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof StockPurchaseItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'product_id') {
        const product = menu.find((p: any) => p.id === value);
        updated.product_name = product?.name || '';
        updated.unit_cost = (product as any).cost_price || (product as any).costPrice || 0;
      }
      if (field === 'quantity' || field === 'unit_cost' || field === 'product_id') {
        updated.total_cost = updated.quantity * updated.unit_cost;
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);

  const handleSave = useCallback(async () => {
    if (!selectedSupplier) { addNotification('error', 'Seleccione um fornecedor'); return; }
    if (items.length === 0) { addNotification('error', 'Adicione pelo menos um item'); return; }
    if (items.some(i => !i.product_id)) { addNotification('error', 'Todos os itens devem ter um produto'); return; }

    const purchaseId = await createPurchase({
      supplier_id: selectedSupplier,
      purchase_date: purchaseDate,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      status: 'PENDING',
      notes,
      created_by: currentUser?.name || 'SYSTEM',
      items,
    });

    if (purchaseId) {
      addNotification('success', 'Compra registada com sucesso!');
      setShowModal(false);
      resetForm();
      refresh();
    } else {
      addNotification('error', 'Erro ao registar compra');
    }
  }, [selectedSupplier, items, purchaseDate, invoiceNumber, totalAmount, notes, currentUser, addNotification, refresh]);

  const handleReceive = async (purchaseId: string, purchaseItems: any[]) => {
    const ok = await receivePurchase(purchaseId, purchaseItems, currentUser?.name);
    if (ok) {
      addNotification('success', 'Compra recebida! Stock actualizado.');
      refresh();
    } else {
      addNotification('error', 'Erro ao receber compra');
    }
  };

  const handleCancel = async (purchaseId: string) => {
    if (!confirm('Cancelar esta compra?')) return;
    const ok = await cancelPurchase(purchaseId);
    if (ok) { addNotification('success', 'Compra cancelada'); refresh(); }
  };

  const resetForm = () => {
    setSelectedSupplier(''); setInvoiceNumber(''); setNotes(''); setItems([]);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendente', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    RECEIVED: { label: 'Recebida', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    CANCELLED: { label: 'Cancelada', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShoppingCart size={20} className="text-primary" />
          Compras a Fornecedores ({purchases.length})
        </h3>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-110">
          <Plus size={16} /> Nova Compra
        </button>
      </div>

      {/* Lista de compras */}
      <div className="glass-panel rounded-xl border border-white/5 p-6">
        {purchases.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">Sem compras registadas.</p>
        ) : (
          <div className="space-y-3">
            {purchases.map(p => {
              const cfg = statusConfig[p.status] || statusConfig.PENDING;
              return (
                <div key={p.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold text-white text-sm">{p.supplier_name || 'Sem fornecedor'}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(p.purchase_date).toLocaleDateString('pt-AO')} • {p.invoice_number || 'Sem factura'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-primary">{formatKz(p.total_amount || 0)}</p>
                      {p.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleReceive(p.id!, p.items || [])}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Check size={14} /> Receber
                          </button>
                          <button onClick={() => handleCancel(p.id!)}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1">
                            <X size={14} /> Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {p.items && p.items.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 text-left">
                            <th className="pb-1 pr-4">Produto</th>
                            <th className="pb-1 pr-4 text-center">Qtd</th>
                            <th className="pb-1 pr-4 text-right">Custo Unit.</th>
                            <th className="pb-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.items.map((item: any, i: number) => (
                            <tr key={i} className="text-slate-300">
                              <td className="py-1 pr-4">{item.product_name}</td>
                              <td className="py-1 pr-4 text-center">{item.quantity}</td>
                              <td className="py-1 pr-4 text-right">{formatKz(item.unit_cost)}</td>
                              <td className="py-1 text-right">{formatKz(item.total_cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova Compra */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Nova Compra</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-slate-700 rounded-lg" aria-label="Fechar">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Fornecedor</label>
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Seleccionar fornecedor">
                    <option value="">Seleccione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Nº Factura</label>
                  <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    placeholder="Ex: FT-2026-001" title="Número da factura" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Data</label>
                  <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Data da compra" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-slate-300 text-sm font-medium">Itens da Compra</label>
                  <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs font-bold hover:bg-primary/30">
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>
                {items.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border border-dashed border-white/10 rounded-lg">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    Sem itens. Clique "Adicionar Item".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 bg-white/5 rounded-lg">
                        <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}
                          className="col-span-5 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs" title="Produto">
                          <option value="">Seleccione...</option>
                          {menu.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="col-span-2 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs text-center" title="Quantidade" />
                        <input type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(i, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="col-span-2 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs text-right" title="Custo unitário" />
                        <span className="col-span-2 text-right text-primary text-xs font-bold">{formatKz(item.total_cost)}</span>
                        <button onClick={() => removeItem(i)} className="col-span-1 p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 flex items-center justify-center" title="Remover item">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Notas da compra" />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <p className="text-lg font-bold text-white">Total: <span className="text-primary">{formatKz(totalAmount)}</span></p>
                <div className="flex gap-3">
                  <button onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20">Cancelar</button>
                  <button onClick={handleSave}
                    className="px-6 py-2 bg-primary text-black rounded-lg text-sm font-bold hover:brightness-110">Registar Compra</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPurchases;
