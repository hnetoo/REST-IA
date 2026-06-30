import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase_standalone';
import {
  ShieldCheck, Globe, Key, FileText, Send, CheckCircle2,
  AlertCircle, Loader2, Save, Download, RefreshCw, Zap,
  Building2, Clock, TrendingUp, Info, Server, Cpu, Lock,
  FileCheck, Wifi, WifiOff, ChevronRight, Eye, EyeOff,
  Settings as SettingsIcon, Plus
} from 'lucide-react';
import { generateSAFT, downloadSAFT } from '../lib/saftService';
import { getActiveInvoiceSeries, createInvoiceSeries, registerSeriesAtAGT } from '../lib/invoiceSequenceService';
import { initializeAGTRealService, getAGTRealService } from '../lib/agt/agtRealService';
import { logAGTCompliance } from '../lib/agt/agtComplianceLogService';

type Environment = 'test' | 'production';

interface EInvoiceConfig {
  environment: Environment;
  testApiUrl: string;
  productionApiUrl: string;
  testApiKey: string;
  productionApiKey: string;
  testCertificate: string;
  productionCertificate: string;
  nif: string;
  taxRegime: string;
  taxRate: number;
  invoiceSeries: string;
  agtCertificateNumber: string;
  autoSubmit: boolean;
  lastConnectionTest: string | null;
  lastInvoiceSubmission: string | null;
}

const DEFAULT_CONFIG: EInvoiceConfig = {
  environment: 'test',
  testApiUrl: 'https://homologacao.agt.minfin.gov.ao/api/v1',
  productionApiUrl: 'https://agt.minfin.gov.ao/api/v1',
  testApiKey: '',
  productionApiKey: '',
  testCertificate: '',
  productionCertificate: '',
  nif: '',
  taxRegime: 'GERAL',
  taxRate: 14,
  invoiceSeries: 'FT2026',
  agtCertificateNumber: '',
  autoSubmit: false,
  lastConnectionTest: null,
  lastInvoiceSubmission: null
};

const EInvoicePanel = () => {
  const { settings, updateSettings, addNotification, activeOrders, customers, menu } = useStore();
  const [config, setConfig] = useState<EInvoiceConfig>(() => {
    const saved = localStorage.getItem('einvoice_config');
    if (saved) {
      try { return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch (_) {}
    }
    return {
      ...DEFAULT_CONFIG,
      nif: settings.nif || '',
      taxRegime: settings.taxRegime || 'GERAL',
      taxRate: settings.taxRate || 14,
      invoiceSeries: settings.invoiceSeries || 'FT2026',
      agtCertificateNumber: settings.agtCertificate || ''
    };
  });

  const [showKeys, setShowKeys] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'config' | 'series' | 'test' | 'logs' | 'saft'>('config');
  const [newSeries, setNewSeries] = useState({
    seriesCode: '',
    description: '',
    invoiceType: 'FT'
  });
  const [submittingSeries, setSubmittingSeries] = useState(false);

  useEffect(() => {
    loadSeries();
    loadLogs();
  }, []);

  const loadSeries = async () => {
    setLoadingSeries(true);
    try {
      const data = await getActiveInvoiceSeries();
      setSeries(data || []);
    } catch (error) {
      console.error('[E-INVOICE] Erro ao carregar séries:', error);
    } finally {
      setLoadingSeries(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('agt_compliance_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data);
      }
    } catch (error) {
      console.error('[E-INVOICE] Erro ao carregar logs:', error);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('einvoice_config', JSON.stringify(config));
    updateSettings({
      ...settings,
      nif: config.nif,
      taxRegime: config.taxRegime as any,
      taxRate: config.taxRate,
      invoiceSeries: config.invoiceSeries,
      agtCertificate: config.agtCertificateNumber,
      electronicInvoiceEnabled: config.environment === 'production'
    });

    const apiUrl = config.environment === 'test' ? config.testApiUrl : config.productionApiUrl;
    const apiKey = config.environment === 'test' ? config.testApiKey : config.productionApiKey;
    const cert = config.environment === 'test' ? config.testCertificate : config.productionCertificate;

    initializeAGTRealService({
      apiUrl,
      apiKey,
      certificate: cert,
      production: config.environment === 'production'
    });

    addNotification('success', 'Configuração de faturação eletrónica guardada!');
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const apiUrl = config.environment === 'test' ? config.testApiUrl : config.productionApiUrl;
      const apiKey = config.environment === 'test' ? config.testApiKey : config.productionApiKey;

      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-AGT-Environment': config.environment,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      const result: any = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
        environment: config.environment,
        apiUrl: apiUrl
      };

      if (response.ok) {
        result.message = 'Conexão estabelecida com sucesso!';
        result.icon = 'success';
        addNotification('success', `Conexão AGT (${config.environment === 'test' ? 'Homologação' : 'Produção'}) estabelecida!`);
      } else {
        result.message = `Servidor respondeu com erro ${response.status}`;
        result.icon = 'error';
        addNotification('error', `Erro na conexão AGT: ${response.status}`);
      }

      setTestResult(result);
      setConfig({ ...config, lastConnectionTest: new Date().toISOString() });
      localStorage.setItem('einvoice_config', JSON.stringify({ ...config, lastConnectionTest: new Date().toISOString() }));

      await logAGTCompliance({
        log_type: 'CONNECTION_TEST',
        status: response.ok ? 'SUCCESS' : 'ERROR',
        request_data: { environment: config.environment, apiUrl },
        response_data: result,
        error_message: response.ok ? undefined : result.message
      });

      loadLogs();
    } catch (error: any) {
      const result = {
        ok: false,
        message: error?.message || 'Erro de conexão',
        timestamp: new Date().toISOString(),
        environment: config.environment,
        icon: 'error'
      };
      setTestResult(result);
      addNotification('error', `Falha na conexão AGT: ${error?.message || 'timeout'}`);

      await logAGTCompliance({
        log_type: 'CONNECTION_TEST',
        status: 'ERROR',
        request_data: { environment: config.environment },
        response_data: null,
        error_message: error?.message || 'Connection failed'
      });
      loadLogs();
    } finally {
      setTesting(false);
    }
  };

  const handleCreateSeries = async () => {
    if (!newSeries.seriesCode || !newSeries.description) {
      addNotification('error', 'Preencha código e descrição da série');
      return;
    }
    setSubmittingSeries(true);
    try {
      const created = await createInvoiceSeries(newSeries.seriesCode, newSeries.description, newSeries.invoiceType);
      if (created) {
        addNotification('success', 'Série criada com sucesso!');
        setNewSeries({ seriesCode: '', description: '', invoiceType: 'FT' });
        loadSeries();
      } else {
        addNotification('error', 'Erro ao criar série');
      }
    } catch (error) {
      addNotification('error', 'Erro ao criar série');
    } finally {
      setSubmittingSeries(false);
    }
  };

  const handleRegisterSeries = async (seriesId: number, seriesCode: string) => {
    if (!confirm(`Registar série ${seriesCode} na AGT (${config.environment === 'test' ? 'Homologação' : 'Produção'})?`)) return;
    setSubmittingSeries(true);
    try {
      const success = await registerSeriesAtAGT(
        seriesId,
        seriesCode,
        series.find(s => s.id === seriesId)?.description || '',
        series.find(s => s.id === seriesId)?.invoice_type || 'FT',
        new Date().getFullYear(),
        config.nif
      );

      if (success) {
        addNotification('success', `Série ${seriesCode} registada na AGT!`);
        loadSeries();
      } else {
        addNotification('error', 'Erro ao registar série na AGT');
      }
    } catch (error) {
      addNotification('error', 'Erro ao registar série');
    } finally {
      setSubmittingSeries(false);
    }
  };

  const handleExportSAFT = async () => {
    try {
      const period = { month: new Date().getMonth(), year: new Date().getFullYear() };
      const xml = await generateSAFT(activeOrders, customers, menu, settings, period);
      downloadSAFT(xml, `SAFT_AO_${config.nif}_${period.year}.xml`);
      addNotification('success', 'SAF-T AO (v1.01) gerado com sucesso!');
    } catch (error) {
      addNotification('error', 'Erro ao gerar SAF-T');
    }
  };

  const tabs = [
    { id: 'config' as const, label: 'Configuração', icon: SettingsIcon },
    { id: 'series' as const, label: 'Séries de Faturação', icon: FileText },
    { id: 'test' as const, label: 'Teste de Conexão', icon: Zap },
    { id: 'logs' as const, label: 'Logs de Auditoria', icon: Clock },
    { id: 'saft' as const, label: 'SAF-T AO', icon: Download }
  ];

  return (
    <div className="p-6 h-full overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[#06b6d4] mb-2">
          <ShieldCheck size={18} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">AGT • Faturação Eletrónica • Angola</span>
        </div>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Faturação Eletrónica</h2>
        <p className="text-slate-400 text-sm mt-1">Decreto Presidencial n.º 71/25 • Regime Jurídico das Faturas</p>
      </div>

      {/* Status Banner */}
      <div className={`glass-panel rounded-2xl p-4 mb-6 border ${config.environment === 'production' ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.environment === 'production' ? (
              <Server size={24} className="text-green-400" />
            ) : (
              <Cpu size={24} className="text-amber-400" />
            )}
            <div>
              <p className="text-white font-black text-sm uppercase tracking-widest">
                {config.environment === 'production' ? 'AMBIENTE DE PRODUÇÃO' : 'AMBIENTE DE HOMOLOGAÇÃO (TESTE)'}
              </p>
              <p className="text-xs text-slate-400">
                {config.environment === 'production'
                  ? 'Faturas reais enviadas em tempo real à AGT'
                  : 'Testes sem impacto fiscal • Use antes de ir para produção'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.lastConnectionTest ? (
              <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1.5">
                <Wifi size={12} /> Online
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1.5">
                <WifiOff size={12} /> Não testado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/5 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'text-[#06b6d4]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon size={14} /> {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#06b6d4] rounded-full"></div>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Environment Selector */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Globe size={20} className="text-[#06b6d4]" /> Ambiente
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setConfig({ ...config, environment: 'test' })}
                  className={`p-5 rounded-2xl border-2 transition-all text-left ${config.environment === 'test' ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Cpu size={20} className={config.environment === 'test' ? 'text-amber-400' : 'text-slate-500'} />
                    <span className="font-black text-white text-sm uppercase">Homologação</span>
                  </div>
                  <p className="text-xs text-slate-400">Testes sem impacto fiscal</p>
                </button>
                <button
                  onClick={() => setConfig({ ...config, environment: 'production' })}
                  className={`p-5 rounded-2xl border-2 transition-all text-left ${config.environment === 'production' ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Server size={20} className={config.environment === 'production' ? 'text-green-400' : 'text-slate-500'} />
                    <span className="font-black text-white text-sm uppercase">Produção</span>
                  </div>
                  <p className="text-xs text-slate-400">Faturas reais para AGT</p>
                </button>
              </div>
            </div>

            {/* API URLs */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Globe size={20} className="text-[#06b6d4]" /> URLs da API AGT
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">URL de Homologação (Teste)</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#06b6d4]"
                    value={config.testApiUrl}
                    onChange={e => setConfig({ ...config, testApiUrl: e.target.value })}
                    placeholder="https://homologacao.agt.minfin.gov.ao/api/v1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">URL de Produção</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#06b6d4]"
                    value={config.productionApiUrl}
                    onChange={e => setConfig({ ...config, productionApiUrl: e.target.value })}
                    placeholder="https://agt.minfin.gov.ao/api/v1"
                  />
                </div>
              </div>
            </div>

            {/* API Keys & Certificates */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Key size={20} className="text-[#06b6d4]" /> Chaves de API & Certificados
                </h3>
                <button onClick={() => setShowKeys(!showKeys)} className="text-slate-400 hover:text-white transition-colors" title={showKeys ? 'Ocultar' : 'Mostrar'}>
                  {showKeys ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">API Key — Homologação</label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#06b6d4]"
                    value={config.testApiKey}
                    onChange={e => setConfig({ ...config, testApiKey: e.target.value })}
                    placeholder="agt_test_xxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">API Key — Produção</label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#06b6d4]"
                    value={config.productionApiKey}
                    onChange={e => setConfig({ ...config, productionApiKey: e.target.value })}
                    placeholder="agt_prod_xxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Certificado Digital — Homologação</label>
                  <input
                    type={showCert ? 'text' : 'password'}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs outline-none focus:border-[#06b6d4]"
                    value={config.testCertificate}
                    onChange={e => setConfig({ ...config, testCertificate: e.target.value })}
                    placeholder="-----BEGIN CERTIFICATE-----"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Certificado Digital — Produção</label>
                  <input
                    type={showCert ? 'text' : 'password'}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs outline-none focus:border-[#06b6d4]"
                    value={config.productionCertificate}
                    onChange={e => setConfig({ ...config, productionCertificate: e.target.value })}
                    placeholder="-----BEGIN CERTIFICATE-----"
                  />
                  <button onClick={() => setShowCert(!showCert)} className="mt-2 text-[10px] text-slate-400 hover:text-white font-bold uppercase tracking-widest">
                    {showCert ? 'Ocultar certificados' : 'Mostrar certificados'}
                  </button>
                </div>
              </div>
            </div>

            {/* Fiscal Data */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-[#06b6d4]" /> Dados Fiscais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">NIF</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#06b6d4]"
                    value={config.nif}
                    onChange={e => setConfig({ ...config, nif: e.target.value })}
                    placeholder="5000000000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">N.º Certificado AGT</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm outline-none focus:border-[#06b6d4]"
                    value={config.agtCertificateNumber}
                    onChange={e => setConfig({ ...config, agtCertificateNumber: e.target.value })}
                    placeholder="000/AGT/2026"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Regime IVA</label>
                  <select
                    title="Regime de IVA"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]"
                    value={config.taxRegime}
                    onChange={e => {
                      const regime = e.target.value;
                      const rate = regime === 'GERAL' ? 14 : regime === 'SIMPLIFICADO' ? 7 : 0;
                      setConfig({ ...config, taxRegime: regime, taxRate: rate });
                    }}
                  >
                    <option value="GERAL" className="bg-slate-800">Regime Geral (14%)</option>
                    <option value="SIMPLIFICADO" className="bg-slate-800">Regime Simplificado (7%)</option>
                    <option value="EXCLUSAO" className="bg-slate-800">Regime de Exclusão (0%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Série Ativa</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm uppercase outline-none focus:border-[#06b6d4]"
                    value={config.invoiceSeries}
                    onChange={e => setConfig({ ...config, invoiceSeries: e.target.value })}
                    placeholder="FT2026"
                  />
                </div>
              </div>
            </div>

            {/* Auto-submit toggle */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Zap size={18} className="text-[#06b6d4]" /> Submissão Automática
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Enviar faturas à AGT em tempo real ao fechar venda</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, autoSubmit: !config.autoSubmit })}
                  title={config.autoSubmit ? 'Desativar submissão automática' : 'Ativar submissão automática'}
                  className={`relative w-14 h-7 rounded-full transition-all ${config.autoSubmit ? 'bg-[#06b6d4]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${config.autoSubmit ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="glass-panel rounded-2xl p-4 border border-[#06b6d4]/20 bg-[#06b6d4]/5">
              <div className="flex gap-3">
                <Info size={20} className="text-[#06b6d4] shrink-0" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">Requisitos AGT — Faturação Eletrónica</p>
                  <p>• <b>Decreto Presidencial n.º 71/25</b> — Regime Jurídico das Faturas</p>
                  <p>• <b>1 Jan 2026:</b> Grandes contribuintes e fornecedores do Estado</p>
                  <p>• <b>1 Jan 2027:</b> Todos os sujeitos passivos (Regime Geral e Simplificado)</p>
                  <p>• Software certificado pela AGT obrigatório</p>
                  <p>• Faturas emitidas em até 5 dias após o facto gerador</p>
                  <p>• Hash SHA-256 para integridade de documentos</p>
                  <p>• Notas de crédito para correções/cancelamentos</p>
                  <p>• Auto-faturação limitada a 20% dos custos totais</p>
                </div>
              </div>
            </div>

            <button
              onClick={saveConfig}
              className="w-full py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-sm tracking-widest shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> Guardar Configuração
            </button>
          </div>
        )}

        {/* SERIES TAB */}
        {activeTab === 'series' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <FileText size={20} className="text-[#06b6d4]" /> Nova Série de Faturação
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Código</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm uppercase outline-none focus:border-[#06b6d4]"
                    value={newSeries.seriesCode}
                    onChange={e => setNewSeries({ ...newSeries, seriesCode: e.target.value })}
                    placeholder="FT2026"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tipo</label>
                  <select
                    title="Tipo de documento fiscal"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]"
                    value={newSeries.invoiceType}
                    onChange={e => setNewSeries({ ...newSeries, invoiceType: e.target.value })}
                  >
                    <option value="FT" className="bg-slate-800">FT — Fatura</option>
                    <option value="FR" className="bg-slate-800">FR — Fatura-Recibo</option>
                    <option value="ND" className="bg-slate-800">ND — Nota de Débito</option>
                    <option value="NC" className="bg-slate-800">NC — Nota de Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Descrição</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#06b6d4]"
                    value={newSeries.description}
                    onChange={e => setNewSeries({ ...newSeries, description: e.target.value })}
                    placeholder="Faturas 2026"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateSeries}
                disabled={submittingSeries}
                className="mt-4 px-6 py-3 bg-[#06b6d4] text-black rounded-xl font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submittingSeries ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Criar Série
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Séries Registadas</h3>
                <button onClick={loadSeries} title="Recarregar séries" className="text-slate-400 hover:text-white transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>
              {loadingSeries ? (
                <div className="p-8 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-[#06b6d4]" />
                </div>
              ) : series.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma série registada</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {series.map(s => (
                    <div key={s.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-black font-mono">{s.series_code}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{s.invoice_type}</span>
                            {s.agt_registered ? (
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                                <CheckCircle2 size={10} /> AGT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Não Registada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                        </div>
                        {!s.agt_registered && (
                          <button
                            onClick={() => handleRegisterSeries(s.id, s.series_code)}
                            disabled={submittingSeries}
                            className="px-4 py-2 bg-[#06b6d4] text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send size={12} /> Registar AGT
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEST TAB */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Zap size={20} className="text-[#06b6d4]" /> Teste de Conexão com AGT
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Testa a conectividade com o servidor AGT no ambiente de{' '}
                <b className={config.environment === 'production' ? 'text-green-400' : 'text-amber-400'}>
                  {config.environment === 'production' ? 'Produção' : 'Homologação'}
                </b>
              </p>
              <button
                onClick={testConnection}
                disabled={testing}
                className="px-8 py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-sm tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {testing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>

            {testResult && (
              <div className={`glass-panel rounded-2xl p-6 border ${testResult.ok ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {testResult.ok ? (
                    <CheckCircle2 size={24} className="text-green-400" />
                  ) : (
                    <AlertCircle size={24} className="text-red-400" />
                  )}
                  <h4 className="text-lg font-black text-white">{testResult.ok ? 'Conexão Estabelecida' : 'Falha na Conexão'}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-white font-mono">{testResult.status || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ambiente:</span>
                    <span className="text-white">{testResult.environment === 'production' ? 'Produção' : 'Homologação'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">URL:</span>
                    <span className="text-white font-mono text-xs">{testResult.apiUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-white text-xs">{new Date(testResult.timestamp).toLocaleString('pt-AO')}</span>
                  </div>
                  <div className="mt-2 p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-slate-300">{testResult.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Checklist */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <FileCheck size={20} className="text-[#06b6d4]" /> Checklist de Conformidade
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'NIF configurado', done: !!config.nif },
                  { label: 'Certificado AGT preenchido', done: !!config.agtCertificateNumber },
                  { label: 'API Key configurada', done: !!(config.environment === 'test' ? config.testApiKey : config.productionApiKey) },
                  { label: 'URL da API definida', done: !!(config.environment === 'test' ? config.testApiUrl : config.productionApiUrl) },
                  { label: 'Série de faturação criada', done: series.length > 0 },
                  { label: 'Série registada na AGT', done: series.some(s => s.agt_registered) },
                  { label: 'Conexão testada', done: !!config.lastConnectionTest },
                  { label: 'Certificado digital configurado', done: !!(config.environment === 'test' ? config.testCertificate : config.productionCertificate) }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    {item.done ? (
                      <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-400 shrink-0" />
                    )}
                    <span className={`text-sm ${item.done ? 'text-white' : 'text-slate-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-[#06b6d4]" /> Logs de Auditoria AGT
              </h3>
              <button onClick={loadLogs} title="Recarregar logs" className="text-slate-400 hover:text-white transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Clock size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum log registado</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                          log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' :
                          log.status === 'ERROR' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-white font-bold">{log.log_type}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-AO') : '—'}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-400 mt-1">{log.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAFT TAB */}
        {activeTab === 'saft' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-white/5">
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Download size={20} className="text-[#06b6d4]" /> Exportar SAF-T AO
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Gera o ficheiro SAF-T AO (versão 1.01) conforme as normas da AGT para o mês corrente.
              </p>
              <button
                onClick={handleExportSAFT}
                className="px-8 py-4 bg-[#06b6d4] text-black rounded-2xl font-black uppercase text-sm tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Download size={20} /> Gerar SAF-T AO
              </button>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-[#06b6d4]/20 bg-[#06b6d4]/5">
              <div className="flex gap-3">
                <Info size={20} className="text-[#06b6d4] shrink-0" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">SAF-T AO — Safety Audit File Tax Angola</p>
                  <p>• Formato XML normalizado pela OCDE</p>
                  <p>• Versão 1.01 — padrão AGT</p>
                  <p>• Inclui: Header, MasterFiles (Clientes, Produtos, TaxTable), SourceDocuments (Invoices)</p>
                  <p>• Hash SHA-256 em cada fatura para integridade</p>
                  <p>• Obrigatório para auditoria fiscal</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EInvoicePanel;
