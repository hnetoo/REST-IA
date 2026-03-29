import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { QrCode, Globe, Smartphone, Edit, Check, X, ExternalLink, BarChart, TrendingUp, Users, Eye } from 'lucide-react';

const Marketing = () => {
  const { settings, updateSettings } = useStore();
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(settings.customDigitalMenuUrl || '');

  const handleEditUrl = () => {
    setTempUrl(settings.customDigitalMenuUrl || '');
    setIsEditingUrl(true);
  };

  const handleSaveUrl = () => {
    if (!tempUrl.trim()) {
      alert('Por favor, insira uma URL válida.');
      return;
    }
    
    updateSettings({ customDigitalMenuUrl: tempUrl.trim() });
    setIsEditingUrl(false);
  };

  const handleCancelEditUrl = () => {
    setTempUrl(settings.customDigitalMenuUrl || '');
    setIsEditingUrl(false);
  };

  const handleTestUrl = () => {
    if (tempUrl) {
      window.open(tempUrl, '_blank');
    }
  };

  const handleCopyUrl = () => {
    if (settings.customDigitalMenuUrl) {
      navigator.clipboard.writeText(settings.customDigitalMenuUrl);
      alert('URL copiada para a área de transferência!');
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Globe size={18} className="animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase">Marketing Digital</span>
        </div>
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestão de Marketing</h2>
      </header>

      <div className="space-y-8">
        {/* Configuração da URL do Menu Digital */}
        <div className="glass-panel p-8 rounded-[3rem] border border-white/5 bg-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white shadow-lg">
              <QrCode size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">URL do Menu Digital</h3>
              <p className="text-slate-400 text-sm mt-1">Configure o link para o seu menu público online</p>
            </div>
          </div>

          <div className="space-y-6">
            {isEditingUrl ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">URL do Menu Digital</label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      className="flex-1 px-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white font-mono text-sm outline-none focus:border-primary"
                      placeholder="https://meu-restaurante.vercel.app"
                      value={tempUrl}
                      onChange={e => setTempUrl(e.target.value)}
                    />
                    <button
                      onClick={handleTestUrl}
                      className="px-4 py-3 bg-emerald-500 text-black rounded-2xl font-black text-xs uppercase hover:bg-emerald-600 transition-all"
                      title="Testar URL"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={handleCancelEditUrl}
                    className="flex-1 py-3 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveUrl}
                    className="flex-1 py-3 bg-primary text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-glow hover:scale-105 transition-all"
                  >
                    Salvar URL
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 border border-white/10 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {settings.customDigitalMenuUrl ? (
                        <div className="flex items-center gap-3">
                          <a 
                            href={settings.customDigitalMenuUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary font-mono text-sm hover:underline truncate max-w-[400px] flex items-center gap-2"
                          >
                            <ExternalLink size={14} />
                            {settings.customDigitalMenuUrl}
                          </a>
                          <button
                            onClick={handleCopyUrl}
                            className="p-2 bg-white/5 text-slate-400 hover:text-primary rounded-xl transition-all"
                            title="Copiar URL"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm italic">Nenhuma URL configurada</span>
                      )}
                    </div>
                    <button
                      onClick={handleEditUrl}
                      className="p-3 bg-white/5 text-slate-400 hover:text-primary rounded-xl transition-all"
                      title="Editar URL"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Métricas de Marketing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase">Visitas Hoje</p>
                <p className="text-2xl font-bold text-white">247</p>
              </div>
            </div>
            <div className="text-xs text-emerald-500 font-black">+12.5% vs ontem</div>
          </div>

          <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase">Usuários Ativos</p>
                <p className="text-2xl font-bold text-white">89</p>
              </div>
            </div>
            <div className="text-xs text-blue-500 font-black">+5 novos esta semana</div>
          </div>

          <div className="glass-panel p-6 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <BarChart size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-white">3.2%</p>
              </div>
            </div>
            <div className="text-xs text-purple-500 font-black">Meta: 5%</div>
          </div>
        </div>

        {/* Status do Menu Digital */}
        <div className="glass-panel p-8 rounded-[3rem] border border-white/5">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
            <Smartphone size={20} className="text-primary" />
            Status do Menu Digital
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <Check size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-emerald-500 uppercase">Menu Online</p>
                  <p className="text-white font-bold">Ativo</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Globe size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-blue-500 uppercase">Acesso Público</p>
                  <p className="text-white font-bold">QR Code Ativo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
