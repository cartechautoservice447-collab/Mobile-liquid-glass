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
    addProgressSnapshot(dashboard, shell);
    addRecentNotes(dashboard, shell);
    addBottomNavigation(dashboard, shell);
    enhanceInteractions(dashboard, shell);
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

  function addProgressSnapshot(dashboard, shell) {
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
        const title = qs(card, '.course-copy h3');
        activeCourse = title?.textContent?.trim() || activeCourse;
        const progressMatch = text.match(/(\d+)%\s+complete/i);
        if (progressMatch) activeProgress = Number(progressMatch[1]);
      }
    });

    const section = document.createElement('section');
    section.className = 'dashboard-progress-snapshot glass-card';
    section.innerHTML = `
      <div class="dashboard-snapshot-heading">
        <div><span class="eyebrow">Progress snapshot</span><h2>Your learning at a glance</h2></div>
        <span class="dashboard-snapshot-live">Live</span>
      </div>
      <div class="dashboard-snapshot-grid">
        <div class="dashboard-snapshot-stat"><span>Courses</span><strong>${totalCourses}</strong><small>in your workspace</small></div>
        <div class="dashboard-snapshot-stat"><span>Notes</span><strong>${totalNotes}</strong><small>captured so far</small></div>
        <div class="dashboard-snapshot-stat dashboard-progress-stat"><span>Current course</span><strong>${activeProgress}%</strong><small>${escapeHtml(activeCourse)}</small><div class="dashboard-progress-track"><i style="width:${Math.max(0, Math.min(activeProgress, 100))}%"></i></div></div>
      </div>`;

    const firstCard = qs(shell, '.course-dashboard-card:first-child');
    if (firstCard) firstCard.insertAdjacentElement('beforebegin', section);
    else shell.appendChild(section);
  }

  function addRecentNotes(dashboard, shell) {
    if (qs(shell, '.dashboard-recent-notes')) return;
    const cards = qsa(shell, '.course-dashboard-card');
    if (!cards.length) return;

    const recent = document.createElement('section');
    recent.className = 'dashboard-recent-notes glass-card';
    const noteNames = [];

    cards.slice(0, 3).forEach((card) => {
      const title = qs(card, '.course-copy h3')?.textContent?.trim() || 'Course';
      const count = (card.textContent.match(/(\d+)\s+notes?/i) || [])[1];
      if (count) noteNames.push({ title, count });
    });

    recent.innerHTML = `
      <div class="dashboard-recent-heading"><div><span class="eyebrow">Workspace activity</span><h2>Recent notes</h2></div><span>${noteNames.reduce((sum, item) => sum + Number(item.count), 0)} notes</span></div>
      <div class="dashboard-recent-list">${noteNames.map((item, index) => `<button type="button" class="dashboard-recent-item" data-dashboard-course-index="${index}"><span class="dashboard-recent-index">0${index + 1}</span><span><strong>${escapeHtml(item.title)}</strong><small>${item.count} ${Number(item.count) === 1 ? 'note' : 'notes'} · Open course</small></span><b>›</b></button>`).join('')}</div>`;

    const addCard = qs(shell, '.add-course-trigger');
    if (addCard) addCard.insertAdjacentElement('beforebegin', recent);
    else shell.appendChild(recent);

    qsa(recent, '[data-dashboard-course-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.dashboardCourseIndex);
        const target = qsa(shell, '.course-dashboard-card')[index];
        qs(target || shell, '.course-open')?.click();
      });
    });
  }

  function addBottomNavigation(dashboard, shell) {
    if (qs(shell, '.dashboard-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'dashboard-bottom-nav glass-card';
    nav.setAttribute('aria-label', 'Dashboard navigation');
    nav.innerHTML = NAV_ITEMS.map(([key, icon, label], index) => `
      <button type="button" class="dashboard-nav-item${index === 0 ? ' active' : ''}" data-dashboard-nav="${key}" aria-label="${label}">
        <span class="dashboard-nav-icon">${icon}</span><span>${label}</span>
      </button>`).join('');
    shell.appendChild(nav);

    qsa(nav, '[data-dashboard-nav]').forEach((button) => {
      button.addEventListener('click', () => navigateDashboard(button.dataset.dashboardNav, dashboard, shell, nav));
    });
  }

  function navigateDashboard(key, dashboard, shell, nav) {
    qsa(nav, '.dashboard-nav-item').forEach((item) => item.classList.toggle('active', item.dataset.dashboardNav === key));
    const courseCards = qsa(shell, '.course-dashboard-card');
    const firstCourseButton = qs(courseCards[0], '.course-open');

    if (key === 'home') {
      dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (key === 'courses') {
      qs(shell, '.course-dashboard-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (key === 'collections' || key === 'notes') {
      if (firstCourseButton) firstCourseButton.click();
      return;
    }
    if (key === 'more') {
      showDashboardOverlay('Quick access', `
        <div class="dashboard-more-actions">
          <button type="button" data-dashboard-trigger="course">Add a course</button>
          <button type="button" data-dashboard-trigger="theme">Theme</button>
          <button type="button" data-dashboard-trigger="settings">Settings</button>
          <button type="button" data-dashboard-trigger="account">Account</button>
        </div>`);
      setTimeout(() => {
        qsa(document, '[data-dashboard-trigger]').forEach((action) => action.addEventListener('click', () => {
          const map = { course: '.add-course-trigger', theme: '[aria-label="Theme"]', settings: '[aria-label="Settings"]', account: '[aria-label="Account"]' };
          const target = qs(dashboard, map[action.dataset.dashboardTrigger]);
          closeDashboardOverlay();
          target?.click();
        }));
      }, 0);
    }
  }

  function enhanceInteractions(dashboard, shell) {
    const firstCourse = qs(shell, '.course-dashboard-card:first-child .course-open');
    if (firstCourse) {
      firstCourse.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') firstCourse.click();
      });
    }

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

  function closeDashboardOverlay() {
    document.querySelector('.dashboard-enhancer-overlay')?.remove();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll(dashboardSelector).forEach(injectDashboard);
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(dashboardSelector).forEach(injectDashboard);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
