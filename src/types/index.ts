// TIPOS CENTRALIZADOS - PROIBIDO CRIAR TIPOS EM COMPONENTES

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  costPrice: number;
  description: string;
  image?: string;
  available: boolean;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_nif?: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  payment_method: string;
  invoice_number: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Expense {
  id: string;
  amount_kz: number;
  description: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  role: string;
  base_salary_kz: number;
  phone: string;
  status: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  workDaysPerMonth?: number;
  dailyWorkHours?: number;
  externalBioId?: string;
}

export interface TerminalSync {
  establishment_id: string;
  today_revenue: number;
  global_revenue: number;
  staff_costs: number;
  total_expenses: number;
  open_orders_count: number;
  last_sync: string;
}

export interface EstablishmentMetrics {
  date: string;
  total_vendas_kz: number;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  establishment_id: string;
  establishment_name: string;
  establishment_address: string;
  establishment_phone: string;
  establishment_email: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  establishmentId: string | null;
  hasCurrentUser: boolean;
}
