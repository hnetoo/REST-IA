import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, Table, OrderType, Customer, PaymentMethod } from '../../../types';
import { MOCK_TABLES } from '../../../constants';
import { supabase } from '../../supabase_standalone';
import { orderTransactionService } from '../../lib/orderTransactionService';
import { syncOrderToSupabase } from '../useStore';

// 🔥 Debounce map para evitar chamadas excessivas ao Supabase
const syncDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

// 🔥 Função para sincronizar contas abertas para Supabase (persistência contra falhas de energia)
const syncActiveOrderToSupabase = async (order: Order) => {
  try {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      console.log('[SYNC ACTIVE ORDER] ⚠️ Offline - conta não sincronizada');
      return;
    }

    console.log('[SYNC ACTIVE ORDER] 🚀 Upserting ordem:', order.id);

    const { calculateDataContabil } = await import('../../lib/dateUtils');
    const dataContabil = calculateDataContabil(new Date());

    // 🔥 Serializar items para JSONB - garantir que só dados simples são enviados
    const itemsToSave = (order.items || []).map(item => ({
      dishId: item.dishId || item.dish_id || null,
      name: item.name || item.dish?.name || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.unit_price || 0,
      unitCost: item.unitCost || 0,
      taxAmount: item.taxAmount || 0,
      status: item.status || 'pending',
      notes: item.notes || ''
    }));

    const { error } = await supabase
      .from('orders')
      .upsert({
        id: order.id,
        customer_name: order.name || 'Cliente',
        total_amount: order.total || 0,
        status: 'ABERTO',
        payment_method: 'pending',
        table_id: order.tableId ? String(order.tableId) : null,
        created_at: order.timestamp ? new Date(order.timestamp).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_contabil: dataContabil,
        items: itemsToSave
      }, { onConflict: 'id' });

    if (error) {
      console.error('[SYNC ACTIVE ORDER] ❌ Erro:', error);
    } else {
      console.log('[SYNC ACTIVE ORDER] ✅ Ordem sincronizada');
    }
  } catch (error) {
    console.error('[SYNC ACTIVE ORDER] ❌ Erro:', error);
  }
};

// 🔥 Debounce wrapper para sincronização
const debouncedSync = (order: Order) => {
  const existing = syncDebounceMap.get(order.id);
  if (existing) clearTimeout(existing);
  const timeout = setTimeout(() => {
    syncActiveOrderToSupabase(order);
    syncDebounceMap.delete(order.id);
  }, 300); // 300ms debounce
  syncDebounceMap.set(order.id, timeout);
};

interface OrderState {
  // Estado
  tables: Table[];
  activeOrders: Order[];
  activeTableId: number | null;
  activeOrderId: string | null;
  invoiceCounter: number;
  customers: Customer[];
  customerDisplayMode: Record<number, 'MARKETING' | 'ORDER_SUMMARY'>;

  // Ações de mesas
  setActiveTable: (id: number | null) => void;
  setActiveOrder: (id: string | null) => void;
  addTable: (table: Table) => void;
  updateTable: (table: Table) => void;
  removeTable: (id: number) => void;
  closeTable: (id: number) => void;
  updateTablePosition: (id: number, x: number, y: number) => void;
  transferTable: (fromTableId: number, toTableId: number) => void;
  cancelEmptyTable: (tableId: number) => void;
  addSubAccount: (tableId: number, name: string) => string;
  removeSubAccount: (orderId: string) => void;
  mergeOrders: (sourceOrderId: string, targetOrderId: string) => void;

  // Ações de pedidos
  createNewOrder: (tableId: number | null, name?: string, type?: OrderType) => string;
  transferOrder: (orderId: string, targetTableId: number) => void;
  addToOrder: (tableId: number | null, dish: any, quantity?: number, notes?: string, orderId?: string) => void;
  removeFromOrder: (orderId: string, itemIndex: number) => void;
  checkoutTable: (orderId: string, paymentMethod: PaymentMethod, customerId?: string, customerNif?: string) => Promise<{ success: boolean; savedLocally?: boolean }>;
  updateOrderPaymentMethod: (orderId: string, newMethod: PaymentMethod) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  markOrderAsServed: (orderId: string) => void;
  setCustomerDisplayMode: (tableId: number, mode: 'MARKETING' | 'ORDER_SUMMARY') => void;

  // Clientes
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomer: (id: string) => void;
  settleCustomerDebt: (id: string, amount: number) => void;

  // Helpers
  getTodayRevenue: () => number;
  fetchOrders: () => Promise<void>;
  loadActiveOrdersFromSupabase: () => Promise<void>;
  setTables: (tables: Table[]) => void;
  setCustomers: (customers: Customer[]) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      tables: [...MOCK_TABLES],
      activeOrders: [],
      activeTableId: null,
      activeOrderId: null,
      invoiceCounter: 1,
      customers: [],
      customerDisplayMode: {},

      // Ações de mesas
      setActiveTable: (id) => set({ activeTableId: id }),
      setActiveOrder: (id) => set({ activeOrderId: id }),

      addTable: (table) => set((state) => ({
        tables: [...state.tables, { ...table, id: state.tables.length + 1 }]
      })),

      updateTable: (table) => set((state) => ({
        tables: state.tables.map((t) => t.id === table.id ? table : t)
      })),

      removeTable: (id) => set((state) => ({
        tables: state.tables.filter((t) => t.id !== id)
      })),

      closeTable: (id) => set((state) => ({
        tables: state.tables.map((t) =>
          t.id === id ? { ...t, status: 'available', currentOrder: undefined } : t
        )
      })),

      updateTablePosition: (id, x, y) => set((state) => ({
        tables: state.tables.map((t) =>
          t.id === id ? { ...t, x, y } : t
        )
      })),

      transferTable: (fromTableId, toTableId) => {
        const state = get();
        const fromTable = state.tables.find((t) => t.id === fromTableId);
        const toTable = state.tables.find((t) => t.id === toTableId);

        if (!fromTable || !toTable) return;

        const order = state.activeOrders.find((o) => o.tableId === fromTableId && o.status !== 'closed');
        if (!order) return;

        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id === fromTableId) return { ...t, status: 'available', currentOrder: undefined };
            if (t.id === toTableId) return { ...t, status: 'occupied', currentOrder: order };
            return t;
          }),
          activeOrders: state.activeOrders.map((o) =>
            o.id === order.id ? { ...o, tableId: toTableId } : o
          )
        }));
      },

      cancelEmptyTable: (tableId) => {
        const table = get().tables.find((t) => t.id === tableId);
        if (!table || table.status !== 'available') return;
        get().removeTable(tableId);
      },

      addSubAccount: (tableId, name) => {
        const newId = `order-${Date.now()}`;
        const newOrder: Order = {
          id: newId,
          tableId,
          items: [],
          status: 'pending',
          timestamp: new Date().toISOString(),
          total: 0,
          taxTotal: 0,
          profit: 0,
          paymentMethod: 'CASH',
          subAccountName: name || undefined,
          type: 'DINE_IN',
          _isLocal: true // 🔥 PROTEGIDO: Nunca será sobrescrito pelo Supabase
        };
        set((state) => ({
          activeOrders: [...state.activeOrders, newOrder],
          activeOrderId: newId
        }));
        return newId;
      },

      removeSubAccount: (orderId) => {
        set((state) => ({
          activeOrders: state.activeOrders.filter((o) => o.id !== orderId)
        }));
      },

      mergeOrders: (sourceOrderId, targetOrderId) => {
        const state = get();
        const sourceOrder = state.activeOrders.find(o => o.id === sourceOrderId);
        const targetOrder = state.activeOrders.find(o => o.id === targetOrderId);
        if (!sourceOrder || !targetOrder) return;

        const mergedItems = [...targetOrder.items, ...sourceOrder.items];
        const mergedTotal = targetOrder.total + sourceOrder.total;
        const mergedTax = targetOrder.taxTotal + sourceOrder.taxTotal;
        const mergedProfit = targetOrder.profit + sourceOrder.profit;
        const sourceTableId = sourceOrder.tableId;

        set((state) => ({
          activeOrders: state.activeOrders
            .map(o => o.id === targetOrderId ? { ...o, items: mergedItems, total: mergedTotal, taxTotal: mergedTax, profit: mergedProfit } : o)
            .filter(o => o.id !== sourceOrderId),
          tables: state.tables.map(t => {
            if (t.id === sourceTableId) {
              const stillHasOrders = state.activeOrders.some(o => o.tableId === sourceTableId && o.id !== sourceOrderId && o.status !== 'closed');
              return stillHasOrders ? t : { ...t, status: 'available' as const };
            }
            return t;
          })
        }));
      },

      // Ações de pedidos
      createNewOrder: (tableId, name, type = 'DINE_IN') => {
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          tableId,
          items: [],
          status: 'pending',
          timestamp: new Date().toISOString(),
          total: 0,
          taxTotal: 0,
          profit: 0,
          paymentMethod: 'CASH',
          name: name || `Conta ${get().invoiceCounter}`,
          type,
          _isLocal: true // 🔥 PROTEGIDO: Nunca será sobrescrito pelo Supabase
        };
        set((state) => ({
          activeOrders: [...state.activeOrders, newOrder],
          invoiceCounter: state.invoiceCounter + 1
        }));
        // 🔥 Sincronizar conta aberta com Supabase
        debouncedSync(newOrder);
        return newOrder.id;
      },

      transferOrder: (orderId, targetTableId) => {
        set((state) => ({
          activeOrders: state.activeOrders.map((o) =>
            o.id === orderId ? { ...o, tableId: targetTableId } : o
          )
        }));
      },

      addToOrder: (tableId, dish, quantity = 1, notes, orderId) => {
        let updatedOrder: Order | undefined;
        set((state) => {
          let targetOrder = state.activeOrders.find(
            (o) => (orderId && o.id === orderId) || (tableId && o.tableId === tableId && o.status !== 'closed')
          );

          if (!targetOrder) {
            const newOrderId = get().createNewOrder(tableId || 1);
            targetOrder = state.activeOrders.find((o) => o.id === newOrderId);
          }

          if (!targetOrder) return state;

          const existingItem = targetOrder.items.find((i) => i.dishId === dish.id);
          const unitPrice = dish.price;
          const unitCost = dish.costPrice || 0;
          const taxRate = (get() as any).settings?.taxRate ?? 14;
          const taxAmount = (dish.price * (taxRate / 100));
          const newItem = {
            dishId: dish.id,
            dish: dish, // Objeto dish completo
            name: dish.name,
            quantity,
            notes: notes || '',
            status: 'pending' as const,
            unitPrice,
            unitCost,
            taxAmount
          };

          const updatedItems = existingItem
            ? targetOrder.items.map((i) =>
                i.dishId === dish.id ? { ...i, quantity: i.quantity + quantity } : i
              )
            : [...targetOrder.items, newItem];

          const newTotal = updatedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

          updatedOrder = { ...targetOrder, items: updatedItems, total: newTotal };

          return {
            activeOrders: state.activeOrders.map((o) =>
              o.id === targetOrder!.id
                ? updatedOrder!
                : o
            )
          };
        });
        // 🔥 Sincronizar conta aberta com Supabase após adicionar item
        if (updatedOrder) {
          debouncedSync(updatedOrder);
        }
      },

      removeFromOrder: (orderId: string, itemIndex: number) => {
        set((state) => {
          const order = state.activeOrders.find((o) => o.id === orderId);
          if (!order) return state;

          const updatedItems = order.items.filter((_, i) => i !== itemIndex);
          const newTotal = updatedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
          const newProfit = updatedItems.reduce((sum, i) => sum + ((i.unitPrice - i.unitCost) * i.quantity), 0);
          const newTaxTotal = updatedItems.reduce((sum, i) => sum + (i.taxAmount * i.quantity), 0);

          return {
            activeOrders: state.activeOrders.map((o) =>
              o.id === orderId
                ? { ...o, items: updatedItems, total: newTotal, profit: newProfit, taxTotal: newTaxTotal }
                : o
            )
          };
        });
      },

      checkoutTable: async (orderId, paymentMethod, customerId, customerNif) => {
        try {
          const state = get();
          const order = state.activeOrders.find((o) => o.id === orderId);
          if (!order) return { success: false };

          const updatedOrder = {
            ...order,
            status: 'closed' as const,
            paymentMethod,
            customerId,
            customerNif,
            closedAt: new Date().toISOString()
          };

          // 🔥 Verificar se order já existe no Supabase
          console.log('[checkout] 🔍 Verificando se order existe no Supabase:', orderId);
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('id', orderId)
            .maybeSingle();

          let error = null;

          // 🔑 Normalizar items para JSONB (guardar no campo items da tabela orders)
          const itemsJsonb = (order.items || []).map((item: any) => ({
            name: item.name || item.dish?.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice || item.unit_price,
            totalPrice: (item.unitPrice || item.unit_price || 0) * (item.quantity || 0)
          }));

          if (existingOrder) {
            // Order existe → UPDATE em vez de INSERT
            console.log('[checkout] ⚠️ Order existe, fazendo UPDATE:', orderId);
            const { error: updateError } = await supabase
              .from('orders')
              .update({
                status: 'closed',
                payment_method: paymentMethod,
                total_amount: order.total,
                customer_nif: customerNif,
                items: itemsJsonb,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId);
            error = updateError;
          } else {
            // Order não existe → INSERT
            console.log('[checkout] 📝 Order nova, fazendo INSERT:', orderId);
            const { error: insertError } = await supabase.from('orders').insert({
              ...updatedOrder,
              items: itemsJsonb,
              total_amount: order.total,
              payment_method: paymentMethod,
              status: 'closed'
            });
            error = insertError;
          }

          if (error) {
            console.error('[checkout] ❌ Erro Supabase:', error);
            return { success: false, error: error.message };
          }

          console.log('[checkout] ✅ Order salva no Supabase:', orderId);

          // 🔑 Sincronizar order_items via RPC sync_complete_order
          try {
            await syncOrderToSupabase(updatedOrder);
            console.log('[checkout] ✅ order_items sincronizados via RPC');
          } catch (syncErr) {
            console.error('[checkout] ⚠️ Erro ao sincronizar order_items:', syncErr);
            // Não falhar o checkout se order_items falhar
          }

          set((state) => ({
            activeOrders: state.activeOrders.map((o) =>
              o.id === orderId ? updatedOrder : o
            )
          }));

          return { success: true };
        } catch (error) {
          console.error('[checkout] Erro:', error);
          return { success: false };
        }
      },

      updateOrderPaymentMethod: (orderId, newMethod) => {
        set((state) => ({
          activeOrders: state.activeOrders.map((o) =>
            o.id === orderId ? { ...o, paymentMethod: newMethod } : o
          )
        }));
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          activeOrders: state.activeOrders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          )
        }));
      },

      markOrderAsServed: (orderId) => {
        set((state) => ({
          activeOrders: state.activeOrders.map((o) =>
            o.id === orderId
              ? { ...o, items: o.items.map((i) => ({ ...i, status: 'served' as const })) }
              : o
          )
        }));
      },

      setCustomerDisplayMode: (tableId, mode) => {
        set((state) => ({
          customerDisplayMode: { ...state.customerDisplayMode, [tableId]: mode }
        }));
      },

      // Clientes
      addCustomer: (customer) =>
        set((state) => ({ customers: [...state.customers, customer] })),

      updateCustomer: (customer) =>
        set((state) => ({
          customers: state.customers.map((c) => (c.id === customer.id ? customer : c))
        })),

      removeCustomer: (id) =>
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id)
        })),

      settleCustomerDebt: (id, amount) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, debt: Math.max(0, (c.debt || 0) - amount) } : c
          )
        }));
      },

      // Helpers
      getTodayRevenue: () => {
        const hoje = new Date().toISOString().split('T')[0];
        return get().activeOrders
          .filter((o) => {
            const isToday = new Date(o.timestamp).toISOString().split('T')[0] === hoje;
            return isToday && ['closed', 'paid', 'pago', 'finalized'].includes(o.status);
          })
          .reduce((acc, o) => acc + (o.total || 0), 0);
      },

      fetchOrders: async () => {
        try {
          // 🔥 CORREÇÃO DEFINITIVA: NUNCA sobrescrever ordens locais!
          const { data, error } = await supabase
            .from('active_orders')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('[fetchOrders] Erro:', error);
            return;
          }

          if (data) {
            // Converter de snake_case para camelCase
            const supabaseOrders = data.map((order: any) => ({
              id: order.local_id || order.id,
              tableId: order.table_id,
              type: order.type || 'LOCAL',
              items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
              status: order.status || 'ABERTO',
              timestamp: new Date(order.created_at || order.timestamp),
              total: Number(order.total || 0),
              taxTotal: Number(order.tax_total || 0),
              profit: Number(order.profit || 0),
              subAccountName: order.sub_account_name || 'Principal',
              _isLocal: false // 🔥 Marcar como vindo do Supabase
            }));
            
            // 🔥 REGRA DE OURO: Manter TODAS as ordens locais (_isLocal === true)
            const currentOrders = get().activeOrders;
            const localOrders = currentOrders.filter(o => o._isLocal === true);
            const nonLocalOrderIds = new Set(currentOrders.filter(o => !o._isLocal).map(o => o.id));
            
            // Apenas adicionar ordens do Supabase que não existem entre as não-locais
            const newOrdersFromSupabase = supabaseOrders.filter((o: Order) => !nonLocalOrderIds.has(o.id));
            
            if (newOrdersFromSupabase.length > 0) {
              console.log('[fetchOrders] 🔄 Adicionando', newOrdersFromSupabase.length, 'do Supabase + mantendo', localOrders.length, 'locais');
              set({ activeOrders: [...localOrders, ...currentOrders.filter(o => !o._isLocal), ...newOrdersFromSupabase] });
            } else {
              console.log('[fetchOrders] ✅ Mantendo', localOrders.length, 'ordens locais (sem novas do Supabase)');
            }
          }
        } catch (error) {
          console.error('[fetchOrders] Erro crítico:', error);
        }
      },

      setTables: (tables) => set({ tables }),
      setCustomers: (customers) => set({ customers }),

      // 🔥 Carregar contas abertas do Supabase ao iniciar
      loadActiveOrdersFromSupabase: async () => {
        try {
          const isOnline = navigator.onLine;
          if (!isOnline) {
            console.log('[LOAD ACTIVE ORDERS] ⚠️ Offline - usando dados locais');
            return;
          }

          console.log('[LOAD ACTIVE ORDERS] 🔄 Buscando ordens ABERTAS do Supabase...');

          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'ABERTO')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('[LOAD ACTIVE ORDERS] ❌ Erro:', error);
            return;
          }

          if (!data || data.length === 0) {
            console.log('[LOAD ACTIVE ORDERS] ℹ️ Nenhuma order ABERTA no Supabase');
            return;
          }

          console.log('[LOAD ACTIVE ORDERS] ✅ Ordens ABERTAS encontradas:', data.length);

          // 🛡️ Anti-duplicação: verificar quais já existem localmente
          const currentLocalIds = new Set(get().activeOrders.map(o => o.id));

          const newOrders: Order[] = (data as any[])
            .filter((supabaseOrder) => !currentLocalIds.has(supabaseOrder.id))
            .map((supabaseOrder: any) => ({
              id: supabaseOrder.id,
              tableId: supabaseOrder.table_id ? Number(supabaseOrder.table_id) : null,
              type: 'LOCAL' as OrderType,
              items: supabaseOrder.items || [], // 🔥 Recuperar produtos do carrinho
              status: supabaseOrder.status || 'ABERTO',
              timestamp: new Date(supabaseOrder.created_at || Date.now()),
              total: Number(supabaseOrder.total_amount || 0),
              taxTotal: 0,
              profit: 0,
              subAccountName: supabaseOrder.customer_name || 'Principal',
              _isLocal: false // Marcar como vindo do Supabase
            }));

          if (newOrders.length > 0) {
            set((state) => ({
              activeOrders: [...state.activeOrders, ...newOrders]
            }));
            console.log('[LOAD ACTIVE ORDERS] ✅', newOrders.length, 'ordens carregadas do Supabase');
          } else {
            console.log('[LOAD ACTIVE ORDERS] ℹ️ Todas as ordens já existem localmente');
          }
        } catch (error) {
          console.error('[LOAD ACTIVE ORDERS] ❌ Erro:', error);
        }
      }
    }),
    {
      name: 'order-storage-v2',
      partialize: (state) => ({
        tables: state.tables,
        invoiceCounter: state.invoiceCounter,
        customers: state.customers,
        customerDisplayMode: state.customerDisplayMode
        // 🚫 NÃO persistir activeOrders — são carregadas do Supabase
      })
    }
  )
);
