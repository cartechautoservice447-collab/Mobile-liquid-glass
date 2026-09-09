(() => {
  const DASHBOARD = '.dashboard-screen';
  const QUICK_ACTIONS = '.quick-actions';
  const POMODORO_CLASS = 'dashboard-pomodoro-action';
  const STYLE_ID = 'dashboard-pomodoro-layout-style';

  const qs = (root, selector) => root?.querySelector(selector);

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Keep a fixed amount of vertical room at the end of the dashboard.
         It remains when the transient Course created message disappears. */
      .dashboard-screen .dashboard-shell::after{
        content:'';
        display:block;
        width:100%;
        height:28px;
        min-height:28px;
        pointer-events:none;
      }
      /* Reserve scroll room for the fixed five-item navigation without
         changing the size or position of the existing glass cards. */
      .dashboard-screen .dashboard-shell{
        padding-bottom:108px!important;
      }
      .dashboard-screen .dashboard-bottom-nav{
        bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))!important;
      }
      @media(max-width:480px){
        .dashboard-screen .dashboard-shell{
          padding-bottom:110px!important;
        }
        .dashboard-screen .dashboard-bottom-nav{
          bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function addPomodoroCard(dashboard) {
    const actions = qs(dashboard, QUICK_ACTIONS);
    if (!actions || qs(actions, `.${POMODORO_CLASS}`)) return;

    const overview = [...actions.querySelectorAll('.action-card')]
      .find((card) => (card.textContent || '').trim().toLowerCase().includes('overview'));
    if (!overview) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `glass-card action-card ${POMODORO_CLASS}`;
    button.setAttribute('aria-label', 'Pomodoro');
    button.innerHTML = `
      <span class="action-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="13" r="7.2"></circle>
          <path d="M9.5 3h5M12 5.8V4.1M9.8 13h4.5M12 9.8v3.7"></path>
          <path d="M16.8 5.4l1.5-1.5"></path>
        </svg>
      </span>
      <span><strong>Pomodoro</strong><small>Focus timer</small></span>
      <span class="action-arrow">›</span>
    `;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPomodoro(dashboard);
    });

    overview.insertAdjacentElement('afterend', button);
  }

  function openPomodoro(dashboard) {
    const firstCourse = qs(dashboard, '.course-dashboard-card .course-open');
    if (!firstCourse) {
      qs(dashboard, '.add-course-trigger')?.click();
      return;
    }

    firstCourse.click();
    const started = Date.now();
    const seek = () => {
      const study = [...document.querySelectorAll('.course-details-screen .course-tool-folder')]
        .find((button) => (button.textContent || '').trim().toLowerCase().startsWith('study session'));
      if (study) {
        study.click();
        return;
      }
      if (Date.now() - started < 1600) requestAnimationFrame(seek);
    };
    requestAnimationFrame(seek);
  }

  function enhance(dashboard) {
    if (!dashboard) return;
    installStyles();
    addPomodoroCard(dashboard);
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll(DASHBOARD).forEach(enhance);
  });

  function boot() {
    document.querySelectorAll(DASHBOARD).forEach(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
