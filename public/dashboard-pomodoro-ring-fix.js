(() => {
  const RING = '.dashboard-pomodoro-premium-ring';
  const ARC = '[data-ring-arc]';
  const GLOW = '[data-ring-glow]';
  const STYLE_ID = 'dashboard-pomodoro-ring-fix-style';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .dashboard-pomodoro-premium-ring svg {
        overflow: visible;
        shape-rendering: geometricPrecision;
      }
      .dashboard-pomodoro-ring-track {
        stroke: rgba(220,238,255,.20) !important;
        stroke-width: 9 !important;
        vector-effect: non-scaling-stroke;
      }
      .dashboard-pomodoro-ring-glow {
        stroke: #eaf6ff !important;
        stroke-width: 15 !important;
        stroke-linecap: round !important;
        opacity: .48 !important;
        vector-effect: non-scaling-stroke;
        filter: url(#dashboard-pomodoro-glow) !important;
      }
      .dashboard-pomodoro-ring-arc {
        stroke: #f7fcff !important;
        stroke-width: 8 !important;
        stroke-linecap: round !important;
        opacity: 1 !important;
        vector-effect: non-scaling-stroke;
        filter: url(#dashboard-pomodoro-glow-soft) !important;
        transition: none !important;
      }
      .dashboard-pomodoro-ring-dot {
        r: 8 !important;
        fill: #ffffff !important;
        filter: url(#dashboard-pomodoro-head-glow) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function parseProgress(circle) {
    const raw = circle?.style?.strokeDasharray || '';
    const match = raw.match(/([0-9]*\.?[0-9]+)/);
    if (!match) return 1;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
  }

  function syncCircle(circle) {
    if (!circle) return;
    const radius = Number(circle.getAttribute('r'));
    if (!Number.isFinite(radius) || radius <= 0) return;

    const circumference = 2 * Math.PI * radius;
    const progress = parseProgress(circle);
    const arcLength = circumference * progress;
    const gapLength = Math.max(0, circumference - arcLength);

    // Android WebView is more reliable with real SVG units than fractional
    // dasharray values combined with pathLength=1. Remove pathLength and use
    // the circle's actual circumference so the shrinking white arc stays visible.
    circle.removeAttribute('pathLength');
    circle.style.strokeDasharray = `${arcLength}px ${gapLength}px`;
    circle.style.strokeDashoffset = '0px';
  }

  function syncRing(root) {
    if (!root) return;
    syncCircle(root.querySelector(ARC));
    syncCircle(root.querySelector(GLOW));
  }

  function boot() {
    installStyles();

    const refresh = () => {
      document.querySelectorAll(RING).forEach(syncRing);
      requestAnimationFrame(refresh);
    };

    const observer = new MutationObserver(() => {
      document.querySelectorAll(RING).forEach(syncRing);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
