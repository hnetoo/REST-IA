import { supabase } from '../supabase_standalone';

/**
 * Serviço de Auditoria para conformidade AGT
 * Regista todas as ações críticas do sistema para auditoria fiscal
 */

export type AuditAction = 
  | 'CREATE_INVOICE'
  | 'UPDATE_INVOICE'
  | 'DELETE_INVOICE'
  | 'REGISTER_SERIES'
  | 'VALIDATE_INVOICE'
  | 'UPLOAD_SAFT'
  | 'STOCK_MOVEMENT'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'CONFIGURATION_CHANGE'
  | 'SYSTEM_ERROR'
  | 'VOID_SALE'
  | 'DISCOUNT_APPLIED'
  | 'SHIFT_DISCREPANCY';

export type AuditModule = 'POS' | 'INVOICE' | 'STOCK' | 'AGT' | 'SYSTEM' | 'USER';

export interface AuditLog {
  id?: number;
  user_id?: string;
  user_name?: string;
  action: AuditAction;
  module: AuditModule;
  entity_type?: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

/**
 * Regista um log de auditoria
 */
export const logAudit = async (log: AuditLog): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: log.user_id || 'SYSTEM',
        user_name: log.user_name || 'System',
        action: log.action,
        module: log.module,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        old_values: log.old_values,
        new_values: log.new_values,
        ip_address: log.ip_address,
        user_agent: log.user_agent
      });

    if (error) {
      console.error('[AUDIT] Erro ao registar log:', error);
      return false;
    }

    console.log('[AUDIT] Log registado:', log.action, log.module);
    return true;
  } catch (error) {
    console.error('[AUDIT] Erro ao registar log:', error);
    return false;
  }
};

/**
 * Regista criação de fatura
 */
export const logInvoiceCreation = async (
  invoiceId: string,
  invoiceData: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'CREATE_INVOICE',
    module: 'INVOICE',
    entity_type: 'INVOICE',
    entity_id: invoiceId,
    new_values: invoiceData
  });
};

/**
 * Regista atualização de fatura
 */
export const logInvoiceUpdate = async (
  invoiceId: string,
  oldData: any,
  newData: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'UPDATE_INVOICE',
    module: 'INVOICE',
    entity_type: 'INVOICE',
    entity_id: invoiceId,
    old_values: oldData,
    new_values: newData
  });
};

/**
 * Regista eliminação de fatura
 */
export const logInvoiceDeletion = async (
  invoiceId: string,
  invoiceData: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'DELETE_INVOICE',
    module: 'INVOICE',
    entity_type: 'INVOICE',
    entity_id: invoiceId,
    old_values: invoiceData
  });
};

/**
 * Regista movimento de stock
 */
export const logStockMovement = async (
  productId: string,
  movementData: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'STOCK_MOVEMENT',
    module: 'STOCK',
    entity_type: 'PRODUCT',
    entity_id: productId,
    new_values: movementData
  });
};

/**
 * Regista registo de série na AGT
 */
export const logSeriesRegistration = async (
  seriesId: string,
  seriesData: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'REGISTER_SERIES',
    module: 'AGT',
    entity_type: 'SERIES',
    entity_id: seriesId,
    new_values: seriesData
  });
};

/**
 * Regista upload de SAFT
 */
export const logSAFTUpload = async (
  uploadId: string,
  uploadData: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'UPLOAD_SAFT',
    module: 'AGT',
    entity_type: 'SAFT',
    entity_id: uploadId,
    new_values: uploadData
  });
};

/**
 * Regista login de utilizador
 */
export const logUserLogin = async (
  userId: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'USER_LOGIN',
    module: 'USER',
    entity_type: 'USER',
    entity_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent
  });
};

/**
 * Regista logout de utilizador
 */
export const logUserLogout = async (
  userId: string,
  userName: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'USER_LOGOUT',
    module: 'USER',
    entity_type: 'USER',
    entity_id: userId
  });
};

/**
 * Regista alteração de configuração
 */
export const logConfigurationChange = async (
  configType: string,
  oldConfig: any,
  newConfig: any,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'CONFIGURATION_CHANGE',
    module: 'SYSTEM',
    entity_type: 'CONFIGURATION',
    entity_id: configType,
    old_values: oldConfig,
    new_values: newConfig
  });
};

/**
 * Regista erro do sistema
 */
export const logSystemError = async (
  errorType: string,
  errorMessage: string,
  errorData: any,
  userId?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: 'SYSTEM',
    action: 'SYSTEM_ERROR',
    module: 'SYSTEM',
    entity_type: 'ERROR',
    entity_id: errorType,
    new_values: {
      error: errorMessage,
      data: errorData
    }
  });
};

/**
 * Regista anulação de venda (VOID_SALE)
 */
export const logVoidSale = async (
  orderId: string,
  orderData: any,
  reason: string,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'VOID_SALE',
    module: 'POS',
    entity_type: 'ORDER',
    entity_id: orderId,
    old_values: orderData,
    new_values: { reason, voided_at: new Date().toISOString() }
  });
};

/**
 * Regista aplicação de desconto (DISCOUNT_APPLIED)
 */
export const logDiscountApplied = async (
  orderId: string,
  originalTotal: number,
  discountedTotal: number,
  discountReason: string,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'DISCOUNT_APPLIED',
    module: 'POS',
    entity_type: 'ORDER',
    entity_id: orderId,
    old_values: { total: originalTotal },
    new_values: { total: discountedTotal, discount_amount: originalTotal - discountedTotal, reason: discountReason }
  });
};

/**
 * Regista discrepância no fecho de caixa (SHIFT_DISCREPANCY)
 */
export const logShiftDiscrepancy = async (
  shiftId: string,
  expectedAmount: number,
  closingAmount: number,
  discrepancy: number,
  justification: string,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  return logAudit({
    user_id: userId,
    user_name: userName,
    action: 'SHIFT_DISCREPANCY',
    module: 'POS',
    entity_type: 'SHIFT',
    entity_id: shiftId,
    old_values: { expected_amount: expectedAmount },
    new_values: { closing_amount: closingAmount, discrepancy, justification }
  });
};

/**
 * Busca logs de auditoria por utilizador
 */
export const getAuditLogsByUser = async (
  userId: string,
  limit: number = 100
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AUDIT] Erro ao buscar logs por utilizador:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AUDIT] Erro ao buscar logs por utilizador:', error);
    return [];
  }
};

/**
 * Busca logs de auditoria por módulo
 */
export const getAuditLogsByModule = async (
  module: AuditModule,
  limit: number = 100
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('module', module)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AUDIT] Erro ao buscar logs por módulo:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AUDIT] Erro ao buscar logs por módulo:', error);
    return [];
  }
};

/**
 * Busca logs de auditoria por período
 */
export const getAuditLogsByPeriod = async (
  startDate: string,
  endDate: string
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[AUDIT] Erro ao buscar logs por período:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AUDIT] Erro ao buscar logs por período:', error);
    return [];
  }
};

/**
 * Busca logs de auditoria por ação
 */
export const getAuditLogsByAction = async (
  action: AuditAction,
  limit: number = 100
): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AUDIT] Erro ao buscar logs por ação:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AUDIT] Erro ao buscar logs por ação:', error);
    return [];
  }
};
