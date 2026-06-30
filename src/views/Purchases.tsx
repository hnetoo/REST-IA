import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { 
  ShoppingCart, Plus, FileText, Clock, CheckCircle, 
  XCircle, DollarSign, Send, Eye, AlertCircle, Settings, Save, Trash2,
  Search, Calendar, TrendingUp, Package, Receipt, Upload, X,
  ChevronDown, ChevronUp, Wallet, Store, Filter
} from 'lucide-react';
import { supabase } from '../supabase_standalone';
import { useSyncCore } from '../hooks/useSyncCore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface PurchaseRequest {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  amount_kz?: number;
  provider: string;
  status: 'pendente' | 'parcial' | 'aprovado' | 'rejeitado' | 'pago';
  proforma_url?: string;
  receipt_url?: string;
  notes?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expected_date?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  approval_count?: number;
}

const Purchases = () => {
  const { addNotification, settings, currentUser } = useStore();
  const { recalculate } = useSyncCore();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showChart, setShowChart] = useState(false);
  const [payModalRequest, setPayModalRequest] = useState<PurchaseRequest | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [providerData, setProviderData] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    provider: '',
    proforma_file: null as File | null,
    category: 'Outros',
    notes: '',
    quantity: '1',
    unit: 'un',
    expected_date: ''
  });
  
  // Configurações de WhatsApp (localStorage)
  const [whatsappSettings, setWhatsappSettings] = useState(() => {
    const saved = localStorage.getItem('whatsappPurchaseSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      restaurantNumber: '', // Número do restaurante que envia
      approvalNumbers: ['+244923000000'], // Números dos donos que aprovam
      customMessage: '*🛒 PEDIDO DE COMPRA PARA APROVAÇÃO*\n\n*Descrição:* {description}\n*Valor:* {amount}\n*Fornecedor:* {provider}\n\n*Para aprovar ou rejeitar:*\n{approvalLink}\n\n_Este link expira após o uso._'
    };
  });

  // Configurações de Regras de Aprovação (localStorage)
  const [approvalRules, setApprovalRules] = useState(() => {
    const saved = localStorage.getItem('purchaseApprovalRules');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      autoApproveLimit: 0,        // Valores <= este limite são auto-aprovados (0 = desligado)
      singleApproveLimit: 50000,  // Valores até este limite precisam de 1 owner
      // Valores acima de singleApproveLimit precisam de 2 owners
    };
  });

  useEffect(() => {
    fetchPurchaseRequests();
    const pollInterval = setInterval(() => {
      fetchPurchaseRequests();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
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
      buildChartData(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      addNotification('error', 'Erro ao carregar pedidos de compra');
    } finally {
      setLoading(false);
    }
  };

  // 📊 MELHORIA 6: Construir dados para gráficos
  const buildChartData = (data: PurchaseRequest[]) => {
    const now = new Date();
    const months: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-AO', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    data.forEach(req => {
      if (req.status === 'pago' || req.status === 'aprovado') {
        const d = new Date(req.created_at);
        const key = d.toLocaleDateString('pt-AO', { month: 'short', year: '2-digit' });
        if (key in months) months[key] += req.amount;
      }
    });
    setChartData(Object.entries(months).map(([month, total]) => ({ month, total })));

    // Por fornecedor (top 5)
    const providers: { [key: string]: number } = {};
    data.forEach(req => {
      if (req.status === 'pago' || req.status === 'aprovado') {
        providers[req.provider] = (providers[req.provider] || 0) + req.amount;
      }
    });
    setProviderData(Object.entries(providers)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5));
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
        
        // 🚀 TENTATIVA 1: Usar bucket 'documents' (padrão do sistema)
        let bucketName = 'purchase-documents';
        let uploadSuccess = false;
        
        try {
          const { data, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, formData.proforma_file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(fileName);
            proforma_url = publicUrl;
            console.log('[PURCHASES] Upload concluído:', publicUrl);
            uploadSuccess = true;
          } else {
            console.warn('[PURCHASES] Bucket purchase-documents não encontrado:', uploadError.message);
          }
        } catch (uploadErr) {
          console.warn('[PURCHASES] Erro no upload:', uploadErr);
        }

        // 🚀 TENTATIVA 2: Se falhou, tentar bucket 'documents'
        if (!uploadSuccess) {
          try {
            console.log('[PURCHASES] Tentando bucket documents...');
            const { data, error: uploadError2 } = await supabase.storage
              .from('documents')
              .upload(fileName, formData.proforma_file);
            
            if (!uploadError2) {
              const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);
              proforma_url = publicUrl;
              console.log('[PURCHASES] Upload concluído em documents:', publicUrl);
              uploadSuccess = true;
            }
          } catch (err) {
            console.warn('[PURCHASES] Bucket documents também não disponível');
          }
        }

        // 🚀 TENTATIVA 3: Se ainda falhou, continuar sem proforma
        if (!uploadSuccess) {
          console.warn('[PURCHASES] Nenhum bucket disponível. Continuando sem proforma...');
          // Não falhar - proforma é opcional
        }
      }

      // 🔒 MELHORIA 7: Enviar created_by + notes + category (sem approval_token — DB trigger faz isso)
      console.log('[PURCHASES] Enviando pedido para o banco...');
      const insertData: any = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        provider: formData.provider,
        proforma_url,
        status: 'pendente',
        notes: formData.notes || null,
        created_by: (currentUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id)) ? currentUser.id : null
      };
      // Guardar categoria/quantidade/unidade/data prevista em notes como JSON se existirem
      const metaData: any = {};
      if (formData.category && formData.category !== 'Outros') metaData.category = formData.category;
      if (formData.quantity && formData.quantity !== '1') metaData.quantity = parseFloat(formData.quantity);
      if (formData.unit && formData.unit !== 'un') metaData.unit = formData.unit;
      if (formData.expected_date) metaData.expected_date = formData.expected_date;
      if (Object.keys(metaData).length > 0) {
        insertData.notes = JSON.stringify({ text: formData.notes || '', ...metaData });
      }

      console.log('[PURCHASES] Dados a enviar:', JSON.stringify(insertData, null, 2));
      const { data: insertResult, error } = await supabase
        .from('purchase_requests')
        .insert(insertData)
        .select();

      if (error) {
        console.error('[PURCHASES] Erro detalhado do Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          data_sent: insertData
        });
        throw error;
      }

      console.log('[PURCHASES] Pedido enviado com sucesso!');
      addNotification('success', 'Pedido de compra enviado com sucesso! Aguardando aprovação.');
      setFormData({ description: '', amount: '', provider: '', proforma_file: null, category: 'Outros', notes: '', quantity: '1', unit: 'un', expected_date: '' });
      setShowForm(false);
      setEditingRequest(null);
      fetchPurchaseRequests();
      recalculate();
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      addNotification('error', 'Erro ao enviar pedido de compra');
    }
  };

  const handleEdit = (request: PurchaseRequest) => {
    setEditingRequest(request);
    // Extrair metadados do notes se for JSON
    let notes = request.notes || '';
    let category = 'Outros';
    let quantity = '1';
    let unit = 'un';
    let expected_date = '';
    try {
      const parsed = JSON.parse(request.notes || '');
      if (typeof parsed === 'object') {
        notes = parsed.text || '';
        category = parsed.category || 'Outros';
        quantity = parsed.quantity?.toString() || '1';
        unit = parsed.unit || 'un';
        expected_date = parsed.expected_date || '';
      }
    } catch (_) {}
    setFormData({
      description: request.description,
      amount: request.amount.toString(),
      provider: request.provider,
      proforma_file: null,
      category,
      notes,
      quantity,
      unit,
      expected_date
    });
    setShowForm(true);
  };

  const handleDelete = async (request: PurchaseRequest) => {
    if (!confirm('Tem certeza que deseja apagar este pedido de compra?')) return;
    
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', request.id);
      
      if (error) throw error;
      
      addNotification('success', 'Pedido de compra apagado com sucesso!');
      fetchPurchaseRequests();
      recalculate();
    } catch (error) {
      console.error('Erro ao apagar pedido:', error);
      addNotification('error', 'Erro ao apagar pedido de compra');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRequest) return;
    
    if (!formData.description || !formData.amount || !formData.provider) {
      addNotification('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // 🔒 MELHORIA 7: Atualizar com notes/category metadata
      let notesValue = formData.notes || null;
      const metaData: any = {};
      if (formData.category && formData.category !== 'Outros') metaData.category = formData.category;
      if (formData.quantity && formData.quantity !== '1') metaData.quantity = parseFloat(formData.quantity);
      if (formData.unit && formData.unit !== 'un') metaData.unit = formData.unit;
      if (formData.expected_date) metaData.expected_date = formData.expected_date;
      if (Object.keys(metaData).length > 0) {
        notesValue = JSON.stringify({ text: formData.notes || '', ...metaData });
      }

      const { error } = await supabase
        .from('purchase_requests')
        .update({
          description: formData.description,
          amount: parseFloat(formData.amount),
          provider: formData.provider,
          notes: notesValue
        })
        .eq('id', editingRequest.id);

      if (error) throw error;

      addNotification('success', 'Pedido de compra atualizado com sucesso!');
      setFormData({ description: '', amount: '', provider: '', proforma_file: null, category: 'Outros', notes: '', quantity: '1', unit: 'un', expected_date: '' });
      setShowForm(false);
      setEditingRequest(null);
      fetchPurchaseRequests();
      recalculate();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      addNotification('error', 'Erro ao atualizar pedido de compra');
    }
  };

  const sendForApproval = async (request: PurchaseRequest) => {
    try {
      console.log('[PURCHASES] Enviando para aprovação:', request);
      
      const baseUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'https://rest-ia.vercel.app'
        : window.location.origin;
      
      // Enviar para todos os números de aprovação configurados
      const numbers = whatsappSettings.approvalNumbers.filter((n: string) => n && n.length > 5);
      if (numbers.length === 0) {
        addNotification('error', 'Configure pelo menos um número de WhatsApp nas definições.');
        return;
      }
      
      // Regras de aprovação
      const rulesStr = localStorage.getItem('purchaseApprovalRules');
      const rules = rulesStr ? JSON.parse(rulesStr) : { autoApproveLimit: 0, singleApproveLimit: 50000 };
      const required = request.amount <= rules.autoApproveLimit && rules.autoApproveLimit > 0 ? 0 : (request.amount <= rules.singleApproveLimit ? 1 : 2);
      
      // Se requer 2 owners, enviar para ambos; se requer 1, enviar para o primeiro
      const targetNumbers = required === 2 ? numbers : [numbers[0]];
      
      for (const targetNumber of targetNumbers) {
        const ownerParam = targetNumber.replace('+', '');
        const approvalUrl = `${baseUrl}/approve-purchase.html?id=${request.id}&owner=${ownerParam}`;
        
        let message = whatsappSettings.customMessage || 
          `*🛒 PEDIDO DE COMPRA PARA APROVAÇÃO*\n\n` +
          `*Descrição:* {description}\n` +
          `*Valor:* {amount}\n` +
          `*Fornecedor:* {provider}\n\n` +
          `*Para aprovar ou rejeitar, clique no link:*\n` +
          `{approvalLink}\n\n` +
          `*Este link expira após o uso.*`;
        
        message = message
          .replace('{description}', request.description)
          .replace('{amount}', formatKz(request.amount))
          .replace('{provider}', request.provider)
          .replace('{approvalLink}', approvalUrl);
        
        if (required === 2) {
          message += '\n\n⚠️ _Este valor requer aprovação de ambos os owners._';
        }
        
        const whatsappUrl = `https://wa.me/${targetNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
      
      addNotification('success', `Link de aprovação enviado para ${targetNumbers.length} owner(s) via WhatsApp!`);
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
      case 'parcial': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'aprovado': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejeitado': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pago': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock size={16} />;
      case 'parcial': return <Clock size={16} />;
      case 'aprovado': return <CheckCircle size={16} />;
      case 'rejeitado': return <XCircle size={16} />;
      case 'pago': return <DollarSign size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  // 🔒 MELHORIA 3: Filtragem avançada (status + busca + data + categoria + ordenação)
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Filtro por status
    if (statusFilter !== 'todos') {
      result = result.filter(req => req.status === statusFilter);
    }

    // Busca por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(req =>
        req.description.toLowerCase().includes(term) ||
        req.provider.toLowerCase().includes(term)
      );
    }

    // Filtro por data
    if (dateFilter.start) {
      result = result.filter(req => new Date(req.created_at) >= new Date(dateFilter.start));
    }
    if (dateFilter.end) {
      const endPlus = new Date(dateFilter.end);
      endPlus.setDate(endPlus.getDate() + 1);
      result = result.filter(req => new Date(req.created_at) < endPlus);
    }

    // Filtro por categoria (extrair do notes)
    if (categoryFilter !== 'todas') {
      result = result.filter(req => {
        try {
          const parsed = JSON.parse(req.notes || '');
          return parsed.category === categoryFilter;
        } catch (_) {
          return categoryFilter === 'Outros' && (!req.notes || !req.notes.startsWith('{'));
        }
      });
    }

    // Ordenação
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [requests, statusFilter, searchTerm, dateFilter, categoryFilter, sortBy]);

  // 📊 MELHORIA 1: Calcular resumos para dashboard
  const summary = useMemo(() => {
    const pendente = requests.filter(r => r.status === 'pendente' || r.status === 'parcial');
    const aprovado = requests.filter(r => r.status === 'aprovado');
    const pago = requests.filter(r => r.status === 'pago');
    const rejeitado = requests.filter(r => r.status === 'rejeitado');
    const now = new Date();
    const pagoMes = pago.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      pendente: { count: pendente.length, total: pendente.reduce((s, r) => s + r.amount, 0) },
      aprovado: { count: aprovado.length, total: aprovado.reduce((s, r) => s + r.amount, 0) },
      pago: { count: pagoMes.length, total: pagoMes.reduce((s, r) => s + r.amount, 0) },
      rejeitado: { count: rejeitado.length, total: rejeitado.reduce((s, r) => s + r.amount, 0) }
    };
  }, [requests]);

  // 🔒 MELHORIA 5: Marcar como pago + upload recibo + sync expenses/cash_flow
  const handleMarkAsPaid = async () => {
    if (!payModalRequest) return;
    try {
      let receipt_url = '';

      // Upload recibo se existir
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt_${Date.now()}.${fileExt}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from('purchase-documents')
            .upload(fileName, receiptFile);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('purchase-documents')
              .getPublicUrl(fileName);
            receipt_url = publicUrl;
          }
        } catch (_) {
          try {
            const { error: uploadError2 } = await supabase.storage
              .from('documents')
              .upload(fileName, receiptFile);
            if (!uploadError2) {
              const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);
              receipt_url = publicUrl;
            }
          } catch (__) {}
        }
      }

      // 1. Atualizar status para pago
      const { error: updateError } = await supabase
        .from('purchase_requests')
        .update({
          status: 'pago',
          receipt_url: receipt_url || null
        })
        .eq('id', payModalRequest.id);

      if (updateError) throw updateError;

      // 2. Registar em cash_flow (type='saida')
      const { error: cashFlowError } = await supabase
        .from('cash_flow')
        .insert({
          amount: payModalRequest.amount,
          category: 'COMPRA',
          type: 'saida',
          description: `Compra: ${payModalRequest.description} (${payModalRequest.provider})`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (cashFlowError) {
        console.warn('[PURCHASES] Aviso: não foi possível registar em cash_flow:', cashFlowError);
      }

      // 3. Registar em expenses
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: `Compra: ${payModalRequest.description}`,
          amount_kz: payModalRequest.amount,
          category: 'compra',
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (expenseError) {
        console.warn('[PURCHASES] Aviso: não foi possível registar em expenses:', expenseError);
      }

      addNotification('success', 'Compra marcada como paga! Despesa registada no sistema.');
      setPayModalRequest(null);
      setReceiptFile(null);
      fetchPurchaseRequests();
      recalculate();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      addNotification('error', 'Erro ao marcar compra como paga');
    }
  };

  // Extrair categoria do notes para display
  const getCategory = (req: PurchaseRequest): string => {
    try {
      const parsed = JSON.parse(req.notes || '');
      return parsed.category || 'Outros';
    } catch (_) {
      return 'Outros';
    }
  };

  const saveWhatsappSettings = () => {
    localStorage.setItem('whatsappPurchaseSettings', JSON.stringify(whatsappSettings));
    localStorage.setItem('purchaseApprovalRules', JSON.stringify(approvalRules));
    addNotification('success', 'Configurações de Compras salvas com sucesso!');
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
    <div className="p-6 h-full overflow-y-auto bg-background text-slate-200 no-scrollbar">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Gestão de Compras</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Pedidos e Aprovações</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowChart(!showChart)}
            className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest"
            title="Ver gráficos"
          >
            <TrendingUp size={20} />
            Gráficos
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-xs tracking-widest"
            title="Configurar WhatsApp"
          >
            <Settings size={20} />
            Configurar
          </button>
          
          <button 
            onClick={() => { setShowForm(!showForm); setEditingRequest(null); }}
            className="bg-[#070b14] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-glow hover:brightness-110 transition-all font-black uppercase text-xs tracking-widest"
          >
            <Plus size={20} />
            Novo Pedido
          </button>
        </div>
      </header>

      {/* 📊 MELHORIA 1: Dashboard Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel rounded-2xl p-5 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-2">
            <Clock size={20} className="text-yellow-400" />
            <span className="text-[10px] font-black text-yellow-400/60 uppercase tracking-widest">Pendente</span>
          </div>
          <p className="text-2xl font-black text-white">{summary.pendente.count}</p>
          <p className="text-xs text-yellow-400/80 font-bold mt-1">{formatKz(summary.pendente.total)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border border-green-500/20 bg-green-500/5">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-[10px] font-black text-green-400/60 uppercase tracking-widest">Aprovado</span>
          </div>
          <p className="text-2xl font-black text-white">{summary.aprovado.count}</p>
          <p className="text-xs text-green-400/80 font-bold mt-1">{formatKz(summary.aprovado.total)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between mb-2">
            <Wallet size={20} className="text-blue-400" />
            <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">Pago (Mês)</span>
          </div>
          <p className="text-2xl font-black text-white">{summary.pago.count}</p>
          <p className="text-xs text-blue-400/80 font-bold mt-1">{formatKz(summary.pago.total)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between mb-2">
            <XCircle size={20} className="text-red-400" />
            <span className="text-[10px] font-black text-red-400/60 uppercase tracking-widest">Rejeitado</span>
          </div>
          <p className="text-2xl font-black text-white">{summary.rejeitado.count}</p>
          <p className="text-xs text-red-400/80 font-bold mt-1">{formatKz(summary.rejeitado.total)}</p>
        </div>
      </div>

      {/* 📊 MELHORIA 6: Gráficos */}
      {showChart && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#06b6d4]" />
              Gastos Mensais (6 meses)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  formatter={(v: number) => formatKz(v)}
                />
                <Bar dataKey="total" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-panel rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Store size={18} className="text-[#06b6d4]" />
              Top 5 Fornecedores
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={providerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} width={100} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  formatter={(v: number) => formatKz(v)}
                />
                <Bar dataKey="total" fill="#06b6d4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Painel de Configurações de WhatsApp */}
      {showSettings && (
        <div className="glass-panel p-6 rounded-2xl border border-[#070b14]/30 bg-[#070b14]/5 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Configurações de WhatsApp</h3>
            <button onClick={() => setShowSettings(false)} title="Fechar configurações" className="text-slate-400 hover:text-white transition-colors">
              <XCircle size={24} />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Número do Restaurante (quem envia)</label>
              <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={whatsappSettings.restaurantNumber || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsappSettings((prev: any) => ({...prev, restaurantNumber: e.target.value}))} placeholder="+244923000000" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Números dos Donos (quem aprova)</label>
              <div className="space-y-3">
                {whatsappSettings.approvalNumbers.map((number: string, index: number) => (
                  <div key={index} className="flex gap-3">
                    <input type="text" className="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateApprovalNumber(index, e.target.value)} placeholder="+244923000000" />
                    <button onClick={() => removeApprovalNumber(index)} title="Remover número" className="p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl hover:bg-red-500/30 transition-all"><Trash2 size={20} /></button>
                  </div>
                ))}
                <button onClick={addApprovalNumber} className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-all font-bold text-sm">+ Adicionar Número</button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Mensagem Personalizada</label>
              <textarea className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4] resize-none" rows={4} value={whatsappSettings.customMessage} onChange={e => setWhatsappSettings((prev: any) => ({...prev, customMessage: e.target.value}))} placeholder="Use {description}, {amount} e {approvalLink} como variáveis" />
              <div className="mt-2 text-xs text-slate-400">Variáveis: {'{description}'}, {'{amount}'}, {'{approvalLink}'}</div>
            </div>
            {/* Regras de Aprovação */}
            <div className="border-t border-white/10 pt-6">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Regras de Aprovação</label>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Auto-aprovação (sem owner) — valores até:</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="100" className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#06b6d4]" value={approvalRules.autoApproveLimit} onChange={e => setApprovalRules({...approvalRules, autoApproveLimit: parseFloat(e.target.value) || 0})} placeholder="0" />
                    <span className="text-xs text-slate-400">Kz</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">0 = desligado. Pedidos até este valor são aprovados automaticamente.</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Aprovação por 1 owner — valores até:</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="100" className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#06b6d4]" value={approvalRules.singleApproveLimit} onChange={e => setApprovalRules({...approvalRules, singleApproveLimit: parseFloat(e.target.value) || 0})} placeholder="50000" />
                    <span className="text-xs text-slate-400">Kz</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Acima deste valor, ambos os owners devem aprovar.</p>
                </div>
              </div>
            </div>
            <button onClick={saveWhatsappSettings} className="w-full py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-sm tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"><Save size={20} /> Salvar Configurações</button>
          </div>
        </div>
      )}

      {/* Formulário de Novo/Editar Pedido */}
      {showForm && (
        <div className="glass-panel p-6 rounded-2xl border border-[#070b14]/30 bg-[#070b14]/5 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">{editingRequest ? 'Editar Pedido de Compra' : 'Novo Pedido de Compra'}</h3>
            <button onClick={() => { setShowForm(false); setEditingRequest(null); setFormData({ description: '', amount: '', provider: '', proforma_file: null, category: 'Outros', notes: '', quantity: '1', unit: 'un', expected_date: '' }); }} title="Fechar formulário" className="text-slate-400 hover:text-white transition-colors"><XCircle size={24} /></button>
          </div>
          <form onSubmit={editingRequest ? handleUpdateSubmit : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Descrição do Item</label>
                <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Material de escritório, equipamento, etc." required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Valor (Kz)</label>
                <input type="number" step="0.01" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" required />
              </div>
              {/* MELHORIA 4: Quantidade e Unidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Quantidade</label>
                  <input type="number" step="0.01" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder="1" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Unidade</label>
                  <select title="Unidade de medida" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    <option value="un" className="bg-slate-800">Unidade</option>
                    <option value="kg" className="bg-slate-800">Kg</option>
                    <option value="l" className="bg-slate-800">Litro</option>
                    <option value="cx" className="bg-slate-800">Caixa</option>
                    <option value="m" className="bg-slate-800">Metro</option>
                    <option value="pct" className="bg-slate-800">Pacote</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fornecedor</label>
                <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} placeholder="Nome do fornecedor" required />
              </div>
              {/* MELHORIA 4: Categoria */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Categoria</label>
                <select title="Categoria do pedido" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="Outros" className="bg-slate-800">Outros</option>
                  <option value="Alimentos" className="bg-slate-800">Alimentos</option>
                  <option value="Bebidas" className="bg-slate-800">Bebidas</option>
                  <option value="Equipamento" className="bg-slate-800">Equipamento</option>
                  <option value="Material de Escritório" className="bg-slate-800">Material de Escritório</option>
                  <option value="Serviços" className="bg-slate-800">Serviços</option>
                  <option value="Limpeza" className="bg-slate-800">Limpeza</option>
                  <option value="Manutenção" className="bg-slate-800">Manutenção</option>
                </select>
              </div>
              {/* MELHORIA 4: Data prevista de entrega */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Data Prevista de Entrega (Opcional)</label>
                <input type="date" title="Data prevista de entrega" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" value={formData.expected_date} onChange={e => setFormData({...formData, expected_date: e.target.value})} />
              </div>
              {/* MELHORIA 4: Notas */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Notas / Observações</label>
                <textarea className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4] resize-none" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Observações sobre o pedido..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Proforma (Opcional)</label>
                <input type="file" title="Upload de proforma" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setFormData({...formData, proforma_file: e.target.files?.[0] || null})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#06b6d4]/10 file:text-[#06b6d4] file:text-xs file:font-black" />
                {formData.proforma_file && <p className="mt-2 text-xs text-[#06b6d4] font-bold">{formData.proforma_file.name}</p>}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Cancelar</button>
              <button type="submit" className="px-8 py-3 bg-[#06b6d4] text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center gap-2"><Send size={16} />{editingRequest ? 'Atualizar Pedido' : 'Enviar Pedido'}</button>
            </div>
          </form>
        </div>
      )}

      {/* 🔒 MELHORIA 3: Barra de busca + filtros avançados */}
      <div className="glass-panel rounded-2xl border border-white/5 mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por descrição ou fornecedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]" />
          </div>
          {/* Filtro de status */}
          <div className="flex items-center gap-1.5">
            {['todos', 'pendente', 'parcial', 'aprovado', 'rejeitado', 'pago'].map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-[#06b6d4] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {status === 'todos' ? 'Todos' : status}
              </button>
            ))}
          </div>
          {/* Toggle filtros avançados */}
          <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-1.5">
            <Filter size={14} />
            Filtros
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        {/* Filtros avançados */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data Início</label>
              <input type="date" title="Data inicial" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data Fim</label>
              <input type="date" title="Data final" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Categoria</label>
              <select title="Filtrar por categoria" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]">
                <option value="todas" className="bg-slate-800">Todas</option>
                <option value="Alimentos" className="bg-slate-800">Alimentos</option>
                <option value="Bebidas" className="bg-slate-800">Bebidas</option>
                <option value="Equipamento" className="bg-slate-800">Equipamento</option>
                <option value="Material de Escritório" className="bg-slate-800">Material de Escritório</option>
                <option value="Serviços" className="bg-slate-800">Serviços</option>
                <option value="Limpeza" className="bg-slate-800">Limpeza</option>
                <option value="Manutenção" className="bg-slate-800">Manutenção</option>
                <option value="Outros" className="bg-slate-800">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ordenar por</label>
              <select title="Ordenar por" value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]">
                <option value="date_desc" className="bg-slate-800">Mais recentes</option>
                <option value="date_asc" className="bg-slate-800">Mais antigos</option>
                <option value="amount_desc" className="bg-slate-800">Maior valor</option>
                <option value="amount_asc" className="bg-slate-800">Menor valor</option>
              </select>
            </div>
            <button onClick={() => { setSearchTerm(''); setDateFilter({start: '', end: ''}); setCategoryFilter('todas'); setSortBy('date_desc'); }} className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Limpar</button>
          </div>
        )}
      </div>

      {/* 📊 MELHORIA 2: Cards visuais modernos */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart size={22} className="text-[#06b6d4]" />
            Pedidos de Compra
          </h3>
          <span className="text-xs text-slate-400 font-bold">{filteredRequests.length} resultado{filteredRequests.length !== 1 ? 's' : ''}</span>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-400">Carregando pedidos...</span>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-slate-500 mb-4" />
            <p className="text-slate-400">Nenhum pedido de compra encontrado</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/10 transition-all group">
                {/* Header do card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded-lg">
                      {getCategory(request)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(request.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })}</span>
                </div>
                
                {/* Descrição */}
                <h4 className="text-white font-bold text-base mb-3 line-clamp-2">{request.description}</h4>
                
                {/* Detalhes em grid */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 text-xs">Valor:</span>
                    <span className="text-white font-black text-lg">{formatKz(request.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 text-xs">Fornecedor:</span>
                    <span className="text-white font-bold text-xs truncate ml-2 max-w-[150px]">{request.provider}</span>
                  </div>
                  {request.proforma_url && (
                    <a href={request.proforma_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#06b6d4] text-xs font-bold hover:underline">
                      <Eye size={12} /> Ver Proforma
                    </a>
                  )}
                  {request.receipt_url && (
                    <a href={request.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-400 text-xs font-bold hover:underline">
                      <FileText size={12} /> Ver Recibo
                    </a>
                  )}
                </div>
                
                {/* Botões de ação */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                  {request.status === 'pendente' && (
                    <>
                      <button onClick={() => sendForApproval(request)} className="flex-1 px-3 py-2 bg-[#06b6d4] text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-1.5" title="Enviar para aprovação">
                        <Send size={12} /> Enviar
                      </button>
                      <button onClick={() => handleEdit(request)} className="px-3 py-2 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all" title="Editar">
                        <Settings size={12} />
                      </button>
                    </>
                  )}
                  {request.status === 'aprovado' && (
                    <button onClick={() => { setPayModalRequest(request); setReceiptFile(null); }} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-1.5" title="Marcar como pago">
                      <DollarSign size={12} /> Marcar Pago
                    </button>
                  )}
                  <button onClick={() => handleDelete(request)} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all" title="Apagar">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔒 MELHORIA 5: Modal Marcar como Pago */}
      {payModalRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Marcar como Pago</h3>
              <button onClick={() => { setPayModalRequest(null); setReceiptFile(null); }} title="Fechar" className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Descrição:</span>
                  <span className="text-white font-bold">{payModalRequest.description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Valor:</span>
                  <span className="text-white font-black text-lg">{formatKz(payModalRequest.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Fornecedor:</span>
                  <span className="text-white font-bold">{payModalRequest.provider}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Upload de Recibo (Opcional)</label>
                <input type="file" title="Upload de recibo" accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-500/10 file:text-blue-400 file:text-xs file:font-black" />
                {receiptFile && <p className="mt-2 text-xs text-blue-400 font-bold">{receiptFile.name}</p>}
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-blue-400 text-xs text-center">ℹ️ Será registado automaticamente em despesas e cash_flow.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setPayModalRequest(null); setReceiptFile(null); }} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all">Cancelar</button>
                <button onClick={handleMarkAsPaid} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"><DollarSign size={18} /> Confirmar Pagamento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
