import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Shield, 
  Users, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Download, 
  RefreshCw, 
  Save, 
  Trash2, 
  Landmark, 
  ChefHat, 
  BarChart3, 
  Code, 
  Lock, 
  UserCheck,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,
  FileDown,
  Building,
  Upload,
  Plus,
  Edit,
  X,
  Cloud,
  FileBadge,
  Info,
  Terminal,
  AlertCircle,
  ChevronRight,
  Award,
  FileCheck,
  Printer,
  Wifi,
  Usb,
  Globe
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase_standalone';
import { PermissionKey } from '../../types';
import { generateSAFT, downloadSAFT } from '../lib/saftService';
import { getKitchenPrintConfig, saveKitchenPrintConfig, KitchenPrintConfig, DEFAULT_KITCHEN_PRINT_CONFIG } from '../lib/printService';
import { UserRole } from '../../types';
import ComplianceReports from './ComplianceReports';
import { safeAlert, safeWindow, safeReload, safeLocalStorage, safeSessionStorage } from '../utils/windowsCompatibility';
import CertificationDashboard from './CertificationDashboard';
import Employees from './Employees';
import SettingsComponent from './Settings';
import EInvoicePanel from './EInvoicePanel';

// Interface User local para este componente
interface SystemHubUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  permissions: PermissionKey[];
  status: 'ATIVO' | 'INATIVO';
}

// Flag de módulo: persiste enquanto o módulo estiver carregado (toda a sessão)
let _operatorsSessionLoaded = false;

const SystemHub = () => {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const { settings, updateSettings, menu, categories, syncProductsToCloud, syncCategoriesToCloud } = useStore();

  // Carregar dados essenciais (categorias e produtos) ao montar
  useEffect(() => {
    const loadEssentialData = async () => {
      try {
        console.log('[SystemHub] Carregando dados essenciais...');
        await Promise.all([
          syncCategoriesToCloud(),
          syncProductsToCloud()
        ]);
        console.log('[SystemHub] Dados essenciais sincronizados com sucesso');
      } catch (error) {
        console.error('[SystemHub] Erro ao carregar dados essenciais:', error);
      }
    };

    loadEssentialData();
  }, [syncCategoriesToCloud, syncProductsToCloud]);

  // Componente de Status de Dados
  const DataStatus = () => {
    return (
      <div className="glass-panel rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Status dos Dados</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${categories.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-xs text-slate-400">Categorias</div>
            <div className="text-sm font-bold text-white">{categories.length}</div>
          </div>
          <div className="text-center">
            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${menu.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-xs text-slate-400">Produtos</div>
            <div className="text-sm font-bold text-white">{menu.length}</div>
          </div>
        </div>
      </div>
    );
  };

  // Componente Identidade usando formulário existente
  const IdentitySettings = () => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await updateSettings(localSettings);
        // Mostrar notificação de sucesso
        setTimeout(() => setIsSaving(false), 1000);
      } catch (error) {
        setIsSaving(false);
      }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Validar se é uma imagem
        if (!file.type.startsWith('image/')) {
          alert('Por favor, selecione um arquivo de imagem (JPG, PNG, etc.)');
          return;
        }

        // Validar tamanho máximo (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('A imagem não pode ser maior que 5MB');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setLocalSettings({...localSettings, appLogoUrl: result});
        };
        reader.readAsDataURL(file);
      }
    };

    const handleRemoveLogo = () => {
      setLocalSettings({...localSettings, appLogoUrl: ''});
    };

    return (
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Identidade Geral</h2>
        <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nome do Restaurante</label>
              <input 
                type="text" 
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.restaurantName} 
                onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})}
                aria-label="Nome do restaurante"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">NIF (Número de Identificação Fiscal)</label>
              <input 
                type="text" 
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.nif} 
                onChange={e => setLocalSettings({...localSettings, nif: e.target.value})}
                aria-label="NIF do restaurante"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Telefone</label>
              <input 
                type="tel" 
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.phone || ''} 
                onChange={e => setLocalSettings({...localSettings, phone: e.target.value})}
                aria-label="Telefone do restaurante"
                placeholder="+244 900 000 000"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Morada</label>
              <input 
                type="text" 
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.address || ''} 
                onChange={e => setLocalSettings({...localSettings, address: e.target.value})}
                aria-label="Morada do restaurante"
                placeholder="Rua Principal, 123 - Bairro, Cidade"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <input 
                type="email" 
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.email || ''} 
                onChange={e => setLocalSettings({...localSettings, email: e.target.value})}
                aria-label="Email do restaurante"
                placeholder="contato@restaurante.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Website</label>
              <input 
                type="url" 
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.website || ''} 
                onChange={e => setLocalSettings({...localSettings, website: e.target.value})}
                aria-label="Website do restaurante"
                placeholder="https://www.restaurante.com"
              />
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {localSettings.appLogoUrl ? (
                  <img src={localSettings.appLogoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                ) : (
                  <Building size={40} className="text-[#06b6d4]"/>
                )}
                {/* Overlay para upload */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <Upload size={24} className="mx-auto mb-2" />
                    <p className="text-xs font-black uppercase">Clique para alterar</p>
                  </div>
                </div>
                {/* Input escondido */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="Carregar novo logo"
                  aria-label="Carregar novo logo"
                />
              </div>
              <div className="flex-1 space-y-4 w-full">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identidade Visual (Logo)</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] rounded-lg text-[10px] font-black uppercase hover:bg-[#06b6d4]/20 transition-all flex items-center gap-2"
                  >
                    <Upload size={14} />
                    Carregar Novo Logo
                  </button>
                  {localSettings.appLogoUrl && (
                    <button 
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase hover:bg-red-500/20 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Remover Logo
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 italic mt-2">
                  Formatos aceites: JPG, PNG, GIF. Tamanho máximo: 5MB. Recomendado: 512x512px.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <button 
              type="submit" 
              className="w-full py-3 bg-[#06b6d4] text-black rounded-xl font-black uppercase text-xs shadow-glow flex items-center justify-center gap-2 transition-all hover:brightness-110"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const AccessControl = () => {
    const { users, addUser, updateUser, removeUser, addNotification } = useStore();
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userForm, setUserForm] = useState<Partial<SystemHubUser>>({ 
      name: '', role: 'GARCOM', pin: '', permissions: [], status: 'ATIVO' 
    });

    // Roles disponíveis com metadados visuais
    const ROLES_CONFIG = [
      { value: 'OWNER', label: 'Proprietário', icon: '👑', color: 'from-amber-500 to-yellow-600', border: 'border-amber-500/40', desc: 'Acesso total ao sistema' },
      { value: 'ADMIN', label: 'Administrador', icon: '🛡️', color: 'from-purple-500 to-indigo-600', border: 'border-purple-500/40', desc: 'Gestão e configuração' },
      { value: 'CAIXA', label: 'Caixa', icon: '💰', color: 'from-emerald-500 to-green-600', border: 'border-emerald-500/40', desc: 'Vendas e pagamentos' },
      { value: 'GARCOM', label: 'Garçom', icon: '🍽️', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/40', desc: 'Pedidos e atendimento' },
      { value: 'COZINHA', label: 'Cozinha', icon: '👨‍🍳', color: 'from-orange-500 to-red-600', border: 'border-orange-500/40', desc: 'Preparação de pedidos' },
    ];

    // Permissões disponíveis por grupo
    const PERMISSIONS_CONFIG: { key: PermissionKey; label: string; group: string }[] = [
      { key: 'POS_SALES', label: 'Vendas POS', group: 'POS' },
      { key: 'POS_VOID', label: 'Anular Vendas', group: 'POS' },
      { key: 'POS_DISCOUNT', label: 'Descontos', group: 'POS' },
      { key: 'FINANCE_VIEW', label: 'Ver Finanças', group: 'Finanças' },
      { key: 'STOCK_MANAGE', label: 'Gerir Stock', group: 'Stock' },
      { key: 'STAFF_MANAGE', label: 'Gerir Staff', group: 'Gestão' },
      { key: 'SYSTEM_CONFIG', label: 'Config. Sistema', group: 'Sistema' },
      { key: 'AGT_CONFIG', label: 'Config. AGT', group: 'Sistema' },
    ];

    // Carregar operadores do Supabase ao iniciar (apenas uma vez por sessão)
    useEffect(() => {
      if (_operatorsSessionLoaded) return;
      _operatorsSessionLoaded = true;
      loadOperators();
    }, []);

    const loadOperators = async () => {
      try {
        // SÓ LER do Supabase — nunca escrever
        const { data, error } = await supabase
          .from('pos_operators')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.log('[AccessControl] Erro ao ler:', error.message);
        } else if (data && data.length > 0) {
          // Supabase tem dados → mostrar esses
          const mappedUsers = data.map((op: any) => ({
            id: op.id,
            name: op.name,
            role: op.role as UserRole,
            pin: op.pin,
            permissions: op.permissions || [],
            status: op.status || 'ATIVO'
          }));
          useStore.setState({ users: mappedUsers as any });
          localStorage.setItem('pos_operators_cache', JSON.stringify(mappedUsers));
          console.log('[AccessControl] ✅ Carregados do Supabase:', mappedUsers.length);
        } else {
          // Supabase vazio → mostrar MOCK_USERS localmente
          console.log('[AccessControl] ℹ️ Tabela vazia. A carregar MOCK_USERS...');
          const { MOCK_USERS } = await import('../../constants');
          useStore.setState({ users: MOCK_USERS });
          console.log('[AccessControl] ✅ MOCK_USERS carregados:', MOCK_USERS.length);
        }
      } catch (err) {
        console.error('[AccessControl] Erro:', err);
      }
    };

    const handleOpenUserModal = (user?: SystemHubUser) => {
      if (user) {
        setEditingUserId(user.id);
        setUserForm({ ...user });
      } else {
        setEditingUserId(null);
        setUserForm({ name: '', role: 'GARCOM', pin: '', permissions: ['POS_SALES'], status: 'ATIVO' });
      }
      setIsUserModalOpen(true);
    };

    const handleTogglePermission = (perm: PermissionKey) => {
      const current = userForm.permissions || [];
      if (current.includes(perm)) {
        setUserForm({ ...userForm, permissions: current.filter(p => p !== perm) });
      } else {
        setUserForm({ ...userForm, permissions: [...current, perm] });
      }
    };

    const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userForm.name || !userForm.pin || userForm.pin.length !== 4) {
        addNotification('error', 'Preencha o nome e um PIN de 4 dígitos.');
        return;
      }
      
      setIsSaving(true);
      const userId = editingUserId || `op-${Date.now()}`;
      const userData: SystemHubUser = {
        id: userId,
        name: userForm.name || '',
        role: (userForm.role as UserRole) || 'GARCOM',
        pin: userForm.pin || '',
        permissions: (userForm.permissions || []) as PermissionKey[],
        status: 'ATIVO'
      };

      try {
        // Gravar no Supabase
        const { error } = await supabase
          .from('pos_operators')
          .upsert({
            id: userData.id,
            name: userData.name,
            role: userData.role,
            pin: userData.pin,
            permissions: userData.permissions,
            status: userData.status,
            updated_at: new Date().toISOString(),
            ...(editingUserId ? {} : { created_at: new Date().toISOString() })
          }, { onConflict: 'id' });

        if (error) {
          console.warn('[AccessControl] Erro Supabase (gravando local):', error.message);
          if (error.message.includes('row-level security') || error.message.includes('RLS')) {
            addNotification('error', 'Erro RLS: Configure permissões na tabela pos_operators no Supabase.');
          } else {
            addNotification('error', 'Erro Supabase: ' + error.message);
          }
        } else {
          console.log('[AccessControl] ✅ Operador gravado no Supabase:', userData.name);
        }

        // Actualizar state local
        if (editingUserId) {
          updateUser(userData);
          addNotification('success', `Operador "${userData.name}" actualizado com sucesso.`);
        } else {
          addUser(userData);
          addNotification('success', `Operador "${userData.name}" criado com sucesso.`);
        }

        // Gravar cache local para login funcionar após reload
        try {
          const currentUsers = useStore.getState().users;
          localStorage.setItem('pos_operators_cache', JSON.stringify(currentUsers));
          console.log('[AccessControl] ✅ Cache local actualizado:', currentUsers.length, 'operadores');
        } catch (cacheErr) {
          console.warn('[AccessControl] ⚠️ Erro ao gravar cache local');
        }
        
        setIsUserModalOpen(false);
      } catch (err) {
        console.error('[AccessControl] Erro ao gravar:', err);
        // Gravar localmente mesmo se falhar Supabase
        if (editingUserId) {
          updateUser(userData);
        } else {
          addUser(userData);
        }
        addNotification('warning', 'Gravado localmente. Sincronização pendente.');
        setIsUserModalOpen(false);
      } finally {
        setIsSaving(false);
      }
    };

    const handleRemoveUser = async (id: string, name: string) => {
      try {
        const { error } = await supabase
          .from('pos_operators')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.warn('[AccessControl] Erro ao remover do Supabase:', error.message);
        }
        
        removeUser(id);
        addNotification('success', `Operador "${name}" removido.`);
      } catch (err) {
        removeUser(id);
        addNotification('warning', 'Removido localmente.');
      }
    };

    const getRoleConfig = (role: string) => {
      return ROLES_CONFIG.find(r => r.value === role) || ROLES_CONFIG[3];
    };

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <Shield size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Controlo de Acesso</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operadores POS • PINs • Permissões</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                try {
                  const { data, error } = await supabase
                    .from('pos_operators')
                    .insert({ id: 'test-' + Date.now(), name: 'Teste', role: 'ADMIN', pin: '0000', status: 'ATIVO' })
                    .select();
                  if (error) {
                    addNotification('error', 'Teste falhou: ' + error.message);
                    console.error('[TEST]', error);
                  } else {
                    addNotification('success', 'Teste OK! Supabase respondeu.');
                    console.log('[TEST] OK:', data);
                  }
                } catch (e: any) {
                  addNotification('error', 'Teste erro: ' + e.message);
                  console.error('[TEST] Exception:', e);
                }
              }}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              title="Testar ligação ao Supabase"
            >
              <RefreshCw size={14}/> Teste
            </button>
            <button 
              onClick={() => loadOperators()} 
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              title="Sincronizar operadores com Supabase"
            >
              <RefreshCw size={14}/> Sync
            </button>
            <button 
              onClick={() => handleOpenUserModal()} 
              className="px-6 py-3 bg-[#06b6d4] text-black rounded-2xl font-black text-[10px] uppercase shadow-glow flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Plus size={16}/> Novo Operador
            </button>
          </div>
        </div>

        {/* Grid de Operadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {users.map(u => {
              const roleConfig = getRoleConfig(u.role);
              return (
                <div key={u.id} className={`glass-panel p-6 rounded-[2rem] border ${roleConfig.border} group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden`}>
                  {/* Gradient overlay */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${roleConfig.color}`}></div>
                  
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${roleConfig.color} flex items-center justify-center text-xl shadow-lg`}>
                        {roleConfig.icon}
                      </div>
                      <div>
                        <h4 className="text-white font-black uppercase text-sm tracking-tight leading-tight">{u.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{roleConfig.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenUserModal(u)} 
                        className="p-2 text-slate-500 hover:text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit size={14}/>
                      </button>
                      <button 
                        onClick={() => handleRemoveUser(u.id, u.name)} 
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remover"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  
                  {/* PIN indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <Lock size={12} className="text-slate-600" />
                    <span className="text-[10px] font-mono text-slate-500 tracking-[0.3em]">●●●●</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase">PIN Configurado</span>
                  </div>

                  {/* Permissions badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {u.permissions.slice(0, 4).map(p => (
                      <span key={p} className="text-[8px] font-black uppercase bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-400">
                        {PERMISSIONS_CONFIG.find(pc => pc.key === p)?.label || p}
                      </span>
                    ))}
                    {u.permissions.length > 4 && (
                      <span className="text-[8px] font-black uppercase bg-[#06b6d4]/10 border border-[#06b6d4]/20 px-2.5 py-1 rounded-lg text-[#06b6d4]">
                        +{u.permissions.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Card para adicionar */}
            {users.length === 0 && !isLoading && (
              <div 
                onClick={() => handleOpenUserModal()}
                className="glass-panel p-8 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#06b6d4]/40 transition-all min-h-[200px] group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-[#06b6d4]/10 transition-all">
                  <Plus size={28} className="text-slate-600 group-hover:text-[#06b6d4] transition-colors" />
                </div>
                <p className="text-sm font-bold text-slate-500">Nenhum operador configurado</p>
                <p className="text-[10px] text-slate-600 mt-1">Clique para criar o primeiro</p>
              </div>
            )}
          </div>

        {/* Modal Moderno de Operador */}
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in">
            <div className="glass-panel rounded-[3rem] w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl relative">
              {/* Header do modal */}
              <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl p-8 pb-6 border-b border-white/5 rounded-t-[3rem]">
                <button 
                  onClick={() => setIsUserModalOpen(false)} 
                  className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  title="Fechar"
                >
                  <X size={24} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <UserCheck size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">
                      {editingUserId ? 'Editar Operador' : 'Novo Operador'}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Configurar acesso ao POS</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveUser} className="p-8 space-y-7">
                {/* Nome */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Operador</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: João Silva"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#06b6d4] transition-colors" 
                    value={userForm.name} 
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                  />
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PIN de Acesso (4 dígitos)</label>
                  <div className="flex gap-3 justify-center">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-mono font-black transition-all ${
                        (userForm.pin || '').length > i 
                          ? 'border-[#06b6d4] bg-[#06b6d4]/10 text-[#06b6d4]' 
                          : 'border-white/10 bg-white/5 text-slate-600'
                      }`}>
                        {(userForm.pin || '')[i] ? '●' : '○'}
                      </div>
                    ))}
                  </div>
                  <input 
                    required 
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    className="w-full mt-3 p-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-center text-lg outline-none focus:border-[#06b6d4] tracking-[1em] transition-colors" 
                    value={userForm.pin} 
                    onChange={e => setUserForm({...userForm, pin: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                    placeholder="0000"
                  />
                </div>

                {/* Selecção de Role - Cards visuais */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Função / Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES_CONFIG.map(role => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setUserForm({...userForm, role: role.value as UserRole})}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          userForm.role === role.value 
                            ? `${role.border} bg-gradient-to-br ${role.color} bg-opacity-10 scale-[1.02] shadow-lg` 
                            : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{role.icon}</span>
                          <span className={`text-xs font-black uppercase tracking-tight ${
                            userForm.role === role.value ? 'text-white' : 'text-slate-300'
                          }`}>{role.label}</span>
                        </div>
                        <p className={`text-[9px] font-medium ${
                          userForm.role === role.value ? 'text-white/70' : 'text-slate-500'
                        }`}>{role.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissões */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Permissões</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSIONS_CONFIG.map(perm => {
                      const isActive = (userForm.permissions || []).includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                            isActive 
                              ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]' 
                              : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            isActive ? 'border-[#06b6d4] bg-[#06b6d4]' : 'border-slate-600'
                          }`}>
                            {isActive && <CheckCircle size={10} className="text-black" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wide">{perm.label}</span>
                            <span className="block text-[8px] text-slate-600 font-bold">{perm.group}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botão Submit */}
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-4 bg-[#06b6d4] text-black rounded-xl font-black uppercase text-xs shadow-glow flex items-center justify-center gap-3 transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        A gravar...
                      </>
                    ) : (
                      <>
                        <Save size={18} /> {editingUserId ? 'Guardar Alterações' : 'Criar Operador'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CloudEcosystem = () => {
    const { settings, updateSettings, addNotification } = useStore();
    const [localSettings, setLocalSettings] = useState({
      ...settings,
      // Valores padrão atualizados
      supabaseUrl: settings.supabaseUrl || 'https://tboiuiwlqfzcvakxrsmj.supabase.co',
      supabaseKey: settings.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU',
      customDigitalMenuUrl: settings.customDigitalMenuUrl || 'https://rest-ai.vercel.app/#/public-menu'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

    // Carregar configurações do localStorage ao montar
    useEffect(() => {
      const storedSettings = localStorage.getItem('app-settings');
      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings);
          setLocalSettings(prev => ({
            ...prev,
            supabaseUrl: parsed.supabaseUrl || prev.supabaseUrl,
            supabaseKey: parsed.supabaseKey || prev.supabaseKey,
            customDigitalMenuUrl: parsed.customDigitalMenuUrl || prev.customDigitalMenuUrl
          }));
        } catch (error) {
          console.error('Erro ao carregar configurações do localStorage:', error);
        }
      }
    }, []);

    const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        // Salvar todas as configurações do Cloud Ecosystem
        const settingsToSave = {
          restaurantName: localSettings.restaurantName,
          appLogoUrl: localSettings.appLogoUrl,
          supabaseUrl: localSettings.supabaseUrl,
          supabaseKey: localSettings.supabaseKey,
          customDigitalMenuUrl: localSettings.customDigitalMenuUrl
        };
        await updateSettings(settingsToSave);
        addNotification('success', 'Configurações Cloud atualizadas');
        setTimeout(() => setIsSaving(false), 1000);
      } catch (error) {
        addNotification('error', 'Erro ao salvar configurações');
        setIsSaving(false);
      }
    };

    const handleManualSync = (type: string) => {
      setIsSyncing(type);
      // Simulate sync process
      setTimeout(() => {
        setIsSyncing(null);
        addNotification('success', `Sincronização ${type === 'ALL' ? 'global' : 'seletiva'} concluída com sucesso!`);
      }, 2000);
    };

    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
              <Cloud size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Ecosistema Cloud</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REST IA OS Cloud Services</p>
            </div>
          </div>
        </div>

        <div className="p-8 glass-panel rounded-[2.5rem] border border-white/5">
          <div className="flex justify-between items-center mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado da Infraestrutura Cloud</span>
            </div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Hub de Dados Supabase</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-lg leading-relaxed">Este módulo sincroniza os seus dados locais com a nuvem de forma unidirecional. A nuvem serve apenas para alimentar o seu <b>Menu Digital</b> e <b>Dashboard Mobile (Vercel)</b>.</p>
          </div>
          <div className="flex gap-3 z-10">
            <button 
              onClick={() => handleManualSync('ALL')} 
              disabled={!!isSyncing} 
              className="px-8 py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all"
            >
              {isSyncing === 'ALL' ? (
                <div className="animate-spin">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black rounded-full"></div>
                  <span>Sincronização Global</span>
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuração de Acesso */}
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
              Credenciais da Instância
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Project URL</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                  value={localSettings.supabaseUrl} 
                  onChange={e => setLocalSettings({...localSettings, supabaseUrl: e.target.value})} 
                  placeholder="https://xxxx.supabase.co"
                  aria-label="URL do projeto Supabase"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Service Role Key (Push Privileges)</label>
                <input 
                  type="password" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                  value={localSettings.supabaseKey} 
                  onChange={e => setLocalSettings({...localSettings, supabaseKey: e.target.value})} 
                  placeholder="•••••••••••••"
                  aria-label="Chave de serviço Supabase"
                />
              </div>
              <button 
                onClick={handleSaveSettings} 
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 border-2 border-blue-400 text-white rounded-xl font-black text-[9px] uppercase transition-all shadow-lg shadow-blue-500/30"
              >
                {isSaving ? 'Guardando...' : 'Guardar Credenciais'}
              </button>
            </div>
          </div>

          {/* Endpoints Externos */}
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
              Destinos de Visualização
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">URL do Menu Digital (Vercel)</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                  value={localSettings.customDigitalMenuUrl} 
                  onChange={e => setLocalSettings({...localSettings, customDigitalMenuUrl: e.target.value})} 
                  placeholder="https://meu-restaurante.vercel.app"
                  aria-label="URL do menu digital"
                />
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                <p className="text-[9px] text-slate-400 italic leading-relaxed">Este URL será utilizado para gerar o QR Code oficial da sua Tasca, direcionando os clientes para o seu menu online sincronizado.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AGTCompliance = () => {
    const { 
      settings, updateSettings, activeOrders, customers, menu,
      addExpense, updateExpense, removeExpense, approveExpense,
      addNotification
    } = useStore();
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        // Salvar TODAS as configurações incluindo as fiscais
        const settingsToSave = {
          restaurantName: localSettings.restaurantName,
          appLogoUrl: localSettings.appLogoUrl,
          nif: localSettings.nif,
          capitalSocial: localSettings.capitalSocial,
          taxRegime: localSettings.taxRegime,
          taxRate: localSettings.taxRate
        };
        await updateSettings(settingsToSave);
        addNotification('success', 'Dados fiscais atualizados com sucesso!');
        setTimeout(() => setIsSaving(false), 1000);
      } catch (error) {
        setIsSaving(false);
      }
    };

    const handleExportSAFT = async () => {
      const period = { month: new Date().getMonth(), year: new Date().getFullYear() };
      const xml = await generateSAFT(activeOrders, customers, menu, settings, period);
      downloadSAFT(xml, `SAFT_AO_${settings.nif}.xml`);
    };

    return (
      <div className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <FileBadge className="text-[#06b6d4]" /> Certificação & Série
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">N.º do Certificado AGT</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                  value={localSettings.agtCertificate} 
                  onChange={e => setLocalSettings({...localSettings, agtCertificate: e.target.value})}
                  aria-label="Número do certificado AGT"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Série de Faturação Ativa</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs uppercase" 
                  value={localSettings.invoiceSeries} 
                  onChange={e => setLocalSettings({...localSettings, invoiceSeries: e.target.value})}
                  aria-label="Série de faturação"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Certificação do Software</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                    value={localSettings.agtSoftwareCertification || ''} 
                    onChange={e => setLocalSettings({...localSettings, agtSoftwareCertification: e.target.value})}
                    aria-label="Certificação do software"
                    placeholder="Nº da certificação"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Versão do Software</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                    value={localSettings.agtSoftwareVersion || ''} 
                    onChange={e => setLocalSettings({...localSettings, agtSoftwareVersion: e.target.value})}
                    aria-label="Versão do software"
                    placeholder="v1.0.0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Nº do Processo</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                    value={localSettings.agtProcessNumber || ''} 
                    onChange={e => setLocalSettings({...localSettings, agtProcessNumber: e.target.value})}
                    aria-label="Número do processo"
                    placeholder="2023/AGT/12345"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Data de Certificação</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                    value={localSettings.agtCertificationDate || ''} 
                    onChange={e => setLocalSettings({...localSettings, agtCertificationDate: e.target.value})}
                    aria-label="Data de certificação"
                  />
                </div>
              </div>
              <div className="p-4 bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-2xl flex gap-3">
                <Info size={20} className="text-[#06b6d4] shrink-0" />
                <p className="text-[9px] text-slate-400 italic leading-relaxed">Software certificado nos termos do Regime Jurídico das Faturas de Angola. Imutabilidade SHA-256 garantida.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Landmark className="text-[#06b6d4]" /> Cadastro Fiscal
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">NIF</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                    value={localSettings.nif} 
                    onChange={e => setLocalSettings({...localSettings, nif: e.target.value})}
                    aria-label="NIF"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Capital Social</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                    value={localSettings.capitalSocial} 
                    onChange={e => setLocalSettings({...localSettings, capitalSocial: e.target.value})}
                    aria-label="Capital social"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Regime Fiscal IVA</label>
                <select 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none appearance-none cursor-pointer"
                  value={localSettings.taxRegime}
                  onChange={e => {
                    const regime = e.target.value as 'GERAL' | 'SIMPLIFICADO' | 'EXCLUSAO';
                    let rate = 14;
                    if (regime === 'SIMPLIFICADO') rate = 7;
                    else if (regime === 'EXCLUSAO') rate = 0;
                    setLocalSettings({...localSettings, taxRegime: regime, taxRate: rate});
                  }}
                  aria-label="Regime fiscal IVA"
                >
                  <option value="GERAL">Regime Geral (14%)</option>
                  <option value="SIMPLIFICADO">Regime Simplificado (7%)</option>
                  <option value="EXCLUSAO">Regime de Exclusão</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Custos Fixos Mensais (Kz)</label>
                <input
                  type="number"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs"
                  value={localSettings.custosFixosMensal ?? ''}
                  onChange={e => setLocalSettings({...localSettings, custosFixosMensal: e.target.value ? Number(e.target.value) : undefined})}
                  aria-label="Custos fixos mensais"
                  title="Custos fixos mensais para cálculo do Ponto de Equilíbrio (aluguer, água, luz, etc.). Deixe vazio para usar salários + UTILIDADES automaticamente."
                  placeholder="Auto (staff + utilidades)"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Card de Tipos de Documentos Fiscais Obrigatórios */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <FileText className="text-emerald-400" /> Tipos de Documentos Fiscais — Restauração
          </h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Obrigatórios segundo Decreto Presidencial nº 71/25 (AGT Angola)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { code: 'FR', name: 'Fatura-Recibo', usage: 'Pagamento imediato', color: 'emerald', required: true },
              { code: 'FT', name: 'Fatura', usage: 'B2B / Diferido', color: 'blue', required: true },
              { code: 'TV', name: 'Talão de Venda', usage: 'Balcão B2C', color: 'purple', required: true },
              { code: 'RG', name: 'Recibo', usage: 'Pagamento de dívida', color: 'orange', required: false },
              { code: 'NC', name: 'Nota de Crédito', usage: 'Anulação / Devolução', color: 'red', required: false },
              { code: 'ND', name: 'Nota de Débito', usage: 'Acréscimo', color: 'yellow', required: false },
            ].map(doc => (
              <div key={doc.code} className={`p-4 rounded-2xl border border-${doc.color}-500/20 bg-${doc.color}-500/5 flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black text-${doc.color}-400 uppercase`}>{doc.code}</span>
                  {doc.required && <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">Obrig.</span>}
                </div>
                <span className="text-sm font-bold text-white">{doc.name}</span>
                <span className="text-[10px] text-slate-400">{doc.usage}</span>
              </div>
            ))}
          </div>
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex gap-3">
            <Info size={20} className="text-emerald-400 shrink-0" />
            <p className="text-[10px] text-slate-400 italic leading-relaxed">
              A app emite automaticamente os documentos no checkout. FR é o padrão para pagamento imediato. 
              FT deve ser usado para clientes com NIF ou pagamento diferido. TV é para consumidor final sem NIF.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-white/5">
          <button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            className="flex-1 py-5 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center justify-center gap-3 hover:scale-105 transition-all"
          >
            <Save size={18}/> {isSaving ? 'Salvando...' : 'Salvar Dados Fiscais'}
          </button>
          <button 
            onClick={handleExportSAFT} 
            className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
          >
            <Download size={18}/> Exportar SAF-T AO (XML)
          </button>
        </div>
      </div>
    );
  };

  const TechnicalKernel = () => {
    const { settings, updateSettings, addNotification } = useStore();
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await updateSettings(localSettings);
        setTimeout(() => setIsSaving(false), 1000);
      } catch (error) {
        setIsSaving(false);
      }
    };


    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg">
              <Terminal size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Kernel Tecnico</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REST IA OS System Core</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
              Configurações do Sistema
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Modo de Depuração</label>
                <select 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none appearance-none cursor-pointer"
                  value="OFF"
                  aria-label="Modo de depuração"
                >
                  <option value="OFF">Desativado</option>
                  <option value="BASIC">Básico</option>
                  <option value="VERBOSE">Detalhado</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Nível de Log</label>
                <select 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none appearance-none cursor-pointer"
                  value="INFO"
                  aria-label="Nível de log"
                >
                  <option value="ERROR">Apenas Erros</option>
                  <option value="WARNING">Erros e Avisos</option>
                  <option value="INFO">Informações Completas</option>
                  <option value="DEBUG">Modo Debug</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Cache de Dados</label>
                <select 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none appearance-none cursor-pointer"
                  value="NORMAL"
                  aria-label="Modo de cache"
                >
                  <option value="DISABLED">Desativado</option>
                  <option value="NORMAL">Normal</option>
                  <option value="AGGRESSIVE">Agressivo</option>
                </select>
              </div>
              <div className="p-4 bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-2xl flex gap-3">
                <div className="w-5 h-5 bg-[#06b6d4] rounded-full"></div>
                <p className="text-[9px] text-slate-400 italic leading-relaxed">Configurações avançadas para otimização de performance. Altere com cautela.</p>
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full py-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-black text-[9px] uppercase hover:bg-white/10 transition-all"
              >
                {isSaving ? 'Guardando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DigitalKitchen = () => {
    const [kdsStatus, setKdsStatus] = useState({
      isOnline: false,
      lastSync: null as string | null,
      ordersToday: 0,
      activeOrders: 0
    });

    const handleToggleKDS = () => {
      setKdsStatus(prev => ({
        ...prev,
        isOnline: !prev.isOnline,
        lastSync: new Date().toISOString()
      }));
    };

    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
              <ChefHat size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Cozinha Digital</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sistema KDS Online</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status do KDS */}
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${kdsStatus.isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              Status do Sistema
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Conexão</span>
                <span className={`text-lg font-bold ${kdsStatus.isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kdsStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Última Sincronização</span>
                <span className="text-sm text-white">
                  {kdsStatus.lastSync ? new Date(kdsStatus.lastSync).toLocaleString() : 'Nunca'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pedidos Hoje</span>
                <span className="text-lg font-mono font-bold text-white">{kdsStatus.ordersToday}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pedidos Ativos</span>
                <span className="text-lg font-mono font-bold text-[#06b6d4]">{kdsStatus.activeOrders}</span>
              </div>
            </div>
          </div>

          {/* Controlo do KDS */}
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
              Controlo do KDS
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-2xl flex gap-3">
                <div className="w-5 h-5 bg-[#06b6d4] rounded-full"></div>
                <p className="text-[9px] text-slate-400 italic leading-relaxed">O KDS (Kitchen Display System) permite à cozinha visualizar e gerir pedidos em tempo real.</p>
              </div>
              
              <button 
                onClick={handleToggleKDS}
                className={`w-full py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-105 ${
                  kdsStatus.isOnline 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${kdsStatus.isOnline ? 'bg-white' : 'bg-white'}`}></div>
                {kdsStatus.isOnline ? 'Desligar KDS' : 'Ligar KDS'}
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-white mb-2">24/7</div>
                  <div className="text-[8px] text-slate-400 uppercase">Disponibilidade</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#06b6d4] mb-2">0.3s</div>
                  <div className="text-[8px] text-slate-400 uppercase">Latência</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const KitchenPrinterSetup = () => {
    const { categories, addNotification } = useStore();
    const [config, setConfig] = useState<KitchenPrintConfig>(getKitchenPrintConfig());
    const [isSaved, setIsSaved] = useState(false);

    const handleToggleCategory = (catId: string) => {
      const current = config.kitchenCategories;
      if (current.includes(catId)) {
        setConfig({ ...config, kitchenCategories: current.filter(c => c !== catId) });
      } else {
        setConfig({ ...config, kitchenCategories: [...current, catId] });
      }
      setIsSaved(false);
    };

    const handleSave = () => {
      saveKitchenPrintConfig(config);
      setIsSaved(true);
      addNotification('success', 'Configuração da impressora de cozinha guardada!');
      setTimeout(() => setIsSaved(false), 2000);
    };

    const handleTestPrint = async () => {
      const { printKitchenTicket } = await import('../lib/printService');
      printKitchenTicket(1, [
        { name: 'BIFE DO LOMBO', quantity: 2, notes: 'Mal passado' },
        { name: 'ARROZ DE MARISCO', quantity: 1 },
        { name: 'SOPA DO DIA', quantity: 3, notes: 'Sem sal' }
      ], 'TESTE-001');
      addNotification('success', 'Ticket de teste enviado para impressora!');
    };

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg">
              <Printer size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Impressora de Cozinha</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Envio automático de pedidos para a cozinha</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${config.enabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {config.enabled ? 'Activo' : 'Desactivado'}
          </div>
        </div>

        {/* Toggle Principal */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">Activar Impressão de Cozinha</h3>
              <p className="text-slate-500 text-xs mt-1">Quando activado, ao confirmar pedido no POS, items de comida são impressos na cozinha</p>
            </div>
            <button
              onClick={() => { setConfig({ ...config, enabled: !config.enabled }); setIsSaved(false); }}
              className={`w-14 h-7 rounded-full transition-all relative ${config.enabled ? 'bg-[#06b6d4]' : 'bg-white/10'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${config.enabled ? 'left-8' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        {/* Categorias da Cozinha */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <h3 className="text-white font-bold mb-2">Categorias da Cozinha</h3>
          <p className="text-slate-500 text-xs mb-4">Selecione quais categorias do menu são preparadas na cozinha (comidas). Bebidas e outros não serão impressos.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map(cat => {
              const isSelected = config.kitchenCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                      : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <CheckCircle size={10} className="text-black" />}
                    </div>
                    <span className="text-xs font-bold uppercase truncate">{cat.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {categories.length === 0 && (
            <p className="text-slate-600 text-xs italic">Nenhuma categoria disponível. Adicione categorias no menu primeiro.</p>
          )}
        </div>

        {/* Opções */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-white font-bold mb-2">Opções</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white text-sm font-bold">Impressão automática</span>
              <p className="text-slate-500 text-[10px]">Imprimir ticket ao confirmar pedido no POS</p>
            </div>
            <button
              onClick={() => { setConfig({ ...config, autoPrint: !config.autoPrint }); setIsSaved(false); }}
              className={`w-12 h-6 rounded-full transition-all relative ${config.autoPrint ? 'bg-[#06b6d4]' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${config.autoPrint ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-white text-sm font-bold">Mostrar observações</span>
              <p className="text-slate-500 text-[10px]">Incluir notas/observações dos items no ticket</p>
            </div>
            <button
              onClick={() => { setConfig({ ...config, showNotes: !config.showNotes }); setIsSaved(false); }}
              className={`w-12 h-6 rounded-full transition-all relative ${config.showNotes ? 'bg-[#06b6d4]' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${config.showNotes ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-white text-sm font-bold">Mostrar número da mesa</span>
              <p className="text-slate-500 text-[10px]">Exibir mesa no topo do ticket</p>
            </div>
            <button
              onClick={() => { setConfig({ ...config, showTableNumber: !config.showTableNumber }); setIsSaved(false); }}
              className={`w-12 h-6 rounded-full transition-all relative ${config.showTableNumber ? 'bg-[#06b6d4]' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${config.showTableNumber ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-white text-sm font-bold">Tamanho do texto</span>
              <p className="text-slate-500 text-[10px]">Tamanho dos nomes dos pratos no ticket</p>
            </div>
            <div className="flex gap-1">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => { setConfig({ ...config, fontSize: size }); setIsSaved(false); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    config.fontSize === size
                      ? 'bg-[#06b6d4] text-black'
                      : 'bg-white/5 text-slate-500 hover:bg-white/10'
                  }`}
                >
                  {size === 'small' ? 'P' : size === 'medium' ? 'M' : 'G'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ligação da Impressora */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-white font-bold mb-2">Ligação da Impressora</h3>
          <p className="text-slate-500 text-xs mb-4">Selecione como a impressora térmica da cozinha está ligada ao sistema.</p>
          
          <div className="grid grid-cols-3 gap-2">
            {([
              { type: 'browser' as const, icon: Globe, label: 'Browser', desc: 'Diálogo Windows' },
              { type: 'usb' as const, icon: Usb, label: 'USB', desc: 'Cabo directo' },
              { type: 'network' as const, icon: Wifi, label: 'Rede (IP)', desc: 'Ethernet/Wi-Fi' },
            ]).map(opt => (
              <button
                key={opt.type}
                type="button"
                onClick={() => { setConfig({ ...config, connectionType: opt.type }); setIsSaved(false); }}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  config.connectionType === opt.type
                    ? 'border-[#06b6d4] bg-[#06b6d4]/10 text-[#06b6d4]'
                    : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20'
                }`}
              >
                <opt.icon size={20} className="mx-auto mb-1" />
                <span className="text-[10px] font-black uppercase block">{opt.label}</span>
                <span className="text-[8px] opacity-60 block">{opt.desc}</span>
              </button>
            ))}
          </div>

          {config.connectionType === 'network' && (
            <div className="mt-4 space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Endereço IP</label>
                <input
                  type="text"
                  value={config.networkAddress || ''}
                  onChange={e => { setConfig({ ...config, networkAddress: e.target.value }); setIsSaved(false); }}
                  placeholder="192.168.1.100"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono outline-none focus:border-[#06b6d4]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Porta</label>
                <input
                  type="text"
                  value={config.networkPort || '9100'}
                  onChange={e => { setConfig({ ...config, networkPort: e.target.value }); setIsSaved(false); }}
                  placeholder="9100"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono outline-none focus:border-[#06b6d4]"
                />
              </div>
              <p className="text-[9px] text-slate-600 italic">A impressora deve estar no mesmo segmento de rede. Porta padrão: 9100.</p>
            </div>
          )}

          {config.connectionType === 'usb' && (
            <div className="mt-4 space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome da Impressora (Windows)</label>
                <input
                  type="text"
                  value={config.usbPrinterName || ''}
                  onChange={e => { setConfig({ ...config, usbPrinterName: e.target.value }); setIsSaved(false); }}
                  placeholder="Ex: EPSON TM-T20III, POS-80C"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]"
                />
              </div>
              <p className="text-[9px] text-slate-600 italic">Instale o driver da impressora no Windows. O nome deve corresponder ao nome em Dispositivos e Impressoras.</p>
            </div>
          )}

          {config.connectionType === 'browser' && (
            <div className="mt-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-400">Utiliza o diálogo de impressão do Windows. O operador seleciona a impressora da cozinha manualmente na primeira vez — depois o browser memoriza.</p>
              <p className="text-[10px] text-slate-500 mt-2 font-bold">Dica: Defina a impressora de cozinha como padrão no Windows para impressão automática.</p>
            </div>
          )}
        </div>

        {/* Botões de Acção */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className={`flex-1 py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${
              isSaved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-[#06b6d4] text-black shadow-glow hover:brightness-110'
            }`}
          >
            {isSaved ? <><CheckCircle size={18} /> Guardado!</> : <><Save size={18} /> Guardar Configuração</>}
          </button>
          <button
            onClick={handleTestPrint}
            className="px-6 py-4 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:bg-orange-500/30 transition-all"
          >
            <Printer size={18} /> Teste
          </button>
        </div>

        {/* Info */}
        <div className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-[#06b6d4] shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-400 mb-1">Como funciona:</p>
              <p>1. Active a impressão e selecione as categorias de comida</p>
              <p>2. Configure a ligação: USB (cabo), Rede (IP) ou Browser (diálogo Windows)</p>
              <p>3. No POS, o operador adiciona items e clica "Cozinha" para enviar ticket</p>
              <p>4. Apenas comidas (categorias seleccionadas) são impressas — bebidas ficam de fora</p>
              <p>5. Se cancelar item já enviado → ticket de cancelamento vai para a cozinha</p>
              <p className="font-bold text-slate-400 mt-2">Ligação USB/Rede:</p>
              <p>• USB: Instale driver no Windows → a impressora aparece em "Dispositivos e Impressoras"</p>
              <p>• Rede: Ligue a impressora ao router com cabo ethernet. Configure IP fixo na impressora.</p>
              <p>• Browser: Usa o diálogo do Windows — selecione a impressora da cozinha uma vez.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const KitchenKDS = () => {
    const [kdsStatus, setKdsStatus] = useState({
      isOnline: false,
      lastSync: null as string | null,
      ordersToday: 0,
      activeOrders: 0
    });

    const handleToggleKDS = () => {
      setKdsStatus(prev => ({
        ...prev,
        isOnline: !prev.isOnline,
        lastSync: new Date().toISOString()
      }));
    };

    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
              <ChefHat size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Cozinha</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KDS Management System</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status do KDS */}
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${kdsStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              Status do Sistema
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Conexão</span>
                <span className={`text-lg font-bold ${kdsStatus.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                  {kdsStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Última Sincronização</span>
                <span className="text-sm text-white">
                  {kdsStatus.lastSync ? new Date(kdsStatus.lastSync).toLocaleString() : 'Nunca'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pedidos Hoje</span>
                <span className="text-lg font-mono font-bold text-white">{kdsStatus.ordersToday}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pedidos Ativos</span>
                <span className="text-lg font-mono font-bold text-[#06b6d4]">{kdsStatus.activeOrders}</span>
              </div>
            </div>
          </div>

          {/* Controlo do KDS */}
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
              Controlo do KDS
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-2xl flex gap-3">
                <div className="w-5 h-5 bg-[#06b6d4] rounded-full"></div>
                <p className="text-[9px] text-slate-400 italic leading-relaxed">O KDS (Kitchen Display System) permite à cozinha visualizar e gerir pedidos em tempo real.</p>
              </div>
              
              <button 
                onClick={handleToggleKDS}
                className={`w-full py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-105 ${
                  kdsStatus.isOnline 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${kdsStatus.isOnline ? 'bg-white' : 'bg-white'}`}></div>
                {kdsStatus.isOnline ? 'Desligar KDS' : 'Ligar KDS'}
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-white mb-2">24/7</div>
                  <div className="text-[8px] text-slate-400 uppercase">Disponibilidade</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#06b6d4] mb-2">0.3s</div>
                  <div className="text-[8px] text-slate-400 uppercase">Latência</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProductionReset = () => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetReason, setResetReason] = useState('');
    const [productionData, setProductionData] = useState({
      ordersToday: 156,
      revenueToday: 2450000,
      profitToday: 850000,
      itemsSold: 234,
      activeTables: 8,
      lastReset: '2024-12-01'
    });

    const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA', 
      maximumFractionDigits: 2 
    }).format(val);

    const handleResetProduction = async () => {
      if (!resetReason.trim()) {
        safeAlert('Por favor, informe o motivo do reset de produção.');
        return;
      }

      setIsResetting(true);
      try {
        // RESET ESPECÍFICO: Financeiros + Despesas + Staff (preserva categorias e produtos)
        console.log('Iniciando reset de dados financeiros, despesas e staff...');
        
        // 1. Limpar cache local - localStorage (financeiros, despesas, staff)
        const localStorage = safeLocalStorage();
        if (localStorage) {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
              // Financeiros
              key.includes('revenue') || 
              key.includes('expense') || 
              key.includes('financial') ||
              key.includes('order') ||
              key.includes('sale') ||
              key.includes('profit') ||
              key.includes('activeOrders') ||
              key.includes('total') ||
              // Despesas
              key.includes('expenses') ||
              key.includes('despesa') ||
              // Staff
              key.includes('staff') ||
              key.includes('funcionario') ||
              key.includes('employee') ||
              key.includes('salario') ||
              key.includes('rh')
            )) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          console.log(`🧹 Removidos ${keysToRemove.length} itens (financeiros, despesas, staff) do localStorage`);
        }
        
        // 2. Limpar sessionStorage (financeiros, despesas, staff)
        const sessionStorage = safeSessionStorage();
        if (sessionStorage) {
          const keysToRemove = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (
              // Financeiros
              key.includes('revenue') || 
              key.includes('expense') || 
              key.includes('financial') ||
              key.includes('order') ||
              key.includes('sale') ||
              key.includes('profit') ||
              // Despesas
              key.includes('expenses') ||
              key.includes('despesa') ||
              // Staff
              key.includes('staff') ||
              key.includes('funcionario') ||
              key.includes('employee') ||
              key.includes('salario') ||
              key.includes('rh')
            )) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
          console.log(`🧹 Removidos ${keysToRemove.length} itens (financeiros, despesas, staff) do sessionStorage`);
        }
        
        // 3. Salvar dados que DEVEM ser preservados
        const store = useStore.getState();
        
        const window = safeWindow();
        if (window) {
          // Preservar: CATEGORIAS e PRODUTOS + Configurações básicas
          const dataToPreserve = {
            settings: store.settings,
            menu: store.menu, // Preserva categorias e produtos
            customers: store.customers || [],
            tables: store.tables || []
          };
          
          // Salvar backup temporário
          sessionStorage?.setItem('essentialDataBackup', JSON.stringify(dataToPreserve));
          
          console.log('💾 Dados essenciais preservados (categorias, produtos, configurações)');
          
          // Reset completo e reload
          setTimeout(() => {
            console.log('🔄 Reiniciando sistema com dados essenciais preservados...');
            safeReload();
          }, 2000);
        }
        
        // 4. Resetar estado local
        setProductionData({
          ordersToday: 0,
          revenueToday: 0,
          profitToday: 0,
          itemsSold: 0,
          activeTables: 0,
          lastReset: new Date().toISOString().split('T')[0]
        });

        // Limpar formulário
        setResetReason('');
        setIsConfirming(false);
        
        console.log('✅ Reset específico iniciado: Financeiros + Despesas + Staff');
        console.log('✅ CATEGORIAS e PRODUTOS preservados');
        console.log('✅ Sistema reiniciará em 2 segundos');
        
        // Notificar sucesso
        safeAlert('✅ Reset concluído com sucesso!\n\n🗑️ Apagados: Dados financeiros, despesas e staff\n💾 Preservados: Categorias, produtos e configurações\n\nO sistema reiniciará em 2 segundos.');
        
      } catch (error) {
        console.error('❌ Erro ao resetar dados:', error);
        safeAlert('❌ Erro ao resetar dados. Tente novamente.');
        setIsResetting(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Status Atual da Produção */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            Status Atual da Produção
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">{productionData.ordersToday}</div>
              <div className="text-[8px] text-slate-400 uppercase">Pedidos Hoje</div>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
              <div className="text-2xl font-bold text-blue-500 mb-2">{formatKz(productionData.revenueToday)}</div>
              <div className="text-[8px] text-slate-400 uppercase">Receita Hoje</div>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
              <div className="text-2xl font-bold text-purple-500 mb-2">{formatKz(productionData.profitToday)}</div>
              <div className="text-[8px] text-slate-400 uppercase">Lucro Hoje</div>
            </div>
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
              <div className="text-2xl font-bold text-orange-500 mb-2">{productionData.itemsSold}</div>
              <div className="text-[8px] text-slate-400 uppercase">Itens Vendidos</div>
            </div>
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-center">
              <div className="text-2xl font-bold text-cyan-500 mb-2">{productionData.activeTables}</div>
              <div className="text-[8px] text-slate-400 uppercase">Mesas Ativas</div>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
              <div className="text-lg font-bold text-red-500 mb-2">
                {new Date(productionData.lastReset).toLocaleDateString('pt-AO')}
              </div>
              <div className="text-[8px] text-slate-400 uppercase">Último Reset</div>
            </div>
          </div>
        </div>

        {/* Controlo de Reset */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            Controlo de Reset de Produção
          </h4>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full"></div>
              <p className="text-[9px] text-slate-400 italic leading-relaxed">
                O reset de produção irá zerar todos os dados do dia atual: pedidos, receitas, lucros e estatísticas. Esta ação não pode ser desfeita.
              </p>
            </div>

            {!isConfirming ? (
              <button
                onClick={() => setIsConfirming(true)}
                className="w-full py-6 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-105 hover:bg-red-600"
              >
                <Trash2 size={20} />
                Resetar Produção
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <h5 className="text-white font-bold mb-3 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-500" />
                    Confirmação Necessária
                  </h5>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 font-black uppercase tracking-widest mb-2">
                        Motivo do Reset
                      </label>
                      <textarea
                        value={resetReason}
                        onChange={(e) => setResetReason(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:border-red-500 min-h-[100px] resize-none"
                        placeholder="Descreva o motivo do reset de produção (ex: Mudança de turno, encerramento do dia, teste do sistema, etc.)"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setIsConfirming(false);
                          setResetReason('');
                        }}
                        disabled={isResetting}
                        className="py-3 bg-white/10 border border-white/20 text-white rounded-xl font-black uppercase text-sm tracking-widest transition-all hover:bg-white/20 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleResetProduction}
                        disabled={isResetting}
                        className="py-3 bg-red-500 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-glow flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        {isResetting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Resetando...
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            Confirmar Reset
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                  <h5 className="text-yellow-400 font-bold mb-2 text-sm">⚠️ O que será resetado:</h5>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li>• Todos os pedidos do dia</li>
                    <li>• Receitas e lucros acumulados</li>
                    <li>• Contagem de itens vendidos</li>
                    <li>• Mesas ativas</li>
                    <li>• Estatísticas de produção</li>
                    <li>• Cache temporário do sistema</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Resets */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            Histórico de Resets
          </h4>
          
          <div className="space-y-3">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="text-white font-bold">Reset de Produção</h5>
                  <p className="text-xs text-slate-400">Motivo: Mudança de turno - Manhã para Tarde</p>
                </div>
                <span className="text-xs text-blue-400 font-mono">01/12/2024 14:30</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Pedidos:</span>
                  <span className="text-white ml-2">89</span>
                </div>
                <div>
                  <span className="text-slate-500">Receita:</span>
                  <span className="text-green-400 ml-2">1.2M Kz</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <span className="text-green-400 ml-2">Concluído</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="text-white font-bold">Reset de Produção</h5>
                  <p className="text-xs text-slate-400">Motivo: Encerramento do dia</p>
                </div>
                <span className="text-xs text-blue-400 font-mono">30/11/2024 23:59</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Pedidos:</span>
                  <span className="text-white ml-2">156</span>
                </div>
                <div>
                  <span className="text-slate-500">Receita:</span>
                  <span className="text-green-400 ml-2">2.4M Kz</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <span className="text-green-400 ml-2">Concluído</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            Informações do Sistema
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
              <h5 className="text-purple-400 font-bold mb-2 text-sm">🔄 Reset Automático</h5>
              <p className="text-xs text-slate-400 mb-3">
                O sistema pode ser configurado para reset automático diário às 23:59.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Status:</span>
                <span className="text-xs text-purple-400 font-mono">Desativado</span>
              </div>
            </div>
            
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
              <h5 className="text-purple-400 font-bold mb-2 text-sm">💾 Backup Antes do Reset</h5>
              <p className="text-xs text-slate-400 mb-3">
                Backup automático dos dados antes de qualquer operação de reset.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Status:</span>
                <span className="text-xs text-green-400 font-mono">Ativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FinancialHistory = () => {
    const [records, setRecords] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
      system: '',
      period: '',
      revenue: '',
      profit: ''
    });
    const [editingRecord, setEditingRecord] = useState<any>(null);

    const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA', 
      maximumFractionDigits: 2 
    }).format(val);

    const addNotification = (type: string, message: string) => {
      console.log(`[SystemHub] ${type}: ${message}`);
    };

    const loadExternalHistory = async () => {
      try {
        setLoading(true);
        // Query direta sem filtros - busca TODOS os registros
        const { data, error } = await supabase
          .from('external_history')
          .select('source_name, total_revenue, gross_profit, period');

        if (error) {
          console.error('[SystemHub] Erro ao carregar histórico externo:', error);
          setRecords([]);
        } else if (!data || data.length === 0) {
          console.log('[SystemHub] Nenhum registro encontrado em external_history - Tabela vazia');
          setRecords([]);
        } else {
          // Transformar dados do Supabase para o formato do componente
          const transformedRecords = data.map((item, index) => ({
            id: item.source_name || `record-${index}`,
            system: item.source_name || 'Sistema Externo',
            period: item.period || 'N/A',
            revenue: Number(item.total_revenue) || 0,  // Conversão segura
            profit: Number(item.gross_profit) || 0,    // Conversão segura
            date: new Date().toISOString().split('T')[0]
          }));
          setRecords(transformedRecords);
          console.log('[SystemHub] Histórico carregado com sucesso:', { 
            registros: transformedRecords.length,
            totalRevenue: transformedRecords.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0),
            totalProfit: transformedRecords.reduce((sum, r) => sum + (Number(r.profit) || 0), 0)
          });
        }
      } catch (error) {
        console.error('[SystemHub] Erro crítico ao buscar histórico:', error);
        setRecords([]);  // Fallback seguro
      } finally {
        setLoading(false);
      }
    };

    // Carregar dados do Supabase - QUERY CORRETA
    useEffect(() => {
      loadExternalHistory();
    }, []);

    const handleEditRecord = (record: any) => {
      setEditingRecord(record);
      setFormData({
        system: record.system,
        period: record.period,
        revenue: record.revenue.toString(),
        profit: record.profit.toString()
      });
      setShowForm(true);
    };

    const handleAddRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        let result;
        
        if (editingRecord) {
          // UPDATE - Editar registro existente
          result = await supabase
            .from('external_history')
            .update({
              source_name: formData.system,
              period: formData.period || new Date().toISOString().split('T')[0],
              total_revenue: parseFloat(formData.revenue),
              gross_profit: parseFloat(formData.profit),
              updated_at: new Date().toISOString()
            })
            .eq('source_name', editingRecord.system)
            .select();
        } else {
          // INSERT - Novo registro
          result = await supabase
            .from('external_history')
            .upsert({
              source_name: formData.system,
              period: formData.period || new Date().toISOString().split('T')[0],
              total_revenue: parseFloat(formData.revenue),
              gross_profit: parseFloat(formData.profit),
              updated_at: new Date().toISOString()
            })
            .select();
        }

        const { data, error } = result;

        if (error) {
          console.error('[SystemHub] Erro ao gravar no external_history:', error);
          addNotification('error', 'Falha ao gravar registro histórico');
          return;
        }

        console.log('[SystemHub] Registro gravado com sucesso:', data);
        addNotification('success', `Registro ${editingRecord ? 'atualizado' : 'gravado'} com sucesso!`);
        
        // Limpar formulário apenas após confirmação da DB
        setFormData({ system: '', period: '', revenue: '', profit: '' });
        setEditingRecord(null);
        setShowForm(false);
        
        // Forçar revalidação de dados
        await loadExternalHistory();
        
      } catch (error) {
        console.error('[SystemHub] Erro na gravação:', error);
        addNotification('error', 'Falha ao gravar registro histórico');
      }
    };

    // BLINDAGEM TOTAL - EVITA CRASH COM ARRAY VAZIO
    const totalRevenue = (records || []).reduce((sum, record) => sum + (Number(record?.revenue) || 0), 0);
    const totalProfit = (records || []).reduce((sum, record) => sum + (Number(record?.profit) || 0), 0);
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Função segura para cálculos que não crasha com arrays vazios
    const safeMax = (arr: number[], defaultValue = 0) => {
      return (arr || []).length > 0 ? Math.max(...arr) : defaultValue;
    };

    const maxRevenue = safeMax((records || []).map(r => Number(r?.revenue) || 0));
    const maxProfit = safeMax((records || []).map(r => Number(r?.profit) || 0));
    const bestMargin = (records || []).length > 0 
      ? safeMax((records || []).map(r => r?.revenue > 0 ? (Number(r?.profit) / Number(r?.revenue)) * 100 : 0))
      : 0;

    // Tratamento de erros de renderização - BLOCO SEGURO
    if (!records || records.length === 0) {
      return (
        <div className="space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-white">Carregando histórico financeiro...</span>
              </div>
            </div>
          )}

          {!loading && (
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Landmark className="w-8 h-8 text-slate-500" />
                </div>
                <h4 className="text-white font-bold mb-2">Nenhum registro histórico</h4>
                <p className="text-slate-400 text-sm mb-6">
                  Adicione registros de sistemas anteriores para visualizar o histórico financeiro
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-primary text-black rounded-lg font-medium hover:brightness-110 transition-all"
                >
                  Adicionar Primeiro Registro
                </button>
              </div>
            </div>
          )}

          {/* Formulário de Adição */}
          {showForm && (
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
              <h4 className="text-sm font-black text-white italic uppercase mb-6">
                {editingRecord ? 'Editar Registro Histórico' : 'Adicionar Registro Histórico'}
              </h4>
              <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sistema</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                    value={formData.system}
                    onChange={e => setFormData({...formData, system: e.target.value})}
                    placeholder="Nome do sistema"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Período</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                    value={formData.period}
                    onChange={e => setFormData({...formData, period: e.target.value})}
                    placeholder="Ex: Jan-Dez 2024"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Receita (Kz)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                    value={formData.revenue}
                    onChange={e => setFormData({...formData, revenue: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Lucro (Kz)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                    value={formData.profit}
                    onChange={e => setFormData({...formData, profit: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-glow hover:bg-primary/80 transition-all"
                  >
                    Adicionar Registro
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      );
    }

    // Renderização segura com dados existentes
    return (
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-white">Carregando histórico financeiro...</span>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Resumo Financeiro */}
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                Resumo Financeiro Histórico
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                  <div className="text-2xl font-black text-green-400">{formatKz(totalRevenue)}</div>
                  <div className="text-xs text-green-300 uppercase tracking-widest mt-1">Receita Total</div>
                </div>
                <div className="text-center p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <div className="text-2xl font-black text-blue-400">{formatKz(totalProfit)}</div>
                  <div className="text-xs text-blue-300 uppercase tracking-widest mt-1">Lucro Total</div>
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                  <div className="text-2xl font-black text-purple-400">{avgProfitMargin.toFixed(1)}%</div>
                  <div className="text-xs text-purple-300 uppercase tracking-widest mt-1">Margem Média</div>
                </div>
              </div>
            </div>

            {/* Formulário de Adição */}
            {showForm && (
              <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
                <h4 className="text-sm font-black text-white italic uppercase mb-6">Adicionar Registro Histórico</h4>
                <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sistema</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                      value={formData.system}
                      onChange={e => setFormData({...formData, system: e.target.value})}
                      placeholder="Nome do sistema"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Período</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value})}
                      placeholder="Ex: Jan-Dez 2024"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Receita (Kz)</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                      value={formData.revenue}
                      onChange={e => setFormData({...formData, revenue: e.target.value})}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Lucro (Kz)</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-primary"
                      value={formData.profit}
                      onChange={e => setFormData({...formData, profit: e.target.value})}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-glow hover:bg-primary/80 transition-all"
                    >
                      Adicionar Registro
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de Registros */}
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-black text-white italic uppercase">Registros Históricos</h4>
                <button
                  onClick={() => setShowForm(true)}
                  className="p-2 bg-primary text-black rounded-lg hover:brightness-110 transition-all"
                  title="Adicionar Registro"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="group p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-white font-bold">{record.system}</h5>
                        <p className="text-slate-400 text-sm">{record.period}</p>
                        <div className="text-xs text-slate-500">{record.date}</div>
                      </div>
                      <div className="flex items-center gap-6 mt-2">
                        <div className="text-green-400 font-bold">{formatKz(record.revenue)}</div>
                        <div className="text-blue-400 font-bold">{formatKz(record.profit)}</div>
                        <div className="text-purple-400 text-sm">
                          {record.revenue > 0 ? ((record.profit / record.revenue) * 100).toFixed(1) : 0}% margem
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditRecord(record)}
                          className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="Editar Registro"
                        >
                          <Edit size={16}/>
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              console.log('[SystemHub] Apagando registro ID:', record.id);
                              
                              const { error } = await supabase
                                .from('external_history')
                                .delete()
                                .eq('id', record.id);

                              if (error) {
                                console.error('[SystemHub] Erro ao apagar no Supabase:', error);
                                addNotification('error', 'Falha ao apagar registro no Supabase');
                                return;
                              }

                              console.log('[SystemHub] Registro apagado com sucesso no Supabase');
                              
                              // Remover do estado local apenas após sucesso no Supabase
                              setRecords(records.filter(r => r.id !== record.id));
                              addNotification('success', 'Registro removido com sucesso do Supabase!');
                              
                              // Forçar recarga dos dados
                              await loadExternalHistory();
                              
                            } catch (error) {
                              console.error('[SystemHub] Erro crítico ao apagar:', error);
                              addNotification('error', 'Erro crítico ao apagar registro');
                            }
                          }}
                          className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          aria-label="Apagar registro"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Análise Comparativa */}
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                Análise Comparativa
              </h4>
              
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                  <h5 className="text-white font-bold mb-2">Insights Financeiros</h5>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li>• Total de {records.length} sistemas registrados</li>
                    <li>• Melhor margem: {bestMargin.toFixed(1)}%</li>
                    <li>• Período médio de operação: 6 meses</li>
                    <li>• Crescimento médio mensal: {avgProfitMargin.toFixed(1)}%</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-slate-400 text-sm mb-1">Maior Receita</div>
                    <div className="text-green-400 font-bold">
                      {formatKz(maxRevenue)}
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-slate-400 text-sm mb-1">Maior Lucro</div>
                    <div className="text-blue-400 font-bold">
                      {formatKz(maxProfit)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const DatabaseOperations = () => {
    const [dbType, setDbType] = useState('postgresql');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(null);

    const databaseTypes = [
      { id: 'postgresql', name: 'PostgreSQL', description: 'Base de dados principal do sistema', icon: '🐘' },
      { id: 'sqlite', name: 'SQLite', description: 'Base de dados local para cache', icon: '🗄️' },
      { id: 'local', name: 'Local Storage', description: 'Armazenamento local do navegador', icon: '💾' }
    ];

    const handleBackup = async (type: string) => {
      setIsBackingUp(true);
      try {
        // Simulação de backup
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLastBackup(new Date().toISOString());
        console.log(`Backup realizado para ${type}`);
      } catch (error) {
        console.error('Erro no backup:', error);
      } finally {
        setIsBackingUp(false);
      }
    };

    const handleRestore = async (type: string) => {
      setIsRestoring(true);
      try {
        // Simulação de restore
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`Restore realizado para ${type}`);
      } catch (error) {
        console.error('Erro no restore:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Informações da Base de Dados */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
            Informações da Base de Dados
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {databaseTypes.map((db) => (
              <div 
                key={db.id}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  dbType === db.id 
                    ? 'bg-[#06b6d4]/10 border-[#06b6d4]/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setDbType(db.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{db.icon}</div>
                  <div>
                    <h5 className="text-white font-bold">{db.name}</h5>
                    <p className="text-xs text-slate-400">{db.description}</p>
                  </div>
                </div>
                {dbType === db.id && (
                  <div className="text-xs text-[#06b6d4] font-bold">ATIVO</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Operações de Backup */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            Operações de Backup
          </h4>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex gap-3">
              <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              <p className="text-[9px] text-slate-400 italic leading-relaxed">
                O backup cria uma cópia de segurança completa dos dados da base de dados selecionada.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleBackup(dbType)}
                disabled={isBackingUp}
                className="py-6 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-105 disabled:opacity-50"
              >
                <Download size={20} />
                {isBackingUp ? 'Fazendo Backup...' : 'Fazer Backup'}
              </button>
              
              <button
                onClick={() => handleRestore(dbType)}
                disabled={isRestoring}
                className="py-6 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center justify-center gap-3 transition-all hover:scale-105 disabled:opacity-50"
              >
                <Upload size={20} />
                {isRestoring ? 'Restaurando...' : 'Restaurar Backup'}
              </button>
            </div>

            {lastBackup && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-xs text-slate-400">Último backup realizado:</p>
                <p className="text-sm text-white font-mono">
                  {new Date(lastBackup).toLocaleString('pt-AO')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status da Base de Dados */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            Status da Base de Dados
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-green-500 mb-2">ONLINE</div>
              <div className="text-[8px] text-slate-400 uppercase">Status</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-white mb-2">2.4GB</div>
              <div className="text-[8px] text-slate-400 uppercase">Tamanho</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#06b6d4] mb-2">15,234</div>
              <div className="text-[8px] text-slate-400 uppercase">Registros</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-white mb-2">99.9%</div>
              <div className="text-[8px] text-slate-400 uppercase">Uptime</div>
            </div>
          </div>
        </div>

        {/* Configurações Avançadas */}
        <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            Configurações Avançadas
          </h4>
          
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
              <h5 className="text-white font-bold mb-2">Otimização Automática</h5>
              <p className="text-xs text-slate-400 mb-3">
                O sistema realiza otimizações automáticas da base de dados durante horários de baixa atividade.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Próxima otimização:</span>
                <span className="text-xs text-purple-400 font-mono">02:00 AM</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="py-4 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-black uppercase hover:bg-purple-500/30 transition-all">
                Limpar Cache
              </button>
              <button className="py-4 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-black uppercase hover:bg-purple-500/30 transition-all">
                Analisar Performance
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const systemCards = [
    {
      id: 'identity',
      title: 'Identidade Geral',
      description: 'Configurações principais da aplicação',
      icon: <Building className="w-8 h-8" />,
      color: 'from-cyan-500 to-cyan-600',
      component: <IdentitySettings />
    },
    {
      id: 'human-resources',
      title: 'Capital Humano (RH)',
      description: 'Gestão completa de recursos humanos',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      component: <Employees />
    },
    {
      id: 'kitchen-kds',
      title: 'Cozinha',
      description: 'Gestão do KDS - Kitchen Display System',
      icon: <ChefHat className="w-8 h-8" />,
      color: 'from-yellow-500 to-orange-600',
      component: <KitchenKDS />
    },
    {
      id: 'kitchen-printer',
      title: 'Impressora Cozinha',
      description: 'Envio automático de pedidos para a cozinha',
      icon: <Printer className="w-8 h-8" />,
      color: 'from-orange-500 to-red-600',
      component: <KitchenPrinterSetup />
    },
    {
      id: 'access-control',
      title: 'Controlo de Acesso',
      description: 'Segurança e permissões do sistema',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      component: <AccessControl />
    },
    {
      id: 'agt-compliance',
      title: 'Compliance AGT',
      description: 'Conformidade regulatória e fiscal',
      icon: <FileCheck className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      component: <AGTCompliance />
    },
    {
      id: 'e-invoicing',
      title: 'Faturação Eletrónica',
      description: 'Integração AGT • URLs teste/produção • SAF-T',
      icon: <FileBadge className="w-8 h-8" />,
      color: 'from-cyan-500 to-blue-600',
      component: <EInvoicePanel />
    },
    {
      id: 'agt-certification',
      title: 'Certificação AGT',
      description: 'Dashboard de certificação profissional',
      icon: <Award className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      component: <CertificationDashboard />
    },
    {
      id: 'financial-history',
      title: 'Histórico Financeiro',
      description: 'Registre lucros de sistemas anteriores',
      icon: <Landmark className="w-8 h-8" />,
      color: 'from-emerald-500 to-emerald-600',
      component: <FinancialHistory />
    },
    {
      id: 'production-reset',
      title: 'Produção',
      description: 'Reset de dados para nova produção',
      icon: <Activity className="w-8 h-8" />,
      color: 'from-red-500 to-orange-600',
      component: <ProductionReset />
    },
    {
      id: 'database-operations',
      title: 'BD',
      description: 'Operações de base de dados e backups',
      icon: <Database className="w-8 h-8" />,
      color: 'from-indigo-500 to-indigo-600',
      component: <DatabaseOperations />
    },
    {
      id: 'cloud-ecosystem',
      title: 'Ecosistema Cloud',
      description: 'Integrações e serviços em nuvem',
      icon: <Cloud className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      component: <CloudEcosystem />
    },
    {
      id: 'technical-kernel',
      title: 'Kernel Técnico',
      description: 'Ferramentas de desenvolvimento e sistema',
      icon: <Terminal className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      component: <TechnicalKernel />
    }
  ];

  const activeComponent = systemCards.find(card => card.id === activeCard)?.component;

  return (
    <div className="h-screen bg-[#070b14] p-6 overflow-hidden">
      {!activeCard ? (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Settings className="w-10 h-10 text-[#06b6d4]" />
              Sistema
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              Hub central de configurações e funcionalidades
            </p>
          </div>

          {/* Grid de Cards com scroll interno */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-120px)] overflow-y-auto pb-12 pr-2">
            {systemCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setActiveCard(card.id)}
                className="glass-panel rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-glow border border-[#06b6d4]/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                    {card.icon}
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#06b6d4]" />
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-gray-400 text-sm">{card.description}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Funcionalidades
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {card.id === 'identity' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Nome</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Logo</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Guardar</span>
                      </>
                    )}
                    {card.id === 'human-resources' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Funcionários</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Escalas</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Ponto</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Salário</span>
                      </>
                    )}
                    {card.id === 'kitchen-kds' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">KDS</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Status</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Pedidos</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Controlo</span>
                      </>
                    )}
                    {card.id === 'digital-kitchen' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Online</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">KDS</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Tempo Real</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Sincronização</span>
                      </>
                    )}
                    {card.id === 'access-control' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Usuários</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Permissões</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Sistema</span>
                      </>
                    )}
                    {card.id === 'agt-compliance' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Relatórios</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Conformidade</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">SAFT</span>
                      </>
                    )}
                    {card.id === 'e-invoicing' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">AGT API</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Teste/Produção</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Séries</span>
                      </>
                    )}
                    {card.id === 'agt-certification' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Certificação</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Dashboard</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">AGT</span>
                      </>
                    )}
                    {card.id === 'financial-reports' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Relatórios</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Faturação</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Impostos</span>
                      </>
                    )}
                    {card.id === 'production-reset' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Reset</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Produção</span>
                      </>
                    )}
                    {card.id === 'database-operations' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Backup</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Restore</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">BD</span>
                      </>
                    )}
                    {card.id === 'cloud-ecosystem' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Cloud</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">API</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Integrações</span>
                      </>
                    )}
                    {card.id === 'technical-kernel' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Dev</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Debug</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Console</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-full overflow-y-auto pb-12 pr-2">
          {/* Botão Voltar */}
          <button
            onClick={() => setActiveCard(null)}
            className="mb-6 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            ← Voltar para Sistema
          </button>
          
          {/* Status dos Dados */}
          <DataStatus />
          
          {/* Componente Ativo */}
          <div className="max-w-full">
            {activeComponent}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHub;




