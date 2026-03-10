import React, { useState } from 'react';
import { 
  Settings, Users, Shield, FileText, Cloud, Terminal,
  ChevronRight, Building, UserCheck, Lock, Database, Code
} from 'lucide-react';

// Componentes internos
const IdentitySettings = () => (
  <div className="glass-panel rounded-2xl p-8">
    <h2 className="text-2xl font-bold text-white mb-6">Identidade Geral</h2>
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Nome da Aplicação</label>
        <input 
          type="text" 
          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white" 
          defaultValue="Vereda OS"
          aria-label="Nome da aplicação"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Logo</label>
        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
          <Building className="w-8 h-8 text-[#06b6d4]" />
        </div>
      </div>
    </div>
  </div>
);

const HumanResources = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');
  
  return (
    <div className="glass-panel rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Capital Humano (RH)</h2>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'employees' 
              ? 'bg-[#06b6d4] text-black' 
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Funcionários
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'payroll' 
              ? 'bg-[#06b6d4] text-black' 
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          }`}
        >
          Folha de Salários
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'employees' && (
        <div className="text-gray-400">
          <p>Gestão de funcionários</p>
        </div>
      )}
      
      {activeTab === 'payroll' && (
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Cargo</th>
                <th className="text-left p-3">Salário Base (Kz)</th>
                <th className="text-left p-3">Subsídios</th>
                <th className="text-left p-3">Descontos</th>
                <th className="text-left p-3">Total Líquido</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="p-3">João Silva</td>
                <td className="p-3">Gerente</td>
                <td className="p-3">250.000</td>
                <td className="p-3">50.000</td>
                <td className="p-3">30.000</td>
                <td className="p-3">270.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AccessControl = () => (
  <div className="glass-panel rounded-2xl p-8">
    <h2 className="text-2xl font-bold text-white mb-6">Controlo de Acesso</h2>
    <div className="text-gray-400">
      <p>Gestão de permissões e utilizadores</p>
    </div>
  </div>
);

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

const SystemHub = () => {
  const [activeCard, setActiveCard] = useState<string | null>(null);

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
      component: <HumanResources />
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




