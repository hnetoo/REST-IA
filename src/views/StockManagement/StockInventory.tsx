import { useState, useCallback } from 'react';
import { useStockAdvanced } from '../../hooks/useStockAdvanced';
import { useStore } from '../../store/useStore';
import {
  createInventory, updateInventoryItem, reconcileInventory,
  deleteInventory, deleteInventoryItem,
} from '../../lib/stockAdvancedService';
import { ClipboardList, Plus, Check, X, RefreshCw, Trash2, Edit2, Save } from 'lucide-react';

const StockInventoryView = () => {
  const { inventories, refresh } = useStockAdvanced();
  const { menu, addNotification, currentUser } = useStore();
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [blindMode, setBlindMode] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteInv, setConfirmDeleteInv] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null);

  const selectedInventory = inventories.find(inv => inv.id === selectedInventoryId);

  const handleCreateInventory = useCallback(async () => {
    if (!confirm('Iniciar novo inventário físico? O sistema vai registar as quantidades actuais.')) return;
    const id = await createInventory(menu as any[], currentUser?.name);
    if (id) {
      addNotification('success', 'Inventário iniciado! Pode começar a contagem.');
      setSelectedInventoryId(id);
      refresh();
    } else {
      addNotification('error', 'Erro ao iniciar inventário');
    }
  }, [menu, currentUser, addNotification, refresh]);

  const handleCountItem = async (itemId: string, qty: number) => {
    const ok = await updateInventoryItem(itemId, qty);
    if (!ok) addNotification('error', 'Erro ao actualizar contagem');
  };

  const handleSaveEdit = async (itemId: string) => {
    const qty = parseInt(editValue) || 0;
    await handleCountItem(itemId, qty);
    setEditingItem(null);
    setEditValue('');
    refresh();
  };

  const handleReconcile = async () => {
    if (!selectedInventory || !selectedInventory.id) return;
    if (!confirm('Reconciliar inventário? O stock será ajustado conforme a contagem.')) return;
    const items = selectedInventory.items || [];
    const ok = await reconcileInventory(selectedInventory.id, items, currentUser?.name);
    if (ok) {
      addNotification('success', 'Inventário reconciliado! Stock actualizado.');
      refresh();
    } else {
      addNotification('error', 'Erro ao reconciliar inventário');
    }
  };

  const handleDeleteInventory = async (inventoryId: string) => {
    const ok = await deleteInventory(inventoryId);
    if (ok) {
      addNotification('success', 'Inventário apagado com sucesso.');
      setConfirmDeleteInv(null);
      if (selectedInventoryId === inventoryId) setSelectedInventoryId(null);
      refresh();
    } else {
      addNotification('error', 'Erro ao apagar inventário');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const ok = await deleteInventoryItem(itemId);
    if (ok) {
      addNotification('success', 'Item apagado do inventário.');
      setConfirmDeleteItem(null);
      refresh();
    } else {
      addNotification('error', 'Erro ao apagar item');
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    OPEN: { label: 'Em Contagem', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    COUNTED: { label: 'Contado', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    RECONCILED: { label: 'Reconciliado', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ClipboardList size={20} className="text-primary" />
          Inventário Físico ({inventories.length})
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={blindMode} onChange={e => setBlindMode(e.target.checked)}
              className="accent-primary" title="Modo contagem cega" />
            Contagem Cega
          </label>
          <button type="button" onClick={handleCreateInventory}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-110">
            <Plus size={16} /> Novo Inventário
          </button>
        </div>
      </div>

      {/* Lista de inventários */}
      {!selectedInventory && (
        <div className="glass-panel rounded-xl border border-white/5 p-6">
          {inventories.length === 0 ? (
            <p className="text-slate-500 text-sm py-12 text-center">Sem inventários registados.</p>
          ) : (
            <div className="space-y-3">
              {inventories.map(inv => {
                const cfg = statusConfig[inv.status] || statusConfig.OPEN;
                const items = inv.items || [];
                const counted = items.filter((i: any) => i.counted_quantity !== null).length;
                const divergences = items.filter((i: any) => {
                  if (i.counted_quantity === null) return false;
                  const diff = i.counted_quantity - i.system_quantity;
                  return diff !== 0;
                }).length;
                return (
                  <div key={inv.id} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 cursor-pointer" onClick={() => setSelectedInventoryId(inv.id!)}>
                        <p className="font-bold text-white text-sm">
                          Inventário {new Date(inv.inventory_date).toLocaleDateString('pt-AO')}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {items.length} itens • {counted} contados • {divergences} divergências
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                        {confirmDeleteInv === inv.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => handleDeleteInventory(inv.id!)}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600">
                              Confirmar
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteInv(null)}
                              className="px-2 py-1 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteInv(inv.id!)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Apagar inventário">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detalhe do inventário seleccionado */}
      {selectedInventory && (
        <div className="glass-panel rounded-xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-white">
                Inventário {new Date(selectedInventory.inventory_date).toLocaleDateString('pt-AO')}
              </h4>
              <p className="text-xs text-slate-400">
                {selectedInventory.items?.length || 0} itens • Estado: {statusConfig[selectedInventory.status]?.label}
              </p>
            </div>
            <div className="flex gap-2">
              {selectedInventory.status === 'OPEN' && (
                <button type="button" onClick={handleReconcile}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-bold text-sm hover:bg-green-500/30">
                  <Check size={16} /> Reconciliar
                </button>
              )}
              <button type="button" onClick={() => setSelectedInventoryId(null)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20">
                Voltar
              </button>
              <button type="button" onClick={refresh} className="p-2 hover:bg-white/10 rounded-lg" title="Actualizar">
                <RefreshCw size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="pb-2 pr-4">Produto</th>
                  {!blindMode && <th className="pb-2 pr-4 text-center">Qtd Sistema</th>}
                  <th className="pb-2 pr-4 text-center">Qtd Contada</th>
                  <th className="pb-2 pr-4 text-center">Diferença</th>
                  <th className="pb-2 pr-4 text-center">Estado</th>
                  <th className="pb-2 text-center">Acções</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInventory.items || []).map((item: any) => {
                  const diff = item.counted_quantity !== null ? item.counted_quantity - item.system_quantity : null;
                  const isEditing = editingItem === item.id;
                  return (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-4 font-medium text-white">{item.product_name}</td>
                      {!blindMode && <td className="py-2 pr-4 text-center text-slate-300">{item.system_quantity}</td>}
                      <td className="py-2 pr-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min="0" value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') { setEditingItem(null); setEditValue(''); } }}
                              className="w-20 px-2 py-1 bg-slate-700 border border-primary/50 rounded text-white text-xs text-center focus:outline-none focus:border-primary"
                              autoFocus title="Nova quantidade contada" placeholder="0" />
                            <button type="button" onClick={() => handleSaveEdit(item.id)}
                              className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30" title="Guardar">
                              <Save size={12} />
                            </button>
                            <button type="button" onClick={() => { setEditingItem(null); setEditValue(''); }}
                              className="p-1 bg-white/10 text-slate-400 rounded hover:bg-white/20" title="Cancelar">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <input type="number" min="0" defaultValue={item.counted_quantity ?? ''}
                            onBlur={e => { if (!isEditing) handleCountItem(item.id, parseInt(e.target.value) || 0); }}
                            className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs text-center hover:border-slate-500 focus:border-primary focus:outline-none"
                            title="Quantidade contada" placeholder="—" />
                        )}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        {diff === null ? <span className="text-slate-500">—</span> :
                         diff === 0 ? <span className="text-green-400">0</span> :
                         diff > 0 ? <span className="text-green-400">+{diff}</span> :
                         <span className="text-red-400">{diff}</span>}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        {item.counted_quantity === null ? <span className="text-xs text-slate-500">Pendente</span> :
                         diff === 0 ? <span className="text-xs text-green-400">OK</span> :
                         <span className="text-xs text-yellow-400">Divergência</span>}
                      </td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => { setEditingItem(item.id); setEditValue(item.counted_quantity?.toString() || ''); }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                            title="Editar contagem">
                            <Edit2 size={12} />
                          </button>
                          {confirmDeleteItem === item.id ? (
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => handleDeleteItem(item.id)}
                                className="px-1.5 py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600">
                                OK
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteItem(null)}
                                className="px-1.5 py-1 bg-white/10 text-white rounded text-[10px] hover:bg-white/20">
                                X
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setConfirmDeleteItem(item.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Apagar item do inventário">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInventoryView;
