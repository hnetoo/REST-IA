import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store/useStore';
import { registerDamagedStock, fetchDamagedStockMovements } from '../../lib/stockAdvancedService';
import { AlertTriangle, Plus, RefreshCw, Download, X, Package, FileText } from 'lucide-react';

const StockDamaged = () => {
  const { menu, addNotification, currentUser } = useStore();
  const [damagedMovements, setDamagedMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDamaged = useCallback(async () => {
    setLoading(true);
    const data = await fetchDamagedStockMovements(100);
    setDamagedMovements(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadDamaged(); }, [loadDamaged]);

  const handleRegister = async () => {
    if (!selectedProduct) { addNotification('error', 'Seleccione um produto'); return; }
    if (quantity < 1) { addNotification('error', 'Quantidade deve ser maior que zero'); return; }
    if (!reason.trim()) { addNotification('error', 'Indique o motivo do dano'); return; }

    const product = menu.find((p: any) => p.id === selectedProduct);
    if (!product) { addNotification('error', 'Produto não encontrado'); return; }

    const currentStock = (product as any).stock_quantity || 0;
    if (quantity > currentStock) {
      addNotification('error', `Stock insuficiente. Disponível: ${currentStock}`);
      return;
    }

    setSaving(true);
    const ok = await registerDamagedStock(
      selectedProduct,
      product.name,
      quantity,
      reason.trim(),
      currentUser?.name
    );
    setSaving(false);

    if (ok) {
      addNotification('success', `${quantity} un. danificadas de ${product.name} registadas`);
      setShowModal(false);
      setSelectedProduct('');
      setQuantity(1);
      setReason('');
      loadDamaged();
    } else {
      addNotification('error', 'Erro ao registar stock danificado');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Produto', 'Quantidade', 'Stock Anterior', 'Stock Novo', 'Motivo', 'Utilizador'];
    const rows = damagedMovements.map(m => {
      const product = menu.find((p: any) => p.id === m.product_id);
      return [
        m.timestamp ? new Date(m.timestamp).toLocaleString('pt-AO') : '—',
        product?.name || m.product_id?.substring(0, 8) || '—',
        Math.abs(m.quantity),
        m.previous_quantity ?? '—',
        m.new_quantity ?? '—',
        (m.notes || '').replace(/,/g, ';'),
        m.user_id || '—',
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-danificado-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    if (damagedMovements.length === 0) {
      addNotification('error', 'Sem dados para exportar');
      return;
    }
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
      let y = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatorio de Stock Danificado', 105, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tasca do Vereda - Emitido em ${now}`, 105, y, { align: 'center' });
      y += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de itens danificados: ${totalDamaged}`, 14, y);
      y += 4;
      doc.text(`Produtos afectados: ${uniqueProducts}  |  Registos: ${damagedMovements.length}`, 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 14, y);
      doc.text('Produto', 55, y);
      doc.text('Qtd', 125, y, { align: 'right' });
      doc.text('Anterior', 145, y, { align: 'right' });
      doc.text('Novo', 165, y, { align: 'right' });
      doc.text('Motivo', 175, y);
      y += 5;
      doc.setFont('helvetica', 'normal');

      damagedMovements.forEach(m => {
        if (y > 270) { doc.addPage(); y = 20; }
        const product = menu.find((p: any) => p.id === m.product_id);
        const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleDateString('pt-AO') : '—';
        const productName = (product?.name || m.product_id?.substring(0, 8) || '—').substring(0, 28);
        const reasonText = (m.notes || '—').substring(0, 35);

        doc.text(dateStr.substring(0, 18), 14, y);
        doc.text(productName, 55, y);
        doc.text(`${Math.abs(m.quantity)}`, 125, y, { align: 'right' });
        doc.text(`${m.previous_quantity ?? '—'}`, 145, y, { align: 'right' });
        doc.text(`${m.new_quantity ?? '—'}`, 165, y, { align: 'right' });
        doc.text(reasonText, 175, y);
        y += 5;
      });

      y = Math.max(y + 10, 270);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Relatorio de Stock Danificado - Uso Interno - REST IA OS v1.1.2`, 105, y, { align: 'center' });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-danificado-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addNotification('success', 'PDF gerado com sucesso');
    } catch (e) {
      console.error('[STOCK DAMAGED] PDF export error:', e);
      addNotification('error', 'Erro ao gerar PDF');
    }
  };

  const totalDamaged = damagedMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  const uniqueProducts = new Set(damagedMovements.map(m => m.product_id)).size;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-400" />
          Stock Danificado ({damagedMovements.length})
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={loadDamaged} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Actualizar">
            <RefreshCw size={16} className="text-slate-400" />
          </button>
          <button onClick={handleExportCSV} disabled={damagedMovements.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 disabled:opacity-30">
            <Download size={16} /> CSV
          </button>
          <button onClick={handleExportPDF} disabled={damagedMovements.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/20 disabled:opacity-30">
            <FileText size={16} /> PDF
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold text-sm hover:bg-red-500/30 border border-red-500/20">
            <Plus size={16} /> Registar Danificado
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass-panel rounded-xl p-4 border border-red-500/10">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Itens Danificados</p>
          <p className="text-2xl font-bold text-red-400">{totalDamaged}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-white/5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Produtos Afectados</p>
          <p className="text-2xl font-bold text-white">{uniqueProducts}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-white/5 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Registos Totais</p>
          <p className="text-2xl font-bold text-white">{damagedMovements.length}</p>
        </div>
      </div>

      {/* List */}
      <div className="glass-panel rounded-xl border border-white/5 p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : damagedMovements.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-sm">Sem registos de stock danificado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="pb-2 pr-4">Data/Hora</th>
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4 text-center">Qtd Danificada</th>
                  <th className="pb-2 pr-4 text-center">Stock Anterior</th>
                  <th className="pb-2 pr-4 text-center">Stock Novo</th>
                  <th className="pb-2 pr-4">Motivo</th>
                  <th className="pb-2">Utilizador</th>
                </tr>
              </thead>
              <tbody>
                {damagedMovements.map((m, i) => {
                  const product = menu.find((p: any) => p.id === m.product_id);
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 pr-4 text-slate-300 text-xs">
                        {m.timestamp ? new Date(m.timestamp).toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' }) : '—'}
                      </td>
                      <td className="py-2 pr-4 font-medium text-white text-xs">
                        {product?.name || m.product_id?.substring(0, 8) || '—'}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span className="text-red-400 font-bold">-{Math.abs(m.quantity)}</span>
                      </td>
                      <td className="py-2 pr-4 text-center text-slate-400 text-xs">{m.previous_quantity ?? '—'}</td>
                      <td className="py-2 pr-4 text-center text-slate-300 text-xs">{m.new_quantity ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-300 text-xs max-w-64">{m.notes || '—'}</td>
                      <td className="py-2 text-slate-400 text-xs">{m.user_id || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registar Danificado */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                Registar Stock Danificado
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-700 rounded-lg" aria-label="Fechar">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">Produto</label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" title="Seleccionar produto">
                  <option value="">Seleccione...</option>
                  {menu.filter((p: any) => (p.stock_quantity || 0) > 0).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-2">Quantidade Danificada</label>
                <input type="number" min="1" value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  title="Quantidade danificada" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-2">Motivo do Dano</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder="Ex: 3 garrafas vieram danificadas da embalagem"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  title="Motivo do dano" />
              </div>
              {selectedProduct && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <Package size={16} className="text-red-400" />
                  <p className="text-xs text-red-300">
                    Serão removidas {quantity} un. do stock do produto seleccionado.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20">
                  Cancelar
                </button>
                <button onClick={handleRegister} disabled={saving}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/30 border border-red-500/20 disabled:opacity-50">
                  {saving ? 'A registar...' : 'Registar Dano'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDamaged;
