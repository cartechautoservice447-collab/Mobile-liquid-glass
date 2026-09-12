// Hydration bootstrap for the historical a4a7647 collection delete feature.
// Keep the original Feature/Polish/LongPress modules intact. This module only
// waits until the Collections page, Supabase auth, and the hydrated workspace
// are actually ready, then re-runs the historical Feature exactly once through
// a fixed query-string import so an early initialization cannot permanently miss it.

const WORKSPACE_KEY = 'mobile-liquid-glass-workspace-v1';
let bootstrapStarted = false;
let featureBootstrapped = false;

function getUserId() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return String(parsed.user.id);
      if (parsed?.access_token) {
        const part = parsed.access_token.split('.')[1];
        if (part) {
          const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
          if (payload?.sub) return String(payload.sub);
        }
      }
    }
  } catch {}
  return '';
}

function getCollectionPageState() {
  if (typeof document === 'undefined') return null;
  const heading = Array.from(document.querySelectorAll('h1')).find(
    (element) => element.textContent.trim() === 'Collections',
  );
  const list = document.querySelector('.collections-list');
  const header = heading?.closest('header');
  if (!heading || !list || !header) return null;
  return { heading, list, header };
}

function workspaceCourseReady(userId, header) {
  if (!userId) return false;
  const courseName = header.querySelector('.eyebrow')?.textContent?.trim() || '';
  if (!courseName) return false;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${WORKSPACE_KEY}:${userId}`) || '{}');
    const courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
    return courses.some((course) => String(course.name || '').trim() === courseName);
  } catch {
    return false;
  }
}

function nudgeHistoricalObserver() {
  if (typeof document === 'undefined' || !document.body) return;
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.dataset.collectionEnhancerRetry = '1';
  probe.style.display = 'none';
  document.body.appendChild(probe);
  probe.remove();
}

async function bootstrapHistoricalFeature() {
  const page = getCollectionPageState();
  if (!page || page.header.querySelector('.collection-delete-trigger')) return false;

  const userId = getUserId();
  if (!workspaceCourseReady(userId, page.header)) return false;

  // Clear only the stale marker left by the historical Feature when it ran
  // before workspace hydration. Never touch a ready feature that has its trigger.
  if (page.header.dataset.collectionDeleteReady === '1') {
    delete page.header.dataset.collectionDeleteReady;
  }

  nudgeHistoricalObserver();

  if (!featureBootstrapped) {
    featureBootstrapped = true;
    try {
      await import('./collectionDeleteFeature.js?collection-hydrated-bootstrap');
    } catch (error) {
      featureBootstrapped = false;
      console.error('Collection delete feature bootstrap failed:', error);
      return false;
    }
  }

  return true;
}

function start() {
  if (bootstrapStarted || typeof window === 'undefined' || typeof document === 'undefined') return;
  bootstrapStarted = true;

  const run = () => { void bootstrapHistoricalFeature(); };
  run();

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });

  const timer = window.setInterval(run, 300);
  window.setTimeout(() => {
    window.clearInterval(timer);
    observer.disconnect();
  }, 20000);

  window.addEventListener('mobile-auth-callback-complete', run);
}

start();
