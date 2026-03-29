const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Versão da aplicação
  getVersion: () => process.env.npm_package_version || '1.0.6',
  
  // Platform info
  platform: process.platform,
  
  // Funções utilitárias
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Notificações
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // DevTools sempre acessível
  openDevTools: () => ipcRenderer.invoke('open-devtools'),
  
  // App control
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  
  // Console logging para debugging
  log: (...args) => {
    console.log('[ELECTRON]', ...args);
  }
});

// Atalho global para DevTools
window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'I') {
    event.preventDefault();
    window.electronAPI.openDevTools();
  }
});

// Remover avisos de segurança
window.addEventListener('DOMContentLoaded', () => {
  console.log('[ELECTRON] App iniciada com sucesso');
  console.log('[ELECTRON] DevTools disponível via F12 ou Ctrl+Shift+I');
});
