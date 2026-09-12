// Hydration retry for the historical a4a7647 collection enhancer.
// The historical Feature may run before the Supabase auth token is available.
// A tiny DOM nudge causes its existing MutationObserver to retry without changing
// the historical collection implementation itself.

function retryCollectionEnhancer() {
  if (typeof document === 'undefined' || !document.body) return;
  const heading = Array.from(document.querySelectorAll('h1')).find(
    (element) => element.textContent.trim() === 'Collections',
  );
  if (!heading) return;

  const header = heading.closest('header');
  if (!header || header.querySelector('.collection-delete-trigger')) return;

  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.dataset.collectionEnhancerRetry = '1';
  probe.style.display = 'none';
  document.body.appendChild(probe);
  probe.remove();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  retryCollectionEnhancer();
  const timer = window.setInterval(retryCollectionEnhancer, 300);
  window.setTimeout(() => window.clearInterval(timer), 15000);
  window.addEventListener('mobile-auth-callback-complete', retryCollectionEnhancer);
}
