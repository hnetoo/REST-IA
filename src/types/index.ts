// TIPOS CENTRALIZADOS - PROIBIDO CRIAR TIPOS EM COMPONENTES

export type ExpenseCategory = 'ALIMENTACAO' | 'BEBIDAS' | 'MATERIAL_LIMPEZA' | 'UTILIDADES' | 'REPARACOES' | 'MARKETING' | 'OUTROS';
export type ExpenseStatus = 'PENDENTE' | 'APROVADO' | 'PAGO';

export type PaymentMethod = 'NUMERARIO' | 'TPA' | 'TRANSFERENCIA' | 'QR_CODE' | 'PAGAR_DEPOIS' | 'CASH' | 'CARD' | 'TRANSFER' | 'PIX' | 'PAY_LATER';

export interface PaymentMethodConfig {
  id: string;
  name: string;
  icon: string;
  type: PaymentMethod;
  isActive: boolean;
  requiresReference?: boolean;
}

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
  description: string;
  amount: number;
  amount_kz?: number;
  category: ExpenseCategory | string;
  status: ExpenseStatus | string;
  date?: Date | string;
  paymentMethod?: PaymentMethod | string;
  receipt?: string;
  notes?: string;
  approvedBy?: string;
  createdAt?: Date | string;
  created_at?: string;
  updatedAt?: Date | string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  full_name: string;
  name?: string; // alias para compatibilidade
  role: string;
  base_salary_kz: number;
  salary?: number; // alias para compatibilidade
  phone: string;
  status: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  workDaysPerMonth?: number;
  dailyWorkHours?: number;
  externalBioId?: string;
  // Campos fiscais — Angola
  nif?: string;
  admissionDate?: string;
  contractType?: string;
  irtExempt?: boolean;
  autoCalculateTax?: boolean;
  foodAllowance?: number;
  transportAllowance?: number;
  bonus?: number;
  overtimeHourlyRate?: number;
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

export interface Dish {
  id: string;
  name: string;
  price?: number;
  category_id?: string;
  description?: string;
  image?: string;
  available?: boolean;
}

export interface Table {
  id: string;
  name?: string;
  status?: string;
  seats?: number;
}

export interface AIAnalysisResult {
  summary: string;
  recommendation: string;
  trend: 'up' | 'down';
}

export interface AIMonthlyReport {
  insights: string[];
  projections: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  establishmentId: string | null;
  hasCurrentUser: boolean;
}

export * from './agt';
