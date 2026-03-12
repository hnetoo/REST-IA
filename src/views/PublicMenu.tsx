import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PublicMenu = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('*').eq('active', true);
      if (data) setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-10 text-center font-bold">A carregar menu da Tasca...</div>;

  return (
    <div className="p-6 max-w-xl mx-auto font-sans bg-white min-h-screen">
      <h1 className="text-3xl font-black text-center mb-8 uppercase">Tasca do Vereda</h1>
      <div className="space-y-4">
        {items.map((item: any) => (
          <div key={item.id} className="flex justify-between border-b-2 border-gray-100 pb-3">
            <span className="text-lg font-medium">{item.name}</span>
            <span className="font-bold text-orange-600">{item.price.toLocaleString('pt-AO')} Kz</span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PublicMenu;
