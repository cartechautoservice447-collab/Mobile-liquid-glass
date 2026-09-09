(() => {
  'use strict';

  // Final audited version. The parallax layer never transforms or replaces the
  // existing glass surface; it only applies tiny transforms to content inside it.
  const TARGETS = [
    '.dashboard-screen .course-dashboard-card .course-open',
    '.dashboard-screen .action-card',
    '.dashboard-screen .dashboard-header',
  ];
  const LAYER_SELECTORS = {
    course: ['.course-top', '.course-copy', '.course-footer'],
    action: ['.action-icon', '> span:nth-child(2)', '.action-arrow'],
    header: ['.dashboard-copy', '.dashboard-controls'],
  };
  const MAX_X = 2.2;
  const MAX_Y = 1.6;
  const EASE = 0.16;
  const state = new WeakMap();
  let raf = 0;

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches;

  function selectorGroup(target) {
    if (target.matches('.course-open')) return LAYER_SELECTORS.course;
    if (target.matches('.action-card')) return LAYER_SELECTORS.action;
    return LAYER_SELECTORS.header;
  }

  function prepareTarget(target) {
    if (!target || state.has(target) || reducedMotion()) return;
    const layers = [];
    selectorGroup(target).forEach((selector) => {
      const candidates = selector.startsWith('>')
        ? [...target.children].filter((el) => {
            const nth = selector.match(/nth-child\((\d+)\)/)?.[1];
            return nth ? String([...target.children].indexOf(el) + 1) === nth : false;
          })
        : [...target.querySelectorAll(selector)];
      candidates.forEach((el) => {
        if (!layers.includes(el)) layers.push(el);
      });
    });
    if (!layers.length) return;
    layers.forEach((layer, index) => {
      layer.classList.add('depth-parallax-layer');
      layer.dataset.depthFactor = String(0.62 + index * 0.22);
    });
    state.set(target, { layers, goalX: 0, goalY: 0, x: 0, y: 0 });

    if (coarsePointer()) {
      target.addEventListener('touchstart', onTouchStart, { passive: true });
      target.addEventListener('touchmove', onTouchMove, { passive: true });
      target.addEventListener('touchend', onTouchEnd, { passive: true });
      target.addEventListener('touchcancel', onTouchEnd, { passive: true });
    } else {
      target.addEventListener('pointerenter', onPointerEnter, { passive: true });
      target.addEventListener('pointermove', onPointerMove, { passive: true });
      target.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }
  }

  function point(clientX, clientY, target) {
    const rect = target.getBoundingClientRect();
    return {
      x: Math.max(-1, Math.min(1, ((clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2)),
    };
  }

  function setGoal(target, x, y) {
    const data = state.get(target);
    if (!data) return;
    data.goalX = x;
    data.goalY = y;
    schedule();
  }

  function onPointerEnter(event) {
    const target = event.currentTarget;
    const p = point(event.clientX, event.clientY, target);
    setGoal(target, p.x * 0.7, p.y * 0.7);
  }

  function onPointerMove(event) {
    if (reducedMotion()) return;
    const target = event.currentTarget;
    const p = point(event.clientX, event.clientY, target);
    setGoal(target, p.x, p.y);
  }

  function onPointerLeave(event) {
    setGoal(event.currentTarget, 0, 0);
  }

  function onTouchStart(event) {
    if (reducedMotion()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const target = event.currentTarget;
    const p = point(touch.clientX, touch.clientY, target);
    setGoal(target, p.x * 0.6, p.y * 0.6);
  }

  function onTouchMove(event) {
    if (reducedMotion()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const target = event.currentTarget;
    const p = point(touch.clientX, touch.clientY, target);
    setGoal(target, p.x * 0.6, p.y * 0.6);
  }

  function onTouchEnd(event) {
    setGoal(event.currentTarget, 0, 0);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = 0;
    let again = false;
    document.querySelectorAll(TARGETS.join(',')).forEach((target) => {
      prepareTarget(target);
      const data = state.get(target);
      if (!data) return;
      data.x += (data.goalX - data.x) * EASE;
      data.y += (data.goalY - data.y) * EASE;
      const px = data.x * MAX_X;
      const py = data.y * MAX_Y;
      data.layers.forEach((layer) => {
        const factor = Number(layer.dataset.depthFactor) || 1;
        layer.style.transform = `translate3d(${(px * factor).toFixed(2)}px,${(py * factor).toFixed(2)}px,0)`;
      });
      if (Math.abs(data.x - data.goalX) > 0.008 || Math.abs(data.y - data.goalY) > 0.008) again = true;
    });
    if (again) schedule();
  }

  function boot() {
    if (reducedMotion()) return;
    const observer = new MutationObserver(() => {
      document.querySelectorAll(TARGETS.join(',')).forEach(prepareTarget);
      schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(TARGETS.join(',')).forEach(prepareTarget);
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
