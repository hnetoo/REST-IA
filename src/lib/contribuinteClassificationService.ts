/**
 * Serviço de Classificação de Contribuintes AGT Angola
 * Implementa sistema para identificar Grandes Contribuintes e aplicar regras específicas
 */

export interface ContribuinteClassification {
  isGrandeContribuinte: boolean;
  regime: 'GERAL' | 'SIMPLIFICADO';
  volumeNegociosAnual: number;
  limiteInferior: number;
  limiteSuperior: number;
  dataClassificacao: Date;
  nif: string;
}

export interface ClassificacaoRequest {
  nif: string;
  volumeNegociosAnual: number;
  operacoesImportacao: number;
  eManufatureira: boolean;
}

/**
 * Serviço de Classificação de Contribuintes
 */
class ContribuinteClassificationService {
  private static readonly LIMITES = {
    GRANDE_CONTRIBUINTE: 350_000_000, // 350 milhões de Kz = 349.000 EUR
    MANUFATUREIRA_GRANDE: 25_000_000, // 25 milhões de Kz = 24.900 EUR
    SIMPLIFICADO_MIN: 25_000_000, // 25 milhões de Kz = 24.900 EUR
    SIMPLIFICADO_MAX: 350_000_000 // 350 milhões de Kz = 349.000 EUR
  };

  /**
   * Classifica um contribuinte com base no volume de negócios
   */
  static classificarContribuinte(request: ClassificacaoRequest): ContribuinteClassification {
    const { nif, volumeNegociosAnual, operacoesImportacao, eManufatureira } = request;

    // Verificar se é Grande Contribuinte (criterio principal)
    const isGrandeContribuinte = volumeNegociosAnual >= this.LIMITES.GRANDE_CONTRIBUINTE ||
      operacoesImportacao >= this.LIMITES.GRANDE_CONTRIBUINTE;

    // Determinar o regime
    let regime: 'GERAL' | 'SIMPLIFICADO';
    let limiteInferior: number;
    let limiteSuperior: number;

    if (isGrandeContribuinte) {
      regime = 'GERAL';
      limiteInferior = this.LIMITES.GRANDE_CONTRIBUINTE;
      limiteSuperior = Number.MAX_SAFE_INTEGER;
    } else {
      regime = 'SIMPLIFICADO';
      limiteInferior = this.LIMITES.SIMPLIFICADO_MIN;
      limiteSuperior = this.LIMITES.SIMPLIFICADO_MAX;
    }

    // Verificar exceção para empresas manufatureiras
    if (eManufatureira && volumeNegociosAnual >= this.LIMITES.MANUFATUREIRA_GRANDE) {
      regime = 'GERAL';
      limiteInferior = this.LIMITES.MANUFATUREIRA_GRANDE;
      limiteSuperior = Number.MAX_SAFE_INTEGER;
    }

    return {
      isGrandeContribuinte,
      regime,
      volumeNegociosAnual,
      limiteInferior,
      limiteSuperior,
      dataClassificacao: new Date(),
      nif
    };
  }

  /**
   * Verifica se um contribuinte precisa de facturação eletrónica obrigatória
   */
  static precisaFacturacaoEletronica(classificacao: ContribuinteClassification): boolean {
    // Todos os contribuintes classificados precisam de facturação eletrónica
    // Exceto as exceções legais (máquinas automáticas, transporte, etc.)
    return true;
  }

  /**
   * Verifica se um contribuinte está no regime especial
   */
  static temRegimeEspecial(volumeNegociosAnual: number): boolean {
    return volumeNegociosAnual < this.LIMITES.SIMPLIFICADO_MIN;
  }

  /**
   * Calcula o limite de auto-faturação
   */
  static calcularLimiteAutoFacturacao(volumeNegociosAnual: number): {
    limitePercentual: number;
    limiteMaximo: number;
    podeAumentar: boolean;
  } {
    // Regra geral: 20% dos custos totais
    let limitePercentual = 0.20;
    let podeAumentar = false;

    // Pode aumentar até 40% se bens essenciais
    // Esta verificação precisa de análise dos bens adquiridos
    const limiteMaximo = volumeNegociosAnual * limitePercentual;

    return {
      limitePercentual,
      limiteMaximo,
      podeAumentar
    };
  }

  /**
   * Gera relatório de classificação
   */
  static gerarRelatorioClassificacao(classificacao: ContribuinteClassification): string {
    const { isGrandeContribuinte, regime, volumeNegociosAnual, limiteInferior, limiteSuperior, nif } = classificacao;

    return `
=== RELATÓRIO DE CLASSIFICAÇÃO DE CONTRIBUINTE ===
NIF: ${nif}
Volume de Negócios Anual: ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(volumeNegociosAnual)}
Data da Classificação: ${classificacao.dataClassificacao.toLocaleDateString('pt-AO')}

TIPO DE CONTRIBUINTE: ${isGrandeContribuinte ? 'GRANDE CONTRIBUINTE' : 'CONTRIBUINTE NORMAL'}
REGIME FISCAL: ${regime}

LIMITES APLICÁVEIS:
- Limite Inferior: ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(limiteInferior)}
- Limite Superior: ${limiteSuperior === Number.MAX_SAFE_INTEGER ? 'Sem limite' : new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(limiteSuperior)}

OBRIGATORIEDADES:
✅ Facturação Eletrónica Obrigatória
✅ Comunicação em Tempo Real com AGT
✅ Envio de Ficheiros SAFT
✅ Registo de Movimentos de Stock
✅ Auditoria Completa

OBSERVAÇÕES:
${isGrandeContribuinte ? 
  '- Contribuinte enquadrado como Grande Contribuinte (RFGC)\n- Aplicam-se regras específicas para Grandes Contribuintes\n- Prazos especiais para cumprimento' : 
  '- Contribuinte enquadrado no regime normal\n- Aplicam-se regras gerais de facturação eletrónica\n- Prazos padrão para adaptação'}

RECOMENDAÇÕES:
1. Manter contabilidade organizada
2. Implementar sistema de facturação eletrónica certificado
3. Garantir comunicação em tempo real com AGT
4. Preparar sistema para auditorias fiscais
5. Manter documentação completa e actualizada
    `.trim();
  }

  /**
   * Verifica se uma empresa é fornecedora do Estado
   */
  static eFornecedorEstado(operacoesEstado: number, volumeTotal: number): boolean {
    // Se mais de 50% das operações são com o Estado, é considerado fornecedor
    const percentualEstado = (operacoesEstado / volumeTotal) * 100;
    return percentualEstado >= 50;
  }

  /**
   * Calcula data de obrigatoriedade por fase
   */
  static calcularDataObrigatoriedade(classificacao: ContribuinteClassification): {
    fase1: Date; // Grandes Contribuintes e Fornecedores do Estado
    fase2: Date; // Todos os contribuintes
  } {
    const fase1 = new Date('2026-01-01'); // 01 de Janeiro de 2026
    const fase2 = new Date('2026-09-21'); // 21 de Setembro de 2026

    return {
      fase1,
      fase2
    };
  }
}

export default ContribuinteClassificationService;
