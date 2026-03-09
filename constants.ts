
import { Dish, Table, Customer, Reservation, StockItem, User, MenuCategory, PermissionKey } from './types';

// Permissões padrão por papel - ADICIONADA AGT_CONFIG PARA ADMIN
const ADMIN_PERMS: PermissionKey[] = ['POS_SALES', 'POS_VOID', 'POS_DISCOUNT', 'FINANCE_VIEW', 'STOCK_MANAGE', 'STAFF_MANAGE', 'SYSTEM_CONFIG', 'AGT_CONFIG'];
const OWNER_PERMS: PermissionKey[] = [...ADMIN_PERMS, 'OWNER_ACCESS'];
const POS_PERMS: PermissionKey[] = ['POS_SALES'];
const KITCHEN_PERMS: PermissionKey[] = [];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Gerente (Admin)', role: 'ADMIN', pin: '1234', permissions: ADMIN_PERMS, status: 'ATIVO' },
  { id: '2', name: 'Operador de Caixa', role: 'CAIXA', pin: '1111', permissions: ['POS_SALES', 'POS_DISCOUNT'], status: 'ATIVO' },
  { id: '3', name: 'Chefe de Cozinha', role: 'COZINHA', pin: '2222', permissions: [], status: 'ATIVO' },
  { id: '4', name: 'Garçom', role: 'GARCOM', pin: '3333', permissions: ['POS_SALES'], status: 'ATIVO' },
];

export const MOCK_CATEGORIES: MenuCategory[] = [
  { id: 'cat_entradas', name: 'Entradas', icon: 'Coffee' },
  { id: 'cat_principais', name: 'Pratos Principais', icon: 'Pizza' },
  { id: 'cat_bebidas', name: 'Bebidas', icon: 'Beer' },
  { id: 'cat_sobremesas', name: 'Sobremesas', icon: 'IceCream' },
];

export const MOCK_MENU: Dish[] = [
  { 
    id: '1', 
    name: 'Mufete de Peixe', 
    description: 'Peixe carapau ou cacusso grelhado com feijão de óleo de palma e mandioca.', 
    price: 9500, 
    costPrice: 4000,
    categoryId: 'cat_principais', 
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a3a2720?auto=format&fit=crop&w=600&q=80',
    taxCode: 'NOR'
  },
  { 
    id: '2', 
    name: 'Moamba de Galinha', 
    description: 'Galinha rija cozida lentamente em molho de moamba com quiabos.', 
    price: 8200, 
    costPrice: 3500,
    categoryId: 'cat_principais', 
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
    taxCode: 'NOR'
  },
  { 
    id: '8', 
    name: 'Kitaba (Petisco)', 
    description: 'Pasta de ginguba (amendoim) torrada temperada com gindungo.', 
    price: 2000, 
    costPrice: 500,
    categoryId: 'cat_entradas', 
    image: 'https://plus.unsplash.com/premium_photo-1694699435472-5c272db31ba6?auto=format&fit=crop&w=600&q=80',
    taxCode: 'NOR'
  },
  { 
    id: '12', 
    name: 'Cuca (Lata)', 
    description: 'A cerveja nacional preferida dos angolanos.', 
    price: 900, 
    costPrice: 450,
    categoryId: 'cat_bebidas', 
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
    taxCode: 'NOR'
  },
  { 
    id: '17', 
    name: 'Doce de Ginguba', 
    description: 'Pé de moleque caseiro, crocante e doce.', 
    price: 800, 
    costPrice: 200,
    categoryId: 'cat_sobremesas', 
    image: 'https://images.unsplash.com/photo-1563729768-dc77858ebd66?auto=format&fit=crop&w=600&q=80',
    taxCode: 'NOR'
  },
];

export const MOCK_STOCK: StockItem[] = [
  { id: '1', name: 'Arroz Branco', quantity: 25, unit: 'kg', minThreshold: 10 },
  { id: '2', name: 'Fuba de Bombó', quantity: 30, unit: 'kg', minThreshold: 10 },
];

export const MOCK_TABLES: Table[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Mesa ${i + 1}`,
    seats: 4,
    status: 'LIVRE' as const,
    x: i % 4,
    y: Math.floor(i / 4),
    zone: 'INTERIOR' as const,
    shape: 'SQUARE' as const,
    rotation: 0,
  })),
];

export const MOCK_CUSTOMERS: Customer[] = [];
export const MOCK_RESERVATIONS: Reservation[] = [];
