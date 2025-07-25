const { contextBridge, ipcRenderer } = require('electron');

// Seção: Exposição de APIs no Objeto Global (electronAPI)
// ---
contextBridge.exposeInMainWorld('electronAPI', {
  // Funções de comunicação IPC genéricas (send, on, invoke)
  send: (channel, ...args) => {
    const validSendChannels = [
      'request-weather-update',
      'request-initial-mini-data',
      'send-task-to-mini-mode',
      'send-weather-to-mini-mode',
      'start-drag-mini-mode',
      'end-drag-mini-mode',
      'move-mini-mode',
      'sync-app-data',
      'atualizar-pausas-config',
      'trigger-alert',
      'solicitarDadosIniciaisMiniMode'
    ];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`Tentativa de usar canal IPC não permitido (send): ${channel}`);
    }
  },

  on: (channel, callback) => {
    const validOnChannels = [
      'update-task-mini',
      'update-weather-mini',
      'app-data-updated',
      'fetch-weather-data',
      'send-current-task-and-weather',
      'atualizarTarefa',
      'atualizarClima',
      'trigger-alert',
    ];
    if (validOnChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    } else {
      console.warn(`Tentativa de usar canal IPC não permitido (on): ${channel}`);
      return () => {};
    }
  },

  invoke: (channel, ...args) => {
    const validInvokeChannels = [
      'open-mini-mode',
      'close-mini-mode',
      'load-tasks-from-file',
      'save-tasks-to-file',
      'get-mini-mode-position',
    ];
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      console.warn(`Tentativa de usar canal IPC não permitido (invoke): ${channel}`);
      return Promise.reject(new Error(`Canal IPC não permitido: ${channel}`));
    }
  },

  // Seção: Funções Específicas para o Mini-Mode
  // ---
  abrirMiniMode: () => ipcRenderer.invoke('open-mini-mode'),
  fecharMiniMode: () => ipcRenderer.invoke('close-mini-mode'),
  getMiniModePosition: () => ipcRenderer.invoke('get-mini-mode-position'),

  // Funções de arrasto do mini-mode
  iniciarArrastoMiniMode: (mouseX, mouseY) => ipcRenderer.send('start-drag-mini-mode', { mouseX, mouseY }),
  finalizarArrastoMiniMode: () => ipcRenderer.send('end-drag-mini-mode'),
  moverMiniMode: (clientX, clientY) => ipcRenderer.send('move-mini-mode', { clientX, clientY }),

  // Seção: Funções de Dados e Sincronização
  // ---
  loadTasks: () => ipcRenderer.invoke('load-tasks-from-file'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks-to-file', tasks),

  requestWeatherUpdate: () => ipcRenderer.send('request-weather-update'),

  sendTaskToMiniMode: (task) => ipcRenderer.send('send-task-to-mini-mode', task),

  sendWeatherToMiniMode: (weatherData) => ipcRenderer.send('send-weather-to-mini-mode', weatherData),

  sendAppData: (data) => ipcRenderer.send('sync-app-data', data),

  // Seção: Comunicação com o servidor Express local
  // ---
  getTasksHttp: async () => {
    try {
      const response = await fetch('http://localhost:3333/tasks');
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar tarefas do servidor local:', error);
      return {};
    }
  },

  syncTasksHttp: async (tasks) => {
    try {
      const response = await fetch('http://localhost:3333/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao sincronizar tarefas com o servidor local:', error);
      return { status: 'error', message: 'Falha ao sincronizar tarefas' };
    }
  },

  // Seção: Listeners Específicos para o Renderer
  // ---
  onUpdateTaskMini: (callback) => ipcRenderer.on('update-task-mini', (event, task) => callback(task)),

  onUpdateWeatherMini: (callback) => ipcRenderer.on('update-weather-mini', (event, weatherData) => callback(weatherData)),

  onAppDataUpdated: (callback) => ipcRenderer.on('app-data-updated', (event, data) => callback(data)),

  onRequestCurrentTaskAndWeather: (callback) => ipcRenderer.on('send-current-task-and-weather', () => callback()),

  onFetchWeather: (callback) => ipcRenderer.on('fetch-weather-data', () => callback()),

  onTriggerAlert: (callback) => ipcRenderer.on('trigger-alert', (event, data) => callback(data)),

  // Canais IPC originais (se ainda estiverem em uso no seu código)
  solicitarDadosIniciaisMiniMode: () => ipcRenderer.send('request-initial-mini-data'),
  onAtualizarTarefa: (callback) => ipcRenderer.on('atualizarTarefa', (event, data) => callback(data)),
  onAtualizarClima: (callback) => ipcRenderer.on('atualizarClima', (event, data) => callback(data)),

  // Para carregar e sincronizar tarefas com o backend Express
  getTasks: async () => {
    try {
      const response = await fetch('http://localhost:3333/tasks');
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      return {};
    }
  },

  syncTasks: async (tasks) => {
    try {
      const response = await fetch('http://localhost:3333/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao sincronizar tarefas:', error);
      return { status: 'error', message: 'Falha ao sincronizar tarefas' };
    }
  },
});