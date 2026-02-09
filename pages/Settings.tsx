
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { 
  Settings as SettingsIcon, Users, Save, Shield, Plus, Trash2, KeyRound, 
  Edit2, X, CheckCircle, Smartphone, QrCode, 
  Printer, ExternalLink, ChefHat, Rocket, 
  Upload, Link as LinkIcon, Eye, EyeOff, Lock,
  Copy, Check, Layers, Cpu, Terminal, Binary, RefreshCw,
  UploadCloud, DownloadCloud, Database, Activity, Trash,
  ShieldCheck, FileBadge, Landmark, FileText, Download, Info,
  CloudLightning, Globe, Share2, Server, ShieldAlert, Link2,
  Utensils, TrendingUp
} from 'lucide-react';
import { User, UserRole, PermissionKey, TaxRegime } from '../types';
import { generateSAFT, downloadSAFT } from '../services/saftService';
import { sqlMigrationService } from '../services/sqlMigrationService';

const ALL_PERMISSIONS: { key: PermissionKey; label: string }[] = [
  { key: 'POS_SALES', label: 'Realizar Vendas' },
  { key: 'POS_VOID', label: 'Anular Pedidos' },
  { key: 'POS_DISCOUNT', label: 'Aplicar Descontos' },
  { key: 'FINANCE_VIEW', label: 'Ver Financeiro/Lucros' },
  { key: 'STOCK_MANAGE', label: 'Gerir Stock/Menu' },
  { key: 'STAFF_MANAGE', label: 'Gerir Equipa/RH' },
  { key: 'SYSTEM_CONFIG', label: 'Configurações Core' },
  { key: 'OWNER_ACCESS', label: 'Acesso Owner Hub' },
  { key: 'AGT_CONFIG', label: 'Gestão Fiscal AGT' },
];

const Settings = () => {
  const { 
    users, addUser, updateUser, removeUser, 
    settings, updateSettings, currentUser, 
    addNotification, resetFinancialData,
    activeOrders, customers, menu, categories
  } = useStore();

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'OPERATORS' | 'FISCAL' | 'CORE' | 'SUPABASE'>('GENERAL');
  const [localSettings, setLocalSettings] = useState(settings);
  const [confirmText, setConfirmText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  
  // User States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({ 
    name: '', role: 'GARCOM', pin: '', permissions: [], status: 'ATIVO' 
  });
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    setLocalSettings(settings); 
  }, [settings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    updateSettings(localSettings);
    addNotification('success', 'Definições do ecossistema salvas.');
    setIsSaving(false);
  };

  const handleManualSync = async (type: 'MENU' | 'SALES' | 'CUSTOMERS' | 'ALL') => {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      addNotification('error', 'Configure as credenciais Cloud primeiro.');
      return;
    }
    
    setIsSyncing(type);
    try {
      const localData = { menu, categories, activeOrders, customers };
      await sqlMigrationService.autoMigrate(settings, localData);
      addNotification('success', `Sincronização de ${type} concluída com sucesso.`);
    } catch (err: any) {
      addNotification('error', err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRegimeChange = (regime: TaxRegime) => {
    let rate = 0;
    if (regime === 'GERAL') rate = 14;
    else if (regime === 'SIMPLIFICADO') rate = 7;
    else if (regime === 'EXCLUSAO') rate = 0;
    
    setLocalSettings({ ...localSettings, taxRegime: regime, taxRate: rate });
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUserId(user.id);
      setUserForm(user);
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

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      updateUser({ ...userForm, id: editingUserId } as User);
      addNotification('success', 'Utilizador atualizado.');
    } else {
      addUser({ ...userForm, id: `u-${Date.now()}` } as User);
      addNotification('success', 'Utilizador criado.');
    }
    setIsUserModalOpen(false);
  };

  const tabs = [
    { id: 'GENERAL', label: 'Geral & Identidade', icon: SettingsIcon },
    { id: 'OPERATORS', label: 'Controlo de Acesso', icon: Users },
    { id: 'FISCAL', label: 'Compliance AGT', icon: ShieldCheck },
    { id: 'SUPABASE', label: 'Ecossistema Cloud', icon: CloudLightning },
    { id: 'CORE', label: 'Kernel Técnico', icon: Cpu }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background text-slate-200">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-white flex items-center gap-3 italic uppercase leading-none">
            <SettingsIcon className="text-primary" /> Sistema & Ecossistema
        </h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Configurações do Kernel e Integrações Nuvem</p>
      </header>

      <div className="flex gap-4 mb-8 border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-6 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon size={16} /> {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow"></div>}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-[3rem] p-10 min-h-[500px] border border-white/5 relative animate-in fade-in duration-500">
        
        {activeTab === 'GENERAL' && (
          <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-10">
             <div className="grid grid-cols-1 gap-8">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nome do Restaurante</label>
                   <input type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary" value={localSettings.restaurantName} onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})} />
                </div>
                <div className="flex items-center gap-8">
                   <div className="w-40 h-40 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {localSettings.appLogoUrl ? <img src={localSettings.appLogoUrl} className="w-full h-full object-contain p-2" /> : <ChefHat size={48} className="text-slate-800"/>}
                   </div>
                   <div className="flex-1 space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identidade Visual (Logo)</p>
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="px-6 py-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary/20 transition-all flex items-center gap-2"><Upload size={14}/> Carregar Novo Logo</button>
                      <input ref={logoInputRef} type="file" hidden accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setLocalSettings(prev => ({...prev, appLogoUrl: reader.result as string}));
                          reader.readAsDataURL(file);
                        }
                      }} />
                   </div>
                </div>
             </div>
             <button type="submit" disabled={isSaving} className="w-full py-6 bg-primary text-black rounded-3xl font-black uppercase tracking-[0.2em] shadow-glow flex items-center justify-center gap-3">
               {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>} {isSaving ? 'A GUARDAR...' : 'GUARDAR ALTERAÇÕES'}
             </button>
          </form>
        )}

        {activeTab === 'SUPABASE' && (
          <div className="space-y-12">
            {/* Header de Conexão */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-primary"><Database size={120}/></div>
               <div className="z-10">
                  <div className="flex items-center gap-3 mb-2">
                     <div className={`w-3 h-3 rounded-full ${settings.supabaseUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado da Infraestrutura Cloud</span>
                  </div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Hub de Dados Supabase</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-lg leading-relaxed">Este módulo sincroniza os seus dados locais com a nuvem de forma unidirecional. A nuvem serve apenas para alimentar o seu <b>Menu Digital</b> e <b>Dashboard Mobile (Netlify)</b>.</p>
               </div>
               <div className="flex gap-3 z-10">
                  <button onClick={() => handleManualSync('ALL')} disabled={!!isSyncing} className="px-8 py-4 bg-primary text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center gap-2 hover:scale-105 transition-all">
                    {isSyncing === 'ALL' ? <RefreshCw className="animate-spin" size={16}/> : <Share2 size={16}/>} Sincronização Global
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Configuração de Acesso */}
               <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
                     <KeyRound className="text-primary" size={18} /> Credenciais da Instância
                  </h4>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Project URL</label>
                        <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" value={localSettings.supabaseUrl} onChange={e => setLocalSettings({...localSettings, supabaseUrl: e.target.value})} placeholder="https://xxxx.supabase.co" />
                     </div>
                     <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Service Role Key (Push Privileges)</label>
                        <input type="password" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" value={localSettings.supabaseKey} onChange={e => setLocalSettings({...localSettings, supabaseKey: e.target.value})} placeholder="••••••••••••••••" />
                     </div>
                     <button onClick={handleSaveSettings} className="w-full py-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-black text-[9px] uppercase hover:bg-white/10 transition-all">Guardar Credenciais</button>
                  </div>
               </div>

               {/* Endpoints Externos */}
               <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
                     <Globe className="text-primary" size={18} /> Destinos de Visualização
                  </h4>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">URL do Menu Digital (Netlify/Vercel)</label>
                        <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" value={localSettings.customDigitalMenuUrl} onChange={e => setLocalSettings({...localSettings, customDigitalMenuUrl: e.target.value})} placeholder="https://meu-restaurante.netlify.app" />
                     </div>
                     <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3">
                        <Link2 size={20} className="text-blue-500 shrink-0" />
                        <p className="text-[9px] text-slate-400 italic leading-relaxed">Este URL será utilizado para gerar o QR Code oficial da sua Tasca, direcionando os clientes para o seu menu online sincronizado.</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Painel de Sincronização Granular */}
            <div className="space-y-6">
               <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
                  <Server className="text-primary" size={18} /> Motores de Sincronização Unidirecional (Push)
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                     { id: 'MENU', label: 'Catálogo Digital', desc: 'Sincroniza Menu e Categorias', icon: Utensils, color: 'primary' },
                     { id: 'SALES', label: 'Analítica Mobile', desc: 'Envia faturas para Dashboard do Dono', icon: TrendingUp, color: 'emerald' },
                     { id: 'CUSTOMERS', label: 'Base de Fidelidade', desc: 'Sincroniza pontos e registos', icon: Users, color: 'blue' }
                  ].map(motor => (
                     <div key={motor.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group">
                        <div className={`w-12 h-12 rounded-2xl bg-${motor.color}-500/10 flex items-center justify-center text-${motor.color}-500 mb-4`}>
                           <motor.icon size={24}/>
                        </div>
                        <h5 className="text-white font-bold uppercase text-xs">{motor.label}</h5>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase mb-6">{motor.desc}</p>
                        <button 
                           onClick={() => handleManualSync(motor.id as any)}
                           disabled={!!isSyncing}
                           className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                           {isSyncing === motor.id ? <RefreshCw className="animate-spin" size={12}/> : <UploadCloud size={12}/>} Forçar Sincronização
                        </button>
                     </div>
                  ))}
               </div>
            </div>

            {/* Terminal de Auditoria Cloud */}
            <div className="bg-black/60 rounded-[2rem] border border-white/5 p-6 font-mono overflow-hidden">
               <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2 text-primary">
                     <Terminal size={14}/>
                     <span className="text-[10px] font-bold uppercase tracking-widest">Cloud Audit Log</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                     <span className="text-[8px] text-slate-500 uppercase">Auto-Sync Ativo</span>
                  </div>
               </div>
               <div className="space-y-2 h-32 overflow-y-auto no-scrollbar">
                  <p className="text-[10px] text-slate-500">[SYSTEM] Kernel inicializado v1.0.6</p>
                  <p className="text-[10px] text-emerald-500">[SUCCESS] Sincronização automática de Menu concluída às {new Date().toLocaleTimeString()}</p>
                  <p className="text-[10px] text-slate-500">[INFO] Aguardando novas faturas para push de analítica...</p>
                  {isSyncing && <p className="text-[10px] text-primary animate-pulse">[BUSY] A enviar pacotes de dados para {isSyncing}...</p>}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'FISCAL' && (
           <div className="space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                   <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                      <FileBadge className="text-primary" /> Certificação & Série
                   </h3>
                   <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">N.º do Certificado AGT</label>
                        <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" value={localSettings.agtCertificate} onChange={e => setLocalSettings({...localSettings, agtCertificate: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Série de Faturação Ativa</label>
                        <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs uppercase" value={localSettings.invoiceSeries} onChange={e => setLocalSettings({...localSettings, invoiceSeries: e.target.value})} />
                      </div>
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex gap-3">
                        <Info size={20} className="text-primary shrink-0" />
                        <p className="text-[9px] text-slate-400 italic leading-relaxed">Software certificado nos termos do Regime Jurídico das Faturas de Angola. Imutabilidade SHA-256 garantida.</p>
                      </div>
                   </div>
                </div>

                <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                   <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                      <Landmark className="text-primary" /> Cadastro Fiscal
                   </h3>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">NIF</label>
                          <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" value={localSettings.nif} onChange={e => setLocalSettings({...localSettings, nif: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Capital Social</label>
                          <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs" value={localSettings.capitalSocial} onChange={e => setLocalSettings({...localSettings, capitalSocial: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Regime Fiscal IVA</label>
                        <select 
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none appearance-none cursor-pointer"
                          value={localSettings.taxRegime}
                          onChange={e => handleRegimeChange(e.target.value as TaxRegime)}
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
                <button onClick={handleSaveSettings} className="flex-1 py-5 bg-primary text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-glow flex items-center justify-center gap-3 hover:scale-105 transition-all">
                   <Save size={18}/> Salvar Dados Fiscais
                </button>
                <button onClick={() => {
                  const period = { month: new Date().getMonth(), year: new Date().getFullYear() };
                  const xml = generateSAFT(activeOrders, customers, menu, settings, period);
                  downloadSAFT(xml, `SAFT_AO_${settings.nif}.xml`);
                }} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                   <Download size={18}/> Exportar SAF-T AO (XML)
                </button>
             </div>
           </div>
        )}

        {activeTab === 'OPERATORS' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Gestão de Operadores & Permissões</h3>
                <button onClick={() => handleOpenUserModal()} className="px-6 py-3 bg-primary text-black rounded-2xl font-black text-[10px] uppercase shadow-glow flex items-center gap-2"><Plus size={16}/> Adicionar Novo</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                  <div key={u.id} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 group hover:border-primary/40 transition-all flex flex-col">
                     <div className="flex justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${u.role === 'ADMIN' ? 'bg-purple-600' : 'bg-slate-800'}`}><Users size={24}/></div>
                        <div className="flex gap-1">
                           <button onClick={() => handleOpenUserModal(u)} className="p-3 text-slate-500 hover:text-white"><Edit2 size={16}/></button>
                           <button onClick={() => removeUser(u.id)} className="p-3 text-red-500/30 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                     </div>
                     <h4 className="text-white font-bold uppercase truncate">{u.name}</h4>
                     <p className="text-[10px] font-black text-primary uppercase mt-1">{u.role}</p>
                     <div className="mt-4 flex flex-wrap gap-1">
                        {u.permissions.map(p => (
                          <span key={p} className="text-[7px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-slate-500">{p}</span>
                        ))}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'CORE' && (
          <div className="space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3"><Terminal size={22} className="text-primary"/> Kernel Diagnostics</h3>
                   <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 space-y-6">
                      <div className="flex items-center gap-4"><Activity className="text-emerald-500" size={20}/><span className="text-xs font-mono">Status: Sistema Saudável</span></div>
                      <div className="flex items-center gap-4"><Binary className="text-blue-500" size={20}/><span className="text-xs font-mono">Build: REST-IA-OS-v1.0.6</span></div>
                   </div>
                </div>
             </div>
             <div className="bg-red-600/5 border border-red-600/30 p-10 rounded-[3rem] mt-12">
                <h3 className="text-red-500 font-black uppercase text-sm mb-4 flex items-center gap-3"><Trash size={18}/> Reset Total de Dados</h3>
                <p className="text-slate-400 text-xs mb-8 font-bold uppercase">Escreva PRODUCAO para confirmar a limpeza total dos dados de teste.</p>
                <div className="flex gap-4">
                   <input type="text" className="flex-1 bg-red-600/10 border border-red-600/20 p-5 rounded-2xl text-center font-black tracking-widest text-white outline-none focus:border-red-500" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="..." />
                   <button onClick={() => { if(confirmText === 'PRODUCAO') resetFinancialData(); }} disabled={confirmText !== 'PRODUCAO'} className="px-10 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] disabled:opacity-20 transition-all">Limpar Tudo</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* MODAL UTILIZADOR COM PERMISSÕES */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-8 backdrop-blur-xl animate-in zoom-in">
           <div className="glass-panel p-12 rounded-[4rem] w-full max-w-4xl border border-white/10 overflow-y-auto max-h-[90vh] no-scrollbar">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                   {editingUserId ? 'Editar Operador' : 'Novo Operador'}
                 </h3>
                 <button onClick={() => setIsUserModalOpen(false)} className="text-slate-500 hover:text-white"><X size={32}/></button>
              </div>

              <form onSubmit={handleSaveUser} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Nome Completo</label>
                       <input required type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" placeholder="Nome" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Função</label>
                          <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none appearance-none" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}>
                             <option value="GARCOM">Garçom</option>
                             <option value="CAIXA">Caixa</option>
                             <option value="ADMIN">Gerente</option>
                             <option value="OWNER">Proprietário</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">PIN (4 Dígitos)</label>
                          <input required type="password" maxLength={4} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-white text-center font-mono text-xl outline-none" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} />
                       </div>
                    </div>
                    <button type="submit" className="w-full py-6 bg-primary text-black rounded-3xl font-black uppercase shadow-glow mt-8">Guardar Utilizador</button>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                       <Lock size={14}/> Permissões de Acesso
                    </h4>
                    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                       {ALL_PERMISSIONS.map(p => (
                         <label key={p.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${userForm.permissions?.includes(p.key) ? 'bg-primary/10 border-primary/50 text-white' : 'bg-white/5 border-white/5 text-slate-500 opacity-60 hover:opacity-100'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">{p.label}</span>
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={userForm.permissions?.includes(p.key)} 
                              onChange={() => handleTogglePermission(p.key)} 
                            />
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${userForm.permissions?.includes(p.key) ? 'bg-primary border-primary' : 'border-slate-700'}`}>
                               {userForm.permissions?.includes(p.key) && <Check size={16} className="text-black stroke-[4px]"/>}
                            </div>
                         </label>
                       ))}
                    </div>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
