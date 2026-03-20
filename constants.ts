
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

/** Dados vazios - app carrega de Supabase via supabaseDataLoader */
export const MOCK_CATEGORIES: MenuCategory[] = [];
export const MOCK_MENU: Dish[] = [];
export const MOCK_STOCK: StockItem[] = [];
export const MOCK_TABLES: Table[] = [];
export const MOCK_CUSTOMERS: Customer[] = [];
export const MOCK_RESERVATIONS: Reservation[] = [];
