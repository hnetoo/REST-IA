import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { databaseService, BackupFile, DatabaseLog } from '../services/databaseService';
import { 
  Database, Download, Upload, Trash2, ShieldCheck, 
  Clock, FileText, CheckCircle, AlertTriangle, 
  RefreshCw, Search, ShieldAlert, History, Activity,
  Lock, Calendar, Zap, FileJson
} from 'lucide-react';

const DBHub = () => {
  const { addNotification, currentUser, settings, updateSettings } = useStore();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [logs, setLogs] = useState<DatabaseLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'BACKUPS' | 'LOGS' | 'SCHEDULE'>('BACKUPS');
  const [backupDescription, setBackupDescription] = useState('');
  const [backupType, setBackupType] = useState<'FULL' | 'SELECTIVE'>('FULL');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'DONO';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setBackups(databaseService.getBackups());
    setLogs(databaseService.getLogs());
  };

  const simulateProgress = async (duration: number = 1500) => {
    setProgress(0);
    const interval = duration / 100;
    for (let i = 0; i <= 100; i++) {
      setProgress(i);
      await new Promise(r => setTimeout(r, interval / 2));
    }
  };

  const handleCreateBackup = async () => {
    if (!isAdmin) {
      addNotification('error', 'Acesso negado: Apenas administradores podem criar backups.');
      return;
    }

    setIsProcessing(true);
    try {
      await simulateProgress();
      const state = useStore.getState();
      const desc = backupDescription || `Backup ${new Date().toLocaleString()}`;
      await databaseService.createBackup(desc, state, backupType, selectedCategories.length > 0 ? selectedCategories : undefined);
      
      addNotification('success', 'Backup criado com sucesso.');
      setBackupDescription('');
      loadData();
    } catch (error) {
      addNotification('error', 'Falha ao criar backup.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleRestore = async (backup: BackupFile) => {
    if (!isAdmin) {
      addNotification('error', 'Acesso negado.');
      return;
    }

    const confirm = window.confirm(
      `ATENÇÃO: Deseja restaurar o backup "${backup.metadata.description}"?\n\n` +
      `Isso irá sobrescrever os dados atuais do sistema. Um backup de segurança automático será criado antes.`
    );

    if (!confirm) return;

    setIsProcessing(true);
    try {
      // 1. Backup de segurança automático
      const currentState = useStore.getState();
      await databaseService.createBackup(`[AUTO-SAFETY] Antes de restauro ${backup.metadata.id}`, currentState);
      
      await simulateProgress(2500);
      
      const success = await databaseService.restoreBackup(backup);
      if (success) {
        addNotification('success', 'Sistema restaurado com sucesso. A aplicação irá reiniciar.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        addNotification('error', 'Falha na validação do backup.');
      }
    } catch (error) {
      addNotification('error', 'Erro crítico durante o restauro.');
    } finally {
      setIsProcessing(false);
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Eliminar este backup permanentemente?')) {
      databaseService.deleteBackup(id);
      loadData();
    }
  };

  const handleExport = (backup: BackupFile) => {
    databaseService.exportToFile(backup);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    setIsProcessing(true);
    try {
      const backup = await databaseService.processExternalFile(file);
      await handleRestore(backup);
    } catch (error: any) {
      addNotification('error', error.message);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const categories = [
    { id: 'menu', label: 'Menu & Pratos' },
    { id: 'categories', label: 'Categorias' },
    { id: 'users', label: 'Utilizadores' },
    { id: 'customers', label: 'Clientes' },
    { id: 'finance', label: 'Dados Financeiros' },
    { id: 'stock', label: 'Inventário/Stock' },
    { id: 'settings', label: 'Configurações' }
  ];

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background text-slate-200">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 italic uppercase leading-none">
            <Database className="text-primary" /> DB HUB <span className="text-primary/50">v1.0</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Central de Gestão de Dados e Resiliência</p>
        </div>
        {!isAdmin && (
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 animate-pulse">
            <ShieldAlert size={16} />
            <span className="text-[9px] font-black uppercase tracking-widest">Acesso Restrito</span>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/5 overflow-x-auto no-scrollbar">
        {[
          { id: 'BACKUPS', label: 'Gestão de Backups', icon: History },
          { id: 'LOGS', label: 'Logs de Auditoria', icon: Activity },
          { id: 'SCHEDULE', label: 'Agendamentos', icon: Calendar }
        ].map(tab => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel Principal */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === 'BACKUPS' && (
            <>
              {/* Novo Backup */}
              <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-primary group-hover:scale-110 transition-transform"><Zap size={120}/></div>
                <h3 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3">
                  <ShieldCheck size={20} className="text-primary" /> Criar Novo Ponto de Recuperação
                </h3>
                
                <div className="space-y-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Descrição do Backup</label>
                      <input 
                        type="text" 
                        value={backupDescription}
                        onChange={e => setBackupDescription(e.target.value)}
                        placeholder="Ex: Antes da atualização de preços"
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tipo de Operação</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setBackupType('FULL')}
                          className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${backupType === 'FULL' ? 'bg-primary text-black' : 'bg-white/5 text-slate-500 border border-white/10'}`}
                        >
                          Completo
                        </button>
                        <button 
                          onClick={() => setBackupType('SELECTIVE')}
                          className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${backupType === 'SELECTIVE' ? 'bg-primary text-black' : 'bg-white/5 text-slate-500 border border-white/10'}`}
                        >
                          Seletivo
                        </button>
                      </div>
                    </div>
                  </div>

                  {backupType === 'SELECTIVE' && (
                    <div className="animate-in slide-in-from-top duration-300">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Módulos a Incluir</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategories(prev => 
                                prev.includes(cat.id) ? prev.filter(p => p !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            className={`p-3 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all ${selectedCategories.includes(cat.id) ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={handleCreateBackup}
                    disabled={isProcessing || !isAdmin}
                    className="flex-[2] py-5 bg-primary text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-glow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <Download size={18}/>}
                    {isProcessing ? 'A PROCESSAR...' : 'EXECUTAR BACKUP AGORA'}
                  </button>

                  <label className={`flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-[0.1em] flex items-center justify-center gap-3 cursor-pointer hover:bg-white/10 transition-all ${isProcessing || !isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Upload size={18} className="text-primary" />
                    <span className="text-[9px]">Importar JSON/SQL</span>
                    <input 
                      type="file" 
                      accept=".json,.sql" 
                      className="hidden" 
                      onChange={handleImportFile}
                      disabled={isProcessing || !isAdmin}
                    />
                  </label>
                </div>
                </div>
              </div>

              {/* Lista de Backups */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <History size={14} /> Histórico de Pontos de Recuperação ({backups.length})
                </h4>
                
                {backups.length === 0 ? (
                  <div className="glass-panel p-12 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center text-slate-600">
                    <Database size={48} className="mb-4 opacity-20" />
                    <p className="font-black uppercase text-[10px] tracking-widest">Nenhum backup encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {backups.map(bak => (
                      <div key={bak.metadata.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bak.metadata.type === 'FULL' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                            <FileJson size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-black uppercase text-xs italic tracking-tight">{bak.metadata.description}</span>
                              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${bak.metadata.type === 'FULL' ? 'bg-primary text-black' : 'bg-blue-500 text-white'}`}>
                                {bak.metadata.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                              <span className="flex items-center gap-1"><Clock size={10} /> {new Date(bak.metadata.timestamp).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><FileText size={10} /> {(bak.metadata.size / 1024).toFixed(1)} KB</span>
                              <span className="flex items-center gap-1 opacity-40">ID: {bak.metadata.id.split('-')[1]}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleExport(bak)}
                            className="p-3 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            title="Descarregar Ficheiro"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={() => handleRestore(bak)}
                            disabled={!isAdmin}
                            className="px-4 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <Upload size={14} /> Restaurar
                          </button>
                          <button 
                            onClick={() => handleDelete(bak.metadata.id)}
                            disabled={!isAdmin}
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'LOGS' && (
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <h3 className="text-xl font-black text-white italic uppercase flex items-center gap-3">
                <Activity size={20} className="text-primary" /> Auditoria de Infraestrutura
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar font-mono">
                {logs.map(log => (
                  <div key={log.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex gap-4 text-[10px]">
                    <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-bold shrink-0 ${log.status === 'SUCCESS' ? 'text-emerald-500' : log.status === 'ERROR' ? 'text-red-500' : 'text-primary'}`}>
                      {log.operation}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                    {log.details && <span className="text-slate-600 italic">({log.details})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'SCHEDULE' && (
            <div className="glass-panel p-12 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
                <Clock size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase mb-2">Automação de Backups</h3>
                <p className="text-slate-500 text-xs max-w-sm">Agende cópias de segurança automáticas para garantir que nenhum dado seja perdido.</p>
              </div>
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl inline-flex items-center gap-3 text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
                <Lock size={14} /> Funcionalidade em Desenvolvimento
              </div>
            </div>
          )}
        </div>

        {/* Sidebar de Informações */}
        <div className="space-y-8">
          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-3">
              <ShieldCheck className="text-primary" size={18} /> Resiliência de Dados
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <span>Espaço Utilizado</span>
                  <span className="text-primary">0.2%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[2%]" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <CheckCircle size={14} className="text-emerald-500" /> Criptografia AES-256
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <CheckCircle size={14} className="text-emerald-500" /> Validação de Integridade
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <CheckCircle size={14} className="text-emerald-500" /> Multi-formato (JSON/SQL)
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 bg-red-500/5">
            <h4 className="text-sm font-black text-red-500 italic uppercase flex items-center gap-3 mb-4">
              <AlertTriangle size={18} /> Zona Crítica
            </h4>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-6 leading-relaxed">
              A restauração de dados é uma operação irreversível. Certifique-se de que o backup selecionado é o correto.
            </p>
            <button 
              onClick={() => {
                if (window.confirm('AVISO: Esta ação irá limpar TODOS os dados locais. Continuar?')) {
                  // Lógica de reset (opcional)
                  addNotification('info', 'Funcionalidade de reset total restrita ao console.');
                }
              }}
              className="w-full py-4 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              Reset Total do Sistema
            </button>
          </div>
        </div>
      </div>

      {/* Progress Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="max-w-md w-full glass-panel p-10 rounded-[3rem] border border-white/10 text-center space-y-8 animate-in zoom-in duration-300">
            <div className="relative inline-block">
              <RefreshCw className="text-primary animate-spin-slow" size={64} />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                {progress}%
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white italic uppercase mb-2">A Sincronizar...</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">A garantir integridade e persistência dos dados</p>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 shadow-glow" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBHub;
