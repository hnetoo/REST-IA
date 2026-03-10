import React, { useState } from 'react';
import { 
  Settings, Users, Shield, FileText, Cloud, Terminal,
  ChevronRight, Building, UserCheck, Lock, Database, Code
} from 'lucide-react';
import { useStore } from '../store/useStore';

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

  const CloudEcosystem = () => (
    <div className="glass-panel rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Ecosistema Cloud</h2>
      <div className="text-gray-400">
        <p>Configurações do Supabase e APIs</p>
      </div>
    </div>
  );

  const TechnicalKernel = () => (
    <div className="glass-panel rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Kernel Técnico</h2>
      <div className="text-gray-400">
        <p>Logs e configurações do sistema</p>
      </div>
    </div>
  );

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
      component: <div className="glass-panel rounded-2xl p-8 text-gray-400"><p>Compliance AGT</p></div>
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




