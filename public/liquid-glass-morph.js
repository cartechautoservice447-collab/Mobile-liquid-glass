(() => {
  'use strict';

  /*
   * Safe course-to-workspace morph.
   *
   * Progressive enhancement around the browser View Transition API:
   * - only course-opening surfaces are intercepted
   * - the existing React click handler remains the source of truth
   * - no glass material, layout, spacing, or transform rules are replaced
   * - unsupported browsers fall back to the normal click/navigation
   */
  const COURSE_SOURCES = '.course-open, .course-folder-card';
  const VIEW_NAME = 'liquid-glass-course';
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let replaying = false;

  const prefersReducedMotion = () => Boolean(reducedMotionQuery?.matches);
  const supportsViewTransition = () => typeof document.startViewTransition === 'function';

  function isExcludedTarget(target) {
    return target.closest(
      '.delete-course, .modal-close, .back-button, .premium-back-button, .course-mini-action',
    );
  }

  function getCourseSource(event) {
    const node = event.target instanceof Element ? event.target : null;
    if (!node) return null;
    const source = node.closest(COURSE_SOURCES);
    if (!source || !source.isConnected || isExcludedTarget(node)) return null;
    return source;
  }

  function clearSourceName(source) {
    if (source?.style) source.style.viewTransitionName = '';
  }

  function runNormal(source) {
    replaying = true;
    source.click();
    replaying = false;
  }

  function onClickCapture(event) {
    if (replaying || prefersReducedMotion() || !supportsViewTransition()) return;

    const source = getCourseSource(event);
    if (!source) return;

    // The React handler must still execute; we only move that same click into
    // startViewTransition so the browser can pair the old card with the new hero.
    event.preventDefault();
    event.stopPropagation();

    source.style.viewTransitionName = VIEW_NAME;
    source.dataset.morphSource = 'true';

    let transition;
    try {
      transition = document.startViewTransition(() => {
        runNormal(source);
      });
    } catch (_error) {
      // Never block course opening because the animation API failed.
      clearSourceName(source);
      delete source.dataset.morphSource;
      runNormal(source);
      return;
    }

    const cleanup = () => {
      clearSourceName(source);
      delete source.dataset.morphSource;
    };

    transition.finished.then(cleanup, cleanup);
  }

  function boot() {
    // A single capture listener covers React-rendered and later-inserted course cards.
    document.addEventListener('click', onClickCapture, { capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
