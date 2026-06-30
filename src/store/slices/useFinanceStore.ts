import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense } from '../../../types';
import { supabase } from '../../supabase_standalone';

interface FinanceState {
  // Estado
  expenses: Expense[];

  // Ações
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  approveExpense: (id: string, approvedBy: string) => void;
  loadExpenses: () => Promise<void>;
  resetFinancialData: () => void;

  // Getters
  getTotalExpenses: () => number;
  getTodayExpenses: () => number;
  getExpensesByCategory: (category: string) => number;
}

export const useFinanceStore = create<FinanceState>()(
  // persist(
    (set, get) => ({
      // Estado inicial
      expenses: [],

      // Ações
      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: `exp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({ expenses: [...state.expenses, newExpense] }));

        // Sync com Supabase
        supabase.from('expenses').insert(newExpense).then(({ error }) => {
          if (error) console.error('[addExpense] Sync error:', error);
        });
      },

      updateExpense: (id, updates) => {
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          )
        }));

        supabase.from('expenses').update(updates).eq('id', id).then(({ error }) => {
          if (error) console.error('[updateExpense] Sync error:', error);
        });
      },

      removeExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id)
        }));

        supabase.from('expenses').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('[removeExpense] Sync error:', error);
        });
      },

      approveExpense: (id, approvedBy) => {
        get().updateExpense(id, {
          status: 'APROVADO',
          approvedBy,
          approvedAt: new Date().toISOString()
        } as Partial<Expense>);
      },

      loadExpenses: async () => {
        try {
          let allData: any[] = [];
          let offset = 0;
          const pageSize = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from('expenses')
              .select('*')
              .order('created_at', { ascending: false })
              .range(offset, offset + pageSize - 1);

            if (error) {
              console.error('[loadExpenses] Erro:', error);
              hasMore = false;
              break;
            }

            if (data && data.length > 0) {
              allData.push(...data);
            }

            if (!data || data.length < pageSize) {
              hasMore = false;
            } else {
              offset += pageSize;
            }
          }

          if (allData.length > 0) {
            set({ expenses: allData as Expense[] });
          }
        } catch (error) {
          console.error('[loadExpenses] Erro crítico:', error);
        }
      },

      resetFinancialData: () => set({ expenses: [] }),

      // Getters
      getTotalExpenses: () => {
        return get().expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      },

      getTodayExpenses: () => {
        const hoje = new Date().toISOString().split('T')[0];
        return get().expenses
          .filter((e) => new Date(e.createdAt).toISOString().split('T')[0] === hoje)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
      },

      getExpensesByCategory: (category) => {
        return get().expenses
          .filter((e) => e.category === category)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
      }
    })
  // ),
  // {
  //   name: 'finance-storage',
  //   partialize: (state) => ({
  //     expenses: state.expenses
  //   })
  // }
);
