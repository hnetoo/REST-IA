// Tipos locais do módulo Finance

// Tipo Order baseado no schema Supabase
export interface FinanceOrder {
  id: string;
  created_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  status: string | null;
  table_number: number | null;
  total_amount: number;
  updated_at: string | null;

  // Campos adicionais para compatibilidade com código existente
  total?: number;
  timestamp?: string | null;
  taxTotal?: number;
  profit?: number;
}
