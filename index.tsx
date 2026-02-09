
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import { sqliteService } from './services/sqliteService';

const boot = async () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  // Primeiro inicializamos a base de dados
  await sqliteService.init().catch(err => {
    console.warn("Aviso na Base de Dados (usando fallback LocalStorage):", err);
  });

  const root = createRoot(rootElement);

  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Falha fatal na abertura da aplicação:", error);
    document.body.innerHTML = `
      <div style="background:#070b14; color:#fff; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
        <h1 style="color:#06b6d4; font-size: 2rem; margin-bottom: 1rem; font-weight: 800; text-transform: uppercase;">Erro de Sistema</h1>
        <p style="margin-bottom: 2rem; opacity: 0.8; max-width: 400px;">A aplicação não conseguiu carregar os componentes principais. Verifique a ligação à internet ou o ficheiro de configuração.</p>
        <div style="background:#111827; padding:20px; border-radius:15px; border:1px solid #334155; margin-bottom: 2rem; max-width: 600px; width: 100%; overflow: auto;">
          <code style="color: #ef4444; font-family: monospace; font-size: 12px;">${error instanceof Error ? error.message : String(error)}</code>
        </div>
        <button onclick="location.reload()" style="background:#06b6d4; color: #000; border:none; padding:15px 40px; border-radius:12px; cursor:pointer; font-weight:bold; text-transform: uppercase; letter-spacing: 1px; transition: 0.3s; box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);">Tentar Novamente</button>
      </div>
    `;
  }
};

boot();
