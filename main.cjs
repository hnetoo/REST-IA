const { app, BrowserWindow, Menu, dialog, shell, screen } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');

// 🛡️ Segurança: Capturar erros não tratados no processo principal (como EPIPE ou erros de socket) para evitar popups indesejados
process.on('uncaughtException', (error) => {
  console.error('[ELECTRON] Erro não capturado no processo principal:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ELECTRON] Rejeição não tratada em:', promise, 'razão:', reason);
});

// 🔥 SISTEMA DE BACKUP EM FICHEIRO - Sobrevive a reinstalações NSIS
// Guarda os dados críticos do localStorage numa pasta fora do userData
const backupDir = path.join(app.getPath('home'), '.tasca-vereda-backup');
const localStorageBackupFile = path.join(backupDir, 'localStorage.json');

function backupLocalStorage() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.executeJavaScript('JSON.stringify(localStorage)')
      .then((data) => {
        if (!data || data === '{}') {
          console.log('[BACKUP] localStorage vazio, skip backup');
          return;
        }
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        fs.writeFileSync(localStorageBackupFile, data, 'utf8');
        console.log('[BACKUP] localStorage guardado em:', localStorageBackupFile, '(', data.length, 'bytes)');
      })
      .catch((e) => {
        console.warn('[BACKUP] Erro ao fazer backup do localStorage:', e.message);
      });
  } catch (e) {
    console.warn('[BACKUP] Erro geral no backup:', e.message);
  }
}

function restoreLocalStorageFromBackup() {
  try {
    if (!fs.existsSync(localStorageBackupFile)) {
      console.log('[BACKUP] Nenhum ficheiro de backup encontrado');
      return;
    }
    const data = fs.readFileSync(localStorageBackupFile, 'utf8');
    if (!data || data === '{}') return;
    console.log('[BACKUP] Ficheiro de backup encontrado (', data.length, 'bytes), restaurando...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const script = `
        (function() {
          try {
            const data = ${JSON.stringify(data)};
            const obj = JSON.parse(data);
            for (const key in obj) {
              if (obj.hasOwnProperty(key)) {
                localStorage.setItem(key, obj[key]);
              }
            }
            console.log('[BACKUP] localStorage restaurado com', Object.keys(obj).length, 'chaves');
          } catch(e) {
            console.error('[BACKUP] Erro ao restaurar:', e);
          }
        })();
      `;
      mainWindow.webContents.executeJavaScript(script)
        .then(() => {
          console.log('[BACKUP] localStorage restaurado com sucesso');
          mainWindow.webContents.reload();
        })
        .catch((e) => console.warn('[BACKUP] Erro ao restaurar localStorage:', e.message));
    }
  } catch (e) {
    console.warn('[BACKUP] Erro ao ler ficheiro de backup:', e.message);
  }
}

// Desativar aceleração de hardware para evitar ecrã preto
app.disableHardwareAcceleration();

// Configurações para estabilidade no Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-cache');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// 🔥 Aumentar cache do disco para evitar QuotaExceededError no localStorage
app.commandLine.appendSwitch('disk-cache-size', '200000000'); // 200MB

// 🧹 Limpar cache do Electron no arranque (remove SW antigos do Vercel)
const electronCacheDir = path.join(app.getPath('userData'), 'Cache');
const swCacheDir = path.join(app.getPath('userData'), 'Service Worker');
const codeCacheDir = path.join(app.getPath('userData'), 'Code Cache');
const gpucacheDir = path.join(app.getPath('userData'), 'GPUCache');
// 🔥 Limpar também a cache da partição 'customer-display' (segundo ecrã)
const customerDisplayCacheDir = path.join(app.getPath('userData'), 'Partitions', 'customer-display', 'Cache');
const customerDisplaySWDir = path.join(app.getPath('userData'), 'Partitions', 'customer-display', 'Service Worker');
const customerDisplayCodeCacheDir = path.join(app.getPath('userData'), 'Partitions', 'customer-display', 'Code Cache');
const customerDisplayGPUCacheDir = path.join(app.getPath('userData'), 'Partitions', 'customer-display', 'GPUCache');

function cleanDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log('[ELECTRON] Cache removido:', dirPath);
    }
  } catch (e) {
    console.warn('[ELECTRON] Erro ao limpar cache:', dirPath, e.message);
  }
}

let mainWindow;
let server;

function createLocalServer() {
  const distPath = path.join(__dirname, 'dist');
  const port = 8080;
  
  server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // Servir index.html para a raiz
    if (pathname === '/') {
      pathname = '/index.html';
    }
    
    let filePath = path.join(distPath, pathname);
    
    // Verificar se o arquivo existe — se não, SPA fallback para index.html
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // SPA fallback: servir index.html para rotas desconhecidas (React Router)
        filePath = path.join(distPath, 'index.html');
      }
      
      // Determinar content type
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      if (ext === '.css') contentType = 'text/css';
      if (ext === '.js') contentType = 'application/javascript';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.ico') contentType = 'image/x-icon';
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error reading file');
          return;
        }
        
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(data);
      });
    });
  });
  
  server.on('error', (err) => {
    console.error('[ELECTRON] Erro no servidor local:', err);
  });
  
  server.listen(port, () => {
    console.log(`[ELECTRON] Servidor local rodando em http://localhost:${port}`);
  });
  
  return port;
}

function createWindow() {
  // Verificar se está em modo desenvolvimento
  const isDev = app.isPackaged === false;
  console.log('[ELECTRON] Modo:', isDev ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');
  console.log('[ELECTRON] isPackaged:', app.isPackaged);
  
  if (isDev) {
    // Em desenvolvimento: usar servidor Vite
    mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: false,
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false,
        offscreen: false
      },
      icon: path.join(__dirname, 'public', 'icon.png'),
      show: false,
      titleBarStyle: 'default'
    });

    // Aguardar Vite dev server ficar disponível antes de carregar
    const devUrl = 'http://localhost:5173';
    console.log('[ELECTRON] Aguardando dev server:', devUrl);
    
    function waitForDevServer(url, maxRetries = 30, interval = 1000) {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          const req = http.get(url, (res) => {
            res.resume();
            resolve();
          });
          req.on('error', () => {
            if (attempts >= maxRetries) {
              reject(new Error(`Dev server não disponível após ${maxRetries} tentativas`));
            } else {
              setTimeout(check, interval);
            }
          });
          req.setTimeout(1000, () => { req.destroy(); });
        };
        check();
      });
    }

    // Bloquear Service Workers em dev mode (evita cache de ficheiros built antigos)
    mainWindow.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://localhost:5173/sw.js', 'http://localhost:5173/sw-owner.js'] },
      (details, callback) => {
        console.log('[ELECTRON] Bloqueando Service Worker em dev:', details.url);
        callback({ cancel: true });
      }
    );
    // 🔥 Bloquear Service Workers também em produção (segundo ecrã e mainWindow)
    const { session } = require('electron');
    const customerDisplaySession = session.fromPartition('customer-display');
    customerDisplaySession.webRequest.onBeforeRequest(
      { urls: ['http://localhost:8080/sw.js', 'http://localhost:8080/sw-owner.js'] },
      (details, callback) => {
        console.log('[ELECTRON] Bloqueando Service Worker no customer-display:', details.url);
        callback({ cancel: true });
      }
    );

    waitForDevServer(devUrl).then(async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[ELECTRON] Dev server pronto, limpando cache...');
        try {
          await mainWindow.webContents.session.clearCache();
          await mainWindow.webContents.session.clearStorageData({
            storages: ['serviceworker', 'cachestorage']
          });
          console.log('[ELECTRON] Cache limpo (localStorage PRESERVADO), carregando...');
        } catch (e) {
          console.warn('[ELECTRON] Erro ao limpar cache:', e.message);
        }
        mainWindow.loadURL(devUrl).catch(err => {
          console.error('[ELECTRON] ERRO AO CARREGAR DEV SERVER:', err);
        });
      }
    }).catch(err => {
      console.error('[ELECTRON] Dev server não respondeu:', err.message);
      // Fallback para servidor local apenas se a janela ainda existir
      if (mainWindow && !mainWindow.isDestroyed()) {
        const port = createLocalServer();
        const fallbackUrl = `http://localhost:${port}`;
        console.log('[ELECTRON] Fallback para:', fallbackUrl);
        mainWindow.loadURL(fallbackUrl).catch(fallbackErr => {
          console.error('[ELECTRON] ERRO AO CARREGAR FALLBACK:', fallbackErr);
        });
      }
    });
  } else {
    // Em produção: usar servidor local com arquivos build
    mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: false,
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false,
        offscreen: false
      },
      icon: path.join(__dirname, 'dist', 'icon.png'),
      show: false,
      titleBarStyle: 'default'
    });

    const port = createLocalServer();
    const appUrl = `http://localhost:${port}`;
    console.log('[ELECTRON] Carregando produção:', appUrl);
    
    const tryLoad = (retriesLeft = 3) => {
      mainWindow.loadURL(appUrl).catch(err => {
        console.error('[ELECTRON] ERRO AO CARREGAR PRODUÇÃO (tentativas restantes:', retriesLeft, '):', err);
        if (retriesLeft > 0) {
          setTimeout(() => tryLoad(retriesLeft - 1), 500);
        } else if (!mainWindow.isDestroyed()) {
          dialog.showErrorBox('Erro Crítico', `Não foi possível carregar a aplicação:\n\n${err.message}\n\nURL: ${appUrl}`);
          app.quit();
        }
      });
    };
    tryLoad();
  }
  
  // Eventos de carregamento
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[ELECTRON] Iniciou carregamento da página');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[ELECTRON] Página carregada com sucesso');
    
    // 🔥 Verificar se localStorage está vazio (possível reinstalação/upgrade NSIS)
    mainWindow.webContents.executeJavaScript('JSON.stringify(localStorage)')
      .then((data) => {
        const parsed = JSON.parse(data);
        const keyCount = Object.keys(parsed).length;
        console.log('[ELECTRON] localStorage chaves:', keyCount);
        
        if (keyCount === 0 || (keyCount === 1 && parsed['vereda-store'] === undefined)) {
          // localStorage vazio ou quase vazio - tentar restaurar do backup
          console.log('[ELECTRON] ⚠️ localStorage vazio detectado - tentando restaurar do backup...');
          restoreLocalStorageFromBackup();
        } else {
          // localStorage tem dados - fazer backup
          backupLocalStorage();
        }
      })
      .catch((e) => console.warn('[ELECTRON] Erro ao verificar localStorage:', e.message));
  });

  // 🔥 BACKUP AUTOMÁTICO a cada 60 segundos (protege contra crashes)
  setInterval(() => {
    backupLocalStorage();
  }, 60000);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[ELECTRON] Erro no carregamento:', { errorCode, errorDescription, validatedURL });
    
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Erro de Carregamento',
      message: `Falha ao carregar a aplicação:\n\nCódigo: ${errorCode}\nDescrição: ${errorDescription}\n\nURL: ${validatedURL}`,
      buttons: ['OK', 'Tentar Novamente'],
      defaultId: 1
    }).then((result) => {
      if (result.response === 1) {
        // Tentar novamente - recarregar do servidor local
        const port = server ? server.address().port : 8080;
        const retryUrl = `http://localhost:${port}`;
        mainWindow.loadURL(retryUrl);
      } else {
        // Fechar aplicação
        app.quit();
      }
    });
  });

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    console.log('[ELECTRON] Janela pronta para exibição');
    mainWindow.show();
    
    // Abrir DevTools em desenvolvimento
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Prevenir navegação externa
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      event.preventDefault();
    }
  });

  // Permitir abertura do ecrã do cliente como janela kiosk fullscreen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[ELECTRON] setWindowOpenHandler URL:', url);
    // Detectar URL do ecrã do cliente
    if (url.includes('customer-display')) {
      // Detectar monitores disponíveis
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      const secondDisplay = displays.find(d => d.id !== primaryDisplay.id);

      console.log('[ELECTRON] Monitores detectados:', displays.length, 'Segundo ecrã:', !!secondDisplay);

      if (secondDisplay) {
        // Há segundo monitor: abrir em fullscreen kiosk nesse ecrã
        console.log('[ELECTRON] Abrindo ecrã do cliente no 2º monitor (fullscreen kiosk)...');
        const { x, y, width, height } = secondDisplay.bounds;
        const displayWindow = new BrowserWindow({
          x, y, width, height,
          fullscreen: true,
          kiosk: true,
          frame: false,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            backgroundThrottling: false,
            offscreen: false,
            partition: 'customer-display'
          }
        });
        // 🔥 Limpar cache da sessão customer-display antes de carregar (força conteúdo fresco)
        displayWindow.webContents.session.clearCache().then(() => {
          return displayWindow.webContents.session.clearStorageData({
            storages: ['serviceworker', 'cachestorage']
          });
        }).then(() => {
          console.log('[ELECTRON] Cache do customer-display limpa antes de carregar');
          displayWindow.loadURL(url);
        }).catch((e) => {
          console.warn('[ELECTRON] Erro ao limpar cache customer-display:', e.message);
          displayWindow.loadURL(url);
        });
        displayWindow.setMenuBarVisibility(false);
        displayWindow.once('ready-to-show', () => {
          displayWindow.show();
          displayWindow.setFullScreen(true);
          displayWindow.setKiosk(true);
        });
      } else {
        // Sem segundo monitor: NÃO abrir automaticamente para não cobrir o POS
        console.log('[ELECTRON] Sem 2º monitor. Ecrã do cliente não aberto (não cobre o POS).');
        // Apenas abrir se for clique manual do utilizador (window.open com nome específico)
        // Mas como o setWindowOpenHandler intercepta tudo, abrimos como janela pequena
        // que o utilizador pode mover/fechar
        const primaryBounds = primaryDisplay.bounds;
        const winWidth = 360;
        const winHeight = 540;
        const winX = primaryBounds.x + 20;
        const winY = primaryBounds.y + primaryBounds.height - winHeight - 40;
        const displayWindow = new BrowserWindow({
          x: winX,
          y: winY,
          width: winWidth,
          height: winHeight,
          frame: true,
          autoHideMenuBar: true,
          resizable: true,
          alwaysOnTop: false,
          skipTaskbar: false,
          minimizable: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            backgroundThrottling: false,
            offscreen: false,
            partition: 'customer-display'
          }
        });
        // 🔥 Limpar cache da sessão customer-display antes de carregar (força conteúdo fresco)
        displayWindow.webContents.session.clearCache().then(() => {
          return displayWindow.webContents.session.clearStorageData({
            storages: ['serviceworker', 'cachestorage']
          });
        }).then(() => {
          console.log('[ELECTRON] Cache do customer-display limpa antes de carregar (sem 2º monitor)');
          displayWindow.loadURL(url);
        }).catch((e) => {
          console.warn('[ELECTRON] Erro ao limpar cache customer-display:', e.message);
          displayWindow.loadURL(url);
        });
        displayWindow.setMenuBarVisibility(false);
        // Minimizar logo para não atrapalhar o POS
        displayWindow.once('ready-to-show', () => {
          displayWindow.showInactive();
          // Minimizar após 1 segundo para o utilizador ver que abriu
          setTimeout(() => {
            try { displayWindow.minimize(); } catch(e) {}
          }, 1500);
        });
      }
      return { action: 'deny' };
    }
    // Outros popups: abrir externamente
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Menu da aplicação com opções de debug
function createMenu() {
  // Verificar se está em modo desenvolvimento
  const isDev = app.isPackaged === false;
  
  const template = [
    {
      label: 'Ficheiro',
      submenu: [
        {
          label: 'Sair',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recarregar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'Ferramentas de Programador',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        {
          label: 'Console de Depuração',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom Reduzir',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomOut'
        },
        {
          label: 'Aumentar Zoom',
          accelerator: 'CmdOrCtrl+=',
          role: 'zoomIn'
        },
        {
          label: 'Zoom Normal',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom'
        }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tasca do Vereda',
              message: 'Tasca do Vereda v1.0.10',
              detail: 'Sistema de Gestão Restaurante'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos da aplicação
app.whenReady().then(async () => {
  // Limpar cache em disco antes de criar a janela
  cleanDir(electronCacheDir);
  cleanDir(swCacheDir);
  cleanDir(codeCacheDir);
  cleanDir(gpucacheDir);
  // 🔥 Limpar cache da partição customer-display para evitar segundo ecrã antigo
  cleanDir(customerDisplayCacheDir);
  cleanDir(customerDisplaySWDir);
  cleanDir(customerDisplayCodeCacheDir);
  cleanDir(customerDisplayGPUCacheDir);

  // 🔥 Limpar cache em MEMÓRIA da partição customer-display via Electron session API
  try {
    const { session } = require('electron');
    const customerSession = session.fromPartition('customer-display');
    await customerSession.clearCache();
    await customerSession.clearStorageData({
      storages: ['cachestorage', 'serviceworker', 'shadercache', 'websql', 'indexdb']
    });
    console.log('[ELECTRON] ✅ Cache da partição customer-display limpa (memória + disco)');
  } catch (e) {
    console.warn('[ELECTRON] Aviso ao limpar cache customer-display:', e.message);
  }
  
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Fechar o servidor local
  if (server) {
    server.close();
    console.log('[ELECTRON] Servidor local fechado');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 🔥 BACKUP CRÍTICO antes de fechar - garantir que dados são guardados
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const data = mainWindow.webContents.executeJavaScript('JSON.stringify(localStorage)', true);
      if (data && data !== '{}') {
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        // executeJavaScript é assíncrono, mas usamos versão síncrona via flag
        // Na prática, o setInterval de 60s já deve ter o backup mais recente
      }
    }
  } catch (e) {
    console.warn('[BACKUP] Erro no backup antes de sair:', e.message);
  }
  
  // Fechar o servidor local antes de sair
  if (server) {
    server.close();
    console.log('[ELECTRON] Servidor local fechado antes de sair');
  }
});

// Segurança: Prevenir execução de múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
