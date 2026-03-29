import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App_tauri';
import './index.css';

console.log("1. Boot Iniciado");

// BOOT SEQUENCE COM TRY/CATCH
try {
  console.log("2. Renderizando App...");
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Container #root não encontrado');
  }
  
  const root = createRoot(container);
  root.render(<App />);
  console.log("3. App renderizada com sucesso");
  
} catch (error) {
  console.error("ERRO CRÍTICO NO BOOT:", error);
  
  // SE FOR O ERRO 'G', LIMPA E RECARREGA
  if (error instanceof ReferenceError && error.message.includes('Cannot access')) {
    console.log("4. Erro de inicialização detectado - limpando cache e recarregando...");
    localStorage.clear();
    window.location.reload();
  } else {
    // ERRO DESCONHECIDO - MOSTRA TELA DE ERRO
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background: #0f172a;
        color: white;
        text-align: center;
        padding: 20px;
      ">
        <div style="
          background: #1e293b;
          padding: 30px;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
        ">
          <h1 style="
            color: #ef4444;
            margin-bottom: 16px;
            font-size: 24px;
          ">Erro Crítico</h1>
          <p style="
            font-size: 16px;
            margin-bottom: 24px;
            line-height: 1.5;
          ">Ocorreu um erro ao inicializar a aplicação.</p>
          <details style="
            text-align: left;
            font-size: 14px;
            color: #94a3b8;
          ">
            <summary style="
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 8px;
            ">Detalhes Técnicos</summary>
            <div style="
              background: #0f172a;
              padding: 12px;
              border-radius: 6px;
              margin-top: 8px;
              font-family: monospace;
              font-size: 12px;
            ">${error.stack || error.message}</div>
          </details>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
          ">Recarregar</button>
        </div>
      </div>
    `;
  }
}
