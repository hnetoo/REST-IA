import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { initializeAGTService, defaultAGTConfig } from '../lib/agt/agtService';
import { getActiveInvoiceSeries, createInvoiceSeries, registerSeriesAtAGT } from '../lib/invoiceSequenceService';
import { 
  initializeAGTTestService, 
  getAGTTestService, 
  type AGTTestCredentials,
  type AGTEnvironment,
  AGT_ENVIRONMENTS 
} from '../lib/agt/agtTestService';

export default function AGTConfig() {
  const { settings, updateSettings } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [newSeries, setNewSeries] = useState({
    seriesCode: '',
    description: '',
    invoiceType: 'FT',
    year: new Date().getFullYear()
  });

  // Estados para teste AGT
  const [testCredentials, setTestCredentials] = useState<AGTTestCredentials[]>([]);
  const [selectedTestNIF, setSelectedTestNIF] = useState<string>('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<AGTEnvironment>('homologation');
  const [testApiKey, setTestApiKey] = useState<string>('');
  const [testApiUrl, setTestApiUrl] = useState<string>('');
  const [testConnectionResult, setTestConnectionResult] = useState<any>(null);
  const [testInvoiceResult, setTestInvoiceResult] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingInvoice, setIsTestingInvoice] = useState(false);

  useEffect(() => {
    loadSeries();
    initializeServices();
    initializeTestService();
    // Carregar ambiente dos settings
    if (settings.agtEnvironment) {
      setSelectedEnvironment(settings.agtEnvironment as AGTEnvironment);
      const testService = getAGTTestService();
      if (testService) {
        testService.setEnvironment(settings.agtEnvironment as AGTEnvironment);
      }
    }
  }, []);

  const initializeTestService = () => {
    const testService = initializeAGTTestService();
    setTestCredentials(testService.listTestCredentials());
  };

  const initializeServices = () => {
    // Inicializar serviço AGT
    const agtConfig = {
      apiUrl: defaultAGTConfig.apiUrl,
      apiKey: settings.agtCertificate || '',
      certificate: settings.agtProductionCertificate || '',
      production: settings.electronicInvoiceEnabled || false
    };
    initializeAGTService(agtConfig);

    // Inicializar serviço de assinatura
    if (settings.agtCertificate && settings.agtProductionCertificate) {
      // TODO: Implementar inicialização do serviço de assinatura quando necessário
      console.log('[AGT_CONFIG] Certificados disponíveis para assinatura digital');
    }
  };

  const loadSeries = async () => {
    try {
      const activeSeries = await getActiveInvoiceSeries();
      setSeries(activeSeries);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
    }
  };

  
  const handleCreateSeries = async () => {
    if (!newSeries.seriesCode || !newSeries.description) {
      alert('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const created = await createInvoiceSeries(
        newSeries.seriesCode,
        newSeries.description,
        newSeries.invoiceType
      );

      if (created) {
        alert('Série criada com sucesso!');
        setNewSeries({
          seriesCode: '',
          description: '',
          invoiceType: 'FT',
          year: new Date().getFullYear()
        });
        loadSeries();
      }
    } catch (error) {
      console.error('Erro ao criar série:', error);
      alert('Erro ao criar série');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSeries = async (seriesId: number, seriesCode: string) => {
    if (!confirm(`Registar série ${seriesCode} na AGT?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await registerSeriesAtAGT(
        seriesId,
        seriesCode,
        series.find(s => s.id === seriesId)?.description || '',
        series.find(s => s.id === seriesId)?.invoice_type || 'FT',
        newSeries.year,
        settings.nif || ''
      );

      if (success) {
        alert('Série registada na AGT com sucesso!');
        loadSeries();
      } else {
        alert('Erro ao registar série na AGT');
      }
    } catch (error) {
      console.error('Erro ao registar série:', error);
      alert('Erro ao registar série na AGT');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
    updateSettings(settings);
    initializeServices();
    alert('Configurações salvas com sucesso!');
  };

  // Handlers para teste AGT
  const handleSelectEnvironment = (environment: AGTEnvironment) => {
    setSelectedEnvironment(environment);
    updateSettings({ ...settings, agtEnvironment: environment });
    const testService = getAGTTestService();
    if (testService) {
      testService.setEnvironment(environment);
      setTestConnectionResult(null);
      setTestInvoiceResult(null);
      setSelectedTestNIF(''); // Reset NIF selection when environment changes
    }
  };

  const handleSelectTestNIF = (nif: string) => {
    setSelectedTestNIF(nif);
    const testService = getAGTTestService();
    if (testService) {
      testService.selectCredentials(nif);
      testService.setEnvironment(selectedEnvironment);
      testService.setCustomApiKey(testApiKey);
      testService.setCustomApiUrl(testApiUrl);
      setTestConnectionResult(null);
      setTestInvoiceResult(null);
    }
  };

  const handleUpdateApiConfig = () => {
    const testService = getAGTTestService();
    if (testService) {
      testService.setCustomApiKey(testApiKey);
      testService.setCustomApiUrl(testApiUrl);
    }
  };

  const handleTestAGTConnection = async () => {
    if (!selectedTestNIF) {
      alert('Selecione um NIF de teste primeiro');
      return;
    }

    setIsTestingConnection(true);
    setTestConnectionResult(null);

    try {
      // Garantir que o serviço esteja inicializado
      let testService = getAGTTestService();
      if (!testService) {
        testService = initializeAGTTestService();
      }

      // Configurar o serviço com os valores atuais
      testService.setEnvironment(selectedEnvironment);
      testService.setCustomApiKey(testApiKey);
      testService.setCustomApiUrl(testApiUrl);
      testService.selectCredentials(selectedTestNIF);

      const result = await testService.testConnection();
      setTestConnectionResult(result);
    } catch (error) {
      console.error('Erro ao testar conexão AGT:', error);
      setTestConnectionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestAGTInvoice = async () => {
    if (!selectedTestNIF) {
      alert('Selecione um NIF de teste primeiro');
      return;
    }

    setIsTestingInvoice(true);
    setTestInvoiceResult(null);

    try {
      // Garantir que o serviço esteja inicializado
      let testService = getAGTTestService();
      if (!testService) {
        testService = initializeAGTTestService();
      }

      // Configurar o serviço com os valores atuais
      testService.setEnvironment(selectedEnvironment);
      testService.setCustomApiKey(testApiKey);
      testService.setCustomApiUrl(testApiUrl);
      testService.selectCredentials(selectedTestNIF);

      const result = await testService.testInvoiceRegistration({
        documentNo: `FT TEST/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`,
        documentType: 'FT',
        documentDate: new Date().toISOString().split('T')[0],
        customerTaxID: '999999999',
        grossTotal: 5000
      });
      setTestInvoiceResult(result);
    } catch (error) {
      console.error('Erro ao testar registo de fatura:', error);
      setTestInvoiceResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTestingInvoice(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Configuração AGT Angola</h1>

      {/* Certificação AGT */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Certificação AGT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Número de Certificado de Software
            </label>
            <input
              type="text"
              value={settings.agtCertificate}
              onChange={(e) => updateSettings({ ...settings, agtCertificate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: AGT-2025-0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Certificado de Produção
            </label>
            <input
              type="text"
              value={settings.agtProductionCertificate}
              onChange={(e) => updateSettings({ ...settings, agtProductionCertificate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Certificado digital AGT"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Número de Processo
            </label>
            <input
              type="text"
              value={settings.agtProcessNumber}
              onChange={(e) => updateSettings({ ...settings, agtProcessNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Número de processo AGT"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Data de Certificação
            </label>
            <input
              type="date"
              value={settings.agtCertificationDate}
              onChange={(e) => updateSettings({ ...settings, agtCertificationDate: e.target.value })}
              placeholder="Data de certificação AGT"
              aria-label="Data de certificação AGT"
              title="Data de certificação AGT"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Assinatura Digital */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Assinatura Digital</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Senha SAFT
            </label>
            <input
              type="password"
              value={settings.saftPassword}
              onChange={(e) => updateSettings({ ...settings, saftPassword: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Senha para arquivo SAFT"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.digitalSignatureEnabled}
                onChange={(e) => updateSettings({ ...settings, digitalSignatureEnabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Assinatura Digital Habilitada</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.electronicInvoiceEnabled}
                onChange={(e) => updateSettings({ ...settings, electronicInvoiceEnabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Facturação Eletrónica Habilitada</span>
            </label>
          </div>
        </div>
      </div>

      {/* Teste AGT - Faturação Eletrónica */}
      <div className="mt-8 border-t pt-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Teste Faturação Eletrónica AGT</h2>

        {/* Seleção de Ambiente */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-medium mb-3">Selecionar Ambiente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(AGT_ENVIRONMENTS) as AGTEnvironment[]).map((env) => (
              <button
                key={env}
                onClick={() => handleSelectEnvironment(env)}
                className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  selectedEnvironment === env
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 bg-white hover:border-purple-400'
                }`}
              >
                <div className="font-semibold text-sm">{AGT_ENVIRONMENTS[env].name}</div>
                <div className="text-xs text-gray-600 mt-1">{AGT_ENVIRONMENTS[env].description}</div>
                <div className="text-xs text-gray-500 mt-1">{AGT_ENVIRONMENTS[env].apiUrl}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuração API */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-medium mb-3">Configuração API AGT</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                API Key
              </label>
              <input
                type="text"
                value={testApiKey}
                onChange={(e) => {
                  setTestApiKey(e.target.value);
                  handleUpdateApiConfig();
                }}
                placeholder="Insira a API Key fornecida pela AGT"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                URL da API
              </label>
              <input
                type="text"
                value={testApiUrl}
                onChange={(e) => {
                  setTestApiUrl(e.target.value);
                  handleUpdateApiConfig();
                }}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Se não fornecidos, serão usados os valores padrão do ambiente selecionado.
            Campos são atualizados automaticamente ao digitar.
          </p>
        </div>

        {/* Seleção de NIF de Teste */}
        {selectedEnvironment === 'homologation' && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-3">Selecionar NIF de Teste (Homologação)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testCredentials.map((cred) => (
                <button
                  key={cred.nif}
                  onClick={() => handleSelectTestNIF(cred.nif)}
                  className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                    selectedTestNIF === cred.nif
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <div className="font-semibold text-sm">{cred.nif}</div>
                  <div className="text-xs text-gray-600 mt-1">{cred.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedEnvironment === 'production' && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-200">
            <h3 className="font-medium mb-2 text-yellow-800">⚠️ Ambiente de Produção</h3>
            <p className="text-sm text-yellow-700">
              Para usar o ambiente de produção, você precisa:
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside mt-2">
              <li>Certificação oficial do software pela AGT</li>
              <li>Chaves RSA de produção da empresa</li>
              <li>NIF oficial da empresa</li>
            </ul>
            <p className="text-xs text-yellow-600 mt-2">
              Este ambiente envia faturas reais para a AGT.
            </p>
          </div>
        )}

        {/* Teste de Conexão */}
        {selectedTestNIF && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-3">Teste de Conexão AGT</h3>
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handleTestAGTConnection}
                disabled={isTestingConnection}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
              </button>
              {testConnectionResult && (
                <div className={`text-sm ${testConnectionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testConnectionResult.success ? '✅' : '❌'} {testConnectionResult.message}
                </div>
              )}
            </div>
            {testConnectionResult && testConnectionResult.timestamp && (
              <div className="text-xs text-gray-500">
                Timestamp: {new Date(testConnectionResult.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Teste de Registo de Fatura */}
        {selectedTestNIF && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-3">Teste de Registo de Fatura</h3>
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handleTestAGTInvoice}
                disabled={isTestingInvoice}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {isTestingInvoice ? 'Testando...' : 'Testar Registo de Fatura'}
              </button>
              {testInvoiceResult && (
                <div className={`text-sm ${testInvoiceResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testInvoiceResult.success ? '✅' : '❌'} {testInvoiceResult.message}
                </div>
              )}
            </div>
            {testInvoiceResult && testInvoiceResult.requestID && (
              <div className="text-xs text-gray-500">
                Request ID: {testInvoiceResult.requestID} | 
                Código Validação: {testInvoiceResult.validationCode}
              </div>
            )}
          </div>
        )}

        {/* Informação de Chaves */}
        {selectedTestNIF && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-blue-800">Credenciais Selecionadas</h3>
            <div className="text-sm text-blue-700">
              <div><strong>Ambiente:</strong> {AGT_ENVIRONMENTS[selectedEnvironment].name}</div>
              <div><strong>Endpoint:</strong> {testApiUrl || AGT_ENVIRONMENTS[selectedEnvironment].apiUrl}</div>
              <div><strong>API Key:</strong> {testApiKey ? 'Fornecida' : 'Não fornecida'}</div>
              <div><strong>NIF:</strong> {selectedTestNIF}</div>
              <div><strong>Nome:</strong> {testCredentials.find(c => c.nif === selectedTestNIF)?.name}</div>
              <div className="mt-2 text-xs">
                <strong>Chave Privada:</strong> {testCredentials.find(c => c.nif === selectedTestNIF)?.privateKey.substring(0, 50)}...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Séries de Faturas */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Séries de Faturas</h2>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex items-end gap-4">
            <input
              type="text"
              value={newSeries.seriesCode}
              onChange={(e) => setNewSeries({ ...newSeries, seriesCode: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: FT 2025"
            />
            <input
              type="text"
              value={newSeries.description}
              onChange={(e) => setNewSeries({ ...newSeries, description: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Descrição"
            />
            <select
              value={newSeries.invoiceType}
              onChange={(e) => setNewSeries({ ...newSeries, invoiceType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
              aria-label="Tipo de fatura"
              title="Selecione o tipo de fatura"
            >
              <option value="FT">Fatura Normal (FT)</option>
              <option value="FR">Fatura Rectificativa (FR)</option>
              <option value="ND">Nota de Débito (ND)</option>
              <option value="NC">Nota de Crédito (NC)</option>
            </select>
            <button
              onClick={handleCreateSeries}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Criar Série
            </button>
          </div>
        </div>

        {/* Lista de Séries */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Código</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Descrição</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Estado AGT</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3 text-sm">{s.series_code}</td>
                  <td className="px-4 py-3 text-sm">{s.description}</td>
                  <td className="px-4 py-3 text-sm">{s.invoice_type}</td>
                  <td className="px-4 py-3 text-sm">
                    {s.agt_registered ? (
                      <span className="text-green-600 font-semibold">✅ Registado</span>
                    ) : (
                      <span className="text-orange-600 font-semibold">⏳ Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {!s.agt_registered && (
                      <button
                        onClick={() => handleRegisterSeries(s.id, s.series_code)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Registar AGT
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salvar Configurações */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
