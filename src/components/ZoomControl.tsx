import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomControlProps {
  onZoomChange?: (zoom: number) => void;
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ZoomControl: React.FC<ZoomControlProps> = ({
  onZoomChange,
  defaultZoom = 100,
  minZoom = 50,
  maxZoom = 200,
  step = 10,
  position = 'top-right'
}) => {
  const [zoom, setZoom] = useState(defaultZoom);
  const [isVisible, setIsVisible] = useState(true);

  // Aplicar zoom ao body da aplicação
  useEffect(() => {
    const body = document.body;
    const currentZoom = zoom / 100;
    
    // Aplicar zoom usando transform scale
    body.style.transform = `scale(${currentZoom})`;
    body.style.transformOrigin = 'top left';
    body.style.width = `${100 / currentZoom}%`;
    body.style.height = `${100 / currentZoom}%`;
    body.style.overflow = 'auto';
    
    // Notificar componente pai
    if (onZoomChange) {
      onZoomChange(zoom);
    }
    
    // Salvar no localStorage
    localStorage.setItem('app-zoom', zoom.toString());
  }, [zoom, onZoomChange]);

  // Carregar zoom salvo ao montar
  useEffect(() => {
    const savedZoom = localStorage.getItem('app-zoom');
    if (savedZoom) {
      const zoomValue = parseInt(savedZoom);
      if (zoomValue >= minZoom && zoomValue <= maxZoom) {
        setZoom(zoomValue);
      }
    }
  }, [minZoom, maxZoom]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + step, maxZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - step, minZoom);
    setZoom(newZoom);
  };

  const handleReset = () => {
    setZoom(defaultZoom);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    // Atalhos de teclado: Ctrl + Plus/Minus para zoom
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleReset();
      }
    }
    
    // Atalho: F11 para mostrar/esconder controle
    if (e.key === 'F11') {
      e.preventDefault();
      setIsVisible(!isVisible);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [zoom, isVisible]);

  // Posicionamento CSS baseado na prop
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800/90 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700 transition-all"
          title="Mostrar controle de zoom (F11)"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2 border border-gray-700">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= minZoom}
          className="text-white p-1.5 rounded hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reduzir zoom (Ctrl + -)"
        >
          <ZoomOut size={16} />
        </button>
        
        <div className="text-white text-xs font-mono min-w-[50px] text-center">
          {zoom}%
        </div>
        
        <button
          onClick={handleZoomIn}
          disabled={zoom >= maxZoom}
          className="text-white p-1.5 rounded hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Aumentar zoom (Ctrl + +)"
        >
          <ZoomIn size={16} />
        </button>
        
        <div className="w-px h-6 bg-gray-600 mx-1" />
        
        <button
          onClick={handleReset}
          disabled={zoom === defaultZoom}
          className="text-white p-1.5 rounded hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Restaurar zoom (Ctrl + 0)"
        >
          <RotateCcw size={14} />
        </button>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 p-1.5 rounded hover:bg-gray-700 transition-all ml-1"
          title="Esconder (F11)"
        >
          ×
        </button>
      </div>
      
      {/* Tooltip de atalhos */}
      <div className="absolute top-full mt-2 bg-gray-900 text-white text-xs p-2 rounded shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="font-bold mb-1">Atalhos:</div>
        <div>Ctrl + Plus: Aumentar</div>
        <div>Ctrl + Minus: Reduzir</div>
        <div>Ctrl + 0: Restaurar</div>
        <div>F11: Mostrar/Esconder</div>
      </div>
    </div>
  );
};

export default ZoomControl;
