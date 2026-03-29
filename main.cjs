const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');

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
    
    const filePath = path.join(distPath, pathname);
    
    // Verificar se o arquivo existe
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
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
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
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

    // Carregar do servidor de desenvolvimento
    const devUrl = 'http://localhost:5173';
    console.log('[ELECTRON] Carregando dev server:', devUrl);
    
    mainWindow.loadURL(devUrl).catch(err => {
      console.error('[ELECTRON] ERRO AO CARREGAR DEV SERVER:', err);
      // Fallback para servidor local
      const port = createLocalServer();
      const fallbackUrl = `http://localhost:${port}`;
      console.log('[ELECTRON] Fallback para:', fallbackUrl);
      mainWindow.loadURL(fallbackUrl);
    });
  } else {
    // Em produção: usar servidor local com arquivos build
    const port = createLocalServer();
    
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

    // Carregar do servidor local
    const appUrl = `http://localhost:${port}`;
    console.log('[ELECTRON] Carregando produção:', appUrl);
    
    mainWindow.loadURL(appUrl).catch(err => {
      console.error('[ELECTRON] ERRO AO CARREGAR PRODUÇÃO:', err);
      if (!mainWindow.isDestroyed()) {
        dialog.showErrorBox('Erro Crítico', `Não foi possível carregar a aplicação:\n\n${err.message}\n\nURL: ${appUrl}`);
        app.quit();
      }
    });
  }
  
  // Eventos de carregamento
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[ELECTRON] Iniciou carregamento da página');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[ELECTRON] Página carregada com sucesso');
  });

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
        // Tentar novamente
        mainWindow.loadFile(indexPath);
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

  // Prevenir novos popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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
              message: 'Tasca do Vereda v1.0.6',
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
app.whenReady().then(() => {
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
