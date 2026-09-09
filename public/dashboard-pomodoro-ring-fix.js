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

  function readNormalizedProgress(circle) {
    const raw = circle?.style?.strokeDasharray || '';
    // The premium timer writes normalized values such as "0.998 0.002".
    // Once this fix converts them to pixel units, ignore the converted value
    // until the premium timer writes the next normalized value.
    if (!raw || /px|%|em|rem/i.test(raw)) return null;
    const match = raw.match(/([0-9]*\.?[0-9]+)/);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
  }

  function syncCircle(circle) {
    if (!circle) return;
    const radius = Number(circle.getAttribute('r'));
    if (!Number.isFinite(radius) || radius <= 0) return;

    const progress = readNormalizedProgress(circle);
    if (progress == null) return;

    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * progress;
    const gapLength = Math.max(0, circumference - arcLength);

    // Android WebView can render fractional dasharray values inconsistently here.
    // Use the real circumference instead, while preserving the premium timer's
    // normalized progress calculation and live countdown updates.
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

    // The premium timer updates the normalized dasharray on every timer frame.
    // A lightweight frame watcher converts each new value to reliable SVG units.
    const refresh = () => {
      document.querySelectorAll(RING).forEach(syncRing);
      requestAnimationFrame(refresh);
    };

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
