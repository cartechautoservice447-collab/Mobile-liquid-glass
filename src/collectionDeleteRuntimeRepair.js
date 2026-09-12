// Runtime compatibility repair for the historical a4a7647 collection feature set.
// Do not replace the historical collection modules; only repair their two runtime contracts.

const BODY_MODE_CLASS = 'collection-delete-mode';

function getCollectionHeaders() {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('h1'))
    .filter((heading) => heading.textContent.trim() === 'Collections')
    .map((heading) => heading.closest('header'))
    .filter(Boolean);
}

function syncCollectionRuntime() {
  if (typeof document === 'undefined' || !document.body) return;

  let hasCollectionPage = false;

  for (const header of getCollectionHeaders()) {
    hasCollectionPage = true;
    const trigger = header.querySelector('.collection-delete-trigger');

    // The historical Feature used this marker too early. If it exited before
    // producing the trigger, remove the stale marker so its own observer can retry.
    if (header.dataset.collectionDeleteReady === '1' && !trigger) {
      delete header.dataset.collectionDeleteReady;
    }
  }

  const trigger = document.querySelector('.collection-delete-trigger');
  const active = Boolean(
    trigger && (
      trigger.getAttribute('aria-pressed') === 'true' ||
      trigger.classList.contains('active')
    ),
  );

  document.body.classList.toggle(BODY_MODE_CLASS, active);

  if (!hasCollectionPage || trigger) return;

  // The Feature depends on the Supabase auth token being available in localStorage.
  // Poll briefly during the React/Supabase hydration window so the historical
  // enhancer cannot miss the one moment when the Collections DOM first appears.
}

function start() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  syncCollectionRuntime();

  const observer = new MutationObserver(syncCollectionRuntime);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed', 'data-collection-delete-ready'],
  });

  const timer = window.setInterval(syncCollectionRuntime, 300);
  window.setTimeout(() => window.clearInterval(timer), 12000);

  window.addEventListener('mobile-auth-callback-complete', syncCollectionRuntime);
}

start();
