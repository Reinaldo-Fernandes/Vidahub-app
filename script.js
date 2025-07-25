// Seção: Utilitários
// ---
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Seção: Relógio
// ---
function updateClock() {
  const now = new Date();
  const clock = document.getElementById('clock');
  const dateElem = document.querySelector('.date');

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  if (clock) clock.textContent = `${hours}:${minutes}`;

  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = now.toLocaleDateString('pt-BR', options);
  if (dateElem) dateElem.textContent = capitalize(formattedDate);
}

// Seção: Clima
// ---
async function getWeather(lat, lon) {
  const apiKey = '6b2e9835bf99ae05ed4e3fe8b2fdf128';
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    const data = await res.json();

    const { name, weather, main } = data;
    const weatherIconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}.png`;

    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
      weatherWidget.querySelector('.city').textContent = name;
      weatherWidget.querySelector('#weatherIcon').src = weatherIconUrl;
      weatherWidget.querySelector('.temp').textContent = `${Math.round(main.temp)}°C`;
      weatherWidget.querySelector('.desc').textContent = capitalize(weather[0].description);
      weatherWidget.querySelector('.minmax').textContent = `Mín: ${Math.round(main.temp_min)}° / Máx: ${Math.round(main.temp_max)}°`;

      const body = document.body;
      body.className = '';
      if (weather[0].main.toLowerCase().includes('clear')) {
        body.classList.add('weather-clear');
      } else if (weather[0].main.toLowerCase().includes('cloud')) {
        body.classList.add('weather-cloudy');
      } else if (weather[0].main.toLowerCase().includes('rain')) {
        body.classList.add('weather-rain');
      } else if (weather[0].main.toLowerCase().includes('thunderstorm')) {
        body.classList.add('weather-thunderstorm');
      } else if (weather[0].main.toLowerCase().includes('snow')) {
        body.classList.add('weather-snow');
      } else if (weather[0].main.toLowerCase().includes('drizzle')) {
        body.classList.add('weather-drizzle');
      } else if (weather[0].main.toLowerCase().includes('fog') || weather[0].main.toLowerCase().includes('mist') || weather[0].main.toLowerCase().includes('haze')) {
        body.classList.add('weather-fog');
      }
    }
    return {
      city: name,
      temp: Math.round(main.temp)
    };
  } catch (error) {
    console.error('Erro ao obter dados do clima:', error);
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
      weatherWidget.querySelector('.city').textContent = 'Erro ao carregar clima';
      weatherWidget.querySelector('.temp').textContent = '--';
      weatherWidget.querySelector('.desc').textContent = '--';
      weatherWidget.querySelector('.minmax').textContent = '--';
    }
    return null;
  }
}

async function getGeoLocation() {
  try {
    const token = '950176211983d0';
    const url = `https://ipinfo.io/json?token=${token}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    const data = await res.json();
    const [lat, lon] = data.loc.split(',').map(Number);
    return { lat, lon };
  } catch (error) {
    console.error('Erro ao obter geolocalização:', error);
    return { lat: -5.795, lon: -35.197 };
  }
}

async function startWeatherUpdate() {
  try {
    const { lat, lon } = await getGeoLocation();
    const weatherData = await getWeather(lat, lon);
    if (window.electronAPI && weatherData) {
      window.electronAPI.send('send-weather-to-mini-mode', weatherData);
    }
  } catch (error) {
    console.error('Erro ao iniciar atualização do clima:', error);
  }
}

// Seção: Gerenciamento de Tarefas
// ---
let tasks = {};

async function loadTasks() {
  if (window.electronAPI) {
    tasks = await window.electronAPI.getTasks();
    renderTasks();
    updateCurrentTaskDisplay();
  }
}

async function syncTasks() {
  if (window.electronAPI) {
    await window.electronAPI.syncTasks(tasks);
  }
}

function addTodoItem() {
  const todoInput = document.getElementById('todoInput');
  const todoTime = document.getElementById('todoTime');
  const todoPeriod = document.getElementById('todoPeriod');

  const taskText = todoInput.value.trim();
  const taskTime = todoTime.value;
  const taskPeriod = todoPeriod.value;

  if (taskText && taskTime) {
    const timestamp = Date.now().toString();
    tasks[timestamp] = {
      text: taskText,
      time: taskTime,
      period: taskPeriod,
      completed: false,
      alerted: false
    };
    todoInput.value = '';
    todoTime.value = '';
    renderTasks();
    syncTasks();
    updateCurrentTaskDisplay();
  }
}

function renderTasks() {
  const todoMorning = document.getElementById('todoMorning');
  const todoAfternoon = document.getElementById('todoAfternoon');
  const todoNight = document.getElementById('todoNight');

  if (!todoMorning || !todoAfternoon || !todoNight) return;

  todoMorning.innerHTML = '';
  todoAfternoon.innerHTML = '';
  todoNight.innerHTML = '';

  const sortedTimestamps = Object.keys(tasks).sort((a, b) => parseInt(a) - parseInt(b));

  sortedTimestamps.forEach(timestamp => {
    const task = tasks[timestamp];
    const li = document.createElement('li');
    li.dataset.timestamp = timestamp;
    li.dataset.period = task.period;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTaskCompleted(timestamp));

    const span = document.createElement('span');
    span.textContent = `${task.text} (${task.time})`;
    if (task.completed) {
      span.classList.add('completed');
    }
    if (task.alerted) {
      span.classList.add('glow-alert');
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Remover';
    deleteBtn.classList.add('delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(timestamp));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);

    switch (task.period) {
      case 'morning':
        todoMorning.appendChild(li);
        break;
      case 'afternoon':
        todoAfternoon.appendChild(li);
        break;
      case 'night':
        todoNight.appendChild(li);
        break;
    }
  });
}

function toggleTaskCompleted(timestamp) {
  tasks[timestamp].completed = !tasks[timestamp].completed;
  if (tasks[timestamp].completed) {
    tasks[timestamp].alerted = false;
  }
  renderTasks();
  syncTasks();
  updateCurrentTaskDisplay();
}

function deleteTask(timestamp) {
  delete tasks[timestamp];
  renderTasks();
  syncTasks();
  updateCurrentTaskDisplay();
}

function clearTasksByPeriod(period) {
  Object.keys(tasks).forEach(timestamp => {
    if (tasks[timestamp].period === period) {
      delete tasks[timestamp];
    }
  });
  renderTasks();
  syncTasks();
  updateCurrentTaskDisplay();
}

function updateCurrentTaskDisplay() {
  const nextTaskSpan = document.getElementById('nextTask');
  const taskPreviewContainer = document.getElementById('taskPreview');
  let nextTaskText = 'Nenhuma tarefa!';
  let taskToSendToMini = { text: 'Nenhuma tarefa', time: '', isAlert: false };

  const pendingTasks = Object.keys(tasks)
    .filter(ts => !tasks[ts].completed)
    .map(ts => ({ ...tasks[ts], timestamp: ts }))
    .sort((a, b) => {
      const timeA = new Date(`2000/01/01 ${a.time}`).getTime();
      const timeB = new Date(`2000/01/01 ${b.time}`).getTime();
      return timeA - timeB;
    });

  taskPreviewContainer.innerHTML = '';

  if (pendingTasks.length > 0) {
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    let closestTask = null;

    for (const task of pendingTasks) {
      const [taskHour, taskMinute] = task.time.split(':').map(Number);
      const taskTimeInMinutes = taskHour * 60 + taskMinute;

      if (taskTimeInMinutes > currentTimeMinutes) {
        if (!closestTask || taskTimeInMinutes < (new Date(`2000/01/01 ${closestTask.time}`).getHours() * 60 + new Date(`2000/01/01 ${closestTask.time}`).getMinutes())) {
          closestTask = task;
        }
      } else if (taskTimeInMinutes <= currentTimeMinutes && !task.completed) {
        closestTask = task;
      }
    }

    if (closestTask) {
      nextTaskText = `${closestTask.text} (${closestTask.time})`;
      taskToSendToMini = {
        text: closestTask.text,
        time: closestTask.time,
        isAlert: closestTask.alerted
      };

      pendingTasks.slice(0, 3).forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.classList.add('task-preview-item');
        if (task.alerted) {
          taskDiv.classList.add('glow-alert');
        }
        taskDiv.textContent = `${task.time} - ${task.text}`;
        taskPreviewContainer.appendChild(taskDiv);
      });
    }
  }

  if (nextTaskSpan) {
    nextTaskSpan.textContent = nextTaskText;
  }

  if (window.electronAPI) {
    window.electronAPI.send('send-task-to-mini-mode', taskToSendToMini);
  }
}

function checkTaskAlerts() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  Object.keys(tasks).forEach(timestamp => {
    const task = tasks[timestamp];
    if (task.completed) return;

    const [taskHour, taskMinute] = task.time.split(':').map(Number);
    const taskTime = new Date(now);
    taskTime.setHours(taskHour, taskMinute, 0, 0);

    const timeDiff = Math.floor((taskTime - now) / 60000);

    // Alerta 15 minutos antes
    if (!task.earlyAlerted && timeDiff === 15) {
      task.earlyAlerted = true;

      const taskElement = document.querySelector(`li[data-timestamp="${timestamp}"] span`);
      if (taskElement) {
        taskElement.classList.add('glow-alert');
        setTimeout(() => taskElement.classList.remove('glow-alert'), 5000);
      }

      if (window.electronAPI) {
        window.electronAPI.sendTaskToMiniMode({
          text: `[Em breve] ${task.text}`,
          time: task.time,
          isAlert: true
        });
      }
    }

    // Alerta na hora exata
    if (!task.alerted && timeDiff === 0) {
      task.alerted = true;

      const taskElement = document.querySelector(`li[data-timestamp="${timestamp}"] span`);
      if (taskElement) {
        taskElement.classList.add('glow-alert');
        setTimeout(() => taskElement.classList.remove('glow-alert'), 5000);
      }

      if (window.electronAPI) {
        window.electronAPI.sendTaskToMiniMode({
          text: task.text,
          time: task.time,
          isAlert: true
        });
      }
    }

    // Reset flags quando passar do horário
    if (timeDiff < 0) {
      delete tasks[timestamp];
    }
  });

  syncTasks();
  updateCurrentTaskDisplay();
}

// Seção: Modal de Pausas
// ---
let pausasConfig = {
  intervaloAgua: 15,
  intervaloAlongar: 30,
  intervaloPausaGeral: 60
};

function loadPausasConfig() {
  const savedConfig = localStorage.getItem('pausasConfig');
  if (savedConfig) {
    pausasConfig = JSON.parse(savedConfig);
  }
  updatePausasDisplay();
}

function updatePausasDisplay() {
  document.getElementById('intervaloAgua').value = pausasConfig.intervaloAgua;
  document.getElementById('intervaloAlongar').value = pausasConfig.intervaloAlongar;
  document.getElementById('intervaloPausaGeral').value = pausasConfig.intervaloPausaGeral;

  document.getElementById('currentAgua').textContent = `Beber Água: ${pausasConfig.intervaloAgua} minutos`;
  document.getElementById('currentAlongar').textContent = `Alongar: ${pausasConfig.intervaloAlongar} minutos`;
  document.getElementById('currentPausaGeral').textContent = `Pausa Geral: ${pausasConfig.intervaloPausaGeral} minutos`;
}

function savePausasConfig() {
  pausasConfig.intervaloAgua = parseInt(document.getElementById('intervaloAgua').value);
  pausasConfig.intervaloAlongar = parseInt(document.getElementById('intervaloAlongar').value);
  pausasConfig.intervaloPausaGeral = parseInt(document.getElementById('intervaloPausaGeral').value);

  localStorage.setItem('pausasConfig', JSON.stringify(pausasConfig));

  if (window.electronAPI) {
    window.electronAPI.send('sync-app-data', { type: 'pausasConfig', payload: pausasConfig });
  }
  updatePausasDisplay();
  alert('Configurações de pausas salvas!');
}

function checkPausaAlerts() {
  const now = new Date();
  const currentMinutes = now.getMinutes();

  if (pausasConfig.intervaloAgua > 0 && currentMinutes % pausasConfig.intervaloAgua === 0) {
    if (!localStorage.getItem('lastAguaAlertMinute') || parseInt(localStorage.getItem('lastAguaAlertMinute')) !== currentMinutes) {
      if (window.electronAPI) {
        window.electronAPI.send('trigger-alert', { type: 'pausas', payload: { type: 'agua' } });
      }
      localStorage.setItem('lastAguaAlertMinute', currentMinutes.toString());
    }
  } else {
    localStorage.removeItem('lastAguaAlertMinute');
  }

  if (pausasConfig.intervaloAlongar > 0 && currentMinutes % pausasConfig.intervaloAlongar === 0) {
    if (!localStorage.getItem('lastAlongarAlertMinute') || parseInt(localStorage.getItem('lastAlongarAlertMinute')) !== currentMinutes) {
      if (window.electronAPI) {
        window.electronAPI.send('trigger-alert', { type: 'pausas', payload: { type: 'alongar' } });
      }
      localStorage.setItem('lastAlongarAlertMinute', currentMinutes.toString());
    }
  } else {
    localStorage.removeItem('lastAlongarAlertMinute');
  }

  if (pausasConfig.intervaloPausaGeral > 0 && currentMinutes % pausasConfig.intervaloPausaGeral === 0) {
    if (!localStorage.getItem('lastPausaGeralAlertMinute') || parseInt(localStorage.getItem('lastPausaGeralAlertMinute')) !== currentMinutes) {
      if (window.electronAPI) {
        window.electronAPI.send('trigger-alert', { type: 'pausas', payload: { type: 'pausaGeral' } });
      }
      localStorage.setItem('lastPausaGeralAlertMinute', currentMinutes.toString());
    }
  } else {
    localStorage.removeItem('lastPausaGeralAlertMinute');
  }
}

// Iniciar a verificação de alertas de pausa e tarefa
setInterval(() => {
  checkPausaAlerts();
  checkTaskAlerts();
}, 60 * 1000);

// Seção: Inicialização e Event Listeners
// ---
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);

  loadTasks();
  loadPausasConfig();

  // Event Listeners para tarefas
  document.getElementById('addTodo')?.addEventListener('click', addTodoItem);
  document.getElementById('todoInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTodoItem();
    }
  });

  document.getElementById('clearMorning')?.addEventListener('click', () => clearTasksByPeriod('morning'));
  document.getElementById('clearAfternoon')?.addEventListener('click', () => clearTasksByPeriod('afternoon'));
  document.getElementById('clearNight')?.addEventListener('click', () => clearTasksByPeriod('night'));

  // Toggle para detalhes das tarefas
  document.getElementById('toggleTodo')?.addEventListener('click', function () {
    const todoDetails = document.getElementById('todoDetails');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !isExpanded);
    todoDetails.style.display = isExpanded ? 'none' : 'block';
  });

  // Event Listeners para modal de pausas
  const pausasModal = document.getElementById('pausasModal');
  const openPausasModalBtn = document.getElementById('openPausasModalBtn');
  const closePausasModalBtn = document.getElementById('closePausasModalBtn');
  const salvarIntervalosBtn = document.getElementById('salvarIntervalos');

  openPausasModalBtn?.addEventListener('click', () => {
    if (pausasModal) pausasModal.style.display = 'block';
    updatePausasDisplay();
  });

  closePausasModalBtn?.addEventListener('click', () => {
    if (pausasModal) pausasModal.style.display = 'none';
  });

  salvarIntervalosBtn?.addEventListener('click', savePausasConfig);

  window.addEventListener('click', (event) => {
    if (event.target === pausasModal) {
      pausasModal.style.display = 'none';
    }
  });

  // Escuta por solicitações do processo principal para enviar tarefa e clima
  if (window.electronAPI) {
    window.electronAPI.onRequestCurrentTaskAndWeather(() => {
      updateCurrentTaskDisplay();
      startWeatherUpdate();
    });

    // Listener para atualizações de dados do aplicativo do processo principal (ex: pausasConfig)
    window.electronAPI.onAppDataUpdated((data) => {
      if (data.type === 'pausasConfig') {
        pausasConfig = data.payload;
        updatePausasDisplay();
      }
      if (data.type === 'pausas' && data.payload) {
        let alertElementId = 'clock-widget'; // Elemento padrão para brilho
        const element = document.getElementById(alertElementId);
        if (element) {
          element.classList.add('glow-alert');
          setTimeout(() => element.classList.remove('glow-alert'), 5000);
        }
      }
    });
  }

  // Escuta por solicitações do processo principal para atualizar o clima
  if (window.electronAPI) {
    window.electronAPI.onFetchWeather(() => {
      startWeatherUpdate();
    });
  }

  // Inicializa a atualização do clima ao carregar a página
  startWeatherUpdate();

  // Event Listener para o botão "Abrir Mini-Mode"
  const abrirMiniModeBtn = document.getElementById('abrirMiniModeBtn');
  if (abrirMiniModeBtn) {
    abrirMiniModeBtn.addEventListener('click', async () => {
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.invoke('open-mini-mode');
        } catch (error) {
          console.error('Erro ao invocar open-mini-mode:', error);
        }
      }
    });
  }
});