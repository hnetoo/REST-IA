/**
 * Serviço de Comunicação AGT Angola
 * Simula comunicação com os servidores da Autoridade Geral Tributária
 */

export interface AGTConfig {
  apiUrl: string;
  apiKey: string;
  certificate: string;
  production: boolean;
}

export interface AGTSeriesRequest {
  seriesCode: string;
  description: string;
  invoiceType: string;
  year: number;
  nif: string;
}

export interface AGTSeriesResponse {
  success: boolean;
  seriesId?: string;
  message?: string;
  errorCode?: string;
}

export interface AGTInvoiceValidationRequest {
  invoiceNumber: string;
  hash: string;
  invoiceDate: string;
  total: number;
  nifEmitente: string;
  nifCliente: string;
}

export interface AGTInvoiceValidationResponse {
  success: boolean;
  valid?: boolean;
  message?: string;
  errorCode?: string;
}

export interface AGTSAFTUploadRequest {
  saftXml: string;
  period: { month: number; year: number };
  nif: string;
  year: number;
  month: number;
}

export interface AGTSAFTUploadResponse {
  success: boolean;
  uploadId?: string;
  message?: string;
  errorCode?: string;
}

/**
 * Serviço de comunicação com AGT
 */
class AGTService {
  private config: AGTConfig;
  private isOnline: boolean = true;

  constructor(config: AGTConfig) {
    this.config = config;
  }

  /**
   * Regista uma série de faturas na AGT
   */
  async registerSeries(request: AGTSeriesRequest): Promise<AGTSeriesResponse> {
    try {
      if (!this.isOnline) {
        return {
          success: false,
          errorCode: 'OFFLINE',
          message: 'Sistema offline - registo em cache local'
        };
      }

      // Simular chamada API AGT
      // Na implementação real, faria fetch para o endpoint da AGT
      console.log('[AGT] Registo de série:', request.seriesCode);
      
      // Simular resposta de sucesso
      return {
        success: true,
        seriesId: `AGT-${request.seriesCode}-${request.year}`,
        message: 'Série registada com sucesso na AGT'
      };
    } catch (error) {
      console.error('[AGT] Erro ao registar série:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Valida uma fatura na AGT
   */
  async validateInvoice(request: AGTInvoiceValidationRequest): Promise<AGTInvoiceValidationResponse> {
    try {
      if (!this.isOnline) {
        return {
          success: false,
          errorCode: 'OFFLINE',
          message: 'Sistema offline - validação em cache local'
        };
      }

      // Simular validação
      console.log('[AGT] Validação de fatura:', request.invoiceNumber);
      
      // Simular resposta de sucesso
      return {
        success: true,
        valid: true,
        message: 'Fatura validada com sucesso'
      };
    } catch (error) {
      console.error('[AGT] Erro ao validar fatura:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Envia arquivo SAFT para a AGT
   */
  async uploadSAFT(request: AGTSAFTUploadRequest): Promise<AGTSAFTUploadResponse> {
    try {
      if (!this.isOnline) {
        return {
          success: false,
          errorCode: 'OFFLINE',
          message: 'Sistema offline - upload em cache local'
        };
      }

      // Simular upload
      console.log('[AGT] Upload SAFT:', request.period);
      
      // Simular resposta de sucesso
      return {
        success: true,
        uploadId: `SAFT-${request.year}-${request.month}`,
        message: 'SAFT enviado com sucesso para AGT'
      };
    } catch (error) {
      console.error('[AGT] Erro ao enviar SAFT:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Consulta estado de uma série
   */
  async checkSeriesStatus(seriesCode: string): Promise<{
    success: boolean;
    registered?: boolean;
    status?: string;
    message?: string;
  }> {
    try {
      if (!this.isOnline) {
        return {
          success: false,
          message: 'Sistema offline'
        };
      }

      console.log('[AGT] Consulta estado série:', seriesCode);
      
      // Simular resposta
      return {
        success: true,
        registered: true,
        status: 'ACTIVE',
        message: 'Série activa na AGT'
      };
    } catch (error) {
      console.error('[AGT] Erro ao consultar série:', error);
      return {
        success: false,
        message: 'Erro de comunicação com AGT'
      };
    }
  }

  /**
   * Define estado online/offline
   */
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    console.log('[AGT] Status:', online ? 'ONLINE' : 'OFFLINE');
  }

  /**
   * Atualiza configuração
   */
  updateConfig(config: Partial<AGTConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Instância singleton
let agtServiceInstance: AGTService | null = null;

/**
 * Inicializa o serviço AGT
 */
export const initializeAGTService = (config: AGTConfig): AGTService => {
  if (!agtServiceInstance) {
    agtServiceInstance = new AGTService(config);
  }
  return agtServiceInstance;
};

/**
 * Retorna a instância do serviço AGT
 */
export const getAGTService = (): AGTService | null => {
  return agtServiceInstance;
};

/**
 * Configuração padrão (sandbox)
 */
export const defaultAGTConfig: AGTConfig = {
  apiUrl: 'https://agt-sandbox.minfin.gov.ao/api/v1',
  apiKey: '',
  certificate: '',
  production: false
};
