/*
 * Single-source glass surface renderer for the two cards that previously
 * carried their own permanent refraction/veil recipes.
 *
 * Type 1/2/3/4 are the existing Engine Settings languages. Selecting one
 * changes the same surface variables used by the rest of the app, then this
 * runtime layer applies those variables directly to the Course card and Saved
 * Notes card. No SVG refraction filter or extra veil is allowed on either card.
 */

const STYLE_ID = 'mobile-liquid-glass-surface-runtime-lock';
const STYLE = `
  /* Structural wrapper: never a second glass surface. */
  html[data-glass-theme] .app-root-layer .course-dashboard-card {
    background: transparent !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 0 !important;
    box-shadow: none !important;
    filter: none !important;
    overflow: visible !important;
  }

  /* The real Course card uses one dashboard-grade glass surface. */
  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open,
  html[data-glass-theme] .app-root-layer .collection-note-card {
    position: relative !important;
    box-sizing: border-box !important;
    background-color: var(--glass-theme-bg) !important;
    background-image: var(--glass-theme-sheen) !important;
    backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
    -webkit-backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
    border: 1px solid var(--glass-theme-border) !important;
    border-top-color: var(--glass-theme-top-border) !important;
    border-radius: var(--glass-theme-radius) !important;
    box-shadow: var(--glass-theme-shadow) !important;
    filter: none !important;
    isolation: isolate !important;
  }

  /* Completely replace the old fog-producing pseudo layers. */
  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open::before,
  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open::after,
  html[data-glass-theme] .app-root-layer .collection-note-card::before,
  html[data-glass-theme] .app-root-layer .collection-note-card::after {
    content: none !important;
    display: none !important;
    filter: none !important;
    background: none !important;
    opacity: 0 !important;
    box-shadow: none !important;
  }

  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open > *,
  html[data-glass-theme] .app-root-layer .collection-note-card > * {
    position: relative !important;
    z-index: 1 !important;
  }

  /* Keep the existing motion without changing the selected glass language. */
  html[data-glass-theme] .app-root-layer .course-dashboard-card:hover,
  html[data-glass-theme] .app-root-layer .collection-note-card:hover {
    filter: brightness(1.03) !important;
  }
`;

const THEME_RECIPES = {
  'type-1': {
    bg: 'var(--water-gel-bg, rgb(255 255 255 / .45))',
    sheen: 'linear-gradient(135deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.02) 55%,rgba(255,255,255,.09) 100%)',
    border: 'rgba(255,255,255,.22)',
    topBorder: 'rgba(255,255,255,.40)',
    radius: 'calc(18px + var(--liquid-gel,.55) * 26px)',
    shadow: 'inset 0 1px 2px rgba(255,255,255,.35),inset 0 -2px 4px rgba(0,0,0,.18),0 8px 32px rgba(0,0,0,.22)',
    blur: 'var(--liquid-density,12px)',
    saturation: '200%',
  },
  'type-2': {
    bg: 'var(--water-gel-bg, rgb(255 255 255 / .45))',
    sheen: 'linear-gradient(145deg,rgba(255,255,255,.17),rgba(255,255,255,.035) 55%,rgba(255,255,255,.10))',
    border: 'rgba(210,239,255,.24)',
    topBorder: 'rgba(255,255,255,.46)',
    radius: 'calc(18px + var(--liquid-gel,.55) * 26px)',
    shadow: 'inset 0 1px 2px rgba(255,255,255,.48),inset 0 -3px 7px rgba(8,12,50,.20),0 10px 30px rgba(0,0,0,.24)',
    blur: 'var(--liquid-density,12px)',
    saturation: '200%',
  },
  'type-3': {
    bg: 'rgb(255 255 255 / calc(var(--liquid-glass-alpha,.45) * .52))',
    sheen: 'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.025))',
    border: 'rgba(190,235,255,.14)',
    topBorder: 'rgba(255,255,255,.28)',
    radius: '16px',
    shadow: 'inset 0 1px 1px rgba(255,255,255,.16),inset 0 -2px 6px rgba(0,0,0,.12),0 10px 26px rgba(0,0,0,.14)',
    blur: 'calc(var(--liquid-density,12px) * .9)',
    saturation: '180%',
  },
  'type-4': {
    bg: 'var(--water-gel-bg, rgb(255 255 255 / .45))',
    sheen: 'linear-gradient(145deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,.055) 42%,rgba(255,255,255,.02) 62%,rgba(255,255,255,.11) 100%)',
    border: 'rgba(220,240,255,.30)',
    topBorder: 'rgba(255,255,255,.52)',
    radius: 'calc(18px + var(--liquid-gel,.55) * 26px)',
    shadow: 'inset 0 1px 2px rgba(255,255,255,.50),inset 0 -3px 7px rgba(10,14,55,.22),0 9px 28px rgba(0,0,0,.28)',
    blur: 'var(--liquid-density,12px)',
    saturation: '200%',
  },
};

function activeRecipe() {
  const key = document.documentElement.dataset.glassTheme || 'type-1';
  return THEME_RECIPES[key] || THEME_RECIPES['type-1'];
}

function syncThemeVariables() {
  const root = document.documentElement;
  const recipe = activeRecipe();
  root.style.setProperty('--glass-theme-bg', recipe.bg);
  root.style.setProperty('--glass-theme-sheen', recipe.sheen);
  root.style.setProperty('--glass-theme-border', recipe.border);
  root.style.setProperty('--glass-theme-top-border', recipe.topBorder);
  root.style.setProperty('--glass-theme-radius', recipe.radius);
  root.style.setProperty('--glass-theme-shadow', recipe.shadow);
  root.style.setProperty('--glass-theme-blur', recipe.blur);
  root.style.setProperty('--glass-theme-saturation', recipe.saturation);
}

function hardSyncCards() {
  const recipe = activeRecipe();
  document.querySelectorAll('.course-dashboard-card .course-open, .collection-note-card').forEach((card) => {
    card.style.setProperty('background-color', recipe.bg, 'important');
    card.style.setProperty('background-image', recipe.sheen, 'important');
    card.style.setProperty('backdrop-filter', `blur(${recipe.blur}) saturate(${recipe.saturation}) contrast(105%)`, 'important');
    card.style.setProperty('-webkit-backdrop-filter', `blur(${recipe.blur}) saturate(${recipe.saturation}) contrast(105%)`, 'important');
    card.style.setProperty('border', `1px solid ${recipe.border}`, 'important');
    card.style.setProperty('border-top-color', recipe.topBorder, 'important');
    card.style.setProperty('border-radius', recipe.radius, 'important');
    card.style.setProperty('box-shadow', recipe.shadow, 'important');
    card.style.setProperty('filter', 'none', 'important');
  });
}

if (typeof document !== 'undefined') {
  syncThemeVariables();

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  } else if (style.textContent !== STYLE) {
    style.textContent = STYLE;
  }

  const sync = () => {
    syncThemeVariables();
    hardSyncCards();
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-glass-theme'] });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('glass-settings-changed', sync);
  sync();
}
