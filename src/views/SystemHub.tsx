import React, { useState } from 'react';
import { 
  Settings, Users, Shield, FileText, Cloud, Terminal,
  ChevronRight, Building, UserCheck, Lock, Database, Code,
  Plus, Edit2, Trash2, X, Save, FileBadge, Landmark, Info, Download,
  ChefHat
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateSAFT, downloadSAFT } from '../lib/saftService';

// Importar componentes existentes
import Employees from './Employees';
import SettingsComponent from './Settings';

const SystemHub = () => {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const { settings, updateSettings } = useStore();

  // Componente Identidade usando formulário existente
  const IdentitySettings = () => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

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
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {localSettings.appLogoUrl ? (
                  <img src={localSettings.appLogoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                ) : (
                  <Building size={48} className="text-[#06b6d4]"/>
                )}
              </div>
              <div className="flex-1 space-y-4 w-full">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identidade Visual (Logo)</p>
                <button 
                  type="button" 
                  className="px-6 py-3 bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] rounded-xl text-[10px] font-black uppercase hover:bg-[#06b6d4]/20 transition-all flex items-center gap-2"
                >
                  Carregar Novo Logo
                </button>
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
    const { users, addUser, updateUser, removeUser, addNotification } = useStore();
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userForm, setUserForm] = useState<Partial<User>>({ 
      name: '', role: 'GARCOM', pin: '', permissions: [], status: 'ATIVO' 
    });

    const handleOpenUserModal = (user?: User) => {
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
        updateUser({ ...userForm, id: editingUserId } as User);
      } else {
        addUser({
          ...userForm,
          id: `user-${Date.now()}`,
        } as User);
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
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
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
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

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
            <p className="text-xs text-slate-400 mt-2 max-w-lg leading-relaxed">Este módulo sincroniza os seus dados locais com a nuvem de forma unidirecional. A nuvem serve apenas para alimentar o seu <b>Menu Digital</b> e <b>Dashboard Mobile (Netlify)</b>.</p>
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
                className="w-full py-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-black text-[9px] uppercase hover:bg-white/10 transition-all"
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
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">URL do Menu Digital (Netlify/Vercel)</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" 
                  value={localSettings.customDigitalMenuUrl} 
                  onChange={e => setLocalSettings({...localSettings, customDigitalMenuUrl: e.target.value})} 
                  placeholder="https://meu-restaurante.netlify.app"
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
    const { settings, updateSettings, activeOrders, customers, menu } = useStore();
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
      { id: 1, timestamp: new Date().toISOString(), level: 'INFO', message: 'Sistema inicializado com sucesso' },
      { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'WARNING', message: 'Conexão com banco de dados instável' },
      { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'ERROR', message: 'Falha ao processar pagamento #1234' }
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
      const logText = logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
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
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Kernel Técnico</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REST IA OS System Core</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Logs do Sistema */}
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
                          <span className={`text-[8px] font-black uppercase ${getLevelColor(log.level)}`}>
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

          {/* Configurações do Sistema */}
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
                  value={localSettings.debugMode || 'OFF'}
                  onChange={e => setLocalSettings({...localSettings, debugMode: e.target.value})}
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
                  value={localSettings.logLevel || 'INFO'}
                  onChange={e => setLocalSettings({...localSettings, logLevel: e.target.value})}
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
                  value={localSettings.cacheMode || 'NORMAL'}
                  onChange={e => setLocalSettings({...localSettings, cacheMode: e.target.value})}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">AGT</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Documentos</span>
                      </>
                    )}
                    {card.id === 'cloud-ecosystem' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">APIs</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Supabase</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Backup</span>
                      </>
                    )}
                    {card.id === 'technical-kernel' && (
                      <>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Console</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Database</span>
                        <span className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20">Logs</span>
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




