/**
 * Serviço de Emissão de Documentos Fiscais AGT
 * Gera FT, FR, ND, NC, GT com hash e sequencialidade conforme legislação angolana
 */

import type {
  AGTDocument,
  AGTDocumentLine,
  AGTDocumentType,
  AGTEmissionResult,
  AGTSeries,
  AGTTaxCode
} from '../../types/agt';

import { generateInvoiceHash } from '../validation/hashService';

// ─── Helpers ───────────────────────────────────────────────

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

const todayISO = () => new Date().toISOString().split('T')[0];

// ─── Geração de Número de Documento ────────────────────────

export function generateDocumentNumber(
  series: AGTSeries,
  documentType: AGTDocumentType
): string {
  const next = series.currentSequence + 1;
  const prefix = documentType;
  const yearSuffix = String(series.seriesYear).slice(-2);
  const seq = pad(next, 6);
  return `${prefix} ${series.seriesCode}/${seq}`;
}

// ─── Cálculo de Hash AGT ──────────────────────────────────

export interface HashInput {
  documentNumber: string;
  documentDate: string;
  taxRegistrationNumber: string;
  customerTaxID: string;
  grossTotal: number;
}

export async function calculateDocumentHash(
  doc: HashInput,
  lines: AGTDocumentLine[]
): Promise<string> {
  return generateInvoiceHash(
    doc.documentNumber,
    doc.documentDate,
    doc.taxRegistrationNumber,
    doc.customerTaxID,
    doc.grossTotal,
    lines.map(l => ({
      productCode: l.productCode,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxPercentage: l.taxPercentage
    }))
  );
}

// ─── Emissão de Documento ─────────────────────────────────

export interface EmitDocumentOptions {
  documentType: AGTDocumentType;
  series: AGTSeries;
  taxRegistrationNumber: string;
  customerTaxID?: string;
  customerName?: string;
  customerCountry?: string;
  customerAddress?: string;
  eacCode?: string;
  paymentMethod?: string;
  orderId?: string;
  invoiceNumber?: string;
  lines: Array<{
    productCode: string;
    productDescription: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxCode: AGTTaxCode;
    taxPercentage: number;
  }>;
}

export async function emitDocument(
  opts: EmitDocumentOptions
): Promise<AGTEmissionResult> {
  try {
    const { documentType, series } = opts;

    // Validações básicas
    if (!opts.taxRegistrationNumber) {
      return { success: false, errorCode: 'MISSING_NIF', message: 'NIF do emitente é obrigatório' };
    }
    if (!opts.lines || opts.lines.length === 0) {
      return { success: false, errorCode: 'EMPTY_LINES', message: 'Documento sem linhas' };
    }
    if (series.currentSequence >= series.authorizedQuantity) {
      return { success: false, errorCode: 'SERIES_EXHAUSTED', message: 'Série esgotada' };
    }

    const docNumber = generateDocumentNumber(series, documentType);
    const docDate = todayISO();
    const customerTaxID = opts.customerTaxID || '999999999';
    const customerName = opts.customerName || 'CONSUMIDOR FINAL';
    const customerCountry = opts.customerCountry || 'AO';

    // Construir linhas do documento
    const documentLines: AGTDocumentLine[] = opts.lines.map((line, idx) => {
      const gross = line.quantity * line.unitPrice;
      const discount = line.discount || 0;
      const net = gross - discount;
      const taxAmount = net * (line.taxPercentage / 100);
      return {
        lineNumber: idx + 1,
        productCode: line.productCode,
        productDescription: line.productDescription,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: discount,
        taxCode: line.taxCode,
        taxPercentage: line.taxPercentage,
        taxAmount: Math.round(taxAmount * 100) / 100,
        netAmount: Math.round(net * 100) / 100,
        grossAmount: Math.round(gross * 100) / 100
      };
    });

    // Totais
    const grossTotal = documentLines.reduce((s, l) => s + l.grossAmount, 0);
    const discountTotal = documentLines.reduce((s, l) => s + (l.discount || 0), 0);
    const netTotal = documentLines.reduce((s, l) => s + l.netAmount, 0);
    const taxPayable = documentLines.reduce((s, l) => s + l.taxAmount, 0);

    // Hash
    const hash = await calculateDocumentHash(
      {
        documentNumber: docNumber,
        documentDate: docDate,
        taxRegistrationNumber: opts.taxRegistrationNumber,
        customerTaxID,
        grossTotal
      },
      documentLines
    );

    const document: AGTDocument = {
      id: crypto.randomUUID(),
      documentType,
      documentStatus: 'N',
      seriesCode: series.seriesCode,
      documentNumber: docNumber,
      documentDate: docDate,
      taxRegistrationNumber: opts.taxRegistrationNumber,
      customerTaxID,
      customerName,
      customerCountry,
      customerAddress: opts.customerAddress,
      eacCode: opts.eacCode,
      hash,
      previousHash: undefined,
      lines: documentLines,
      documentTotals: {
        taxPayable: Math.round(taxPayable * 100) / 100,
        netTotal: Math.round(netTotal * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100
      },
      paymentMethod: opts.paymentMethod || 'NUMERARIO',
      sourceBilling: 'P',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderId: opts.orderId,
      invoiceNumber: opts.invoiceNumber || docNumber,
      agtSubmissionStatus: 'PENDING'
    };

    return { success: true, document };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, errorCode: 'EMISSION_ERROR', message };
  }
}

// ─── Emissão rápida a partir de Order ─────────────────────

export interface OrderForAGT {
  id: string;
  items: Array<{
    dishId?: string;
    dish_id?: string;
    dish?: { name?: string; id?: string };
    quantity: number;
    unitPrice?: number;
    unit_price?: number;
    unitCost?: number;
    unit_cost?: number;
    taxAmount?: number;
    tax_amount?: number;
    notes?: string;
  }>;
  total: number;
  taxTotal?: number;
  tax_total?: number;
  paymentMethod?: string;
  payment_method?: string;
  invoiceNumber?: string;
  invoice_number?: string;
  customerId?: string;
  customer_id?: string;
  subAccountName?: string;
  sub_account_name?: string;
  timestamp?: Date | string;
}

export async function emitDocumentFromOrder(
  order: OrderForAGT,
  series: AGTSeries,
  config: {
    taxRegistrationNumber: string;
    customerTaxID?: string;
    customerName?: string;
    taxRate?: number;
    eacCode?: string;
  },
  documentType: AGTDocumentType = 'FR'
): Promise<AGTEmissionResult> {
  const lines = order.items.map((item, idx) => {
    const unitPrice = item.unitPrice ?? item.unit_price ?? 0;
    const taxRate = config.taxRate ?? 14;
    return {
      productCode: item.dishId ?? item.dish_id ?? String(idx),
      productDescription: item.dish?.name ?? 'Item',
      quantity: item.quantity,
      unitPrice,
      discount: 0,
      taxCode: 'NOR' as AGTTaxCode,
      taxPercentage: taxRate
    };
  });

  return emitDocument({
    documentType,
    series,
    taxRegistrationNumber: config.taxRegistrationNumber,
    customerTaxID: config.customerTaxID,
    customerName: config.customerName ?? order.subAccountName ?? order.sub_account_name ?? 'CONSUMIDOR FINAL',
    eacCode: config.eacCode,
    paymentMethod: order.paymentMethod ?? order.payment_method ?? 'NUMERARIO',
    orderId: order.id,
    invoiceNumber: order.invoiceNumber ?? order.invoice_number,
    lines
  });
}

// ─── Emissão de Nota de Crédito (NC) ──────────────────────

export interface CreditNoteOptions {
  series: AGTSeries;
  taxRegistrationNumber: string;
  sourceDocument: {
    documentNumber: string;
    documentType: AGTDocumentType;
    reason: string;
  };
  customerTaxID?: string;
  customerName?: string;
  grossTotal: number;
  taxRate?: number;
  eacCode?: string;
}

export async function emitCreditNote(
  opts: CreditNoteOptions
): Promise<AGTEmissionResult> {
  try {
    const { series, sourceDocument, taxRegistrationNumber } = opts;
    const documentType: AGTDocumentType = 'NC';

    if (!taxRegistrationNumber) {
      return { success: false, errorCode: 'MISSING_NIF', message: 'NIF do emitente é obrigatório' };
    }
    if (series.currentSequence >= series.authorizedQuantity) {
      return { success: false, errorCode: 'SERIES_EXHAUSTED', message: 'Série esgotada' };
    }

    const docNumber = generateDocumentNumber(series, documentType);
    const docDate = todayISO();
    const customerTaxID = opts.customerTaxID || '999999999';
    const customerName = opts.customerName || 'CONSUMIDOR FINAL';
    const customerCountry = 'AO';

    const taxPercentage = opts.taxRate ?? 14;
    const grossTotal = opts.grossTotal;
    const netTotal = grossTotal / (1 + taxPercentage / 100);
    const taxPayable = grossTotal - netTotal;

    // Linha única indicando a anulação
    const documentLines: AGTDocumentLine[] = [{
      lineNumber: 1,
      productCode: 'ANULACAO',
      productDescription: `Anulação de ${sourceDocument.documentType} ${sourceDocument.documentNumber} — ${sourceDocument.reason}`,
      quantity: 1,
      unitPrice: netTotal,
      discount: 0,
      taxCode: 'NOR' as AGTTaxCode,
      taxPercentage,
      taxAmount: Math.round(taxPayable * 100) / 100,
      netAmount: Math.round(netTotal * 100) / 100,
      grossAmount: Math.round(grossTotal * 100) / 100
    }];

    const hash = await calculateDocumentHash(
      { documentNumber: docNumber, documentDate: docDate, taxRegistrationNumber, customerTaxID, grossTotal },
      documentLines
    );

    const document: AGTDocument = {
      id: crypto.randomUUID(),
      documentType,
      documentStatus: 'N',
      seriesCode: series.seriesCode,
      documentNumber: docNumber,
      documentDate: docDate,
      taxRegistrationNumber,
      customerTaxID,
      customerName,
      customerCountry,
      eacCode: opts.eacCode,
      hash,
      previousHash: undefined,
      lines: documentLines,
      documentTotals: {
        taxPayable: Math.round(taxPayable * 100) / 100,
        netTotal: Math.round(netTotal * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        discountTotal: 0
      },
      paymentMethod: 'NUMERARIO',
      sourceBilling: 'P',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceDocument,
      agtSubmissionStatus: 'PENDING'
    };

    return { success: true, document };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, errorCode: 'EMISSION_ERROR', message };
  }
}

// ─── Emissão de Nota de Débito (ND) ───────────────────────

export interface DebitNoteOptions {
  series: AGTSeries;
  taxRegistrationNumber: string;
  sourceDocument: {
    documentNumber: string;
    documentType: AGTDocumentType;
    reason: string;
  };
  customerTaxID?: string;
  customerName?: string;
  grossTotal: number;
  taxRate?: number;
  eacCode?: string;
}

export async function emitDebitNote(
  opts: DebitNoteOptions
): Promise<AGTEmissionResult> {
  try {
    const { series, sourceDocument, taxRegistrationNumber } = opts;
    const documentType: AGTDocumentType = 'ND';

    if (!taxRegistrationNumber) {
      return { success: false, errorCode: 'MISSING_NIF', message: 'NIF do emitente é obrigatório' };
    }
    if (series.currentSequence >= series.authorizedQuantity) {
      return { success: false, errorCode: 'SERIES_EXHAUSTED', message: 'Série esgotada' };
    }

    const docNumber = generateDocumentNumber(series, documentType);
    const docDate = todayISO();
    const customerTaxID = opts.customerTaxID || '999999999';
    const customerName = opts.customerName || 'CONSUMIDOR FINAL';
    const customerCountry = 'AO';

    const taxPercentage = opts.taxRate ?? 14;
    const grossTotal = opts.grossTotal;
    const netTotal = grossTotal / (1 + taxPercentage / 100);
    const taxPayable = grossTotal - netTotal;

    const documentLines: AGTDocumentLine[] = [{
      lineNumber: 1,
      productCode: 'ACRESCIMO',
      productDescription: `Acréscimo a ${sourceDocument.documentType} ${sourceDocument.documentNumber} — ${sourceDocument.reason}`,
      quantity: 1,
      unitPrice: netTotal,
      discount: 0,
      taxCode: 'NOR' as AGTTaxCode,
      taxPercentage,
      taxAmount: Math.round(taxPayable * 100) / 100,
      netAmount: Math.round(netTotal * 100) / 100,
      grossAmount: Math.round(grossTotal * 100) / 100
    }];

    const hash = await calculateDocumentHash(
      { documentNumber: docNumber, documentDate: docDate, taxRegistrationNumber, customerTaxID, grossTotal },
      documentLines
    );

    const document: AGTDocument = {
      id: crypto.randomUUID(),
      documentType,
      documentStatus: 'N',
      seriesCode: series.seriesCode,
      documentNumber: docNumber,
      documentDate: docDate,
      taxRegistrationNumber,
      customerTaxID,
      customerName,
      customerCountry,
      eacCode: opts.eacCode,
      hash,
      previousHash: undefined,
      lines: documentLines,
      documentTotals: {
        taxPayable: Math.round(taxPayable * 100) / 100,
        netTotal: Math.round(netTotal * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        discountTotal: 0
      },
      paymentMethod: 'NUMERARIO',
      sourceBilling: 'P',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceDocument,
      agtSubmissionStatus: 'PENDING'
    };

    return { success: true, document };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, errorCode: 'EMISSION_ERROR', message };
  }
}

// ─── Emissão de Recibo (RG/RC/AR) ─────────────────────────

export interface ReceiptOptions {
  series: AGTSeries;
  taxRegistrationNumber: string;
  customerTaxID?: string;
  customerName?: string;
  grossTotal: number;
  paymentMethod: string;
  sourceDocument: {
    documentNumber: string;
    documentType: AGTDocumentType;
  };
  eacCode?: string;
}

export async function emitReceipt(
  opts: ReceiptOptions
): Promise<AGTEmissionResult> {
  try {
    const { series, sourceDocument, taxRegistrationNumber } = opts;
    const documentType: AGTDocumentType = 'RG';

    if (!taxRegistrationNumber) {
      return { success: false, errorCode: 'MISSING_NIF', message: 'NIF do emitente é obrigatório' };
    }
    if (series.currentSequence >= series.authorizedQuantity) {
      return { success: false, errorCode: 'SERIES_EXHAUSTED', message: 'Série esgotada' };
    }

    const docNumber = generateDocumentNumber(series, documentType);
    const docDate = todayISO();
    const customerTaxID = opts.customerTaxID || '999999999';
    const customerName = opts.customerName || 'CONSUMIDOR FINAL';
    const customerCountry = 'AO';

    const grossTotal = opts.grossTotal;
    const netTotal = grossTotal;
    const taxPayable = 0; // Recibo não tem IVA

    // Recibo não tem linhas de artigos — apenas dados do pagamento
    const hash = await calculateDocumentHash(
      { documentNumber: docNumber, documentDate: docDate, taxRegistrationNumber, customerTaxID, grossTotal },
      []
    );

    const document: AGTDocument = {
      id: crypto.randomUUID(),
      documentType,
      documentStatus: 'N',
      seriesCode: series.seriesCode,
      documentNumber: docNumber,
      documentDate: docDate,
      taxRegistrationNumber,
      customerTaxID,
      customerName,
      customerCountry,
      eacCode: opts.eacCode,
      hash,
      previousHash: undefined,
      lines: [],
      documentTotals: {
        taxPayable: 0,
        netTotal: Math.round(netTotal * 100) / 100,
        grossTotal: Math.round(grossTotal * 100) / 100,
        discountTotal: 0
      },
      paymentMethod: opts.paymentMethod || 'NUMERARIO',
      sourceBilling: 'P',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceDocument: {
        ...sourceDocument,
        reason: 'Pagamento de dívida'
      },
      paymentReceipt: {
        receiptNo: docNumber,
        receiptDate: docDate,
        receiptTotal: grossTotal,
        paymentMethod: opts.paymentMethod || 'NUMERARIO'
      },
      agtSubmissionStatus: 'PENDING'
    };

    return { success: true, document };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, errorCode: 'EMISSION_ERROR', message };
  }
}

// ─── Conversão para formato Supabase/Local ────────────────

export function documentToDbRow(doc: AGTDocument): Record<string, any> {
  return {
    id: doc.id,
    document_type: doc.documentType,
    document_status: doc.documentStatus,
    series_code: doc.seriesCode,
    document_number: doc.documentNumber,
    document_date: doc.documentDate,
    tax_registration_number: doc.taxRegistrationNumber,
    customer_tax_id: doc.customerTaxID,
    customer_name: doc.customerName,
    customer_country: doc.customerCountry,
    customer_address: doc.customerAddress,
    eac_code: doc.eacCode,
    hash: doc.hash,
    previous_hash: doc.previousHash,
    lines_json: JSON.stringify(doc.lines),
    tax_payable: doc.documentTotals.taxPayable,
    net_total: doc.documentTotals.netTotal,
    gross_total: doc.documentTotals.grossTotal,
    discount_total: doc.documentTotals.discountTotal ?? 0,
    payment_method: doc.paymentMethod,
    payment_terms: doc.paymentTerms,
    source_billing: doc.sourceBilling,
    order_id: doc.orderId,
    invoice_number: doc.invoiceNumber,
    agt_submission_uuid: doc.agtSubmissionUuid,
    agt_submission_status: doc.agtSubmissionStatus,
    agt_response_code: doc.agtResponseCode,
    agt_response_message: doc.agtResponseMessage,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  };
}

export function dbRowToDocument(row: Record<string, any>): AGTDocument {
  return {
    id: row.id,
    documentType: row.document_type,
    documentStatus: row.document_status,
    seriesCode: row.series_code,
    documentNumber: row.document_number,
    documentDate: row.document_date,
    taxRegistrationNumber: row.tax_registration_number,
    customerTaxID: row.customer_tax_id,
    customerName: row.customer_name,
    customerCountry: row.customer_country,
    customerAddress: row.customer_address,
    eacCode: row.eac_code,
    hash: row.hash,
    previousHash: row.previous_hash,
    lines: typeof row.lines_json === 'string' ? JSON.parse(row.lines_json) : row.lines_json ?? [],
    documentTotals: {
      taxPayable: Number(row.tax_payable ?? 0),
      netTotal: Number(row.net_total ?? 0),
      grossTotal: Number(row.gross_total ?? 0),
      discountTotal: Number(row.discount_total ?? 0)
    },
    paymentMethod: row.payment_method,
    paymentTerms: row.payment_terms,
    sourceBilling: row.source_billing,
    orderId: row.order_id,
    invoiceNumber: row.invoice_number,
    agtSubmissionUuid: row.agt_submission_uuid,
    agtSubmissionStatus: row.agt_submission_status,
    agtResponseCode: row.agt_response_code,
    agtResponseMessage: row.agt_response_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
