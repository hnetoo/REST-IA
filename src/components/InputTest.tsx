/**
 * 🔬 COMPONENTE DE TESTE ISOLADO PARA DIAGNOSTICAR INPUTS BLOQUEADOS
 * 
 * Este componente testa inputs fora da lógica de autenticação/rotas
 * para identificar se o problema é global ou específico de componentes.
 */
import React, { useState, useRef, useEffect } from 'react';

const InputTest: React.FC = () => {
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const renderCount = useRef(0);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  renderCount.current++;

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  // Monitorar foco dos inputs
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        addLog(`🎯 FOCO no input: ${target.id || 'sem-id'}`);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        addLog(`👋 BLUR no input: ${target.id || 'sem-id'}`);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const handleInput1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[INPUT TEST] ✏️ onChange Input 1:', e.target.value);
    addLog(`✏️ Input 1: "${e.target.value}"`);
    setValue1(e.target.value);
  };

  const handleInput2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[INPUT TEST] ✏️ onChange Input 2:', e.target.value);
    addLog(`✏️ Input 2: "${e.target.value}"`);
    setValue2(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent, inputName: string) => {
    console.log(`[INPUT TEST] ⌨️ KeyDown ${inputName}:`, e.key);
    addLog(`⌨️ ${inputName} Key: ${e.key}`);
  };

  return (
    <div style={{ padding: '20px', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '20px', color: '#06b6d4' }}>
        🔬 Teste de Inputs - Isolado
      </h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '8px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#888' }}>
          Render count: {renderCount.current} | Logs: {logs.length}
        </p>
        
        {/* Input 1 - Padrão */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Input 1 (Texto simples):
          </label>
          <input
            ref={inputRef1}
            id="test-input-1"
            type="text"
            value={value1}
            onChange={handleInput1}
            onKeyDown={(e) => handleKeyDown(e, 'Input1')}
            placeholder="Digite aqui..."
            style={{
              padding: '10px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#333',
              color: '#fff',
              fontSize: '16px'
            }}
          />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888' }}>
            Valor: "{value1}" | Length: {value1.length}
          </p>
        </div>

        {/* Input 2 - Número */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Input 2 (Número):
          </label>
          <input
            ref={inputRef2}
            id="test-input-2"
            type="number"
            value={value2}
            onChange={handleInput2}
            onKeyDown={(e) => handleKeyDown(e, 'Input2')}
            placeholder="Digite número..."
            style={{
              padding: '10px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#333',
              color: '#fff',
              fontSize: '16px'
            }}
          />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888' }}>
            Valor: "{value2}" | Number: {Number(value2) || 0}
          </p>
        </div>
      </div>

      {/* Logs */}
      <div style={{ 
        padding: '15px', 
        background: '#0a0a0a', 
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '14px' }}>📋 Logs:</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Aguardando interação...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ 
              marginBottom: '4px',
              color: log.includes('✏️') ? '#4ade80' : log.includes('⌨️') ? '#60a5fa' : '#888'
            }}>
              {log}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '14px' }}>
          ⚠️ Instruções de Teste:
        </h3>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
          <li>Digite nos inputs acima por 10-15 minutos</li>
          <li>Verifique se os caracteres aparecem normalmente</li>
          <li>Observe se há delay ou bloqueio</li>
          <li>Verifique os logs no console do navegador (F12)</li>
          <li>Se funcionar aqui mas não no app, o problema é em outro componente</li>
        </ol>
      </div>
    </div>
  );
};

export default InputTest;
