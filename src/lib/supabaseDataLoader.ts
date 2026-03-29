/**
 * Carrega dados do Supabase - app 100% alinhada com schema.
 * Sem MOCK - usa apenas products, categories, customers, pos_tables.
 */
import { supabase } from './supabase';
import type { Dish, MenuCategory, Table, Customer } from '../../types';

function mapProductToDish(p: Record<string, unknown>): Dish {
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    price: Number(p.price ?? p.price_kz ?? 0),
    costPrice: Number(p.cost_price ?? 0),
    categoryId: String(p.category_id ?? ''),
    description: String(p.description ?? ''),
    image: String(p.image_url ?? p.image ?? ''),
    isVisibleDigital: p.is_active !== false,
    isFeatured: false
  };
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
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    console.warn('[supabaseDataLoader] Erro ao carregar products:', error);
    return [];
  }
  return (data ?? []).map(mapProductToDish);
}

export async function loadCategoriesFromSupabase(): Promise<MenuCategory[]> {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) {
    console.warn('[supabaseDataLoader] Erro ao carregar categories:', error);
    return [];
  }
  return (data ?? []).map(mapCategoryToMenuCategory);
}

export async function loadCustomersFromSupabase(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) {
    console.warn('[supabaseDataLoader] Erro ao carregar customers:', error);
    return [];
  }
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: String(c.id ?? ''),
    name: String(c.name ?? ''),
    phone: String(c.phone ?? ''),
    nif: String(c.nif ?? ''),
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
      .select('*')
      .order('name', { ascending: true }); // ORDENAÇÃO NUMÉRICA CRESCENTE
    
    if (error || !data?.length) return DEFAULT_TABLES;
    return data.map((t: Record<string, unknown>) => ({
      id: Number(t.id ?? 0),
      name: String(t.name ?? 'Mesa'),
      seats: Number(t.seats ?? 4),
      status: (t.status ?? 'LIVRE') as Table['status'],
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
}
