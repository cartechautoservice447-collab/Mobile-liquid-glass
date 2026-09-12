(() => {
  const DASHBOARD = '.dashboard-screen';
  const CARD = '.course-dashboard-card';

  const qs = (root, selector) => root?.querySelector(selector);
  const qsa = (root, selector) => [...(root?.querySelectorAll(selector) || [])];

  function repairCourseCard(card) {
    if (!(card instanceof HTMLElement)) return;
    const open = qs(card, '.course-open');
    const actions = qs(card, '.course-actions');
    if (!open || !actions) return;

    // The React dashboard historically rendered action buttons inside the
    // course-open button. That creates invalid nested interactive controls and
    // causes browsers to place the controls outside the visual card on mobile.
    if (actions.parentElement === open) card.appendChild(actions);

    actions.querySelectorAll('button').forEach((button) => {
      if (!button.getAttribute('type')) button.setAttribute('type', 'button');
    });
  }

  function repairDashboard(dashboard) {
    if (!(dashboard instanceof HTMLElement)) return;
    qsa(dashboard, CARD).forEach(repairCourseCard);
  }

  function boot() {
    document.querySelectorAll(DASHBOARD).forEach(repairDashboard);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(DASHBOARD)) repairDashboard(node);
          qsa(node, DASHBOARD).forEach(repairDashboard);
          const dashboard = node.closest?.(DASHBOARD);
          if (dashboard) repairDashboard(dashboard);
          qsa(node, CARD).forEach(repairCourseCard);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
