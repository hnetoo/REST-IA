
import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

interface LazyImageProps {
  src?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, containerClassName }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // VERIFICAÇÃO DO CAMINHO (URL) E CONSTRUÇÃO DE URL COMPLETA
  const getImageUrl = (imageSrc?: string): string | undefined => {
    if (!imageSrc) return undefined;
    
    // Se for URL absoluta (começa com http), retorna como está
    if (imageSrc.startsWith('http')) {
      return imageSrc;
    }
    
    // Se for caminho relativo, concatena com URL base do Supabase Storage
    const supabaseUrl = 'https://tboiuiwlqfzcvakxrsmj.supabase.co';
    const bucketName = 'products'; // Ajustar conforme necessário
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${imageSrc}`;
  };

  const finalImageUrl = getImageUrl(src);

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${containerClassName}`}>
      {/* Skeleton / Shimmer Effect */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="w-full h-full animate-pulse bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"></div>
        </div>
      )}

      {/* Error Fallback - MELHORADO */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 bg-slate-800/50">
          <Utensils size={32} className="mb-2" />
          <span className="text-[10px] font-black uppercase">Sem Imagem</span>
          <span className="text-[8px] text-slate-600 mt-1 px-2 text-center">Produto indisponível</span>
        </div>
      ) : (
        <img
          src={finalImageUrl}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`
            w-full h-full object-cover transition-opacity duration-700 ease-out
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${className}
          `}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LazyImage;

