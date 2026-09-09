(() => {
  const DASHBOARD = '.dashboard-screen';
  const QUICK_ACTIONS = '.quick-actions';
  const SPACER_CLASS = 'dashboard-course-message-reserve';
  const POMODORO_CLASS = 'dashboard-pomodoro-action';
  const STYLE_ID = 'dashboard-pomodoro-layout-style';

  const qs = (root, selector) => root?.querySelector(selector);

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .dashboard-screen .${SPACER_CLASS}{
        width:100%!important;
        height:26px!important;
        min-height:26px!important;
        flex:0 0 26px!important;
        pointer-events:none!important;
      }
      .dashboard-screen .dashboard-bottom-nav{
        margin-top:10px!important;
        margin-bottom:max(18px, env(safe-area-inset-bottom))!important;
      }
      @media(max-width:480px){
        .dashboard-screen .${SPACER_CLASS}{height:24px!important;min-height:24px!important;flex-basis:24px!important}
        .dashboard-screen .dashboard-bottom-nav{margin-top:10px!important;margin-bottom:max(20px, env(safe-area-inset-bottom))!important}
      }
    `;
    document.head.appendChild(style);
  }

  function addPomodoroCard(dashboard) {
    const actions = qs(dashboard, QUICK_ACTIONS);
    if (!actions || qs(actions, `.${POMODORO_CLASS}`)) return;

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

    actions.appendChild(button);
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
      const tools = [...document.querySelectorAll('.course-details-screen .course-tool-folder')];
      const study = tools.find((button) => (button.textContent || '').trim().toLowerCase().startsWith('study session'));
      if (study) {
        study.click();
        return;
      }
      if (Date.now() - started < 1600) requestAnimationFrame(seek);
    };
    requestAnimationFrame(seek);
  }

  function addPermanentCourseSpacing(dashboard) {
    const grid = qs(dashboard, '.course-grid');
    if (!grid) return;
    if (qs(grid, `.${SPACER_CLASS}`)) return;
    const spacer = document.createElement('div');
    spacer.className = SPACER_CLASS;
    spacer.setAttribute('aria-hidden', 'true');
    grid.insertAdjacentElement('afterend', spacer);
  }

  function enhance(dashboard) {
    if (!dashboard) return;
    installStyles();
    addPomodoroCard(dashboard);
    addPermanentCourseSpacing(dashboard);
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
