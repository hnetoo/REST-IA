import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase_standalone';
import { calculateDataContabil } from '../lib/dateUtils';
import { Clock, Sunrise, Sunset, Lock, Unlock, Printer, AlertTriangle, CheckCircle, X } from 'lucide-react';

export interface ShiftRecord {
  id: string;
  shift_type: 'MORNING' | 'AFTERNOON';
  opened_by: string;
  opened_at: string;
  opening_amount: number;
  closed_by?: string;
  closed_at?: string;
  closing_amount?: number;
  expected_amount?: number;
  status: 'OPEN' | 'CLOSED';
  data_contabil: string;
  notes?: string;
}

interface ShiftManagerProps {
  currentUserName: string;
  onNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({ currentUserName, onNotification }) => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [isCloseConfirm, setIsCloseConfirm] = useState(false);
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [shiftOrders, setShiftOrders] = useState<any[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [discrepancyJustification, setDiscrepancyJustification] = useState('');
  const DISCREPANCY_TOLERANCE = 500; // Kz

  const dataContabil = calculateDataContabil(new Date());

  // Regras de limitação de turnos
  const morningShift = shifts.find(s => s.shift_type === 'MORNING');
  const afternoonShift = shifts.find(s => s.shift_type === 'AFTERNOON');
  const isMorningClosed = morningShift?.status === 'CLOSED';
  const isAfternoonClosed = afternoonShift?.status === 'CLOSED';
  const dayComplete = isMorningClosed && isAfternoonClosed;
  const canOpenShift = !activeShift && !dayComplete;
  const nextShiftType: 'MORNING' | 'AFTERNOON' | null = !morningShift ? 'MORNING' : (!afternoonShift ? 'AFTERNOON' : null);

  const fetchShifts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pos_shift_records')
        .select('*')
        .eq('data_contabil', dataContabil)
        .order('opened_at', { ascending: true });

      if (error) {
        console.error('[ShiftManager] Erro ao buscar turnos:', error);
        return;
      }

      const typed = (data || []).map((s: any) => ({ ...s })) as ShiftRecord[];
      setShifts(typed);

      const open = typed.find(s => s.status === 'OPEN');
      setActiveShift(open || null);

      if (open) {
        await fetchShiftOrders(open.id);
      }
    } catch (e) {
      console.error('[ShiftManager] Erro:', e);
    }
  }, [dataContabil]);

  const fetchShiftOrders = async (shiftId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, payment_method, status, created_at')
        .eq('shift_id', shiftId)
        .in('status', ['closed', 'paid']);

      if (error) {
        console.error('[ShiftManager] Erro ao buscar vendas do turno:', error);
        return;
      }
      setShiftOrders(data || []);
    } catch (e) {
      console.error('[ShiftManager] Erro:', e);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleOpenShift = async () => {
    if (!openingAmount || Number(openingAmount) < 0) {
      onNotification('error', 'Introduza um valor válido para abertura');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_shift_records')
        .insert({
          shift_type: selectedShiftType,
          opened_by: currentUserName,
          opening_amount: Number(openingAmount),
          status: 'OPEN',
          data_contabil: dataContabil
        })
        .select()
        .single();

      if (error) {
        console.error('[ShiftManager] Erro ao abrir turno:', error);
        onNotification('error', 'Erro ao abrir turno');
        return;
      }

      onNotification('success', `Turno da ${selectedShiftType === 'MORNING' ? 'Manhã' : 'Tarde'} aberto`);
      setIsOpenModalOpen(false);
      setOpeningAmount('');
      await fetchShifts();
    } catch (e) {
      console.error('[ShiftManager] Erro:', e);
      onNotification('error', 'Erro ao abrir turno');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBreakdown = (orders?: any[]) => {
    const source = orders || shiftOrders;
    const breakdown: Record<string, { count: number; total: number }> = {};
    source.forEach(order => {
      const method = order.payment_method || 'OUTROS';
      if (!breakdown[method]) breakdown[method] = { count: 0, total: 0 };
      breakdown[method].count++;
      breakdown[method].total += Number(order.total_amount) || 0;
    });
    return breakdown;
  };

  const totalShiftSales = shiftOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const fetchProductsSold = async (orderIds: string[]) => {
    if (orderIds.length === 0) return [];
    // Tentar 1: tabela order_items (com produtos nomeados)
    const { data: oiData, error: oiError } = await supabase
      .from('order_items')
      .select('quantity, total_price, products!fk_order_items_product(name)')
      .in('order_id', orderIds);
    if (!oiError && oiData && oiData.length > 0) {
      const agg: Record<string, { name: string; quantity: number; total: number }> = {};
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
      console.error('[ShiftManager] Erro ao buscar produtos vendidos:', error);
      return [];
    }
    const agg: Record<string, { name: string; quantity: number; total: number }> = {};
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

  const generateReportHtml = (shift: ShiftRecord, orders?: any[], productsSold?: { name: string; quantity: number; total: number }[]): string => {
    const breakdown = getPaymentBreakdown(orders);
    const salesTotal = shift.expected_amount != null
      ? (Number(shift.expected_amount) - Number(shift.opening_amount))
      : (orders || shiftOrders).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const diff = Number(shift.closing_amount || 0) - Number(shift.expected_amount || 0);
    const breakdownEntries = Object.entries(breakdown);
    const prodEntries = productsSold || [];

    return `
      <html>
        <head><title>Relatório de Fecho de Turno</title></head>
        <body style="font-family: monospace; padding: 20px; max-width: 320px; margin: 0 auto; color: #000; background: #fff;">
          <h2 style="text-align: center; margin-bottom: 2px; font-size: 16px;">TASCA DO VEREDA</h2>
          <h3 style="text-align: center; margin-top: 0; font-size: 13px;">FECHO DE TURNO</h3>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 2px 0; font-size: 11px;"><strong>Data:</strong> ${shift.data_contabil}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Turno:</strong> ${shift.shift_type === 'MORNING' ? 'MANHÃ' : 'TARDE'}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Operador:</strong> ${shift.opened_by}</p>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 4px 0; font-size: 11px;"><strong>ABERTURA</strong></p>
          <p style="margin: 2px 0; font-size: 11px;">Valor em caixa: ${Number(shift.opening_amount).toLocaleString('pt-AO')} Kz</p>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 4px 0; font-size: 11px;"><strong>VENDAS POR MODALIDADE</strong></p>
          ${breakdownEntries.length === 0 ? '<p style="margin: 2px 0; font-size: 11px;">Nenhuma venda registada</p>' : breakdownEntries.map(([method, data]) => `
            <p style="margin: 2px 0; font-size: 11px;">${method}: <strong>${data.total.toLocaleString('pt-AO')} Kz</strong> (${data.count} venda${data.count > 1 ? 's' : ''})</p>
          `).join('')}
          <p style="margin: 4px 0; font-size: 11px;"><strong>Total Vendas:</strong> ${salesTotal.toLocaleString('pt-AO')} Kz</p>
          ${prodEntries.length > 0 ? `
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 4px 0; font-size: 11px;"><strong>PRODUTOS VENDIDOS</strong></p>
          ${prodEntries.map(p => `
            <p style="margin: 2px 0; font-size: 11px;">${p.name}: ${p.quantity}x = <strong>${p.total.toLocaleString('pt-AO')} Kz</strong></p>
          `).join('')}
          ` : ''}
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="margin: 4px 0; font-size: 11px;"><strong>RESUMO</strong></p>
          <p style="margin: 2px 0; font-size: 11px;">Esperado: ${Number(shift.expected_amount || 0).toLocaleString('pt-AO')} Kz</p>
          <p style="margin: 2px 0; font-size: 11px;">Contado: ${Number(shift.closing_amount || 0).toLocaleString('pt-AO')} Kz</p>
          <p style="margin: 2px 0; font-size: 11px;">Diferença: ${diff.toLocaleString('pt-AO')} Kz ${Math.abs(diff) <= 1 ? 'OK' : '!'}</p>
          <hr style="border: 1px dashed #000; margin: 8px 0;">
          <p style="text-align: center; margin-top: 16px; font-size: 11px;">__________________________<br>Assinatura</p>
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

  const handlePreviewAndPrint = async (shift: ShiftRecord) => {
    // Buscar vendas do turno para garantir dados corretos no relatório
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, payment_method, status, created_at')
      .eq('shift_id', shift.id)
      .in('status', ['closed', 'paid']);
    const orderIds = (orders || []).map((o: any) => o.id);
    const productsSold = await fetchProductsSold(orderIds);
    const html = generateReportHtml(shift, orders || [], productsSold);
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    if (!closingAmount || Number(closingAmount) < 0) {
      onNotification('error', 'Introduza um valor válido para fecho');
      return;
    }

    setLoading(true);
    try {
      // Buscar vendas atualizadas do Supabase para ter dados corretos
      const { data: freshOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, payment_method, status, created_at')
        .eq('shift_id', activeShift.id)
        .in('status', ['closed', 'paid']);

      if (ordersError) {
        console.error('[ShiftManager] Erro ao buscar vendas atualizadas:', ordersError);
      }

      const currentOrders = freshOrders || [];
      setShiftOrders(currentOrders);

      const totalSales = currentOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const expected = Number(activeShift.opening_amount) + totalSales;

      const diff = Number(closingAmount) - expected;
      const { error } = await supabase
        .from('pos_shift_records')
        .update({
          closed_by: currentUserName,
          closed_at: new Date().toISOString(),
          closing_amount: Number(closingAmount),
          expected_amount: expected,
          status: 'CLOSED',
          ...(Math.abs(diff) > DISCREPANCY_TOLERANCE && discrepancyJustification.trim() ? { notes: `[DISCREPÂNCIA ${diff.toFixed(0)} Kz] ${discrepancyJustification.trim()}` } : {})
        })
        .eq('id', activeShift.id);

      if (error) {
        console.error('[ShiftManager] Erro ao fechar turno:', error);
        onNotification('error', 'Erro ao fechar turno');
        return;
      }

      if (Math.abs(diff) > 1) {
        onNotification('warning', `Turno fechado com diferença de ${diff.toFixed(2)} Kz`);
        // 🔒 LOG DE AUDITORIA: Discrepância significativa
        if (Math.abs(diff) > DISCREPANCY_TOLERANCE) {
          import('../lib/auditService').then(({ logShiftDiscrepancy }) => {
            logShiftDiscrepancy(
              activeShift.id,
              expected,
              Number(closingAmount),
              diff,
              discrepancyJustification || 'Sem justificação fornecida',
              undefined,
              currentUserName
            ).catch(err => console.error('[AUDIT] Erro ao logar discrepância:', err));
          }).catch(() => {});
        }
      } else {
        onNotification('success', 'Turno fechado com sucesso');
      }

      // Gerar relatório com vendas atualizadas e mostrar preview
      const closedShift = { ...activeShift, closed_by: currentUserName, closed_at: new Date().toISOString(), closing_amount: Number(closingAmount), expected_amount: expected, status: 'CLOSED' as const };
      const orderIds = currentOrders.map((o: any) => o.id);
      const productsSold = await fetchProductsSold(orderIds);
      const html = generateReportHtml(closedShift, currentOrders, productsSold);
      setPreviewHtml(html);
      setIsPreviewOpen(true);

      setIsCloseModalOpen(false);
      setIsCloseConfirm(false);
      setClosingAmount('');
      setDiscrepancyJustification('');
      await fetchShifts();
    } catch (e) {
      console.error('[ShiftManager] Erro:', e);
      onNotification('error', 'Erro ao fechar turno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Turnos de Hoje */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Turnos de Hoje</h3>
        {shifts.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum turno registado hoje</p>
        ) : (
          shifts.map(shift => (
            <div key={shift.id} className={`p-3 rounded-lg border ${shift.status === 'OPEN' ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-white/[0.02]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {shift.shift_type === 'MORNING' ? <Sunrise size={14} className="text-amber-400" /> : <Sunset size={14} className="text-orange-400" />}
                  <span className="text-xs font-bold text-white">{shift.shift_type === 'MORNING' ? 'Manhã' : 'Tarde'}</span>
                  {shift.status === 'OPEN' ? (
                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ABERTO</span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">FECHADO</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">{shift.opened_by}</span>
              </div>
              {shift.status === 'CLOSED' && (
                <div className="mt-2 text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Abertura:</span>
                    <span>{Number(shift.opening_amount).toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas:</span>
                    <span>{(Number(shift.expected_amount || 0) - Number(shift.opening_amount || 0)).toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecho:</span>
                    <span>{Number(shift.closing_amount || 0).toLocaleString('pt-AO')} Kz</span>
                  </div>
                  <button
                    onClick={() => handlePreviewAndPrint(shift)}
                    className="mt-2 w-full py-1.5 bg-white/5 hover:bg-white/10 rounded text-[9px] font-bold text-slate-300 flex items-center justify-center gap-1 transition-all"
                  >
                    <Printer size={10} />
                    Ver Relatório
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Ações */}
      {activeShift ? (
        <button
          onClick={() => setIsCloseModalOpen(true)}
          className="w-full py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 text-xs font-bold"
        >
          <Lock size={14} />
          Fechar Turno ({activeShift.shift_type === 'MORNING' ? 'Manhã' : 'Tarde'})
        </button>
      ) : dayComplete ? (
        <div className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-slate-400 flex items-center justify-center gap-2 text-xs font-bold">
          <CheckCircle size={14} />
          Dia Completo — Turnos Encerrados
        </div>
      ) : (
        <button
          onClick={() => {
            if (nextShiftType) setSelectedShiftType(nextShiftType);
            setIsOpenModalOpen(true);
          }}
          className="w-full py-3 bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2 text-xs font-bold"
        >
          <Unlock size={14} />
          Abrir Turno {!nextShiftType ? '' : nextShiftType === 'MORNING' ? '(Manhã)' : '(Tarde)'}
        </button>
      )}

      {/* Modal Abrir Turno */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Abrir Turno</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => !morningShift && setSelectedShiftType('MORNING')}
                  disabled={!!morningShift}
                  className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${
                    morningShift
                      ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                      : selectedShiftType === 'MORNING'
                        ? 'bg-primary text-black'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                  title={morningShift ? 'Turno da Manhã já registado hoje' : ''}
                >
                  <Sunrise size={16} className="mx-auto mb-1" />
                  Manhã
                  {morningShift && <span className="block text-[8px] mt-1 text-slate-500">Já aberto</span>}
                </button>
                <button
                  onClick={() => !afternoonShift && setSelectedShiftType('AFTERNOON')}
                  disabled={!!afternoonShift}
                  className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${
                    afternoonShift
                      ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                      : selectedShiftType === 'AFTERNOON'
                        ? 'bg-primary text-black'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                  title={afternoonShift ? 'Turno da Tarde já registado hoje' : ''}
                >
                  <Sunset size={16} className="mx-auto mb-1" />
                  Tarde
                  {afternoonShift && <span className="block text-[8px] mt-1 text-slate-500">Já aberto</span>}
                </button>
              </div>
              {dayComplete && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[10px] font-bold text-center">
                  Ambos os turnos do dia já foram encerrados. Novos turnos só amanhã a partir das 05:00.
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor em Caixa (Kz)</label>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={e => setOpeningAmount(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsOpenModalOpen(false)} className="flex-1 py-3 bg-white/5 rounded-lg text-slate-400 text-xs font-bold hover:bg-white/10">Cancelar</button>
                <button onClick={handleOpenShift} disabled={loading || dayComplete} className="flex-1 py-3 bg-primary rounded-lg text-black text-xs font-bold hover:brightness-110 disabled:opacity-50">
                  {loading ? 'A abrir...' : dayComplete ? 'Dia Completo' : 'Abrir Turno'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Relatório */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b bg-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Pré-visualização — Fecho de Turno</h3>
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

      {/* Modal Fechar Turno — 2 Passos */}
      {isCloseModalOpen && activeShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            {!isCloseConfirm ? (
              /* PASSO 1: Introduzir valor contado */
              <>
                <h3 className="text-lg font-bold text-white mb-4">Fechar Turno — {activeShift.shift_type === 'MORNING' ? 'Manhã' : 'Tarde'}</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-white/[0.02] rounded-lg space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Abertura:</span>
                      <span>{Number(activeShift.opening_amount).toLocaleString('pt-AO')} Kz</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Vendas ({shiftOrders.length}):</span>
                      <span className="text-white font-bold">{totalShiftSales.toLocaleString('pt-AO')} Kz</span>
                    </div>
                    <div className="flex justify-between text-primary font-bold border-t border-white/5 pt-1">
                      <span>Esperado:</span>
                      <span>{(Number(activeShift.opening_amount) + totalShiftSales).toLocaleString('pt-AO')} Kz</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor Contado (Kz)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={closingAmount}
                      onChange={e => setClosingAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Ex: 31000"
                      className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-primary"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setIsCloseModalOpen(false); setClosingAmount(''); setIsCloseConfirm(false); }} className="flex-1 py-3 bg-white/5 rounded-lg text-slate-400 text-xs font-bold hover:bg-white/10">Cancelar</button>
                    <button
                      onClick={() => {
                        console.log('[ShiftManager] Continuar clicado. closingAmount:', closingAmount, 'num:', Number(closingAmount));
                        const val = Number(closingAmount);
                        if (!closingAmount || closingAmount.trim() === '' || isNaN(val) || val < 0) {
                          onNotification('error', 'Introduza um valor válido para fecho');
                          return;
                        }
                        console.log('[ShiftManager] Avançando para confirmação');
                        setIsCloseConfirm(true);
                      }}
                      className="flex-1 py-3 bg-amber-500 rounded-lg text-black text-xs font-bold hover:brightness-110"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* PASSO 2: Confirmação antes de fechar */
              <>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={20} className="text-amber-500" />
                  <h3 className="text-lg font-bold text-white">Confirmar Fecho</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-white/[0.02] rounded-lg space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Turno:</span>
                      <span className="text-white font-bold">{activeShift.shift_type === 'MORNING' ? 'Manhã' : 'Tarde'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Operador:</span>
                      <span className="text-white font-bold">{currentUserName}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Abertura:</span>
                      <span>{Number(activeShift.opening_amount).toLocaleString('pt-AO')} Kz</span>
                    </div>
                    {/* Breakdown por modalidade */}
                    {Object.entries(getPaymentBreakdown()).length > 0 && (
                      <div className="border-t border-white/5 pt-1 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Vendas por Modalidade</p>
                        {Object.entries(getPaymentBreakdown()).map(([method, data]) => (
                          <div key={method} className="flex justify-between text-slate-400">
                            <span>{method}:</span>
                            <span className="text-white font-bold">{data.total.toLocaleString('pt-AO')} Kz ({data.count}x)</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400 border-t border-white/5 pt-1">
                      <span>Total Vendas:</span>
                      <span className="text-white font-bold">{totalShiftSales.toLocaleString('pt-AO')} Kz</span>
                    </div>
                    <div className="flex justify-between text-primary font-bold border-t border-white/5 pt-1">
                      <span>Esperado:</span>
                      <span>{(Number(activeShift.opening_amount) + totalShiftSales).toLocaleString('pt-AO')} Kz</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Valor Contado:</span>
                      <span>{Number(closingAmount).toLocaleString('pt-AO')} Kz</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-white/5 pt-1">
                      <span className={Math.abs(Number(closingAmount) - (Number(activeShift.opening_amount) + totalShiftSales)) > DISCREPANCY_TOLERANCE ? 'text-red-400' : 'text-amber-400'}>Diferença:</span>
                      <span className={Math.abs(Number(closingAmount) - (Number(activeShift.opening_amount) + totalShiftSales)) > DISCREPANCY_TOLERANCE ? 'text-red-400' : 'text-amber-400'}>{(Number(closingAmount) - (Number(activeShift.opening_amount) + totalShiftSales)).toLocaleString('pt-AO')} Kz</span>
                    </div>
                  </div>

                  {/* 🔒 ALERTA DE DISCREPÂNCIA */}
                  {Math.abs(Number(closingAmount) - (Number(activeShift.opening_amount) + totalShiftSales)) > DISCREPANCY_TOLERANCE && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-red-400" />
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Discrepância Detectada</p>
                      </div>
                      <p className="text-[10px] text-red-300 mb-2">
                        A diferença excede a tolerância de {DISCREPANCY_TOLERANCE} Kz. É obrigatório justificar esta discrepância antes de fechar o turno.
                      </p>
                      <textarea
                        value={discrepancyJustification}
                        onChange={e => setDiscrepancyJustification(e.target.value)}
                        placeholder="Explique a razão da diferença (ex: erro de troco, pagamento multicaixa não contado, etc.)"
                        className="w-full px-3 py-2 bg-white/5 border border-red-500/20 rounded text-white text-[11px] outline-none focus:border-red-500 resize-none"
                        rows={3}
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-[10px] text-amber-400 text-center">
                      <strong>ATENÇÃO:</strong> Após confirmar, o turno será fechado e o relatório será impresso. Esta ação não pode ser desfeita.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setIsCloseConfirm(false)} className="flex-1 py-3 bg-white/5 rounded-lg text-slate-400 text-xs font-bold hover:bg-white/10">Voltar</button>
                    <button
                      onClick={handleCloseShift}
                      disabled={loading || (Math.abs(Number(closingAmount) - (Number(activeShift.opening_amount) + totalShiftSales)) > DISCREPANCY_TOLERANCE && discrepancyJustification.trim().length < 5)}
                      className="flex-1 py-3 bg-amber-500 rounded-lg text-black text-xs font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'A fechar...' : 'Confirmar Fecho'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManager;
