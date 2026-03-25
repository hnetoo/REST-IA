import React from 'react';
import Sidebar from './Sidebar';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser } = useStore();

  // Se não há usuário logado, mostrar apenas o conteúdo sem sidebar
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
