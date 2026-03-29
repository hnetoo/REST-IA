import { SystemSettings } from '../types';

export interface ThermalPrinterConfig {
  id: string;
  name: string;
  model: string;
  connectionType: 'usb' | 'network' | 'bluetooth';
  address?: string; // IP para rede, MAC para Bluetooth
  port?: string; // Porta USB ou porta de rede
  paperWidth: number; // mm (58, 80, etc)
  paperHeight?: number; // mm para auto-corte
  charactersPerLine: number; // 32, 42, 48, etc
  encoding: string; // 'CP850', 'UTF-8', etc
  autoCut: boolean;
  logoPath?: string;
  headerLines: string[];
  footerLines: string[];
  qrCodeEnabled: boolean;
  fiscalEnabled: boolean;
}

export const DEFAULT_THERMAL_CONFIGS: ThermalPrinterConfig[] = [
  {
    id: 'epson-tmt20',
    name: 'Epson TM-T20',
    model: 'EPSON_TM-T20',
    connectionType: 'usb',
    port: 'USB001',
    paperWidth: 80,
    charactersPerLine: 42,
    encoding: 'CP850',
    autoCut: true,
    headerLines: ['TASCA DO VEREDA', 'NIF: 123456789', 'Rua Principal, 123', 'Luanda - Angola'],
    footerLines: ['Obrigado pela sua visita!', 'Volte sempre'],
    qrCodeEnabled: true,
    fiscalEnabled: true
  },
  {
    id: 'epson-tmt82',
    name: 'Epson TM-T82',
    model: 'EPSON_TM-T82',
    connectionType: 'network',
    address: '192.168.1.100',
    port: '9100',
    paperWidth: 80,
    charactersPerLine: 42,
    encoding: 'CP850',
    autoCut: true,
    headerLines: ['TASCA DO VEREDA', 'NIF: 123456789', 'Rua Principal, 123'],
    footerLines: ['Obrigado pela sua visita!'],
    qrCodeEnabled: true,
    fiscalEnabled: true
  },
  {
    id: 'bixolon-srp350',
    name: 'Bixolon SRP-350',
    model: 'BIXOLON_SRP-350',
    connectionType: 'usb',
    port: 'USB001',
    paperWidth: 58,
    charactersPerLine: 32,
    encoding: 'CP850',
    autoCut: false,
    headerLines: ['TASCA DO VEREDA', 'NIF: 123456789'],
    footerLines: ['Obrigado!'],
    qrCodeEnabled: false,
    fiscalEnabled: true
  }
];

export class ThermalPrinterManager {
  private static instance: ThermalPrinterManager;
  private config: ThermalPrinterConfig | null = null;

  static getInstance(): ThermalPrinterManager {
    if (!ThermalPrinterManager.instance) {
      ThermalPrinterManager.instance = new ThermalPrinterManager();
    }
    return ThermalPrinterManager.instance;
  }

  setConfig(config: ThermalPrinterConfig): void {
    this.config = config;
    localStorage.setItem('thermalPrinterConfig', JSON.stringify(config));
  }

  getConfig(): ThermalPrinterConfig | null {
    if (!this.config) {
      const saved = localStorage.getItem('thermalPrinterConfig');
      if (saved) {
        try {
          this.config = JSON.parse(saved);
        } catch (e) {
          console.error('Erro ao carregar configuração da impressora:', e);
        }
      }
    }
    return this.config;
  }

  resetConfig(): void {
    this.config = null;
    localStorage.removeItem('thermalPrinterConfig');
  }

  getAvailableConfigs(): ThermalPrinterConfig[] {
    return DEFAULT_THERMAL_CONFIGS;
  }

  // Testar conexão com impressora
  async testConnection(config: ThermalPrinterConfig): Promise<boolean> {
    try {
      console.log(`[PRINTER] Testando conexão com ${config.name}`);
      
      // Simulação de teste - em produção, aqui seria a comunicação real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular sucesso/falha baseado no tipo
      if (config.connectionType === 'network' && config.address) {
        // Testar conexão de rede
        return true; // Simulado
      } else if (config.connectionType === 'usb') {
        // Testar conexão USB
        return true; // Simulado
      }
      
      return false;
    } catch (error) {
      console.error('[PRINTER] Erro ao testar conexão:', error);
      return false;
    }
  }

  // Obter configuração de CSS baseada na impressora
  getPrinterCSS(config: ThermalPrinterConfig): string {
    const fontSize = config.paperWidth <= 58 ? '10px' : '11px';
    const charsPerLine = config.charactersPerLine;
    
    return `
      @page { 
        margin: 0; 
        size: ${config.paperWidth}mm auto;
      }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        width: ${config.paperWidth}mm; 
        padding: 3mm; 
        font-size: ${fontSize}; 
        color: #000; 
        line-height: 1.3;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .bold { font-weight: 900; }
      .divider { border-top: 1px dashed #000; margin: 8px 0; }
      .header-title { font-size: ${config.paperWidth <= 58 ? '14px' : '16px'}; font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
      .items-table { width: 100%; margin: 8px 0; border-collapse: collapse; }
      .items-table td { padding: 2px 0; vertical-align: top; }
      .item-name { max-width: ${Math.floor(charsPerLine * 0.6)}ch; }
      .item-qty { text-align: center; width: ${Math.floor(charsPerLine * 0.1)}ch; }
      .item-price { text-align: right; width: ${Math.floor(charsPerLine * 0.3)}ch; }
      .qr-container { margin: 10px 0; display: flex; justify-content: center; }
      .hash-box { 
        font-size: 8px; 
        margin-top: 8px; 
        word-break: break-all; 
        text-align: center; 
        line-height: 1.3; 
        background: #f0f0f0; 
        padding: 4px; 
        border: 1px solid #000;
      }
      .tax-table { width: 100%; font-size: 8px; margin-top: 5px; border-collapse: collapse; }
      .tax-table th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; }
      .legal-footer { font-size: 7px; margin-top: 12px; border-top: 1px solid #000; padding-top: 6px; text-align: center; font-weight: bold; }
      .non-fiscal { border: 1px solid #000; padding: 4px; margin: 8px 0; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 10px; }
      .customer-box { border: 1px solid #000; padding: 3px; margin: 4px 0; }
    `;
  }

  // Formatar texto para largura da impressora
  formatText(text: string, config: ThermalPrinterConfig): string {
    const maxLength = config.charactersPerLine;
    if (text.length <= maxLength) return text;
    
    // Dividir texto em múltiplas linhas se necessário
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  // Gerar comandos ESC/POS (para impressão direta)
  generateESCPOSCommands(content: string, config: ThermalPrinterConfig): Uint8Array {
    const commands: number[] = [];
    
    // Inicialização da impressora
    commands.push(0x1B, 0x40); // ESC @ - Initialize printer
    
    // Configurar codificação
    if (config.encoding === 'CP850') {
      commands.push(0x1B, 0x74, 0x02); // ESC t 2 - Code page 850
    }
    
    // Alinhamento central para cabeçalho
    commands.push(0x1B, 0x61, 0x01); // ESC a 1 - Center align
    
    // Adicionar conteúdo (simplificado - em produção seria mais complexo)
    const textBytes = new TextEncoder().encode(content);
    commands.push(...textBytes);
    
    // Corte de papel (se suportado)
    if (config.autoCut) {
      commands.push(0x1B, 0x69); // ESC i - Full cut
    }
    
    return new Uint8Array(commands);
  }
}

export default ThermalPrinterManager.getInstance();
