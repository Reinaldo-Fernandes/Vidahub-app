const { app, BrowserWindow, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');

let Store;
const isDev = !app.isPackaged;
let mainWindow;
let miniWindow;
let store;
let TASKS_FILE;

const expressApp = express();
const PORT = 3333;

expressApp.use(express.json());

// Seção: Servidor Express para Sincronização de Tarefas
// ---
function startExpressServer() {
  expressApp.listen(PORT, () => {
    console.log(`Servidor Express rodando na porta ${PORT}`);
  });

  // Rota para obter todas as tarefas
  expressApp.get('/tasks', (req, res) => {
    try {
      if (fs.existsSync(TASKS_FILE)) {
        const data = fs.readFileSync(TASKS_FILE, 'utf8');
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (error) {
      console.error('Erro ao ler tarefas via Express:', error);
      res.status(500).json({ error: 'Falha ao ler tarefas.' });
    }
  });

  // Rota para sincronizar (salvar) tarefas
  expressApp.post('/sync', (req, res) => {
    try {
      const tasks = req.body;
      fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
      res.json({ status: 'success' });
    } catch (error) {
      console.error('Erro ao sincronizar tarefas via Express:', error);
      res.status(500).json({ error: 'Falha ao sincronizar tarefas.' });
    }
  });
}

// Seção: Criação e Configuração das Janelas
// ---
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    icon: nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')),
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMiniWindow() {
  const savedPos = store.get('mini-pos', { x: 50, y: 50 });

  miniWindow = new BrowserWindow({
    width: 1200,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
    x: savedPos.x,
    y: savedPos.y,
    show: false,
  });

  miniWindow.loadFile(path.join(__dirname, '..', 'mini.html'));

  if (isDev) {
    miniWindow.webContents.openDevTools();
  }

  miniWindow.once('ready-to-show', () => {
    miniWindow.show();
  });

  miniWindow.on('closed', () => {
    if (!miniWindow.isDestroyed()) {
      const position = miniWindow.getPosition();
      store.set('mini-pos', { x: position[0], y: position[1] });
    }
    miniWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
}

// Seção: Handlers IPC (Interprocess Communication)
// ---

// Carrega tarefas do arquivo JSON
ipcMain.handle('load-tasks-from-file', async () => {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = await fs.promises.readFile(TASKS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erro ao carregar tarefas do arquivo:', error);
    return {};
  }
});

// Salva tarefas no arquivo JSON
ipcMain.handle('save-tasks-to-file', async (event, tasks) => {
  try {
    await fs.promises.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return { status: 'success' };
  } catch (error) {
    console.error('Erro ao salvar tarefas no arquivo:', error);
    return { status: 'error', message: 'Falha ao salvar tarefas.' };
  }
});

// Abre a janela do mini-mode
ipcMain.handle('open-mini-mode', async () => {
  if (!miniWindow || miniWindow.isDestroyed()) {
    createMiniWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    return { success: true };
  }
  return { success: false, message: 'Mini-Mode já está aberto.' };
});

// Fecha a janela do mini-mode
ipcMain.handle('close-mini-mode', async () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close();
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
  return { success: true };
});

// Solicita atualização do clima
ipcMain.on('request-weather-update', (event) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('fetch-weather-data');
  }
});

// Solicita dados iniciais para o mini-mode
ipcMain.on('request-initial-mini-data', (event) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('send-current-task-and-weather');
  }
});

// Envia tarefa para o mini-mode
ipcMain.on('send-task-to-mini-mode', (event, task) => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('update-task-mini', task);
  }
});

// Envia dados de clima para o mini-mode
ipcMain.on('send-weather-to-mini-mode', (event, weatherData) => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('update-weather-mini', weatherData);
  }
});

let isDragging = false;
let startOffset = { x: 0, y: 0 };

// Inicia o arrasto da janela mini
ipcMain.on('start-drag-mini-mode', (event, { mouseX, mouseY }) => {
  if (miniWindow) {
    isDragging = true;
    const [winX, winY] = miniWindow.getPosition();
    startOffset = { x: mouseX - winX, y: mouseY - winY };
  }
});

// Finaliza o arrasto da janela mini
ipcMain.on('end-drag-mini-mode', () => {
  isDragging = false;
});

// Move a janela mini durante o arrasto
ipcMain.on('move-mini-mode', (event, { clientX, clientY }) => {
  if (isDragging && miniWindow && !miniWindow.isDestroyed()) {
    const display = screen.getPrimaryDisplay();
    const miniWindowWidth = miniWindow.getSize()[0];
    const miniWindowHeight = miniWindow.getSize()[1];

    const x = clientX - startOffset.x;
    const y = clientY - startOffset.y;

    const boundedX = Math.max(0, Math.min(x, display.workAreaSize.width - miniWindowWidth));
    const boundedY = Math.max(0, Math.min(y, display.workAreaSize.height - miniWindowHeight));

    miniWindow.setPosition(boundedX, boundedY, false);
  }
});

// Recupera a posição da janela mini
ipcMain.handle('get-mini-mode-position', () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    const [x, y] = miniWindow.getPosition();
    return { x, y };
  }
  return store.get('mini-pos', { x: 50, y: 50 });
});

// Sincroniza dados genéricos (alertas de pausas) entre janelas
ipcMain.on('sync-app-data', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-data-updated', data);
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('app-data-updated', data);
  }
});

// Retransmite alertas para todas as janelas
ipcMain.on('trigger-alert', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('trigger-alert', data);
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('app-data-updated', data);
  }
});

// Solicita a próxima tarefa
ipcMain.on('request-next-task', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('send-current-task-and-weather');
  }
});

// Seção: Inicialização do Aplicativo
// ---
app.whenReady().then(async () => {
  const { default: ElectronStore } = await import('electron-store');
  Store = ElectronStore;
  store = new Store();

  TASKS_FILE = path.join(app.getPath('userData'), 'tasks.json');

  createMainWindow();
  startExpressServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});