(() => {
  const modes = {
    focus: { label: 'Focus', minutes: 25 },
    short: { label: 'Short Break', minutes: 5 },
    long: { label: 'Long Break', minutes: 15 },
  };
  let mountedModal = null;
  let timer = null;
  let remaining = modes.focus.minutes * 60;
  let total = remaining;
  let mode = 'focus';
  let running = false;

  const format = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const setMode = (nextMode) => {
    mode = nextMode;
    remaining = modes[nextMode].minutes * 60;
    total = remaining;
    running = false;
    if (timer) { clearInterval(timer); timer = null; }
    render();
  };
  const start = () => {
    if (running) return;
    running = true;
    if (timer) clearInterval(timer);
    const startedAt = performance.now();
    const initialRemaining = remaining;
    timer = setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      remaining = Math.max(0, Math.ceil(initialRemaining - elapsed));
      render();
      if (remaining <= 0) finish();
    }, 100);
    render();
  };
  const pause = () => {
    running = false;
    if (timer) { clearInterval(timer); timer = null; }
    render();
  };
  const reset = () => setMode(mode);
  const finish = () => {
    running = false;
    if (timer) { clearInterval(timer); timer = null; }
    remaining = 0;
    render();
    if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
  };
  const render = () => {
    if (!mountedModal) return;
    const progress = total ? (remaining / total) * 100 : 0;
    mountedModal.style.setProperty('--progress', progress.toFixed(3));
    mountedModal.style.setProperty('--fluid', `${progress.toFixed(3)}%`);
    const ring = mountedModal.querySelector('[data-pomodoro-ring]');
    if (ring) {
      const circumference = 2 * Math.PI * 130;
      const dash = circumference * Math.max(0, Math.min(100, progress)) / 100;
      ring.querySelectorAll('[data-pomodoro-ring-arc]').forEach((arc) => {
        arc.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
        arc.setAttribute('stroke-dashoffset', '0');
      });
      const angle = (progress / 100) * Math.PI * 2;
      const x = 160 + 130 * Math.cos(angle);
      const y = 160 + 130 * Math.sin(angle);
      const bead = ring.querySelector('[data-pomodoro-ring-bead]');
      if (bead) {
        bead.setAttribute('cx', x.toFixed(2));
        bead.setAttribute('cy', y.toFixed(2));
        bead.setAttribute('r', running ? '5' : '3');
      }
    }
    const time = mountedModal.querySelector('[data-pomodoro-time]');
    const status = mountedModal.querySelector('[data-pomodoro-status]');
    const startButton = mountedModal.querySelector('[data-pomodoro-start]');
    const cycle = mountedModal.querySelector('[data-pomodoro-cycle]');
    if (time) time.textContent = format(remaining);
    if (status) status.textContent = remaining === 0 ? 'Complete' : running ? 'Focusing' : 'Ready';
    if (startButton) startButton.textContent = running ? 'Pause' : 'Start';
    if (cycle) cycle.textContent = `${modes[mode].label} · ${modes[mode].minutes} min session`;
    mountedModal.classList.toggle('pomodoro-complete', remaining === 0);
  };
  const mount = (modal) => {
    if (mountedModal === modal) return;
    if (timer) { clearInterval(timer); timer = null; }
    running = false;
    mode = 'focus';
    remaining = modes.focus.minutes * 60;
    total = remaining;
    mountedModal = modal;
    modal.classList.add('pomodoro-modal');
    modal.innerHTML = `
      <button class="modal-close" type="button" aria-label="Close">×</button>
      <div class="pomodoro-header">
        <div><span class="pomodoro-kicker">Deep focus</span><h2>Pomodoro</h2></div>
        <select class="pomodoro-mode" aria-label="Pomodoro mode">
          <option value="focus">Focus</option><option value="short">Short Break</option><option value="long">Long Break</option>
        </select>
      </div>
      <div class="pomodoro-ring-wrap" aria-label="Pomodoro remaining time">
        <div class="pomodoro-ring" data-pomodoro-ring>
          <svg class="pomodoro-mercury-svg" viewBox="0 0 320 320" aria-hidden="true">
            <defs>
              <linearGradient id="pomodoroMercuryDashboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e8f4ff" />
                <stop offset="35%" stop-color="#9fd8ff" />
                <stop offset="65%" stop-color="#6fb8ff" />
                <stop offset="100%" stop-color="#c9ecff" />
              </linearGradient>
              <filter id="pomodoroDashboardBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
              <filter id="pomodoroDashboardBlurSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
            </defs>
            <circle cx="160" cy="160" r="130" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="8" />
            <circle cx="160" cy="160" r="128" fill="none" stroke="url(#pomodoroMercuryDashboardGradient)" stroke-width="16" stroke-linecap="round" stroke-dasharray="816.81 816.81" stroke-dashoffset="0" filter="url(#pomodoroDashboardBlurSoft)" opacity=".30" data-pomodoro-ring-arc />
            <circle cx="160" cy="160" r="130" fill="none" stroke="url(#pomodoroMercuryDashboardGradient)" stroke-width="9.5" stroke-linecap="round" stroke-dasharray="816.81 816.81" stroke-dashoffset="0" filter="url(#pomodoroDashboardBlur)" opacity=".52" data-pomodoro-ring-arc />
            <circle cx="160" cy="160" r="130" fill="none" stroke="url(#pomodoroMercuryDashboardGradient)" stroke-width="5.2" stroke-linecap="round" stroke-dasharray="816.81 816.81" stroke-dashoffset="0" opacity=".78" data-pomodoro-ring-arc />
            <circle cx="290" cy="160" r="3.5" fill="#eefaff" filter="url(#pomodoroDashboardBlur)" opacity=".72" data-pomodoro-ring-bead />
          </svg>
        </div>
        <div class="pomodoro-fluid"><div class="pomodoro-fluid-level"></div></div>
        <div><div class="pomodoro-time" data-pomodoro-time>25:00</div><div class="pomodoro-status" data-pomodoro-status>Ready</div></div>
      </div>
      <div class="pomodoro-controls">
        <button type="button" data-pomodoro-reset>Reset</button>
        <button type="button" class="pomodoro-start" data-pomodoro-start>Start</button>
        <button type="button" data-pomodoro-close>Close</button>
      </div>
      <div class="pomodoro-presets">
        <button type="button" data-pomodoro-preset="focus" class="active">25 min</button>
        <button type="button" data-pomodoro-preset="short">5 min</button>
        <button type="button" data-pomodoro-preset="long">15 min</button>
      </div>
      <div class="pomodoro-cycle" data-pomodoro-cycle>Focus · 25 min session</div>`;
    const close = () => {
      const backdrop = modal.closest('.modal-backdrop');
      mountedModal = null;
      if (timer) { clearInterval(timer); timer = null; }
      running = false;

      if (backdrop) {
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        setTimeout(() => { if (document.body.contains(backdrop)) backdrop.remove(); }, 0);
      }
    };
    modal.querySelector('.modal-close').addEventListener('click', close);
    modal.querySelector('[data-pomodoro-close]').addEventListener('click', close);
    modal.querySelector('[data-pomodoro-start]').addEventListener('click', () => running ? pause() : start());
    modal.querySelector('[data-pomodoro-reset]').addEventListener('click', reset);
    modal.querySelector('.pomodoro-mode').addEventListener('change', (event) => setMode(event.target.value));
    modal.querySelectorAll('[data-pomodoro-preset]').forEach((button) => button.addEventListener('click', () => {
      modal.querySelectorAll('[data-pomodoro-preset]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      setMode(button.dataset.pomodoroPreset);
      modal.querySelector('.pomodoro-mode').value = mode;
    }));
    render();
  };
  const scan = () => {
    const modals = document.querySelectorAll('.modal-backdrop .glass-modal');
    [...modals].forEach((modal) => {
      const heading = modal.querySelector('h2');
      if (heading?.textContent.trim() === 'Pomodoro') mount(modal);
    });
    if (mountedModal && !document.body.contains(mountedModal)) {
      mountedModal = null;
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();