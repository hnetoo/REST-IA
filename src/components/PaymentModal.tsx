import React from 'react';
import { X, DollarSign, CreditCard, Smartphone, QrCode, Building } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, customerNif?: string) => void;
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
  const [customerNif, setCustomerNif] = React.useState<string>('');

  const paymentMethods = [
    { id: 'CASH', name: 'NUMERÁRIO', icon: DollarSign, color: 'bg-green-500' },
    { id: 'TPA', name: 'TPA', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'QR_CODE', name: 'QR CODE', icon: QrCode, color: 'bg-purple-500' },
    { id: 'TRANSFER', name: 'TRANSFERÊNCIA', icon: Building, color: 'bg-orange-500' }
  ];

  const handleConfirm = () => {
    if (!selectedMethod) {
      alert('Por favor, selecione um método de pagamento');
      return;
    }
    onConfirm(selectedMethod, customerNif || undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#0f172a] rounded-2xl p-6 w-full max-w-md mx-4 border border-slate-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            Finalizar Pagamento - Pedido #{orderNumber}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Fechar"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Valor Total */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-600">
          <p className="text-sm text-gray-400 mb-1">Valor Total</p>
          <p className="text-4xl font-bold text-cyan-400">
            {new Intl.NumberFormat('pt-AO', {
              style: 'currency',
              currency: 'AOA',
              maximumFractionDigits: 0
            }).format(totalAmount).replace('AOA', '')} Kz
          </p>
        </div>

        {/* NIF do Cliente */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-600">
          <p className="text-sm text-gray-400 mb-1">NIF do Cliente (Opcional)</p>
          <input
            type="text"
            value={customerNif}
            onChange={(e) => setCustomerNif(e.target.value.replace(/\D/g, ''))}
            placeholder="Digite o NIF (apenas números)"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            maxLength={15}
          />
        </div>

        {/* Métodos de Pagamento */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-300 mb-3">Selecione o Método de Pagamento:</p>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === method.id
                      ? 'border-cyan-500 bg-slate-700'
                      : 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className={`${method.color} w-12 h-12 rounded-lg flex items-center justify-center mb-2 mx-auto`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <p className="text-sm font-medium text-white">{method.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-red-500 text-red-400 rounded-xl hover:bg-red-500/10 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMethod}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
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
  );
};

export default PaymentModal;
