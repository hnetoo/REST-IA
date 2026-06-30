
export type TableStatus = 'LIVRE' | 'OCUPADO' | 'RESERVADO' | 'PAGAMENTO' | 'available' | 'occupied' | 'reserved' | 'payment';
export type TableZone = 'INTERIOR' | 'EXTERIOR' | 'BALCAO';
export type UserRole = 'ADMIN' | 'CAIXA' | 'GARCOM' | 'COZINHA' | 'OWNER';
export type PaymentMethod = 'NUMERARIO' | 'TPA' | 'TRANSFERENCIA' | 'QR_CODE' | 'PAGAR_DEPOIS' | 'CASH' | 'CARD' | 'TRANSFER' | 'PIX' | 'PAY_LATER';
export type OrderType = 'LOCAL' | 'ENCOMENDA' | 'TAKEAWAY' | 'DINE_IN' | 'DELIVERY' | 'TAKEOUT';
export type OrderStatus = 'ABERTO' | 'FECHADO' | 'CANCELADO' | 'PENDENTE_ENTREGA' | 'pending' | 'open' | 'closed' | 'cancelled' | 'pending_delivery' | 'void' | 'VOID';
export type TaxRegime = 'GERAL' | 'SIMPLIFICADO' | 'EXCLUSAO';
export type ExpenseCategory = 'ALIMENTACAO' | 'BEBIDAS' | 'MATERIAL_LIMPEZA' | 'UTILIDADES' | 'REPARACOES' | 'MARKETING' | 'OUTROS';
export type ExpenseStatus = 'PENDENTE' | 'APROVADO' | 'PAGO';

// Permissões de Sistema
export type PermissionKey = 
  | 'POS_SALES'      // Realizar vendas
  | 'POS_VOID'       // Anular itens/pedidos
  | 'POS_DISCOUNT'   // Aplicar descontos
  | 'FINANCE_VIEW'   // Ver lucros e relatórios
  | 'STOCK_MANAGE'   // Gerir inventário
  | 'STAFF_MANAGE'   // Gerir funcionários e ponto
  | 'SYSTEM_CONFIG'  // Configurações core
  | 'OWNER_ACCESS'   // Acesso ao Owner Hub
  | 'AGT_CONFIG';    // Gestão de Fiscalidade AGT

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
}

export interface Table {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  x: number;
  y: number;
  zone: TableZone;
  shape: 'SQUARE' | 'ROUND';
  rotation: number;
  eventId?: string;
  event_reserved?: boolean;
}

export interface WorkShift {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  category_id: string;
  categoryId?: string; // Alias para compatibilidade
  description: string;
  image: string;
  image_url?: string; // Campo real do Supabase
  taxCode?: string;
  isVisible?: boolean;
  isVisibleDigital?: boolean;
  isFeatured?: boolean;
  is_active?: boolean; // Campo real do Supabase
  // Campos de stock
  stock_quantity?: number;
  unit?: string;
  sku?: string;
  min_stock?: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  isVisible?: boolean;
  isVisibleDigital?: boolean;
}

export interface OrderItem {
  dishId: string;
  dish_id?: string; // Compatibilidade com schema Supabase
  dish: Dish; // Adicionar propriedade dish para acesso ao produto completo
  name?: string; // Fallback para pedidos do Supabase sem dish carregado
  quantity: number;
  status: 'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE' | 'pending' | 'preparing' | 'ready' | 'served' | 'delivered';
  notes?: string;
  timestamp?: Date | string;
  unitPrice: number;
  unit_price?: number; // Compatibilidade com schema Supabase
  unitCost: number;
  unit_cost?: number; // Compatibilidade com schema Supabase
  taxAmount: number;
  tax_amount?: number; // Compatibilidade com schema Supabase
}

export interface Order {
  id: string;
  tableId: number | null;
  table_id?: number | null; // Compatibilidade com schema Supabase
  items: OrderItem[];
  status: OrderStatus;
  type: OrderType;
  timestamp: Date | string;
  total: number;
  taxTotal: number;
  tax_total?: number; // Compatibilidade com schema Supabase
  profit: number;
  subAccountName?: string;
  sub_account_name?: string; // Compatibilidade com schema Supabase
  customerId?: string;
  customer_id?: string; // Compatibilidade com schema Supabase
  invoiceNumber?: string;
  invoice_number?: string; // Compatibilidade com schema Supabase
  hash?: string;
  paymentMethod?: PaymentMethod;
  payment_method?: PaymentMethod; // Compatibilidade com schema Supabase
  name?: string; // Nome da conta/subconta
  _isLocal?: boolean; // 🔥 Marca ordens criadas localmente (nunca sobrescrever pelo Supabase)
  eventId?: string;
  isEventOrder?: boolean;
  eventOrderType?: 'INCLUIDO' | 'EXTRA';
}

export interface PaymentSplit {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerNif?: string;
  invoiceNumber?: string;
  status: 'pending' | 'paid';
  created_at?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  date: Date | string;
  paymentMethod?: PaymentMethod;
  receipt?: string;
  notes?: string;
  approvedBy?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  icon: string;
  type: PaymentMethod;
  isActive: boolean;
  requiresReference?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date | string;
  module: 'POS' | 'TABLES' | 'FINANCE' | 'SYSTEM';
}

export interface SystemSettings {
  restaurantName: string;
  appLogoUrl: string;
  currency: string;
  taxRate: number;
  taxRegime: TaxRegime;
  phone: string;
  address: string;
  nif: string;
  email: string;
  website: string;
  commercialReg: string;
  capitalSocial: string;
  conservatoria: string;
  agtCertificate: string;
  invoiceSeries: string;
  kdsEnabled: boolean;
  isSidebarCollapsed: boolean;
  apiToken: string;
  supabaseUrl: string;
  supabaseKey: string;
  autoBackup: boolean;
  customDigitalMenuUrl?: string;
  // Campos adicionais para conformidade AGT
  agtSoftwareCertification: string;
  agtSoftwareVersion: string;
  agtProductionCertificate: string;
  agtProcessNumber: string;
  agtCertificationDate: string;
  agtValidityPeriod: string;
  agtTechnicalResponsible: string;
  agtContactEmail: string;
  agtSupportPhone: string;
  saftPassword: string;
  digitalSignatureEnabled: boolean;
  electronicInvoiceEnabled: boolean;
  agtEnvironment: 'homologation' | 'production';
  dataRetentionPeriod: number;
  backupFrequency: number;
  lastAuditDate: string;
  nextAuditDate: string;
  // Novos campos para AGT real
  agtApiKey?: string;
  agtApiUrl?: string;
  agtProductionMode?: boolean;
  eacCode?: string;
  // Campos adicionais usados por useSettingsStore
  language?: string;
  timezone?: string;
  serviceCharge?: number;
  logo?: string;
  receiptFooter?: string;
  receiptHeader?: string;
  autoPrint?: boolean;
  autoCloseTable?: boolean;
  theme?: string;
  accentColor?: string;
  custosFixosMensal?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  nif: string;
  points: number;
  balance: number;
  visits: number;
  lastVisit: Date | string;
  debt?: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp?: string;
  read?: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  permissions: PermissionKey[]; 
  templateId?: string; // ID do grupo/perfil de origem
  status: 'ATIVO' | 'INATIVO';
}

export interface Reservation {
  id: string;
  customerName: string;
  date: Date | string;
  people: number;
  status: 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA';
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minThreshold: number;
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

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  salary: number;
  status: 'ATIVO' | 'INATIVO';
  color: string;
  workDaysPerMonth: number;
  dailyWorkHours: number;
  externalBioId: string;
  // Campos adicionais para benefícios
  foodAllowance?: number;
  transportAllowance?: number;
  bonus?: number;
  overtimeHourlyRate?: number;
  // Campos fiscais — Angola
  nif?: string;
  admissionDate?: string;
  contractType?: string;
  irtExempt?: boolean;
  autoCalculateTax?: boolean;
}

export interface AttendanceRecord {
  id?: string;
  employeeId: string;
  date: string;
  clockIn?: Date | string;
  clockOut?: Date | string | null;
}
