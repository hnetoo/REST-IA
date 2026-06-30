/**
 * Tipos de Documentos Fiscais AGT Angola
 * Conforme Decreto Presidencial nº 71/25 de 26 de Fevereiro
 */

// Tipos de documentos fiscais reconhecidos pela AGT Angola (Decreto 71/25)
// Documentação oficial: quiosqueagt.minfin.gov.ao
export type AGTDocumentType =
  // --- Core (Restauração / Comércio) ---
  | 'FT'  // Fatura (B2B, pagamento diferido)
  | 'FR'  // Fatura-Recibo (mais comum em restauração — pagamento imediato)
  | 'TV'  // Talão de Venda (B2C balcão, sem NIF)
  | 'RG'  // Recibo (pagamento de dívida já faturada)
  | 'NC'  // Nota de Crédito (anulação / devolução)
  | 'ND'  // Nota de Débito (acréscimo a fatura emitida)
  // --- Outros setores (não usados em restauração) ---
  | 'FA'  // Factura de Adiantamento
  | 'FG'  // Factura Global
  | 'GF'  // Factura Genérica
  | 'AC'  // Aviso de Cobrança
  | 'AR'  // Aviso de Cobrança/Recibo
  | 'RC'  // Recibo Emitido
  | 'RE'  // Estorno ou Recibo de Estorno
  | 'AF'  // Factura/Recibo de Autofacturação
  | 'RP'  // Prémio ou Recibo de Prémio
  | 'RA'  // Resseguro Aceite
  | 'CS'  // Imputação a Co-seguradoras
  | 'LD'; // Imputação a Co-seguradora Líder

// Status do documento
export type AGTDocumentStatus =
  | 'N' // Normal
  | 'A' // Anulada
  | 'C' // Corrigida
  | 'R' // Recusada
  | 'P'; // Pendente

// Códigos de imposto IVA
export type AGTTaxCode =
  | 'NOR' // Taxa Normal (14%)
  | 'RED' // Taxa Reduzida (7%)
  | 'ISE' // Isento
  | 'OUT'; // Outro

// Estado de submissão AGT
export type AGTSubmissionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

// Estado da série
export type AGTSeriesStatus =
  | 'A' // Activa
  | 'U' // Em uso
  | 'F'; // Finalizada

// Linha de documento fiscal
export interface AGTDocumentLine {
  lineNumber: number;
  productCode: string;
  productDescription: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxCode: AGTTaxCode;
  taxPercentage: number;
  taxAmount: number;
  netAmount: number;
  grossAmount: number;
}

// Documento fiscal completo
export interface AGTDocument {
  id: string;
  documentType: AGTDocumentType;
  documentStatus: AGTDocumentStatus;
  seriesCode: string;
  documentNumber: string;
  documentDate: string; // ISO date
  taxRegistrationNumber: string; // NIF emitente
  customerTaxID: string;
  customerName: string;
  customerCountry: string; // 'AO' por padrão
  customerAddress?: string;
  eacCode?: string; // Código EAC (Estabelecimento de Alimentação e Bebidas)
  hash: string;
  hashControl?: number;
  previousHash?: string;
  lines: AGTDocumentLine[];
  documentTotals: {
    taxPayable: number;
    netTotal: number;
    grossTotal: number;
    discountTotal?: number;
  };
  paymentMethod: string;
  paymentTerms?: string;
  sourceBilling: 'P' | 'S'; // P = Programa, S = SaaS
  createdAt: string;
  updatedAt: string;
  agtSubmissionUuid?: string;
  agtSubmissionStatus?: AGTSubmissionStatus;
  agtResponseCode?: string;
  agtResponseMessage?: string;
  // Relação com pedido local
  orderId?: string;
  invoiceNumber?: string;
  // Documento de origem (para NC/ND que referenciam documento anterior)
  sourceDocument?: {
    documentNumber: string;
    documentType: AGTDocumentType;
    reason: string;
  };
  // Dados do recibo (para RG/RC/AR — documentos sem linhas)
  paymentReceipt?: {
    receiptNo?: string;
    receiptDate?: string;
    receiptTotal?: number;
    paymentMethod?: string;
  };
}

// Série de faturação autorizada pela AGT
export interface AGTSeries {
  id: string;
  seriesCode: string;
  seriesYear: number;
  documentType: AGTDocumentType;
  establishmentNumber: string;
  authorizedQuantity: number;
  firstDocumentNo: string;
  lastDocumentNo: string;
  currentSequence: number;
  status: AGTSeriesStatus;
  agtRegistrationCode?: string;
  agtRegisteredAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Submissão à AGT
export interface AGTSubmission {
  id: string;
  requestId: string;
  submissionUuid: string;
  orderId?: string;
  documentNo: string;
  documentType: AGTDocumentType;
  status: AGTSubmissionStatus;
  resultCode?: number;
  actionResultCode?: string;
  submittedAt: string;
  processedAt?: string;
  responseData?: Record<string, any>;
  errorDetails?: Record<string, any>;
  retryCount: number;
  lastRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Log de conformidade AGT
export interface AGTComplianceLog {
  id: string;
  logType: 'SERIES_REGISTRATION' | 'INVOICE_VALIDATION' | 'SAFT_UPLOAD' | 'DOCUMENT_EMISSION' | 'SIGNATURE';
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  errorMessage?: string;
  timestamp: string;
}

// Configuração fiscal do estabelecimento
export interface AGTFiscalConfig {
  nif: string;
  companyName: string;
  businessName: string;
  address: string;
  city: string;
  country: string;
  taxRegime: 'GERAL' | 'SIMPLIFICADO' | 'EXCLUSAO';
  taxRate: number;
  eacCode?: string;
  softwareCertificateNumber?: string;
  productCompanyID: string;
}

// Dados para geração de hash AGT
export interface AGTHashData {
  invoiceNumber: string;
  invoiceDate: string;
  nifEmitente: string;
  nifCliente: string;
  total: number;
  items: Array<{
    productCode: string;
    quantity: number;
    unitPrice: number;
    taxPercentage: number;
  }>;
}

// Resposta de emissão de documento
export interface AGTEmissionResult {
  success: boolean;
  document?: AGTDocument;
  errorCode?: string;
  message?: string;
}

// Filtros para consulta de documentos
export interface AGTDocumentFilter {
  documentType?: AGTDocumentType;
  status?: AGTDocumentStatus;
  startDate?: string;
  endDate?: string;
  customerTaxID?: string;
  seriesCode?: string;
}
