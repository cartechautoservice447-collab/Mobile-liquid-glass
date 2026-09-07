(() => {
  const THEME_KEY = 'mobile-liquid-glass-theme';
  const THEMES = {
    midnight: {
      label: 'Midnight Glass',
      vars: {
        '--theme-bg-1': '#07101f', '--theme-bg-2': '#101c36', '--theme-accent': '#72d7ff', '--theme-accent-2': '#bd86ff',
      },
    },
    sea: {
      label: 'Sea Glass',
      vars: {
        '--theme-bg-1': '#061a22', '--theme-bg-2': '#0b3540', '--theme-accent': '#9be7df', '--theme-accent-2': '#6ccfe0',
      },
    },
  };

  let activeTheme = localStorage.getItem(THEME_KEY) === 'sea' ? 'sea' : 'midnight';
  let menu = null;

  function applyTheme(name) {
    activeTheme = THEMES[name] ? name : 'midnight';
    document.documentElement.dataset.appTheme = activeTheme;
    Object.entries(THEMES[activeTheme].vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    localStorage.setItem(THEME_KEY, activeTheme);
    renderMenu();
  }

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
    menu.innerHTML = `<div class="theme-control-label">Theme</div>
      ${Object.entries(THEMES).map(([key, theme]) => `<button type="button" class="theme-control-option" data-theme-option="${key}" role="radio" aria-label="${theme.label}">
        <span class="theme-control-swatch ${key}"></span>
        <span><span class="theme-control-name">${theme.label}</span><span class="theme-control-current">Select theme</span></span>
        <span class="theme-control-check" aria-hidden="true"></span>
      </button>`).join('')}`;
    trigger.parentElement?.appendChild(menu);
    menu.querySelectorAll('[data-theme-option]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyTheme(button.dataset.themeOption);
      closeMenu();
    }));
    renderMenu();
  }

  function bind() {
    const trigger = document.querySelector('.dashboard-screen .icon-button[aria-label="Theme"]');
    if (!trigger || trigger.dataset.themeControllerBound === 'true') return;
    trigger.dataset.themeControllerBound = 'true';
    applyTheme(activeTheme);
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menu) closeMenu(); else openMenu(trigger);
    }, true);
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.theme-control') && !event.target.closest('.theme-control-menu')) closeMenu();
  });

  const observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true });
  bind();
  applyTheme(activeTheme);
})();
