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
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header Discreto */}
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-white mb-1">Tasca do Vereda</h1>
        <p className="text-gray-400 text-sm">MENU DIGITAL</p>
      </div>

      {/* Grid de Produtos - FIXO 2 COLUNAS COMO NA FOTO */}
      <div className="p-4 grid grid-cols-2 gap-4 max-w-6xl mx-auto">
        {items.map((item: any) => (
          <div key={item.id} className="bg-[#111827] rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative">
            {/* Imagem GRANDE do Produto */}
            <div className="h-48 bg-[#1a1f2e] relative rounded-t-3xl overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover rounded-t-3xl"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1f2e] flex items-center justify-center rounded-t-3xl">
                  <Package size={32} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="p-4">
              <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">{item.name}</h3>
              <p className="text-white font-bold text-xl">{item.price.toLocaleString('pt-AO')} AOA</p>
            </div>

            {/* Botão Adicionar */}
            <button
              onClick={() => addToCart(item)}
              className="absolute bottom-4 right-4 w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg hover:bg-cyan-400 transition-colors"
            >
              <Plus size={24} className="text-white" />
            </button>
          </div>
        ))}
      </div>

      {/* Botão WHATSAPP VERDE - EXATAMENTE COMO NA FOTO */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowSummary(true)}
          className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 hover:bg-green-400 transition-all hover:scale-110 z-50"
        >
          <ShoppingCart size={24} />
          <span className="font-bold">Faça a sua Encomenda</span>
          <span className="bg-white text-green-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}

      {/* Modal de Resumo */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
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
            <div className="bg-black/50 backdrop-blur-md rounded-xl p-4 space-y-2 mb-6 border border-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Subtotal</span>
                <span className="text-white">{calculateSubtotal().toLocaleString('pt-AO')} AOA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 flex items-center gap-2">
                  <Truck size={16} />
                  Taxa de Entrega
                </span>
                <span className="text-white">1.000 AOA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 flex items-center gap-2">
                  <Package size={16} />
                  Embalagem (300 a 500 AKZ)
                </span>
                <span className="text-white">500 AOA</span>
              </div>
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-green-400">Total Geral</span>
                  <span className="text-green-400">{calculateTotal().toLocaleString('pt-AO')} AOA</span>
                </div>
              </div>
            </div>

            {/* Botão Finalizar */}
            <button
              onClick={sendToWhatsApp}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-3"
            >
              <ShoppingCart size={20} />
              Enviar para WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
