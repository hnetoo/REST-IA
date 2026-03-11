import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  ShoppingCart, Plus, FileText, Clock, CheckCircle, 
  XCircle, DollarSign, Send, Eye, AlertCircle, Settings, Save, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PurchaseRequest {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  amount_kz?: number;
  provider: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'pago';
  proforma_url?: string;
  receipt_url?: string;
  notes?: string;
}

const Purchases = () => {
  const { addNotification, settings } = useStore();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    provider: '',
    proforma_file: null as File | null
  });
  
  // Configurações de WhatsApp (localStorage)
  const [whatsappSettings, setWhatsappSettings] = useState(() => {
    const saved = localStorage.getItem('whatsappPurchaseSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      approvalNumbers: ['+244923000000'],
      customMessage: 'Olá, novo pedido de compra no Vereda OS: {description} - {amount} Kz. Link para decidir: {approvalLink}'
    };
  });

  useEffect(() => {
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      
      // Verificar se o cliente Supabase está inicializado
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('[DEBUG] Usando URL:', supabaseUrl);
      
      if (!supabaseUrl) {
        throw new Error('URL do Supabase não encontrada');
      }
      
      console.log('[PURCHASES] Buscando pedidos...');
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[PURCHASES] Pedidos carregados:', data?.length || 0);
      setRequests(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      addNotification('error', 'Erro ao carregar pedidos de compra');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.provider) {
      addNotification('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      let proforma_url = '';

      // Verificar se o cliente Supabase está inicializado
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('[DEBUG] Enviando pedido usando URL:', supabaseUrl);
      
      if (!supabaseUrl) {
        throw new Error('URL do Supabase não encontrada');
      }

      // Upload proforma file if exists
      if (formData.proforma_file) {
        const fileExt = formData.proforma_file.name.split('.').pop();
        const fileName = `proforma_${Date.now()}.${fileExt}`;
        
        console.log('[PURCHASES] Fazendo upload do arquivo...');
        const { data, error } = await supabase.storage
          .from('purchase-documents')
          .upload(fileName, formData.proforma_file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('purchase-documents')
          .getPublicUrl(fileName);

        proforma_url = publicUrl;
      }

      // Insert purchase request
      console.log('[PURCHASES] Enviando pedido para o banco...');
      const { error } = await supabase
        .from('purchase_requests')
        .insert({
          description: formData.description,
          amount: parseFloat(formData.amount),
          provider: formData.provider,
          proforma_url,
          status: 'pendente'
        });

      if (error) throw error;

      console.log('[PURCHASES] Pedido enviado com sucesso!');
      addNotification('success', 'Pedido de compra enviado com sucesso!');
      setFormData({ description: '', amount: '', provider: '', proforma_file: null });
      setShowForm(false);
      fetchPurchaseRequests();
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      addNotification('error', 'Erro ao enviar pedido de compra');
    }
  };

  const sendForApproval = async (request: PurchaseRequest) => {
    try {
      console.log('[PURCHASES] Enviando para aprovação:', request);
      
      // Gerar token manualmente se não existir
      const approvalToken = 'TOKEN' + Date.now().toString(36).toUpperCase();
      const approvalUrl = `https://rest-ia.vercel.app/approve-purchase/${request.id}/${approvalToken}`;
      
      const message = `*🛒 PEDIDO DE COMPRA PARA APROVAÇÃO*\n\n` +
        `*Descrição:* ${request.description}\n` +
        `*Valor:* ${formatKz(request.amount)}\n` +
        `*Fornecedor:* ${request.provider}\n\n` +
        `*Para aprovar ou rejeitar, clique no link abaixo:*\n` +
        `${approvalUrl}\n\n` +
        `*Este link expira após o uso.*`;

      const whatsappUrl = `https://wa.me/244923000000?text=${encodeURIComponent(message)}`;
      
      console.log('[PURCHASES] Abrindo WhatsApp:', whatsappUrl);
      window.open(whatsappUrl, '_blank');
      
      addNotification('success', 'Link de aprovação enviado via WhatsApp!');
    } catch (error) {
      console.error('Erro ao enviar para aprovação:', error);
      addNotification('error', 'Erro ao enviar link de aprovação');
    }
  };

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
    style: 'currency', 
    currency: 'AOA', 
    maximumFractionDigits: 2 
  }).format(val);

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
      case 'pendente': return <Clock size={16} />;
      case 'aprovado': return <CheckCircle size={16} />;
      case 'rejeitado': return <XCircle size={16} />;
      case 'pago': return <DollarSign size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  const saveWhatsappSettings = () => {
    localStorage.setItem('whatsappPurchaseSettings', JSON.stringify(whatsappSettings));
    addNotification('success', 'Configurações de WhatsApp salvas com sucesso!');
    setShowSettings(false);
  };

  const addApprovalNumber = () => {
    setWhatsappSettings((prev: any) => ({
      ...prev,
      approvalNumbers: [...prev.approvalNumbers, '+244']
    }));
  };

  const removeApprovalNumber = (index: number) => {
    setWhatsappSettings((prev: any) => ({
      ...prev,
      approvalNumbers: prev.approvalNumbers.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateApprovalNumber = (index: number, value: string) => {
    setWhatsappSettings((prev: any) => ({
      ...prev,
      approvalNumbers: prev.approvalNumbers.map((num: string, i: number) => i === index ? value : num)
    }));
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Gestão de Compras</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Pedidos e Aprovações</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/10 border border-white/20 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest"
            title="Configurar WhatsApp"
          >
            <Settings size={20} />
            Configurar
          </button>
          
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-[#070b14] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
          >
            <Plus size={20} />
            Novo Pedido
          </button>
        </div>
      </header>

      {/* Painel de Configurações de WhatsApp */}
      {showSettings && (
        <div className="glass-panel p-8 rounded-[3rem] border border-[#070b14]/30 bg-[#070b14]/5 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Configurações de WhatsApp</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Fechar configurações"
            >
              <XCircle size={24} />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Números de WhatsApp para Aprovação */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Números para Aprovação
              </label>
              <div className="space-y-3">
                {whatsappSettings.approvalNumbers.map((number: string, index: number) => (
                  <div key={index} className="flex gap-3">
                    <input 
                      type="text" 
                      className="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" 
                      value={number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateApprovalNumber(index, e.target.value)}
                      placeholder="+244923000000"
                    />
                    <button
                      onClick={() => removeApprovalNumber(index)}
                      className="p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl hover:bg-red-500/30 transition-all"
                      title="Remover número"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addApprovalNumber}
                  className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-all font-bold text-sm"
                >
                  + Adicionar Número
                </button>
              </div>
            </div>
            
            {/* Mensagem Personalizada */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Mensagem Personalizada
              </label>
              <textarea 
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4] resize-none" 
                rows={4}
                value={whatsappSettings.customMessage}
                onChange={e => setWhatsappSettings(prev => ({...prev, customMessage: e.target.value}))}
                placeholder="Use {description}, {amount} e {approvalLink} como variáveis"
              />
              <div className="mt-2 text-xs text-slate-400">
                Variáveis disponíveis: {'{description}'}, {'{amount}'}, {'{approvalLink}'}
              </div>
            </div>
            
            {/* Botão Salvar */}
            <button
              onClick={saveWhatsappSettings}
              className="w-full py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-sm tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {/* Formulário de Novo Pedido */}
      {showForm && (
        <div className="glass-panel p-8 rounded-[3rem] border border-[#070b14]/30 bg-[#070b14]/5 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Novo Pedido de Compra</h3>
            <button 
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Fechar formulário"
            >
              <XCircle size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Descrição do Item</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Material de escritório, equipamento, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Valor (Kz)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" 
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fornecedor</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" 
                  value={formData.provider}
                  onChange={e => setFormData({...formData, provider: e.target.value})}
                  placeholder="Nome do fornecedor"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Proforma (Opcional)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={e => setFormData({...formData, proforma_file: e.target.files?.[0] || null})}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#06b6d4]/10 file:text-[#06b6d4] file:text-xs file:font-black"
                  />
                  {formData.proforma_file && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#06b6d4] font-black">
                      {formData.proforma_file.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 flex justify-end gap-4 mt-6">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-8 py-3 bg-[#06b6d4] text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Send size={16} />
                Enviar Pedido
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Pedidos */}
      <div className="glass-panel rounded-[3rem] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <ShoppingCart size={24} className="text-[#070b14]" />
            Pedidos de Compra
          </h3>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-400">Carregando pedidos...</span>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-slate-500 mb-4" />
            <p className="text-slate-400">Nenhum pedido de compra encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-2">{request.status}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(request.created_at).toLocaleDateString('pt-AO')}
                      </span>
                    </div>
                    
                    <h4 className="text-white font-bold text-lg mb-2">{request.description}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Valor:</span>
                        <span className="text-white font-bold ml-2">{formatKz(request.amount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Fornecedor:</span>
                        <span className="text-white font-bold ml-2">{request.provider}</span>
                      </div>
                      {request.proforma_url && (
                        <div>
                          <span className="text-slate-400">Proforma:</span>
                          <a 
                            href={request.proforma_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#06b6d4] font-bold ml-2 hover:underline flex items-center gap-1 inline-flex"
                            title="Ver proforma"
                          >
                            <Eye size={14} />
                            Ver Documento
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {request.status === 'pendente' && (
                      <button 
                        onClick={() => sendForApproval(request)}
                        className="px-4 py-2 bg-[#06b6d4] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
                        title="Enviar para aprovação via WhatsApp"
                      >
                        <Send size={14} />
                        Enviar
                      </button>
                    )}
                    
                    {request.receipt_url && (
                      <a 
                        href={request.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-500/20 transition-all flex items-center gap-2"
                        title="Ver recibo"
                      >
                        <FileText size={14} />
                        Recibo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchases;
