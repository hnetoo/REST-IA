import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { generateSAFT, downloadSAFT } from '../lib/saftService';
import { getAGTComplianceStats } from '../lib/agt/agtComplianceLogService';
import { initializeAGTRealService, getAGTRealService } from '../lib/agt/agtRealService';
import { TaxRegime } from '../../types';
import { supabase } from '../supabase_standalone';

export default function ComplianceReports() {
  const { settings, updateSettings, activeOrders, customers, products } = useStore();
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [reports, setReports] = useState<any[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [stockSummary, setStockSummary] = useState<any>(null);
  const [complianceSummary, setComplianceSummary] = useState<any>(null);
  const [agtStats, setAgtStats] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializingAGT, setIsInitializingAGT] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    loadSummaries();
  }, [selectedPeriod]);

  const loadSummaries = async () => {
    // Simplificado - apenas carregar estatísticas AGT
    const startDate = `${selectedPeriod.year}-${(selectedPeriod.month + 1).toString().padStart(2, '0')}-01`;
    const lastDay = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0).getDate();
    const endDate = `${selectedPeriod.year}-${(selectedPeriod.month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    const agtStatistics = await getAGTComplianceStats(startDate, endDate);
    setAgtStats(agtStatistics);
  };

  const fetchOrdersFromSupabase = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['closed', 'FECHADO'])
        .not('invoice_number', 'is', null);

      if (ordersError) {
        console.error('[COMPLIANCE] Erro ao buscar orders:', ordersError);
        return [];
      }

      console.log('[COMPLIANCE] Orders do Supabase:', ordersData?.length || 0);
      return ordersData || [];
    } catch (error) {
      console.error('[COMPLIANCE] Erro ao buscar orders do Supabase:', error);
      return [];
    }
  };

  const handleGenerateSAFT = async () => {
    if (!settings?.nif) {
      alert('Configure o NIF nas configurações primeiro.');
      return;
    }

    setIsGenerating(true);
    try {
      // Buscar orders do Supabase em vez de usar activeOrders do store
      const supabaseOrders = await fetchOrdersFromSupabase();
      
      // Debug: Verificar orders disponíveis
      const closedOrders = supabaseOrders.filter(o => 
        (o.status === 'closed' || o.status === 'FECHADO') && 
        (o.invoice_number || o.invoiceNumber)
      );
      
      console.log('[COMPLIANCE] Debug SAFT:', {
        totalOrders: supabaseOrders.length,
        closedOrders: closedOrders.length,
        selectedPeriod: selectedPeriod,
        ordersInPeriod: closedOrders.filter(o => {
          const orderDate = new Date(o.created_at || o.timestamp);
          return orderDate.getMonth() === selectedPeriod.month &&
                 orderDate.getFullYear() === selectedPeriod.year;
        }).length
      });
      
      // Usar orders do Supabase com products do store
      const xml = await generateSAFT(supabaseOrders, customers, products, settings, { 
        month: selectedPeriod.month, 
        year: selectedPeriod.year 
      });
      downloadSAFT(xml, `SAFT_AO_${settings.nif}_${selectedPeriod.year}_${(selectedPeriod.month + 1).toString().padStart(2, '0')}.xml`);
      
      console.log('[COMPLIANCE] SAFT gerado com sucesso:', { 
        period: selectedPeriod,
        ordersCount: supabaseOrders.length,
        customersCount: customers.length,
        productsCount: products.length 
      });
      
      alert('SAFT gerado com sucesso! Verifique o download.');
    } catch (error) {
      console.error('Erro ao gerar SAFT:', error);
      alert('Erro ao gerar SAFT: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInitializeAGTReal = () => {
    if (!localSettings.agtProductionCertificate || !localSettings.agtApiKey) {
      alert('Configure o certificado e API key da AGT primeiro.');
      return;
    }

    setIsInitializingAGT(true);
    try {
      const agtConfig = {
        apiUrl: localSettings.agtApiUrl || (localSettings.agtProductionMode ? 
          'https://agt.minfin.gov.ao/api/v1' : 
          'https://agt-sandbox.minfin.gov.ao/api/v1'),
        apiKey: localSettings.agtApiKey || '',
        certificate: localSettings.agtProductionCertificate || '',
        production: localSettings.agtProductionMode || false
      };

      initializeAGTRealService(agtConfig);
      alert('Serviço AGT real inicializado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar AGT real:', error);
      alert('Erro ao inicializar AGT real. Verifique as configurações.');
    } finally {
      setIsInitializingAGT(false);
    }
  };

  const handleTestAGTConnection = async () => {
    const agtService = getAGTRealService();
    if (!agtService) {
      alert('Inicialize o serviço AGT primeiro.');
      return;
    }

    try {
      const result = await agtService.testConnection();
      if (result.success) {
        alert(`✅ Conexão com AGT estabelecida!\nVersão do servidor: ${result.serverVersion}`);
      } else {
        alert(`❌ Falha na conexão com AGT:\n${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      alert('Erro ao testar conexão com AGT.');
    }
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = selectedPeriod.month + delta;
    let newYear = selectedPeriod.year;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setSelectedPeriod({ month: newMonth, year: newYear });
  };

  const handleRegimeChange = (regime: TaxRegime) => {
    let rate = 0;
    if (regime === 'GERAL') rate = 14;
    else if (regime === 'SIMPLIFICADO') rate = 7;
    else if (regime === 'EXCLUSAO') rate = 0;
    
    setLocalSettings({ ...localSettings, taxRegime: regime, taxRate: rate });
  };

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    alert('Configurações AGT atualizadas com sucesso!');
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div className="p-6 h-full overflow-y-auto no-scrollbar bg-[#070b14]">
      <h1 className="text-4xl font-bold mb-6 text-white flex items-center gap-3">
        <span className="text-[#06b6d4]">📋</span> Relatórios de Conformidade AGT
      </h1>

      {/* Configuração AGT */}
      <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/5">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-[#06b6d4]">🔧</span> Configuração AGT
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">API Key</label>
            <input 
              type="text" 
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#06b6d4] font-mono text-sm" 
              value={localSettings.agtApiKey || ''}
              onChange={e => setLocalSettings({...localSettings, agtApiKey: e.target.value})}
              placeholder="Chave de API AGT"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">URL da API</label>
            <input 
              type="text" 
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#06b6d4] font-mono text-sm" 
              value={localSettings.agtApiUrl || ''}
              onChange={e => setLocalSettings({...localSettings, agtApiUrl: e.target.value})}
              placeholder="https://agt.minfin.gov.ao/api/v1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Certificado Digital</label>
            <input 
              type="text" 
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#06b6d4] font-mono text-sm" 
              value={localSettings.agtProductionCertificate || ''}
              onChange={e => setLocalSettings({...localSettings, agtProductionCertificate: e.target.value})}
              placeholder="Certificado AGT"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Modo Produção</label>
            <select 
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#06b6d4] text-sm"
              value={localSettings.agtProductionMode ? 'true' : 'false'}
              onChange={e => setLocalSettings({...localSettings, agtProductionMode: e.target.value === 'true'})}
              title="Selecione o modo de operação"
            >
              <option value="false">Sandbox (Teste)</option>
              <option value="true">Produção</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Regime Fiscal IVA</label>
            <select 
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-[#06b6d4] text-sm"
              value={localSettings.taxRegime}
              onChange={e => handleRegimeChange(e.target.value as TaxRegime)}
              title="Selecione o regime fiscal"
            >
              <option value="GERAL">Regime Geral (14%)</option>
              <option value="SIMPLIFICADO">Regime Simplificado (7%)</option>
              <option value="EXCLUSAO">Regime de Exclusão (0%)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Taxa Aplicada (%)</label>
            <input 
              readOnly
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white/50 outline-none font-mono text-sm cursor-not-allowed" 
              value={localSettings.taxRate}
              placeholder="Taxa automática"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-[#06b6d4] text-black rounded-lg hover:bg-[#06b6d4]/80 font-semibold text-xs uppercase tracking-widest"
          >
            Guardar Configurações
          </button>
          <button
            onClick={handleInitializeAGTReal}
            disabled={isInitializingAGT}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-600 font-semibold text-xs uppercase tracking-widest"
          >
            {isInitializingAGT ? 'Inicializando...' : '🚀 Iniciar AGT Real'}
          </button>
          <button
            onClick={handleTestAGTConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-xs uppercase tracking-widest"
          >
            🔗 Testar Conexão
          </button>
        </div>
      </div>

      {/* Seleção de Período */}
      <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleMonthChange(-1)}
            className="px-4 py-2 bg-[#06b6d4] text-black rounded-lg hover:bg-[#06b6d4]/80 font-semibold text-xs uppercase tracking-widest"
          >
            ← Anterior
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              {monthNames[selectedPeriod.month]} {selectedPeriod.year}
            </h2>
          </div>
          <button
            onClick={() => handleMonthChange(1)}
            className="px-4 py-2 bg-[#06b6d4] text-black rounded-lg hover:bg-[#06b6d4]/80 font-semibold text-xs uppercase tracking-widest"
          >
            Próximo →
          </button>
        </div>
      </div>

      {/* Estatísticas de Conformidade */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-[#06b6d4]/20">
          <h3 className="text-sm font-semibold text-[#06b6d4] mb-2">Comunicações AGT</h3>
          <p className="text-2xl font-bold text-white">{agtStats?.total || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-green-500/20">
          <h3 className="text-sm font-semibold text-green-500 mb-2">Taxa de Sucesso</h3>
          <p className="text-2xl font-bold text-white">{agtStats?.successRate?.toFixed(1) || 0}%</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-red-500/20">
          <h3 className="text-sm font-semibold text-red-500 mb-2">Erros AGT</h3>
          <p className="text-2xl font-bold text-white">{agtStats?.error || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-purple-500/20">
          <h3 className="text-sm font-semibold text-purple-500 mb-2">Logs de Auditoria</h3>
          <p className="text-2xl font-bold text-white">{complianceSummary?.audit_logs || 0}</p>
        </div>
      </div>

      {/* Resumo de Faturas */}
      {invoiceSummary && (
        <div className="glass-panel rounded-2xl p-6 mb-8 border border-white/5">
          <h3 className="text-lg font-semibold mb-4 text-white">Resumo de Faturas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-400">Total de Faturas</p>
              <p className="text-xl font-bold text-white">{invoiceSummary.total_invoices}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Valor Total</p>
              <p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(invoiceSummary.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total de IVA</p>
              <p className="text-xl font-bold text-white">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(invoiceSummary.total_tax)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Faturas FT</p>
              <p className="text-xl font-bold text-white">{invoiceSummary.by_type?.FT || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumo de Stock */}
      {stockSummary && (
        <div className="glass-panel rounded-2xl p-6 mb-8 border border-white/5">
          <h3 className="text-lg font-semibold mb-4 text-white">Resumo de Stock</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-400">Total de Movimentos</p>
              <p className="text-xl font-bold text-white">{stockSummary.total_movements}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Entradas</p>
              <p className="text-xl font-bold text-green-500">{stockSummary.entries}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Saídas</p>
              <p className="text-xl font-bold text-red-500">{stockSummary.exits}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Ajustes</p>
              <p className="text-xl font-bold text-orange-500">{stockSummary.adjustments}</p>
            </div>
          </div>
        </div>
      )}

      {/* Relatórios Gerados */}
      <div className="glass-panel rounded-2xl p-6 mb-8 border border-white/5">
        <h3 className="text-lg font-semibold mb-4 text-white">Relatórios Gerados</h3>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">Período</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">Gerado em</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-400">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-sm text-white">{report.report_type}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{report.period_start} a {report.period_end}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{new Date(report.generated_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {report.status === 'GENERATED' && (
                      <span className="text-green-500 font-semibold">Gerado</span>
                    )}
                    {report.status === 'UPLOADED' && (
                      <span className="text-[#06b6d4] font-semibold">Enviado</span>
                    )}
                    {report.status === 'FAILED' && (
                      <span className="text-red-500 font-semibold">Falha</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{report.file_size ? `${(report.file_size / 1024).toFixed(2)} KB` : '-'}</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhum relatório gerado para este período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botão Gerar SAFT */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerateSAFT}
          disabled={isGenerating}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold disabled:bg-gray-600 text-xs uppercase tracking-widest"
        >
          {isGenerating ? 'Gerando...' : 'Gerar Relatório SAFT'}
        </button>
      </div>
    </div>
  );
}
