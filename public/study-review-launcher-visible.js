(() => {
  'use strict';

  const IDLE_TITLE = 'AI study review';
  const IDLE_DETAIL = 'Complete a full study + rest cycle to unlock your review';

  const sync = () => {
    const launcher = document.querySelector('.dashboard-screen .dashboard-header .study-review-launcher');
    if (!launcher) return;

    const ready = launcher.classList.contains('is-ready');
    const resting = launcher.classList.contains('is-resting');
    if (ready || resting) return;

    launcher.hidden = false;
    launcher.dataset.reviewState = 'idle';
    launcher.setAttribute('aria-label', 'AI study review. Complete a full study and rest cycle to unlock your review.');

    const title = launcher.querySelector('.study-review-title');
    const detail = launcher.querySelector('.study-review-detail');
    if (title) title.textContent = IDLE_TITLE;
    if (detail) detail.textContent = IDLE_DETAIL;
  };

  const blockIdleOpen = (event) => {
    const launcher = event.target.closest?.('.study-review-launcher');
    if (!launcher) return;
    if (!launcher.classList.contains('is-ready') && !launcher.classList.contains('is-resting')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      sync();
    }
  };

  const boot = () => {
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    document.addEventListener('click', blockIdleOpen, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
