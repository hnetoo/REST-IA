import React, { useState, useEffect } from 'react';
import {
  FileText, Receipt, RotateCcw, ArrowUpCircle, FileCheck,
  Search, AlertCircle, CheckCircle, Loader2, FileOutput
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../supabase_standalone';
import { emitCreditNote, emitDebitNote, emitReceipt } from '../../lib/agt/documentService';
import type { AGTSeries, AGTDocument } from '../../types/agt';
import { formatKz } from './utils';

type DocAction = 'NC' | 'ND' | 'RG';

interface SourceDoc {
  id: string;
  document_number: string;
  document_type: string;
  gross_total: number;
  document_date: string;
  customer_name: string;
  customer_tax_id: string;
}

const AGTDocumentsTab: React.FC = () => {
  const { settings, addNotification } = useStore();
  const [action, setAction] = useState<DocAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceDocs, setSourceDocs] = useState<SourceDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SourceDoc | null>(null);
  const [reason, setReason] = useState('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('NUMERARIO');
  const [series, setSeries] = useState<AGTSeries | null>(null);
  const [result, setResult] = useState<AGTDocument | null>(null);

  const nif = settings.nif || '';
  const eacCode = settings.eacCode || settings.restaurantName?.slice(0, 5).toUpperCase() || '00000';

  // Carregar documentos emitidos (FT/FR/TV) como fonte
  useEffect(() => {
    fetchSourceDocuments();
  }, []);

  const fetchSourceDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('agt_documents')
        .select('id, document_number, document_type, gross_total, document_date, customer_name, customer_tax_id')
        .in('document_type', ['FT', 'FR', 'TV'])
        .eq('document_status', 'N')
        .order('document_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSourceDocs(data || []);
    } catch (err) {
      console.error('[AGT] Erro ao buscar documentos:', err);
    }
  };

  const fetchSeries = async (docType: DocAction) => {
    try {
      const year = new Date().getFullYear();
      const { data, error } = await supabase
        .from('agt_series')
        .select('*')
        .eq('document_type', docType)
        .eq('series_year', year)
        .eq('status', 'A')
        .single();

      if (error) {
        addNotification('error', `Série ${docType} não encontrada. Crie a série em Sistema → Compliance AGT.`);
        return null;
      }
      return data as AGTSeries;
    } catch (err) {
      addNotification('error', `Erro ao buscar série ${docType}`);
      return null;
    }
  };

  const handleEmit = async () => {
    if (!selectedDoc || !action || !reason) {
      addNotification('error', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const s = await fetchSeries(action);
      if (!s) { setLoading(false); return; }

      const grossTotal = customAmount ? Number(customAmount) : Number(selectedDoc.gross_total);

      let res;
      if (action === 'NC') {
        res = await emitCreditNote({
          series: s,
          taxRegistrationNumber: nif,
          sourceDocument: {
            documentNumber: selectedDoc.document_number,
            documentType: selectedDoc.document_type as any,
            reason
          },
          customerTaxID: selectedDoc.customer_tax_id,
          customerName: selectedDoc.customer_name,
          grossTotal,
          eacCode
        });
      } else if (action === 'ND') {
        res = await emitDebitNote({
          series: s,
          taxRegistrationNumber: nif,
          sourceDocument: {
            documentNumber: selectedDoc.document_number,
            documentType: selectedDoc.document_type as any,
            reason
          },
          customerTaxID: selectedDoc.customer_tax_id,
          customerName: selectedDoc.customer_name,
          grossTotal,
          eacCode
        });
      } else {
        res = await emitReceipt({
          series: s,
          taxRegistrationNumber: nif,
          customerTaxID: selectedDoc.customer_tax_id,
          customerName: selectedDoc.customer_name,
          grossTotal,
          paymentMethod,
          sourceDocument: {
            documentNumber: selectedDoc.document_number,
            documentType: selectedDoc.document_type as any
          },
          eacCode
        });
      }

      if (res.success && res.document) {
        // Persistir no Supabase
        await supabase.from('agt_documents').insert({
          id: res.document.id,
          document_type: res.document.documentType,
          document_status: 'N',
          series_code: res.document.seriesCode,
          document_number: res.document.documentNumber,
          document_date: res.document.documentDate,
          tax_registration_number: res.document.taxRegistrationNumber,
          customer_tax_id: res.document.customerTaxID,
          customer_name: res.document.customerName,
          customer_country: res.document.customerCountry,
          hash: res.document.hash,
          lines_json: JSON.stringify(res.document.lines),
          tax_payable: res.document.documentTotals.taxPayable,
          net_total: res.document.documentTotals.netTotal,
          gross_total: res.document.documentTotals.grossTotal,
          discount_total: res.document.documentTotals.discountTotal ?? 0,
          payment_method: res.document.paymentMethod,
          source_billing: 'P',
          agt_submission_status: 'PENDING',
          created_at: res.document.createdAt,
          updated_at: res.document.updatedAt
        });

        // Incrementar série
        await supabase
          .from('agt_series')
          .update({ current_sequence: s.currentSequence + 1 })
          .eq('id', s.id);

        setResult(res.document);
        addNotification('success', `${action} emitido com sucesso: ${res.document.documentNumber}`);
        setAction(null);
        setSelectedDoc(null);
        setReason('');
        setCustomAmount('');
        fetchSourceDocuments();
      } else {
        addNotification('error', res.message || 'Erro na emissão');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const actionConfig: Record<DocAction, { label: string; icon: React.ElementType; color: string; desc: string }> = {
    NC: { label: 'Nota de Crédito', icon: RotateCcw, color: 'text-red-400', desc: 'Anular/devolver uma fatura já emitida' },
    ND: { label: 'Nota de Débito', icon: ArrowUpCircle, color: 'text-yellow-400', desc: 'Adicionar acréscimo a uma fatura emitida' },
    RG: { label: 'Recibo', icon: Receipt, color: 'text-orange-400', desc: 'Registar pagamento de dívida já faturada' }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Seleção de Ação */}
      {!action && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
              Documentos Fiscais Complementares
            </h3>
            <span className="text-xs text-slate-500 font-mono uppercase">AGT DP 71/25</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(actionConfig) as DocAction[]).map((key) => {
              const cfg = actionConfig[key];
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setAction(key)}
                  className="glass-panel p-8 rounded-[2.5rem] border border-white/5 hover:border-primary/30 transition-all text-left space-y-4 group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon size={28} className={cfg.color} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tighter">{cfg.label}</h4>
                    <p className="text-xs text-slate-500 mt-1">{cfg.desc}</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-[10px] font-black bg-white/5 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest">
                      {key}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lista de documentos recentes */}
          <div className="glass-panel rounded-[2.5rem] border border-white/5 overflow-hidden mt-8">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <FileCheck className="text-primary" size={20} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Documentos Emitidos Recentemente</h4>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sourceDocs.length > 0 ? sourceDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-white">{doc.document_number}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">{doc.document_type}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">{doc.customer_name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">{doc.document_date}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-white">{formatKz(doc.gross_total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                      Nenhum documento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Formulário de Emissão */}
      {action && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => { setAction(null); setSelectedDoc(null); setResult(null); }}
              className="text-xs text-slate-500 hover:text-white uppercase tracking-widest font-black"
            >
              ← Voltar
            </button>
            <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center`}>
              {React.createElement(actionConfig[action].icon, { size: 20, className: actionConfig[action].color })}
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">
                Emitir {actionConfig[action].label}
              </h3>
              <p className="text-xs text-slate-500">{actionConfig[action].desc}</p>
            </div>
          </div>

          {/* Selecionar Documento de Origem */}
          <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Search size={16} className="text-primary" /> Documento de Origem
            </h4>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {sourceDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex justify-between items-center ${
                    selectedDoc?.id === doc.id
                      ? 'border-primary bg-primary/5'
                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary uppercase">{doc.document_type}</span>
                      <span className="text-xs font-mono text-white">{doc.document_number}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{doc.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-white">{formatKz(doc.gross_total)}</p>
                    <p className="text-[10px] text-slate-500">{doc.document_date}</p>
                  </div>
                </button>
              ))}
              {sourceDocs.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum documento disponível.</p>
              )}
            </div>
          </div>

          {selectedDoc && (
            <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Dados do Documento</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Documento Selecionado
                  </label>
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm font-mono text-white">
                    {selectedDoc.document_type} {selectedDoc.document_number}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Valor Original
                  </label>
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm font-mono text-white">
                    {formatKz(selectedDoc.gross_total)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Motivo / Observação *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Descreva o motivo da ${actionConfig[action].label.toLowerCase()}...`}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Valor {action === 'RG' ? 'a Pagar' : 'do Documento'} (Kz)
                  </label>
                  <input
                    type="number"
                    value={customAmount || selectedDoc.gross_total}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary"
                    placeholder={String(selectedDoc.gross_total)}
                  />
                </div>
                {action === 'RG' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Método de Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      aria-label="Método de pagamento"
                      title="Método de pagamento"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
                    >
                      <option value="NUMERARIO">Numerário</option>
                      <option value="TPA / MULTICAIXA">TPA / Multicaixa</option>
                      <option value="TRANSFERENCIA">Transferência</option>
                      <option value="QR CODE">QR Code</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={handleEmit}
                disabled={loading || !reason}
                className="w-full py-4 bg-primary text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileOutput size={18} />
                )}
                {loading ? 'A emitir...' : `Emitir ${actionConfig[action].label}`}
              </button>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] flex items-start gap-4">
              <CheckCircle size={24} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">Documento emitido com sucesso</p>
                <p className="text-xs text-slate-400 font-mono mt-1">{result.documentNumber}</p>
                <p className="text-xs text-emerald-400 mt-1">Hash: {result.hash.slice(0, 32)}...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AGTDocumentsTab;
