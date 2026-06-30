/**
 * Hook para gerenciar bloqueio de estado e evitar Race Conditions
 * Previne o efeito "pisca" nas mesas bloqueando atualizações externas durante 500ms após uma atualização local
 */

export function useStateLock<T>(lockDuration: number = 500) {
  const lockedIds = new Set<T>();
  const lockTimers = new Map<T, NodeJS.Timeout>();

  const isLocked = (id: T): boolean => {
    return lockedIds.has(id);
  };

  const lock = (id: T): void => {
    // Limpar timer existente se houver
    const existingTimer = lockTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Adicionar ao conjunto de IDs bloqueados
    lockedIds.add(id);

    // Definir timer para desbloquear após lockDuration
    const timer = setTimeout(() => {
      lockedIds.delete(id);
      lockTimers.delete(id);
    }, lockDuration);

    lockTimers.set(id, timer);
  };

  const unlock = (id: T): void => {
    const timer = lockTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      lockTimers.delete(id);
    }
    lockedIds.delete(id);
  };

  const unlockAll = (): void => {
    lockTimers.forEach((timer) => clearTimeout(timer));
    lockTimers.clear();
    lockedIds.clear();
  };

  return {
    isLocked,
    lock,
    unlock,
    unlockAll
  };
}
