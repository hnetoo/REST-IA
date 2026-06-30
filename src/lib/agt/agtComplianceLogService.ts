import { supabase } from '../../supabase_standalone';

/**
 * Serviço de Logs de Conformidade AGT
 * Regista todas as comunicações com a AGT para auditoria fiscal
 */

export type AGTLogType = 
  | 'SERIES_REGISTRATION'
  | 'INVOICE_VALIDATION'
  | 'SAFT_UPLOAD'
  | 'SERIES_STATUS_CHECK'
  | 'CERTIFICATE_VALIDATION'
  | 'CONNECTION_TEST';

export type AGTLogStatus = 'SUCCESS' | 'ERROR' | 'PENDING';

export interface AGTComplianceLog {
  id?: number;
  log_type: AGTLogType;
  status: AGTLogStatus;
  request_data?: any;
  response_data?: any;
  error_message?: string;
  timestamp?: string;
}

/**
 * Regista um log de conformidade AGT
 */
export const logAGTCompliance = async (log: AGTComplianceLog): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('agt_compliance_logs')
      .insert({
        log_type: log.log_type,
        status: log.status,
        request_data: log.request_data,
        response_data: log.response_data,
        error_message: log.error_message
      });

    if (error) {
      console.error('[AGT_LOG] Erro ao registar log:', error);
      return false;
    }

    console.log('[AGT_LOG] Log registado:', log.log_type, log.status);
    return true;
  } catch (error) {
    console.error('[AGT_LOG] Erro ao registar log:', error);
    return false;
  }
};

/**
 * Regista registo de série na AGT
 */
export const logSeriesRegistration = async (
  request: any,
  response: any,
  status: AGTLogStatus
): Promise<boolean> => {
  return logAGTCompliance({
    log_type: 'SERIES_REGISTRATION',
    status,
    request_data: request,
    response_data: response,
    error_message: status === 'ERROR' ? response.message : undefined
  });
};

/**
 * Regista validação de fatura na AGT
 */
export const logInvoiceValidation = async (
  request: any,
  response: any,
  status: AGTLogStatus
): Promise<boolean> => {
  return logAGTCompliance({
    log_type: 'INVOICE_VALIDATION',
    status,
    request_data: request,
    response_data: response,
    error_message: status === 'ERROR' ? response.message : undefined
  });
};

/**
 * Regista upload de SAFT para AGT
 */
export const logSAFTUpload = async (
  request: any,
  response: any,
  status: AGTLogStatus
): Promise<boolean> => {
  return logAGTCompliance({
    log_type: 'SAFT_UPLOAD',
    status,
    request_data: request,
    response_data: response,
    error_message: status === 'ERROR' ? response.message : undefined
  });
};

/**
 * Regista consulta de estado de série
 */
export const logSeriesStatusCheck = async (
  request: any,
  response: any,
  status: AGTLogStatus
): Promise<boolean> => {
  return logAGTCompliance({
    log_type: 'SERIES_STATUS_CHECK',
    status,
    request_data: request,
    response_data: response,
    error_message: status === 'ERROR' ? response.message : undefined
  });
};

/**
 * Regista teste de conexão AGT
 */
export const logConnectionTest = async (
  request: any,
  response: any,
  status: AGTLogStatus
): Promise<boolean> => {
  return logAGTCompliance({
    log_type: 'CONNECTION_TEST',
    status,
    request_data: request,
    response_data: response,
    error_message: status === 'ERROR' ? response.message : undefined
  });
};

/**
 * Regista validação de certificado
 */
export const logCertificateValidation = async (
  request: any,
  response: any,
  status: AGTLogStatus
): Promise<boolean> => {
  return logAGTCompliance({
    log_type: 'CERTIFICATE_VALIDATION',
    status,
    request_data: request,
    response_data: response,
    error_message: status === 'ERROR' ? response.message : undefined
  });
};

/**
 * Busca logs de conformidade por tipo
 */
export const getAGTLogsByType = async (
  logType: AGTLogType,
  limit: number = 100
): Promise<AGTComplianceLog[]> => {
  try {
    const { data, error } = await supabase
      .from('agt_compliance_logs')
      .select('*')
      .eq('log_type', logType)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AGT_LOG] Erro ao buscar logs por tipo:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AGT_LOG] Erro ao buscar logs por tipo:', error);
    return [];
  }
};

/**
 * Busca logs de conformidade por status
 */
export const getAGTLogsByStatus = async (
  status: AGTLogStatus,
  limit: number = 100
): Promise<AGTComplianceLog[]> => {
  try {
    const { data, error } = await supabase
      .from('agt_compliance_logs')
      .select('*')
      .eq('status', status)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AGT_LOG] Erro ao buscar logs por status:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AGT_LOG] Erro ao buscar logs por status:', error);
    return [];
  }
};

/**
 * Busca logs de conformidade por período
 */
export const getAGTLogsByPeriod = async (
  startDate: string,
  endDate: string
): Promise<AGTComplianceLog[]> => {
  try {
    const { data, error } = await supabase
      .from('agt_compliance_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[AGT_LOG] Erro ao buscar logs por período:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AGT_LOG] Erro ao buscar logs por período:', error);
    return [];
  }
};

/**
 * Busca todos os logs de conformidade
 */
export const getAllAGTLogs = async (limit: number = 100): Promise<AGTComplianceLog[]> => {
  try {
    const { data, error } = await supabase
      .from('agt_compliance_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AGT_LOG] Erro ao buscar logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AGT_LOG] Erro ao buscar logs:', error);
    return [];
  }
};

/**
 * Calcula estatísticas de conformidade
 */
export const getAGTComplianceStats = async (
  startDate: string,
  endDate: string
): Promise<{
  total: number;
  success: number;
  error: number;
  pending: number;
  successRate: number;
}> => {
  try {
    const logs = await getAGTLogsByPeriod(startDate, endDate);
    
    const total = logs.length;
    const success = logs.filter(l => l.status === 'SUCCESS').length;
    const error = logs.filter(l => l.status === 'ERROR').length;
    const pending = logs.filter(l => l.status === 'PENDING').length;
    const successRate = total > 0 ? (success / total) * 100 : 0;

    return {
      total,
      success,
      error,
      pending,
      successRate
    };
  } catch (error) {
    console.error('[AGT_LOG] Erro ao calcular estatísticas:', error);
    return {
      total: 0,
      success: 0,
      error: 0,
      pending: 0,
      successRate: 0
    };
  }
};
