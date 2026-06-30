import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import CertificationService from '../lib/certificationService';
import ContribuinteClassificationService from '../lib/contribuinteClassificationService';
import { initializeAGTRealService, getAGTRealService } from '../lib/agt/agtRealService';
import { jsPDF } from 'jspdf';

export default function CertificationDashboard() {
  const { settings } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'certification' | 'classification'>('overview');
  const [certificationStatus, setCertificationStatus] = useState<any>(null);
  const [complianceReport, setComplianceReport] = useState<string>('');
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isInitializingAGT, setIsInitializingAGT] = useState(false);

  useEffect(() => {
    // Verificar status da certificação ao carregar
    const status = CertificationService.verificarPreparacaoCertificacao();
    setCertificationStatus(status);
  }, []);

  const handleGenerateComplianceReport = () => {
    setIsGeneratingDocs(true);
    try {
      const report = CertificationService.gerarRelatorioConformidade();
      setComplianceReport(report);
      
      // Gerar PDF profissional
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;
      let y = 25;
      let pageNum = 1;
      
      const lines = report.split('\n');
      doc.setFont('courier', 'normal');
      
      for (const line of lines) {
        if (y > pageHeight - 25) {
          // Rodape com numero de pagina
          doc.setFontSize(8);
          doc.text(`REST IA v1.1.2 - Relatorio de Conformidade AGT | Pagina ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          doc.addPage();
          pageNum++;
          y = 25;
          // Cabecalho
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text('REST IA v1.1.2 | hnetoo@gmail.com | +244 923 068 301', pageWidth / 2, 12, { align: 'center' });
          doc.setTextColor(0);
          doc.setFontSize(10);
        }
        
        // Linhas de separador (===) em destaque
        if (line.startsWith('===') || line.startsWith('---')) {
          doc.setFontSize(9);
          doc.setTextColor(6, 182, 212);
          doc.text(line.substring(0, Math.min(line.length, 95)), margin, y);
          doc.setTextColor(0);
          doc.setFontSize(10);
        } else {
          doc.setFontSize(10);
          // Quebrar linhas longas
          const wrappedLines = doc.splitTextToSize(line, maxWidth);
          for (const wl of wrappedLines) {
            if (y > pageHeight - 25) {
              doc.setFontSize(8);
              doc.text(`REST IA v1.1.2 - Relatorio de Conformidade AGT | Pagina ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
              doc.addPage();
              pageNum++;
              y = 25;
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text('REST IA v1.1.2 | hnetoo@gmail.com | +244 923 068 301', pageWidth / 2, 12, { align: 'center' });
              doc.setTextColor(0);
              doc.setFontSize(10);
            }
            doc.text(wl, margin, y);
            y += 4.5;
          }
        }
        y += 1.5;
      }
      
      // Rodape da ultima pagina
      doc.setFontSize(8);
      doc.text(`REST IA v1.1.2 - Relatorio de Conformidade AGT | Pagina ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AGT_Relatorio_Conformidade_REST_IA_v1.1.2.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleGenerateTechnicalDocumentation = () => {
    setIsGeneratingDocs(true);
    try {
      const docs = CertificationService.gerarDocumentacaoTecnica();
      
      // Gerar PDF profissional
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;
      let y = 25;
      let pageNum = 1;
      
      const lines = docs.split('\n');
      doc.setFont('courier', 'normal');
      
      for (const line of lines) {
        if (y > pageHeight - 25) {
          doc.setFontSize(8);
          doc.text(`REST IA v1.1.2 - Documentacao Tecnica | Pagina ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          doc.addPage();
          pageNum++;
          y = 25;
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text('REST IA v1.1.2 | hnetoo@gmail.com | +244 923 068 301', pageWidth / 2, 12, { align: 'center' });
          doc.setTextColor(0);
          doc.setFontSize(10);
        }
        
        if (line.startsWith('===') || line.startsWith('---')) {
          doc.setFontSize(9);
          doc.setTextColor(6, 182, 212);
          doc.text(line.substring(0, Math.min(line.length, 95)), margin, y);
          doc.setTextColor(0);
          doc.setFontSize(10);
        } else {
          doc.setFontSize(10);
          const wrappedLines = doc.splitTextToSize(line, maxWidth);
          for (const wl of wrappedLines) {
            if (y > pageHeight - 25) {
              doc.setFontSize(8);
              doc.text(`REST IA v1.1.2 - Documentacao Tecnica | Pagina ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
              doc.addPage();
              pageNum++;
              y = 25;
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text('REST IA v1.1.2 | hnetoo@gmail.com | +244 923 068 301', pageWidth / 2, 12, { align: 'center' });
              doc.setTextColor(0);
              doc.setFontSize(10);
            }
            doc.text(wl, margin, y);
            y += 4.5;
          }
        }
        y += 1.5;
      }
      
      doc.setFontSize(8);
      doc.text(`REST IA v1.1.2 - Documentacao Tecnica | Pagina ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Documentacao_Tecnica_REST_IA_v1.1.2.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Erro ao gerar documentação:', error);
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleInitializeAGTReal = () => {
    if (!settings.agtProductionCertificate || !settings.agtApiKey) {
      alert('Configure o certificado e API key da AGT nas configurações primeiro.');
      return;
    }

    setIsInitializingAGT(true);
    try {
      // Inicializar serviço AGT real
      const agtConfig = {
        apiUrl: settings.agtApiUrl || (settings.agtProductionMode ? 
          'https://agt.minfin.gov.ao/api/v1' : 
          'https://agt-sandbox.minfin.gov.ao/api/v1'),
        apiKey: settings.agtApiKey || '',
        certificate: settings.agtProductionCertificate || '',
        production: settings.agtProductionMode || false
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

  return (
    <div className="p-6 h-full overflow-y-auto no-scrollbar bg-[#070b14]">
      <h1 className="text-4xl font-bold mb-6 text-white flex items-center gap-3">
        <span className="text-[#06b6d4]">🏆</span> Dashboard de Certificação AGT
      </h1>

      {/* Tabs de Navegação */}
      <div className="flex space-x-4 mb-6 border-b border-white/5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-4 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative ${activeTab === 'overview' ? 'text-[#06b6d4]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Visão Geral
          {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#06b6d4] rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-2 px-4 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative ${activeTab === 'compliance' ? 'text-[#06b6d4]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Conformidade
          {activeTab === 'compliance' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#06b6d4] rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('certification')}
          className={`pb-2 px-4 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative ${activeTab === 'certification' ? 'text-[#06b6d4]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Certificação
          {activeTab === 'certification' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#06b6d4] rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('classification')}
          className={`pb-2 px-4 font-black uppercase text-[10px] tracking-[0.2em] transition-all relative ${activeTab === 'classification' ? 'text-[#06b6d4]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Classificação
          {activeTab === 'classification' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#06b6d4] rounded-full"></div>}
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-[#06b6d4]/20">
            <h3 className="text-lg font-bold mb-3 text-white">Status da Certificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Nível de Conformidade</p>
                <p className={`text-2xl font-bold ${certificationStatus?.score >= 90 ? 'text-green-500' : certificationStatus?.score >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {certificationStatus?.score || 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <p className={`text-lg font-semibold ${certificationStatus?.ready ? 'text-green-500' : 'text-yellow-500'}`}>
                  {certificationStatus?.ready ? '✅ PRONTO PARA CERTIFICAÇÃO' : '🔄 PENDENTE AJUSTES'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-green-500/20">
            <h3 className="text-lg font-bold mb-3 text-white">Ações Imediatas</h3>
            <div className="space-y-3">
              <button
                onClick={handleInitializeAGTReal}
                disabled={isInitializingAGT}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-600 font-semibold text-xs uppercase tracking-widest"
              >
                {isInitializingAGT ? 'Inicializando...' : '🚀 Iniciar AGT Real'}
              </button>
              <button
                onClick={handleTestAGTConnection}
                className="w-full px-4 py-3 bg-[#06b6d4] text-black rounded-lg hover:bg-[#06b6d4]/80 font-semibold text-xs uppercase tracking-widest"
              >
                🔗 Testar Conexão AGT
              </button>
            </div>
          </div>

          {certificationStatus?.issues && certificationStatus.issues.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
              <h3 className="text-lg font-bold mb-3 text-white">Questões Pendentes</h3>
              <div className="space-y-2">
                {certificationStatus.issues.map((issue: string, index: number) => (
                  <div key={index} className="text-red-400">{issue}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h3 className="text-lg font-bold mb-3 text-white">Relatório de Conformidade</h3>
            <div className="space-y-4">
              <button
                onClick={handleGenerateComplianceReport}
                disabled={isGeneratingDocs}
                className="w-full px-4 py-3 bg-[#06b6d4] text-black rounded-lg hover:bg-[#06b6d4]/80 disabled:bg-gray-600 font-semibold text-xs uppercase tracking-widest"
              >
                {isGeneratingDocs ? 'Gerando...' : '📋 Gerar Relatório de Conformidade (PDF)'}
              </button>
              
              {complianceReport && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap">{complianceReport}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-[#06b6d4]/20">
            <h3 className="text-lg font-bold mb-3 text-white">Documentação Técnica</h3>
            <div className="space-y-4">
              <button
                onClick={handleGenerateTechnicalDocumentation}
                disabled={isGeneratingDocs}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-600 font-semibold text-xs uppercase tracking-widest"
              >
                {isGeneratingDocs ? 'Gerando...' : '📄 Gerar Documentação Técnica (PDF)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'certification' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-yellow-500/20">
            <h3 className="text-lg font-bold mb-3 text-white">Processo de Certificação</h3>
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">Pré-requisitos:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li>Software funcional e testado</li>
                  <li>Documentação técnica completa</li>
                  <li>Relatório de conformidade ≥ 90%</li>
                  <li>Ambiente de teste configurado</li>
                </ul>
              </div>
              
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">Etapas do Processo:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
                  <li><strong>Submissão Formal:</strong> Entregar documentação à AGT</li>
                  <li><strong>Análise Técnica:</strong> Verificação de conformidade</li>
                  <li><strong>Testes de Homologação:</strong> Validação em ambiente real</li>
                  <li><strong>Emissão do Certificado:</strong> Certificado digital oficial</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classification' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-purple-500/20">
            <h3 className="text-lg font-bold mb-3 text-white">Classificação de Contribuintes</h3>
            <div className="space-y-4">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">Limites AGT (2025-2026)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-white">Grande Contribuinte:</p>
                    <p className="text-slate-400">≥ 350 milhões Kz/ano</p>
                    <p className="text-slate-500">(RFGC e Fornecedores do Estado)</p>
                  </div>
                  <div>
                    <p className="font-bold text-white">Regime Simplificado:</p>
                    <p className="text-slate-400">25M - 350M Kz/ano</p>
                    <p className="text-slate-500">(Outros contribuintes)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">Fases de Obrigatoriedade:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-[#06b6d4] rounded-full"></div>
                    <span className="text-slate-400"><strong>Fase 1:</strong> Jan/2026 - Grandes Contribuintes + Fornecedores do Estado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-slate-400"><strong>Fase 2:</strong> Set/2026 - Todos os Contribuintes</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <h4 className="font-bold mb-2 text-white">Requisitos Específicos:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li><strong>Comunicação Tempo Real:</strong> Transmissão imediata de faturas</li>
                  <li><strong>SAFT Mensal:</strong> Envio até 10/Abril</li>
                  <li><strong>Inventários:</strong> Envio até 15/Fevereiro</li>
                  <li><strong>Auto-faturação:</strong> Limite 20% (até 40% para essenciais)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
