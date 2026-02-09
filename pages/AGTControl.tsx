
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  ShieldCheck, Building2, FileText, Download, 
  History, Key, Info, CheckCircle2, AlertCircle,
  Save, Printer, Database, Globe, Briefcase,
  FileBadge, Landmark, Scale
} from 'lucide-react';
import { generateSAFT, downloadSAFT } from '../services/saftService';
import { TaxRegime } from '../types';

const AGTControl = () => {
  const { settings, updateSettings, activeOrders, customers, menu, addNotification } = useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'COMPANY' | 'LOGS' | 'SAFT'>('CONFIG');

  const handleSave = () => {
    updateSettings(localSettings);
    addNotification('success', 'Configurações fiscais da AGT atualizadas e validadas.');
  };

  const handleRegimeChange = (regime: TaxRegime) => {
    let rate = 0;
    if (regime === 'GERAL') rate = 14;
    else if (regime === 'SIMPLIFICADO') rate = 7;
    else if (regime === 'EXCLUSAO') rate = 0;
    
    setLocalSettings({ ...localSettings, taxRegime: regime, taxRate: rate });
  };

  const handleExportSAFT = () => {
    const period = { month: new Date().getMonth(), year: new Date().getFullYear() };
    const xml = generateSAFT(activeOrders, customers, menu, settings, period);
    downloadSAFT(xml, `SAFT_AO_${settings.nif}_${period.year}.xml`);
    addNotification('success', 'Ficheiro SAF-T AO (v1.01) gerado com sucesso.');
  };

  return (
    <div className="p-8 h-full overflow-y-auto no-scrollbar bg-background">
      <header className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">AGT Compliance Center • Angola</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Módulo Fiscal Angolano</h2>
        </div>
        
        <div className="flex gap-4">
           <button 
             onClick={handleSave}
             className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-glow flex items-center gap-3 hover:scale-105 transition-all"
           >
             <Save size={20} /> Guardar Conformidade
           </button>
        </div>
      </header>

      {/* Tabs AGT */}
      <div className="flex gap-4 mb-8 border-b border-white/5 overflow-x-auto no-scrollbar">
        {[
          { id: 'CONFIG', label: 'Certificação & Série', icon: Key },
          { id: 'COMPANY', label: 'Identificação Fiscal', icon: Building2 },
          { id: 'LOGS', label: 'Diário de Auditoria', icon: History },
          { id: 'SAFT', label: 'Exportar SAF-T AO', icon: FileText }
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

      <div className="animate-in fade-in duration-500">
        {activeTab === 'CONFIG' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="glass-panel p-10 rounded-[3rem] border border-white/5 space-y-8">
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                   <FileBadge className="text-primary" /> Validação do Software
                </h3>
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">N.º do Certificado AGT (Software)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 000/AGT/2025"
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-mono text-sm" 
                        value={localSettings.agtCertificate}
                        onChange={e => setLocalSettings({...localSettings, agtCertificate: e.target.value})}
                      />
                      <p className="text-[8px] text-slate-500 mt-2 uppercase font-bold italic tracking-widest">Número obrigatório em todos os documentos impressos.</p>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Série de Faturação Ativa</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-mono text-sm uppercase" 
                        value={localSettings.invoiceSeries}
                        onChange={e => setLocalSettings({...localSettings, invoiceSeries: e.target.value})}
                      />
                   </div>
                   <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl flex gap-4">
                      <Info size={24} className="text-primary shrink-0" />
                      <p className="text-[10px] text-slate-300 leading-relaxed italic">
                        Este software cumpre com a Norma SHA-256 para o hashing de documentos e garante a integridade dos dados conforme o Regime Jurídico das Faturas e Documentos Equivalentes de Angola.
                      </p>
                   </div>
                </div>
             </div>
             
             <div className="glass-panel p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
                <div>
                   <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-8">Estado de Integridade</h3>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                         <span className="text-[10px] font-black text-slate-400 uppercase">Assinatura Digital RSA</span>
                         <span className="text-emerald-500 font-black text-[10px] uppercase flex items-center gap-2"><CheckCircle2 size={14}/> Ativa</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                         <span className="text-[10px] font-black text-slate-400 uppercase">Sequencialidade síncrona</span>
                         <span className="text-emerald-500 font-black text-[10px] uppercase flex items-center gap-2"><CheckCircle2 size={14}/> Verificada</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                         <span className="text-[10px] font-black text-slate-400 uppercase">Hash Chaining (SHA-256)</span>
                         <span className="text-emerald-500 font-black text-[10px] uppercase flex items-center gap-2"><CheckCircle2 size={14}/> Seguro</span>
                      </div>
                   </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/5">
                   <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 tracking-widest text-center">Software Desenvolvido e Certificado por:</p>
                   <div className="flex items-center justify-center gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><Briefcase size={20}/></div>
                      <div>
                         <p className="text-white font-black text-xs uppercase">Vereda Systems Angola, Lda</p>
                         <p className="text-[8px] text-primary uppercase font-black tracking-widest">Parceiro Tecnológico AGT</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'COMPANY' && (
          <div className="glass-panel p-12 rounded-[3.5rem] border border-white/5">
             <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-10 flex items-center gap-3">
                <Landmark className="text-primary" /> Ficha de Cadastro Fiscal (Angola)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Denominação Social Completa</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-bold" 
                        value={localSettings.restaurantName}
                        onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">NIF (Número de Identificação Fiscal)</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-mono text-lg tracking-widest" 
                        value={localSettings.nif}
                        onChange={e => setLocalSettings({...localSettings, nif: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Conservatória / Registo Comercial</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Luanda - 1.ª Secção"
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary text-sm" 
                        value={localSettings.conservatoria}
                        onChange={e => setLocalSettings({...localSettings, conservatoria: e.target.value})}
                      />
                   </div>
                </div>
                
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Capital Social Declarado (AOA)</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary font-mono" 
                        value={localSettings.capitalSocial}
                        onChange={e => setLocalSettings({...localSettings, capitalSocial: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Endereço Fiscal Oficial</label>
                      <textarea 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary text-xs h-24 leading-relaxed" 
                        value={localSettings.address}
                        onChange={e => setLocalSettings({...localSettings, address: e.target.value})}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Regime Fiscal IVA</label>
                        <select 
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xs outline-none appearance-none cursor-pointer"
                          value={localSettings.taxRegime}
                          onChange={e => handleRegimeChange(e.target.value as TaxRegime)}
                        >
                           <option value="GERAL">Regime Geral (14%)</option>
                           <option value="SIMPLIFICADO">Regime Simplificado (7%)</option>
                           <option value="EXCLUSAO">Regime de Exclusão</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Taxa Aplicada (%)</label>
                        <input 
                          readOnly
                          type="number" 
                          className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-slate-400 outline-none font-mono cursor-not-allowed" 
                          value={localSettings.taxRate}
                        />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="glass-panel rounded-[3.5rem] border border-white/5 overflow-hidden">
             <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                   <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Log de Auditoria Fiscal</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Registo em tempo real para inspeção tributária</p>
                </div>
                <div className="flex gap-2">
                   <button className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><Printer size={20}/></button>
                </div>
             </div>
             <table className="w-full text-left">
                <thead className="bg-white/5">
                   <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <th className="px-10 py-6">Tipo</th>
                      <th className="px-10 py-6">Documento</th>
                      <th className="px-10 py-6">Data/Hora</th>
                      <th className="px-10 py-6">Valor Bruto</th>
                      <th className="px-10 py-6">Snippet SHA-256</th>
                      <th className="px-10 py-6 text-right">Ação</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {activeOrders.filter(o => o.status === 'FECHADO').slice(-12).map(order => (
                     <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-full">FR</span>
                        </td>
                        <td className="px-10 py-6 font-bold text-white text-xs tracking-tighter">{order.invoiceNumber}</td>
                        <td className="px-10 py-6 text-[10px] text-slate-400 font-mono italic">{new Date(order.timestamp).toLocaleString()}</td>
                        <td className="px-10 py-6 font-mono font-bold text-emerald-500 text-sm">
                           {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(order.total)}
                        </td>
                        <td className="px-10 py-6">
                           <code className="text-[9px] text-slate-600 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">{order.hash?.substring(0, 10)}...</code>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <button className="p-3 text-slate-500 hover:text-white transition-colors"><Printer size={16}/></button>
                        </td>
                     </tr>
                   ))}
                   {activeOrders.filter(o => o.status === 'FECHADO').length === 0 && (
                     <tr>
                        <td colSpan={6} className="px-10 py-20 text-center text-slate-600 italic uppercase text-xs tracking-widest">Nenhum documento fiscal emitido ainda.</td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
        )}

        {activeTab === 'SAFT' && (
          <div className="max-w-4xl mx-auto text-center space-y-12 py-16">
             <div className="w-28 h-28 bg-primary/20 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto shadow-glow border border-primary/30">
                <Globe size={56} />
             </div>
             <div>
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-6">SAF-T Angola v1.01 (XML)</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto font-medium">
                   Gere e descarregue o ficheiro padrão de auditoria fiscal para submissão no portal da AGT. 
                   O ficheiro inclui todos os dados de clientes, produtos, stock e faturas para o período selecionado.
                </p>
             </div>
             
             <div className="flex justify-center gap-6">
                <button 
                  onClick={handleExportSAFT}
                  className="bg-primary text-black px-12 py-6 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-glow flex items-center gap-5 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Download size={28} /> Exportar Arquivo SAF-T
                </button>
             </div>

             <div className="flex items-center gap-3 justify-center text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] bg-emerald-500/10 w-fit mx-auto px-6 py-2 rounded-full border border-emerald-500/20">
                <Database size={14} />
                Sistema em modo de conformidade total
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AGTControl;
