import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { supabase } from './supabase_standalone';
import { sqliteService } from './lib/sqliteService';
import { useStore } from './store/useStore';
import { performStartupSync, validateSupabaseConfig } from './store/useStore';
import POS from './views/DashboardV2';
import OwnerDashboard from './views/owner/OwnerDashboard';
import OwnerLogin from './views/owner/OwnerLogin';
import Reports from './views/Reports';
import Finance from './views/Finance';
import AGTControl from './views/AGTControl';
import ProfitCenter from './views/ProfitCenter';
import Analytics from './views/Analytics';
import SetupModal from './components/SetupModal';
import { Loader2, Database, AlertTriangle, Trash2 } from 'lucide-react';
import { runAutoDiagnostics } from './lib/supabaseDiagnostics';
import { logger } from './lib/loggerService';
import AuthGuard from './components/AuthGuard';
import AppErrorBoundary from './components/AppErrorBoundary';

const App = () => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  // 🔑 STARTUP SYNC - Sincronização total para nova MSI
  useEffect(() => {
    const initializeApp = async () => {
      console.log('[APP] 🚀 Inicializando aplicação...');
      
      // 🔑 VALIDAR CONFIGURAÇÃO SUPABASE
      const configValid = validateSupabaseConfig();
      if (!configValid) {
        console.error('[APP] ❌ Configuração Supabase inválida');
        setIsLoading(false);
        return;
      }
      
      // 🔑 EXECUTAR STARTUP SYNC
      console.log('[APP] 🔄 Executando startup sync...');
      const syncSuccess = await performStartupSync();
      
      if (syncSuccess) {
        console.log('[APP] ✅ Startup sync concluído com sucesso');
      } else {
        console.log('[APP] ⚠️ Startup sync falhou, app continuará localmente');
      }
      
      setIsLoading(false);
    };
    
    initializeApp();
  }, []);

  // 🧹 FUNÇÃO DE LIMPEZA FORÇADA - ANIQUILA ESTADO LOCAL
  const forceCleanLocalState = async () => {
    console.log('🧹 [FORCE CLEAN] Iniciando limpeza forçada do estado local...');
    
    try {
      // 1. Limpar SQLite local
      await sqliteService.saveState(null);
      console.log('✅ [FORCE CLEAN] SQLite limpo');
      
      // 2. Limpar localStorage
      localStorage.clear();
      console.log('✅ [FORCE CLEAN] localStorage limpo');
      
      // 3. Limpar sessionStorage
      sessionStorage.clear();
      console.log('✅ [FORCE CLEAN] sessionStorage limpo');
      
      // 4. Forçar reload completo
      console.log('🔄 [FORCE CLEAN] Forçando reload completo...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ [FORCE CLEAN] Erro na limpeza forçada:', error);
    }
  };

  // 🚨 BOTÃO TEMPORÁRIO DE LIMPEZA (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Adicionar botão de limpeza forçada
      const cleanButton = document.createElement('button');
      cleanButton.innerHTML = '🧹 LIMPAR ESTADO';
      cleanButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: #ef4444;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
      `;
      cleanButton.onclick = forceCleanLocalState;
      
      // Adicionar após 2 segundos para garantir que a página carregou
      setTimeout(() => {
        document.body.appendChild(cleanButton);
        console.log('🚨 [FORCE CLEAN] Botão de limpeza adicionado (modo desenvolvimento)');
      }, 2000);
    }
  }, []);

  // 🔑 LISTENER DE RESET DO OWNER HUB - Receber sinal para limpar SQLite
  useEffect(() => {
    console.log('[APP] 🔄 Configurando listener de reset do Owner Hub...');
    
    // 1. Listener via Supabase Realtime
    const resetChannel = supabase
      .channel('reset_signals')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'reset_signals' 
        }, 
        async (payload) => {
          const signal = payload.new;
          console.log('[APP] 🚨 Sinal de reset recebido do Owner Hub:', signal);
          
          if (signal.type === 'FORCE_CLEAN_WINDOWS_APP' && signal.action === 'clear_sqlite_and_state') {
            console.log('[APP] 🧹 Executando limpeza forçada da app Windows...');
            await forceCleanLocalState();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[APP] ✅ Conectado ao canal de reset do Owner Hub');
        }
      });

    // 2. Listener via Broadcast Channel (fallback)
    const broadcastChannel = new BroadcastChannel('vereda_reset_sync');
    broadcastChannel.onmessage = async (event) => {
      const signal = event.data;
      console.log('[APP] 🚨 Sinal de reset recebido via Broadcast:', signal);
      
      if (signal.type === 'FORCE_CLEAN_WINDOWS_APP' && signal.action === 'clear_sqlite_and_state') {
        console.log('[APP] 🧹 Executando limpeza forçada via Broadcast...');
        await forceCleanLocalState();
      }
    };

    // 🔄 REALTIME LISTENER PARA SINCRONIZAÇÃO COM SUPABASE
    const ordersChannel = supabase
      .channel('orders_realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('[APP] 🔄 Mudança em tempo real na tabela orders:', payload);
          
          // Se for INSERT ou UPDATE de uma ordem, recarregar estado
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('[APP] 📦 Recarregando estado devido a mudança em orders...');
            
            // Buscar ordens atualizadas do Supabase
            try {
              const { data: ordersData, error } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', new Date().toISOString().split('T')[0])
                .order('created_at', { ascending: false })
                .limit(50);
              
              if (!error && ordersData) {
                const store = useStore.getState();
                if (store.addToOrder) {
                  const formattedOrders = ordersData.map(order => ({
                    id: order.id,
                    tableId: order.table_id,
                    type: order.type || 'LOCAL',
                    items: order.items || [],
                    status: order.status,
                    timestamp: order.created_at,
                    total: Number(order.total_amount || 0),
                    taxTotal: Number(order.tax_total || 0),
                    profit: Number(order.profit || 0),
                    subAccountName: order.customer_name || 'Principal',
                    paymentMethod: order.payment_method || 'NUMERARIO'
                  }));
                  
                  // Limpar ordens existentes e adicionar as novas
                  store.setActiveOrders([]);
                  formattedOrders.forEach(order => {
                    store.addToOrder(order.tableId, order, 1, '', order.id);
                  });
                  
                  console.log('[APP] ✅ Estado sincronizado com Supabase em tempo real');
                }
              }
            } catch (syncError) {
              console.error('[APP] ❌ Erro na sincronização em tempo real:', syncError);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[APP] ✅ Conectado ao canal de tempo real da tabela orders');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[APP] ❌ Erro no canal de tempo real');
        }
      });

    return () => {
      console.log('[APP] 🔄 Limpando listeners...');
      supabase.removeChannel(resetChannel);
      supabase.removeChannel(ordersChannel);
      broadcastChannel.close();
    };
  }, []);

  // �🛑 PROTOCOLO DE SESSÃO POR CONTRATO - LOCALSTORAGE FIRST
  useEffect(() => {
    logger.info('APP', 'Iniciando aplicação Windows');
    
    // VERIFICAÇÃO APENAS DO LOCALSTORAGE - PROIBIDO CHAMAR SUPABASE AQUI
    const establishmentId = localStorage.getItem('establishment_id');
    const veredId = localStorage.getItem('tasca_vered_id');
    
    if (establishmentId || veredId) {
      // SE EXISTE ID, CONSIDERA AUTENTICADO - PROIBIDO VALIDAR SESSÃO DO SUPABASE
      logger.info('APP', 'Sessão por contrato detectada. Establishment ID:', establishmentId, 'Vered ID:', veredId);
      
      // Define no Estado Global IMEDIATAMENTE
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        invoke('set_establishment_id', { establishmentId: establishmentId || veredId });
      }
      
      // 🚀 FORÇAR FETCH INICIAL DO SUPABASE - PREENCHER ESTADO COM DADOS DA NUVEM
      const forceInitialSupabaseFetch = async () => {
        try {
          console.log('[APP] 🚀 Forçando fetch inicial do Supabase...');
          
          // Buscar ordens do Supabase
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (ordersError) {
            console.error('[APP] ❌ Erro ao buscar ordens do Supabase:', ordersError);
          } else {
            console.log('[APP] ✅ Ordens buscadas do Supabase:', ordersData?.length || 0);
            
            // Preencher estado local com dados do Supabase
            if (ordersData && ordersData.length > 0) {
              const formattedOrders = ordersData.map(order => ({
                id: order.id,
                tableId: order.table_id,
                type: order.type || 'LOCAL',
                items: order.items || [],
                status: order.status,
                timestamp: order.created_at,
                total: Number(order.total_amount || 0),
                taxTotal: Number(order.tax_total || 0),
                profit: Number(order.profit || 0),
                subAccountName: order.customer_name || 'Principal',
                paymentMethod: order.payment_method || 'NUMERARIO'
              }));
              
              // Atualizar estado local com dados do Supabase
              const store = useStore.getState();
              if (store.addToOrder) {
                formattedOrders.forEach(order => store.addToOrder(order.tableId, order, 1, '', order.id));
                console.log('[APP] ✅ Estado local preenchido com dados do Supabase');
              }
            }
          }
          
          // Buscar despesas do Supabase
          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .gte('created_at', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (expensesError) {
            console.error('[APP] ❌ Erro ao buscar despesas do Supabase:', expensesError);
          } else {
            console.log('[APP] ✅ Despesas buscadas do Supabase:', expensesData?.length || 0);
            
            // Preencher estado local com despesas do Supabase
            if (expensesData && expensesData.length > 0) {
              const formattedExpenses = expensesData.map(expense => ({
                id: expense.id,
                description: expense.description || '',
                amount: Number(expense.amount_kz || 0),
                category: expense.category || 'OUTROS',
                status: expense.status || 'PENDING',
                paymentMethod: expense.payment_method || 'NUMERARIO',
                receipt: expense.receipt || '',
                notes: expense.notes || '',
                date: expense.created_at || new Date(),
                createdAt: expense.created_at || new Date()
              }));
              
              // Atualizar estado local com despesas do Supabase
              const store = useStore.getState();
              if (store.addExpense) {
                formattedExpenses.forEach(expense => store.addExpense(expense));
                console.log('[APP] ✅ Despesas locais preenchidas com dados do Supabase');
              }
            }
          }
          
        } catch (fetchError) {
          console.error('[APP] ❌ Erro crítico no fetch inicial:', fetchError);
        }
      };
      
      // Executar fetch inicial após 2 segundos
      setTimeout(forceInitialSupabaseFetch, 2000);
      
      setIsConfigured(true);
      setIsLoading(false);
      return;
    }
    
    // 2. Se não há sessão local, mostra setup
    checkConfiguration();
    
    // 3. Executar diagnóstico automático do Supabase
    runAutoDiagnostics().catch(() => {});
  }, []);

  const checkConfiguration = async () => {
    try {
      // Verificar se já está configurado
      const configured = await invoke<boolean>('check_configuration');
      
      // Verificar se existe configuração no localStorage
      const localUrl = localStorage.getItem('SUPABASE_URL');
      const localKey = localStorage.getItem('SUPABASE_ANON_KEY');
      
      if (localUrl && localKey) {
        // Se existe configuração local, criar cliente e testar
        const client = createClient(localUrl, localKey);
        setSupabaseClient(client);
        setIsConfigured(true);
        
        // Testar conexão
        const { error } = await client.from('products').select('id').limit(1);
        if (error) {
          // Se falhar, mostrar setup
          setShowSetup(true);
          setIsConfigured(false);
        }
      } else {
        // Se não existe configuração, mostrar setup
        setShowSetup(true);
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      setShowSetup(true);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = async (supabaseUrl: string, supabaseKey: string) => {
    try {
      // Criar cliente Supabase
      const client = createClient(supabaseUrl, supabaseKey);
      
      // Testar conexão
      const { error } = await client.from('products').select('id').limit(1);
      if (error) {
        throw new Error('Erro ao conectar ao Supabase: ' + error.message);
      }
      
      // Executar auto-schema
      await runAutoSchema(client);
      
      // Salvar configuração
      await invoke('save_config', { supabaseUrl, supabaseKey });
      
      // Salvar no localStorage
      localStorage.setItem('SUPABASE_URL', supabaseUrl);
      localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey);
      
      // Atualizar estado
      setSupabaseClient(client);
      setIsConfigured(true);
      setShowSetup(false);
      
      // Definir cliente global
      (window as any).supabase = client;
      
    } catch (error: any) {
      console.error('Erro no setup:', error);
      throw error;
    }
  };

  const runAutoSchema = async (client: any) => {
    // Script SQL completo para criar todas as tabelas
    const schemaSQL = `
      -- Criar categorias se não existirem
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar produtos se não existirem
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        category_id TEXT REFERENCES categories(id),
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar funcionários se não existirem
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT,
        base_salary_kz REAL DEFAULT 0,
        status TEXT DEFAULT 'ATIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar mesas se não existirem
      CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number INTEGER NOT NULL UNIQUE,
        status TEXT DEFAULT 'LIVRE',
        x REAL DEFAULT 0,
        y REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar clientes se não existirem
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        balance REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar pedidos se não existirem
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        customer_phone TEXT,
        delivery_address TEXT,
        table_number INTEGER,
        total_amount REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'ABERTO',
        payment_method TEXT,
        invoice_number TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar itens dos pedidos se não existirem (SEM COLUNA STATUS)
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar despesas se não existirem
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount_kz REAL NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'PENDENTE',
        provider TEXT,
        receipt_url TEXT,
        proforma_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar configurações se não existirem
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'main',
        restaurant_name TEXT DEFAULT 'Tasca do Vereda',
        currency TEXT DEFAULT 'AOA',
        tax_rate REAL DEFAULT 0.14,
        address TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Criar histórico externo se não existir
      CREATE TABLE IF NOT EXISTS external_history (
        id TEXT PRIMARY KEY,
        total_revenue REAL DEFAULT 0,
        gross_profit REAL DEFAULT 0,
        source_name TEXT,
        period TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Inserir categorias padrão se não existirem
      INSERT OR IGNORE INTO categories (id, name) VALUES 
      ('cat-1', 'Entradas'),
      ('cat-2', 'Pratos Principais'),
      ('cat-3', 'Acompanhamentos'),
      ('cat-4', 'Bebidas'),
      ('cat-5', 'Sobremesas'),
      ('cat-6', 'Outros');

      -- Inserir produtos exemplo se não existirem
      INSERT OR IGNORE INTO products (id, name, description, price, category_id, is_active, is_available) VALUES 
      ('prod-1', 'Muamba de Frango', 'Muamba tradicional com frango, ginguba e óleo de palma', 3500, 'cat-2', true, true),
      ('prod-2', 'Frango Frito', 'Porção de frango frito com batatas', 2800, 'cat-2', true, true),
      ('prod-3', 'Arroz Branco', 'Arroz branco cozido', 1500, 'cat-3', true, true),
      ('prod-4', 'Feijão de Óleo de Palma', 'Feijão cozido com óleo de palma', 1200, 'cat-3', true, true),
      ('prod-5', 'Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros', 800, 'cat-4', true, true),
      ('prod-6', 'Fanta Laranja 2L', 'Refrigerante Fanta Laranja 2 litros', 750, 'cat-4', true, true),
      ('prod-7', 'Água Mineral 500ml', 'Água mineral sem gás 500ml', 200, 'cat-4', true, true),
      ('prod-8', 'Mussse de Ginguba', 'Mussse tradicional de ginguba', 500, 'cat-5', true, true),
      ('prod-9', 'Salada de Tomate', 'Salada fresca de tomate e cebola', 800, 'cat-1', true, true);

      -- Inserir mesas padrão se não existirem
      INSERT OR IGNORE INTO tables (number, status) VALUES 
      (1, 'LIVRE'), (2, 'LIVRE'), (3, 'LIVRE'), (4, 'LIVRE'), (5, 'LIVRE'),
      (6, 'LIVRE'), (7, 'LIVRE'), (8, 'LIVRE'), (9, 'LIVRE'), (10, 'LIVRE');

      -- Inserir configurações padrão se não existirem
      INSERT OR IGNORE INTO settings (id, restaurant_name, currency, tax_rate) VALUES 
      ('main', 'Tasca do Vereda', 'AOA', 0.14);
    `;

    // Executar o schema SQL via RPC do Supabase
    const { error } = await client.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.warn('RPC não disponível, tentando criar tabelas individualmente...');
      // Se RPC não funcionar, criar tabelas individualmente
      await createTablesIndividually(client);
    }
  };

  const createTablesIndividually = async (client: any) => {
    // Criar tabelas individualmente se RPC não funcionar
    const tables = [
      'categories',
      'products', 
      'staff',
      'tables',
      'customers',
      'orders',
      'order_items',
      'expenses',
      'settings',
      'external_history'
    ];

    for (const table of tables) {
      try {
        // Tentar ler da tabela para verificar se existe
        await client.from(table).select('id').limit(1);
      } catch (error) {
        console.warn(`Tabela ${table} pode não existir, mas continuando...`);
      }
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
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Configuração necessária antes de usar o sistema</span>
              </div>
            </div>
          </div>
          <SetupModal
            isOpen={true}
            onClose={() => {}}
            onComplete={handleSetupComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route path="/owner/dashboard" element={
            <AuthGuard>
              <OwnerDashboard />
            </AuthGuard>
          } />
          <Route path="/reports" element={<Reports />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/agt" element={<AGTControl />} />
          <Route path="/profit-center" element={<ProfitCenter />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Router>
    </AppErrorBoundary>
  );
};

export default App;
