/**
 * Carrega dados do Supabase - app 100% alinhada com schema.
 * Sem MOCK - usa apenas products, categories, customers, pos_tables.
 */
import { supabase } from '../supabase_standalone';
import type { Dish, MenuCategory, Table, Customer } from '../../types';

function mapProductToDish(p: Record<string, unknown>): Dish {
  const imageUrl = String(p.image_url ?? p.image ?? '');
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    price: Number(p.price ?? p.price_kz ?? 0),
    costPrice: Number(p.cost_price ?? 0),
    category_id: String(p.category_id ?? ''),
    description: String(p.description ?? ''),
    image: imageUrl,
    image_url: imageUrl,
    isVisibleDigital: p.is_active !== false,
    isFeatured: false,
    is_active: p.is_active !== false,
    stock_quantity: Number(p.stock_quantity ?? 0),
    unit: String(p.unit ?? 'un'),
    sku: String(p.sku ?? ''),
    min_stock: Number(p.min_stock ?? 10)
  };
}

/**
 * Valida se uma string é um UUID válido (36 caracteres)
 */
function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  if (uuid.length !== 36) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function mapCategoryToMenuCategory(c: Record<string, unknown>): MenuCategory {
  return {
    id: String(c.id ?? ''),
    name: String(c.name ?? ''),
    icon: String(c.icon ?? 'Utensils'),
    isVisibleDigital: (c.is_visible_digital ?? true) as boolean
  };
}

const DEFAULT_TABLES: Table[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Mesa ${i + 1}`,
  seats: 4,
  status: 'LIVRE' as const,
  x: (i % 3) * 150,
  y: Math.floor(i / 3) * 100,
  zone: 'INTERIOR' as const,
  shape: 'SQUARE' as const,
  rotation: 0
}));

export async function loadProductsFromSupabase(): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, cost_price, category_id, description, image_url, is_active, stock_quantity, unit, sku, min_stock');
  if (error) {
    console.warn('[supabaseDataLoader] Erro ao carregar products:', error);
    return [];
  }
  return (data ?? []).map(mapProductToDish);
}

export async function loadCategoriesFromSupabase(): Promise<MenuCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon, is_visible_digital');
  if (error) {
    console.warn('[supabaseDataLoader] Erro ao carregar categories:', error);
    return [];
  }
  
  // 🚨 FILTRAR APENAS CATEGORIAS COM UUID VÁLIDO
  const validCategories = (data ?? []).filter((c: any) => isValidUUID(c.id));
  const invalidCount = (data ?? []).length - validCategories.length;
  
  if (invalidCount > 0) {
    console.warn(`[supabaseDataLoader] ⚠️ ${invalidCount} categorias inválidas filtradas`);
    // Auto-deletar categorias inválidas do Supabase
    const invalidCategories = (data ?? []).filter((c: any) => !isValidUUID(c.id));
    for (const cat of invalidCategories) {
      try {
        const { error: deleteError } = await supabase.from('categories').delete().eq('id', cat.id);
        if (deleteError) {
          if (deleteError.code === '409') {
            console.warn(`[supabaseDataLoader] ⚠️ Categoria "${cat.name}" tem produtos vinculados - não pode ser removida automaticamente`);
          } else {
            console.warn(`[supabaseDataLoader] ⚠️ Erro ao remover categoria "${cat.name}":`, deleteError.message);
          }
        } else {
          console.log(`[supabaseDataLoader] 🗑️ Categoria inválida removida: ${cat.name} (${cat.id})`);
        }
      } catch (err) {
        console.warn(`[supabaseDataLoader] ⚠️ Erro ao tentar remover categoria "${cat.name}":`, err);
      }
    }
  }
  
  return validCategories.map(mapCategoryToMenuCategory);
}

export async function loadCustomersFromSupabase(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, points, balance, visits, last_visit');
  if (error) {
    console.warn('[supabaseDataLoader] Erro ao carregar customers:', error);
    return [];
  }
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: String(c.id ?? ''),
    name: String(c.name ?? ''),
    phone: String(c.phone ?? ''),
    nif: '',
    points: Number(c.points ?? 0),
    balance: Number(c.balance ?? 0),
    visits: Number(c.visits ?? 0),
    lastVisit: (c.last_visit ? new Date(c.last_visit as string) : new Date()) as Date
  }));
}

export async function loadTablesFromSupabase(): Promise<Table[]> {
  try {
    const { data, error } = await supabase
      .from('pos_tables')
      .select('id, name, seats, status, x, y, zone, shape, rotation')
      .order('name', { ascending: true });
    
    if (error || !data?.length) return DEFAULT_TABLES;
    return data.map((t: Record<string, unknown>) => ({
      id: Number(t.id ?? 0),
      name: String(t.name ?? 'Mesa'),
      seats: Number(t.seats ?? 4),
      // 🔥 IMPORTANTE: Não carregar status do Supabase - sempre LIVRE inicialmente
      // O status correto será determinado pelas ordens ativas em loadAndMergeActiveOrders
      status: 'LIVRE' as Table['status'],
      x: Number(t.x ?? 0),
      y: Number(t.y ?? 0),
      zone: (t.zone ?? 'INTERIOR') as Table['zone'],
      shape: (t.shape ?? 'SQUARE') as Table['shape'],
      rotation: Number(t.rotation ?? 0)
    }));
  } catch {
    return DEFAULT_TABLES;
  }
}

export async function loadAllFromSupabase(store: {
  setMenu: (m: Dish[]) => void;
  setCategories: (c: MenuCategory[]) => void;
  setTables: (t: Table[]) => void;
  setCustomers: (c: Customer[]) => void;
}) {
  const [menu, categories, tables, customers] = await Promise.all([
    loadProductsFromSupabase(),
    loadCategoriesFromSupabase(),
    loadTablesFromSupabase(),
    loadCustomersFromSupabase()
  ]);
  store.setMenu(menu);
  store.setCategories(categories);
  store.setTables(tables);
  store.setCustomers(customers);
  
  // 🔥 IMPORTANTE: Carregar ordens ativas e atualizar status das mesas
  console.log('[SUPABASE_LOADER] 🔄 Carregando ordens ativas para atualizar status das mesas...');
  try {
    const { loadAndMergeActiveOrders } = await import('../store/useStore');
    await loadAndMergeActiveOrders();
    console.log('[SUPABASE_LOADER] ✅ Ordens ativas carregadas e mesas atualizadas');
  } catch (err) {
    console.error('[SUPABASE_LOADER] ❌ Erro ao carregar ordens ativas:', err);
  }
}
