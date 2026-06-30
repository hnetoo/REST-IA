/**
 * Preload script para Electron
 * Expõe APIs seguras para o renderer process
 */
const { contextBridge } = require('electron');

// Log de inicialização do preload
console.log('[PRELOAD] Script de preload carregado com sucesso');

// Expor APIs seguras se necessário no futuro
// contextBridge.exposeInMainWorld('electronAPI', { ... });
