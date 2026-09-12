import { supabase } from './lib/supabase.js';

const WORKSPACE_KEY = 'mobile-liquid-glass-workspace-v1';
let initialized = false;
let hydratedUserId = '';

function getUserId() {
  if (hydratedUserId) return hydratedUserId;
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
        if (!part) continue;
        const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.sub) return String(payload.sub);
      }
    }
  } catch {}
  return 'anonymous';
}

function readWorkspace(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${WORKSPACE_KEY}:${userId}`) || '{}');
    return Array.isArray(parsed?.courses) ? parsed.courses : [];
  } catch {
    return [];
  }
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function iconSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 10v6M14 10v6"/></svg>';
}

function injectStyles() {
  if (document.getElementById('collection-delete-core-styles')) return;
  const style = document.createElement('style');
  style.id = 'collection-delete-core-styles';
  style.textContent = `
    .collection-delete-tools{display:flex;align-items:center;gap:10px;margin-left:auto;padding-left:12px}
    .collection-delete-trigger{position:relative;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.05));color:rgba(255,255,255,.88);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 24px rgba(15,18,32,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);cursor:pointer;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease}
    .collection-delete-trigger:hover{transform:translateY(-1px);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.07));border-color:rgba(255,255,255,.26);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 12px 28px rgba(15,18,32,.24)}
    .collection-delete-trigger:active{transform:translateY(0) scale(.97)}
    .collection-delete-trigger.active{background:linear-gradient(145deg,rgba(255,124,153,.3),rgba(255,74,112,.11));border-color:rgba(255,143,166,.44);color:#ffdce4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 28px rgba(255,74,112,.18)}
    .collection-delete-trigger svg{filter:drop-shadow(0 2px 7px rgba(255,92,126,.18))}
    .collection-selection-wrap{display:flex;align-items:center;gap:11px;width:100%;margin-bottom:10px}
    .collection-selection-wrap>.glass-list-item{flex:1;min-width:0}
    .collection-selection-control{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important;pointer-events:none!important}
    @media (max-width:600px){.collection-delete-tools{padding-left:6px}.collection-delete-trigger{width:40px;height:40px}}
  `;
  document.head.appendChild(style);
}

function collectionTitle(row) {
  return row.querySelector('h3,h4,.title,strong')?.textContent?.trim()
    || row.textContent.replace(/\s+/g, ' ').trim();
}

function ensureTrigger(header) {
  let tools = header.querySelector('.collection-delete-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'collection-delete-tools';
    header.appendChild(tools);
  }
  let trigger = tools.querySelector('.collection-delete-trigger');
  if (!trigger) {
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'collection-delete-trigger';
    trigger.setAttribute('aria-label', 'Delete collections');
    trigger.setAttribute('aria-pressed', 'false');
    trigger.innerHTML = iconSvg();
    tools.appendChild(trigger);
  }
}

function ensureRows(list, course) {
  if (list.querySelector(':scope > .collection-selection-wrap')) return;
  const rows = Array.from(list.querySelectorAll(':scope > .glass-list-item'));
  if (!rows.length) return;

  const collections = Array.isArray(course?.collections) ? course.collections : [];
  const byName = new Map();
  collections.forEach((collection) => {
    const key = normalize(collection?.title ?? collection?.name);
    if (key && !byName.has(key)) byName.set(key, collection);
  });

  rows.forEach((row, index) => {
    const title = collectionTitle(row);
    const collection = byName.get(normalize(title)) || collections[index] || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'collection-selection-wrap';

    const label = document.createElement('label');
    label.className = 'collection-selection-control';
    label.setAttribute('aria-label', `Select ${title || 'collection'}`);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.collectionId = String(collection?.id ?? '');
    checkbox.setAttribute('aria-label', `Select ${title || 'collection'}`);
    checkbox.tabIndex = -1;

    const checkmark = document.createElement('span');
    checkmark.className = 'collection-checkmark';
    checkmark.setAttribute('aria-hidden', 'true');
    label.append(checkbox, checkmark);
    wrapper.append(row, label);
    row.replaceWith(wrapper);
  });
}

function enhance() {
  if (!supabase || typeof document === 'undefined') return;
  const heading = Array.from(document.querySelectorAll('h1')).find((el) => el.textContent.trim() === 'Collections');
  const list = document.querySelector('.collections-list');
  const header = heading?.closest('header');
  if (!heading || !list || !header) return;

  injectStyles();
  ensureTrigger(header);

  const userId = getUserId();
  const courseName = header.querySelector('.eyebrow')?.textContent?.trim() || '';
  const course = readWorkspace(userId).find((entry) => normalize(entry?.name) === normalize(courseName));
  if (course) ensureRows(list, course);
}

function start() {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;
  const run = () => { try { enhance(); } catch {} };
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  try {
    supabase?.auth?.onAuthStateChange?.((_event, session) => {
      hydratedUserId = session?.user?.id ? String(session.user.id) : 'anonymous';
      window.setTimeout(run, 0);
    });
    void supabase?.auth?.getSession?.().then(({ data }) => {
      hydratedUserId = data?.session?.user?.id ? String(data.session.user.id) : 'anonymous';
      run();
    }).catch(() => {});
  } catch {}
}

start();