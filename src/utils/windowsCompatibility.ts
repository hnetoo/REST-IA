/**
 * UTILITÁRIO DE COMPATIBILIDADE WINDOWS
 * Garante que todos os acessos a objetos do navegador sejam seguros
 */

// Verificação segura de objeto window
export const safeWindow = () => {
  return typeof window !== 'undefined' ? window : null;
};

// Verificação segura de localStorage
export const safeLocalStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

// Verificação segura de sessionStorage
export const safeSessionStorage = () => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
};

// Verificação segura de document
export const safeDocument = () => {
  if (typeof window !== 'undefined' && window.document) {
    return window.document;
  }
  return null;
};

// Verificação segura de navigator
export const safeNavigator = () => {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator;
  }
  return null;
};

// Funções seguras para localStorage
export const safeLocalStorageGet = (key: string): string | null => {
  try {
    const storage = safeLocalStorage();
    return storage ? storage.getItem(key) : null;
  } catch (error) {
    console.warn(`Erro ao ler localStorage key "${key}":`, error);
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    const storage = safeLocalStorage();
    if (storage) {
      storage.setItem(key, value);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Erro ao escrever localStorage key "${key}":`, error);
    return false;
  }
};

export const safeLocalStorageRemove = (key: string): boolean => {
  try {
    const storage = safeLocalStorage();
    if (storage) {
      storage.removeItem(key);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Erro ao remover localStorage key "${key}":`, error);
    return false;
  }
};

// Funções seguras para sessionStorage
export const safeSessionStorageGet = (key: string): string | null => {
  try {
    const storage = safeSessionStorage();
    return storage ? storage.getItem(key) : null;
  } catch (error) {
    console.warn(`Erro ao ler sessionStorage key "${key}":`, error);
    return null;
  }
};

export const safeSessionStorageSet = (key: string, value: string): boolean => {
  try {
    const storage = safeSessionStorage();
    if (storage) {
      storage.setItem(key, value);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Erro ao escrever sessionStorage key "${key}":`, error);
    return false;
  }
};

export const safeSessionStorageRemove = (key: string): boolean => {
  try {
    const storage = safeSessionStorage();
    if (storage) {
      storage.removeItem(key);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Erro ao remover sessionStorage key "${key}":`, error);
    return false;
  }
};

// Função segura para confirm dialogs
export const safeConfirm = (message: string): boolean => {
  try {
    const win = safeWindow();
    return win ? win.confirm(message) : false;
  } catch (error) {
    console.warn('Erro ao mostrar confirm dialog:', error);
    return false;
  }
};

// Função segura para alert
export const safeAlert = (message: string): void => {
  try {
    const win = safeWindow();
    if (win) {
      win.alert(message);
    }
  } catch (error) {
    console.warn('Erro ao mostrar alert:', error);
  }
};

// Função segura para abrir nova janela
export const safeOpen = (url: string, target: string = '_blank'): void => {
  try {
    const win = safeWindow();
    if (win) {
      win.open(url, target);
    }
  } catch (error) {
    console.warn('Erro ao abrir janela:', error);
  }
};

// Função segura para reload
export const safeReload = (): void => {
  try {
    const win = safeWindow();
    if (win && win.location) {
      win.location.reload();
    }
  } catch (error) {
    console.warn('Erro ao recarregar página:', error);
  }
};

// Função segura para criar elementos DOM
export const safeCreateElement = (tagName: string): HTMLElement | null => {
  try {
    const doc = safeDocument();
    return doc ? doc.createElement(tagName) : null;
  } catch (error) {
    console.warn(`Erro ao criar elemento "${tagName}":`, error);
    return null;
  }
};

// Função segura para adicionar event listeners
export const safeAddEventListener = (
  element: HTMLElement | Window,
  event: string,
  handler: EventListener
): void => {
  try {
    element.addEventListener(event, handler);
  } catch (error) {
    console.warn(`Erro ao adicionar event listener "${event}":`, error);
  }
};

// Função segura para remover event listeners
export const safeRemoveEventListener = (
  element: HTMLElement | Window,
  event: string,
  handler: EventListener
): void => {
  try {
    element.removeEventListener(event, handler);
  } catch (error) {
    console.warn(`Erro ao remover event listener "${event}":`, error);
  }
};

// Função segura para obter user agent
export const safeGetUserAgent = (): string => {
  try {
    const nav = safeNavigator();
    return nav ? nav.userAgent : 'Unknown';
  } catch (error) {
    console.warn('Erro ao obter user agent:', error);
    return 'Unknown';
  }
};

// Verificar se está em ambiente Windows
export const isWindows = (): boolean => {
  try {
    const userAgent = safeGetUserAgent();
    return userAgent.toLowerCase().includes('win');
  } catch (error) {
    return false;
  }
};

// Log de compatibilidade Windows
export const logWindowsCompatibility = (): void => {
  const windows = isWindows();
  console.log(`🪟 Compatibilidade Windows: ${windows ? 'DETECTADO' : 'Outro sistema'}`);
  console.log(`🌐 User Agent: ${safeGetUserAgent()}`);
  console.log(`💾 LocalStorage: ${safeLocalStorage() ? 'DISPONÍVEL' : 'INDISPONÍVEL'}`);
  console.log(`🗄️ SessionStorage: ${safeSessionStorage() ? 'DISPONÍVEL' : 'INDISPONÍVEL'}`);
};
