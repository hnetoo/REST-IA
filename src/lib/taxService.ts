import { supabase } from '../supabase_standalone';

/**
 * Serviço de Taxas de Imposto IVA para conformidade AGT
 * Gerencia taxas de imposto angolanas (NOR, RED, ISE)
 */

export interface TaxRate {
  id: number;
  code: string; // NOR, RED, ISE
  description: string;
  rate: number; // 14.00, 5.00, 0.00
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Busca todas as taxas de imposto ativas
 */
export const getTaxRates = async (): Promise<TaxRate[]> => {
  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('is_active', true)
      .order('code');
    
    if (error) {
      console.error('[TAX] Erro ao buscar taxas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[TAX] Erro ao buscar taxas:', error);
    return [];
  }
};

/**
 * Busca taxa de imposto por código
 */
export const getTaxRateByCode = async (code: string): Promise<TaxRate | null> => {
  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('[TAX] Erro ao buscar taxa por código:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[TAX] Erro ao buscar taxa por código:', error);
    return null;
  }
};

/**
 * Calcula valor do imposto para um valor base
 */
export const calculateTax = (baseAmount: number, taxRate: number): number => {
  return (baseAmount * taxRate) / 100;
};

/**
 * Calcula valor total com imposto incluído
 */
export const calculateTotalWithTax = (baseAmount: number, taxRate: number): number => {
  return baseAmount + calculateTax(baseAmount, taxRate);
};

/**
 * Calcula valor base a partir do total com imposto
 */
export const calculateBaseFromTotal = (totalAmount: number, taxRate: number): number => {
  return totalAmount / (1 + taxRate / 100);
};

/**
 * Calcula imposto a partir do total com imposto
 */
export const calculateTaxFromTotal = (totalAmount: number, taxRate: number): number => {
  const baseAmount = calculateBaseFromTotal(totalAmount, taxRate);
  return calculateTax(baseAmount, taxRate);
};

/**
 * Taxas padrão de IVA Angola
 */
export const DEFAULT_TAX_RATES = {
  NOR: { code: 'NOR', description: 'Taxa Normal', rate: 14.00 },
  RED: { code: 'RED', description: 'Taxa Reduzida', rate: 5.00 },
  ISE: { code: 'ISE', description: 'Isento', rate: 0.00 }
};

/**
 * Retorna taxa padrão por código
 */
export const getDefaultTaxRate = (code: string): number => {
  return DEFAULT_TAX_RATES[code as keyof typeof DEFAULT_TAX_RATES]?.rate || 14.00;
};

/**
 * Valida código de taxa de imposto
 */
export const validateTaxCode = (code: string): boolean => {
  return ['NOR', 'RED', 'ISE'].includes(code);
};

/**
 * Retorna descrição da taxa
 */
export const getTaxDescription = (code: string): string => {
  return DEFAULT_TAX_RATES[code as keyof typeof DEFAULT_TAX_RATES]?.description || 'Taxa Desconhecida';
};
