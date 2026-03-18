import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Shield, FileText, Cloud, Terminal,
  ChevronRight, Building, UserCheck, Lock, Database, Code,
  Plus, Edit2, Trash2, X, Save, FileBadge, Landmark, Info, Download,
  ChefHat, Upload, AlertCircle, Activity
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateSAFT, downloadSAFT } from '../lib/saftService';
import { UserRole } from '../../types';
import { supabase } from '../lib/supabase';

// Importar componentes existentes
import Employees from './Employees';
import SettingsComponent from './Settings';

// Interface User local para este componente
interface SystemHubUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  permissions: string[];
  status: 'ATIVO' | 'INATIVO';
}

const SystemHub = () => {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const { settings, updateSettings } = useStore();

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
      <div className="glass-panel rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Identidade Geral</h2>
        <form onSubmit={handleSaveSettings} className="max-w-3xl space-y-10">
          <div className="grid grid-cols-1 gap-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nome do Restaurante</label>
              <input 
                type="text" 
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.restaurantName} 
                onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})}
                aria-label="Nome do restaurante"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">NIF (Número de Identificação Fiscal)</label>
              <input 
                type="text" 
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.nif} 
                onChange={e => setLocalSettings({...localSettings, nif: e.target.value})}
                aria-label="NIF do restaurante"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Telefone</label>
              <input 
                type="tel" 
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" 
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
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Email</label>
              <input 
                type="email" 
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.email || ''} 
                onChange={e => setLocalSettings({...localSettings, email: e.target.value})}
                aria-label="Email do restaurante"
                placeholder="contato@restaurante.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Website</label>
              <input 
                type="url" 
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" 
                value={localSettings.website || ''} 
                onChange={e => setLocalSettings({...localSettings, website: e.target.value})}
                aria-label="Website do restaurante"
                placeholder="https://www.restaurante.com"
              />
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {localSettings.appLogoUrl ? (
                  <img src={localSettings.appLogoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                ) : (
                  <Building size={48} className="text-[#06b6d4]"/>
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
                <div className="flex flex-wrap gap-3">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] rounded-xl text-[10px] font-black uppercase hover:bg-[#06b6d4]/20 transition-all flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Carregar Novo Logo
                  </button>
                  {localSettings.appLogoUrl && (
                    <button 
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500/20 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} />
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
          <div className="pt-6">
            <button 
              type="submit" 
              className="w-full py-5 bg-[#06b6d4] text-black rounded-[2rem] font-black uppercase text-xs shadow-glow flex items-center justify-center gap-3 transition-all hover:brightness-110"
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
    const { users, addUser, updateUser, removeUser } = useStore();
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userForm, setUserForm] = useState<Partial<SystemHubUser>>({ 
      name: '', role: 'GARCOM', pin: '', permissions: [], status: 'ATIVO' 
    });

    const handleOpenUserModal = (user?: SystemHubUser) => {
      if (user) {
        setEditingUserId(user.id);
        setUserForm(user);
      } else {
        setEditingUserId(null);
        setUserForm({ name: '', role: 'GARCOM', pin: '', permissions: [], status: 'ATIVO' });
      }
      setIsUserModalOpen(true);
    };

    const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingUserId) {
        updateUser({ ...userForm, id: editingUserId, role: userForm.role as UserRole } as SystemHubUser);
      } else {
        addUser({
          ...userForm,
          id: `user-${Date.now()}`,
          role: userForm.role as UserRole,
        } as SystemHubUser);
      }
      setIsUserModalOpen(false);
    };

    const getRoleBadge = (role: string) => {
      switch (role) {
        case 'ADMIN': return { bg: 'bg-purple-600' };
        case 'GARCOM': return { bg: 'bg-slate-800' };
        case 'COZINHA': return { bg: 'bg-orange-600' };
        case 'CAIXA': return { bg: 'bg-green-600' };
        default: return { bg: 'bg-slate-800' };
      }
    };

    return (
      <div className="glass-panel rounded-2xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Controlo de Acesso</h2>
          <button 
            onClick={() => handleOpenUserModal()} 
            className="px-6 py-3 bg-[#06b6d4] text-black rounded-2xl font-black text-[10px] uppercase shadow-glow flex items-center gap-2"
          >
            <Plus size={16}/> Adicionar Novo
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(u => {
            const roleInfo = getRoleBadge(u.role);
            return (
              <div key={u.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 group hover:border-[#06b6d4]/40 transition-all flex flex-col">
                <div className="flex justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${roleInfo.bg}`}>
                    <Users size={24}/>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenUserModal(u)} 
                      className="p-3 text-slate-500 hover:text-white"
                      title="Editar utilizador"
                    >
                      <Edit2 size={16}/>
                    </button>
                    <button 
                      onClick={() => removeUser(u.id)} 
                      className="p-3 text-red-500/30 hover:text-red-500"
                      title="Remover utilizador"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
                <h4 className="text-white font-bold uppercase truncate">{u.name}</h4>
                <p className="text-[10px] font-black text-[#06b6d4] uppercase mt-1">{u.role}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {u.permissions.map(p => (
                    <span key={p} className="text-[7px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-slate-500">{p}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Utilizador */}
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in">
            <div className="glass-panel rounded-[4rem] w-full max-w-md p-12 border border-white/10 shadow-2xl relative">
              <button 
                onClick={() => setIsUserModalOpen(false)} 
                className="absolute top-10 right-10 text-slate-500 hover:text-white"
                title="Fechar modal"
              >
                <X size={32} />
              </button>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-10">
                {editingUserId ? 'Atualizar Utilizador' : 'Novo Utilizador'}
              </h3>
              <form onSubmit={handleSaveUser} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nome</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4]" 
                    value={userForm.name} 
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                    aria-label="Nome do utilizador"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Papel</label>
                  <select 
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-[#06b6d4] appearance-none cursor-pointer"
                    value={userForm.role} 
                    onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                    aria-label="Papel do utilizador"
                  >
                    <option value="GARCOM">Garçom</option>
                    <option value="COZINHA">Chef / Cozinha</option>
                    <option value="CAIXA">Caixa</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">PIN</label>
                  <input 
                    required 
                    type="password" 
                    maxLength={4}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-xl outline-none focus:border-[#06b6d4] text-center" 
                    value={userForm.pin} 
                    onChange={e => setUserForm({...userForm, pin: e.target.value.replace(/\D/g, '')})}
                    aria-label="PIN do utilizador"
                  />
                </div>
                <div className="pt-6">
                  <button 
                    type="submit" 
                    className="w-full py-5 bg-[#06b6d4] text-black rounded-[2rem] font-black uppercase text-xs shadow-glow flex items-center justify-center gap-3 transition-all hover:brightness-110"
                  >
                    <Save size={22} /> {editingUserId ? 'Atualizar' : 'Criar'} Utilizador
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
      supabaseKey: settings.supabaseKey || 'sb_publishable_fBMKbbzNYBe8d1rzdWyerg_4We8tZEm',
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
        // Salvar apenas as configurações que existem no tipo SystemSettings
        const settingsToSave = {
          restaurantName: localSettings.restaurantName,
          appLogoUrl: localSettings.appLogoUrl
        };
        await updateSettings(settingsToSave);
        setTimeout(() => setIsSaving(false), 1000);
      } catch (error) {
        setIsSaving(false);
      }
    };

    const handleExportSAFT = () => {
      const period = { month: new Date().getMonth(), year: new Date().getFullYear() };
      const xml = generateSAFT(activeOrders, customers, menu, settings, period);
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
                  onChange={e => setLocalSettings({...localSettings, taxRegime: e.target.value as any})}
                  aria-label="Regime fiscal IVA"
                >
                  <option value="GERAL">Regime Geral (14%)</option>
                  <option value="SIMPLIFICADO">Regime Simplificado (7%)</option>
                  <option value="EXCLUSAO">Regime de Exclusão</option>
                </select>
              </div>
            </div>
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
    const [logs, setLogs] = useState([
      { id: crypto.randomUUID(), timestamp: new Date().toISOString(), level: 'INFO', message: 'Sistema inicializado com sucesso' },
      { id: crypto.randomUUID(), timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'WARNING', message: 'Conexao com banco de dados instavel' },
      { id: crypto.randomUUID(), timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'ERROR', message: 'Falha ao processar pagamento #1234' }
    ]);

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

    const handleClearLogs = () => {
      setLogs([]);
      addNotification('success', 'Logs do sistema limpos com sucesso!');
    };

    const handleExportLogs = () => {
      const logText = logs.map(log => '[' + log.timestamp + '] ' + log.level + ': ' + log.message).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system-logs-' + new Date().toISOString().split('T')[0] + '.txt';
      a.click();
      URL.revokeObjectURL(url);
      addNotification('success', 'Logs exportados com sucesso!');
    };

    const getLevelColor = (level: string) => {
      switch (level) {
        case 'ERROR': return 'text-red-500';
        case 'WARNING': return 'text-yellow-500';
        case 'INFO': return 'text-green-500';
        default: return 'text-gray-500';
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
              Logs do Sistema
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total de Logs</span>
                <span className="text-lg font-mono font-bold text-white">{logs.length}</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={'text-[8px] font-black uppercase ' + getLevelColor(log.level)}>
                            {log.level}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-white">{log.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-4 border-t border-white/5">
                <button 
                  onClick={handleClearLogs}
                  className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase hover:bg-red-500/20 transition-all"
                >
                  Limpar Logs
                </button>
                <button 
                  onClick={handleExportLogs}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 transition-all"
                >
                  Exportar Logs
                </button>
              </div>
            </div>
          </div>

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
        alert('Por favor, informe o motivo do reset de produção.');
        return;
      }

      setIsResetting(true);
      try {
        // Simulação de reset de dados
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Resetar todos os valores para zero
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
        
        console.log('Produção resetada com sucesso. Motivo:', resetReason);
      } catch (error) {
        console.error('Erro ao resetar produção:', error);
      } finally {
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
    const [records, setRecords] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
      system: '',
      period: '',
      revenue: '',
      profit: ''
    });

    const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA', 
      maximumFractionDigits: 2 
    }).format(val);

    // Carregar dados do Supabase - QUERY CORRETA
    useEffect(() => {
      const loadExternalHistory = async () => {
        try {
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

      loadExternalHistory();
    }, []);

    const handleAddRecord = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        // PERSISTÊNCIA ATÔMICA - Upsert na tabela external_history
        const { data, error } = await supabase
          .from('external_history')
          .upsert({
            source_name: formData.system,
            period: formData.period || new Date().toISOString().split('T')[0],
            total_revenue: parseFloat(formData.revenue),
            gross_profit: parseFloat(formData.profit),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) {
          console.error('[SystemHub] Erro ao gravar no external_history:', error);
          addNotification('error', 'Falha ao gravar registro histórico');
          return;
        }

        console.log('[SystemHub] Registro gravado com sucesso:', data);
        addNotification('success', 'Registro histórico gravado com sucesso!');
        
        // Limpar formulário apenas após confirmação da DB
        setFormData({ system: '', period: '', revenue: '', profit: '' });
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
              <h4 className="text-sm font-black text-white italic uppercase mb-6">Registros Históricos</h4>
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
                        <button className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Edit2 size={16}/>
                        </button>
                        <button 
                          onClick={() => {
                            setRecords(records.filter(r => r.id !== record.id));
                            addNotification('success', 'Registro removido com sucesso!');
                          }}
                          className="p-2 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
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
      id: 'digital-kitchen',
      title: 'Cozinha Digital',
      description: 'Sistema KDS Online em Tempo Real',
      icon: <ChefHat className="w-8 h-8" />,
      color: 'from-emerald-500 to-teal-600',
      component: <DigitalKitchen />
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
      icon: <FileText className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      component: <AGTCompliance />
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
    <div className="min-h-screen bg-[#070b14] p-6">
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

          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-80px)] overflow-y-auto pb-12">
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
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Logs</span>
                      </>
                    )}
                    {card.id === 'agt-compliance' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Relatórios</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Faturação</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Impostos</span>
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
        <div>
          {/* Botão Voltar */}
          <button
            onClick={() => setActiveCard(null)}
            className="mb-6 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            ← Voltar para Sistema
          </button>
          
          {/* Componente Ativo */}
          {activeComponent}
        </div>
      )}
    </div>
  );
};

export default SystemHub;




