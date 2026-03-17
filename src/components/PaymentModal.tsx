import React from 'react';
import { X, DollarSign, CreditCard, Smartphone, QrCode, Building } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
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

  const paymentMethods = [
    { id: 'NUMERARIO', name: 'NUMERÁRIO', icon: DollarSign, color: 'bg-green-500' },
    { id: 'TPA', name: 'TPA', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'QR_CODE', name: 'QR CODE', icon: QrCode, color: 'bg-purple-500' },
    { id: 'TRANSFERENCIA', name: 'TRANSFERÊNCIA', icon: Building, color: 'bg-orange-500' }
  ];

  const handleConfirm = () => {
    if (!selectedMethod) {
      alert('Por favor, selecione um método de pagamento');
      return;
    }
    onConfirm(selectedMethod);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Finalizar Pagamento - Pedido #{orderNumber}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fechar"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Valor Total */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">Valor Total</p>
          <p className="text-3xl font-bold text-gray-900">
            {new Intl.NumberFormat('pt-AO', {
              style: 'currency',
              currency: 'AOA',
              maximumFractionDigits: 0
            }).format(totalAmount).replace('AOA', '')} Kz
          </p>
        </div>

        {/* Métodos de Pagamento */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Selecione o Método de Pagamento:</p>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`${method.color} w-12 h-12 rounded-lg flex items-center justify-center mb-2 mx-auto`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{method.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedMethod}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
              selectedMethod
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
