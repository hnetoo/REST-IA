import { supabase } from '../supabase_standalone';
import { generateSAFT } from './saftService';
import { downloadSAFT } from './saftService';

/**
 * Serviço de Relatórios de Conformidade AGT
 * Gera e gere relatórios de conformidade fiscal
 */

export type ReportType = 'SAFT' | 'INVOICE_SUMMARY' | 'STOCK_SUMMARY' | 'COMPLIANCE_SUMMARY';
export type ReportStatus = 'GENERATED' | 'UPLOADED' | 'FAILED';

export interface ComplianceReport {
  id?: number;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  generated_at?: string;
  file_path?: string;
  file_size?: number;
  status: ReportStatus;
  uploaded_at?: string;
  upload_id?: string;
  notes?: string;
}

/**
 * Gera relatório SAFT
 */
export const generateSAFTReport = async (
  period: { month: number; year: number },
  orders: any[],
  customers: any[],
  menu: any[],
  settings: any
): Promise<{ xml: string; filename: string }> => {
  try {
    const xml = await generateSAFT(orders, customers, menu, settings, period);
    const filename = `SAFT_AO_${settings.nif}_${period.year}_${(period.month + 1).toString().padStart(2, '0')}.xml`;
    
    return { xml, filename };
  } catch (error) {
    console.error('[REPORT] Erro ao gerar SAFT:', error);
    throw error;
  }
};

/**
 * Regista relatório de conformidade
 */
export const registerComplianceReport = async (
  report: ComplianceReport
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_reports')
      .insert({
        report_type: report.report_type,
        period_start: report.period_start,
        period_end: report.period_end,
        file_path: report.file_path,
        file_size: report.file_size,
        status: report.status,
        uploaded_at: report.uploaded_at,
        upload_id: report.upload_id,
        notes: report.notes
      });

    if (error) {
      console.error('[REPORT] Erro ao registar relatório:', error);
      return false;
    }

    console.log('[REPORT] Relatório registado:', report.report_type);
    return true;
  } catch (error) {
    console.error('[REPORT] Erro ao registar relatório:', error);
    return false;
  }
};

/**
 * Gera e regista relatório SAFT
 */
export const generateAndRegisterSAFT = async (
  period: { month: number; year: number },
  orders: any[],
  customers: any[],
  menu: any[],
  settings: any
): Promise<{ success: boolean; reportId?: number; filename?: string }> => {
  try {
    // Gerar SAFT
    const { xml, filename } = await generateSAFTReport(period, orders, customers, menu, settings);
    
    // Calcular período
    const startDate = `${period.year}-${(period.month + 1).toString().padStart(2, '0')}-01`;
    const lastDay = new Date(period.year, period.month + 1, 0).getDate();
    const endDate = `${period.year}-${(period.month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    // Registar relatório
    const report: ComplianceReport = {
      report_type: 'SAFT',
      period_start: startDate,
      period_end: endDate,
      file_path: `/reports/${filename}`,
      file_size: xml.length,
      status: 'GENERATED',
      notes: 'SAFT gerado automaticamente'
    };
    
    const { data, error } = await supabase
      .from('compliance_reports')
      .insert(report)
      .select()
      .single();
    
    if (error) {
      console.error('[REPORT] Erro ao registar relatório:', error);
      return { success: false };
    }
    
    // Download do SAFT
    downloadSAFT(xml, filename);
    
    console.log('[REPORT] SAFT gerado e registado:', data.id);
    return { success: true, reportId: data.id, filename };
  } catch (error) {
    console.error('[REPORT] Erro ao gerar e registar SAFT:', error);
    return { success: false };
  }
};

/**
 * Gera resumo de faturas por período
 */
export const generateInvoiceSummaryReport = async (
  startDate: string,
  endDate: string
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .eq('status', 'FECHADO');
    
    if (error) {
      console.error('[REPORT] Erro ao buscar faturas:', error);
      return null;
    }
    
    const summary: any = {
      total_invoices: data?.length || 0,
      total_amount: data?.reduce((acc, o) => acc + (o.total || 0), 0) || 0,
      total_tax: data?.reduce((acc, o) => acc + (o.taxTotal || o.tax_total || 0), 0) || 0,
      by_type: {} as Record<string, number>,
      by_payment_method: {} as Record<string, number>
    };
    
    // Agrupar por tipo
    data?.forEach(order => {
      const type = order.invoice_number?.startsWith('FR') ? 'FR' : 'FT';
      summary.by_type[type] = (summary.by_type[type] || 0) + 1;
      
      const method = order.payment_method || order.paymentMethod || 'OUTRO';
      summary.by_payment_method[method] = (summary.by_payment_method[method] || 0) + (order.total || 0);
    });
    
    return summary;
  } catch (error) {
    console.error('[REPORT] Erro ao gerar resumo de faturas:', error);
    return null;
  }
};

/**
 * Gera resumo de stock por período
 */
export const generateStockSummaryReport = async (
  startDate: string,
  endDate: string
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);
    
    if (error) {
      console.error('[REPORT] Erro ao buscar movimentos de stock:', error);
      return null;
    }
    
    const summary: any = {
      total_movements: data?.length || 0,
      entries: 0,
      exits: 0,
      adjustments: 0,
      by_product: {} as Record<string, number>
    };
    
    // Agrupar por tipo e produto
    data?.forEach(movement => {
      if (movement.movement_type === 'ENTRADA') {
        summary.entries += movement.quantity;
      } else if (movement.movement_type === 'SAIDA') {
        summary.exits += Math.abs(movement.quantity);
      } else if (movement.movement_type === 'AJUSTE') {
        summary.adjustments += Math.abs(movement.quantity);
      }
      
      const product = movement.product_id;
      summary.by_product[product] = (summary.by_product[product] || 0) + movement.quantity;
    });
    
    return summary;
  } catch (error) {
    console.error('[REPORT] Erro ao gerar resumo de stock:', error);
    return null;
  }
};

/**
 * Gera resumo de conformidade por período
 */
export const generateComplianceSummaryReport = async (
  startDate: string,
  endDate: string
): Promise<any> => {
  try {
    // Buscar logs AGT
    const { data: agtLogs } = await supabase
      .from('agt_compliance_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);
    
    // Buscar logs de auditoria
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);
    
    // Buscar relatórios
    const { data: reports } = await supabase
      .from('compliance_reports')
      .select('*')
      .gte('period_start', startDate)
      .lte('period_end', endDate);
    
    const summary: any = {
      agt_communications: agtLogs?.length || 0,
      agt_success: agtLogs?.filter(l => l.status === 'SUCCESS').length || 0,
      agt_errors: agtLogs?.filter(l => l.status === 'ERROR').length || 0,
      audit_logs: auditLogs?.length || 0,
      reports_generated: reports?.length || 0,
      reports_uploaded: reports?.filter(r => r.status === 'UPLOADED').length || 0,
      by_module: {} as Record<string, number>,
      by_action: {} as Record<string, number>
    };
    
    // Agrupar logs por módulo
    auditLogs?.forEach(log => {
      summary.by_module[log.module] = (summary.by_module[log.module] || 0) + 1;
      summary.by_action[log.action] = (summary.by_action[log.action] || 0) + 1;
    });
    
    return summary;
  } catch (error) {
    console.error('[REPORT] Erro ao gerar resumo de conformidade:', error);
    return null;
  }
};

/**
 * Busca relatórios por período
 */
export const getReportsByPeriod = async (
  startDate: string,
  endDate: string
): Promise<ComplianceReport[]> => {
  try {
    const { data, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('generated_at', { ascending: false });
    
    if (error) {
      console.error('[REPORT] Erro ao buscar relatórios:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[REPORT] Erro ao buscar relatórios:', error);
    return [];
  }
};

/**
 * Busca relatórios por tipo
 */
export const getReportsByType = async (
  reportType: ReportType,
  limit: number = 100
): Promise<ComplianceReport[]> => {
  try {
    const { data, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('report_type', reportType)
      .order('generated_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[REPORT] Erro ao buscar relatórios por tipo:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[REPORT] Erro ao buscar relatórios por tipo:', error);
    return [];
  }
};

/**
 * Atualiza status de relatório
 */
export const updateReportStatus = async (
  reportId: number,
  status: ReportStatus,
  uploadId?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_reports')
      .update({
        status,
        uploaded_at: status === 'UPLOADED' ? new Date().toISOString() : undefined,
        upload_id: uploadId
      })
      .eq('id', reportId);
    
    if (error) {
      console.error('[REPORT] Erro ao atualizar status:', error);
      return false;
    }
    
    console.log('[REPORT] Status atualizado:', reportId, status);
    return true;
  } catch (error) {
    console.error('[REPORT] Erro ao atualizar status:', error);
    return false;
  }
};
