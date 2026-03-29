import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import './styles/index.css';

// Limpeza de emergência para remover vestígios de versões Next.js
if (!localStorage.getItem('v1_migration_done')) {
  localStorage.clear();
  localStorage.setItem('v1_migration_done', 'true');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
