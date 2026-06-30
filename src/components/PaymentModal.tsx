import React from 'react';
import { X, DollarSign, CreditCard, QrCode, Building } from 'lucide-react';
import DocumentTypeSelector from './DocumentTypeSelector';
import type { AGTDocumentType } from '../types/agt';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, customerName?: string, customerNif?: string, documentType?: AGTDocumentType) => void;
  orderNumber: string;
  totalAmount: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  totalAmount
}) => {
  const [selectedMethod, setSelectedMethod] = React.useState<string>('');
  const [customerName, setCustomerName] = React.useState<string>('');
  const [customerNif, setCustomerNif] = React.useState<string>('');
  const [documentType, setDocumentType] = React.useState<AGTDocumentType>('FR');
  const [isConsumerFinal, setIsConsumerFinal] = React.useState(true);

  const paymentMethods = [
    { id: 'NUMERARIO', name: 'NUMERÁRIO', icon: DollarSign, color: 'bg-green-500' },
    { id: 'TPA / MULTICAIXA', name: 'TPA / MULTICAIXA', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'QR CODE', name: 'QR CODE', icon: QrCode, color: 'bg-purple-500' },
    { id: 'TRANSFERENCIA', name: 'TRANSFERÊNCIA', icon: Building, color: 'bg-orange-500' }
  ];

  const handleConfirm = () => {
    if (!selectedMethod) {
      alert('Por favor, selecione um método de pagamento');
      return;
    }
    const nifToUse = isConsumerFinal ? '999999999' : (customerNif || '999999999');
    onConfirm(selectedMethod, customerName || undefined, nifToUse, documentType);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#0f172a] rounded-2xl p-5 w-full max-w-4xl mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">
            Finalizar Pagamento — Pedido #{orderNumber}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Fechar"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* COLUNA ESQUERDA: Valor + Documento + Cliente */}
          <div className="space-y-3">
            {/* Valor Total */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 text-center">
              <p className="text-xs text-gray-400 mb-1">Valor Total</p>
              <p className="text-3xl font-bold text-cyan-400">
                {new Intl.NumberFormat('pt-AO', {
                  style: 'currency',
                  currency: 'AOA',
                  maximumFractionDigits: 0
                }).format(totalAmount).replace('AOA', '')} Kz
              </p>
            </div>

            {/* Tipo de Documento Fiscal */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
              <p className="text-xs text-gray-400 mb-2">Tipo de Documento Fiscal:</p>
              <DocumentTypeSelector
                value={documentType}
                onChange={(type) => {
                  setDocumentType(type);
                  if (type === 'TV' || type === 'FR') {
                    setIsConsumerFinal(true);
                  }
                }}
              />
            </div>

            {/* Nome do Cliente */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
              <p className="text-xs text-gray-400 mb-1">Nome do Cliente / Empresa (Opcional)</p>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                maxLength={100}
              />
            </div>

            {/* Consumidor Final Toggle */}
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-3 border border-slate-600">
              <button
                type="button"
                onClick={() => setIsConsumerFinal(!isConsumerFinal)}
                title={isConsumerFinal ? 'Desativar Consumidor Final' : 'Ativar Consumidor Final'}
                aria-label={isConsumerFinal ? 'Desativar Consumidor Final' : 'Ativar Consumidor Final'}
                className={`relative w-11 h-6 rounded-full transition-colors ${isConsumerFinal ? 'bg-cyan-500' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isConsumerFinal ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-gray-300">Consumidor Final (sem NIF)</span>
            </div>

            {/* NIF do Cliente — só aparece se NÃO for consumidor final */}
            {!isConsumerFinal && (
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-600 animate-in fade-in duration-200">
                <p className="text-xs text-gray-400 mb-1">NIF do Cliente (Obrigatório)</p>
                <input
                  type="text"
                  value={customerNif}
                  onChange={(e) => setCustomerNif(e.target.value.replace(/\D/g, ''))}
                  placeholder="Digite o NIF"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  maxLength={15}
                />
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: Métodos de Pagamento + Botões */}
          <div className="space-y-3">
            {/* Métodos de Pagamento */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-600">
              <p className="text-xs font-medium text-gray-300 mb-2">Selecione o Método de Pagamento:</p>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedMethod === method.id
                          ? 'border-cyan-500 bg-slate-700'
                          : 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className={`${method.color} w-10 h-10 rounded-lg flex items-center justify-center mb-1 mx-auto`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <p className="text-xs font-medium text-white">{method.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-red-500 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedMethod}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${
                  selectedMethod
                    ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                    : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirmar e Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
