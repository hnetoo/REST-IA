/**
 * Hook React para Gestão de Documentos Fiscais AGT
 * Integra emissão, séries, submissões e SAFT
 */

import { useState, useCallback, useEffect, useRef } from 'react';

import { supabase } from '../supabase_standalone';

import type {
  AGTDocument,
  AGTDocumentFilter,
  AGTDocumentType,
  AGTSeries,
  AGTSubmissionStatus,
  AGTSeriesStatus
} from '../types/agt';

import {
  emitDocument,
  emitDocumentFromOrder,
  documentToDbRow,
  dbRowToDocument,
  type EmitDocumentOptions,
  type OrderForAGT
} from '../lib/agt/documentService';

import { logSAFTUpload } from '../lib/agt/agtComplianceLogService';

import { getAGTRealService } from '../lib/agt/agtRealService';

interface UseAGTReturn {
  // Estado
  documents: AGTDocument[];
  series: AGTSeries[];
  loading: boolean;
  error: string | null;

  // Ações
  emitDocument: (opts: EmitDocumentOptions) => Promise<{ success: boolean; document?: AGTDocument; message?: string }>;
  emitFromOrder: (order: OrderForAGT, documentType?: AGTDocumentType) => Promise<{ success: boolean; document?: AGTDocument; message?: string }>;
  loadDocuments: (filter?: AGTDocumentFilter) => Promise<void>;
  loadSeries: () => Promise<void>;
  cancelDocument: (docId: string, reason?: string) => Promise<boolean>;
  submitToAGT: (docId: string) => Promise<boolean>;

  // Utilitários
  getDocumentByOrderId: (orderId: string) => AGTDocument | undefined;
  getSeriesForType: (type: AGTDocumentType) => AGTSeries | undefined;
}

export function useAGT(config: {
  taxRegistrationNumber?: string;
  taxRate?: number;
  eacCode?: string;
} = {}): UseAGTReturn {
  const [documents, setDocuments] = useState<AGTDocument[]>([]);
  const [series, setSeries] = useState<AGTSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  // Carregar séries do Supabase
  const loadSeries = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: sbError } = await supabase
        .from('agt_series')
        .select('*')
        .eq('status', 'A')
        .order('series_year', { ascending: false });

      if (sbError) throw sbError;

      const mapped: AGTSeries[] = (data || []).map(row => ({
        id: row.id,
        seriesCode: row.series_code,
        seriesYear: row.series_year,
        documentType: row.document_type,
        establishmentNumber: row.establishment_number || '001',
        authorizedQuantity: row.authorized_quantity,
        firstDocumentNo: row.first_document_no,
        lastDocumentNo: row.last_document_no,
        currentSequence: row.current_sequence || 0,
        status: (row.status as AGTSeriesStatus) || 'A',
        agtRegistrationCode: row.agt_registration_code,
        agtRegisteredAt: row.agt_registered_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      setSeries(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar séries';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar documentos do Supabase
  const loadDocuments = useCallback(async (filter?: AGTDocumentFilter) => {
    try {
      setLoading(true);
      let query = supabase.from('agt_documents').select('*').order('created_at', { ascending: false });

      if (filter?.documentType) query = query.eq('document_type', filter.documentType);
      if (filter?.status) query = query.eq('document_status', filter.status);
      if (filter?.seriesCode) query = query.eq('series_code', filter.seriesCode);
      if (filter?.startDate) query = query.gte('document_date', filter.startDate);
      if (filter?.endDate) query = query.lte('document_date', filter.endDate);
      if (filter?.customerTaxID) query = query.eq('customer_tax_id', filter.customerTaxID);

      const { data, error: sbError } = await query.limit(200);
      if (sbError) throw sbError;

      const mapped = (data || []).map(dbRowToDocument);
      setDocuments(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar documentos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Emitir documento fiscal
  const handleEmitDocument = useCallback(async (opts: EmitDocumentOptions) => {
    try {
      setLoading(true);
      setError(null);

      const result = await emitDocument(opts);
      if (!result.success || !result.document) {
        setError(result.message || 'Erro ao emitir documento');
        return { success: false, message: result.message };
      }

      const doc = result.document;

      // Persistir no Supabase
      const row = documentToDbRow(doc);
      const { error: sbError } = await supabase.from('agt_documents').insert(row);
      if (sbError) {
        console.error('[useAGT] Erro Supabase ao inserir documento:', sbError);
      }

      // Atualizar sequência da série
      const { error: updError } = await supabase
        .from('agt_series')
        .update({ current_sequence: opts.series.currentSequence + 1 })
        .eq('id', opts.series.id);
      if (updError) console.error('[useAGT] Erro ao atualizar série:', updError);

      setDocuments(prev => [doc, ...prev]);
      return { success: true, document: doc };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao emitir documento';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Emitir a partir de Order
  const handleEmitFromOrder = useCallback(async (order: OrderForAGT, documentType: AGTDocumentType = 'FR') => {
    const activeSeries = series.find(s => s.documentType === documentType && s.status === 'A');
    if (!activeSeries) {
      const msg = `Nenhuma série ativa encontrada para ${documentType}`;
      setError(msg);
      return { success: false, message: msg };
    }

    const cfg = configRef.current;
    return handleEmitDocument({
      documentType,
      series: activeSeries,
      taxRegistrationNumber: cfg.taxRegistrationNumber || '999999999',
      customerTaxID: order.customer_id,
      customerName: order.subAccountName || order.sub_account_name,
      eacCode: cfg.eacCode,
      paymentMethod: order.payment_method || order.paymentMethod,
      orderId: order.id,
      invoiceNumber: order.invoice_number || order.invoiceNumber,
      lines: order.items.map((item, idx) => ({
        productCode: item.dishId || item.dish_id || String(idx),
        productDescription: item.dish?.name || 'Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice || item.unit_price || 0,
        discount: 0,
        taxCode: 'NOR' as const,
        taxPercentage: cfg.taxRate || 14
      }))
    });
  }, [series, handleEmitDocument]);

  // Cancelar documento (Nota de Crédito)
  const cancelDocument = useCallback(async (docId: string, reason?: string) => {
    try {
      setLoading(true);
      const doc = documents.find(d => d.id === docId);
      if (!doc) return false;

      // Atualizar status para Anulada
      const { error: updError } = await supabase
        .from('agt_documents')
        .update({ document_status: 'A', updated_at: new Date().toISOString() })
        .eq('id', docId);

      if (updError) throw updError;

      // Emitir Nota de Crédito se necessário (reembolso)
      // Para simplificar, apenas marcamos como anulada
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, documentStatus: 'A' as const } : d));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar documento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [documents]);

  // Submeter documento à AGT
  const submitToAGT = useCallback(async (docId: string) => {
    try {
      const doc = documents.find(d => d.id === docId);
      if (!doc) return false;

      const service = getAGTRealService();
      if (!service) {
        setError('Serviço AGT não inicializado');
        return false;
      }

      // Tentar registo com assinatura
      const result = await service.registerInvoiceWithSignature({
        documentNo: doc.documentNumber,
        documentType: doc.documentType as any,
        documentDate: doc.documentDate,
        taxRegistrationNumber: doc.taxRegistrationNumber,
        customerTaxID: doc.customerTaxID,
        customerCountry: doc.customerCountry,
        documentTotals: {
          taxPayable: doc.documentTotals.taxPayable,
          netTotal: doc.documentTotals.netTotal,
          grossTotal: doc.documentTotals.grossTotal
        },
        hash: doc.hash,
        softwareInfo: {
          productId: 'TASCA_VEREDA_POS',
          productVersion: '1.0.2',
          softwareValidationNumber: configRef.current.taxRegistrationNumber || '999999999'
        }
      });

      // Atualizar status no Supabase
      const { error: updError } = await supabase
        .from('agt_documents')
        .update({
          agt_submission_status: result.success ? 'ACCEPTED' : 'REJECTED',
          agt_response_code: result.errorCode || (result.success ? '200' : '500'),
          agt_response_message: result.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (updError) console.error('[useAGT] Erro ao atualizar submissão:', updError);

      setDocuments(prev => prev.map(d =>
        d.id === docId
          ? {
              ...d,
              agtSubmissionStatus: result.success ? 'ACCEPTED' : 'REJECTED',
              agtResponseCode: result.errorCode || (result.success ? '200' : '500'),
              agtResponseMessage: result.message
            }
          : d
      ));

      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao submeter à AGT');
      return false;
    }
  }, [documents]);

  // Utilitários
  const getDocumentByOrderId = useCallback((orderId: string) => {
    return documents.find(d => d.orderId === orderId);
  }, [documents]);

  const getSeriesForType = useCallback((type: AGTDocumentType) => {
    return series.find(s => s.documentType === type && s.status === 'A');
  }, [series]);

  // Carregamento inicial
  useEffect(() => {
    loadSeries();
    loadDocuments();
  }, [loadSeries, loadDocuments]);

  return {
    documents,
    series,
    loading,
    error,
    emitDocument: handleEmitDocument,
    emitFromOrder: handleEmitFromOrder,
    loadDocuments,
    loadSeries,
    cancelDocument,
    submitToAGT,
    getDocumentByOrderId,
    getSeriesForType
  };
}
