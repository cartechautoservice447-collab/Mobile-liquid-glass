(() => {
  const NAV_SELECTOR = '.dashboard-nav-item, .course-mobile-nav button';
  const ROUTED_KEYS = new Set(['collections', 'notes']);
  const LABELS = { collections: 'Collections', notes: 'All Notes' };
  const RETURNING_CLASS = 'course-nav-direct-dashboard-return';

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

  function installReturnTransitionStyle() {
    if (document.getElementById('course-navigation-return-style')) return;
    const style = document.createElement('style');
    style.id = 'course-navigation-return-style';
    style.textContent = `
      html.${RETURNING_CLASS} .course-workspace-screen{
        visibility:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function returnDirectlyToDashboard() {
    installReturnTransitionStyle();
    document.documentElement.classList.add(RETURNING_CLASS);

    const finish = () => {
      if (document.querySelector('.dashboard-screen')) {
        document.documentElement.classList.remove(RETURNING_CLASS);
        return true;
      }
      return false;
    };

    const clickWorkspaceBack = () => {
      const dashboardButton = document.querySelector('.course-workspace-screen .course-workspace-header .back-button');
      if (!dashboardButton) return false;
      dashboardButton.click();
      return true;
    };

    const observer = new MutationObserver(() => {
      if (finish()) observer.disconnect();
      else if (clickWorkspaceBack()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    requestAnimationFrame(() => {
      if (!clickWorkspaceBack()) {
        requestAnimationFrame(() => {
          if (!clickWorkspaceBack()) {
            setTimeout(() => {
              if (!finish()) {
                document.documentElement.classList.remove(RETURNING_CLASS);
                observer.disconnect();
              }
            }, 1800);
          }
        });
      }
    });
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

  // Collections and All Notes are opened from the Course Workspace. Their
  // native Back handler normally renders Course Workspace first; keep that
  // intermediate screen invisible and immediately follow its Back action so
  // the user lands on Dashboard without seeing the Course Workspace flash.
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.feature-screen .back-button');
    if (!button) return;

    const label = button.getAttribute('aria-label');
    if (label !== 'Back' && label !== 'Back to course') return;

    returnDirectlyToDashboard();
  }, true);
})();
