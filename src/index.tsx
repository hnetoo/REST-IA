import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import './styles/index.css';

// Limpeza de emergência para remover vestígios de versões Next.js
if (!localStorage.getItem('v1_migration_done')) {
  localStorage.clear();
  localStorage.setItem('v1_migration_done', 'true');
}

// Desregistar todos os Service Workers (evita cache de ficheiros built antigos em dev)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      console.log('[INDEX] Desregistando Service Worker:', reg.scope);
      reg.unregister();
    });
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
