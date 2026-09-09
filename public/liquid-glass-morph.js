(() => {
  'use strict';

  /*
   * Site-wide Liquid Glass navigation transition layer.
   *
   * True shared-element morphing is reserved for course cards opening the
   * course workspace. Other navigation uses a restrained page-level glass
   * transform/fade so structurally different screens are never forced into
   * the wrong shared-element shape.
   *
   * Safety rules:
   * - existing React handlers remain the source of truth
   * - unsupported browsers fall back to the normal click
   * - reduced-motion disables the transition
   * - modal/form/destructive controls are never intercepted
   * - no existing glass material, spacing, or layout rules are replaced
   */
  const COURSE_SOURCES = '.course-open, .course-folder-card';
  const GLOBAL_SOURCES = [
    '.course-tool-folder',
    '.course-mini-action',
    '.back-button',
    '.premium-back-button',
    '.collection-note-card',
    '.dashboard-recent-item',
    '.glass-list-item',
    '.action-card:not(.dashboard-pomodoro-action)',
  ];
  const VIEW_NAME = 'liquid-glass-course';
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let replaying = false;

  const prefersReducedMotion = () => Boolean(reducedMotionQuery?.matches);
  const supportsViewTransition = () => typeof document.startViewTransition === 'function';

  function isExcludedTarget(target) {
    return target.closest(
      [
        '.delete-course',
        '.modal-close',
        '.course-mini-action[aria-disabled="true"]',
        '.course-mini-action[disabled]',
        '.premium-back-button[disabled]',
        '.back-button[disabled]',
        'form',
        'input',
        'textarea',
        'select',
        '[contenteditable="true"]',
        '.dashboard-pomodoro-action',
      ].join(', '),
    );
  }

  function getSource(event) {
    const node = event.target instanceof Element ? event.target : null;
    if (!node) return null;

    const course = node.closest(COURSE_SOURCES);
    if (course && course.isConnected && !isExcludedTarget(node)) {
      return { element: course, type: 'course', direction: 'forward' };
    }

    for (const selector of GLOBAL_SOURCES) {
      const element = node.closest(selector);
      if (!element || !element.isConnected || isExcludedTarget(node)) continue;

      const back = element.matches('.back-button, .premium-back-button');
      return { element, type: 'global', direction: back ? 'back' : 'forward' };
    }

    return null;
  }

  function clearCourseName(source) {
    if (source?.style) source.style.viewTransitionName = '';
  }

  function clearGlobalState() {
    delete document.documentElement.dataset.liquidTransition;
    delete document.documentElement.dataset.liquidCourseMorph;
  }

  function runNormal(source) {
    replaying = true;
    source.click();
    replaying = false;
  }

  function startTransition(source) {
    if (source.type === 'course') {
      source.element.style.viewTransitionName = VIEW_NAME;
      source.element.dataset.morphSource = 'true';
      document.documentElement.dataset.liquidCourseMorph = 'true';
    } else {
      document.documentElement.dataset.liquidTransition = source.direction;
    }

    let transition;
    try {
      transition = document.startViewTransition(() => {
        runNormal(source.element);
      });
    } catch (_error) {
      clearCourseName(source.element);
      delete source.element.dataset.morphSource;
      clearGlobalState();
      runNormal(source.element);
      return;
    }

    const cleanup = () => {
      clearCourseName(source.element);
      delete source.element.dataset.morphSource;
      clearGlobalState();
    };

    transition.finished.then(cleanup, cleanup);
  }

  function onClickCapture(event) {
    if (replaying || prefersReducedMotion() || !supportsViewTransition()) return;

    const source = getSource(event);
    if (!source) return;

    // Preserve the existing React click behavior while giving the browser
    // ownership of the visual transition between the old and new DOM states.
    event.preventDefault();
    event.stopPropagation();
    startTransition(source);
  }

  function boot() {
    document.addEventListener('click', onClickCapture, { capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
