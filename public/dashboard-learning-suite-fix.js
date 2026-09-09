(() => {
  const closeLearningSuite = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.learning-suite-close') : null;
    if (!button) return;
    const backdrop = button.closest('.modal-backdrop');
    if (!backdrop) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  };

  document.addEventListener('click', closeLearningSuite, true);
})();
