import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase_standalone';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // 🔐 SEGURANÇA MÁXIMA - Sem bypass, sem exceções, sem localStorage
        if (!session) {
          console.log('[AUTH GUARD] 🚫 Sessão inexistente - Redirecionando para login');
          navigate('/login');
          return;
        }

        console.log('[AUTH GUARD] ✅ Sessão válida:', session.user?.email);
        setIsLoading(false);
      } catch (error) {
        console.error('[AUTH GUARD] ❌ Erro na verificação de autenticação:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // Loading state durante verificação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se houver sessão, renderizar children
  return <>{children}</>;
};

export default AuthGuard;

  return <>{children}</>;
};

export default AuthGuard;
