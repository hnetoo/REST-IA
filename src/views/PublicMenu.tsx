import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ShoppingCart, X, Package, Truck } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

const PublicMenu = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('*').eq('active', true);
      if (data) setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: 1,
        image: item.image 
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(prev => prev.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const delivery = 1000; // Taxa de Entrega
    const packaging = 500; // Embalagem
    return subtotal + delivery + packaging;
  };

  const sendToWhatsApp = () => {
    const subtotal = calculateSubtotal();
    const delivery = 1000;
    const packaging = 500;
    const total = calculateTotal();
    
    let message = `🍽️ *ENCOMENDA - TASCA DO VEREDA*\n\n`;
    message += `📋 *RESUMO DO PEDIDO:*\n\n`;
    
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - ${item.price.toLocaleString('pt-AO')} AOA\n`;
    });
    
    message += `\n💰 *RESUMO FINANCEIRO:*\n`;
    message += `• Subtotal: ${subtotal.toLocaleString('pt-AO')} AOA\n`;
    message += `• Taxa de Entrega: ${delivery.toLocaleString('pt-AO')} AOA\n`;
    message += `• Embalagem: ${packaging.toLocaleString('pt-AO')} AOA\n`;
    message += `• *TOTAL GERAL: ${total.toLocaleString('pt-AO')} AOA*\n\n`;
    message += `📍 *Endereço de entrega:* [Por favor, forneça seu endereço]\n`;
    message += `📞 *Contato:* [Por favor, forneça seu telefone]\n\n`;
    message += `Obrigado pela preferência! 🙏`;
    
    const whatsappUrl = `https://wa.me/244976835520?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <div className="p-10 text-center font-bold text-white">A carregar menu da Tasca...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-black p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Tasca do Vereda</h1>
        <p className="text-gray-400 text-lg">MENU DIGITAL</p>
      </div>

      {/* Grid de Produtos */}
      <div className="p-4 grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {items.map((item: any) => (
          <div key={item.id} className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 relative">
            {/* Imagem */}
            <div className="h-40 bg-gray-800 relative">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Package size={32} className="text-gray-600" />
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="p-4">
              <h3 className="text-white font-bold text-base mb-2">{item.name}</h3>
              <div className="flex justify-between items-center">
                <p className="text-white font-bold text-xl">{item.price.toLocaleString('pt-AO')} AOA</p>
                <button
                  onClick={() => addToCart(item)}
                  className="bg-green-500 hover:bg-green-400 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                >
                  <Plus size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Carrinho */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowSummary(true)}
          className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-400 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 transition-all z-50"
        >
          <ShoppingCart size={24} />
          <span className="font-bold">Faça a sua Encomenda</span>
          <span className="bg-white text-green-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-cyan-400">Resumo do Pedido</h2>
              <button
                onClick={() => setShowSummary(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Itens do Carrinho */}
            <div className="space-y-3 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{item.name}</h4>
                    <p className="text-cyan-400 text-sm">{item.price.toLocaleString('pt-AO')} AOA</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{calculateSubtotal().toLocaleString('pt-AO')} AOA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2">
                  <Truck size={16} />
                  Taxa de Entrega
                </span>
                <span className="text-white">1.000 AOA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2">
                  <Package size={16} />
                  Embalagem
                </span>
                <span className="text-white">500 AOA</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-green-400">Total</span>
                  <span className="text-green-400">{calculateTotal().toLocaleString('pt-AO')} AOA</span>
                </div>
              </div>
            </div>

            {/* Botão Finalizar */}
            <button
              onClick={sendToWhatsApp}
              className="w-full bg-green-500 hover:bg-green-400 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3"
            >
              <ShoppingCart size={20} />
              Enviar por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
