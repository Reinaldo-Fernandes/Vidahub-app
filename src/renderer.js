document.addEventListener('DOMContentLoaded', () => {
  const btnMiniMode = document.getElementById('ativarMiniModeBtn');
  if (btnMiniMode && window.electronAPI?.abrirMiniMode) {
    btnMiniMode.addEventListener('click', () => {
      window.electronAPI.abrirMiniMode();
    });
  } else {
    // This warning is helpful during development if the button or API isn't ready.
    console.warn('Electron API ou botão "ativarMiniModeBtn" não encontrado.');
  }
});
