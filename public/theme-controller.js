(() => {
  const THEME_KEY = 'mobile-liquid-glass-theme-ui';
  const THEMES = {
    midnight: { label: 'Midnight Glass' },
    sea: { label: 'Sea Glass' },
  };

  let activeTheme = localStorage.getItem(THEME_KEY) === 'sea' ? 'sea' : 'midnight';
  let menu = null;

  function closeMenu() {
    menu?.remove();
    menu = null;
  }

  function renderMenu() {
    if (!menu) return;
    menu.querySelectorAll('[data-theme-option]').forEach((button) => {
      const selected = button.dataset.themeOption === activeTheme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-checked', String(selected));
      const check = button.querySelector('.theme-control-check');
      if (check) check.textContent = selected ? '✓' : '';
      const current = button.querySelector('.theme-control-current');
      if (current) current.textContent = selected ? 'Current theme' : 'Select theme';
    });
  }

  function openMenu(trigger) {
    closeMenu();
    menu = document.createElement('div');
    menu.className = 'theme-control-menu';
    menu.setAttribute('role', 'radiogroup');
    menu.setAttribute('aria-label', 'Theme options');
    menu.innerHTML = `<div class="theme-control-label">Theme</div>
      ${Object.entries(THEMES).map(([key, theme]) => `<button type="button" class="theme-control-option" data-theme-option="${key}" role="radio" aria-label="${theme.label}">
        <span class="theme-control-swatch ${key}"></span>
        <span><span class="theme-control-name">${theme.label}</span><span class="theme-control-current">Select theme</span></span>
        <span class="theme-control-check" aria-hidden="true"></span>
      </button>`).join('')}`;

    document.body.appendChild(menu);

    menu.querySelectorAll('[data-theme-option]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      activeTheme = button.dataset.themeOption === 'sea' ? 'sea' : 'midnight';
      localStorage.setItem(THEME_KEY, activeTheme);
      renderMenu();
    }));

    renderMenu();
    positionMenu(trigger);
  }

  function positionMenu(trigger) {
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(208, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + 9;
    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.right = 'auto';
  }

  function bind() {
    const trigger = document.querySelector('.dashboard-screen .icon-button[aria-label="Theme"]');
    if (!trigger || trigger.dataset.themeControllerBound === 'true') return;
    trigger.dataset.themeControllerBound = 'true';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu) closeMenu();
      else openMenu(trigger);
    }, true);
  }

  document.addEventListener('click', (event) => {
    if (menu && !event.target.closest('.theme-control-menu') && !event.target.closest('.dashboard-screen .icon-button[aria-label="Theme"]')) {
      closeMenu();
    }
  }, true);

  window.addEventListener('resize', () => {
    if (menu) positionMenu(document.querySelector('.dashboard-screen .icon-button[aria-label="Theme"]'));
  }, { passive: true });

  const observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
  bind();
})();