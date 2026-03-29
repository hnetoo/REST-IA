import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  establishmentId: string | null;
  currentUser: any | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (establishmentId: string) => void;
  logout: () => void;
  setAuth: (auth: Partial<AuthState>) => void;
}

type AuthStore = AuthState & AuthActions;

// GESTÃO DE ESTADO GLOBAL COM PERSISTÊNCIA
export const useAuthStore = create<AuthStore>((set, get) => ({
  // Estado inicial
  isAuthenticated: false,
  establishmentId: null,
  currentUser: null,
  isLoading: true,

  // Ações
  login: (establishmentId: string) => {
    localStorage.setItem('tasca_vered_id', establishmentId);
    set({
      isAuthenticated: true,
      establishmentId,
      currentUser: { id: establishmentId },
      isLoading: false
    });
  },

  logout: () => {
    localStorage.removeItem('tasca_vered_id');
    localStorage.removeItem('sb-tboiuiwlqfzcvakxrsmj-auth-token');
    set({
      isAuthenticated: false,
      establishmentId: null,
      currentUser: null,
      isLoading: false
    });
  },

  setAuth: (auth: Partial<AuthState>) => {
    set(auth);
  }
}));
