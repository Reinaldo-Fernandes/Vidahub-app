document.addEventListener('DOMContentLoaded', () => {
  const clockMini = document.getElementById('clockMini');
  const weatherMini = document.getElementById('weatherMini');
  const taskMini = document.getElementById('taskMini');
  const closeButton = document.getElementById('fechar');
  const dragArea = document.querySelector('.mini-drag');

  // Função: Atualiza o relógio no mini-modo
  function updateClockMini() {
    const now = new Date();
    if (clockMini) {
      clockMini.textContent = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  updateClockMini();
  setInterval(updateClockMini, 1000);

  // Seção: Comunicação com o processo principal (Electron)
  // ---
  if (window.electronAPI) {
    // Atualiza a exibição da tarefa
    window.electronAPI.onUpdateTaskMini((task) => {
      if (taskMini) {
        taskMini.textContent = task?.text || 'Nenhuma tarefa';
      }

      const taskWidget = document.getElementById('task-widget-mini');
      if (task?.isAlert && taskWidget) {
        taskWidget.classList.add('glow-alert');
      } else {
        taskWidget?.classList.remove('glow-alert');
      }

      if (taskWidget) {
        taskWidget.onclick = () => {
          taskWidget.classList.remove('glow-alert');
          if (window.electronAPI) {
            window.electronAPI.send('request-next-task');
          }
        };
      }
    });

    // Atualiza a exibição do clima
    window.electronAPI.onUpdateWeatherMini((clima) => {
      if (weatherMini) {
        const climaFormatado = clima?.city ? `${clima.city} - ${clima.temp}°C` : '--°C';
        weatherMini.textContent = climaFormatado;
      }
    });

    // Lida com alertas de pausas (água, alongar, pausa geral)
    window.electronAPI.onAppDataUpdated((data) => {
      if (data.type === 'pausas') {
        const waterBtn = document.querySelector('.wellness-mini [title="Beber Água"]');
        const stretchBtn = document.querySelector('.wellness-mini [title="Alongar"]');
        const pauseBtn = document.querySelector('.wellness-mini [title="Pausar"]');

        if (data.payload.type === 'beberAgua' && waterBtn) {
          waterBtn.classList.add('glow-alert');
          setTimeout(() => waterBtn.classList.remove('glow-alert'), 3000);
        } else if (data.payload.type === 'alongar' && stretchBtn) {
          stretchBtn.classList.add('glow-alert');
          setTimeout(() => stretchBtn.classList.remove('glow-alert'), 3000);
        } else if (data.payload.type === 'pausaGeral' && pauseBtn) {
          pauseBtn.classList.add('glow-alert');
          setTimeout(() => pauseBtn.classList.remove('glow-alert'), 3000);
        }
      }
    });

    // Solicita dados iniciais ao processo principal
    window.electronAPI.send('request-initial-mini-data');
  }

  // Seção: Controles da Janela
  // ---
  closeButton?.addEventListener('click', () => {
    window.electronAPI?.invoke('close-mini-mode');
  });

  // Seção: Lógica de Arrasto do Mini-Mode
  // ---
  let isDragging = false;

  dragArea?.addEventListener('mousedown', (e) => {
    isDragging = true;
    window.electronAPI.iniciarArrastoMiniMode(e.screenX, e.screenY);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      window.electronAPI.moverMiniMode(e.screenX, e.screenY);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      window.electronAPI.finalizarArrastoMiniMode();
    }
  });

  // Seção: Botão "Parar Alerta"
  // ---
  const stopAlertBtn = document.getElementById('stopAlertBtn');
  if (stopAlertBtn) {
    stopAlertBtn.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.send('request-next-task');
      }
    });
  }
});