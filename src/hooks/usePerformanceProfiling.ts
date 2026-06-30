/**
 * Hook para profiling de performance e identificação de gargalos de CPU
 * Usa Performance API para medir tempo de execução de funções críticas
 */

export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
    console.log(`[PERF] Mark: ${name} at ${this.marks.get(name)!.toFixed(2)}ms`);
  }

  measure(name: string, startMark: string): number {
    const endMark = `${name}_end`;
    this.mark(endMark);
    
    const startTime = this.marks.get(startMark);
    const endTime = this.marks.get(endMark);
    
    if (startTime === undefined || endTime === undefined) {
      console.warn(`[PERF] Missing marks for ${name}`);
      return 0;
    }
    
    const duration = endTime - startTime;
    this.measures.set(name, duration);
    
    console.log(`[PERF] Measure: ${name} = ${duration.toFixed(2)}ms`);
    
    // Alerta se demorar mais de 100ms
    if (duration > 100) {
      console.warn(`[PERF] ⚠️ SLOW: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }

  getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }

  // Wrapper para funções assíncronas
  async profileAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.mark(`${name}_start`);
    try {
      const result = await fn();
      this.measure(name, `${name}_start`);
      return result;
    } catch (error) {
      this.measure(name, `${name}_start`);
      throw error;
    }
  }

  // Wrapper para funções síncronas
  profile<T>(name: string, fn: () => T): T {
    this.mark(`${name}_start`);
    try {
      const result = fn();
      this.measure(name, `${name}_start`);
      return result;
    } catch (error) {
      this.measure(name, `${name}_start`);
      throw error;
    }
  }
}

// Instância global para profiling
export const profiler = new PerformanceProfiler();
