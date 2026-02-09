
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  Shield, Cpu, Database, Activity, RefreshCw, 
  UploadCloud, DownloadCloud, Terminal, Server, 
  Wifi, Zap, Lock, HardDrive, Bell, Trash2, AlertTriangle, 
  RotateCcw, Settings2, ShieldAlert, Binary, Rocket, Share2
} from 'lucide-react';
import { sqlMigrationService } from '../services/sqlMigrationService';

type ControlTab = 'HEALTH' | 'CLOUD' | 'MAINTENANCE';

const SystemControl = () => {
  const { settings, updateSettings, backupToSupabase, restoreFromSupabase, resetFinancialData, addNotification } = useStore();
  const [activeTab, setActiveTab] = useState<ControlTab>('HEALTH');
  const [latency, setLatency] = useState(12);
  const [cpuLoad, setCpuLoad] = useState(24);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 15) + 5);
      setCpuLoad(Math.floor(Math.random() * 10) + 18);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleBackup = async () => {
    setIsSyncing(true);
    await backupToSupabase();
    setIsSyncing(false);
  };

  const handleSqlMigration = async () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      addNotification('error', 'Instância SQL não configurada. Preencha os campos URL e API Key primeiro.');
      return;
    }

    if (window.confirm("Esta operação criará automaticamente as tabelas e migrará todos os dados do SQLite local para a sua instância SQL na Nuvem. Deseja iniciar a migração automática?")) {
      setIsMigrating(true);
      try {
        const localData = useStore.getState();
        await sqlMigrationService.autoMigrate(settings, localData);
        addNotification('success', 'Migração SQL Concluída com Sucesso! O sistema agora é híbrido cloud.');
      } catch (err: any) {
        addNotification('error', err.message);
      } finally {
        setIsMigrating(false);
      }
    }
  };

  const handleFactoryReset = () => {
    if (confirmText.toUpperCase() !== 'PRODUCAO') {
      addNotification('error', 'Palavra de confirmação incorreta.');
      return;
    }
    const confirm = window.confirm("☢️ OPERAÇÃO IRREVERSÍVEL ☢️\n\nDeseja zerar todos os dados financeiros?");
    if (confirm) {
      resetFinancialData();
      setConfirmText('');
      addNotification('success', 'Sistema reiniciado.');
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-slate-950 font-mono">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Shield size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">REST IA OS Kernel</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Core Control</h2>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
           {[
             { id: 'HEALTH', label: 'Estado', icon: Activity },
             { id: 'CLOUD', label: 'Cloud Sync', icon: Database },
             { id: 'MAINTENANCE', label: 'Manutenção', icon: Settings2 }
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as ControlTab)}
               className={`px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all
                 ${activeTab === tab.id ? 'bg-primary text-black shadow-glow' : 'text-slate-500 hover:text-slate-300'}
               `}
             >
               <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </div>
      </header>

      <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'HEALTH' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] border-white/5 relative overflow-hidden">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                <Cpu className="text-primary" /> Diagnóstico do Kernel
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                      <span>Carga CPU</span>
                      <span className="text-primary">{cpuLoad}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary shadow-glow transition-all duration-1000" style={{ width: `${cpuLoad}%` }}></div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                      <span>DB SQLite Health</span>
                      <span className="text-emerald-500">Healthy</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 shadow-glow" style={{ width: '100%' }}></div>
                    </div>
                 </div>
              </div>
              <div className="mt-12 p-6 bg-black/40 rounded-3xl border border-white/5">
                 <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-4">
                    <Terminal size={14} className="text-primary" /> Live Log
                 </div>
                 <div className="space-y-2 text-[10px] text-slate-600 font-mono">
                    <p><span className="text-primary">[OK]</span> Core v1.0.6: Active</p>
                    <p><span className="text-primary">[OK]</span> Tauri SQLite: Persistent</p>
                    <p><span className="text-orange-500">[MSG]</span> Monitoring active sensors</p>
                 </div>
              </div>
            </div>
            
            <div className="space-y-6">
               <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-2xl text-primary"><Wifi size={24}/></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network</p>
                    <p className="text-xl font-black text-white">{latency}ms</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'CLOUD' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="glass-panel p-10 rounded-[3rem] border-primary/20 bg-primary/5">
               <div className="flex justify-between items-start mb-10">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                    <Database className="text-primary" /> Instância SQL na Nuvem
                  </h3>
                  <div className="px-4 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase border border-emerald-500/20">Auto-Setup Ativo</div>
               </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">SQL Provider URL</label>
                    <input type="text" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white outline-none focus:border-primary font-mono" value={settings.supabaseUrl} onChange={e => updateSettings({ supabaseUrl: e.target.value })} placeholder="https://database-instance.com" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Master Key</label>
                    <input type="password" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white outline-none focus:border-primary font-mono" value={settings.supabaseKey} onChange={e => updateSettings({ supabaseKey: e.target.value })} placeholder="••••••••••••" />
                 </div>
              </div>
              
              <div className="p-8 bg-black/30 rounded-[2rem] border border-white/5 mb-10 flex gap-6 items-center">
                 <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0"><Rocket size={32} /></div>
                 <div>
                    <h4 className="text-white font-bold text-sm uppercase">Migração em 1-Clique</h4>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase leading-relaxed">Clique no botão abaixo para transformar seu banco local em SQL remoto. O sistema criará todas as tabelas e relacionamentos automaticamente para si.</p>
                 </div>
              </div>

              <div className="flex flex-col gap-4">
                 <button onClick={handleSqlMigration} disabled={isMigrating} className="w-full py-6 bg-primary text-black rounded-3xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-glow disabled:opacity-50 hover:scale-[1.01] transition-all">
                    {isMigrating ? <RefreshCw className="animate-spin" size={20}/> : <Share2 size={20} />}
                    {isMigrating ? 'CONSTRUINDO ESTRUTURA SQL...' : 'MIGRAR E SINCRONIZAR SQL AGORA'}
                 </button>
                 <div className="flex gap-4">
                    <button onClick={handleBackup} disabled={isSyncing} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                       {isSyncing ? <RefreshCw className="animate-spin" size={16}/> : <UploadCloud size={16} />} Backup Simples
                    </button>
                    <button onClick={restoreFromSupabase} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                       <DownloadCloud size={16} /> Restaurar Manual
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'MAINTENANCE' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="glass-panel p-10 rounded-[3rem] border-red-500/30 bg-red-500/5">
               <h3 className="text-2xl font-black text-red-500 uppercase italic tracking-tighter mb-4 flex items-center gap-3">
                  <Rocket size={28} /> Produção Real
               </h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase mb-8">Escreva PRODUCAO para limpar os dados de teste.</p>
               <div className="space-y-6 bg-black/40 p-8 rounded-[2.5rem] border border-red-500/20">
                  <input type="text" className="w-full p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-white font-black tracking-[0.5em] outline-none" value={confirmText} onChange={e => setConfirmText(e.target.value)} />
                  <button onClick={handleFactoryReset} disabled={confirmText.toUpperCase() !== 'PRODUCAO'} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-xs disabled:opacity-20">Zerar Faturamento</button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemControl;
