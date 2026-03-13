import React, { useEffect, useState } from 'react';
import { Database } from '../types/supabase';
import { Plus, Package, Utensils, ShoppingCart, X, Minus, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

// Usar tipos do Supabase para type safety
type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Category;
};
type Category = Database['public']['Tables']['categories']['Row'];

const PublicMenu = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [filteredItems, setFilteredItems] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function load() {
      console.log('[PublicMenu] Carregando produtos da tabela products com categorias...');
      try {
        // ✅ TABELA PLURAL PADRÃO SUPABASE - SEM FILTROS FIXOS
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .eq('is_active', true); // Apenas produtos ativos
        
        if (productsError) {
          console.error('[PublicMenu] Erro ao carregar produtos:', productsError);
          return;
        }

        console.log('[PublicMenu] Produtos carregados:', productsData);
        setItems(productsData || []);
        setFilteredItems(productsData || []); // Inicializa com todos os produtos
      } catch (error) {
        console.error('[PublicMenu] Exceção ao carregar produtos:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ✅ FUNÇÃO PARA FILTRAR POR CATEGORIA
  const filterByCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    
    if (categoryName === 'Todos') {
      setFilteredItems(items); // Mostra todos os produtos
    } else {
      const filtered = items.filter(item => item.categories?.name === categoryName);
      setFilteredItems(filtered); // Mostra apenas produtos da categoria
    }
  };

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
    const deliveryFee = cart.length >= 3 ? 500 : 300; // Taxa Takeaway: 300 a 500 Kz
    const total = subtotal + deliveryFee;
    
    let message = `Olá! Gostaria de encomendar:\n`;
    
    // Lista de itens formatada
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name}\n`;
    });
    
    message += `\nSubtotal: ${subtotal.toLocaleString('pt-AO')} Kz.\n`;
    message += `Taxa Takeaway: ${deliveryFee.toLocaleString('pt-AO')} Kz.\n`;
    message += `Total: ${total.toLocaleString('pt-AO')} Kz.\n\n`;
    message += `Por favor, forneça os seguintes dados:\n`;
    message += `Nome:\n`;
    message += `Telefone:\n`;
    message += `Morada de Entrega:\n`;
    message += `(Se estiver no restaurante, indique o Nome e Número da Mesa).`;
    
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
    <div className="h-screen bg-[#0a0f1a] text-white flex flex-col overflow-x-hidden w-full">
      {/* LOGO (FIX DEFINITIVO) */}
      <div className="bg-[#0a0f1a] p-5 flex items-center gap-4 border-b border-gray-800">
        <div className="w-14 h-14 rounded-full border-2 border-cyan-500 overflow-hidden flex-shrink-0 bg-gray-900 flex items-center justify-center">
          <img 
            src="/logo-tasca-vereda.png" 
            className="w-full h-full object-cover" 
            alt="Logo"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <Package className="text-cyan-500" size={24} /> 
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-none">TASCA DO VEREDA</h1>
          <p className="text-cyan-500 text-xs font-bold uppercase mt-1">Menu Digital</p>
        </div>
      </div>

      {/* CATEGORIAS (SCROLL FLUIDO) */}
      <div className="w-full flex-shrink-0 bg-[#0a0f1a] border-b border-gray-800">
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar py-4 px-4 gap-3">
          {/* Botão Todos */}
          <button onClick={() => filterByCategory('Todos')} className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase ${selectedCategory === 'Todos' ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'}`}>Todos</button>
          
          {/* Mapeamento Dinâmico */}
          {Array.from(new Set(items.map(i => i.categories?.name).filter(Boolean))).map(cat => (
            <button key={cat} onClick={() => filterByCategory(cat!)} className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase ${selectedCategory === cat ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* CARDS COMPACTOS (LARGURA FIXA NO ECRÃ) */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
        {filteredItems.map((item) => (
          <div key={item.id} className="w-full bg-[#111827] rounded-xl border border-gray-800 flex flex-col overflow-hidden" onClick={() => setSelectedProduct(item)}>
            <div className="h-32 w-full flex-shrink-0">
              {item.image_url ? (
                <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center text-[10px] text-gray-600">TASCA DO VEREDA</div>
              )}
            </div>
            <div className="p-3 flex justify-between items-center">
              <div className="overflow-hidden">
                <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                <p className="text-cyan-400 font-black text-lg">{item.price.toLocaleString('pt-AO')} Kz</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="bg-cyan-500 p-2 rounded-lg text-white flex-shrink-0 ml-2">
                <Plus size={20} />
              </button>
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
