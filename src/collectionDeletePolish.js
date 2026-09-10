let initialized = false;

const POLISH_STYLE_ID = 'collection-delete-polish-styles';
const MODE_CLASS = 'collection-delete-mode';

function injectPolishStyles() {
  if (document.getElementById(POLISH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = POLISH_STYLE_ID;
  style.textContent = `
    /* Selection controls are invisible outside explicit delete mode. */
    .collection-selection-control {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: translate3d(-4px,0,0) scale(.96) !important;
      transition: opacity 160ms ease, transform 180ms cubic-bezier(.2,.8,.2,1), visibility 0s linear 160ms !important;
    }

    body.${MODE_CLASS} .collection-selection-control {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      transform: translate3d(0,0,0) scale(1) !important;
      transition: opacity 180ms ease, transform 220ms cubic-bezier(.16,1,.3,1), visibility 0s linear 0s !important;
    }

    /* Keep the row layout stable while the checkbox control is hidden. */
    .collection-selection-wrap {
      overflow: visible !important;
    }

    /* 120 Hz-friendly delete motion: only compositor-friendly transforms/opacity. */
    .collection-selection-wrap.collection-deleting {
      will-change: transform, opacity !important;
      backface-visibility: hidden !important;
      transform: translate3d(0,0,0) scale(1) !important;
      animation: collectionDeletePolishedExit 620ms cubic-bezier(.16,1,.3,1) forwards !important;
    }

    .collection-selection-wrap.collection-deleting > .glass-list-item {
      will-change: transform, opacity !important;
      backface-visibility: hidden !important;
      transform: translate3d(0,0,0) scale(1) !important;
      animation: collectionDeletePolishedCard 620ms cubic-bezier(.16,1,.3,1) forwards !important;
    }

    .collection-selection-wrap.collection-deleting .collection-delete-sparkles i {
      will-change: transform, opacity !important;
      backface-visibility: hidden !important;
    }

    @keyframes collectionDeletePolishedExit {
      0%   { opacity:1; transform:translate3d(0,0,0) scale(1); }
      55%  { opacity:1; transform:translate3d(0,-2px,0) scale(.995); }
      100% { opacity:0; transform:translate3d(0,-7px,0) scale(.965); }
    }

    @keyframes collectionDeletePolishedCard {
      0%   { opacity:1; transform:translate3d(0,0,0) scale(1); }
      48%  { opacity:1; transform:translate3d(0,-1px,0) scale(.995); }
      100% { opacity:0; transform:translate3d(0,-7px,0) scale(.97); }
    }

    @media (prefers-reduced-motion:reduce) {
      .collection-selection-wrap.collection-deleting,
      .collection-selection-wrap.collection-deleting > .glass-list-item {
        animation-duration: 180ms !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function syncDeleteMode() {
  const trigger = document.querySelector('.collection-delete-trigger');
  if (!trigger) return;
  const active = trigger.getAttribute('aria-pressed') === 'true' || trigger.classList.contains('active');
  document.body.classList.toggle(MODE_CLASS, active);
}

function start() {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;
  injectPolishStyles();
  syncDeleteMode();

  const observer = new MutationObserver(() => {
    injectPolishStyles();
    syncDeleteMode();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed'],
  });
}

start();
