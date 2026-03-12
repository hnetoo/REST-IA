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
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      console.log('[PublicMenu] Iniciando carregamento de produtos (tabela products)...');
      try {
        // ✅ TABELA PLURAL PADRÃO SUPABASE
        const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
        console.log('[PublicMenu] Dados recebidos da tabela products:', { data, error });
        
        if (error) {
          console.error('[PublicMenu] Erro ao carregar produtos:', error);
        } else if (data) {
          console.log('[PublicMenu] Produtos carregados:', data.length, 'itens');
          setItems(data);
        } else {
          console.log('[PublicMenu] Nenhum produto encontrado na tabela products');
        }
      } catch (err) {
        console.error('[PublicMenu] Erro crítico:', err);
      } finally {
        setLoading(false);
      }
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
        image: item.image_url 
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
      message += `• ${item.quantity}x ${item.name} - ${item.price.toLocaleString('pt-AO')} Kz\n`;
    });
    
    message += `\n💰 *RESUMO FINANCEIRO:*\n`;
    message += `• Subtotal: ${subtotal.toLocaleString('pt-AO')} Kz\n`;
    message += `• Taxa de Entrega: ${delivery.toLocaleString('pt-AO')} Kz\n`;
    message += `• Embalagem: ${packaging.toLocaleString('pt-AO')} Kz\n`;
    message += `• *TOTAL GERAL: ${total.toLocaleString('pt-AO')} Kz*\n\n`;
    message += `📍 *Endereço de entrega:* [Por favor, forneça seu endereço]\n`;
    message += `📞 *Contato:* [Por favor, forneça seu telefone]\n\n`;
    message += `Obrigado pela preferência! 🙏`;
    
    const whatsappUrl = `https://wa.me/244976825520?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <div className="p-10 text-center font-bold text-white">A carregar menu da Tasca...</div>;
  
  if (!loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum produto disponível</h2>
          <p className="text-gray-400">Verificando o estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header com Logotipo */}
      <div className="bg-[#0a0f1a] p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-lg">TV</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TASCA DO VEREDA</h1>
            <p className="text-gray-400 text-sm">MENU DIGITAL</p>
            <p className="text-gray-500 text-xs mt-1">
              Dom a Qua: 07:30 – 22:00 | Qui a Sáb: 07:30 – 00:00
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 pb-4">
        <div className="flex gap-2 overflow-x-auto">
          <button className="px-4 py-2 bg-cyan-500 text-white rounded-full text-sm font-medium whitespace-nowrap">
            Todos
          </button>
          <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-700">
            Petiscos
          </button>
          <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-700">
            Pratos
          </button>
          <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-700">
            Bebidas
          </button>
        </div>
      </div>

      {/* Grid de Produtos Responsivo */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
        {items.map((item: any) => (
          <div key={item.id} className="bg-[#111827] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 relative cursor-pointer" onClick={() => setSelectedProduct(item)}>
            {/* Imagem */}
            <div className="h-40 bg-[#1a1f2e] relative">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1f2e] flex items-center justify-center">
                  <Package size={32} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* Conteúdo */}
            <div className="p-4">
              <h3 className="text-white font-bold text-base mb-2">{item.name}</h3>
              <div className="flex justify-between items-center">
                <p className="text-cyan-400 font-bold text-lg">{item.price.toLocaleString('pt-AO')} Kz</p>
                <button
                  onClick={() => addToCart(item)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >
                  <Plus size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Carrinho WhatsApp */}
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

      {/* Modal de Detalhe do Produto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] rounded-[2rem] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-cyan-400">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Imagem Ampliada */}
            <div className="h-64 bg-[#1a1f2e] rounded-xl mb-6 relative">
              {selectedProduct.image_url ? (
                <img 
                  src={selectedProduct.image_url} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1f2e] flex items-center justify-center rounded-xl">
                  <Package size={48} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* Detalhes */}
            <div className="mb-6">
              <p className="text-gray-300 text-lg mb-4">
                Produto selecionado da Tasca do Vereda. Clique abaixo para adicionar ao seu pedido.
              </p>
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">
                  {selectedProduct.price.toLocaleString('pt-AO')} Kz
                </p>
              </div>
            </div>

            {/* Botão de Ação */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-xl font-bold text-lg transition-colors"
              >
                Adicionar ao Carrinho
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resumo */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111827] rounded-[2rem] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
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
                    <p className="text-cyan-400 text-sm">{item.price.toLocaleString('pt-AO')} Kz</p>
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
            <div className="bg-black/50 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{calculateSubtotal().toLocaleString('pt-AO')} Kz</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-2">
                  <Truck size={16} />
                  Taxa de Entrega
                </span>
                <span className="text-white">1.000 Kz</span>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-green-400">Total</span>
                  <span className="text-green-400">{calculateTotal().toLocaleString('pt-AO')} Kz</span>
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
