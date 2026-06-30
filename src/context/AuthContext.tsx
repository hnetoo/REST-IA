import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  establishmentId: string | null;
  currentUser: any | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (establishmentId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    establishmentId: null,
    currentUser: null,
    isLoading: true
  });

  // AUTO-LOGIN OFFLINE - LÊ APENAS DO LOCALSTORAGE
  useEffect(() => {
    const storedId = localStorage.getItem('tasca_vered_id');
    
    if (storedId) {
      // SE EXISTE ID, CONSIDERA AUTENTICADO IMEDIATAMENTE
      setAuthState({
        isAuthenticated: true,
        establishmentId: storedId,
        currentUser: { id: storedId }, // Mock user
        isLoading: false
      });
      console.log('[AUTH CONTEXT] Auto-login offline:', storedId);
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = (establishmentId: string) => {
    localStorage.setItem('tasca_vered_id', establishmentId);
    setAuthState({
      isAuthenticated: true,
      establishmentId,
      currentUser: { id: establishmentId },
      isLoading: false
    });
  };

  const logout = () => {
    localStorage.removeItem('tasca_vered_id');
    localStorage.removeItem('sb-tboiuiwlqfzcvakxrsmj-auth-token');
    setAuthState({
      isAuthenticated: false,
      establishmentId: null,
      currentUser: null,
      isLoading: false
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
