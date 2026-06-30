import React, { useState, useEffect } from 'react';
import { Printer, Settings, Wifi, Usb, Bluetooth, Check, X, TestTube, Save } from 'lucide-react';
import ThermalPrinterManager, { ThermalPrinterConfig } from '../lib/thermalPrinterConfig';

const PrinterConfig = () => {
  const [selectedConfig, setSelectedConfig] = useState<ThermalPrinterConfig | null>(null);
  const [customConfig, setCustomConfig] = useState<Partial<ThermalPrinterConfig>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const printerManager = ThermalPrinterManager;
  const availableConfigs = printerManager.getAvailableConfigs();

  useEffect(() => {
    const saved = printerManager.getConfig();
    if (saved) {
      setSelectedConfig(saved);
    }
  }, []);

  const handleConfigSelect = (config: ThermalPrinterConfig) => {
    setSelectedConfig(config);
    setIsCustomMode(false);
    setTestResult(null);
  };

  const handleCustomConfigChange = (field: keyof ThermalPrinterConfig, value: any) => {
    setCustomConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    const config = isCustomMode ? { ...DEFAULT_CONFIG, ...customConfig } as ThermalPrinterConfig : selectedConfig;
    if (!config) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const success = await printerManager.testConnection(config);
      setTestResult({
        success,
        message: success ? 'Conexão estabelecida com sucesso!' : 'Falha na conexão com a impressora'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro ao testar conexão'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    const config = isCustomMode ? { ...DEFAULT_CONFIG, ...customConfig } as ThermalPrinterConfig : selectedConfig;
    if (!config) return;

    printerManager.setConfig(config);
    alert('Configuração salva com sucesso!');
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'network': return <Wifi className="w-4 h-4" />;
      case 'bluetooth': return <Bluetooth className="w-4 h-4" />;
      case 'usb': return <Usb className="w-4 h-4" />;
      default: return <Printer className="w-4 h-4" />;
    }
  };

  const DEFAULT_CONFIG: ThermalPrinterConfig = {
    id: 'custom',
    name: 'Impressora Personalizada',
    model: '',
    connectionType: 'usb',
    paperWidth: 80,
    charactersPerLine: 42,
    encoding: 'CP850',
    autoCut: true,
    headerLines: [],
    footerLines: [],
    qrCodeEnabled: true,
    fiscalEnabled: true
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
          <Printer className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configuração de Impressora Térmica</h1>
          <p className="text-sm text-gray-400">Configure sua impressora para recibos e faturas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista de Impressoras Disponíveis */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Impressoras Disponíveis</h2>
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isCustomMode 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {isCustomMode ? 'Selecionar' : 'Personalizar'}
            </button>
          </div>

          {!isCustomMode ? (
            <div className="space-y-3">
              {availableConfigs.map((config) => (
                <div
                  key={config.id}
                  onClick={() => handleConfigSelect(config)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedConfig?.id === config.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        {getConnectionIcon(config.connectionType)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{config.name}</div>
                        <div className="text-sm text-gray-400">
                          {config.paperWidth}mm • {config.charactersPerLine} caracteres/linha
                        </div>
                      </div>
                    </div>
                    {selectedConfig?.id === config.id && (
                      <Check className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Impressora</label>
                <input
                  type="text"
                  value={customConfig.name || ''}
                  onChange={(e) => handleCustomConfigChange('name', e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500"
                  placeholder="Ex: Minha Impressora"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Modelo</label>
                <input
                  type="text"
                  value={customConfig.model || ''}
                  onChange={(e) => handleCustomConfigChange('model', e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500"
                  placeholder="Ex: EPSON_TM-T20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Conexão</label>
                <select
                  value={customConfig.connectionType || 'usb'}
                  onChange={(e) => handleCustomConfigChange('connectionType', e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="usb">USB</option>
                  <option value="network">Rede</option>
                  <option value="bluetooth">Bluetooth</option>
                </select>
              </div>

              {(customConfig.connectionType === 'network' || customConfig.connectionType === 'bluetooth') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {customConfig.connectionType === 'network' ? 'Endereço IP' : 'Endereço MAC'}
                  </label>
                  <input
                    type="text"
                    value={customConfig.address || ''}
                    onChange={(e) => handleCustomConfigChange('address', e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500"
                    placeholder={customConfig.connectionType === 'network' ? '192.168.1.100' : '00:11:22:33:44:55'}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Largura do Papel (mm)</label>
                  <select
                    value={customConfig.paperWidth || 80}
                    onChange={(e) => handleCustomConfigChange('paperWidth', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value={58}>58mm</option>
                    <option value={80}>80mm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Caracteres por Linha</label>
                  <select
                    value={customConfig.charactersPerLine || 42}
                    onChange={(e) => handleCustomConfigChange('charactersPerLine', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value={32}>32</option>
                    <option value={42}>42</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={customConfig.autoCut !== false}
                    onChange={(e) => handleCustomConfigChange('autoCut', e.target.checked)}
                    className="rounded"
                  />
                  Corte Automático
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={customConfig.qrCodeEnabled !== false}
                    onChange={(e) => handleCustomConfigChange('qrCodeEnabled', e.target.checked)}
                    className="rounded"
                  />
                  QR Code
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Detalhes e Testes */}
        <div className="space-y-6">
          {/* Detalhes da Configuração */}
          {(selectedConfig || isCustomMode) && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detalhes da Configuração</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Modelo:</span>
                  <span className="text-white">
                    {(isCustomMode ? customConfig : selectedConfig)?.model || 'Não especificado'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Conexão:</span>
                  <span className="text-white capitalize">
                    {(isCustomMode ? customConfig : selectedConfig)?.connectionType}
                  </span>
                </div>
                {(isCustomMode ? customConfig : selectedConfig)?.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Endereço:</span>
                    <span className="text-white">{(isCustomMode ? customConfig : selectedConfig)?.address}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Papel:</span>
                  <span className="text-white">{(isCustomMode ? customConfig : selectedConfig)?.paperWidth}mm</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Caracteres/Linha:</span>
                  <span className="text-white">{(isCustomMode ? customConfig : selectedConfig)?.charactersPerLine}</span>
                </div>
              </div>

              {/* Teste de Conexão */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4" />
                      Testar Conexão
                    </>
                  )}
                </button>

                {testResult && (
                  <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                    testResult.success 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Salvar Configuração */}
              <div className="mt-4">
                <button
                  onClick={handleSaveConfig}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Configuração
                </button>
              </div>
            </div>
          )}

          {/* Informações Adicionais */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Informações Importantes</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p>• Certifique-se de que a impressora está ligada e conectada antes de testar</p>
              <p>• Para impressoras USB, o driver deve estar instalado no sistema</p>
              <p>• Para impressoras de rede, verifique se o IP está correto e acessível</p>
              <p>• A largura de 58mm é ideal para recibos simples, 80mm para faturas detalhadas</p>
              <p>• O QR Code é útil para validação fiscal e rastreamento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrinterConfig;
