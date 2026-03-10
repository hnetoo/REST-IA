import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Users, Shield, FileText, Cloud, Terminal,
  ChevronRight, Building, UserCheck, Lock, Database, Code
} from 'lucide-react';

const SystemHub = () => {
  const navigate = useNavigate();

  const systemCards = [
    {
      id: 'identity',
      title: 'Identidade Geral',
      description: 'Configurações principais da aplicação',
      icon: <Building className="w-8 h-8" />,
      color: 'from-cyan-500 to-cyan-600',
      route: '/settings',
      features: ['Perfil', 'Configurações', 'Preferências', 'Branding']
    },
    {
      id: 'human-resources',
      title: 'Capital Humano (RH)',
      description: 'Gestão completa de recursos humanos',
      icon: <Users className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      route: '/employees',
      features: ['Funcionários', 'Folha de Salário', 'Relatórios RH', 'Performance']
    },
    {
      id: 'access-control',
      title: 'Controlo de Acesso',
      description: 'Segurança e permissões do sistema',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      route: '/security',
      features: ['Usuários', 'Permissões', 'Logs', 'Políticas']
    },
    {
      id: 'agt-compliance',
      title: 'Compliance AGT',
      description: 'Conformidade regulatória e fiscal',
      icon: <FileText className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      route: '/agt',
      features: ['Relatórios Fiscais', 'AGT', 'Documentos', 'Auditoria']
    },
    {
      id: 'cloud-ecosystem',
      title: 'Ecosistema Cloud',
      description: 'Integrações e serviços em nuvem',
      icon: <Cloud className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      route: '/integrations',
      features: ['APIs', 'Webhooks', 'Supabase', 'Backup']
    },
    {
      id: 'technical-kernel',
      title: 'Kernel Técnico',
      description: 'Ferramentas de desenvolvimento e sistema',
      icon: <Terminal className="w-8 h-8" />,
      color: 'from-red-500 to-red-600',
      route: '/console',
      features: ['Console Dev', 'Database', 'Logs', 'Debug']
    }
  ];

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-[#070b14] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <Settings className="w-10 h-10 text-[#06b6d4]" />
          Sistema
        </h1>
        <p className="text-gray-400 mt-2 text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Hub central de configurações e funcionalidades
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systemCards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.route)}
            className="glass-panel rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-glow border border-[#06b6d4]/20"
            style={{
              background: 'rgba(17, 24, 39, 0.7)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                {card.icon}
              </div>
              <ChevronRight className="w-5 h-5 text-[#06b6d4] transition-transform duration-300 group-hover:translate-x-1" />
            </div>

            {/* Card Content */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {card.title}
              </h3>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {card.description}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Funcionalidades
              </p>
              <div className="flex flex-wrap gap-2">
                {card.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-[#06b6d4]/10 text-[#06b6d4] text-xs rounded-full border border-[#06b6d4]/20"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#06b6d4]/5 to-transparent rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Clique em qualquer card para acessar as funcionalidades correspondentes
        </p>
      </div>
    </div>
  );
};

export default SystemHub;




