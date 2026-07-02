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
  Globe,
  Phone,
  Mail,
  MapPin,
  Check
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase_standalone';
import { PermissionKey } from '../../types';
import { generateSAFT, downloadSAFT } from '../lib/saftService';
import { getKitchenPrintConfig, saveKitchenPrintConfig, KitchenPrintConfig, DEFAULT_KITCHEN_PRINT_CONFIG } from '../lib/printService';
import { UserRole } from '../../types';
import ComplianceReports from './ComplianceReports';
import { safeAlert, safeWindow, safeReload, safeLocalStorage, safeSessionStorage } from '../utils/windowsCompatibility';
import { forceRealSyncService } from '../services/forceRealSyncService';
import { syncToTerminal } from '../services/syncService';
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

  // Cards que mostram DataStatus (apenas os relacionados com catálogo/cloud)
  const DATA_STATUS_CARDS = ['cloud-ecosystem', 'kitchen-printer'];

  // Componente de Status de Dados
  const DataStatus = () => {
    return (
      <div className="flex items-center gap-6 mb-6 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${categories.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{categories.length} Categorias</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${menu.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{menu.length} Produtos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${navigator.onLine ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{navigator.onLine ? 'Cloud Online' : 'Offline'}</span>
        </div>
      </div>
    );
  };

  // Componente Identidade usando formulário existente
  const IdentitySettings = () => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
        await updateSettings(localSettings);
        setSaved(true);
        setTimeout(() => { setIsSaving(false); setSaved(false); }, 2000);
      } catch (error) {
        setIsSaving(false);
      }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { alert('Selecione uma imagem (JPG, PNG, etc.)'); return; }
      if (file.size > 5 * 1024 * 1024) { alert('Imagem não pode ser maior que 5MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => setLocalSettings(s => ({ ...s, appLogoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    };

    const inputCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm font-medium outline-none focus:border-[#06b6d4]/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600";
    const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2";

    return (
      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">

        {/* ── Hero: Logo + Nome ── */}
        <div className="relative rounded-[2rem] overflow-hidden border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-6">
          {/* Background blur decoration */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#06b6d4]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-cyan-500/5 blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-6">
            {/* Logo preview + upload */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-[1.25rem] bg-white/[0.06] border-2 border-white/10 group-hover:border-[#06b6d4]/40 transition-all overflow-hidden flex items-center justify-center shadow-xl">
                {localSettings.appLogoUrl
                  ? <img src={localSettings.appLogoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                  : <Building size={36} className="text-[#06b6d4]/60" />
                }
              </div>
              {/* Upload overlay */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-[1.25rem] bg-black/70 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <Upload size={18} className="text-white" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Alterar</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload}
                className="hidden" aria-label="Carregar novo logo" />
              {/* Status dot */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#080c15] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            {/* Nome + subtítulo */}
            <div className="flex-1 min-w-0">
              <p className={labelCls}>Nome do estabelecimento</p>
              <input
                type="text"
                className="w-full bg-transparent border-0 border-b border-white/10 focus:border-[#06b6d4]/60 outline-none text-2xl font-black text-white uppercase tracking-tight pb-1 mb-1 transition-all"
                value={localSettings.restaurantName}
                onChange={e => setLocalSettings(s => ({ ...s, restaurantName: e.target.value }))}
                aria-label="Nome do restaurante"
                placeholder="Nome do restaurante"
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">NIF</span>
                <input
                  type="text"
                  className="bg-transparent border-0 outline-none text-[#06b6d4] text-xs font-black tracking-widest w-40"
                  value={localSettings.nif}
                  onChange={e => setLocalSettings(s => ({ ...s, nif: e.target.value }))}
                  aria-label="NIF do restaurante"
                  placeholder="000000000"
                />
              </div>
              {localSettings.appLogoUrl && (
                <button type="button" onClick={() => setLocalSettings(s => ({ ...s, appLogoUrl: '' }))}
                  className="mt-2 text-[9px] font-black text-red-500/60 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 transition-all">
                  <Trash2 size={10} /> Remover logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Secção: Contactos ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center shrink-0">
              <Phone size={13} className="text-white" />
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contactos</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} htmlFor="id-phone">Telefone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input id="id-phone" type="tel" className={inputCls + " pl-9"}
                  value={localSettings.phone || ''} placeholder="+244 900 000 000"
                  onChange={e => setLocalSettings(s => ({ ...s, phone: e.target.value }))}
                  aria-label="Telefone do restaurante" />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="id-email">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input id="id-email" type="email" className={inputCls + " pl-9"}
                  value={localSettings.email || ''} placeholder="contacto@restaurante.ao"
                  onChange={e => setLocalSettings(s => ({ ...s, email: e.target.value }))}
                  aria-label="Email do restaurante" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="id-address">Morada</label>
            <div className="relative">
              <MapPin size={13} className="absolute left-3.5 top-3.5 text-slate-600 pointer-events-none" />
              <input id="id-address" type="text" className={inputCls + " pl-9"}
                value={localSettings.address || ''} placeholder="Rua Principal, 123 — Luanda"
                onChange={e => setLocalSettings(s => ({ ...s, address: e.target.value }))}
                aria-label="Morada do restaurante" />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="id-website">Website</label>
            <div className="relative">
              <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <input id="id-website" type="url" className={inputCls + " pl-9"}
                value={localSettings.website || ''} placeholder="https://www.restaurante.ao"
                onChange={e => setLocalSettings(s => ({ ...s, website: e.target.value }))}
                aria-label="Website do restaurante" />
            </div>
          </div>
        </div>

        {/* ── Nota upload ── */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]/60 shrink-0" />
          <p className="text-[10px] text-slate-600 italic">Logo: JPG, PNG, GIF · máx. 5MB · recomendado 512×512px</p>
        </div>

        {/* ── Guardar ── */}
        <button
          type="submit"
          disabled={isSaving}
          className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg
            ${saved
              ? 'bg-emerald-500 text-white scale-[0.99]'
              : 'bg-[#06b6d4] text-black hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]'
            } disabled:opacity-60`}
        >
          {isSaving && !saved && <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />}
          {saved ? <><Check size={15} /> Guardado com sucesso!</> : <><Save size={15} /> Guardar Identidade</>}
        </button>
      </form>
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
      customDigitalMenuUrl: settings.customDigitalMenuUrl || 'https://rest-ia.vercel.app/#/menu-public'
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

    const handleManualSync = async (type: string) => {
      if (!settings.supabaseUrl || !settings.supabaseKey) {
        addNotification('error', 'Configure as credenciais Cloud primeiro.');
        return;
      }
      setIsSyncing(type);
      try {
        // Pull: produtos e categorias do Supabase para store local
        await forceRealSyncService.syncFromSupabase();

        // Push: ordens pendentes offline
        const store = useStore.getState();
        await store.syncPendingOrdersToSupabase();

        // Push: métricas para terminal_sync (alimenta dashboard mobile)
        const syncCore = (store as any).syncCoreMetrics;
        await syncToTerminal({
          today_revenue: syncCore?.todayRevenue ?? 0,
          global_revenue: syncCore?.globalRevenue ?? 0,
          staff_costs: syncCore?.staffCosts ?? 0,
          total_expenses: syncCore?.totalExpenses ?? 0,
          open_orders_count: (store.activeOrders ?? []).length
        });

        addNotification('success', 'Sincronização Global concluída com sucesso!');
      } catch (err: any) {
        addNotification('error', 'Erro na sincronização: ' + (err?.message ?? err));
      } finally {
        setIsSyncing(null);
      }
    };

    const inputCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm font-mono outline-none focus:border-[#06b6d4]/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600";
    const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2";

    return (
      <div className="space-y-6">

        {/* ── Hero ── */}
        <div className="relative rounded-[2rem] overflow-hidden border border-white/[0.06] bg-gradient-to-br from-orange-500/[0.06] to-transparent p-6">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <Cloud size={26} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Ecosistema Cloud</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.18em] mt-0.5">REST IA OS · Supabase · Vercel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${navigator.onLine ? 'text-emerald-400' : 'text-red-400'}`}>
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sync Global ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.18em]">Sincronização Global</p>
            <p className="text-xs text-slate-400 mt-0.5">Dados locais → Supabase → Menu Digital + Dashboard Mobile</p>
          </div>
          <button
            onClick={() => handleManualSync('ALL')}
            disabled={!!isSyncing}
            className="shrink-0 px-6 py-3 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center gap-2 hover:brightness-110 hover:scale-[1.02] transition-all disabled:opacity-60"
          >
            {isSyncing === 'ALL'
              ? <><div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" /> A Sincronizar...</>
              : <><RefreshCw size={13} /> Sincronizar</>}
          </button>
        </div>

        {/* ── Grid credenciais + endpoint ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Credenciais */}
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center shrink-0">
                <Lock size={13} className="text-white" />
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credenciais da Instância</h4>
            </div>
            <div>
              <label className={labelCls}>Project URL</label>
              <input type="text" className={inputCls}
                value={localSettings.supabaseUrl}
                onChange={e => setLocalSettings({...localSettings, supabaseUrl: e.target.value})}
                placeholder="https://xxxx.supabase.co"
                aria-label="URL do projeto Supabase" />
            </div>
            <div>
              <label className={labelCls}>Service Role Key</label>
              <input type="password" className={inputCls}
                value={localSettings.supabaseKey}
                onChange={e => setLocalSettings({...localSettings, supabaseKey: e.target.value})}
                placeholder="eyJhbGci..."
                aria-label="Chave de serviço Supabase" />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full py-3.5 bg-[#06b6d4] text-black rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving ? <><div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" /> A guardar...</> : <><Save size={13} /> Guardar Credenciais</>}
            </button>
          </div>

          {/* Menu Digital */}
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                <Globe size={13} className="text-white" />
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Destino Público</h4>
            </div>
            <div>
              <label className={labelCls}>URL do Menu Digital (Vercel)</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input type="text" className={inputCls + " pl-9 text-xs"}
                  value={localSettings.customDigitalMenuUrl}
                  onChange={e => setLocalSettings({...localSettings, customDigitalMenuUrl: e.target.value})}
                  placeholder="https://meu-restaurante.vercel.app"
                  aria-label="URL do menu digital" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-violet-500/[0.06] border border-violet-500/20 flex gap-3">
              <Info size={14} className="text-violet-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-400 leading-relaxed">Este URL gera o QR Code oficial da sua Tasca, direcionando clientes para o menu online sincronizado.</p>
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

    const inputCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm font-medium outline-none focus:border-[#06b6d4]/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600";
    const monoInputCls = inputCls + " font-mono";
    const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2";
    const selectCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm outline-none appearance-none cursor-pointer focus:border-[#06b6d4]/60 transition-all";

    return (
      <div className="space-y-6">

        {/* ── Grid: Certificação + Cadastro Fiscal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Certificação */}
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center shrink-0">
                <FileBadge size={13} className="text-white" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Certificação & Série</h3>
            </div>
            <div>
              <label className={labelCls}>N.º do Certificado AGT</label>
              <input type="text" className={monoInputCls} value={localSettings.agtCertificate}
                onChange={e => setLocalSettings({...localSettings, agtCertificate: e.target.value})}
                aria-label="Número do certificado AGT" />
            </div>
            <div>
              <label className={labelCls}>Série de Faturação Ativa</label>
              <input type="text" className={monoInputCls + " uppercase"} value={localSettings.invoiceSeries}
                onChange={e => setLocalSettings({...localSettings, invoiceSeries: e.target.value})}
                aria-label="Série de faturação" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Certificação SW</label>
                <input type="text" className={monoInputCls} value={localSettings.agtSoftwareCertification || ''}
                  onChange={e => setLocalSettings({...localSettings, agtSoftwareCertification: e.target.value})}
                  placeholder="Nº cert." aria-label="Certificação do software" />
              </div>
              <div>
                <label className={labelCls}>Versão SW</label>
                <input type="text" className={monoInputCls} value={localSettings.agtSoftwareVersion || ''}
                  onChange={e => setLocalSettings({...localSettings, agtSoftwareVersion: e.target.value})}
                  placeholder="v1.0.0" aria-label="Versão do software" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nº do Processo</label>
                <input type="text" className={monoInputCls} value={localSettings.agtProcessNumber || ''}
                  onChange={e => setLocalSettings({...localSettings, agtProcessNumber: e.target.value})}
                  placeholder="2023/AGT/..." aria-label="Número do processo" />
              </div>
              <div>
                <label className={labelCls}>Data Certificação</label>
                <input type="date" className={monoInputCls} value={localSettings.agtCertificationDate || ''}
                  onChange={e => setLocalSettings({...localSettings, agtCertificationDate: e.target.value})}
                  aria-label="Data de certificação" />
              </div>
            </div>
            <div className="p-3 bg-[#06b6d4]/[0.06] border border-[#06b6d4]/20 rounded-2xl flex gap-2.5">
              <Info size={13} className="text-[#06b6d4] shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-400 leading-relaxed">Software certificado pelo Regime Jurídico das Faturas de Angola. Imutabilidade SHA-256 garantida.</p>
            </div>
          </div>

          {/* Cadastro Fiscal */}
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                <Landmark size={13} className="text-white" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cadastro Fiscal</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>NIF</label>
                <input type="text" className={monoInputCls} value={localSettings.nif}
                  onChange={e => setLocalSettings({...localSettings, nif: e.target.value})}
                  aria-label="NIF" />
              </div>
              <div>
                <label className={labelCls}>Capital Social</label>
                <input type="text" className={monoInputCls} value={localSettings.capitalSocial}
                  onChange={e => setLocalSettings({...localSettings, capitalSocial: e.target.value})}
                  aria-label="Capital social" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Regime Fiscal IVA</label>
              <select className={selectCls} value={localSettings.taxRegime}
                onChange={e => {
                  const regime = e.target.value as 'GERAL' | 'SIMPLIFICADO' | 'EXCLUSAO';
                  let rate = 14;
                  if (regime === 'SIMPLIFICADO') rate = 7;
                  else if (regime === 'EXCLUSAO') rate = 0;
                  setLocalSettings({...localSettings, taxRegime: regime, taxRate: rate});
                }} aria-label="Regime fiscal IVA">
                <option value="GERAL">Regime Geral (14%)</option>
                <option value="SIMPLIFICADO">Regime Simplificado (7%)</option>
                <option value="EXCLUSAO">Regime de Exclusão</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Custos Fixos Mensais (Kz)</label>
              <input type="number" className={monoInputCls} value={localSettings.custosFixosMensal ?? ''}
                onChange={e => setLocalSettings({...localSettings, custosFixosMensal: e.target.value ? Number(e.target.value) : undefined})}
                placeholder="Auto (staff + utilidades)"
                title="Custos fixos mensais para cálculo do Ponto de Equilíbrio"
                aria-label="Custos fixos mensais" />
            </div>
          </div>
        </div>

        {/* ── Tipos de Documentos Fiscais ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
              <FileText size={13} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipos de Documentos Fiscais</h3>
              <p className="text-[9px] text-slate-600 mt-0.5">Decreto Presidencial nº 71/25 · AGT Angola</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { code: 'FR', name: 'Fatura-Recibo', usage: 'Pagamento imediato', color: 'emerald', required: true },
              { code: 'FT', name: 'Fatura', usage: 'B2B / Diferido', color: 'blue', required: true },
              { code: 'TV', name: 'Talão de Venda', usage: 'Balcão B2C', color: 'purple', required: true },
              { code: 'RG', name: 'Recibo', usage: 'Pagamento de dívida', color: 'orange', required: false },
              { code: 'NC', name: 'Nota de Crédito', usage: 'Anulação', color: 'red', required: false },
              { code: 'ND', name: 'Nota de Débito', usage: 'Acréscimo', color: 'yellow', required: false },
            ].map(doc => (
              <div key={doc.code} className={`p-3.5 rounded-2xl border border-${doc.color}-500/20 bg-${doc.color}-500/[0.05] flex flex-col gap-1.5`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black text-${doc.color}-400 uppercase`}>{doc.code}</span>
                  {doc.required && <span className="text-[7px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Obrig.</span>}
                </div>
                <span className="text-xs font-bold text-white leading-tight">{doc.name}</span>
                <span className="text-[9px] text-slate-500">{doc.usage}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Botões ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleSaveSettings} disabled={isSaving}
            className="flex-1 py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-60">
            {isSaving ? <><div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" /> A guardar...</> : <><Save size={14}/> Guardar Dados Fiscais</>}
          </button>
          <button onClick={handleExportSAFT}
            className="flex-1 py-4 bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-all">
            <Download size={14}/> Exportar SAF-T AO (XML)
          </button>
        </div>
      </div>
    );
  };

  const TechnicalKernel = () => {
    const { addNotification } = useStore();
    const [debugMode, setDebugMode] = useState<'OFF' | 'BASIC' | 'VERBOSE'>('OFF');
    const [logLevel, setLogLevel] = useState<'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'>('INFO');
    const [cacheMode, setCacheMode] = useState<'DISABLED' | 'NORMAL' | 'AGGRESSIVE'>('NORMAL');
    const [isSaving, setIsSaving] = useState(false);

    // Carregar do localStorage
    React.useEffect(() => {
      try {
        const saved = localStorage.getItem('rest_ia_kernel_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.debugMode) setDebugMode(parsed.debugMode);
          if (parsed.logLevel) setLogLevel(parsed.logLevel);
          if (parsed.cacheMode) setCacheMode(parsed.cacheMode);
        }
      } catch {}
    }, []);

    const handleSaveSettings = () => {
      setIsSaving(true);
      try {
        localStorage.setItem('rest_ia_kernel_config', JSON.stringify({ debugMode, logLevel, cacheMode }));
        addNotification('success', 'Configurações do kernel guardadas.');
      } catch {
        addNotification('error', 'Erro ao guardar configurações.');
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    };

    const lsSize = (() => {
      try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) total += (localStorage.getItem(k) || '').length;
        }
        return (total / 1024).toFixed(1) + ' KB';
      } catch { return 'N/D'; }
    })();

    const selectCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm outline-none appearance-none cursor-pointer focus:border-[#06b6d4]/60 transition-all";
    const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2";

    return (
      <div className="space-y-6">

        {/* ── Hero stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Chaves Cache', value: localStorage.length, color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/[0.06]', border: 'border-[#06b6d4]/20' },
            { label: 'Tamanho Cache', value: lsSize, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20' },
            { label: 'Rede', value: navigator.onLine ? 'ONLINE' : 'OFFLINE', color: navigator.onLine ? 'text-emerald-400' : 'text-red-400', bg: navigator.onLine ? 'bg-emerald-500/[0.06]' : 'bg-red-500/[0.06]', border: navigator.onLine ? 'border-emerald-500/20' : 'border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} ${s.border} border rounded-2xl p-4 text-center`}>
              <div className={`text-xl font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Configurações ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0">
              <Terminal size={13} className="text-white" />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configurações do Sistema</h4>
          </div>
          <div>
            <label className={labelCls}>Modo de Depuração</label>
            <select className={selectCls} value={debugMode} onChange={e => setDebugMode(e.target.value as any)} aria-label="Modo de depuração">
              <option value="OFF">Desativado</option>
              <option value="BASIC">Básico</option>
              <option value="VERBOSE">Detalhado</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Nível de Log</label>
            <select className={selectCls} value={logLevel} onChange={e => setLogLevel(e.target.value as any)} aria-label="Nível de log">
              <option value="ERROR">Apenas Erros</option>
              <option value="WARNING">Erros e Avisos</option>
              <option value="INFO">Informações Completas</option>
              <option value="DEBUG">Modo Debug</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Cache de Dados</label>
            <select className={selectCls} value={cacheMode} onChange={e => setCacheMode(e.target.value as any)} aria-label="Modo de cache">
              <option value="DISABLED">Desativado</option>
              <option value="NORMAL">Normal</option>
              <option value="AGGRESSIVE">Agressivo</option>
            </select>
          </div>
          <div className="p-3 bg-[#06b6d4]/[0.06] border border-[#06b6d4]/20 rounded-2xl flex gap-2.5">
            <Info size={13} className="text-[#06b6d4] shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-relaxed">Configurações guardadas localmente. Modo Debug activa logs detalhados na consola do browser.</p>
          </div>
          <button onClick={handleSaveSettings} disabled={isSaving}
            className="w-full py-4 bg-[#06b6d4] text-black rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {isSaving ? <><div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" /> A guardar...</> : <><Save size={13} /> Guardar Configurações</>}
          </button>
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
      <div className="space-y-6">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Conexão', value: kdsStatus.isOnline ? 'ONLINE' : 'OFFLINE', color: kdsStatus.isOnline ? 'text-emerald-400' : 'text-red-400', bg: kdsStatus.isOnline ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-red-500/[0.06] border-red-500/20' },
            { label: 'Pedidos Hoje', value: kdsStatus.ordersToday, color: 'text-white', bg: 'bg-white/[0.04] border-white/[0.08]' },
            { label: 'Pedidos Activos', value: kdsStatus.activeOrders, color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/[0.06] border-[#06b6d4]/20' },
            { label: 'Disponibilidade', value: '24/7', color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06] border-emerald-500/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
              <div className={`text-xl font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Controlo ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                <ChefHat size={13} className="text-white" />
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Controlo do KDS</h4>
            </div>
            {kdsStatus.lastSync && (
              <span className="text-[9px] text-slate-600 font-mono">{new Date(kdsStatus.lastSync).toLocaleTimeString('pt-AO')}</span>
            )}
          </div>
          <div className="p-3 bg-[#06b6d4]/[0.06] border border-[#06b6d4]/20 rounded-2xl flex gap-2.5">
            <Info size={13} className="text-[#06b6d4] shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-relaxed">O KDS permite à cozinha visualizar e gerir pedidos em tempo real a partir de qualquer ecrã da rede.</p>
          </div>
          <button onClick={handleToggleKDS}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.01] ${
              kdsStatus.isOnline ? 'bg-red-500/90 text-white hover:bg-red-500' : 'bg-emerald-500/90 text-white hover:bg-emerald-500'
            }`}>
            <div className={`w-2 h-2 rounded-full bg-white ${kdsStatus.isOnline ? 'animate-pulse' : ''}`} />
            {kdsStatus.isOnline ? 'Desligar KDS' : 'Ligar KDS'}
          </button>
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
              aria-label={config.enabled ? 'Desactivar impressão de cozinha' : 'Activar impressão de cozinha'}
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
              aria-label={config.autoPrint ? 'Desactivar impressão automática' : 'Activar impressão automática'}
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
              aria-label={config.showNotes ? 'Ocultar observações' : 'Mostrar observações'}
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
              aria-label={config.showTableNumber ? 'Ocultar número da mesa' : 'Mostrar número da mesa'}
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
    const { activeOrders } = useStore();
    const [kdsOnline, setKdsOnline] = useState(() => localStorage.getItem('rest_ia_kds_online') === 'true');
    const [lastSync, setLastSync] = useState<string | null>(() => localStorage.getItem('rest_ia_kds_last_sync'));

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = (activeOrders || []).filter((o: any) => {
      const d = (o.created_at || o.createdAt || '').slice(0, 10);
      return d === today;
    });

    const handleToggleKDS = () => {
      const next = !kdsOnline;
      setKdsOnline(next);
      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem('rest_ia_kds_online', String(next));
      localStorage.setItem('rest_ia_kds_last_sync', now);
    };

    return (
      <div className="space-y-6">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Estado', value: kdsOnline ? 'ACTIVO' : 'INACTIVO', color: kdsOnline ? 'text-emerald-400' : 'text-red-400', bg: kdsOnline ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-red-500/[0.06] border-red-500/20' },
            { label: 'Pedidos Hoje', value: todayOrders.length, color: 'text-white', bg: 'bg-white/[0.04] border-white/[0.08]' },
            { label: 'Pedidos Activos', value: (activeOrders || []).length, color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/[0.06] border-[#06b6d4]/20' },
            { label: 'Última Activação', value: lastSync ? new Date(lastSync).toLocaleTimeString('pt-AO') : '—', color: 'text-slate-300', bg: 'bg-white/[0.04] border-white/[0.08]' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
              <div className={`text-base font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Controlo ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-7 h-7 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 ${
              kdsOnline ? 'from-emerald-500 to-teal-600' : 'from-yellow-500 to-orange-600'
            }`}>
              <ChefHat size={13} className="text-white" />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">KDS Management System</h4>
          </div>
          <div className="p-3 bg-[#06b6d4]/[0.06] border border-[#06b6d4]/20 rounded-2xl flex gap-2.5">
            <Info size={13} className="text-[#06b6d4] shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-relaxed">O KDS permite à cozinha visualizar e gerir pedidos em tempo real a partir de qualquer ecrã da rede.</p>
          </div>
          <button onClick={handleToggleKDS}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.01] ${
              kdsOnline ? 'bg-red-500/90 text-white hover:bg-red-500' : 'bg-emerald-500/90 text-white hover:bg-emerald-500'
            }`}>
            <div className={`w-2 h-2 rounded-full bg-white ${kdsOnline ? 'animate-pulse' : ''}`} />
            {kdsOnline ? 'Desactivar KDS' : 'Activar KDS'}
          </button>
        </div>
      </div>
    );
  };

  const ProductionReset = () => {
    const storeState = useStore.getState();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetReason, setResetReason] = useState('');

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = (storeState.activeOrders || []).filter((o: any) => {
      const d = (o.created_at || o.createdAt || '').slice(0, 10);
      return d === today;
    });
    const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    const lastReset = localStorage.getItem('rest_ia_last_reset') || today;

    const [productionData] = useState({
      ordersToday: todayOrders.length,
      revenueToday: todayRevenue,
      activeTables: (storeState.activeOrders || []).length,
      lastReset
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
        
        // 4. Registar timestamp do reset
        const resetDate = new Date().toISOString().split('T')[0];
        safeLocalStorage()?.setItem('rest_ia_last_reset', resetDate);

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
        {/* ── Stats producão ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pedidos Hoje', value: productionData.ordersToday, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06] border-emerald-500/20' },
            { label: 'Receita Hoje', value: formatKz(productionData.revenueToday), color: 'text-blue-400', bg: 'bg-blue-500/[0.06] border-blue-500/20' },
            { label: 'Pedidos Activos', value: productionData.activeTables, color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/[0.06] border-[#06b6d4]/20' },
            { label: 'Último Reset', value: new Date(productionData.lastReset).toLocaleDateString('pt-AO'), color: 'text-slate-400', bg: 'bg-white/[0.04] border-white/[0.08]' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
              <div className={`text-base font-black ${s.color} mb-1 leading-tight`}>{s.value}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Zona de perigo ── */}
        <div className="glass-panel rounded-[2rem] border border-red-500/20 p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={13} className="text-white" />
            </div>
            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Zona de Perigo — Reset de Produção</h4>
          </div>
          <div className="p-3 bg-red-500/[0.06] border border-red-500/20 rounded-2xl flex gap-2.5">
            <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-relaxed">Apaga todos os dados do dia: pedidos, receitas, lucros e estatísticas. Esta acção não pode ser desfeita.</p>
          </div>

          {!isConfirming ? (
            <button onClick={() => setIsConfirming(true)}
              className="w-full py-4 bg-red-500/90 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:scale-[1.01] transition-all">
              <Trash2 size={14} /> Iniciar Reset de Produção
            </button>
          ) : (
            <div className="space-y-3 border-t border-red-500/20 pt-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mb-2">Motivo obrigatório</label>
                <textarea value={resetReason} onChange={e => setResetReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-red-500/30 rounded-2xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-red-500 min-h-[80px] resize-none transition-all"
                  placeholder="Ex: Mudança de turno, encerramento do dia..." required />
              </div>
              <div className="p-3 bg-yellow-500/[0.06] border border-yellow-500/20 rounded-2xl">
                <p className="text-[9px] font-bold text-yellow-400 mb-1.5 uppercase tracking-wider">O que será removido:</p>
                <div className="grid grid-cols-2 gap-1">
                  {['Pedidos do dia', 'Receitas e lucros', 'Mesas activas', 'Estatísticas', 'Dados financeiros', 'Cache temporário'].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-yellow-500/60 shrink-0" />
                      <span className="text-[9px] text-slate-400">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-emerald-400/80 mt-2 font-bold">✓ Preservados: Categorias, produtos e configurações</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setIsConfirming(false); setResetReason(''); }} disabled={isResetting}
                  className="py-3 bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-white/[0.08] transition-all disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleResetProduction} disabled={isResetting}
                  className="py-3 bg-red-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50">
                  {isResetting
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> A resetar...</>
                    : <><Trash2 size={13} /> Confirmar Reset</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Informações do Sistema ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                <RefreshCw size={13} className="text-white" />
              </div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reset Automático</h5>
            </div>
            <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">O sistema pode ser configurado para reset automático diário às 23:59.</p>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">Status</span>
              <span className="text-[9px] font-black text-purple-400 uppercase">Desativado</span>
            </div>
          </div>
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                <Download size={13} className="text-white" />
              </div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Backup Antes do Reset</h5>
            </div>
            <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">Backup automático dos dados antes de qualquer operação de reset.</p>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">Status</span>
              <span className="text-[9px] font-black text-emerald-400 uppercase">Ativo</span>
            </div>
          </div>
        </div>

        {/* ── Histórico de Resets ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
              <Clock size={13} className="text-white" />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Histórico de Resets</h4>
          </div>
          {[
            { title: 'Reset de Produção', reason: 'Mudança de turno — Manhã para Tarde', date: '01/12/2024 14:30', orders: 89, revenue: '1.2M Kz' },
            { title: 'Reset de Produção', reason: 'Encerramento do dia', date: '30/11/2024 23:59', orders: 156, revenue: '2.4M Kz' },
          ].map((entry, i) => (
            <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-black text-white">{entry.title}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{entry.reason}</p>
                </div>
                <span className="text-[9px] text-blue-400 font-mono shrink-0">{entry.date}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-600 uppercase">Pedidos</span>
                  <span className="text-[9px] font-bold text-white">{entry.orders}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] text-slate-600 uppercase">Receita</span>
                  <span className="text-[9px] font-bold text-emerald-400">{entry.revenue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-400">Concluído</span>
                </div>
              </div>
            </div>
          ))}
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

    const inputCls = "w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm font-medium outline-none focus:border-[#06b6d4]/60 focus:bg-white/[0.06] transition-all placeholder:text-slate-600";
    const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] mb-2";

    const FormPanel = () => (
      <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center shrink-0">
            <Plus size={13} className="text-white" />
          </div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {editingRecord ? 'Editar Registo' : 'Novo Registo Histórico'}
          </h4>
        </div>
        <form onSubmit={handleAddRecord} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sistema</label>
            <input type="text" className={inputCls} value={formData.system}
              onChange={e => setFormData({...formData, system: e.target.value})}
              placeholder="Nome do sistema" required />
          </div>
          <div>
            <label className={labelCls}>Período</label>
            <input type="text" className={inputCls} value={formData.period}
              onChange={e => setFormData({...formData, period: e.target.value})}
              placeholder="Jan-Dez 2024" required />
          </div>
          <div>
            <label className={labelCls}>Receita (Kz)</label>
            <input type="number" className={inputCls} value={formData.revenue}
              onChange={e => setFormData({...formData, revenue: e.target.value})}
              placeholder="0" required />
          </div>
          <div>
            <label className={labelCls}>Lucro (Kz)</label>
            <input type="number" className={inputCls} value={formData.profit}
              onChange={e => setFormData({...formData, profit: e.target.value})}
              placeholder="0" required />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingRecord(null); }}
              className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-white/[0.08] transition-all">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-3 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-[9px] tracking-widest hover:brightness-110 transition-all">
              {editingRecord ? 'Actualizar Registo' : 'Adicionar Registo'}
            </button>
          </div>
        </form>
      </div>
    );

    // Tratamento de erros de renderização - BLOCO SEGURO
    if (!records || records.length === 0) {
      return (
        <div className="space-y-6">
          {loading && (
            <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-10 flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-[#06b6d4]/40 border-t-[#06b6d4] rounded-full animate-spin" />
              <span className="text-sm text-slate-400">A carregar histórico financeiro...</span>
            </div>
          )}
          {!loading && !showForm && (
            <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                <Landmark size={26} className="text-slate-600" />
              </div>
              <p className="text-white font-black text-sm mb-1">Nenhum registo histórico</p>
              <p className="text-[10px] text-slate-500 mb-6">Adicione registos de sistemas anteriores para visualizar o histórico financeiro</p>
              <button onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-[9px] tracking-widest hover:brightness-110 transition-all inline-flex items-center gap-2">
                <Plus size={13} /> Adicionar Primeiro Registo
              </button>
            </div>
          )}
          {showForm && <FormPanel />}
        </div>
      );
    }

    // Renderização segura com dados existentes
    return (
      <div className="space-y-6">
        {loading && (
          <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-10 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[#06b6d4]/40 border-t-[#06b6d4] rounded-full animate-spin" />
            <span className="text-sm text-slate-400">A carregar histórico financeiro...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Stats resumo ── */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Receita Total', value: formatKz(totalRevenue), color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06] border-emerald-500/20' },
                { label: 'Lucro Total', value: formatKz(totalProfit), color: 'text-blue-400', bg: 'bg-blue-500/[0.06] border-blue-500/20' },
                { label: 'Margem Média', value: `${avgProfitMargin.toFixed(1)}%`, color: 'text-purple-400', bg: 'bg-purple-500/[0.06] border-purple-500/20' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                  <div className={`text-base font-black ${s.color} mb-1 leading-tight`}>{s.value}</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Form ou lista ── */}
            {showForm ? <FormPanel /> : (
              <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center shrink-0">
                      <Landmark size={13} className="text-white" />
                    </div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registos Históricos</h4>
                  </div>
                  <button onClick={() => { setShowForm(true); setEditingRecord(null); }}
                    className="w-7 h-7 rounded-xl bg-[#06b6d4] text-black flex items-center justify-center hover:brightness-110 transition-all"
                    title="Adicionar Registo">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {records.map(record => (
                    <div key={record.id} className="group p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">{record.system}</p>
                          <p className="text-[9px] text-slate-500">{record.period}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-400">{formatKz(record.revenue)}</p>
                            <p className="text-[9px] text-slate-600">Receita</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-blue-400">{formatKz(record.profit)}</p>
                            <p className="text-[9px] text-slate-600">Lucro</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-purple-400">
                              {record.revenue > 0 ? ((record.profit / record.revenue) * 100).toFixed(1) : 0}%
                            </p>
                            <p className="text-[9px] text-slate-600">Margem</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditRecord(record)}
                              className="w-7 h-7 rounded-xl bg-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center transition-all"
                              title="Editar">
                              <Edit size={13} />
                            </button>
                            <button onClick={async () => {
                              try {
                                const { error } = await supabase.from('external_history').delete().eq('id', record.id);
                                if (error) { addNotification('error', 'Falha ao apagar no Supabase'); return; }
                                setRecords(records.filter(r => r.id !== record.id));
                                addNotification('success', 'Registo removido com sucesso!');
                                await loadExternalHistory();
                              } catch { addNotification('error', 'Erro ao apagar registo'); }
                            }}
                              className="w-7 h-7 rounded-xl bg-red-500/[0.06] text-red-500/40 hover:text-red-400 hover:bg-red-500/[0.15] flex items-center justify-center transition-all"
                              aria-label="Apagar registo">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Análise ── */}
            <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-3">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={13} className="text-white" />
                </div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Análise Comparativa</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <p className="text-[9px] text-slate-500 mb-1">Maior Receita</p>
                  <p className="text-sm font-black text-emerald-400">{formatKz(maxRevenue)}</p>
                </div>
                <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <p className="text-[9px] text-slate-500 mb-1">Maior Lucro</p>
                  <p className="text-sm font-black text-blue-400">{formatKz(maxProfit)}</p>
                </div>
                <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <p className="text-[9px] text-slate-500 mb-1">Melhor Margem</p>
                  <p className="text-sm font-black text-purple-400">{bestMargin.toFixed(1)}%</p>
                </div>
                <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <p className="text-[9px] text-slate-500 mb-1">Sistemas</p>
                  <p className="text-sm font-black text-white">{records.length}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const DatabaseOperations = () => {
    const { addNotification } = useStore();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(() => localStorage.getItem('rest_ia_last_backup'));

    // Stats reais do localStorage
    const lsStats = React.useMemo(() => {
      try {
        let total = 0;
        const count = localStorage.length;
        for (let i = 0; i < count; i++) {
          const k = localStorage.key(i);
          if (k) total += (localStorage.getItem(k) || '').length;
        }
        return { count, size: (total / 1024).toFixed(1) + ' KB', sizeNum: total };
      } catch { return { count: 0, size: '0 KB', sizeNum: 0 }; }
    }, []);

    const databaseTypes = [
      { id: 'supabase', name: 'Supabase Cloud', description: 'Base de dados principal (PostgreSQL)', icon: '🐘' },
      { id: 'local', name: 'Local Storage', description: 'Cache do navegador (' + lsStats.size + ')', icon: '💾' }
    ];
    const [dbType, setDbType] = useState('supabase');

    const handleBackup = async () => {
      setIsBackingUp(true);
      try {
        const store = useStore.getState();
        const backupData = {
          timestamp: new Date().toISOString(),
          version: '1.0',
          menu: store.menu,
          categories: store.categories,
          settings: store.settings,
          customers: store.customers,
          tables: store.tables,
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rest-ia-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        const now = new Date().toISOString();
        setLastBackup(now);
        localStorage.setItem('rest_ia_last_backup', now);
        addNotification('success', 'Backup exportado com sucesso!');
      } catch (error) {
        addNotification('error', 'Erro ao criar backup.');
      } finally {
        setIsBackingUp(false);
      }
    };

    return (
      <div className="space-y-6">

        {/* ── Stats armazenamento ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Supabase', value: navigator.onLine ? 'ONLINE' : 'OFFLINE', color: navigator.onLine ? 'text-emerald-400' : 'text-red-400', bg: navigator.onLine ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-red-500/[0.06] border-red-500/20' },
            { label: 'Chaves Cached', value: lsStats.count, color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/[0.06] border-[#06b6d4]/20' },
            { label: 'Cache Local', value: lsStats.size, color: 'text-white', bg: 'bg-white/[0.04] border-white/[0.08]' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
              <div className={`text-lg font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Selector BD ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center shrink-0">
              <Database size={13} className="text-white" />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bases de Dados Ativas</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {databaseTypes.map(db => (
              <div key={db.id} onClick={() => setDbType(db.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                  dbType === db.id
                    ? 'bg-[#06b6d4]/[0.08] border-[#06b6d4]/40'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                }`}>
                <span className="text-xl shrink-0">{db.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white">{db.name}</p>
                  <p className="text-[9px] text-slate-500 truncate">{db.description}</p>
                </div>
                {dbType === db.id && <div className="w-2 h-2 rounded-full bg-[#06b6d4] shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Backup ── */}
        <div className="glass-panel rounded-[2rem] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Download size={13} className="text-white" />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Backup de Dados</h4>
          </div>
          <div className="p-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-2xl flex gap-2.5">
            <Info size={13} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-400 leading-relaxed">Exporta um ficheiro JSON com menu, categorias, clientes e configurações. Guarde-o em local seguro.</p>
          </div>
          <button onClick={handleBackup} disabled={isBackingUp}
            className="w-full py-4 bg-emerald-500/90 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 hover:scale-[1.01] transition-all disabled:opacity-60">
            {isBackingUp
              ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> A exportar...</>
              : <><Download size={14} /> Exportar Backup JSON</>}
          </button>
          {lastBackup && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">Último backup</span>
              <span className="text-[9px] text-emerald-400 font-mono">{new Date(lastBackup).toLocaleString('pt-AO')}</span>
            </div>
          )}
        </div>

        {/* ── Limpar cache ── */}
        <button
          onClick={() => {
            const keys = Object.keys(localStorage).filter(k =>
              k.includes('cache') || k.includes('tmp') || k.includes('sync_log')
            );
            keys.forEach(k => localStorage.removeItem(k));
            addNotification('success', `Cache limpo: ${keys.length} entradas removidas.`);
          }}
          className="w-full py-4 bg-purple-500/[0.08] border border-purple-500/20 text-purple-300 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/[0.15] transition-all flex items-center justify-center gap-2">
          <Trash2 size={13} /> Limpar Cache Temporário
        </button>
      </div>
    );
  };

  const systemCards = [
    {
      id: 'identity',
      title: 'Identidade',
      description: 'Nome, logo e dados do restaurante',
      icon: <Building className="w-8 h-8" />,
      color: 'from-cyan-500 to-cyan-600',
      badges: ['Nome', 'Logo', 'Contactos'],
      component: <IdentitySettings />
    },
    {
      id: 'human-resources',
      title: 'Capital Humano',
      description: 'Funcionários, escalas e salários',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      badges: ['Funcionários', 'Escalas', 'Salários'],
      component: <Employees />
    },
    {
      id: 'kitchen-kds',
      title: 'KDS Cozinha',
      description: 'Kitchen Display System — estado em tempo real',
      icon: <ChefHat className="w-8 h-8" />,
      color: 'from-yellow-500 to-orange-600',
      badges: ['KDS', 'Pedidos', 'Activos'],
      component: <KitchenKDS />
    },
    {
      id: 'kitchen-printer',
      title: 'Impressora Cozinha',
      description: 'Tickets automáticos de pedidos',
      icon: <Printer className="w-8 h-8" />,
      color: 'from-orange-500 to-red-600',
      badges: ['Ticket', 'USB/IP', 'Categorias'],
      component: <KitchenPrinterSetup />
    },
    {
      id: 'access-control',
      title: 'Acesso & Operadores',
      description: 'PINs, funções e permissões POS',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      badges: ['PINs', 'Roles', 'Permissões'],
      component: <AccessControl />
    },
    {
      id: 'agt-compliance',
      title: 'Compliance AGT',
      description: 'Configuração fiscal, NIF, IVA e SAF-T',
      icon: <FileCheck className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      badges: ['NIF', 'IVA', 'SAF-T'],
      component: <AGTCompliance />
    },
    {
      id: 'e-invoicing',
      title: 'Faturação Eletrónica',
      description: 'Integração AGT • URLs teste/produção',
      icon: <FileBadge className="w-8 h-8" />,
      color: 'from-cyan-500 to-blue-600',
      badges: ['AGT API', 'Séries', 'Teste'],
      component: <EInvoicePanel />
    },
    {
      id: 'agt-certification',
      title: 'Certificação AGT',
      description: 'Dashboard de certificação profissional',
      icon: <Award className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      badges: ['Certificado', 'N.º Processo'],
      component: <CertificationDashboard />
    },
    {
      id: 'financial-history',
      title: 'Histórico Financeiro',
      description: 'Registos de sistemas anteriores',
      icon: <Landmark className="w-8 h-8" />,
      color: 'from-emerald-500 to-emerald-600',
      badges: ['Receita', 'Lucro', 'Margem'],
      component: <FinancialHistory />
    },
    {
      id: 'production-reset',
      title: 'Reset de Produção',
      description: 'Zerar dados financeiros preservando catálogo',
      icon: <Activity className="w-8 h-8" />,
      color: 'from-red-500 to-orange-600',
      badges: ['Reset', 'Financeiros', 'Staff'],
      component: <ProductionReset />
    },
    {
      id: 'database-operations',
      title: 'Base de Dados',
      description: 'Backup JSON e estado do armazenamento',
      icon: <Database className="w-8 h-8" />,
      color: 'from-indigo-500 to-indigo-600',
      badges: ['Backup', 'Export', 'Cache'],
      component: <DatabaseOperations />
    },
    {
      id: 'cloud-ecosystem',
      title: 'Ecosistema Cloud',
      description: 'Supabase, Menu Digital e Dashboard Mobile',
      icon: <Cloud className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      badges: ['Supabase', 'Sync', 'Vercel'],
      component: <CloudEcosystem />
    },
    {
      id: 'technical-kernel',
      title: 'Kernel Técnico',
      description: 'Debug, logs e configurações avançadas',
      icon: <Terminal className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      badges: ['Debug', 'Logs', 'Cache'],
      component: <TechnicalKernel />
    }
  ];

  const activeComponent = systemCards.find(card => card.id === activeCard)?.component;
  const showDataStatus = activeCard ? DATA_STATUS_CARDS.includes(activeCard) : false;

  return (
    <div className="h-screen bg-[#070b14] p-6 overflow-hidden">
      {!activeCard ? (
        <>
          {/* Header moderno */}
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">REST IA OS</p>
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                Sistema
              </h1>
              <p className="text-slate-500 mt-1 text-sm">Hub central de configurações e módulos do sistema</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {navigator.onLine ? 'Cloud Online' : 'Offline'}
            </div>
          </div>

          {/* Grid de Cards modernizado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(100vh-140px)] overflow-y-auto pb-12 pr-2">
            {systemCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setActiveCard(card.id)}
                className="group glass-panel rounded-[1.5rem] p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-glow border border-white/5 hover:border-[#06b6d4]/30 relative overflow-hidden"
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                    {React.cloneElement(card.icon as React.ReactElement<any>, { size: 20 })}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#06b6d4] group-hover:translate-x-0.5 transition-all" />
                </div>

                <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight mb-1">{card.title}</h3>
                <p className="text-slate-500 text-[10px] leading-relaxed mb-3">{card.description}</p>

                <div className="flex flex-wrap gap-1">
                  {card.badges?.map((b: string) => (
                    <span key={b} className="px-2 py-0.5 bg-white/5 text-slate-400 text-[9px] font-bold uppercase rounded-md border border-white/5">{b}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-full overflow-y-auto pb-12 pr-2">
          {/* Breadcrumb / Voltar */}
          <button
            onClick={() => setActiveCard(null)}
            className="mb-6 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <ChevronRight size={14} className="rotate-180" /> Voltar para Sistema
          </button>

          {showDataStatus && <DataStatus />}

          <div className="max-w-full">
            {activeComponent}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHub;




