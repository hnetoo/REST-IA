import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export const useStore = create()(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      currentUser: null,
      
      addProduct: async (product) => {
        const updated = [...get().products, product];
        set({ products: updated });
        await supabase.from('products').upsert(product);
      },

      fetchFromSupabase: async () => {
        const { data: p } = await supabase.from('products').select('*');
        const { data: c } = await supabase.from('categories').select('*');
        if (p) set({ products: p });
        if (c) set({ categories: c });
      },

      setUser: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
    }),
    { name: 'tasca-storage' }
  )
);
