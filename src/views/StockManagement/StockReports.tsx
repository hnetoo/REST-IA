import { useState, useMemo, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { useStockAdvanced } from '../../hooks/useStockAdvanced';
import { fetchDamagedStockMovements } from '../../lib/stockAdvancedService';
import { useStore } from '../../store/useStore';
import { FileBarChart, DollarSign, TrendingUp, Package, AlertTriangle, Clock, Layers } from 'lucide-react';

const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', {
  style: 'currency', currency: 'AOA', maximumFractionDigits: 0
}).format(val);

type ReportType = 'value' | 'abc' | 'rotation' | 'movements' | 'divergences' | 'stopped' | 'expiry' | 'damaged';

const reports: { id: ReportType; label: string; icon: any; desc: string }[] = [
  { id: 'value', label: 'Valor de Stock', icon: DollarSign, desc: 'Valor por custo CMP vs preço de venda vs margem' },
  { id: 'abc', label: 'Curva ABC', icon: Layers, desc: 'Classificação por valor de stock' },
  { id: 'rotation', label: 'Rotação de Stock', icon: TrendingUp, desc: 'Produtos mais vendidos e rotação' },
  { id: 'movements', label: 'Movimentos', icon: Package, desc: 'Resumo de entradas e saídas' },
  { id: 'divergences', label: 'Divergências', icon: AlertTriangle, desc: 'Divergências de inventário físico' },
  { id: 'stopped', label: 'Produtos Parados', icon: Clock, desc: 'Sem movimento no período' },
  { id: 'expiry', label: 'Validades', icon: AlertTriangle, desc: 'Produtos próximos de expirar' },
  { id: 'damaged', label: 'Stock Danificado', icon: AlertTriangle, desc: 'Registos de itens danificados com motivos' },
];

const StockReports = () => {
  const { productsWithStockInfo, inventories, stats } = useStockAdvanced();
  const { menu } = useStore();
  const [selected, setSelected] = useState<ReportType>('value');
  const [damagedData, setDamagedData] = useState<any[]>([]);

  const loadDamaged = useCallback(async () => {
    const data = await fetchDamagedStockMovements(200);
    setDamagedData(data);
  }, []);

  useEffect(() => { loadDamaged(); }, [loadDamaged]);

  const handlePrint = () => {
    const now = new Date().toLocaleString('pt-AO', { timeZone: 'Africa/Luanda' });
    const report = reports.find(r => r.id === selected);
    const doc = new jsPDF();
    let y = 20;

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${report?.label || 'Relatório'}`, 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tasca do Vereda • Emitido em ${now}`, 105, y, { align: 'center' });
    y += 12;

    if (selected === 'value') {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO', 14, y); y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Valor Custo (CMP): ${formatKz(stats.totalValueCost)}`, 14, y); y += 6;
      doc.text(`Valor Venda: ${formatKz(stats.totalValueSale)}`, 14, y); y += 6;
      doc.text(`Lucro Potencial: ${formatKz(stats.potentialProfit)}`, 14, y); y += 6;
      doc.text(`Total Produtos: ${stats.totalProducts}`, 14, y); y += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Produto', 14, y);
      doc.text('Stock', 100, y, { align: 'right' });
      doc.text('CMP', 130, y, { align: 'right' });
      doc.text('V.Custo', 160, y, { align: 'right' });
      doc.text('V.Venda', 190, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'normal');
      productsWithStockInfo.forEach(p => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${p.product_name}`.substring(0, 40), 14, y);
        doc.text(`${p.stock_quantity}`, 100, y, { align: 'right' });
        doc.text(`${formatKz(p.cmp)}`, 130, y, { align: 'right' });
        doc.text(`${formatKz(p.stock_value_cost)}`, 160, y, { align: 'right' });
        doc.text(`${formatKz(p.stock_value_sale)}`, 190, y, { align: 'right' });
        y += 5;
      });
    } else if (selected === 'abc') {
      ['A', 'B', 'C'].forEach(cls => {
        const items = productsWithStockInfo.filter(p => p.abc_class === cls);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Classe ${cls} (${items.length} produtos)`, 14, y); y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        items.forEach(p => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${p.product_name}`.substring(0, 50), 14, y);
          doc.text(`${formatKz(p.stock_value_sale)}`, 160, y, { align: 'right' });
          doc.text(cls, 190, y, { align: 'right' });
          y += 5;
        });
        y += 4;
      });
    } else if (selected === 'rotation') {
      const sorted = [...productsWithStockInfo].filter(p => p.avg_daily_consumption > 0).sort((a, b) => b.avg_daily_consumption - a.avg_daily_consumption);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 14, y);
      doc.text('Produto', 25, y);
      doc.text('Cons/Dia', 110, y, { align: 'right' });
      doc.text('Stock', 140, y, { align: 'right' });
      doc.text('Dias', 165, y, { align: 'right' });
      doc.text('Repor', 190, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'normal');
      sorted.forEach((p, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${i + 1}`, 14, y);
        doc.text(`${p.product_name}`.substring(0, 40), 25, y);
        doc.text(`${p.avg_daily_consumption.toFixed(1)}`, 110, y, { align: 'right' });
        doc.text(`${p.stock_quantity}`, 140, y, { align: 'right' });
        doc.text(`${p.days_until_empty !== null ? p.days_until_empty + 'd' : '∞'}`, 165, y, { align: 'right' });
        doc.text(`${p.suggested_reorder > 0 ? '+' + p.suggested_reorder : '—'}`, 190, y, { align: 'right' });
        y += 5;
      });
    } else if (selected === 'movements') {
      doc.setFontSize(11);
      doc.text('Para relatorio detalhado de movimentos, use a tab "Movimentos"', 14, y);
      y += 6;
      doc.text('com filtros e exportacao CSV.', 14, y);
    } else if (selected === 'divergences') {
      const allDivergences: any[] = [];
      inventories.filter(inv => inv.status === 'RECONCILED').forEach(inv => {
        (inv.items || []).forEach((item: any) => {
          if (item.counted_quantity !== null && item.counted_quantity - item.system_quantity !== 0) {
            allDivergences.push({ ...item, inventory_date: inv.inventory_date });
          }
        });
      });
      if (allDivergences.length === 0) {
        doc.text('Sem divergencias registadas.', 14, y);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text('Data', 14, y);
        doc.text('Produto', 50, y);
        doc.text('Sistema', 130, y, { align: 'right' });
        doc.text('Contado', 160, y, { align: 'right' });
        doc.text('Dif.', 190, y, { align: 'right' });
        y += 5;
        doc.setFont('helvetica', 'normal');
        allDivergences.forEach(d => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${new Date(d.inventory_date).toLocaleDateString('pt-AO')}`, 14, y);
          doc.text(`${d.product_name}`.substring(0, 30), 50, y);
          doc.text(`${d.system_quantity}`, 130, y, { align: 'right' });
          doc.text(`${d.counted_quantity}`, 160, y, { align: 'right' });
          doc.text(`${d.counted_quantity - d.system_quantity > 0 ? '+' : ''}${d.counted_quantity - d.system_quantity}`, 190, y, { align: 'right' });
          y += 5;
        });
      }
    } else if (selected === 'stopped') {
      const stopped = productsWithStockInfo.filter(p => p.avg_daily_consumption === 0);
      if (stopped.length === 0) {
        doc.text('Sem produtos parados.', 14, y);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text('Produto', 14, y);
        doc.text('Stock', 120, y, { align: 'right' });
        doc.text('Valor Custo', 190, y, { align: 'right' });
        y += 5;
        doc.setFont('helvetica', 'normal');
        stopped.forEach(p => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`${p.product_name}`.substring(0, 50), 14, y);
          doc.text(`${p.stock_quantity}`, 120, y, { align: 'right' });
          doc.text(`${formatKz(p.stock_value_cost)}`, 190, y, { align: 'right' });
          y += 5;
        });
      }
    } else if (selected === 'expiry') {
      doc.setFontSize(11);
      doc.text('Para gestao de validades, registe lotes e datas de validade', 14, y);
      y += 6;
      doc.text('nas compras a fornecedores.', 14, y);
    } else if (selected === 'damaged') {
      if (damagedData.length === 0) {
        doc.text('Sem registos de stock danificado.', 14, y);
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total de itens danificados: ${damagedData.reduce((s, m) => s + Math.abs(m.quantity), 0)}`, 14, y); y += 8;
        doc.setFontSize(9);
        doc.text('Data', 14, y);
        doc.text('Produto', 50, y);
        doc.text('Qtd', 130, y, { align: 'right' });
        doc.text('Motivo', 145, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        damagedData.forEach(m => {
          if (y > 270) { doc.addPage(); y = 20; }
          const product = menu.find((p: any) => p.id === m.product_id);
          doc.text(`${m.timestamp ? new Date(m.timestamp).toLocaleDateString('pt-AO') : '—'}`.substring(0, 18), 14, y);
          doc.text(`${product?.name || '—'}`.substring(0, 30), 50, y);
          doc.text(`${Math.abs(m.quantity)}`, 130, y, { align: 'right' });
          doc.text(`${(m.notes || '—').substring(0, 40)}`, 145, y);
          y += 5;
        });
      }
    }

    // Rodapé
    y = Math.max(y + 10, 270);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatorio de Stock • Uso Interno • REST IA OS v1.1.2`, 105, y, { align: 'center' });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-stock-${selected}-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileBarChart size={20} className="text-primary" />
          Relatórios Avançados
        </h3>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-bold text-sm hover:brightness-110">
          Gerar PDF
        </button>
      </div>

      {/* Grid de relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <button key={r.id} onClick={() => setSelected(r.id)}
              className={`text-left p-5 rounded-xl border transition-all ${
                selected === r.id
                  ? 'bg-primary/10 border-primary/40 shadow-glow'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selected === r.id ? 'bg-primary/20' : 'bg-white/10'
                }`}>
                  <Icon size={20} className={selected === r.id ? 'text-primary' : 'text-slate-400'} />
                </div>
                <p className={`font-bold text-sm ${selected === r.id ? 'text-primary' : 'text-white'}`}>{r.label}</p>
              </div>
              <p className="text-xs text-slate-400">{r.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Preview do relatório seleccionado */}
      <div className="glass-panel rounded-xl border border-white/5 p-6">
        {selected === 'value' && (
          <div className="overflow-x-auto">
            <h4 className="text-white font-bold mb-4">Valor de Stock por Produto</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase border-b border-white/10">
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4 text-center">Stock</th>
                  <th className="pb-2 pr-4 text-right">CMP</th>
                  <th className="pb-2 pr-4 text-right">Valor Custo</th>
                  <th className="pb-2 pr-4 text-right">Valor Venda</th>
                  <th className="pb-2 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {productsWithStockInfo.slice(0, 20).map(p => (
                  <tr key={p.product_id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white text-xs">{p.product_name}</td>
                    <td className="py-2 pr-4 text-center text-slate-300 text-xs">{p.stock_quantity}</td>
                    <td className="py-2 pr-4 text-right text-slate-300 text-xs">{formatKz(p.cmp)}</td>
                    <td className="py-2 pr-4 text-right text-slate-300 text-xs">{formatKz(p.stock_value_cost)}</td>
                    <td className="py-2 pr-4 text-right text-slate-300 text-xs">{formatKz(p.stock_value_sale)}</td>
                    <td className="py-2 text-right text-green-400 text-xs font-bold">{formatKz(p.potential_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected === 'abc' && (
          <div>
            <h4 className="text-white font-bold mb-4">Classificação ABC</h4>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.classA.length}</p>
                <p className="text-xs text-slate-400">Classe A</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.classB.length}</p>
                <p className="text-xs text-slate-400">Classe B</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/20 text-center">
                <p className="text-2xl font-bold text-slate-400">{stats.classC.length}</p>
                <p className="text-xs text-slate-400">Classe C</p>
              </div>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {productsWithStockInfo.map(p => (
                <div key={p.product_id} className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-sm text-white">{p.product_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{formatKz(p.stock_value_sale)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      p.abc_class === 'A' ? 'bg-green-500/20 text-green-400' :
                      p.abc_class === 'B' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>{p.abc_class}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected === 'rotation' && (
          <div className="overflow-x-auto">
            <h4 className="text-white font-bold mb-4">Rotação de Stock (30 dias)</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase border-b border-white/10">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4 text-center">Consumo/Dia</th>
                  <th className="pb-2 pr-4 text-center">Stock</th>
                  <th className="pb-2 pr-4 text-center">Dias Restantes</th>
                  <th className="pb-2 text-center">Reposição</th>
                </tr>
              </thead>
              <tbody>
                {[...productsWithStockInfo].filter(p => p.avg_daily_consumption > 0)
                  .sort((a, b) => b.avg_daily_consumption - a.avg_daily_consumption)
                  .slice(0, 20)
                  .map((p, i) => (
                  <tr key={p.product_id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-slate-400 text-xs">#{i + 1}</td>
                    <td className="py-2 pr-4 text-white text-xs">{p.product_name}</td>
                    <td className="py-2 pr-4 text-center text-slate-300 text-xs">{p.avg_daily_consumption.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-center text-slate-300 text-xs">{p.stock_quantity}</td>
                    <td className="py-2 pr-4 text-center text-xs">
                      <span className={p.days_until_empty !== null && p.days_until_empty <= 3 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {p.days_until_empty !== null ? `${p.days_until_empty}d` : '∞'}
                      </span>
                    </td>
                    <td className="py-2 text-center text-primary text-xs font-bold">{p.suggested_reorder > 0 ? `+${p.suggested_reorder}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected === 'movements' && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-sm">Use a tab "Movimentos" para relatório detalhado com filtros e exportação CSV.</p>
          </div>
        )}

        {selected === 'divergences' && (
          <div className="text-center py-12">
            <AlertTriangle size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-sm">
              {inventories.filter(i => i.status === 'RECONCILED').length} inventários reconciliados.
              As divergências aparecem após reconciliação de inventário físico.
            </p>
          </div>
        )}

        {selected === 'stopped' && (
          <div className="overflow-x-auto">
            <h4 className="text-white font-bold mb-4">Produtos Parados (sem vendas em 30 dias)</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase border-b border-white/10">
                  <th className="pb-2 pr-4">Produto</th>
                  <th className="pb-2 pr-4 text-center">Stock</th>
                  <th className="pb-2 pr-4 text-right">Valor Parado</th>
                </tr>
              </thead>
              <tbody>
                {productsWithStockInfo.filter(p => p.avg_daily_consumption === 0).slice(0, 20).map(p => (
                  <tr key={p.product_id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white text-xs">{p.product_name}</td>
                    <td className="py-2 pr-4 text-center text-slate-300 text-xs">{p.stock_quantity}</td>
                    <td className="py-2 pr-4 text-right text-red-400 text-xs">{formatKz(p.stock_value_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected === 'expiry' && (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-sm">Registe lotes e validades nas compras para activar este relatório.</p>
          </div>
        )}

        {selected === 'damaged' && (
          <div>
            <h4 className="text-white font-bold mb-4">Stock Danificado ({damagedData.length} registos)</h4>
            {damagedData.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 text-sm">Sem registos de stock danificado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 text-xs uppercase border-b border-white/10">
                      <th className="pb-2 pr-4">Data</th>
                      <th className="pb-2 pr-4">Produto</th>
                      <th className="pb-2 pr-4 text-center">Qtd</th>
                      <th className="pb-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {damagedData.map((m, i) => {
                      const product = menu.find((p: any) => p.id === m.product_id);
                      return (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-2 pr-4 text-slate-300 text-xs">{m.timestamp ? new Date(m.timestamp).toLocaleDateString('pt-AO') : '—'}</td>
                          <td className="py-2 pr-4 text-white text-xs">{product?.name || '—'}</td>
                          <td className="py-2 pr-4 text-center text-red-400 font-bold text-xs">-{Math.abs(m.quantity)}</td>
                          <td className="py-2 text-slate-300 text-xs">{m.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockReports;
