import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import POS from './views/POS';
import Dashboard from './views/Dashboard';
import OwnerDashboard from './views/owner/OwnerDashboard';
import OwnerLogin from './views/owner/OwnerLogin';
import Reports from './views/Reports';
import Finance from './views/Finance';
import AGTControl from './views/AGTControl';
import ProfitCenter from './views/ProfitCenter';
import Analytics from './views/Analytics';
import SetupModal from './components/SetupModal';
import { Loader2, Database } from 'lucide-react';

const App = () => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Verificar se já está configurado
      const configured = await invoke<boolean>('check_configuration');
      setIsConfigured(configured);
      
      if (!configured) {
        // Tentar carregar configuração existente
        const config = await invoke('load_config');
        const configObj = JSON.parse(JSON.stringify(config));
        
        if (configObj.supabase_url && configObj.supabase_key) {
          // Se existe configuração, definir no localStorage
          localStorage.setItem('SUPABASE_URL', configObj.supabase_url);
          localStorage.setItem('SUPABASE_ANON_KEY', configObj.supabase_key);
          setIsConfigured(true);
        } else {
          setShowSetup(true);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      setShowSetup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setIsConfigured(true);
    setShowSetup(false);
    
    // Inicializar banco de dados
    initializeDatabase();
  };

  const initializeDatabase = async () => {
    try {
      const result = await invoke<string>('initialize_database');
      console.log('Inicialização do banco de dados:', result);
    } catch (error) {
      console.error('Erro ao inicializar banco de dados:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Tasca do Vereda POS</h1>
          <p className="text-blue-200">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  if (showSetup || !isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Database className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Tasca do Vereda POS</h1>
            <p className="text-blue-200">Configuração Inicial v1.0.6</p>
          </div>
          <SetupModal
            isOpen={true}
            onClose={() => setShowSetup(false)}
            onComplete={handleSetupComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/agt" element={<AGTControl />} />
        <Route path="/profit-center" element={<ProfitCenter />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
};

export default App;
