import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase_standalone';
import { calculateDataContabil } from '../lib/dateUtils';
import { Printer, AlertTriangle, FileText, X } from 'lucide-react';

interface ShiftRecord {
  id: string;
  shift_type: 'MORNING' | 'AFTERNOON';
  opened_by: string;
  closed_by?: string;
  opening_amount: number;
  closing_amount?: number;
  expected_amount?: number;
  status: 'OPEN' | 'CLOSED';
}

interface ProductSold {
  name: string;
  quantity: number;
  total: number;
}

export const DailyCloseReport: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [shiftSales, setShiftSales] = useState<Record<string, number>>({});
  const [shiftBreakdown, setShiftBreakdown] = useState<Record<string, Record<string, { count: number; total: number }>>>({});
  const [shiftProducts, setShiftProducts] = useState<Record<string, ProductSold[]>>({});
  const [loading, setLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const dataContabil = calculateDataContabil(new Date());

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchProductsSold = async (orderIds: string[]) => {
    if (orderIds.length === 0) return [];
    // Tentar 1: tabela order_items (com produtos nomeados)
    const { data: oiData, error: oiError } = await supabase
      .from('order_items')
      .select('quantity, total_price, products!fk_order_items_product(name)')
      .in('order_id', orderIds);
    if (!oiError && oiData && oiData.length > 0) {
      const agg: Record<string, ProductSold> = {};
      oiData.forEach((item: any) => {
        const name = item.products?.name || 'Produto desconhecido';
        if (!agg[name]) agg[name] = { name, quantity: 0, total: 0 };
        agg[name].quantity += Number(item.quantity) || 0;
        agg[name].total += Number(item.total_price) || 0;
      });
      return Object.values(agg).sort((a, b) => b.total - a.total);
    }
    // Fallback 2: campo JSONB items da tabela orders (vendas antigas)
    const { data, error } = await supabase
      .from('orders')
      .select('id, items')
      .in('id', orderIds);
    if (error) {
      console.error('[DailyClose] Erro ao buscar produtos:', error);
      return [];
    }
    const agg: Record<string, ProductSold> = {};
    (data || []).forEach((order: any) => {
      const items = order.items || [];
      items.forEach((item: any) => {
        const name = item.name || item.dish?.name || 'Produto desconhecido';
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || Number(item.unit_price) || 0;
        if (!agg[name]) agg[name] = { name, quantity: 0, total: 0 };
        agg[name].quantity += qty;
        agg[name].total += qty * price;
      });
    });
    return Object.values(agg).sort((a, b) => b.total - a.total);
  };

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_shift_records')
        .select('*')
        .eq('data_contabil', dataContabil)
        .order('opened_at', { ascending: true });

      if (error) {
        console.error('[DailyClose] Erro:', error);
        return;
      }

      const typed = (data || []) as ShiftRecord[];
      setShifts(typed);

      const salesMap: Record<string, number> = {};
      const breakdownMap: Record<string, Record<string, { count: number; total: number }>> = {};
      const productsMap: Record<string, ProductSold[]> = {};

      for (const shift of typed) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, payment_method')
          .eq('shift_id', shift.id)
          .in('status', ['closed', 'paid']);

        const total = (orders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        salesMap[shift.id] = total;

        // Breakdown por pagamento
        const breakdown: Record<string, { count: number; total: number }> = {};
        (orders || []).forEach((o: any) => {
          const m = o.payment_method || 'OUTROS';
          if (!breakdown[m]) breakdown[m] = { count: 0, total: 0 };
          breakdown[m].count++;
          breakdown[m].total += Number(o.total_amount) || 0;
        });
        breakdownMap[shift.id] = breakdown;

        // Produtos vendidos
        const orderIds = (orders || []).map((o: any) => o.id);
        productsMap[shift.id] = await fetchProductsSold(orderIds);
      }

      setShiftSales(salesMap);
      setShiftBreakdown(breakdownMap);
      setShiftProducts(productsMap);
    } catch (e) {
      console.error('[DailyClose] Erro:', e);
    }
  };

  const generateDailyReportHtml = (): string => {
    const morning = shifts.find(s => s.shift_type === 'MORNING');
    const afternoon = shifts.find(s => s.shift_type === 'AFTERNOON');
    const morningSales = morning ? (shiftSales[morning.id] || 0) : 0;
    const afternoonSales = afternoon ? (shiftSales[afternoon.id] || 0) : 0;
    const total = morningSales + afternoonSales;

    const renderShiftSection = (shift: ShiftRecord | undefined, sales: number) => {
      if (!shift) return '<p style="margin: 2px 0; font-size: 11px;"><em>Sem turno registado</em></p>';
      const breakdown = shiftBreakdown[shift.id] || {};
      const products = shiftProducts[shift.id] || [];
      const bdEntries = Object.entries(breakdown);
      return `
        <p style="margin: 4px 0; font-size: 11px;"><strong>TURNO DA ${shift.shift_type === 'MORNING' ? 'MANHÃ' : 'TARDE'}</strong></p>
        <p style="margin: 2px 0; font-size: 11px;">Operador: ${shift.opened_by}</p>
        <p style="margin: 2px 0; font-size: 11px;">Status: ${shift.status}</p>
        ${bdEntries.length > 0 ? `
        <p style="margin: 2px 0; font-size: 11px;"><strong>Pagamentos:</strong></p>
        ${bdEntries.map(([m, d]) => `
          <p style="margin: 2px 0; font-size: 11px;">${m}: <strong>${d.total.toLocaleString('pt-AO')} Kz</strong> (${d.count}x)</p>
        `).join('')}
        ` : ''}
        ${products.length > 0 ? `
        <p style="margin: 2px 0; font-size: 11px;"><strong>Produtos:</strong></p>
        ${products.map(p => `
          <p style="margin: 2px 0; font-size: 11px;">${p.name}: ${p.quantity}x = ${p.total.toLocaleString('pt-AO')} Kz</p>
        `).join('')}
        ` : ''}
        <p style="margin: 2px 0; font-size: 11px;"><strong>Total:</strong> ${sales.toLocaleString('pt-AO')} Kz</p>
        <hr style="border: 1px dashed #ccc; margin: 8px 0;">
      `;
    };

    return `
      <html>
        <head><title>Relatório de Fecho do Dia</title></head>
        <body style="font-family: monospace; padding: 20px; max-width: 320px; margin: 0 auto; color: #000; background: #fff;">
          <h2 style="text-align: center; margin-bottom: 2px; font-size: 16px;">TASCA DO VEREDA</h2>
          <h3 style="text-align: center; margin-top: 0; font-size: 13px;">FECHO DO DIA</h3>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 2px 0; font-size: 11px;"><strong>Data:</strong> ${dataContabil}</p>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          ${renderShiftSection(morning, morningSales)}
          ${renderShiftSection(afternoon, afternoonSales)}
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 4px 0; font-size: 11px;"><strong>TOTAL DO DIA</strong></p>
          <p style="margin: 2px 0; font-size: 14px; font-weight: bold;">${total.toLocaleString('pt-AO')} Kz</p>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="text-align: center; margin-top: 16px; font-size: 11px;">__________________________<br>Assinatura Admin</p>
          <p style="text-align: center; font-size: 9px; margin-top: 12px;">Tasca do Vereda POS</p>
        </body>
      </html>
    `;
  };

  const printHtml = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    } else {
      document.body.removeChild(iframe);
    }
  };

  const handlePreviewDailyReport = () => {
    const html = generateDailyReportHtml();
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  };

  const allClosed = shifts.length > 0 && shifts.every(s => s.status === 'CLOSED');
  const morning = shifts.find(s => s.shift_type === 'MORNING');
  const afternoon = shifts.find(s => s.shift_type === 'AFTERNOON');
  const morningSales = morning ? (shiftSales[morning.id] || 0) : 0;
  const afternoonSales = afternoon ? (shiftSales[afternoon.id] || 0) : 0;
  const total = morningSales + afternoonSales;

  const renderShiftCard = (shift: ShiftRecord | undefined, sales: number, colorClass: string) => {
    if (!shift) return null;
    const breakdown = shiftBreakdown[shift.id] || {};
    const products = shiftProducts[shift.id] || [];
    return (
      <div className={`p-3 rounded-lg border ${colorClass}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">Turno da {shift.shift_type === 'MORNING' ? 'Manhã' : 'Tarde'}</span>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${shift.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {shift.status === 'CLOSED' ? 'FECHADO' : 'ABERTO'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{shift.opened_by}</p>
        <p className="text-xs text-white font-bold mt-1">{sales.toLocaleString('pt-AO')} Kz</p>
        {Object.entries(breakdown).length > 0 && (
          <div className="mt-2 space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Pagamentos</p>
            {Object.entries(breakdown).map(([m, d]) => (
              <div key={m} className="flex justify-between text-[10px] text-slate-400">
                <span>{m}:</span>
                <span className="text-white font-bold">{d.total.toLocaleString('pt-AO')} Kz ({d.count}x)</span>
              </div>
            ))}
          </div>
        )}
        {products.length > 0 && (
          <div className="mt-2 space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Produtos Vendidos</p>
            {products.map(p => (
              <div key={p.name} className="flex justify-between text-[10px] text-slate-400">
                <span>{p.name}:</span>
                <span className="text-white font-bold">{p.quantity}x = {p.total.toLocaleString('pt-AO')} Kz</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fecho do Dia — {dataContabil}</h3>

      {shifts.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhum turno registado hoje.</p>
      ) : (
        <div className="space-y-2">
          {renderShiftCard(morning, morningSales, 'border-amber-500/20 bg-amber-500/5')}
          {renderShiftCard(afternoon, afternoonSales, 'border-orange-500/20 bg-orange-500/5')}

          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">Total do Dia</span>
              <span className="text-sm font-black text-primary">{total.toLocaleString('pt-AO')} Kz</span>
            </div>
          </div>

          {!allClosed && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-500" />
              <span className="text-[10px] text-amber-400">Todos os turnos devem estar fechados para o fecho do dia.</span>
            </div>
          )}

          <button
            onClick={handlePreviewDailyReport}
            disabled={!allClosed}
            className="w-full py-3 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FileText size={14} />
            {allClosed ? 'Ver Relatório do Dia' : 'Aguardar fecho dos turnos'}
          </button>
        </div>
      )}

      {/* Modal Preview Fecho do Dia */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b bg-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Pré-visualização — Fecho do Dia</h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div
                className="text-sm text-black"
                dangerouslySetInnerHTML={{ __html: previewHtml.replace(/<html>|<\/html>|<head>.*?<\/head>/gs, '') }}
              />
            </div>
            <div className="p-3 border-t bg-slate-100 flex gap-2">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="flex-1 py-2 bg-white border border-slate-300 rounded text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  printHtml(previewHtml);
                  setIsPreviewOpen(false);
                }}
                className="flex-1 py-2 bg-primary rounded text-black text-xs font-bold hover:brightness-110 flex items-center justify-center gap-1"
              >
                <Printer size={12} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCloseReport;
