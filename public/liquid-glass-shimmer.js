(() => {
  'use strict';

  /*
   * Build 3 — Shimmer Progress.
   *
   * Only existing progress-fill elements are enhanced. Width, color, layout,
   * glass material, and interaction behavior remain untouched.
   */
  const PROGRESS_FILLS = [
    '.dashboard-progress-track > i',
    '.course-workspace-progress-track > span',
    '.overview-progress-track > span',
    '.health-track > span',
    '.session-progress-track > span',
    '.learning-progress > div > i',
  ].join(',');

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => Boolean(reducedMotionQuery?.matches);

  function isMeaningfulProgress(fill) {
    if (!fill?.isConnected) return false;
    const styleWidth = fill.style?.width || '';
    const computedWidth = window.getComputedStyle(fill).width;
    const width = parseFloat(styleWidth || computedWidth || '0');
    return Number.isFinite(width) && width > 0.5;
  }

  function prepare(fill, index) {
    if (!fill || !(fill instanceof HTMLElement)) return;
    if (prefersReducedMotion()) {
      fill.classList.remove('glass-shimmer-progress');
      delete fill.dataset.shimmerEmpty;
      delete fill.dataset.shimmerIndex;
      return;
    }

    fill.classList.add('glass-shimmer-progress');
    fill.dataset.shimmerEmpty = isMeaningfulProgress(fill) ? 'false' : 'true';
    fill.dataset.shimmerIndex = String(index % 5);
    fill.style.setProperty('--shimmer-delay', `${-((index % 5) * 0.38)}s`);
  }

  function refresh() {
    document.querySelectorAll(PROGRESS_FILLS).forEach((fill, index) => prepare(fill, index));
  }

  function boot() {
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    reducedMotionQuery?.addEventListener?.('change', refresh);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
