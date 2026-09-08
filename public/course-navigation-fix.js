(() => {
  const NAV_SELECTOR = '.dashboard-nav-item, .course-mobile-nav button';
  const ROUTED_KEYS = new Set(['collections', 'notes']);
  const LABELS = { collections: 'Collections', notes: 'All Notes' };

  function setActive(button) {
    const nav = button.closest('nav');
    if (!nav) return;
    nav.querySelectorAll('[data-dashboard-nav], .course-mobile-nav button').forEach((item) => {
      const key = item.dataset.dashboardNav || item.getAttribute('aria-label')?.toLowerCase();
      item.classList.toggle('active', item === button || key === (button.dataset.dashboardNav || button.getAttribute('aria-label')?.toLowerCase()));
      if (item !== button && item.classList.contains('nav-active')) item.classList.remove('nav-active');
    });
  }

  function findCourseOpener() {
    return document.querySelector('.dashboard-screen .course-dashboard-card .course-open')
      || document.querySelector('.course-folder-screen .course-folder-card');
  }

  function openRealCourseTool(key) {
    const source = findCourseOpener();
    if (!source) return;

    source.click();

    const label = LABELS[key];
    const deadline = performance.now() + 5000;
    const seek = () => {
      const target = [...document.querySelectorAll('.course-tool-folder')].find((button) => {
        const title = button.querySelector('.course-tool-copy strong')?.textContent?.trim();
        return title === label;
      });
      if (target) {
        target.click();
        return;
      }
      if (performance.now() < deadline) requestAnimationFrame(seek);
    };
    requestAnimationFrame(seek);
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(NAV_SELECTOR);
    if (!button) return;

    const key = button.dataset.dashboardNav || button.getAttribute('aria-label')?.toLowerCase();
    if (!ROUTED_KEYS.has(key)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    setActive(button);
    openRealCourseTool(key);
  }, true);
})();
