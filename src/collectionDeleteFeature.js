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

function writeMap(userId, map) {
  try { localStorage.setItem(`${ID_MAP_KEY}:${userId}`, JSON.stringify(map)); } catch {}
}

function mapCloudId(userId, type, localId, scope = '') {
  const raw = String(localId ?? '').trim();
  if (UUID_RE.test(raw)) return raw;
  const map = readMap(userId);
  const scoped = scope ? map[`${type}:${scope}:${raw}`] : '';
  if (UUID_RE.test(String(scoped || ''))) return String(scoped);
  const legacy = map[`${type}:${raw}`];
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

function iconSvg(name) {
  if (name === 'trash') return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 10v6M14 10v6"/></svg>';
  if (name === 'check') return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>';
  return '';
}

function injectStyles() {
  if (document.getElementById('collection-delete-feature-styles')) return;
  const style = document.createElement('style');
  style.id = 'collection-delete-feature-styles';
  style.textContent = `
    .collection-delete-tools{display:flex;align-items:center;gap:10px;margin-left:auto;padding-left:12px}
    .collection-delete-trigger{position:relative;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(255,255,255,.05));color:rgba(255,255,255,.88);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 8px 24px rgba(15,18,32,.18);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);cursor:pointer;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease}
    .collection-delete-trigger:hover{transform:translateY(-1px);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.07));border-color:rgba(255,255,255,.26);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 12px 28px rgba(15,18,32,.24)}
    .collection-delete-trigger:active{transform:translateY(0) scale(.97)}
    .collection-delete-trigger.active{background:linear-gradient(145deg,rgba(255,124,153,.3),rgba(255,74,112,.11));border-color:rgba(255,143,166,.44);color:#ffdce4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 28px rgba(255,74,112,.18)}
    .collection-delete-trigger svg{filter:drop-shadow(0 2px 7px rgba(255,92,126,.18))}
    .collection-selection-wrap{display:flex;align-items:center;gap:11px;width:100%;margin-bottom:10px}
    .collection-selection-wrap>.glass-list-item{flex:1;min-width:0}
    .collection-selection-wrap.selected>.glass-list-item{border-color:rgba(191,145,255,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 10px 28px rgba(105,72,165,.12);transform:translateY(-1px)}
    .collection-selection-control{position:relative;width:36px;height:36px;flex:0 0 36px;display:inline-flex;align-items:center;justify-content:center;border-radius:13px;border:1px solid rgba(255,255,255,.17);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 8px 20px rgba(19,23,40,.16);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);cursor:pointer;transition:all .2s ease}
    .collection-selection-control:hover{border-color:rgba(193,165,255,.42);background:linear-gradient(145deg,rgba(198,166,255,.18),rgba(255,255,255,.05));transform:scale(1.03)}
    .collection-selection-control input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
    .collection-checkmark{width:22px;height:22px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.02));display:inline-flex;align-items:center;justify-content:center;color:transparent;transition:all .2s ease;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
    .collection-selection-control input:checked + .collection-checkmark{color:#fff;border-color:rgba(214,189,255,.7);background:linear-gradient(145deg,#bf93ff,#7f5be7);box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 0 0 4px rgba(172,129,255,.12),0 8px 18px rgba(121,80,229,.28)}
    .collection-selection-control input:focus-visible + .collection-checkmark{outline:2px solid rgba(202,176,255,.85);outline-offset:3px}
    .collection-delete-actionbar{display:flex;align-items:center;gap:9px;margin:2px 0 14px;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.035));box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 10px 24px rgba(15,18,32,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    .collection-delete-selection-count{margin-right:auto;font-size:12px;font-weight:700;letter-spacing:.02em;opacity:.78}
    .collection-delete-cancel,.collection-delete-confirm{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 13px;font:inherit;font-weight:700;cursor:pointer;transition:all .18s ease}
    .collection-delete-cancel{background:rgba(255,255,255,.06);color:inherit}.collection-delete-cancel:hover{background:rgba(255,255,255,.1)}
    .collection-delete-confirm{background:linear-gradient(135deg,rgba(255,102,135,.26),rgba(255,66,104,.12));border-color:rgba(255,137,160,.3);color:#ffdce4;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 18px rgba(255,69,107,.12)}
    .collection-delete-confirm:hover{background:linear-gradient(135deg,rgba(255,102,135,.34),rgba(255,66,104,.16));transform:translateY(-1px)}
    .collection-delete-modal-backdrop{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,7,16,.56);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);animation:collectionDeleteFade .18s ease}
    .collection-delete-modal{width:min(460px,100%);max-height:min(78vh,640px);overflow:auto;padding:24px;border-radius:28px;background:linear-gradient(145deg,rgba(38,40,60,.9),rgba(20,22,37,.84));border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 28px 90px rgba(0,0,0,.42),0 0 60px rgba(132,96,228,.08);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);animation:collectionDeletePop .2s ease}
    .collection-delete-modal-symbol{width:48px;height:48px;margin-bottom:14px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;color:#ffdce4;background:linear-gradient(145deg,rgba(255,121,151,.27),rgba(255,255,255,.06));border:1px solid rgba(255,160,178,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 26px rgba(255,69,107,.12)}
    .collection-delete-modal h2{margin:0 0 7px;font-size:22px;letter-spacing:-.02em}.collection-delete-modal p{margin:0 0 16px;opacity:.76;line-height:1.5}
    .collection-delete-list{display:grid;gap:8px;max-height:220px;overflow:auto;margin:0 0 18px;padding-right:2px}.collection-delete-list span{padding:11px 12px;border-radius:13px;background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.09);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
    .collection-delete-modal-actions{display:flex;justify-content:flex-end;gap:10px}.collection-delete-modal-actions button{border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:11px 15px;font:inherit;font-weight:700;cursor:pointer;transition:all .18s ease}.collection-delete-modal-actions .cancel{background:rgba(255,255,255,.06);color:inherit}.collection-delete-modal-actions .danger{background:linear-gradient(135deg,#ff6d8c,#ea4569);border-color:rgba(255,191,204,.28);color:#fff;box-shadow:0 10px 26px rgba(255,69,107,.18)}
    @keyframes collectionDeleteFade{from{opacity:0}to{opacity:1}}@keyframes collectionDeletePop{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media (max-width:600px){.collection-delete-tools{padding-left:6px}.collection-delete-trigger{width:40px;height:40px}.collection-delete-actionbar{padding:9px 10px}.collection-delete-cancel,.collection-delete-confirm{padding:8px 10px}.collection-delete-modal{padding:20px;border-radius:24px}.collection-delete-modal-actions{position:sticky;bottom:0;padding-top:4px}}
  `;
  document.head.appendChild(style);
}

function buildModal(selectedNames, onConfirm, onCancel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'collection-delete-modal-backdrop';
  const modal = document.createElement('section');
  modal.className = 'collection-delete-modal';
  const symbol = document.createElement('span');
  symbol.className = 'collection-delete-modal-symbol';
  symbol.innerHTML = iconSvg('trash');
  modal.appendChild(symbol);
  const title = document.createElement('h2');
  title.textContent = `Delete ${selectedNames.length === 1 ? 'collection' : 'collections'}?`;
  modal.appendChild(title);
  const description = document.createElement('p');
  description.textContent = `This will permanently remove the selected collection${selectedNames.length === 1 ? '' : 's'} from this workspace.`;
  modal.appendChild(description);
  const list = document.createElement('div');
  list.className = 'collection-delete-list';
  selectedNames.forEach((name) => {
    const item = document.createElement('span');
    item.textContent = name;
    list.appendChild(item);
  });
  modal.appendChild(list);
  const actions = document.createElement('div');
  actions.className = 'collection-delete-modal-actions';
  const cancel = document.createElement('button');
  cancel.className = 'cancel';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  const confirm = document.createElement('button');
  confirm.className = 'danger';
  confirm.type = 'button';
  confirm.textContent = 'Confirm Delete';
  actions.append(cancel, confirm);
  modal.appendChild(actions);
  backdrop.appendChild(modal);
  cancel.onclick = onCancel;
  confirm.onclick = onConfirm;
  backdrop.onclick = (event) => { if (event.target === backdrop) onCancel(); };
  return backdrop;
}

async function resolveCollectionIds(selectedEntries, course, userId) {
  const map = readMap(userId);
  const cloudCourseId = mapCloudId(userId, 'course', course.id);
  let cloudCollections = null;
  if (supabase) {
    const query = supabase.from('collections').select('id,course_id,name').eq('user_id', userId);
    const { data, error } = cloudCourseId ? await query.eq('course_id', cloudCourseId) : await query;
    if (error) throw error;
    cloudCollections = data || [];
  }
  const usedCloudIds = new Set();
  return selectedEntries.map((entry) => {
    let cloudId = map[`collection:${String(course.id)}:${String(entry.localId)}`];
    if (!UUID_RE.test(String(cloudId || ''))) cloudId = map[`collection:${String(entry.localId)}`];
    if (!UUID_RE.test(String(cloudId || '')) && UUID_RE.test(String(entry.localId))) cloudId = String(entry.localId);
    if (!UUID_RE.test(String(cloudId || '')) && cloudCollections) {
      const exactCourseMatches = cloudCollections.filter((row) => String(row.name || '').trim() === String(entry.name || '').trim());
      const unused = exactCourseMatches.find((row) => !usedCloudIds.has(String(row.id)));
      if (unused) {
        cloudId = String(unused.id);
        map[`collection:${String(course.id)}:${String(entry.localId)}`] = cloudId;
      }
    }
    if (UUID_RE.test(String(cloudId || ''))) usedCloudIds.add(String(cloudId));
    return { ...entry, cloudId: UUID_RE.test(String(cloudId || '')) ? String(cloudId) : '' };
  });
}

async function deleteSelectedCollections(selectedEntries, courseName, userId, list) {
  if (!supabase || !userId || !selectedEntries.length || busy) return;
  busy = true;
  try {
    const courses = readWorkspace(userId);
    const course = courseFromPage(courseName, courses);
    if (!course) throw new Error('The current course could not be identified.');
    const resolved = await resolveCollectionIds(selectedEntries, course, userId);
    if (resolved.some((entry) => !entry.cloudId)) {
      const unresolved = resolved.filter((entry) => !entry.cloudId).map((entry) => entry.name).join(', ');
      throw new Error(`Unable to match these collections to Supabase: ${unresolved}.`);
    }
    writeMap(userId, readMap(userId));
    writeMap(userId, { ...readMap(userId), ...Object.fromEntries(resolved.map((entry) => [`collection:${String(course.id)}:${String(entry.localId)}`, entry.cloudId])) });
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
  trigger.innerHTML = iconSvg('trash');
  tools.appendChild(trigger);
  header.appendChild(tools);

  const wrappers = [];
  const rows = Array.from(list.querySelectorAll(':scope > .glass-list-item'));
  const courseName = header.querySelector('.eyebrow')?.textContent?.trim() || '';
  const courses = readWorkspace(userId);
  const course = courseFromPage(courseName, courses);
  if (!course) return;

  let selectionMode = false;
  rows.forEach((row, index) => {
    const collection = course.collections[index];
    if (!collection) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'collection-selection-wrap';
    const label = document.createElement('label');
    label.className = 'collection-selection-control';
    label.setAttribute('aria-label', `Select ${collection.title}`);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.collectionId = String(collection.id);
    checkbox.setAttribute('aria-label', `Select ${collection.title}`);
    const checkmark = document.createElement('span');
    checkmark.className = 'collection-checkmark';
    checkmark.innerHTML = iconSvg('check');
    label.append(checkbox, checkmark);
    row.parentNode.insertBefore(wrapper, row);
    wrapper.appendChild(label);
    wrapper.appendChild(row);
    wrappers.push({ wrapper, checkbox, localId: String(collection.id), name: collection.title });
    row.addEventListener('click', (event) => {
      if (!selectionMode) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      checkbox.click();
    }, true);
    checkbox.onchange = () => {
      wrapper.classList.toggle('selected', checkbox.checked);
      syncSelection();
    };
  });

  const actionBar = document.createElement('div');
  actionBar.className = 'collection-delete-actionbar';
  actionBar.hidden = true;
  const selectedCount = document.createElement('span');
  selectedCount.className = 'collection-delete-selection-count';
  const cancel = document.createElement('button');
  cancel.className = 'collection-delete-cancel';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  const continueButton = document.createElement('button');
  continueButton.className = 'collection-delete-confirm';
  continueButton.type = 'button';
  continueButton.textContent = 'Delete selected';
  actionBar.append(selectedCount, cancel, continueButton);
  list.parentNode.insertBefore(actionBar, list);

  function syncSelection() {
    const selected = wrappers.filter((item) => item.checkbox.checked);
    selectedCount.textContent = `${selected.length} selected`;
    actionBar.hidden = !selectionMode || selected.length === 0;
  }

  function exitSelectionMode() {
    selectionMode = false;
    trigger.classList.remove('active');
    wrappers.forEach((item) => { item.checkbox.checked = false; item.wrapper.classList.remove('selected'); });
    actionBar.hidden = true;
    trigger.setAttribute('aria-pressed', 'false');
  }

  trigger.setAttribute('aria-pressed', 'false');
  trigger.onclick = () => {
    selectionMode = !selectionMode;
    trigger.classList.toggle('active', selectionMode);
    trigger.setAttribute('aria-pressed', selectionMode ? 'true' : 'false');
    wrappers.forEach((item) => { item.checkbox.disabled = !selectionMode; if (!selectionMode) { item.checkbox.checked = false; item.wrapper.classList.remove('selected'); } });
    syncSelection();
  };
  cancel.onclick = exitSelectionMode;
  continueButton.onclick = () => {
    const selected = wrappers.filter((item) => item.checkbox.checked);
    if (!selected.length) return;
    const modal = buildModal(selected.map((item) => item.name), async () => {
      confirmButton.disabled = true;
      confirmButton.textContent = 'Deleting…';
      modal.remove();
      await deleteSelectedCollections(selected.map((item) => ({ localId: item.localId, name: item.name })), courseName, userId, wrappers);
    }, () => modal.remove());
    const confirmButton = modal.querySelector('.danger');
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
