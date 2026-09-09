(() => {
  'use strict';

  /*
   * Global Liquid Glass Ripple.
   *
   * The effect is deliberately implemented as a fixed, pointer-transparent
   * overlay. It does not mutate React children, glass CSS, transforms, layout,
   * or existing interaction handlers.
   */
  const MAX_ACTIVE = 4;
  const DURATION = 520;
  const SIZE_MIN = 120;
  const SIZE_MAX = 560;

  const INTERACTIVE = [
    'button:not(:disabled)',
    'a[href]',
    '[role="button"]',
    '.course-open',
    '.action-card',
    '.course-folder-card',
    '.course-tool-folder',
    '.glass-list-item',
    '.collection-note-card',
    '.add-course-trigger',
    '.dashboard-recent-item',
    '.theme-control-option',
    '.engine-chip',
  ].join(',');

  const EXCLUDED_ANCESTOR = '.liquid-glass-ripple-host';
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const active = [];

  const prefersReducedMotion = () => Boolean(reducedMotionQuery?.matches);

  function isDisabled(element) {
    return element.matches(':disabled') ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.dataset.ripple === 'off';
  }

  function findInteractiveTarget(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node === document.documentElement || node === document.body) break;
      if (node.closest(EXCLUDED_ANCESTOR)) return null;
      const target = node.matches(INTERACTIVE) ? node : node.closest(INTERACTIVE);
      if (target && !isDisabled(target)) return target;
    }
    return null;
  }

  function clearFinished(item) {
    const index = active.indexOf(item);
    if (index >= 0) active.splice(index, 1);
    item.host.remove();
  }

  function createRipple(target, clientX, clientY) {
    if (prefersReducedMotion()) return;

    while (active.length >= MAX_ACTIVE) {
      const oldest = active.shift();
      oldest?.host.remove();
    }

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const size = Math.min(
      SIZE_MAX,
      Math.max(SIZE_MIN, Math.hypot(rect.width, rect.height) * 0.85),
    );

    const host = document.createElement('span');
    host.className = 'liquid-glass-ripple-host';
    host.setAttribute('aria-hidden', 'true');
    host.style.left = `${rect.left}px`;
    host.style.top = `${rect.top}px`;
    host.style.width = `${rect.width}px`;
    host.style.height = `${rect.height}px`;
    host.style.borderRadius = getComputedStyle(target).borderRadius;

    const wave = document.createElement('span');
    wave.className = 'liquid-glass-ripple-wave';
    wave.style.setProperty('--ripple-size', `${size}px`);
    wave.style.setProperty('--ripple-duration', `${DURATION}ms`);
    wave.style.left = `${clientX - rect.left}px`;
    wave.style.top = `${clientY - rect.top}px`;

    host.appendChild(wave);
    document.body.appendChild(host);

    const item = { host };
    active.push(item);
    wave.addEventListener('animationend', () => clearFinished(item), { once: true });
    window.setTimeout(() => {
      if (document.body.contains(host)) clearFinished(item);
    }, DURATION + 120);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.pointerType === 'mouse' && event.buttons !== undefined && event.buttons !== 1) return;
    const target = findInteractiveTarget(event);
    if (!target) return;
    createRipple(target, event.clientX, event.clientY);
  }

  function onKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
    if (!target || isDisabled(target)) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    createRipple(target, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function boot() {
    if (prefersReducedMotion()) return;
    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    document.addEventListener('keydown', onKeyDown, { passive: true, capture: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
