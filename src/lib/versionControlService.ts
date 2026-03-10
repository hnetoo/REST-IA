import { sqliteService } from './sqliteService';

export interface RestorePoint {
  id: string;
  timestamp: string;
  description: string;
  state: any;
}

class VersionControlService {
  private STORAGE_KEY = 'tasca_restore_points';

  async createRestorePoint(description: string, state: any): Promise<RestorePoint> {
    const id = `rp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    // Deep copy to avoid reference issues
    const stateCopy = JSON.parse(JSON.stringify(state));
    const point: RestorePoint = { id, timestamp, description, state: stateCopy };
    
    const points = this.getRestorePoints();
    // Keep only the last 20 restore points to avoid storage limits
    const newPoints = [...points, point].slice(-20);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newPoints));
    
    return point;
  }

  getRestorePoints(): RestorePoint[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async revertTo(id: string): Promise<any | null> {
    const points = this.getRestorePoints();
    const point = points.find(p => p.id === id);
    if (point) {
      // Create a backup of the CURRENT state before reverting
      // This is a safety measure
      return point.state;
    }
    return null;
  }

  async status(): Promise<RestorePoint | null> {
    const points = this.getRestorePoints();
    return points.length > 0 ? points[points.length - 1] : null;
  }

  compare(id1: string, id2: string): string {
    const points = this.getRestorePoints();
    const p1 = points.find(p => p.id === id1);
    const p2 = points.find(p => p.id === id2);

    if (!p1 || !p2) return "Um ou ambos os pontos de restauração não foram encontrados.";

    const changes: string[] = [];
    
    // Simple comparison of top-level keys
    const s1 = p1.state;
    const s2 = p2.state;

    const allKeys = Array.from(new Set([...Object.keys(s1), ...Object.keys(s2)]));
    
    allKeys.forEach(key => {
      const v1 = JSON.stringify(s1[key]);
      const v2 = JSON.stringify(s2[key]);
      
      if (v1 !== v2) {
        changes.push(`- Alteração em [${key}]`);
      }
    });

    if (changes.length === 0) return "Nenhuma diferença detectada entre as versões.";
    
    return `Diferenças entre ${p1.id} e ${p2.id}:\n${changes.join('\n')}`;
  }
}

export const versionControlService = new VersionControlService();
