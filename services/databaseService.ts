import { sqliteService } from './sqliteService';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'FULL' | 'SELECTIVE';
  size: number;
  description: string;
  categories?: string[];
  version: string;
}

export interface BackupFile {
  metadata: BackupMetadata;
  data: any;
  hash: string;
}

export interface DatabaseLog {
  id: string;
  timestamp: string;
  operation: 'BACKUP' | 'RESTORE' | 'DELETE' | 'SCHEDULE';
  status: 'SUCCESS' | 'ERROR' | 'IN_PROGRESS';
  message: string;
  details?: string;
}

class DatabaseService {
  private STORAGE_KEY = 'tasca_db_backups';
  private LOGS_KEY = 'tasca_db_logs';
  private isTauri = !!(window as any).__TAURI_INTERNALS__;

  private async calculateHash(data: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async createBackup(description: string, state: any, type: 'FULL' | 'SELECTIVE' = 'FULL', categories?: string[]): Promise<BackupFile> {
    const id = `bak-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Filtrar dados se for seletivo
    let dataToBackup = state;
    if (type === 'SELECTIVE' && categories) {
      dataToBackup = {};
      categories.forEach(cat => {
        if (state[cat] !== undefined) {
          dataToBackup[cat] = state[cat];
        }
      });
    }

    const dataStr = JSON.stringify(dataToBackup);
    const hash = await this.calculateHash(dataStr);
    
    const metadata: BackupMetadata = {
      id,
      timestamp,
      type,
      size: new Blob([dataStr]).size,
      description,
      categories,
      version: '1.0.0'
    };

    const backup: BackupFile = { metadata, data: dataToBackup, hash };

    // Salvar no repositório de backups (LocalStorage para compatibilidade Web/Tauri simples)
    const existingBackups = this.getBackups();
    existingBackups.unshift(backup);
    
    // Limitar a 10 backups para não estourar storage
    const limitedBackups = existingBackups.slice(0, 10);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedBackups));

    this.addLog('BACKUP', 'SUCCESS', `Backup ${type} criado: ${description}`, `ID: ${id}`);
    
    return backup;
  }

  getBackups(): BackupFile[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async validateBackup(backup: BackupFile): Promise<boolean> {
    if (backup.hash === 'EXTERNAL') return true; // Ignorar validação para arquivos externos
    const dataStr = JSON.stringify(backup.data);
    const currentHash = await this.calculateHash(dataStr);
    return currentHash === backup.hash;
  }

  async restoreBackup(backup: BackupFile): Promise<boolean> {
    try {
      this.addLog('RESTORE', 'IN_PROGRESS', `Iniciando restauro do backup: ${backup.metadata.id}`);
      
      const isValid = await this.validateBackup(backup);
      if (!isValid) {
        throw new Error("Integridade do backup corrompida (Hash mismatch).");
      }

      // Restauro de dados
      await sqliteService.saveState(backup.data);
      
      this.addLog('RESTORE', 'SUCCESS', `Restauro concluído com sucesso: ${backup.metadata.id}`);
      return true;
    } catch (error: any) {
      this.addLog('RESTORE', 'ERROR', `Falha no restauro: ${error.message}`);
      return false;
    }
  }

  deleteBackup(id: string): void {
    const backups = this.getBackups().filter(b => b.metadata.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
    this.addLog('DELETE', 'SUCCESS', `Backup removido: ${id}`);
  }

  getLogs(): DatabaseLog[] {
    const data = localStorage.getItem(this.LOGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private addLog(operation: DatabaseLog['operation'], status: DatabaseLog['status'], message: string, details?: string) {
    const log: DatabaseLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operation,
      status,
      message,
      details
    };
    const logs = this.getLogs();
    logs.unshift(log);
    localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  }

  async exportToFile(backup: BackupFile) {
    const backupContent = JSON.stringify(backup, null, 2); // Pretty print JSON

    if (this.isTauri) {
      try {
        const filePath = await save({
          filters: [{
            name: 'JSON',
            extensions: ['json']
          }],
          defaultPath: `tasca_backup_${backup.metadata.id}.json`
        });

        if (filePath) {
          await writeTextFile(filePath, backupContent);
          this.addLog('BACKUP', 'SUCCESS', `Backup exportado para: ${filePath}`);
        } else {
          this.addLog('BACKUP', 'IN_PROGRESS', 'Exportação de backup cancelada pelo usuário.');
        }
      } catch (error: any) {
        this.addLog('BACKUP', 'ERROR', `Falha ao exportar backup para o PC: ${error.message}`);
        console.error("Erro ao exportar backup para o PC:", error);
      }
    } else {
      // Web environment: use blob download
      const blob = new Blob([backupContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasca_backup_${backup.metadata.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.addLog('BACKUP', 'SUCCESS', `Backup exportado via download do navegador.`);
    }
  }

  async processExternalFile(file: File): Promise<BackupFile | any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          // Tentar analisar como JSON
          const parsed = JSON.parse(content);
          
          // Se for um BackupFile completo (com metadados e hash)
          if (parsed.metadata && parsed.data && parsed.hash) {
            resolve(parsed);
          } 
          // Se for apenas o estado (JSON bruto)
          else if (typeof parsed === 'object') {
            resolve({
              metadata: {
                id: `ext-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'FULL',
                size: file.size,
                description: `Importado: ${file.name}`,
                version: '1.0.0'
              },
              data: parsed,
              hash: 'EXTERNAL' // Ignorar validação de hash para arquivos externos brutos
            });
          } else {
            reject(new Error("Formato JSON inválido ou não suportado."));
          }
        } catch (error) {
          // Se falhar o JSON, poderíamos tentar processar SQL aqui no futuro
          reject(new Error("Não foi possível processar o arquivo. Certifique-se que é um JSON válido."));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
      reader.readAsText(file);
    });
  }
}

export const databaseService = new DatabaseService();
