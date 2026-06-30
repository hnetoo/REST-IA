import { useState, useEffect, useCallback } from 'react';
import { fetchAllStockMovements, fetchMovementsByDateRange } from '../../lib/stockAdvancedService';
import { useStore } from '../../store/useStore';
import { jsPDF } from 'jspdf';
import { ArrowDown, ArrowUp, RefreshCw, Download, Filter, FileText } from 'lucide-react';

const movementTypeConfig: Record<string, { label: string; color: string; icon: 'in' | 'out' }> = {
  ENTRADA: { label: 'Entrada', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: 'in' },
  SAIDA: { label: 'Saída', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: 'out' },
  AJUSTE: { label: 'Ajuste', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: 'out' },
  VENDA: { label: 'Venda', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: 'out' },
  DEVOLUCAO: { label: 'Devolução', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: 'in' },
  DANIFICADO: { label: 'Danificado', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: 'out' },
};

const StockMovements = () => {
  const { menu } = useStore();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const loadMovements = useCallback(async () => {
    setLoading(true);
    let data: any[];
    if (dateFrom && dateTo) {
      data = await fetchMovementsByDateRange(dateFrom, dateTo);
    } else {
      data = await fetchAllStockMovements(pageSize, page * pageSize);
    }
    setMovements(data);
    setLoading(false);
  }, [dateFrom, dateTo, page]);

  useEffect(() => { loadMovements(); }, [loadMovements]);

  const filtered = movements.filter(m => {
    if (filterType !== 'all' && m.movement_type !== filterType) return false;
    if (filterProduct !== 'all' && m.product_id !== filterProduct) return false;
    return true;
  });

  const handleExportPDF = () => {
    if (filtered.length === 0) {
      return;
    }
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
      let y = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatorio de Movimentos de Stock', 105, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tasca do Vereda - Emitido em ${now}`, 105, y, { align: 'center' });
      y += 8;
      doc.text(`Total de movimentos: ${filtered.length}`, 105, y, { align: 'center' });
      y += 10;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Data/Hora', 14, y);
      doc.text('Produto', 50, y);
      doc.text('Tipo', 110, y);
      doc.text('Qtd', 135, y, { align: 'right' });
      doc.text('Anterior', 150, y, { align: 'right' });
      doc.text('Nova', 170, y, { align: 'right' });
      doc.text('Utilizador', 185, y);
      y += 5;
      doc.setFont('helvetica', 'normal');

      filtered.forEach(m => {
        if (y > 270) { doc.addPage(); y = 20; }
        const product = menu.find((p: any) => p.id === m.product_id);
        const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' }) : '—';
        const productName = (product?.name || m.product_id?.substring(0, 8) || '—').substring(0, 25);
        const userType = (m.movement_type || '—').substring(0, 10);
        const userStr = (m.user_id || '—').substring(0, 15);

        doc.text(dateStr.substring(0, 20), 14, y);
        doc.text(productName, 50, y);
        doc.text(userType, 110, y);
        doc.text(`${m.quantity > 0 ? '+' : ''}${m.quantity}`, 135, y, { align: 'right' });
        doc.text(`${m.previous_quantity ?? '—'}`, 150, y, { align: 'right' });
        doc.text(`${m.new_quantity ?? '—'}`, 170, y, { align: 'right' });
        doc.text(userStr, 185, y);
        y += 5;
      });

      y = Math.max(y + 10, 270);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Relatorio de Movimentos de Stock - Uso Interno - REST IA OS`, 105, y, { align: 'center' });

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimentos-stock-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // silent
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Qtd. Anterior', 'Qtd. Nova', 'Referência', 'Utilizador', 'Notas'];
    const rows = filtered.map(m => [
      new Date(m.timestamp).toLocaleString('pt-AO'),
      m.product_id?.substring(0, 8) || '—',
      m.movement_type,
      m.quantity,
      m.previous_quantity,
      m.new_quantity,
      m.reference_id || '—',
      m.user_id || '—',
      (m.notes || '').replace(/,/g, ';'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentos-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="glass-panel rounded-xl border border-white/5 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Tipo</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} title="Filtrar por tipo de movimento"
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
              <option value="all">Todos</option>
              {Object.entries(movementTypeConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Produto</label>
            <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} title="Filtrar por produto"
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm max-w-48">
              <option value="all">Todos</option>
              {menu.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">De</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Data inicial"
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Até</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Data final"
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
          </div>
          <button onClick={loadMovements}
            className="px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm flex items-center gap-2 hover:brightness-110">
            <Filter size={16} /> Filtrar
          </button>
          <button onClick={handleExportCSV}
            className="px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-white/20">
            <Download size={16} /> CSV
          </button>
          <button onClick={handleExportPDF} disabled={filtered.length === 0}
            className="px-4 py-2 bg-white/10 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-white/20 disabled:opacity-30">
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-panel rounded-xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            Movimentos de Stock ({filtered.length})
          </h3>
          <button onClick={loadMovements} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Actualizar movimentos">
            <RefreshCw size={16} className="text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500 text-sm py-12 text-center">Sem movimentos registados.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                    <th className="pb-2 pr-4">Data/Hora</th>
                    <th className="pb-2 pr-4">Produto</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4 text-center">Qtd</th>
                    <th className="pb-2 pr-4 text-center">Anterior</th>
                    <th className="pb-2 pr-4 text-center">Nova</th>
                    <th className="pb-2 pr-4">Referência</th>
                    <th className="pb-2 pr-4">Utilizador</th>
                    <th className="pb-2">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const cfg = movementTypeConfig[m.movement_type] || { label: m.movement_type, color: 'text-slate-400 bg-slate-500/10', icon: 'out' as const };
                    const product = menu.find((p: any) => p.id === m.product_id);
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 pr-4 text-slate-300 text-xs">
                          {m.timestamp ? new Date(m.timestamp).toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' }) : '—'}
                        </td>
                        <td className="py-2 pr-4 font-medium text-white text-xs">
                          {product?.name || m.product_id?.substring(0, 8) || '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${cfg.color} flex items-center gap-1 w-fit`}>
                            {cfg.icon === 'in' ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-center font-bold text-white">{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                        <td className="py-2 pr-4 text-center text-slate-400">{m.previous_quantity ?? '—'}</td>
                        <td className="py-2 pr-4 text-center text-slate-300">{m.new_quantity ?? '—'}</td>
                        <td className="py-2 pr-4 text-slate-400 text-xs">{m.reference_id?.substring(0, 12) || '—'}</td>
                        <td className="py-2 pr-4 text-slate-400 text-xs">{m.user_id || '—'}</td>
                        <td className="py-2 text-slate-400 text-xs max-w-48 truncate">{m.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!dateFrom && !dateTo && (
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-sm disabled:opacity-30 hover:bg-white/20">
                  ← Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-400">Página {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={movements.length < pageSize}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-sm disabled:opacity-30 hover:bg-white/20">
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
