// Sistema de Logs Silencioso - Background Only

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
    // Log inicial - apenas em console
    this.info('SYSTEM', 'Logger Service inicializado (modo silencioso)', {
      timestamp: new Date().toISOString(),
      maxLogs: this.maxLogs,
      mode: 'silent-background'
    });
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

    // Apenas console e inspector - sem UI visual
    const consoleMethod = this.getConsoleMethod(level);
    const prefix = `[${category}] ${message}`;
    consoleMethod(prefix, data || '');

    // Notificar subscribers (se houver)
    this.subscribers.forEach(callback => callback(this.logs));
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
    console.info('[SYSTEM] Logs limpos');
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
