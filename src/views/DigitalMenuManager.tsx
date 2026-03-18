
import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Eye, EyeOff, Star, Tag, Utensils, QrCode, Smartphone, Sparkles, Cloud, AlertTriangle, CheckCircle, RefreshCw, Trash2, Shield, ShieldOff, Wifi, WifiOff } from 'lucide-react';
import { ProductRecoveryButton } from '../components/ProductRecoveryButton';
import { cleanFetchService } from '../services/cleanFetchService';
import { syncBlockerService } from '../services/syncBlockerService';
import { sqlMigrationService } from '../lib/sqlMigrationService';

const DigitalMenuManager = () => {
  const { menu, categories, settings, notifications, toggleDishVisibility, toggleDishFeatured, toggleCategoryVisibility, updateSettings } = useStore();
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(settings.customDigitalMenuUrl || '');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'pending' | 'conflict'>('synced');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDetails, setLastSyncDetails] = useState<any>(null);

  const formatKz = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(val);

  // Função de sincronização manual com status real
  const handleManualSync = async () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      alert('Configure as credenciais do Supabase primeiro.');
      return;
    }

    setIsSyncing(true);
    setCloudSyncStatus('pending');

    try {
      const currentState = {
        categories,
        menu,
        activeOrders: [], // Será filtrado no serviço
        tables: [], // Será mapeado no serviço
        settings
      };

      const result = await sqlMigrationService.autoMigrate(settings, currentState);
      
      setCloudSyncStatus(result.status);
      setLastSyncDetails(result.details);
      
      if (result.success) {
        console.log('✅ Sincronização concluída com sucesso:', result.details);
      } else {
        console.error('❌ Erro na sincronização:', result.details);
      }
    } catch (error: any) {
      console.error('❌ Erro crítico na sincronização:', error);
      setCloudSyncStatus('pending');
      setLastSyncDetails({ error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Ativar bloqueador de sync ao montar o componente
  useEffect(() => {
    console.log('[DigitalMenuManager] 🛡️ Ativando bloqueador de sync...');
    syncBlockerService.disableAutoSync();
    
    return () => {
      console.log('[DigitalMenuManager] 🔓 Limpando bloqueador de sync...');
      syncBlockerService.enableSync();
    };
  }, []);

  const syncStatus = useMemo(() => {
    const hasCloud = !!settings.supabaseUrl;
    const totalLocalCategories = categories.length;
    const totalLocalDishes = menu.length;
    const digitalCategories = categories.filter(c => c.isVisibleDigital).length;
    const digitalDishes = menu.filter(m => m.isVisibleDigital).length;
    const lastSyncNotification = [...notifications].reverse().find(n => n.message.toLowerCase().includes('sincronização') || n.message.toLowerCase().includes('nuvem'));

    return {
      hasCloud,
      totalLocalCategories,
      totalLocalDishes,
      digitalCategories,
      digitalDishes,
      lastSyncNotificationMessage: lastSyncNotification ? lastSyncNotification.message : null
    };
  }, [settings.supabaseUrl, categories, menu, notifications]);

  // Funções para gerenciar URL do menu digital
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

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <QrCode size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Hub de Auto-Serviço Digital</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestão Menu Público</h2>
        </div>
        <div className="flex gap-4">
          {/* Botão de Limpeza de Cache Corrompido */}
          <button
            onClick={async () => {
              try {
                await cleanFetchService.cleanAndFetch();
                alert('Cache limpo e dados recarregados do Supabase com sucesso!');
              } catch (error: any) {
                alert(`Erro na limpeza: ${error.message}`);
              }
            }}
            className="glass-panel p-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all group"
            title="Limpar cache corrompido e recarregar do Supabase"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <Trash2 size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex-1">
                <div className="text-[8px] font-black text-red-500 uppercase mb-1">Limpar Cache</div>
                <div className="text-xs text-slate-400">Corrigir "Tudo Bebidas"</div>
              </div>
            </div>
          </button>
          
          {/* Configuração da URL do Menu Digital */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <QrCode size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-[8px] font-black text-slate-500 uppercase mb-1">URL Menu Digital</div>
                {isEditingUrl ? (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-mono text-xs outline-none focus:border-primary"
                      placeholder="https://meu-restaurante.vercel.app"
                      value={tempUrl}
                      onChange={e => setTempUrl(e.target.value)}
                    />
                    <button
                      onClick={handleTestUrl}
                      className="px-3 py-2 bg-emerald-500 text-black rounded-xl font-black text-xs uppercase hover:bg-emerald-600 transition-all"
                      title="Testar URL"
                    >
                      Testar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {settings.customDigitalMenuUrl ? (
                        <a 
                          href={settings.customDigitalMenuUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-mono text-xs hover:underline truncate max-w-[200px] block"
                        >
                          {settings.customDigitalMenuUrl}
                        </a>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Não configurado</span>
                      )}
                    </div>
                    <button
                      onClick={handleEditUrl}
                      className="p-2 bg-white/10 text-slate-400 hover:text-primary rounded-xl transition-all"
                      title="Editar URL"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Ações de edição da URL */}
          {isEditingUrl && (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEditUrl}
                className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl font-black text-xs uppercase hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase shadow-glow hover:scale-105 transition-all"
              >
                Salvar
              </button>
            </div>
          )}
          
          <div className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-3">
            {isSyncing ? (
              <RefreshCw size={20} className="text-primary animate-spin" />
            ) : cloudSyncStatus === 'synced' ? (
              <Wifi size={20} className="text-emerald-500" />
            ) : cloudSyncStatus === 'conflict' ? (
              <AlertTriangle size={20} className="text-red-500" />
            ) : (
              <WifiOff size={20} className="text-yellow-500" />
            )}
            <div className="text-[10px] font-black uppercase text-slate-400">
              <div className="flex items-center gap-1">
                {isSyncing ? (
                  <>
                    <RefreshCw size={10} className="text-primary animate-spin" />
                    <span className="text-primary">Sincronizando...</span>
                  </>
                ) : cloudSyncStatus === 'synced' ? (
                  <>
                    <CheckCircle size={10} className="text-emerald-500" />
                    <span className="text-emerald-500">Sincronizado</span>
                  </>
                ) : cloudSyncStatus === 'conflict' ? (
                  <>
                    <AlertTriangle size={10} className="text-red-500" />
                    <span className="text-red-500">Erro de Conflito</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={10} className="text-yellow-500" />
                    <span className="text-yellow-500">Pendente</span>
                  </>
                )}
              </div>
              <div className="mt-1 text-[8px] text-slate-500">
                {menu.length} pratos • {categories.length} categorias
              </div>
              {lastSyncDetails && (
                <div className="mt-1 text-[8px] text-slate-500">
                  {lastSyncDetails.error ? `Erro: ${lastSyncDetails.error}` : 
                   `Atualizados: ${lastSyncDetails.categories?.updated || 0} cat, ${lastSyncDetails.products?.updated || 0} prod`}
                </div>
              )}
            </div>
          </div>
          
          {/* Botão de Sincronização Manual */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !settings.supabaseUrl || !settings.supabaseKey}
            className="px-6 py-3 bg-emerald-500 text-black rounded-2xl font-black text-xs uppercase shadow-glow hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>
        </div>
      </header>

      <section className="space-y-12">
        {/* Gestão de Categorias */}
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Tag size={18} className="text-primary" /> Visibilidade de Categorias
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => toggleCategoryVisibility(cat.id)}
                className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${cat.isVisibleDigital ? 'bg-primary/5 border-primary shadow-glow' : 'bg-white/5 border-white/5 opacity-40'}`}
              >
                <div className={`p-3 rounded-2xl ${cat.isVisibleDigital ? 'bg-primary text-black' : 'bg-slate-800 text-slate-500'}`}>
                  <Tag size={20} />
                </div>
                <span className="text-[10px] font-black uppercase text-center">{cat.name}</span>
                {cat.isVisibleDigital ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-red-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Gestão de Pratos */}
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Utensils size={18} className="text-primary" /> Disponibilidade de Pratos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {menu.map(dish => {
              const cat = categories.find(c => c.id === dish.categoryId);
              return (
                <div key={dish.id} className={`glass-panel p-6 rounded-[2.5rem] border transition-all flex items-center gap-6 ${dish.isVisibleDigital ? 'border-primary/20' : 'border-white/5 grayscale opacity-40'}`}>
                   <div className="w-24 h-24 rounded-3xl overflow-hidden relative">
                      <img src={dish.image} className="w-full h-full object-cover" alt="" />
                      {dish.isFeatured && <div className="absolute top-2 right-2 p-1.5 bg-yellow-500 text-black rounded-full shadow-lg"><Sparkles size={12}/></div>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{cat?.name}</p>
                      <h4 className="text-white font-bold truncate">{dish.name}</h4>
                      <p className="text-primary font-mono font-bold text-xs mt-1">{formatKz(dish.price)}</p>
                   </div>
                   <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => toggleDishVisibility(dish.id)}
                        className={`p-3 rounded-2xl transition-all ${dish.isVisibleDigital ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                        title="Visibilidade"
                      >
                        {dish.isVisibleDigital ? <Eye size={18}/> : <EyeOff size={18}/>}
                      </button>
                      <button 
                        onClick={() => toggleDishFeatured(dish.id)}
                        className={`p-3 rounded-2xl transition-all ${dish.isFeatured ? 'bg-yellow-500 text-black shadow-glow' : 'bg-white/5 text-slate-500'}`}
                        title="Destaque"
                      >
                        <Star size={18} fill={dish.isFeatured ? 'currentColor' : 'none'} />
                      </button>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DigitalMenuManager;




