import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, Minus, ShoppingBag, Phone, MessageCircle, Clock, MapPin } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import appLogo from '/logo.png';

const PublicMenu = () => {
  const { tableId } = useParams();
  const isViewOnly = !tableId;
  
  // State
  const [menu, setMenu] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<string, { quantity: number; notes: string }>>({});
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  
  // Carregar dados do Supabase
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setIsLoading(true);
        
        // Carregar produtos
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('name');
          
        if (productsError) throw productsError;
        
        // Carregar categorias
        const { data: cats, error: catsError } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true)
          .order('name');
          
        if (catsError) throw catsError;
        
        setMenu(products || []);
        setCategories(cats || []);
        
      } catch (error) {
        console.error('[PUBLIC MENU] Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMenuData();
  }, []);
  
  // Filtrar menu
  const filteredMenu = useMemo(() => {
    return menu.filter(dish => {
      const matchesCategory = selectedCatId === 'TODOS' || dish.category_id === selectedCatId;
      const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menu, selectedCatId, searchTerm]);
  
  // Cart logic
  const updateCart = (dishId: string, delta: number) => {
    setCart(prev => {
      const current = prev[dishId] || { quantity: 0, notes: '' };
      const newQty = Math.max(0, current.quantity + delta);
      if (newQty === 0) {
        const { [dishId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dishId]: { ...current, quantity: newQty } };
    });
  };
  
  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((acc, [id, data]) => {
      const dish = menu.find(d => d.id === id);
      return acc + (dish?.price || 0) * data.quantity;
    }, 0);
  }, [cart, menu]);
  
  const cartCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA', 
      maximumFractionDigits: 0 
    }).format(val).replace('Kz', '').trim() + ' Kz';
  };
  
  // WhatsApp integration
  const handleWhatsAppOrder = () => {
    const phoneNumber = '+244976825520';
    const message = cartCount > 0 
      ? `Olá! Gostaria de fazer um pedido com ${cartCount} itens no valor total de ${formatCurrency(cartTotal)}.`
      : 'Olá! Gostaria de fazer um pedido.';
    
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-orange-800 font-medium">Carregando menu...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={appLogo} 
                alt="Tasca do Vereda" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tasca do Vereda</h1>
                <p className="text-sm text-gray-600">Menu Digital</p>
              </div>
            </div>
            
            {/* Cart */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">{cartCount} itens</p>
                <p className="font-bold text-orange-600">{formatCurrency(cartTotal)}</p>
              </div>
              <button
                onClick={handleWhatsAppOrder}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <ShoppingBag size={20} />
                <span>Pedir</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Restaurant Info */}
      <div className="bg-white border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Clock size={20} />
              <span>Aberto: 11:00 - 23:00</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <MapPin size={20} />
              <span>Via AL 15, Talatona</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Phone size={20} />
              <span>+244 976 825 520</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar prato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-orange-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setSelectedCatId('TODOS')}
              className={`px-6 py-2 rounded-full transition-colors ${
                selectedCatId === 'TODOS' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-6 py-2 rounded-full transition-colors ${
                  selectedCatId === cat.id 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenu.map(dish => (
            <div key={dish.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-orange-100">
              {dish.image_url && (
                <div className="h-48 overflow-hidden">
                  <LazyImage
                    src={dish.image_url}
                    alt={dish.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{dish.name}</h3>
                  <span className="text-orange-600 font-bold text-lg">{formatCurrency(dish.price)}</span>
                </div>
                
                {dish.description && (
                  <p className="text-gray-600 text-sm mb-4">{dish.description}</p>
                )}
                
                {/* Cart Controls */}
                <div className="flex items-center gap-2">
                  {cart[dish.id]?.quantity ? (
                    <>
                      <button
                        onClick={() => updateCart(dish.id, -1)}
                        className="bg-orange-100 hover:bg-orange-200 text-orange-600 p-2 rounded-lg transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-8 text-center">{cart[dish.id].quantity}</span>
                      <button
                        onClick={() => updateCart(dish.id, 1)}
                        className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => updateCart(dish.id, 1)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition-colors"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredMenu.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhum prato encontrado</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={20} />
              <span>+244 976 825 520</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-green-600" />
              <button
                onClick={handleWhatsAppOrder}
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Pedir via WhatsApp
              </button>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Dish Detail Modal */}
      {selectedDish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedDish.name}</h3>
              <button
                onClick={() => setSelectedDish(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {selectedDish.image_url && (
              <div className="h-48 overflow-hidden rounded-lg mb-4">
                <LazyImage
                  src={selectedDish.image_url}
                  alt={selectedDish.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <p className="text-gray-600 mb-4">{selectedDish.description}</p>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(selectedDish.price)}</span>
            </div>
            
            <button
              onClick={() => {
                updateCart(selectedDish.id, 1);
                setSelectedDish(null);
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg transition-colors"
            >
              Adicionar ao Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
