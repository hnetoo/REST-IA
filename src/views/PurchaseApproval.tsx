import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  CheckCircle, XCircle, FileText, Download, Eye, 
  AlertCircle, DollarSign, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PurchaseRequest {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  provider: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'pago';
  proforma_url?: string;
  receipt_url?: string;
  notes?: string;
}

const PurchaseApproval = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useStore();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data);
      setNotes(data?.notes || '');
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      addNotification('error', 'Erro ao carregar pedido de compra');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'aprovado',
          approved_at: new Date().toISOString(),
          notes
        })
        .eq('id', request.id);

      if (error) throw error;

      addNotification('success', 'Pedido aprovado com sucesso!');
      navigate('/compras');
    } catch (error) {
      console.error('Erro ao aprovar pedido:', error);
      addNotification('error', 'Erro ao aprovar pedido');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'rejeitado',
          approved_at: new Date().toISOString(),
          notes
        })
        .eq('id', request.id);

      if (error) throw error;

      addNotification('success', 'Pedido rejeitado com sucesso!');
      navigate('/compras');
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
      addNotification('error', 'Erro ao rejeitar pedido');
    } finally {
      setProcessing(false);
    }
  };

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 2 
  }).format(val);

  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-slate-500 mb-4" />
          <p className="text-slate-400">Pedido não encontrado</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'aprovado': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejeitado': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pago': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <AlertCircle size={20} />;
      case 'aprovado': return <CheckCircle size={20} />;
      case 'rejeitado': return <XCircle size={20} />;
      case 'pago': return <DollarSign size={20} />;
      default: return <AlertCircle size={20} />;
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/compras')}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Voltar para compras"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Aprovação de Pedido</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Revisão e Decisão</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Status Card */}
        <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${getStatusColor(request.status)}`}>
              {getStatusIcon(request.status)}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{request.description}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-slate-400">Valor:</span>
                  <span className="text-white font-bold ml-2">{formatKz(request.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Fornecedor:</span>
                  <span className="text-white font-bold ml-2">{request.provider}</span>
                </div>
                <div>
                  <span className="text-slate-400">Data:</span>
                  <span className="text-white font-bold ml-2">
                    {new Date(request.created_at).toLocaleDateString('pt-AO')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <FileText size={24} className="text-[#070b14]" />
            Documentos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {request.proforma_url && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Proforma</h4>
                <a 
                  href={request.proforma_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"
                  title="Ver proforma"
                >
                  <Eye size={20} />
                  <span>Visualizar Documento</span>
                </a>
              </div>
            )}
            
            {request.receipt_url && (
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Recibo</h4>
                <a 
                  href={request.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"
                  title="Ver recibo"
                >
                  <Download size={20} />
                  <span>Baixar Recibo</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
          <h3 className="text-xl font-bold text-white mb-6">Notas</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Adicione observações sobre esta decisão..."
            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-[#06b6d4] min-h-[120px] resize-none"
            disabled={request.status !== 'pendente'}
          />
        </div>

        {/* Action Buttons */}
        {request.status === 'pendente' && (
          <div className="flex gap-4">
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 py-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <XCircle size={24} />
              {processing ? 'Processando...' : 'Rejeitar'}
            </button>
            
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 py-6 bg-green-500/10 border border-green-500/20 text-green-500 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-green-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <CheckCircle size={24} />
              {processing ? 'Processando...' : 'Aprovar'}
            </button>
          </div>
        )}

        {/* Already Processed Message */}
        {request.status !== 'pendente' && (
          <div className="glass-panel p-8 rounded-[3rem] border border-white/5 text-center">
            <div className="flex items-center justify-center gap-4">
              {getStatusIcon(request.status)}
              <div>
                <p className="text-xl font-bold text-white mb-2">
                  Pedido {request.status === 'aprovado' ? 'Aprovado' : request.status === 'rejeitado' ? 'Rejeitado' : 'Processado'}
                </p>
                <p className="text-slate-400">
                  {request.notes && `Motivo: ${request.notes}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseApproval;
