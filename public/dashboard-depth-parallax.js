(() => {
  'use strict';

  const TARGETS = [
    '.dashboard-screen .course-dashboard-card .course-open',
    '.dashboard-screen .action-card',
    '.dashboard-screen .dashboard-header',
  ];
  const LAYERS = [
    '.course-top',
    '.course-copy',
    '.course-footer',
    '.action-icon',
    '.dashboard-copy',
    '.dashboard-controls',
  ];
  const MAX_CARD_SHIFT = 1.8;
  const MAX_LAYER_SHIFT = 3.2;
  const MAX_ROTATE = 0.35;
  const MAX_SCALE = 0.008;
  const EASE = 0.12;
  const state = new WeakMap();
  let raf = 0;

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches;

  function clearElement(el) {
    if (!el) return;
    el.style.removeProperty('--depth-x');
    el.style.removeProperty('--depth-y');
    el.style.removeProperty('--depth-scale');
    el.style.transform = '';
    el.style.removeProperty('will-change');
  }

  function reset(root = document) {
    TARGETS.forEach((selector) => root.querySelectorAll(selector).forEach((el) => {
      clearElement(el);
      el.querySelectorAll('.depth-parallax-layer').forEach(clearElement);
      el.classList.remove('depth-parallax-target');
    }));
  }

  function prepareTarget(target) {
    if (!target || state.has(target) || reducedMotion()) return;
    target.classList.add('depth-parallax-target');
    const layers = LAYERS.filter((selector) => target.matches(selector) || target.querySelector(selector));
    const layerEls = [];
    layers.forEach((selector) => {
      const candidates = target.matches(selector) ? [target] : [...target.querySelectorAll(selector)];
      candidates.forEach((el, index) => {
        if (layerEls.includes(el)) return;
        el.classList.add('depth-parallax-layer');
        el.dataset.depthFactor = String(Math.min(1.45, 0.75 + (index + 1) * 0.08));
        layerEls.push(el);
      });
    });
    state.set(target, { layers: layerEls, tx: 0, ty: 0, rot: 0, scale: 0, active: false });

    if (!coarsePointer()) {
      target.addEventListener('pointermove', onPointerMove, { passive: true });
      target.addEventListener('pointerenter', onPointerEnter, { passive: true });
      target.addEventListener('pointerleave', onPointerLeave, { passive: true });
    } else {
      target.addEventListener('touchstart', onTouchStart, { passive: true });
      target.addEventListener('touchmove', onTouchMove, { passive: true });
      target.addEventListener('touchend', onTouchEnd, { passive: true });
      target.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }
  }

  function pointerPoint(event, target) {
    const rect = target.getBoundingClientRect();
    return {
      x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2)),
    };
  }

  function apply(target, x, y, active = true) {
    const data = state.get(target);
    if (!data) return;
    data.goalX = x;
    data.goalY = y;
    data.active = active;
    schedule();
  }

  function onPointerMove(event) {
    if (reducedMotion()) return;
    const target = event.currentTarget;
    const p = pointerPoint(event, target);
    apply(target, p.x, p.y, true);
  }

  function onPointerEnter(event) {
    if (reducedMotion()) return;
    const target = event.currentTarget;
    const p = pointerPoint(event, target);
    apply(target, p.x * 0.65, p.y * 0.65, true);
  }

  function onPointerLeave(event) {
    const target = event.currentTarget;
    apply(target, 0, 0, false);
  }

  function onTouchStart(event) {
    if (reducedMotion()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const target = event.currentTarget;
    const p = pointerPoint({ clientX: touch.clientX, clientY: touch.clientY }, target);
    apply(target, p.x * 0.7, p.y * 0.7, true);
  }

  function onTouchMove(event) {
    if (reducedMotion()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const target = event.currentTarget;
    const p = pointerPoint({ clientX: touch.clientX, clientY: touch.clientY }, target);
    apply(target, p.x * 0.7, p.y * 0.7, true);
  }

  function onTouchEnd(event) {
    apply(event.currentTarget, 0, 0, false);
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = 0;
    let needsNext = false;
    document.querySelectorAll(TARGETS.join(',')).forEach((target) => {
      prepareTarget(target);
      const data = state.get(target);
      if (!data) return;
      const gx = data.goalX || 0;
      const gy = data.goalY || 0;
      data.tx += ((gx * MAX_CARD_SHIFT) - data.tx) * EASE;
      data.ty += ((gy * MAX_CARD_SHIFT) - data.ty) * EASE;
      data.rot += ((gx * MAX_ROTATE) - data.rot) * EASE;
      data.scale += (((Math.abs(gx) + Math.abs(gy)) * 0.5 * MAX_SCALE) - data.scale) * EASE;

      target.style.setProperty('--depth-x', `${data.tx.toFixed(3)}px`);
      target.style.setProperty('--depth-y', `${data.ty.toFixed(3)}px`);
      target.style.setProperty('--depth-scale', `${(1 + data.scale).toFixed(5)}`);
      target.style.setProperty('transform', `translate3d(var(--depth-x),var(--depth-y),0) scale(var(--depth-scale)) rotateZ(${data.rot.toFixed(3)}deg)`);

      data.layers.forEach((layer) => {
        const factor = Number(layer.dataset.depthFactor) || 1;
        const lx = (gx * MAX_LAYER_SHIFT * factor);
        const ly = (gy * MAX_LAYER_SHIFT * factor);
        layer.style.setProperty('--depth-x', `${lx.toFixed(3)}px`);
        layer.style.setProperty('--depth-y', `${ly.toFixed(3)}px`);
        layer.style.setProperty('transform', `translate3d(var(--depth-x),var(--depth-y),0)`);
      });

      if (Math.abs(data.tx - gx * MAX_CARD_SHIFT) > 0.01 || Math.abs(data.ty - gy * MAX_CARD_SHIFT) > 0.01 || Math.abs(data.rot - gx * MAX_ROTATE) > 0.01 || Math.abs(data.scale - ((Math.abs(gx) + Math.abs(gy)) * 0.5 * MAX_SCALE)) > 0.0003) {
        needsNext = true;
      }
    });

    if (needsNext) schedule();
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
