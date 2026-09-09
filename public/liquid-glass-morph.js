(() => {
  'use strict';

  /*
   * Build 2 scope: Dashboard + Course interfaces + the five-icon bottom nav.
   *
   * True shared-element morphing remains for course cards -> course workspace.
   * The restrained page transition is used only by approved Dashboard/Course
   * controls and the five bottom navigation items.
   *
   * Everything else deliberately stays on the normal navigation path:
   * Collections, Notes, Editor, Settings, overlays, forms, and unrelated
   * interface controls do not receive Build 2 motion.
   *
   * Safety rules:
   * - existing React/DOM handlers remain the source of truth
   * - unsupported browsers fall back to normal clicks
   * - reduced-motion disables the transition
   * - destructive, modal, form, and text-entry controls are never intercepted
   * - no glass material, layout, spacing, or existing interaction physics are replaced
   */

  const COURSE_SOURCES = [
    '.dashboard-screen .course-open',
    '.course-folder-screen .course-folder-card',
  ].join(', ');

  const APPROVED_GLOBAL_SOURCES = [
    // Dashboard
    '.dashboard-screen .dashboard-nav-item',
    '.dashboard-screen .action-card:not(.dashboard-pomodoro-action)',
    '.dashboard-screen .dashboard-recent-item',
    '.dashboard-screen .add-course-trigger',

    // Course interface
    '.course-workspace-screen .course-tool-folder',
    '.course-workspace-screen .course-mini-action',
    '.course-workspace-screen .back-button',
    '.course-workspace-screen .premium-back-button',

    // Course library
    '.course-folder-screen .course-back-button',
    '.course-folder-screen .premium-back-button',
  ].join(', ');

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
        '[disabled]',
        '[aria-disabled="true"]',
        'form',
        'input',
        'textarea',
        'select',
        '[contenteditable="true"]',
        '.dashboard-pomodoro-action',
        '.dashboard-notification',
      ].join(', '),
    );
  }

  function getSource(event) {
    const node = event.target instanceof Element ? event.target : null;
    if (!node || isExcludedTarget(node)) return null;

    const course = node.closest(COURSE_SOURCES);
    if (course && course.isConnected) {
      return { element: course, type: 'course', direction: 'forward' };
    }

    const global = node.closest(APPROVED_GLOBAL_SOURCES);
    if (!global || !global.isConnected) return null;

    const isBack = global.matches('.back-button, .premium-back-button, .course-back-button');
    return {
      element: global,
      type: 'global',
      direction: isBack ? 'back' : 'forward',
    };
  }

  function clearCourseName(element) {
    if (element?.style) element.style.viewTransitionName = '';
  }

  function clearGlobalState() {
    delete document.documentElement.dataset.liquidTransition;
    delete document.documentElement.dataset.liquidCourseMorph;
  }

  function runNormal(element) {
    replaying = true;
    element.click();
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

    // Keep the existing click behavior intact; Build 2 owns only the visuals.
    event.preventDefault();
    event.stopPropagation();
    startTransition(source);
  }

  function boot() {
    // Capture covers React-rendered and dynamically inserted Dashboard/Course UI.
    document.addEventListener('click', onClickCapture, { capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
