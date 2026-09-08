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

  const format = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;
  const setMode = (nextMode) => {
    mode = nextMode;
    remaining = modes[nextMode].minutes * 60;
    total = remaining;
    running = false;
    if (timer) { cancelAnimationFrame(timer); timer = null; }
    render();
  };
  const start = () => {
    if (running) return;
    running = true;
    if (timer) cancelAnimationFrame(timer);
    const startedAt = performance.now();
    const initialRemaining = remaining;
    const tick = (now) => {
      if (!running) return;
      const elapsed = (now - startedAt) / 1000;
      remaining = Math.max(0, initialRemaining - elapsed);
      render();
      if (remaining <= 0) {
        finish();
        return;
      }
      timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
    render();
  };
  const pause = () => {
    running = false;
    if (timer) { cancelAnimationFrame(timer); timer = null; }
    render();
  };
  const reset = () => setMode(mode);
  const finish = () => {
    running = false;
    if (timer) { cancelAnimationFrame(timer); timer = null; }
    remaining = 0;
    render();
    if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
  };
  const render = () => {
    if (!mountedModal) return;
    const progress = total ? Math.max(0, Math.min(1, remaining / total)) : 0;
    const percent = progress * 100;
    mountedModal.style.setProperty('--progress', percent.toFixed(4));
    mountedModal.style.setProperty('--fluid', `${percent.toFixed(4)}%`);
    mountedModal.classList.toggle('pomodoro-is-running', running);
    const ring = mountedModal.querySelector('[data-pomodoro-ring]');
    if (ring) {
      const circumference = 2 * Math.PI * 130;
      const dash = circumference * progress;
      const gap = Math.max(0.001, circumference - dash);
      ring.querySelectorAll('[data-pomodoro-ring-arc]').forEach((arc) => {
        arc.setAttribute('stroke-dasharray', `${dash} ${gap}`);
        arc.setAttribute('stroke-dashoffset', '0');
      });
      const angle = progress * Math.PI * 2;
      const x = 160 + 130 * Math.cos(angle);
      const y = 160 + 130 * Math.sin(angle);
      const bead = ring.querySelector('[data-pomodoro-ring-bead]');
      if (bead) {
        bead.setAttribute('cx', x.toFixed(2));
        bead.setAttribute('cy', y.toFixed(2));
        bead.setAttribute('r', running ? '4' : '2.5');
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
    if (timer) { cancelAnimationFrame(timer); timer = null; }
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
                <stop offset="0%" stop-color="#dff7ff" />
                <stop offset="32%" stop-color="#8ad8ff" />
                <stop offset="68%" stop-color="#72baff" />
                <stop offset="100%" stop-color="#bfeaff" />
              </linearGradient>
              <filter id="pomodoroDashboardBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
              <filter id="pomodoroDashboardBlurSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="15" /></filter>
            </defs>
            <circle cx="160" cy="160" r="130" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="8" />
            <circle cx="160" cy="160" r="129" fill="none" stroke="url(#pomodoroMercuryDashboardGradient)" stroke-width="14" stroke-linecap="round" stroke-dasharray="816.81 0.001" stroke-dashoffset="0" filter="url(#pomodoroDashboardBlurSoft)" opacity=".26" data-pomodoro-ring-arc class="pomodoro-fluid-arc-ambient" />
            <circle cx="160" cy="160" r="129" fill="none" stroke="url(#pomodoroMercuryDashboardGradient)" stroke-width="10" stroke-linecap="round" stroke-dasharray="816.81 0.001" stroke-dashoffset="0" filter="url(#pomodoroDashboardBlur)" opacity=".46" data-pomodoro-ring-arc class="pomodoro-fluid-arc-glow" />
            <circle cx="160" cy="160" r="129" fill="none" stroke="rgba(176,229,255,.72)" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="816.81 0.001" stroke-dashoffset="0" opacity=".52" data-pomodoro-ring-arc class="pomodoro-fluid-arc" />
            <circle cx="290" cy="160" r="3" fill="#dff8ff" filter="url(#pomodoroDashboardBlur)" opacity=".60" data-pomodoro-ring-bead />
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
      if (timer) { cancelAnimationFrame(timer); timer = null; }
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
      if (timer) cancelAnimationFrame(timer);
      timer = null;
    }
  };
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();