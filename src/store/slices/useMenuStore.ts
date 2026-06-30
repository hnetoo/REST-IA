import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dish, MenuCategory, StockItem, Reservation } from '../../../types';
import { MOCK_STOCK, MOCK_RESERVATIONS } from '../../../constants';
import { supabase } from '../../supabase_standalone';

interface MenuState {
  // Estado
  menu: Dish[];
  categories: MenuCategory[];
  stock: StockItem[];
  reservations: Reservation[];

  // Ações de menu
  setMenu: (menu: Dish[]) => void;
  setCategories: (categories: MenuCategory[]) => void;
  addDish: (dish: Dish) => void;
  updateDish: (dish: Dish) => void;
  removeDish: (id: string) => void;
  duplicateDish: (id: string) => void;
  toggleDishVisibility: (id: string) => void;
  toggleDishFeatured: (id: string) => void;

  // Ações de categorias
  addCategory: (cat: MenuCategory) => void;
  updateCategory: (cat: MenuCategory) => void;
  removeCategory: (id: string) => void;
  duplicateCategory: (id: string) => void;
  toggleCategoryVisibility: (id: string) => void;

  // Ações de stock
  updateStockQuantity: (id: string, delta: number) => void;
  syncProductsToCloud: () => Promise<void>;
  syncCategoriesToCloud: () => Promise<void>;

  // Ações de reservas
  addReservation: (res: Reservation) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;
  cancelReservation: (id: string) => void;
  deleteReservation: (id: string) => void;
}

export const useMenuStore = create<MenuState>()(
  // persist(
    (set, get) => ({
      // Estado inicial
      menu: [],
      categories: [],
      stock: [...MOCK_STOCK],
      reservations: [...MOCK_RESERVATIONS],

      // Menu
      setMenu: (menu) => set({ menu }),
      setCategories: (categories) => set({ categories }),

      addDish: (dish) =>
        set((state) => ({ menu: [...state.menu, dish] })),

      updateDish: (dish) =>
        set((state) => ({
          menu: state.menu.map((d) => (d.id === dish.id ? dish : d))
        })),

      removeDish: (id) =>
        set((state) => ({
          menu: state.menu.filter((d) => d.id !== id)
        })),

      duplicateDish: (id) => {
        const dish = get().menu.find((d) => d.id === id);
        if (!dish) return;
        const newDish = {
          ...dish,
          id: `dish-${Date.now()}`,
          name: `${dish.name} (Cópia)`
        };
        get().addDish(newDish);
      },

      toggleDishVisibility: (id) =>
        set((state) => ({
          menu: state.menu.map((d) =>
            d.id === id ? { ...d, isVisible: !d.isVisible } : d
          )
        })),

      toggleDishFeatured: (id) =>
        set((state) => ({
          menu: state.menu.map((d) =>
            d.id === id ? { ...d, isFeatured: !d.isFeatured } : d
          )
        })),

      // Categorias
      addCategory: (cat) =>
        set((state) => ({ categories: [...state.categories, cat] })),

      updateCategory: (cat) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === cat.id ? cat : c))
        })),

      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id)
        })),

      duplicateCategory: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return;
        const newCat = {
          ...cat,
          id: `cat-${Date.now()}`,
          name: `${cat.name} (Cópia)`
        };
        get().addCategory(newCat);
      },

      toggleCategoryVisibility: (id) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, isVisible: !c.isVisible } : c
          )
        })),

      // Stock
      updateStockQuantity: (id, delta) =>
        set((state) => ({
          stock: state.stock.map((s) =>
            s.id === id ? { ...s, quantity: s.quantity + delta } : s
          )
        })),

      syncProductsToCloud: async () => {
        try {
          // 🚨 APENAS BUSCAR DO SUPABASE - NÃO ENVIAR LOCAIS
          // Evita recriar produtos que foram apagados no Supabase
          const { data: products, error } = await supabase
            .from('products')
            .select('*');
          
          if (error) throw error;
          
          if (products && products.length > 0) {
            // Atualizar store apenas com produtos do Supabase
            set({ menu: products });
            console.log('[syncProductsToCloud] ✅ Produtos carregados do Supabase:', products.length);
          } else {
            console.log('[syncProductsToCloud] ⚠️ Nenhum produto no Supabase');
          }
        } catch (error) {
          console.error('[syncProductsToCloud] Erro:', error);
        }
      },

      syncCategoriesToCloud: async () => {
        try {
          // 🚨 APENAS BUSCAR DO SUPABASE - NÃO ENVIAR LOCAIS
          const { data: categories, error } = await supabase
            .from('categories')
            .select('*');
          
          if (error) throw error;
          
          if (categories && categories.length > 0) {
            // Atualizar store apenas com categorias do Supabase
            set({ categories });
            console.log('[syncCategoriesToCloud] ✅ Categorias carregadas do Supabase:', categories.length);
          } else {
            console.log('[syncCategoriesToCloud] ⚠️ Nenhuma categoria no Supabase');
          }
        } catch (error) {
          console.error('[syncCategoriesToCloud] Erro:', error);
        }
      },

      // Reservas
      addReservation: (res) =>
        set((state) => ({ reservations: [...state.reservations, res] })),

      updateReservation: (id, updates) =>
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          )
        })),

      cancelReservation: (id) =>
        get().updateReservation(id, { status: 'CANCELADA' }),

      deleteReservation: (id) =>
        set((state) => ({
          reservations: state.reservations.filter((r) => r.id !== id)
        }))
    })
  // ),
  // {
  //   name: 'menu-storage',
  //   partialize: (state) => ({
  //     menu: state.menu,
  //     categories: state.categories,
  //     stock: state.stock,
  //     reservations: state.reservations
  //   })
  // }
);
