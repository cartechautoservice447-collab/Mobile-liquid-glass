import { supabase } from './lib/supabase.js';

const WORKSPACE_KEY = 'mobile-liquid-glass-workspace-v1';
const ID_MAP_KEY = 'mobile-liquid-glass-cloud-id-map-v1';
const TOMBSTONE_KEY = 'mobile-liquid-glass-delete-tombstones-v1';
const TOMBSTONE_TTL = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function readWorkspace(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${WORKSPACE_KEY}:${userId}`) || '{}');
    return Array.isArray(parsed?.courses) ? parsed.courses : [];
  } catch { return []; }
}

function writeWorkspace(userId, courses) {
  try { localStorage.setItem(`${WORKSPACE_KEY}:${userId}`, JSON.stringify({ version: 3, courses })); } catch {}
}

function readMap(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${ID_MAP_KEY}:${userId}`) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function mapCollectionId(userId, courseId, collectionId) {
  const map = readMap(userId);
  const scoped = map[`collection:${String(courseId)}:${String(collectionId)}`];
  if (UUID_RE.test(String(scoped || ''))) return String(scoped);
  const legacy = map[`collection:${String(collectionId)}`];
  return UUID_RE.test(String(legacy || '')) ? String(legacy) : '';
}

function markDeleted(userId, cloudIds) {
  try {
    const key = `${TOMBSTONE_KEY}:${userId}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    const now = Date.now();
    for (const id of cloudIds) parsed[`collection:${id}`] = now;
    for (const [entry, timestamp] of Object.entries(parsed)) {
      if (!Number.isFinite(Number(timestamp)) || Number(timestamp) <= now - TOMBSTONE_TTL) delete parsed[entry];
    }
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch {}
}

function courseFromPage(courseName, courses) {
  return courses.find((course) => String(course.name || '').trim() === String(courseName || '').trim()) || null;
}

let initialized = false;
let busy = false;

function injectStyles() {
  if (document.getElementById('collection-delete-feature-styles')) return;
  const style = document.createElement('style');
  style.id = 'collection-delete-feature-styles';
  style.textContent = `
    .collection-delete-tools{display:flex;align-items:center;gap:8px;margin-left:auto}
    .collection-delete-trigger{width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;background:rgba(255,255,255,.07);color:inherit;cursor:pointer}
    .collection-delete-trigger.active{background:rgba(255,86,112,.16);color:#ff8da1}
    .collection-selection-wrap{display:flex;align-items:stretch;gap:10px;width:100%}
    .collection-selection-box{width:22px;height:22px;margin:17px 0 0 2px;accent-color:#b68cff;flex:0 0 auto}
    .collection-selection-wrap>.glass-list-item{flex:1;min-width:0}
    .collection-delete-actionbar{display:flex;align-items:center;gap:10px;margin:0 0 14px}
    .collection-delete-cancel,.collection-delete-confirm{border:0;border-radius:12px;padding:10px 14px;cursor:pointer}
    .collection-delete-cancel{background:rgba(255,255,255,.08);color:inherit}
    .collection-delete-confirm{background:rgba(255,86,112,.18);color:#ff9aaa}
    .collection-delete-modal-backdrop{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,8,15,.68);backdrop-filter:blur(16px)}
    .collection-delete-modal{width:min(440px,100%);padding:24px;border-radius:24px;background:rgba(28,29,43,.88);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.4)}
    .collection-delete-modal h2{margin:0 0 8px}.collection-delete-modal p{margin:0 0 14px;opacity:.82}.collection-delete-list{display:grid;gap:8px;max-height:220px;overflow:auto;margin:0 0 18px}.collection-delete-list span{padding:9px 11px;border-radius:10px;background:rgba(255,255,255,.05)}
    .collection-delete-modal-actions{display:flex;justify-content:flex-end;gap:10px}.collection-delete-modal-actions button{border:0;border-radius:12px;padding:10px 15px;cursor:pointer}.collection-delete-modal-actions .cancel{background:rgba(255,255,255,.08);color:inherit}.collection-delete-modal-actions .danger{background:#ff5d78;color:#fff}
  `;
  document.head.appendChild(style);
}

function buildModal(selectedNames, onConfirm, onCancel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'collection-delete-modal-backdrop';
  const modal = document.createElement('section');
  modal.className = 'collection-delete-modal';
  modal.innerHTML = `<h2>Delete ${selectedNames.length === 1 ? 'collection' : 'collections'}?</h2><p>This action will permanently remove the selected collection${selectedNames.length === 1 ? '' : 's'} from this workspace.</p><div class="collection-delete-list">${selectedNames.map((name) => `<span>${name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</span>`).join('')}</div><div class="collection-delete-modal-actions"><button class="cancel" type="button">Cancel</button><button class="danger" type="button">Confirm Delete</button></div>`;
  backdrop.appendChild(modal);
  modal.querySelector('.cancel').onclick = onCancel;
  modal.querySelector('.danger').onclick = onConfirm;
  backdrop.onclick = (event) => { if (event.target === backdrop) onCancel(); };
  return backdrop;
}

async function deleteSelectedCollections(selectedEntries, courseName, userId, list) {
  if (!supabase || !userId || !selectedEntries.length || busy) return;
  busy = true;
  try {
    const courses = readWorkspace(userId);
    const course = courseFromPage(courseName, courses);
    if (!course) throw new Error('The current course could not be identified.');
    const resolved = selectedEntries.map((entry) => ({ ...entry, cloudId: mapCollectionId(userId, course.id, entry.localId) })).filter((entry) => UUID_RE.test(entry.cloudId));
    if (!resolved.length) throw new Error('Selected collections are not linked to Supabase yet.');
    markDeleted(userId, resolved.map((entry) => entry.cloudId));
    for (const entry of resolved) {
      const { error } = await supabase.from('collections').delete().eq('user_id', userId).eq('id', entry.cloudId);
      if (error) throw error;
      const { data, error: verifyError } = await supabase.from('collections').select('id').eq('user_id', userId).eq('id', entry.cloudId).limit(1);
      if (verifyError) throw verifyError;
      if (data?.length) throw new Error(`Collection deletion was not confirmed for ${entry.name}.`);
    }
    const nextCourses = courses.map((item) => item.id !== course.id ? item : { ...item, collections: item.collections.filter((collection) => !resolved.some((entry) => entry.localId === collection.id)) });
    writeWorkspace(userId, nextCourses);
    list.forEach(({ wrapper, localId }) => { if (resolved.some((entry) => entry.localId === localId)) wrapper.remove(); });
    window.location.reload();
  } catch (error) {
    window.alert(`Collection deletion failed: ${error.message}`);
  } finally { busy = false; }
}

function enhanceCollectionsPage() {
  if (!supabase || !document.querySelector('h1')) return;
  const heading = Array.from(document.querySelectorAll('h1')).find((el) => el.textContent.trim() === 'Collections');
  const list = document.querySelector('.collections-list');
  const header = heading?.closest('header');
  if (!heading || !list || !header || header.dataset.collectionDeleteReady === '1') return;
  const userId = getUserId();
  if (!userId) return;
  header.dataset.collectionDeleteReady = '1';
  injectStyles();

  const tools = document.createElement('div');
  tools.className = 'collection-delete-tools';
  const trigger = document.createElement('button');
  trigger.className = 'collection-delete-trigger';
  trigger.setAttribute('aria-label', 'Delete collections');
  trigger.title = 'Delete collections';
  trigger.innerHTML = '🗑️';
  tools.appendChild(trigger);
  header.appendChild(tools);

  const wrappers = [];
  const rows = Array.from(list.querySelectorAll(':scope > .glass-list-item'));
  const courseName = header.querySelector('.eyebrow')?.textContent?.trim() || '';
  const courses = readWorkspace(userId);
  const course = courseFromPage(courseName, courses);
  if (!course) return;

  rows.forEach((row, index) => {
    const collection = course.collections[index];
    if (!collection) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'collection-selection-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'collection-selection-box';
    checkbox.dataset.collectionId = String(collection.id);
    checkbox.hidden = true;
    row.parentNode.insertBefore(wrapper, row);
    wrapper.appendChild(checkbox);
    wrapper.appendChild(row);
    wrappers.push({ wrapper, checkbox, localId: String(collection.id), name: collection.title });
  });

  const actionBar = document.createElement('div');
  actionBar.className = 'collection-delete-actionbar';
  actionBar.hidden = true;
  const selectedCount = document.createElement('span');
  const cancel = document.createElement('button');
  cancel.className = 'collection-delete-cancel';
  cancel.textContent = 'Cancel';
  const continueButton = document.createElement('button');
  continueButton.className = 'collection-delete-confirm';
  continueButton.textContent = 'Delete selected';
  actionBar.append(selectedCount, cancel, continueButton);
  list.parentNode.insertBefore(actionBar, list);

  const syncSelection = () => {
    const selected = wrappers.filter((item) => item.checkbox.checked);
    selectedCount.textContent = `${selected.length} selected`;
    actionBar.hidden = selected.length === 0;
  };

  trigger.onclick = () => {
    const entering = !trigger.classList.contains('active');
    trigger.classList.toggle('active', entering);
    wrappers.forEach((item) => { item.checkbox.hidden = !entering; if (!entering) item.checkbox.checked = false; });
    actionBar.hidden = !entering;
    if (!entering) syncSelection();
  };
  wrappers.forEach((item) => { item.checkbox.onchange = syncSelection; });
  cancel.onclick = () => { trigger.click(); };
  continueButton.onclick = () => {
    const selected = wrappers.filter((item) => item.checkbox.checked);
    if (!selected.length) return;
    const modal = buildModal(selected.map((item) => item.name), async () => {
      modal.remove();
      await deleteSelectedCollections(selected.map((item) => ({ localId: item.localId, name: item.name })), courseName, userId, wrappers);
    }, () => modal.remove());
    document.body.appendChild(modal);
  };
}

function start() {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;
  const run = () => enhanceCollectionsPage();
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
}

start();
