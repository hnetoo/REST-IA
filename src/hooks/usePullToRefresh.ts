import { useState, useEffect, useCallback, RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void;
  threshold?: number;
  maxPullDistance?: number;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * Hook para implementar funcionalidade de "pull to refresh" em dispositivos móveis
 * Detecta quando o usuário puxa a tela para baixo no topo da página
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement>,
  options: UsePullToRefreshOptions
): PullToRefreshState {
  const { onRefresh, threshold = 80, maxPullDistance = 120 } = options;
  
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false
  });

  const [startY, setStartY] = useState<number>(0);
  const [currentY, setCurrentY] = useState<number>(0);

  const isAtTop = useCallback(() => {
    const element = ref.current;
    if (!element) return true;
    
    // Verifica se o elemento tem scroll próprio
    const hasElementScroll = element.scrollHeight > element.clientHeight;
    
    if (hasElementScroll) {
      // Scroll no elemento
      return element.scrollTop <= 10;
    } else {
      // Scroll na window/document
      return window.scrollY <= 10 || document.documentElement.scrollTop <= 10;
    }
  }, [ref]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop()) return;
    
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setState(prev => ({ ...prev, isPulling: true }));
  }, [isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || !isAtTop()) return;
    
    const y = e.touches[0].clientY;
    setCurrentY(y);
    
    const pullDistance = Math.max(0, y - startY);
    const constrainedDistance = Math.min(pullDistance * 0.5, maxPullDistance);
    
    setState(prev => ({ ...prev, pullDistance: constrainedDistance }));
  }, [state.isPulling, startY, maxPullDistance, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return;
    
    setState(prev => ({ ...prev, isPulling: false }));
    
    if (state.pullDistance >= threshold) {
      setState(prev => ({ ...prev, isRefreshing: true, pullDistance: 0 }));
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('[PullToRefresh] Erro ao atualizar:', error);
      } finally {
        setState({ isPulling: false, pullDistance: 0, isRefreshing: false });
      }
    } else {
      // Reseta a distância se não atingiu o threshold
      setState(prev => ({ ...prev, pullDistance: 0 }));
    }
  }, [state.isPulling, state.pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}
