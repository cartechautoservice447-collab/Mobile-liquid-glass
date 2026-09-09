(() => {
  const ROOT_ID = 'dashboard-pomodoro-premium-root';
  const STYLE_ID = 'dashboard-pomodoro-premium-style';
  const MODES = {
    focus: { label: 'Focus', minutes: 25, status: 'Stay focused' },
    short: { label: 'Short Break', minutes: 5, status: 'Take a short break' },
    long: { label: 'Long Break', minutes: 15, status: 'Recharge and reset' },
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const formatTime = (seconds) => {
    const safe = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
    return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
  };

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .dashboard-pomodoro-premium-backdrop{
        position:fixed;
        inset:0;
        z-index:10000;
        display:grid;
        place-items:center;
        padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
        background:rgba(3,8,22,.44);
        backdrop-filter:blur(18px) saturate(135%);
        -webkit-backdrop-filter:blur(18px) saturate(135%);
        animation:dashboardPomodoroFadeIn .22s ease both;
      }
      .dashboard-pomodoro-premium-modal{
        position:relative;
        width:min(100%,760px);
        max-height:calc(100dvh - 28px);
        overflow:auto;
        box-sizing:border-box;
        padding:42px 44px 38px;
        border:1px solid rgba(210,231,255,.30);
        border-top-color:rgba(255,255,255,.48);
        border-radius:42px;
        background:
          radial-gradient(130% 100% at 0% 0%,rgba(188,217,255,.18),transparent 58%),
          radial-gradient(100% 90% at 100% 100%,rgba(165,94,255,.16),transparent 62%),
          linear-gradient(145deg,rgba(92,104,145,.72),rgba(52,48,81,.76));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.20),
          inset 0 -18px 42px rgba(4,8,28,.18),
          0 32px 90px rgba(0,0,0,.40);
        color:#f5f9ff;
        isolation:isolate;
        scrollbar-width:none;
      }
      .dashboard-pomodoro-premium-modal::-webkit-scrollbar{display:none}
      .dashboard-pomodoro-premium-modal::before{
        content:'';
        position:absolute;
        inset:0;
        border-radius:inherit;
        pointer-events:none;
        background:linear-gradient(120deg,rgba(255,255,255,.11),transparent 28%,transparent 72%,rgba(255,255,255,.045));
        opacity:.9;
        z-index:-1;
      }
      .dashboard-pomodoro-premium-close{
        position:absolute;
        top:-55px;
        right:-8px;
        width:52px;
        height:52px;
        display:grid;
        place-items:center;
        border:1px solid rgba(235,246,255,.20);
        border-radius:17px;
        color:#f6fbff;
        background:rgba(255,255,255,.09);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 12px 24px rgba(0,0,0,.16);
        backdrop-filter:blur(20px) saturate(150%);
        -webkit-backdrop-filter:blur(20px) saturate(150%);
        cursor:pointer;
        transition:transform .18s ease,background .18s ease;
      }
      .dashboard-pomodoro-premium-close:hover{transform:translateY(-1px);background:rgba(255,255,255,.14)}
      .dashboard-pomodoro-premium-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:18px;
      }
      .dashboard-pomodoro-premium-title{min-width:0}
      .dashboard-pomodoro-premium-eyebrow{
        display:block;
        font-size:15px;
        font-weight:800;
        letter-spacing:.18em;
        text-transform:uppercase;
        color:rgba(237,247,255,.78);
      }
      .dashboard-pomodoro-premium-title h2{
        margin:11px 0 0;
        font-size:clamp(34px,6vw,52px);
        line-height:.98;
        letter-spacing:-.045em;
      }
      .dashboard-pomodoro-premium-clock-icon{
        flex:0 0 auto;
        width:76px;
        height:76px;
        display:grid;
        place-items:center;
        border:1px solid rgba(126,224,255,.46);
        border-radius:23px;
        color:#e9fbff;
        background:linear-gradient(145deg,rgba(84,143,196,.22),rgba(71,66,121,.20));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 10px 26px rgba(19,98,161,.12);
      }
      .dashboard-pomodoro-premium-ring-area{
        display:grid;
        justify-items:center;
        padding:24px 0 4px;
      }
      .dashboard-pomodoro-premium-ring{
        position:relative;
        width:min(82vw,590px);
        aspect-ratio:1;
        display:grid;
        place-items:center;
      }
      .dashboard-pomodoro-premium-ring::before{
        content:'';
        position:absolute;
        inset:9%;
        border-radius:50%;
        background:
          radial-gradient(circle at 30% 24%,rgba(120,192,255,.24),transparent 40%),
          radial-gradient(circle at 72% 78%,rgba(120,64,220,.22),transparent 48%),
          rgba(20,33,72,.28);
        box-shadow:
          inset 0 0 34px rgba(183,222,255,.08),
          0 0 34px rgba(112,180,255,.13);
      }
      .dashboard-pomodoro-premium-ring svg{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        overflow:visible;
      }
      .dashboard-pomodoro-ring-track{stroke:rgba(205,230,255,.10);stroke-width:8;fill:none}
      .dashboard-pomodoro-ring-glow{fill:none;stroke:#eaf6ff;stroke-width:13;stroke-linecap:round;filter:url(#dashboard-pomodoro-glow);opacity:.78}
      .dashboard-pomodoro-ring-arc{fill:none;stroke:#f5fbff;stroke-width:7;stroke-linecap:round;filter:url(#dashboard-pomodoro-glow-soft);transition:stroke-dasharray .18s linear}
      .dashboard-pomodoro-ring-dot{fill:#ffffff;filter:url(#dashboard-pomodoro-head-glow)}
      .dashboard-pomodoro-premium-ring-content{
        position:relative;
        z-index:2;
        display:grid;
        justify-items:center;
        gap:14px;
        transform:translateY(2px);
        pointer-events:none;
      }
      .dashboard-pomodoro-premium-ring-label{
        font-size:18px;
        font-weight:800;
        letter-spacing:.23em;
        text-transform:uppercase;
        color:rgba(230,241,255,.74);
      }
      .dashboard-pomodoro-premium-ring-time{
        font-size:clamp(66px,12vw,104px);
        font-weight:820;
        letter-spacing:-.055em;
        line-height:.88;
        font-variant-numeric:tabular-nums;
        text-shadow:0 3px 20px rgba(15,45,90,.12);
      }
      .dashboard-pomodoro-premium-status{
        margin:4px 0 0;
        font-size:clamp(18px,2.8vw,27px);
        color:rgba(235,243,255,.76);
        font-weight:600;
      }
      .dashboard-pomodoro-premium-modes{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:18px;
        margin-top:22px;
      }
      .dashboard-pomodoro-premium-mode{
        min-width:0;
        min-height:112px;
        padding:16px 16px 14px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:8px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:24px;
        color:rgba(241,247,255,.82);
        background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.10);
        cursor:pointer;
        transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease;
      }
      .dashboard-pomodoro-premium-mode strong{font-size:clamp(19px,3vw,29px);line-height:1.05;text-align:center}
      .dashboard-pomodoro-premium-mode small{font-size:16px;color:rgba(232,242,255,.52)}
      .dashboard-pomodoro-premium-mode:hover{transform:translateY(-1px);background:rgba(255,255,255,.055)}
      .dashboard-pomodoro-premium-mode.is-active{
        border-color:rgba(115,222,255,.55);
        background:linear-gradient(145deg,rgba(130,212,255,.12),rgba(95,95,170,.10));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 0 1px rgba(108,212,255,.07),0 12px 30px rgba(55,158,217,.10);
      }
      .dashboard-pomodoro-premium-controls{
        display:grid;
        grid-template-columns:112px minmax(0,1fr);
        gap:18px;
        margin-top:28px;
      }
      .dashboard-pomodoro-premium-reset,.dashboard-pomodoro-premium-primary{
        min-height:96px;
        border-radius:24px;
        cursor:pointer;
        transition:transform .18s ease,filter .18s ease,box-shadow .18s ease;
      }
      .dashboard-pomodoro-premium-reset:hover,.dashboard-pomodoro-premium-primary:hover{transform:translateY(-1px);filter:brightness(1.03)}
      .dashboard-pomodoro-premium-reset{
        display:grid;
        place-items:center;
        border:1px solid rgba(255,255,255,.14);
        color:#f1f8ff;
        background:rgba(255,255,255,.055);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
      }
      .dashboard-pomodoro-premium-primary{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:14px;
        border:1px solid rgba(207,244,255,.52);
        color:#071226;
        background:linear-gradient(145deg,#e9f8ff 0%,#c3ebff 58%,#afe2fb 100%);
        box-shadow:0 18px 42px rgba(71,178,232,.18),inset 0 1px 0 rgba(255,255,255,.82);
        font-size:clamp(24px,3.2vw,34px);
        font-weight:820;
      }
      .dashboard-pomodoro-premium-hint{
        margin:16px 0 0;
        text-align:center;
        font-size:13px;
        color:rgba(229,240,255,.45);
      }
      .dashboard-pomodoro-premium-complete .dashboard-pomodoro-premium-ring-arc{filter:url(#dashboard-pomodoro-glow-strong)}
      @keyframes dashboardPomodoroFadeIn{from{opacity:0}to{opacity:1}}
      @media(max-width:700px){
        .dashboard-pomodoro-premium-modal{width:min(100%,760px);padding:30px 26px 26px;border-radius:34px;}
        .dashboard-pomodoro-premium-close{top:12px;right:12px;width:46px;height:46px;border-radius:15px}
        .dashboard-pomodoro-premium-header{padding-right:52px}
        .dashboard-pomodoro-premium-eyebrow{font-size:12px}
        .dashboard-pomodoro-premium-clock-icon{width:58px;height:58px;border-radius:19px}
        .dashboard-pomodoro-premium-ring-area{padding-top:18px}
        .dashboard-pomodoro-premium-ring{width:min(78vw,480px)}
        .dashboard-pomodoro-premium-modes{gap:10px;margin-top:18px}
        .dashboard-pomodoro-premium-mode{min-height:84px;padding:11px 8px;border-radius:20px;gap:5px}
        .dashboard-pomodoro-premium-mode strong{font-size:17px}
        .dashboard-pomodoro-premium-mode small{font-size:12px}
        .dashboard-pomodoro-premium-controls{grid-template-columns:82px minmax(0,1fr);gap:10px;margin-top:18px}
        .dashboard-pomodoro-premium-reset,.dashboard-pomodoro-premium-primary{min-height:70px;border-radius:20px}
        .dashboard-pomodoro-premium-primary{font-size:22px;gap:10px}
      }
      @media(max-width:430px){
        .dashboard-pomodoro-premium-backdrop{padding:10px}
        .dashboard-pomodoro-premium-modal{padding:25px 18px 20px;border-radius:28px;max-height:calc(100dvh - 20px)}
        .dashboard-pomodoro-premium-header{gap:10px;padding-right:48px}
        .dashboard-pomodoro-premium-title h2{font-size:33px;margin-top:7px}
        .dashboard-pomodoro-premium-ring{width:min(78vw,330px)}
        .dashboard-pomodoro-premium-ring-label{font-size:12px;letter-spacing:.20em}
        .dashboard-pomodoro-premium-ring-time{font-size:64px}
        .dashboard-pomodoro-premium-status{font-size:17px}
        .dashboard-pomodoro-premium-modes{gap:7px}
        .dashboard-pomodoro-premium-mode{min-height:78px;border-radius:17px;padding:9px 5px}
        .dashboard-pomodoro-premium-mode strong{font-size:14px}
        .dashboard-pomodoro-premium-mode small{font-size:10px}
        .dashboard-pomodoro-premium-controls{grid-template-columns:70px minmax(0,1fr)}
        .dashboard-pomodoro-premium-reset,.dashboard-pomodoro-premium-primary{min-height:62px;border-radius:17px}
        .dashboard-pomodoro-premium-primary{font-size:18px}
        .dashboard-pomodoro-premium-hint{display:none}
      }
      @media(prefers-reduced-motion:reduce){
        .dashboard-pomodoro-premium-backdrop,.dashboard-pomodoro-premium-mode,.dashboard-pomodoro-premium-reset,.dashboard-pomodoro-premium-primary,.dashboard-pomodoro-premium-close{animation:none!important;transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function icon(name, size = 28) {
    const paths = {
      x: '<path d="M6 6l12 12M18 6L6 18"/>',
      clock: '<circle cx="12" cy="13" r="7.1"/><path d="M9.6 3.3h4.8M12 5.7V4.2M12 9.6v3.7h3"/><path d="M16.9 5.6l1.4-1.4"/>',
      pause: '<rect x="7.3" y="6" width="2.9" height="12" rx=".7"/><rect x="13.8" y="6" width="2.9" height="12" rx=".7"/>',
      play: '<path d="M8.2 5.9v12.2l9.6-6.1z" fill="currentColor" stroke="none"/>',
      reset: '<path d="M7.2 8.8A6.6 6.6 0 1 0 9.1 5.1"/><path d="M5.6 4.7v4.7h4.7"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }

  function buildModal() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = ROOT_ID;
    backdrop.className = 'dashboard-pomodoro-premium-backdrop';
    backdrop.innerHTML = `
      <section class="dashboard-pomodoro-premium-modal" role="dialog" aria-modal="true" aria-label="Pomodoro focus timer">
        <button class="dashboard-pomodoro-premium-close" type="button" aria-label="Close Pomodoro">${icon('x', 28)}</button>
        <header class="dashboard-pomodoro-premium-header">
          <div class="dashboard-pomodoro-premium-title">
            <span class="dashboard-pomodoro-premium-eyebrow">Focus timer</span>
            <h2>Pomodoro</h2>
          </div>
          <span class="dashboard-pomodoro-premium-clock-icon">${icon('clock', 34)}</span>
        </header>
        <div class="dashboard-pomodoro-premium-ring-area">
          <div class="dashboard-pomodoro-premium-ring" data-ring>
            <svg viewBox="0 0 320 320" aria-hidden="true">
              <defs>
                <filter id="dashboard-pomodoro-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="dashboard-pomodoro-glow-soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="dashboard-pomodoro-glow-strong" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="dashboard-pomodoro-head-glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <circle class="dashboard-pomodoro-ring-track" cx="160" cy="160" r="137"/>
              <circle data-ring-glow class="dashboard-pomodoro-ring-glow" cx="160" cy="160" r="137" pathLength="1"/>
              <circle data-ring-arc class="dashboard-pomodoro-ring-arc" cx="160" cy="160" r="137" pathLength="1" transform="rotate(-90 160 160)"/>
              <circle class="dashboard-pomodoro-ring-dot" cx="23" cy="160" r="7"/>
            </svg>
            <div class="dashboard-pomodoro-premium-ring-content">
              <span class="dashboard-pomodoro-premium-ring-label" data-ring-label>Focus</span>
              <span class="dashboard-pomodoro-premium-ring-time" data-ring-time>25:00</span>
            </div>
          </div>
          <p class="dashboard-pomodoro-premium-status" data-status>Stay focused</p>
        </div>
        <div class="dashboard-pomodoro-premium-modes" role="tablist" aria-label="Pomodoro duration">
          ${Object.entries(MODES).map(([key, item]) => `
            <button class="dashboard-pomodoro-premium-mode${key === 'focus' ? ' is-active' : ''}" type="button" data-mode="${key}" role="tab" aria-selected="${key === 'focus'}">
              <strong>${item.label}</strong><small>${item.minutes} min</small>
            </button>
          `).join('')}
        </div>
        <div class="dashboard-pomodoro-premium-controls">
          <button class="dashboard-pomodoro-premium-reset" type="button" data-reset aria-label="Reset Pomodoro">${icon('reset', 27)}</button>
          <button class="dashboard-pomodoro-premium-primary" type="button" data-toggle>${icon('pause', 29)}<span data-toggle-label>Pause</span></button>
        </div>
        <p class="dashboard-pomodoro-premium-hint">Focus, then take a deliberate break. Your timer stays smooth while the screen is open.</p>
      </section>
    `;

    document.body.appendChild(backdrop);
    return backdrop;
  }

  function open() {
    installStyles();
    const backdrop = buildModal();
    const modal = backdrop.querySelector('.dashboard-pomodoro-premium-modal');
    const ringArc = backdrop.querySelector('[data-ring-arc]');
    const ringGlow = backdrop.querySelector('[data-ring-glow]');
    const ringTime = backdrop.querySelector('[data-ring-time]');
    const ringLabel = backdrop.querySelector('[data-ring-label]');
    const status = backdrop.querySelector('[data-status]');
    const toggle = backdrop.querySelector('[data-toggle]');
    const toggleLabel = backdrop.querySelector('[data-toggle-label]');
    const resetButton = backdrop.querySelector('[data-reset]');
    const modeButtons = [...backdrop.querySelectorAll('[data-mode]')];

    let mode = 'focus';
    let duration = MODES[mode].minutes * 60;
    let remaining = duration;
    let running = true;
    let deadline = performance.now() + duration * 1000;
    let frame = 0;
    let lastShown = '';

    const close = () => {
      cancelAnimationFrame(frame);
      backdrop.remove();
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };

    const setMode = (nextMode, autoStart = false) => {
      mode = nextMode;
      duration = MODES[mode].minutes * 60;
      remaining = duration;
      running = autoStart;
      deadline = performance.now() + duration * 1000;
      update();
    };

    const update = () => {
      const progress = clamp(remaining / duration, 0, 1);
      const arcValue = Math.max(0.001, progress);
      ringArc.style.strokeDasharray = `${arcValue} ${1 - arcValue}`;
      ringGlow.style.strokeDasharray = `${arcValue} ${1 - arcValue}`;
      const shown = formatTime(remaining);
      if (shown !== lastShown) {
        ringTime.textContent = shown;
        lastShown = shown;
      }
      ringLabel.textContent = MODES[mode].label;
      status.textContent = remaining <= 0 ? `${MODES[mode].label} complete` : running ? MODES[mode].status : 'Paused';
      toggleLabel.textContent = running ? 'Pause' : remaining <= 0 ? 'Restart' : 'Start';
      toggle.innerHTML = `${icon(running ? 'pause' : 'play', 29)}<span data-toggle-label>${running ? 'Pause' : remaining <= 0 ? 'Restart' : 'Start'}</span>`;
      backdrop.classList.toggle('dashboard-pomodoro-premium-complete', remaining <= 0);
      modeButtons.forEach((button) => {
        const active = button.dataset.mode === mode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    };

    const tick = () => {
      if (!running) return;
      remaining = Math.max(0, (deadline - performance.now()) / 1000);
      update();
      if (remaining <= 0) {
        running = false;
        update();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const toggleTimer = () => {
      if (running) {
        remaining = Math.max(0, (deadline - performance.now()) / 1000);
        running = false;
        cancelAnimationFrame(frame);
        update();
        return;
      }
      if (remaining <= 0) remaining = duration;
      deadline = performance.now() + remaining * 1000;
      running = true;
      update();
      frame = requestAnimationFrame(tick);
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      remaining = duration;
      running = false;
      deadline = performance.now() + duration * 1000;
      update();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === ' ' && document.activeElement !== toggle) {
        event.preventDefault();
        toggleTimer();
      }
    };

    backdrop.querySelector('.dashboard-pomodoro-premium-close').addEventListener('click', close);
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    toggle.addEventListener('click', toggleTimer);
    resetButton.addEventListener('click', reset);
    modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode, false)));
    window.addEventListener('keydown', onKeyDown);

    document.body.style.overflow = 'hidden';
    modal.focus?.();
    update();
    frame = requestAnimationFrame(tick);
  }

  window.addEventListener('dashboard-open-pomodoro', open);
})();
