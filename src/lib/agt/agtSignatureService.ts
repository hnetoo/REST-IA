/**
 * Serviço de Assinatura JWS RS256 para AGT Angola
 * Implementa assinatura digital conforme especificação AGT 2025-2026
 */

import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';

// Interfaces conforme especificação AGT
export interface JWSSoftwareSignatureData {
  productId: string;
  productVersion: string;
  softwareValidationNumber: string;
}

export interface JWSDocumentSignatureData {
  documentNo: string;
  taxRegistrationNumber: string;
  documentType: 'FT' | 'FR' | 'TV' | 'ND' | 'NC' | 'VD';
  documentDate: string;
  customerTaxID: string;
  customerCountry: string;
  documentTotals: {
    taxPayable: number;
    netTotal: number;
    grossTotal: number;
  };
}

export interface JWSSignedSoftware {
  productId: string;
  productVersion: string;
  softwareValidationNumber: string;
  jwsSoftwareSignature: string;
}

export interface JWSSignedDocument {
  documentNo: string;
  taxRegistrationNumber: string;
  documentType: string;
  documentDate: string;
  customerTaxID: string;
  customerCountry: string;
  documentTotals: JWSDocumentSignatureData['documentTotals'];
  jwsDocumentSignature: string;
}

export interface AGTSignatureConfig {
  privateKeyPEM: string;
  publicKeyPEM?: string;
  certificateThumbprint?: string;
  issuer: string;
  audience: string;
}

/**
 * Serviço de Assinatura JWS RS256 para AGT
 */
class AGTSignatureService {
  private config: AGTSignatureConfig | null = null;
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;

  /**
   * Inicializa o serviço com chaves RSA
   */
  async initialize(config: AGTSignatureConfig): Promise<void> {
    try {
      this.config = config;
      
      // Importar chave privada PKCS#8
      this.privateKey = await importPKCS8(config.privateKeyPEM, 'RS256');
      
      // Importar chave pública se fornecida
      if (config.publicKeyPEM) {
        this.publicKey = await importSPKI(config.publicKeyPEM, 'RS256');
      }
      
      console.log('[AGT_SIGNATURE] Serviço de assinatura JWS RS256 inicializado');
    } catch (error) {
      console.error('[AGT_SIGNATURE] Erro ao inicializar serviço:', error);
      throw new Error('Falha ao inicializar serviço de assinatura JWS');
    }
  }

  /**
   * Assina dados do software (para registo AGT)
   */
  async signSoftware(data: JWSSoftwareSignatureData): Promise<JWSSignedSoftware> {
    if (!this.privateKey || !this.config) {
      throw new Error('Serviço de assinatura não inicializado');
    }

    try {
      // Criar payload JWT conforme especificação AGT
      const payload = {
        productId: data.productId,
        productVersion: data.productVersion,
        softwareValidationNumber: data.softwareValidationNumber,
        iat: Math.floor(Date.now() / 1000),
        type: 'software'
      };

      // Assinar com RS256
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ 
          alg: 'RS256',
          typ: 'JWT',
          ...(this.config.certificateThumbprint && {
            x5t: this.config.certificateThumbprint
          })
        })
        .setIssuedAt()
        .setIssuer(this.config.issuer)
        .setAudience(this.config.audience)
        .setExpirationTime('1h')
        .sign(this.privateKey);

      return {
        productId: data.productId,
        productVersion: data.productVersion,
        softwareValidationNumber: data.softwareValidationNumber,
        jwsSoftwareSignature: jwt
      };
    } catch (error) {
      console.error('[AGT_SIGNATURE] Erro ao assinar software:', error);
      throw new Error('Falha ao assinar software');
    }
  }

  /**
   * Assina documento fiscal (fatura)
   */
  async signDocument(data: JWSDocumentSignatureData): Promise<JWSSignedDocument> {
    if (!this.privateKey || !this.config) {
      throw new Error('Serviço de assinatura não inicializado');
    }

    try {
      // Criar payload normalizado conforme especificação AGT
      const payload = {
        documentNo: data.documentNo,
        taxRegistrationNumber: data.taxRegistrationNumber,
        documentType: data.documentType,
        documentDate: data.documentDate,
        customerTaxID: data.customerTaxID,
        customerCountry: data.customerCountry,
        documentTotals: {
          taxPayable: Number(data.documentTotals.taxPayable.toFixed(2)),
          netTotal: Number(data.documentTotals.netTotal.toFixed(2)),
          grossTotal: Number(data.documentTotals.grossTotal.toFixed(2))
        },
        iat: Math.floor(Date.now() / 1000),
        type: 'document'
      };

      // Assinar com RS256
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ 
          alg: 'RS256',
          typ: 'JWT',
          ...(this.config.certificateThumbprint && {
            x5t: this.config.certificateThumbprint
          })
        })
        .setIssuedAt()
        .setIssuer(this.config.issuer)
        .setAudience(this.config.audience)
        .setExpirationTime('24h')
        .sign(this.privateKey);

      return {
        documentNo: data.documentNo,
        taxRegistrationNumber: data.taxRegistrationNumber,
        documentType: data.documentType,
        documentDate: data.documentDate,
        customerTaxID: data.customerTaxID,
        customerCountry: data.customerCountry,
        documentTotals: payload.documentTotals,
        jwsDocumentSignature: jwt
      };
    } catch (error) {
      console.error('[AGT_SIGNATURE] Erro ao assinar documento:', error);
      throw new Error('Falha ao assinar documento fiscal');
    }
  }

  /**
   * Valida uma assinatura JWS
   */
  async validateSignature(jwt: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
    if (!this.publicKey) {
      return { valid: false, error: 'Chave pública não configurada' };
    }

    try {
      const { payload } = await jwtVerify(jwt, this.publicKey, {
        issuer: this.config?.issuer,
        audience: this.config?.audience
      });

      return { valid: true, payload };
    } catch (error) {
      console.error('[AGT_SIGNATURE] Erro na validação:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Assinatura inválida' 
      };
    }
  }

  /**
   * Gera par de chaves RSA 2048 bits (para testes/setup inicial)
   */
  static async generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
    try {
      // Gerar par de chaves RSA 2048
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['sign', 'verify']
      );

      // Exportar chave privada no formato PKCS#8
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBytes = new Uint8Array(privateKeyBuffer);
      const privateKeyBase64 = btoa(Array.from(privateKeyBytes, byte => String.fromCharCode(byte)).join(''));
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

      // Exportar chave pública no formato SPKI
      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBytes = new Uint8Array(publicKeyBuffer);
      const publicKeyBase64 = btoa(Array.from(publicKeyBytes, byte => String.fromCharCode(byte)).join(''));
      const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

      return { privateKey: privateKeyPEM, publicKey: publicKeyPEM };
    } catch (error) {
      console.error('[AGT_SIGNATURE] Erro ao gerar chaves:', error);
      throw new Error('Falha ao gerar par de chaves RSA');
    }
  }

  /**
   * Verifica se o serviço está inicializado
   */
  isInitialized(): boolean {
    return this.privateKey !== null && this.config !== null;
  }

  /**
   * Retorna configuração atual
   */
  getConfig(): AGTSignatureConfig | null {
    return this.config;
  }
}

// Instância singleton
let signatureServiceInstance: AGTSignatureService | null = null;

/**
 * Inicializa o serviço de assinatura AGT
 */
export const initializeAGTSignatureService = async (config: AGTSignatureConfig): Promise<AGTSignatureService> => {
  if (!signatureServiceInstance) {
    signatureServiceInstance = new AGTSignatureService();
    await signatureServiceInstance.initialize(config);
  }
  return signatureServiceInstance;
};

/**
 * Retorna a instância do serviço de assinatura
 */
export const getAGTSignatureService = (): AGTSignatureService | null => {
  return signatureServiceInstance;
};

/**
 * Reseta a instância (para testes)
 */
export const resetAGTSignatureService = (): void => {
  signatureServiceInstance = null;
};

// Exportação da classe para uso direto
export { AGTSignatureService };
