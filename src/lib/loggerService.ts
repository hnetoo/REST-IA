// Sistema de Logs Visíveis como Navegador

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  source?: string;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private subscribers: ((logs: LogEntry[]) => void)[] = [];

  constructor() {
    // Criar container de logs visível na página
    this.createLogContainer();
    
    // Log inicial
    this.info('SYSTEM', 'Logger Service inicializado', {
      timestamp: new Date().toISOString(),
      maxLogs: this.maxLogs
    });
  }

  private createLogContainer() {
    // Verificar se já existe
    if (document.getElementById('app-logger')) return;

    const container = document.createElement('div');
    container.id = 'app-logger';
    container.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        width: 400px;
        max-height: 300px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid #333;
        border-radius: 8px;
        font-family: monospace;
        font-size: 11px;
        z-index: 9999;
        overflow: hidden;
      ">
        <div style="
          background: #333;
          color: white;
          padding: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>🔍 App Logs</span>
          <div>
            <button onclick="toggleLogger()" style="background: #555; border: none; color: white; padding: 2px 8px; margin: 0 2px; cursor: pointer;">−</button>
            <button onclick="clearLogger()" style="background: #555; border: none; color: white; padding: 2px 8px; margin: 0 2px; cursor: pointer;">Clear</button>
          </div>
        </div>
        <div id="logger-content" style="
          max-height: 250px;
          overflow-y: auto;
          padding: 8px;
          color: #fff;
        ">
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Adicionar funções globais
    (window as any).toggleLogger = () => {
      const content = document.getElementById('logger-content');
      if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
      }
    };

    (window as any).clearLogger = () => {
      this.clearLogs();
    };
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any, source?: string) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      source: source || 'APP'
    };

    // Adicionar ao array
    this.logs.push(logEntry);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Atualizar UI
    this.updateLogUI(logEntry);

    // Notificar subscribers
    this.subscribers.forEach(callback => callback(this.logs));

    // Console também
    const consoleMethod = this.getConsoleMethod(level);
    const prefix = `[${category}] ${message}`;
    consoleMethod(prefix, data || '');
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG: return console.debug;
      case LogLevel.INFO: return console.info;
      case LogLevel.WARN: return console.warn;
      case LogLevel.ERROR: return console.error;
      case LogLevel.CRITICAL: return console.error;
      default: return console.log;
    }
  }

  private updateLogUI(logEntry: LogEntry) {
    const content = document.getElementById('logger-content');
    if (!content) return;

    const levelColors = {
      [LogLevel.DEBUG]: '#888',
      [LogLevel.INFO]: '#4CAF50',
      [LogLevel.WARN]: '#FF9800',
      [LogLevel.ERROR]: '#F44336',
      [LogLevel.CRITICAL]: '#E91E63'
    };

    const levelIcons = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🚨'
    };

    const logElement = document.createElement('div');
    logElement.style.cssText = `
      margin-bottom: 4px;
      padding: 4px;
      border-left: 3px solid ${levelColors[logEntry.level]};
      background: rgba(255,255,255,0.05);
    `;

    const time = new Date(logEntry.timestamp).toLocaleTimeString();
    const dataStr = logEntry.data ? ` | ${JSON.stringify(logEntry.data)}` : '';
    
    logElement.innerHTML = `
      <div style="color: ${levelColors[logEntry.level]}">
        ${levelIcons[logEntry.level]} [${time}] [${logEntry.category}] ${logEntry.message}${dataStr}
      </div>
    `;

    content.appendChild(logElement);
    content.scrollTop = content.scrollHeight;

    // Limitar elementos no DOM
    while (content.children.length > 100) {
      content.removeChild(content.firstChild!);
    }
  }

  // Métodos públicos
  debug(category: string, message: string, data?: any, source?: string) {
    this.addLog(LogLevel.DEBUG, category, message, data, source);
  }

  info(category: string, message: string, data?: any, source?: string) {
    this.addLog(LogLevel.INFO, category, message, data, source);
  }

  warn(category: string, message: string, data?: any, source?: string) {
    this.addLog(LogLevel.WARN, category, message, data, source);
  }

  error(category: string, message: string, data?: any, source?: string) {
    this.addLog(LogLevel.ERROR, category, message, data, source);
  }

  critical(category: string, message: string, data?: any, source?: string) {
    this.addLog(LogLevel.CRITICAL, category, message, data, source);
  }

  // Métodos utilitários
  clearLogs() {
    this.logs = [];
    const content = document.getElementById('logger-content');
    if (content) {
      content.innerHTML = '';
    }
    this.info('SYSTEM', 'Logs limpos');
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
}

// Exportar instância global
export const logger = new LoggerService();

// Exportar funções de conveniência
export const log = {
  debug: (category: string, message: string, data?: any) => logger.debug(category, message, data),
  info: (category: string, message: string, data?: any) => logger.info(category, message, data),
  warn: (category: string, message: string, data?: any) => logger.warn(category, message, data),
  error: (category: string, message: string, data?: any) => logger.error(category, message, data),
  critical: (category: string, message: string, data?: any) => logger.critical(category, message, data)
};
