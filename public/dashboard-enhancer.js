(() => {
  const dashboardSelector = '.dashboard-screen';
  const NAV_ITEMS = [
    ['home', '⌂', 'Home'],
    ['courses', '▣', 'Courses'],
    ['collections', '▤', 'Collections'],
    ['notes', '□', 'Notes'],
    ['more', '•••', 'More'],
  ];
  const qs = (root, selector) => root.querySelector(selector);
  const qsa = (root, selector) => [...root.querySelectorAll(selector)];

  function injectDashboard(dashboard) {
    if (!dashboard || dashboard.dataset.enhanced === 'true') return;
    dashboard.dataset.enhanced = 'true';
    const shell = qs(dashboard, '.dashboard-shell');
    if (!shell) return;
    addNotificationControl(dashboard);
    addRecentNotes(shell);
    addProgressSnapshot(shell);
    addExactCourseStackStyles();
    addBottomNavigation(dashboard, shell);
    enhanceInteractions(shell);
  }

  function addNotificationControl(dashboard) {
    const controls = qs(dashboard, '.dashboard-controls');
    if (!controls || qs(controls, '.dashboard-notification')) return;
    const button = document.createElement('button');
    button.className = 'icon-button dashboard-notification';
    button.type = 'button';
    button.setAttribute('aria-label', 'Notifications');
    button.innerHTML = '<span class="dashboard-bell-glyph">●</span><span class="dashboard-notification-dot" aria-hidden="true"></span>';
    button.addEventListener('click', () => showDashboardOverlay('Notifications', '<p>You are all caught up.</p><button class="primary-button" data-dashboard-close>Close</button>'));
    controls.insertBefore(button, controls.firstElementChild);
  }

  function addRecentNotes(shell) {
    if (qs(shell, '.dashboard-recent-notes')) return;
    const cards = qsa(shell, '.course-dashboard-card');
    if (!cards.length) return;
    const recent = document.createElement('section');
    recent.className = 'dashboard-recent-notes glass-card';
    const courseItems = cards.slice(0, 3).map((card, index) => {
      const title = qs(card, '.course-copy h3')?.textContent?.trim() || 'Course';
      const count = (card.textContent.match(/(\d+)\s+notes?/i) || [])[1] || '0';
      return `<button type="button" class="dashboard-recent-item" data-dashboard-course-index="${index}"><span class="dashboard-recent-index">0${index + 1}</span><span><strong>${escapeHtml(title)}</strong><small>${count} ${Number(count) === 1 ? 'note' : 'notes'} · Open course</small></span><b>›</b></button>`;
    }).join('');
    const total = cards.slice(0, 3).reduce((sum, card) => sum + Number((card.textContent.match(/(\d+)\s+notes?/i) || [])[1] || 0), 0);
    recent.innerHTML = `<div class="dashboard-recent-heading"><div><span class="eyebrow">Workspace activity</span><h2>Recent notes</h2></div><span>${total} notes</span></div><div class="dashboard-recent-list">${courseItems}</div>`;
    const addCard = qs(shell, '.add-course-trigger');
    if (addCard) addCard.insertAdjacentElement('beforebegin', recent); else shell.appendChild(recent);
    qsa(recent, '[data-dashboard-course-index]').forEach((button) => button.addEventListener('click', () => {
      const target = qsa(shell, '.course-dashboard-card')[Number(button.dataset.dashboardCourseIndex)];
      qs(target || shell, '.course-open')?.click();
    }));
  }

  function addProgressSnapshot(shell) {
    if (qs(shell, '.dashboard-progress-snapshot')) return;
    const cards = qsa(shell, '.course-dashboard-card');
    const totalCourses = cards.length;
    let totalNotes = 0;
    let activeProgress = 0;
    let activeCourse = 'Your learning';
    cards.forEach((card, index) => {
      const text = card.textContent || '';
      const noteMatch = text.match(/(\d+)\s+notes?/i);
      if (noteMatch) totalNotes += Number(noteMatch[1]);
      if (index === 0) {
        activeCourse = qs(card, '.course-copy h3')?.textContent?.trim() || activeCourse;
        activeProgress = Number((text.match(/(\d+)%\s+complete/i) || [])[1] || 0);
      }
    });
    const section = document.createElement('section');
    section.className = 'dashboard-progress-snapshot glass-card';
    section.innerHTML = `<div class="dashboard-snapshot-heading"><div><span class="eyebrow">Progress snapshot</span><h2>Your learning at a glance</h2></div><span class="dashboard-snapshot-live">Live</span></div><div class="dashboard-snapshot-grid"><div class="dashboard-snapshot-stat"><span>Courses</span><strong>${totalCourses}</strong><small>in your workspace</small></div><div class="dashboard-snapshot-stat"><span>Notes</span><strong>${totalNotes}</strong><small>captured so far</small></div><div class="dashboard-snapshot-stat dashboard-progress-stat"><span>Current course</span><strong>${activeProgress}%</strong><small>${escapeHtml(activeCourse)}</small><div class="dashboard-progress-track"><i style="width:${Math.max(0, Math.min(activeProgress, 100))}%"></i></div></div></div>`;
    const firstCard = qs(shell, '.course-dashboard-card:first-of-type');
    if (!firstCard) {
      shell.appendChild(section);
      return;
    }
    firstCard.insertAdjacentElement('beforebegin', section);
    const addCard = qs(shell, '.add-course-trigger');
    if (addCard) firstCard.insertAdjacentElement('beforebegin', addCard);
  }

  function addExactCourseStackStyles() {
    if (document.getElementById('dashboard-exact-course-stack-style')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-exact-course-stack-style';
    style.textContent = `
      /* Exact required sequence: Recent Notes -> Progress Snapshot -> Add
         New Course -> course cards. The course grid is the one alignment
         boundary for the snapshot, button, and every course card. */
      .dashboard-screen .course-grid{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        column-gap:0!important;
        row-gap:14px!important;
        align-items:start!important;
        margin-top:18px!important;
      }
      .dashboard-screen .course-grid > .dashboard-progress-snapshot{
        grid-column:1!important;
        width:100%!important;
        margin:0!important;
      }
      .dashboard-screen .course-grid > .add-course-trigger{
        grid-column:1!important;
        justify-self:end!important;
        align-self:start!important;
        order:0!important;
        width:min(210px,55vw)!important;
        max-width:100%!important;
        min-height:48px!important;
        height:48px!important;
        margin:0!important;
        padding:5px 7px 5px 5px!important;
        display:grid!important;
        grid-template-columns:38px minmax(0,1fr) 18px!important;
        align-items:center!important;
        gap:7px!important;
        border-radius:15px!important;
        overflow:hidden!important;
        box-sizing:border-box!important;
      }
      .dashboard-screen .course-grid > .add-course-trigger .add-course-symbol{
        width:38px!important;
        height:38px!important;
        flex:none!important;
      }
      .dashboard-screen .course-grid > .add-course-trigger > span:nth-child(2){
        min-width:0!important;
        width:auto!important;
        display:block!important;
      }
      .dashboard-screen .course-grid > .add-course-trigger strong{
        display:block!important;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        font-size:12px!important;
        line-height:1.1!important;
      }
      .dashboard-screen .course-grid > .add-course-trigger small{display:none!important}
      .dashboard-screen .course-grid > .add-course-trigger > span:last-child{
        display:grid!important;
        place-items:center!important;
        width:18px!important;
        min-width:18px!important;
      }
      .dashboard-screen .course-grid > .course-dashboard-card{
        grid-column:1!important;
        width:100%!important;
        margin:0!important;
        align-self:start!important;
      }
      @media(max-width:480px){
        .dashboard-screen .course-grid{
          row-gap:13px!important;
          margin-top:18px!important;
        }
        .dashboard-screen .course-grid > .add-course-trigger{
          width:min(210px,55vw)!important;
          min-height:48px!important;
          height:48px!important;
          grid-template-columns:38px minmax(0,1fr) 18px!important;
          gap:7px!important;
          padding:5px 7px 5px 5px!important;
          border-radius:15px!important;
        }
      }
      @media(max-width:380px){
        .dashboard-screen .course-grid{
          row-gap:12px!important;
          margin-top:17px!important;
        }
        .dashboard-screen .course-grid > .add-course-trigger{
          width:min(202px,56vw)!important;
          min-height:46px!important;
          height:46px!important;
          grid-template-columns:36px minmax(0,1fr) 18px!important;
          gap:7px!important;
          padding:5px 6px 5px 5px!important;
          border-radius:14px!important;
        }
        .dashboard-screen .course-grid > .add-course-trigger .add-course-symbol{
          width:36px!important;
          height:36px!important;
        }
      }
      @media(max-width:330px){
        .dashboard-screen .course-grid{
          row-gap:11px!important;
          margin-top:16px!important;
        }
        .dashboard-screen .course-grid > .add-course-trigger{
          width:min(194px,58vw)!important;
          min-height:44px!important;
          height:44px!important;
          grid-template-columns:34px minmax(0,1fr) 16px!important;
          gap:6px!important;
          padding:4px 5px!important;
          border-radius:13px!important;
        }
        .dashboard-screen .course-grid > .add-course-trigger .add-course-symbol{
          width:34px!important;
          height:34px!important;
        }
        .dashboard-screen .course-grid > .add-course-trigger > span:last-child{
          width:16px!important;
          min-width:16px!important;
        }
      }
      /* Once Snapshot and Add New Course become grid children, they are no
         longer the React list's first child. Preserve first-course behaviour
         by targeting the first article rather than :first-child. */
      .dashboard-screen .course-grid > .course-dashboard-card:first-of-type{
        grid-column:1!important;
      }
    `;
    document.head.appendChild(style);
  }

  function addBottomNavigation(dashboard, shell) {
    if (qs(shell, '.dashboard-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'dashboard-bottom-nav glass-card';
    nav.setAttribute('aria-label', 'Dashboard navigation');
    nav.innerHTML = NAV_ITEMS.map(([key, icon, label], index) => `<button type="button" class="dashboard-nav-item${index === 0 ? ' active' : ''}" data-dashboard-nav="${key}" aria-label="${label}"><span class="dashboard-nav-icon">${icon}</span><span>${label}</span></button>`).join('');
    shell.appendChild(nav);
    qsa(nav, '[data-dashboard-nav]').forEach((button) => button.addEventListener('click', () => navigateDashboard(button.dataset.dashboardNav, dashboard, shell, nav)));
  }

  function navigateDashboard(key, dashboard, shell, nav) {
    qsa(nav, '.dashboard-nav-item').forEach((item) => item.classList.toggle('active', item.dataset.dashboardNav === key));
    if (key === 'home') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (key === 'courses') { qs(shell, '[data-dashboard-courses]')?.click(); return; }
    const firstCourse = qs(shell, '.course-dashboard-card:first-of-type .course-open');
    if (key === 'collections' || key === 'notes') {
      if (!firstCourse) return;
      firstCourse.click();
      setTimeout(() => {
        const targetLabel = key === 'collections' ? 'Collections' : 'Notes';
        const target = qsa(document, '.course-content-tabs [role="tab"]').find((button) => (button.textContent || '').trim() === targetLabel);
        target?.click();
      }, 40);
      return;
    }
    if (key === 'more') {
      showDashboardOverlay('Quick access', '<div class="dashboard-more-actions"><button type="button" data-dashboard-trigger="course">Add a course</button><button type="button" data-dashboard-trigger="theme">Theme</button><button type="button" data-dashboard-trigger="settings">Settings</button><button type="button" data-dashboard-trigger="account">Account</button></div>');
      setTimeout(() => qsa(document, '[data-dashboard-trigger]').forEach((action) => action.addEventListener('click', () => {
        const map = { course: '.add-course-trigger', theme: '[aria-label="Theme"]', settings: '[aria-label="Settings"]', account: '[aria-label="Account"]' };
        const target = qs(dashboard, map[action.dataset.dashboardTrigger]);
        closeDashboardOverlay();
        target?.click();
      })), 0);
    }
  }

  function enhanceInteractions(shell) {
    const createButton = qs(shell, '.add-course-trigger');
    if (createButton) createButton.setAttribute('aria-label', 'Add a new course');
  }

  function showDashboardOverlay(title, body) {
    closeDashboardOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'dashboard-enhancer-overlay';
    overlay.innerHTML = `<section class="dashboard-enhancer-modal glass-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><button type="button" class="modal-close dashboard-enhancer-close" aria-label="Close">×</button><span class="modal-symbol">✦</span><h2>${escapeHtml(title)}</h2><div class="dashboard-enhancer-body">${body}</div></section>`;
    document.body.appendChild(overlay);
    qs(overlay, '.dashboard-enhancer-close').addEventListener('click', closeDashboardOverlay);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeDashboardOverlay(); });
    qs(overlay, '[data-dashboard-close]')?.addEventListener('click', closeDashboardOverlay);
  }

  function closeDashboardOverlay() { document.querySelector('.dashboard-enhancer-overlay')?.remove(); }
  function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char])); }

  const observer = new MutationObserver(() => document.querySelectorAll(dashboardSelector).forEach(injectDashboard));
  document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll(dashboardSelector).forEach(injectDashboard); observer.observe(document.body, { childList: true, subtree: true }); });
})();
