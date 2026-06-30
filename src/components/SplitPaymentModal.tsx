import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, DollarSign, CreditCard, QrCode, Building, Users, Split, CheckCircle } from 'lucide-react';
import type { PaymentMethod, PaymentSplit } from '../../types';
import type { AGTDocumentType } from '../types/agt';
import DocumentTypeSelector from './DocumentTypeSelector';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (splits: PaymentSplit[], documentType: AGTDocumentType) => void;
  orderNumber: string;
  totalAmount: number;
  orderItems?: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
}

interface SplitRow {
  id: string;
  amount: string;
  paymentMethod: string;
  customerName: string;
  customerNif: string;
  isConsumerFinal: boolean;
}

const paymentMethods = [
  { id: 'NUMERARIO', name: 'NUMERÁRIO', icon: DollarSign, color: 'bg-green-500' },
  { id: 'TPA / MULTICAIXA', name: 'TPA / MULTICAIXA', icon: CreditCard, color: 'bg-blue-500' },
  { id: 'QR CODE', name: 'QR CODE', icon: QrCode, color: 'bg-purple-500' },
  { id: 'TRANSFERENCIA', name: 'TRANSFERÊNCIA', icon: Building, color: 'bg-orange-500' }
];

const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', {
  style: 'currency', currency: 'AOA', maximumFractionDigits: 0
}).format(val).replace('AOA', '') + ' Kz';

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  totalAmount,
  orderItems
}) => {
  const [documentType, setDocumentType] = useState<AGTDocumentType>('FR');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom' | 'items'>('custom');
  const [equalCount, setEqualCount] = useState(2);
  const [splits, setSplits] = useState<SplitRow[]>([
    { id: '1', amount: '', paymentMethod: 'NUMERARIO', customerName: '', customerNif: '', isConsumerFinal: true },
    { id: '2', amount: '', paymentMethod: 'TPA / MULTICAIXA', customerName: '', customerNif: '', isConsumerFinal: true }
  ]);

  const parsedAmounts = useMemo(() => {
    return splits.map(s => parseFloat(s.amount) || 0);
  }, [splits]);

  const totalPaid = useMemo(() => parsedAmounts.reduce((sum, a) => sum + a, 0), [parsedAmounts]);
  const remaining = totalAmount - totalPaid;
  const isValid = Math.abs(remaining) <= 0.01 && totalPaid > 0;

  const handleAddSplit = () => {
    const newId = String(splits.length + 1);
    setSplits([...splits, { id: newId, amount: '', paymentMethod: 'NUMERARIO', customerName: '', customerNif: '', isConsumerFinal: true }]);
  };

  const handleRemoveSplit = (id: string) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter(s => s.id !== id));
  };

  const handleSplitChange = (id: string, field: keyof SplitRow, value: any) => {
    setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleEqualSplit = (count: number) => {
    setEqualCount(count);
    const perPerson = totalAmount / count;
    const newSplits: SplitRow[] = [];
    let distributed = 0;
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const rawAmt = isLast ? (totalAmount - distributed) : perPerson;
      const roundedAmt = parseFloat(rawAmt.toFixed(2));
      distributed += roundedAmt;
      newSplits.push({
        id: String(i + 1),
        amount: roundedAmt.toFixed(2),
        paymentMethod: 'NUMERARIO',
        customerName: '',
        customerNif: '',
        isConsumerFinal: true
      });
    }
    setSplits(newSplits);
  };

  const handleAutoDistribute = () => {
    setSplitMode('equal');
    const perPerson = totalAmount / splits.length;
    let distributed = 0;
    setSplits(splits.map((s, i) => {
      const isLast = i === splits.length - 1;
      const rawAmt = isLast ? (totalAmount - distributed) : perPerson;
      const roundedAmt = parseFloat(rawAmt.toFixed(2));
      distributed += roundedAmt;
      return { ...s, amount: roundedAmt.toFixed(2) };
    }));
  };

  const handleConfirm = () => {
    if (!isValid) return;

    const paymentSplits: PaymentSplit[] = splits.map((s, index) => ({
      id: `${Date.now()}-${index}`,
      orderId: orderNumber,
      amount: parseFloat(s.amount),
      paymentMethod: s.paymentMethod as PaymentMethod,
      customerName: s.customerName || undefined,
      customerNif: s.isConsumerFinal ? '999999999' : (s.customerNif || '999999999'),
      status: 'paid',
      created_at: new Date().toISOString()
    }));

    onConfirm(paymentSplits, documentType);
  };

  const resetAndClose = () => {
    setSplits([
      { id: '1', amount: '', paymentMethod: 'NUMERARIO', customerName: '', customerNif: '', isConsumerFinal: true },
      { id: '2', amount: '', paymentMethod: 'TPA / MULTICAIXA', customerName: '', customerNif: '', isConsumerFinal: true }
    ]);
    setSplitMode('custom');
    setEqualCount(2);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[250] backdrop-blur-sm">
      <div className="bg-[#0f172a] rounded-2xl p-5 w-full max-w-5xl mx-4 border border-slate-700 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
              <Split className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dividir Conta — Pedido #{orderNumber.slice(-6)}</h2>
              <p className="text-xs text-slate-400">Cada parcela gera a sua própria fatura</p>
            </div>
          </div>
          <button onClick={resetAndClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Fechar">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Total + Document Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 text-center">
            <p className="text-xs text-gray-400 mb-1">Total da Conta</p>
            <p className="text-2xl font-bold text-cyan-400">{formatKz(totalAmount)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 text-center">
            <p className="text-xs text-gray-400 mb-1">Pago</p>
            <p className={`text-2xl font-bold ${totalPaid > totalAmount ? 'text-red-400' : 'text-green-400'}`}>{formatKz(totalPaid)}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 text-center">
            <p className="text-xs text-gray-400 mb-1">Restante</p>
            <p className={`text-2xl font-bold ${Math.abs(remaining) < 0.01 ? 'text-green-400' : 'text-orange-400'}`}>
              {remaining > 0 ? formatKz(remaining) : (Math.abs(remaining) < 0.01 ? '✓' : formatKz(Math.abs(remaining)) + ' excesso')}
            </p>
          </div>
        </div>

        {/* Document Type */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 mb-4">
          <p className="text-xs text-gray-400 mb-2">Tipo de Documento Fiscal (aplica-se a todas as parcelas):</p>
          <DocumentTypeSelector value={documentType} onChange={setDocumentType} />
        </div>

        {/* Quick Split Modes */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setSplitMode('equal'); handleEqualSplit(equalCount); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${splitMode === 'equal' ? 'bg-cyan-500 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            <Users size={14} className="inline mr-1" /> Divisão Igual
          </button>
          <button
            onClick={() => setSplitMode('custom')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${splitMode === 'custom' ? 'bg-cyan-500 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            <Split size={14} className="inline mr-1" /> Valores Personalizados
          </button>
          <button
            onClick={handleAutoDistribute}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
          >
            Distribuir Igualmente
          </button>
        </div>

        {/* Equal Count Selector */}
        {splitMode === 'equal' && (
          <div className="flex items-center gap-3 mb-4 bg-slate-800 rounded-xl p-3 border border-slate-600">
            <span className="text-sm text-gray-300">Número de pessoas:</span>
            <button
              onClick={() => handleEqualSplit(Math.max(2, equalCount - 1))}
              className="w-8 h-8 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600"
            >-</button>
            <span className="text-lg font-bold text-cyan-400 w-8 text-center">{equalCount}</span>
            <button
              onClick={() => handleEqualSplit(Math.min(10, equalCount + 1))}
              className="w-8 h-8 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600"
            >+</button>
            <span className="text-xs text-slate-400 ml-2">= {formatKz(totalAmount / equalCount)} por pessoa</span>
          </div>
        )}

        {/* Splits List */}
        <div className="space-y-3 mb-4">
          {splits.map((split, index) => {
            const Icon = paymentMethods.find(m => m.id === split.paymentMethod)?.icon || DollarSign;
            return (
              <div key={split.id} className="bg-slate-800 rounded-xl p-3 border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400">Parcela {index + 1}</span>
                  {splits.length > 1 && (
                    <button
                      onClick={() => handleRemoveSplit(split.id)}
                      className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Remover parcela"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Amount */}
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={(e) => handleSplitChange(split.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">Método de Pagamento</label>
                    <select
                      title="Método de Pagamento"
                      value={split.paymentMethod}
                      onChange={(e) => handleSplitChange(split.id, 'paymentMethod', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {paymentMethods.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">Nome (Opcional)</label>
                    <input
                      type="text"
                      value={split.customerName}
                      onChange={(e) => handleSplitChange(split.id, 'customerName', e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      maxLength={100}
                    />
                  </div>

                  {/* NIF Toggle + Input */}
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">NIF</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSplitChange(split.id, 'isConsumerFinal', !split.isConsumerFinal)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${split.isConsumerFinal ? 'bg-cyan-500 text-black' : 'bg-slate-600 text-slate-300'}`}
                      >
                        {split.isConsumerFinal ? 'Cons. Final' : 'Com NIF'}
                      </button>
                      {!split.isConsumerFinal && (
                        <input
                          type="text"
                          value={split.customerNif}
                          onChange={(e) => handleSplitChange(split.id, 'customerNif', e.target.value.replace(/\D/g, ''))}
                          placeholder="NIF"
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          maxLength={15}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Split Button */}
        <button
          onClick={handleAddSplit}
          className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-all font-bold text-sm flex items-center justify-center gap-2 mb-4"
        >
          <Plus size={18} /> Adicionar Parcela
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={resetAndClose}
            className="flex-1 px-4 py-3 border border-red-500 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`flex-[2] px-4 py-3 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 ${
              isValid
                ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={18} />
            {isValid ? `Confirmar e Emitir ${splits.length} Faturas` : `Restante: ${formatKz(Math.abs(remaining))}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentModal;
