import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase_standalone';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PurchaseRequest {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  provider: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'pago';
  approval_token?: string;
  proforma_url?: string;
}

const ApprovePurchase = () => {
  const { id, token } = useParams<{ id: string; token: string }>();
  
  const [purchase, setPurchase] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [criticalError, setCriticalError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDebugInfo(`ID: ${id}, Token: ${token}, URL: ${window.location.href}`);
      
      const fetchPurchase = async () => {
        if (!id || !token) {
          setError('Link de aprovação inválido - ID ou Token em falta');
          setLoading(false);
          return;
        }

        try {
          console.log('[APPROVE] Buscando pedido:', id, token);
          setDebugInfo(prev => prev + `\nBuscando pedido: ${id}`);
          
          // Verificar se supabase está disponível
          if (!supabase) {
            setCriticalError('Supabase não inicializado');
            setLoading(false);
            return;
          }
          
          const { data, error } = await supabase
            .from('purchase_requests')
            .select('*')
            .eq('id', id)
            .single();

          if (error) {
            console.error('[APPROVE] Erro ao buscar pedido:', error);
            setDebugInfo(prev => prev + `\nErro Supabase: ${error.message}`);
            setError(`Erro ao buscar pedido: ${error.message}`);
            setLoading(false);
            return;
          }

          if (!data) {
            setError('Pedido não encontrado no banco de dados');
            setLoading(false);
            return;
          }

          // Verificar se já foi processado
          if (data.status !== 'pendente') {
            setError(`Este pedido já foi ${data.status === 'aprovado' ? 'aprovado' : data.status === 'rejeitado' ? 'rejeitado' : 'processado'}`);
            setLoading(false);
            return;
          }

          setPurchase(data);
          setDebugInfo(prev => prev + `\nPedido encontrado: ${data.description}`);
          console.log('[APPROVE] Pedido encontrado:', data);
          setLoading(false);
          
        } catch (err: any) {
          console.error('[APPROVE] Erro:', err);
          setDebugInfo(prev => prev + `\nErro geral: ${err.message}`);
          setError(`Erro ao carregar pedido: ${err.message}`);
          setLoading(false);
        }
      };

      fetchPurchase();
    } catch (outerErr: any) {
      console.error('[APPROVE] Erro crítico no useEffect:', outerErr);
      setCriticalError(`Erro crítico: ${outerErr.message}`);
      setLoading(false);
    }
  }, [id, token]);

  const handleApprove = async () => {
    if (!purchase) return;
    
    // 🔍 DEBUG: Verificar dados da compra
    console.log('[APPROVE] DEBUG - Dados da compra:', {
      id: purchase.id,
      description: purchase.description,
      amount: purchase.amount,
      amountType: typeof purchase.amount,
      provider: purchase.provider,
      fullPurchase: purchase
    });
    
    // Validar se amount existe
    if (purchase.amount === undefined || purchase.amount === null || isNaN(purchase.amount)) {
      console.error('[APPROVE] ❌ ERRO: purchase.amount é inválido:', purchase.amount);
      setError('Erro: Valor da compra não está definido. Contacte o suporte.');
      return;
    }
    
    const amountValue = Number(purchase.amount);
    if (amountValue <= 0) {
      console.error('[APPROVE] ❌ ERRO: purchase.amount deve ser maior que zero:', amountValue);
      setError('Erro: Valor da compra deve ser maior que zero.');
      return;
    }
    
    setProcessing(true);
    setAction('approve');
    
    try {
      console.log('[APPROVE] Aprovando pedido:', purchase.id);
      
      // 1. Atualizar status do pedido
      const { error: updateError } = await supabase
        .from('purchase_requests')
        .update({ 
          status: 'aprovado',
          approved_at: new Date().toISOString()
        })
        .eq('id', purchase.id);

      if (updateError) {
        console.error('[APPROVE] Erro ao aprovar:', updateError);
        setError('Erro ao aprovar pedido: ' + updateError.message);
        setProcessing(false);
        return;
      }

      // 2. 🚀 REGISTRAR EM CASH_FLOW COMO DESPESA (só quando aprovado)
      console.log('[APPROVE] Registrando despesa em cash_flow com amount:', amountValue);
      const { data: cashFlowData, error: cashFlowError } = await supabase
        .from('cash_flow')
        .insert({
          amount: amountValue,
          type: 'saida',
          category: 'Compras',
          description: `Compra Aprovada: ${purchase.description} - ${purchase.provider}`
        })
        .select();

      if (cashFlowError) {
        console.error('[APPROVE] ❌ Erro ao registrar em cash_flow:', cashFlowError);
        setError('Erro ao registrar em cash_flow: ' + cashFlowError.message);
        setProcessing(false);
        return;
      } else {
        console.log('[APPROVE] ✅ Registrado em cash_flow com sucesso:', cashFlowData);
      }

      // 3. 🚀 CRIAR DESPESA NA TABELA EXPENSES (para atualizar dashboard)
      console.log('[APPROVE] Criando despesa na tabela expenses com amount_kz:', amountValue);
      
      // 📅 CORREÇÃO: Usar data de Luanda (WAT) para consistência com o dashboard
      const agora = new Date();
      const luandaOffset = -1; // WAT é UTC-1
      const dataLuanda = new Date(agora.getTime() + (luandaOffset * 60 * 60 * 1000));
      const dataISO = dataLuanda.toISOString();
      
      console.log('[APPROVE] Data UTC:', agora.toISOString(), '-> Data Luanda:', dataISO);
      
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: `Compra Aprovada: ${purchase.description} - ${purchase.provider}`,
          amount_kz: amountValue,
          category: 'COMPRAS',
          status: 'PENDING',
          created_at: dataISO
        })
        .select();

      if (expenseError) {
        console.error('[APPROVE] ❌ Erro ao criar despesa:', expenseError);
        alert('Compra aprovada, mas erro ao criar despesa: ' + expenseError.message);
      } else {
        console.log('[APPROVE] ✅ Despesa criada com sucesso no dashboard:', expenseData);
      }

      console.log('[APPROVE] ✅ Pedido aprovado com sucesso!');
      setAction('approve');
      
    } catch (err: any) {
      console.error('[APPROVE] Erro crítico:', err);
      setError('Erro crítico ao aprovar: ' + err.message);
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!purchase) return;
    
    setProcessing(true);
    setAction('reject');
    
    try {
      console.log('[APPROVE] Rejeitando pedido:', purchase.id);
      
      const { error } = await supabase
        .from('purchase_requests')
        .update({ 
          status: 'rejeitado',
          approved_at: new Date().toISOString()
        })
        .eq('id', purchase.id);

      if (error) {
        console.error('[APPROVE] Erro ao rejeitar:', error);
        setError('Erro ao rejeitar pedido');
        return;
      }

      console.log('[APPROVE] Pedido rejeitado com sucesso!');
      setAction('reject');
      
    } catch (err) {
      console.error('[APPROVE] Erro:', err);
      setError('Erro ao rejeitar pedido');
    } finally {
      setProcessing(false);
    }
  };

  // Format currency
  const formatAKZ = (value: number): string => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace('AOA', 'AKZ');
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#06b6d4] mx-auto mb-4" />
          <p className="text-white text-lg">Carregando pedido...</p>
          {criticalError && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-xs">{criticalError}</p>
            </div>
          )}
          <p className="text-slate-500 text-xs mt-2 font-mono">{debugInfo}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-500 mb-2">Erro</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <div className="bg-slate-900/50 rounded-lg p-3 mb-6 text-left">
              <p className="text-slate-500 text-xs font-mono whitespace-pre-wrap">{debugInfo}</p>
            </div>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (action) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className={`${
            action === 'approve' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
          } border rounded-2xl p-8 text-center`}>
            {action === 'approve' ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            <h1 className={`text-2xl font-bold mb-2 ${
              action === 'approve' ? 'text-green-500' : 'text-red-500'
            }`}>
              {action === 'approve' ? 'Compra Aprovada!' : 'Compra Rejeitada!'}
            </h1>
            <p className={`mb-6 ${
              action === 'approve' ? 'text-green-400' : 'text-red-400'
            }`}>
              {action === 'approve' 
                ? 'Compra aprovada com sucesso! O stock será atualizado.' 
                : 'Compra rejeitada com sucesso!'
              }
            </p>
            <button
              onClick={() => window.close()}
              className={`px-6 py-3 text-white rounded-xl font-semibold transition-colors ${
                action === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <div className="glass-panel p-8 rounded-2xl border border-white/5">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#06b6d4] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Aprovação de Compra</h1>
            <p className="text-slate-400">Revise os detalhes e aprove ou rejeite esta compra</p>
          </div>

          {purchase && (
            <div className="space-y-6 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Detalhes da Compra</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Descrição</p>
                    <p className="text-white font-semibold">{purchase.description}</p>
                  </div>
                  
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Valor</p>
                    <p className="text-white font-semibold text-xl">{formatAKZ(purchase.amount)}</p>
                  </div>
                  
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Fornecedor</p>
                    <p className="text-white font-semibold">{purchase.provider}</p>
                  </div>
                  
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Data</p>
                    <p className="text-white font-semibold">{formatDate(purchase.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-semibold mb-1">Atenção</p>
                    <p className="text-yellow-300 text-sm">
                      Ao aprovar esta compra, o status será atualizado e o link de aprovação será invalidado.
                      Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {processing && action === 'approve' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {processing && action === 'approve' ? 'Processando...' : 'APROVAR'}
            </button>

            <button
              onClick={handleReject}
              disabled={processing}
              className="py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {processing && action === 'reject' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {processing && action === 'reject' ? 'Processando...' : 'REJEITAR'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => window.close()}
              className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              Cancelar e fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovePurchase;
