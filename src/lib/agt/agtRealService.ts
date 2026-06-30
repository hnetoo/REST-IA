/**
 * Serviço de Comunicação Real com AGT Angola
 * Implementa endpoints reais para substituir simulação
 * Integra assinatura JWS RS256 conforme especificação AGT
 */

import { 
  getAGTSignatureService, 
  type JWSSoftwareSignatureData
} from './agtSignatureService';

export interface AGTRealConfig {
  apiUrl: string;
  apiKey: string;
  certificate: string;
  production: boolean;
}

export interface AGTRealSeriesRequest {
  seriesCode: string;
  description: string;
  invoiceType: string;
  year: number;
  nif: string;
}

export interface AGTRealSeriesResponse {
  success: boolean;
  seriesId?: string;
  registrationCode?: string;
  message?: string;
  errorCode?: string;
}

export interface AGTRealInvoiceValidationRequest {
  invoiceNumber: string;
  hash: string;
  invoiceDate: string;
  total: number;
  nifEmitente: string;
  nifCliente: string;
}

export interface AGTRealInvoiceValidationResponse {
  success: boolean;
  valid?: boolean;
  validationCode?: string;
  message?: string;
  errorCode?: string;
}

export interface AGTRealSAFTUploadRequest {
  saftXml: string;
  period: { month: number; year: number };
  nif: string;
  fileName: string;
}

export interface AGTRealSAFTUploadResponse {
  success: boolean;
  uploadId?: string;
  protocolNumber?: string;
  uploadDate?: string;
  message?: string;
  errorCode?: string;
}

/**
 * Serviço de Comunicação Real com AGT
 */
class AGTRealService {
  private config: AGTRealConfig;

  constructor(config: AGTRealConfig) {
    this.config = config;
  }

  /**
   * Regista uma série de faturas na AGT (endpoint real)
   */
  async registerSeries(request: AGTRealSeriesRequest): Promise<AGTRealSeriesResponse> {
    try {
      console.log('[AGT_REAL] Registo de série:', request.seriesCode);
      
      // Endpoint real da AGT (substituir com URL real quando disponível)
      const response = await fetch(`${this.config.apiUrl}/api/v1/series/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        },
        body: JSON.stringify({
          seriesCode: request.seriesCode,
          description: request.description,
          invoiceType: request.invoiceType,
          year: request.year,
          nif: request.nif
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('[AGT_REAL] Resposta registo série:', result);
      return result;
    } catch (error) {
      console.error('[AGT_REAL] Erro ao registar série:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Valida uma fatura na AGT (endpoint real)
   */
  async validateInvoice(request: AGTRealInvoiceValidationRequest): Promise<AGTRealInvoiceValidationResponse> {
    try {
      console.log('[AGT_REAL] Validação de fatura:', request.invoiceNumber);
      
      // Endpoint real da AGT (substituir com URL real quando disponível)
      const response = await fetch(`${this.config.apiUrl}/api/v1/invoices/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        },
        body: JSON.stringify({
          invoiceNumber: request.invoiceNumber,
          hash: request.hash,
          invoiceDate: request.invoiceDate,
          total: request.total,
          nifEmitente: request.nifEmitente,
          nifCliente: request.nifCliente
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('[AGT_REAL] Resposta validação fatura:', result);
      return result;
    } catch (error) {
      console.error('[AGT_REAL] Erro ao validar fatura:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Envia arquivo SAFT para a AGT (endpoint real)
   */
  async uploadSAFT(request: AGTRealSAFTUploadRequest): Promise<AGTRealSAFTUploadResponse> {
    try {
      console.log('[AGT_REAL] Upload SAFT:', request.fileName);
      
      // Endpoint real da AGT (substituir com URL real quando disponível)
      const formData = new FormData();
      formData.append('saftXml', new Blob([request.saftXml], { type: 'application/xml' }));
      formData.append('period', JSON.stringify(request.period));
      formData.append('nif', request.nif);
      formData.append('fileName', request.fileName);

      const response = await fetch(`${this.config.apiUrl}/api/v1/saft/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('[AGT_REAL] Resposta upload SAFT:', result);
      return result;
    } catch (error) {
      console.error('[AGT_REAL] Erro ao fazer upload SAFT:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Consulta estado de uma série na AGT (endpoint real)
   */
  async checkSeriesStatus(seriesCode: string, year: number): Promise<{
    success: boolean;
    registered?: boolean;
    status?: string;
    message?: string;
  }> {
    try {
      console.log('[AGT_REAL] Consulta estado série:', seriesCode);
      
      // Endpoint real da AGT (substituir com URL real quando disponível)
      const response = await fetch(`${this.config.apiUrl}/api/v1/series/${seriesCode}/status?year=${year}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('[AGT_REAL] Resposta consulta estado:', result);
      return result;
    } catch (error) {
      console.error('[AGT_REAL] Erro ao consultar estado:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Testa conexão com a AGT (endpoint real)
   */
  async testConnection(): Promise<{
    success: boolean;
    message?: string;
    serverVersion?: string;
  }> {
    try {
      console.log('[AGT_REAL] Testando conexão...');
      
      // Endpoint real da AGT (substituir com URL real quando disponível)
      const response = await fetch(`${this.config.apiUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('[AGT_REAL] Resposta teste conexão:', result);
      return result;
    } catch (error) {
      console.error('[AGT_REAL] Erro ao testar conexão:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Define status online/offline
   */
  setOnlineStatus(online: boolean): void {
    console.log('[AGT_REAL] Status:', online ? 'ONLINE' : 'OFFLINE');
  }

  /**
   * Atualiza configuração
   */
  updateConfig(config: Partial<AGTRealConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Regista factura com assinatura JWS (endpoint real AGT)
   * Inclui jwsSoftwareSignature e jwsDocumentSignature conforme especificação AGT
   */
  async registerInvoiceWithSignature(
    invoiceData: {
      documentNo: string;
      documentType: 'FT' | 'FR' | 'TV' | 'ND' | 'NC';
      documentDate: string;
      taxRegistrationNumber: string;
      customerTaxID: string;
      customerCountry: string;
      documentTotals: {
        taxPayable: number;
        netTotal: number;
        grossTotal: number;
      };
      hash: string;
      softwareInfo: JWSSoftwareSignatureData;
    }
  ): Promise<{ success: boolean; requestID?: string; message?: string; errorCode?: string }> {
    try {
      console.log('[AGT_REAL] Registo de factura com JWS:', invoiceData.documentNo);

      const signatureService = getAGTSignatureService();
      if (!signatureService || !signatureService.isInitialized()) {
        return {
          success: false,
          errorCode: 'SIGNATURE_NOT_INITIALIZED',
          message: 'Serviço de assinatura JWS não inicializado'
        };
      }

      // Assinar software
      const signedSoftware = await signatureService.signSoftware(invoiceData.softwareInfo);

      // Assinar documento
      const signedDocument = await signatureService.signDocument({
        documentNo: invoiceData.documentNo,
        taxRegistrationNumber: invoiceData.taxRegistrationNumber,
        documentType: invoiceData.documentType,
        documentDate: invoiceData.documentDate,
        customerTaxID: invoiceData.customerTaxID,
        customerCountry: invoiceData.customerCountry,
        documentTotals: invoiceData.documentTotals
      });

      // Preparar payload completo conforme especificação AGT
      const payload = {
        schemaVersion: '1.0',
        softwareInfo: {
          productId: signedSoftware.productId,
          productVersion: signedSoftware.productVersion,
          softwareValidationNumber: signedSoftware.softwareValidationNumber,
          jwsSoftwareSignature: signedSoftware.jwsSoftwareSignature
        },
        document: {
          documentNo: signedDocument.documentNo,
          taxRegistrationNumber: signedDocument.taxRegistrationNumber,
          documentType: signedDocument.documentType,
          documentDate: signedDocument.documentDate,
          customerTaxID: signedDocument.customerTaxID,
          customerCountry: signedDocument.customerCountry,
          documentTotals: signedDocument.documentTotals,
          jwsDocumentSignature: signedDocument.jwsDocumentSignature
        },
        hash: invoiceData.hash,
        submissionTimeStamp: new Date().toISOString()
      };

      // Endpoint real AGT
      const response = await fetch(`${this.config.apiUrl}/api/v1/invoices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AGT_REAL] Resposta registo factura JWS:', result);
      
      return {
        success: true,
        requestID: result.requestID,
        message: 'Factura registada com sucesso na AGT'
      };
    } catch (error) {
      console.error('[AGT_REAL] Erro ao registar factura com JWS:', error);
      return {
        success: false,
        errorCode: 'SIGNATURE_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao assinar e registar factura'
      };
    }
  }

  /**
   * Valida documento com assinatura JWS (serviço 4.7 AGT)
   * Permite confirmar ou rejeitar facturas recebidas
   */
  async validateDocumentWithSignature(
    validationData: {
      documentNo: string;
      action: 'C' | 'R'; // C = Confirmar, R = Rejeitar
      taxRegistrationNumber: string;
      deductibleVATPercentage?: number;
      nonDeductibleAmount?: number;
      softwareInfo: JWSSoftwareSignatureData;
    }
  ): Promise<{ success: boolean; actionResultCode?: string; message?: string; errorCode?: string }> {
    try {
      console.log('[AGT_REAL] Validação de documento com JWS:', validationData.documentNo);

      const signatureService = getAGTSignatureService();
      if (!signatureService || !signatureService.isInitialized()) {
        return {
          success: false,
          errorCode: 'SIGNATURE_NOT_INITIALIZED',
          message: 'Serviço de assinatura JWS não inicializado'
        };
      }

      // Assinar software
      const signedSoftware = await signatureService.signSoftware(validationData.softwareInfo);

      // Preparar payload de validação
      const payload: any = {
        schemaVersion: '1.0',
        taxRegistrationNumber: validationData.taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          productId: signedSoftware.productId,
          productVersion: signedSoftware.productVersion,
          softwareValidationNumber: signedSoftware.softwareValidationNumber,
          jwsSoftwareSignature: signedSoftware.jwsSoftwareSignature
        },
        documentNo: validationData.documentNo,
        action: validationData.action
      };

      // Adicionar campos opcionais de IVA (exclusivos)
      if (validationData.deductibleVATPercentage !== undefined) {
        payload.deductibleVATPercentage = validationData.deductibleVATPercentage.toFixed(2);
      } else if (validationData.nonDeductibleAmount !== undefined) {
        payload.nonDeductibleAmount = validationData.nonDeductibleAmount.toFixed(2);
      }

      // Endpoint real AGT 4.7
      const response = await fetch(`${this.config.apiUrl}/api/v1/validarDocumento`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-AGT-Certificate': this.config.certificate
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AGT_REAL] Resposta validação documento JWS:', result);
      
      return {
        success: result.actionResultCode === 'C_OK' || result.actionResultCode === 'R_OK',
        actionResultCode: result.actionResultCode,
        message: result.message || 'Validação processada'
      };
    } catch (error) {
      console.error('[AGT_REAL] Erro ao validar documento com JWS:', error);
      return {
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao validar documento'
      };
    }
  }
}

// Instância singleton
let agtRealServiceInstance: AGTRealService | null = null;

/**
 * Inicializa o serviço AGT real
 */
export const initializeAGTRealService = (config: AGTRealConfig): AGTRealService => {
  if (!agtRealServiceInstance) {
    agtRealServiceInstance = new AGTRealService(config);
  }
  return agtRealServiceInstance;
};

/**
 * Retorna a instância do serviço AGT real
 */
export const getAGTRealService = (): AGTRealService | null => {
  return agtRealServiceInstance;
};

/**
 * Configuração padrão (produção)
 */
export const defaultAGTRealConfig: AGTRealConfig = {
  apiUrl: 'https://agt.minfin.gov.ao/api/v1',
  apiKey: '',
  certificate: '',
  production: true
};
