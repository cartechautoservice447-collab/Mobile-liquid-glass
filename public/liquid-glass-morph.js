(() => {
  'use strict';

  /*
   * Build 2 scope: Dashboard + Course interfaces + the five-icon bottom nav.
   *
   * True shared-element morphing remains for course cards -> course workspace.
   * The restrained page transition is used only by approved Dashboard/Course
   * controls and the five bottom navigation items.
   *
   * Build 2 entrance layer:
   * - destination surfaces are prepared inside the View Transition update
   *   callback so the new snapshot is captured with the stagger already active
   * - meaningful Dashboard/Course sections enter in a controlled sequence
   * - five-icon bottom navigation is deliberately excluded
   * - the course hero remains owned by the shared-element morph
   * - existing glass material and normal interaction physics are untouched
   */

  const COURSE_SOURCES = [
    '.dashboard-screen .course-open',
    '.course-folder-screen .course-folder-card',
  ].join(', ');

  const APPROVED_GLOBAL_SOURCES = [
    '.dashboard-screen .dashboard-nav-item',
    '.dashboard-screen .action-card:not(.dashboard-pomodoro-action)',
    '.dashboard-screen .dashboard-recent-item',
    '.dashboard-screen .add-course-trigger',
    '.course-workspace-screen .course-tool-folder',
    '.course-workspace-screen .course-mini-action',
    '.course-workspace-screen .back-button',
    '.course-workspace-screen .premium-back-button',
    '.course-folder-screen .back-button',
    '.course-folder-screen .course-back-button',
    '.course-folder-screen .premium-back-button',
  ].join(', ');

  const STAGGER_SOURCES = [
    /* Full Dashboard */
    '.dashboard-screen .dashboard-header',
    '.dashboard-screen .dashboard-copy',
    '.dashboard-screen .dashboard-controls',
    '.dashboard-screen .quick-actions',
    '.dashboard-screen .quick-actions > *',
    '.dashboard-screen .section-heading',
    '.dashboard-screen .section-heading > *',
    '.dashboard-screen .add-course-trigger',
    '.dashboard-screen .course-grid > *',
    '.dashboard-screen .dashboard-pomodoro-action',
    '.dashboard-screen .dashboard-recent',
    '.dashboard-screen .dashboard-recent-item',
    '.dashboard.screen .learning-suite',
    '.dashboard-screen .learning-suite',
    '.dashboard-screen .learning-suite > *',
    '.dashboard-screen .learning-suite-card',
    '.dashboard-screen .study-planner-card',
    '.dashboard-screen .spaced-repetition-card',
    '.dashboard-screen .message',
    /* Course library */
    '.course-folder-screen .course-folder-header',
    '.course-folder-screen .course-search',
    '.course-folder-screen .course-folder-card',
    '.course-folder-screen .course-subview-header',
    '.course-folder-screen .course-section-heading',
    '.course-folder-screen .course-subview-list > *',
    /* Course workspace */
    '.course-workspace-screen .course-workspace-header',
    '.course-workspace-screen .course-workspace-hero',
    '.course-workspace-screen .course-workspace-progress',
    '.course-workspace-screen .course-workspace-section-heading',
    '.course-workspace-screen .course-tool-folder',
  ].join(', ');

  const STAGGER_EXCLUDED = [
    '.dashboard-bottom-nav',
    '.dashboard-nav-item',
    '.course-mobile-nav',
    '.modal-backdrop',
    '.glass-modal',
    '.modal-close',
    'form',
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
  ].join(', ');

  const VIEW_NAME = 'liquid-glass-course';
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let replaying = false;

  const prefersReducedMotion = () => reducedMotionQuery?.matches === true;
  const supportsViewTransition = () => typeof document.startViewTransition === 'function';

  function isExcludedTarget(target) {
    return target.closest([
      '.delete-course',
      '.modal-close',
      '[disabled]',
      '[aria-disabled="true"]',
      'form',
      'input',
      'textarea',
      'select',
      '[contenteditable="true"]',
      '.dashboard-notification',
    ].join(', '));
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
    return { element: global, type: 'global', direction: isBack ? 'back' : 'forward' };
  }

  function setPressCoordination(element, active) {
    if (!(element instanceof HTMLElement)) return;
    if (active) {
      element.dataset.liquidPressLocked = 'true';
      element.style.setProperty('--liquid-press-duration', '0ms');
    } else {
      delete element.dataset.liquidPressLocked;
      element.style.removeProperty('--liquid-press-duration');
    }
  }

  function clearCourseName(element) {
    if (element?.style) element.style.viewTransitionName = '';
  }

  function clearGlobalState() {
    delete document.documentElement.dataset.liquidTransition;
    delete document.documentElement.dataset.liquidTransitionActive;
    delete document.documentElement.dataset.liquidCourseMorph;
  }

  function runNormal(element) {
    replaying = true;
    element.click();
    replaying = false;
  }

  function cleanupSource(source) {
    clearCourseName(source.element);
    delete source.element.dataset.morphSource;
    setPressCoordination(source.element, false);
    clearGlobalState();
  }

  function prepareStaggeredEntrance({ excludeCourseHero = false } = {}) {
    if (prefersReducedMotion()) return;

    const screen = document.querySelector('.dashboard-screen, .course-folder-screen, .course-workspace-screen');
    if (!screen) return;

    const elements = [...screen.querySelectorAll(STAGGER_SOURCES)]
      .filter((element, index, list) => list.indexOf(element) === index)
      .filter((element) => !element.closest(STAGGER_EXCLUDED))
      .filter((element) => !excludeCourseHero || !element.closest('.course-workspace-hero'))
      .filter((element) => element.isConnected)
      .slice(0, 40);

    elements.forEach((element, index) => {
      element.classList.remove('liquid-stagger-enter');
      element.style.setProperty('--liquid-stagger-index', String(index));
      element.classList.add('liquid-stagger-enter');
    });
  }

  function startTransition(source) {
    setPressCoordination(source.element, true);

    if (source.type === 'course') {
      source.element.style.viewTransitionName = VIEW_NAME;
      source.element.dataset.morphSource = 'true';
      document.documentElement.dataset.liquidCourseMorph = 'true';
    } else {
      document.documentElement.dataset.liquidTransition = source.direction;
      document.documentElement.dataset.liquidTransitionActive = 'true';
    }

    let transition;
    try {
      transition = document.startViewTransition(() => {
        runNormal(source.element);
        prepareStaggeredEntrance({ excludeCourseHero: source.type === 'course' });
      });
    } catch (_error) {
      cleanupSource(source);
      runNormal(source.element);
      queueMicrotask(() => prepareStaggeredEntrance({ excludeCourseHero: source.type === 'course' }));
      return;
    }

    const cleanup = () => cleanupSource(source);
    transition.finished.then(cleanup, cleanup);
  }

  function onClickCapture(event) {
    if (replaying || prefersReducedMotion() || !supportsViewTransition()) return;

    const source = getSource(event);
    if (!source) return;

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
