let initialized = false;

function start() {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const markFreshSelections = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
      const wrapper = mutation.target;
      if (!(wrapper instanceof HTMLElement) || !wrapper.classList.contains('collection-selection-wrap')) continue;
      if (!wrapper.classList.contains('longpress-selected')) continue;
      wrapper.dataset.longPressFresh = '1';
      window.setTimeout(() => { delete wrapper.dataset.longPressFresh; }, 850);
    }
  });

  markFreshSelections.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const wrapper = target?.closest?.('.collection-selection-wrap');
    if (!wrapper || wrapper.dataset.longPressFresh !== '1') return;
    delete wrapper.dataset.longPressFresh;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
}

start();
