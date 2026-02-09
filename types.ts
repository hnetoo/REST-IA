
export type TableStatus = 'LIVRE' | 'OCUPADO' | 'RESERVADO' | 'PAGAMENTO';
export type TableZone = 'INTERIOR' | 'EXTERIOR' | 'BALCAO';
export type UserRole = 'ADMIN' | 'CAIXA' | 'GARCOM' | 'COZINHA' | 'OWNER';
export type PaymentMethod = 'NUMERARIO' | 'TPA' | 'TRANSFERENCIA' | 'QR_CODE' | 'PAGAR_DEPOIS';
export type OrderType = 'LOCAL' | 'ENCOMENDA' | 'TAKEAWAY';
export type OrderStatus = 'ABERTO' | 'FECHADO' | 'CANCELADO' | 'PENDENTE_ENTREGA';
export type TaxRegime = 'GERAL' | 'SIMPLIFICADO' | 'EXCLUSAO';

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
  categoryId: string;
  description: string;
  image: string;
  taxCode?: string;
  isVisibleDigital?: boolean;
  isFeatured?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  isVisibleDigital?: boolean;
}

export interface OrderItem {
  dishId: string;
  quantity: number;
  status: 'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'ENTREGUE';
  notes: string;
  unitPrice: number;
  unitCost: number;
  taxAmount: number;
}

export interface Order {
  id: string;
  tableId: number | null;
  items: OrderItem[];
  status: OrderStatus;
  type: OrderType;
  timestamp: Date | string;
  total: number;
  taxTotal: number;
  profit: number;
  subAccountName?: string;
  customerId?: string;
  invoiceNumber?: string;
  hash?: string;
  paymentMethod?: PaymentMethod;
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
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
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
}

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  clockIn?: Date | string;
  clockOut?: Date | string;
}
