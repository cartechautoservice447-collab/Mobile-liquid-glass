import { supabase } from './lib/supabase.js';

const WORKSPACE_KEY = 'mobile-liquid-glass-workspace-v1';
const ID_MAP_KEY = 'mobile-liquid-glass-cloud-id-map-v1';
const TOMBSTONE_KEY = 'mobile-liquid-glass-delete-tombstones-v1';
const TOMBSTONE_TTL = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_PRESS_MS = 560;
const DELETE_ANIMATION_MS = 1120;

let initialized = false;
let pageObserver = null;
let activeController = null;
let hydratedUserId = '';

const getUserId = () => {
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
        if (part) {
          const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
          if (payload?.sub) return String(payload.sub);
        }
      }
    }
  } catch {}
  return 'anonymous';
};

const readWorkspace = (userId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${WORKSPACE_KEY}:${userId}`) || '{}');
    return Array.isArray(parsed?.courses) ? parsed.courses : [];
  } catch { return []; }
};

const writeWorkspace = (userId, courses) => {
  try { localStorage.setItem(`${WORKSPACE_KEY}:${userId}`, JSON.stringify({ version: 3, courses })); } catch {}
};

const readMap = (userId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${ID_MAP_KEY}:${userId}`) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

const writeMap = (userId, map) => {
  try { localStorage.setItem(`${ID_MAP_KEY}:${userId}`, JSON.stringify(map)); } catch {}
};

const markDeleted = (userId, cloudIds) => {
  try {
    const key = `${TOMBSTONE_KEY}:${userId}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    const now = Date.now();
    cloudIds.forEach((id) => { parsed[`collection:${id}`] = now; });
    for (const [entry, timestamp] of Object.entries(parsed)) {
      if (!Number.isFinite(Number(timestamp)) || Number(timestamp) <= now - TOMBSTONE_TTL) delete parsed[entry];
    }
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch {}
};

const clearTombstones = (userId, cloudIds) => {
  try {
    const key = `${TOMBSTONE_KEY}:${userId}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    cloudIds.forEach((id) => delete parsed[`collection:${id}`]);
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch {}
};

const courseForPage = (courseName, courses) => courses.find((course) => String(course.name || '').trim() === String(courseName || '').trim()) || null;

function styles() {
  if (document.getElementById('collection-long-press-styles')) return;
  const style = document.createElement('style');
  style.id = 'collection-long-press-styles';
  style.textContent = `
    .collection-selection-control,
    .collection-delete-actionbar{display:none!important}
    .collection-selection-wrap{position:relative;overflow:visible!important;touch-action:pan-y}
    .collection-selection-wrap.longpress-selected>.glass-list-item{
      border-color:rgba(205,180,255,.5)!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.17),0 14px 34px rgba(130,94,232,.2),0 0 0 1px rgba(205,180,255,.11)!important;
      transform:translate3d(0,-2px,0) scale(.994)!important;
      transition:transform 220ms cubic-bezier(.16,1,.3,1),box-shadow 260ms ease,border-color 220ms ease!important;
    }
    .collection-selection-wrap.longpress-selected:after{
      content:"";position:absolute;inset:2px;border-radius:inherit;pointer-events:none;opacity:1;
      box-shadow:inset 0 0 26px rgba(191,153,255,.09);animation:collectionSelectedPulse 1.8s ease-in-out infinite
    }
    .collection-longpress-ripple{position:absolute;left:50%;top:50%;width:12px;height:12px;border-radius:50%;pointer-events:none;z-index:5;border:1px solid rgba(226,212,255,.88);box-shadow:0 0 18px rgba(181,148,255,.55);transform:translate(-50%,-50%) scale(.2);opacity:0;animation:collectionLongPressRipple 460ms cubic-bezier(.16,1,.3,1) forwards}
    .collection-delete-confirmation{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,7,17,.58);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);animation:collectionConfirmIn 220ms ease}
    .collection-delete-confirmation-card{width:min(460px,100%);max-height:min(78vh,680px);overflow:auto;padding:24px;border:1px solid rgba(255,255,255,.17);border-radius:28px;background:linear-gradient(145deg,rgba(41,43,66,.93),rgba(18,20,35,.9));box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 30px 100px rgba(0,0,0,.45),0 0 70px rgba(132,97,228,.1);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);animation:collectionConfirmCardIn 260ms cubic-bezier(.16,1,.3,1)}
    .collection-delete-confirmation-icon{width:52px;height:52px;border-radius:17px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:#ffdfe7;background:linear-gradient(145deg,rgba(255,114,149,.28),rgba(255,255,255,.05));border:1px solid rgba(255,171,188,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 12px 28px rgba(255,64,107,.14)}
    .collection-delete-confirmation-card h2{margin:0 0 7px;font-size:22px;letter-spacing:-.02em}.collection-delete-confirmation-card p{margin:0 0 16px;line-height:1.52;opacity:.76}
    .collection-delete-confirmation-list{display:grid;gap:8px;max-height:240px;overflow:auto;margin-bottom:20px}.collection-delete-confirmation-list span{padding:12px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03));box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
    .collection-delete-confirmation-actions{display:grid;grid-template-columns:1fr 1.15fr;gap:10px}.collection-delete-confirmation-actions button{min-height:45px;border-radius:14px;border:1px solid rgba(255,255,255,.13);font:inherit;font-weight:760;cursor:pointer;transition:transform 170ms ease,background 170ms ease,border-color 170ms ease}.collection-delete-confirmation-actions .cancel{color:inherit;background:rgba(255,255,255,.055)}.collection-delete-confirmation-actions .confirm{color:#fff;background:linear-gradient(135deg,#ff6b8b,#e64569);box-shadow:0 10px 25px rgba(255,67,107,.18)}.collection-delete-confirmation-actions button:active{transform:scale(.985)}
    .collection-selection-wrap.collection-deleting{position:relative;overflow:visible;pointer-events:none;will-change:clip-path,opacity;contain:paint;animation:collectionLongErase ${DELETE_ANIMATION_MS}ms cubic-bezier(.22,.72,.16,1) forwards!important}
    .collection-longpress-particles{position:absolute;inset:0;z-index:9;pointer-events:none;overflow:visible}
    .collection-longpress-particles i{position:absolute;left:50%;bottom:7px;width:4px;height:4px;border-radius:50%;opacity:0;background:#fff;box-shadow:0 0 7px rgba(255,255,255,.95),0 0 15px rgba(190,158,255,.72);will-change:transform,opacity}
    .collection-longpress-particles i:nth-child(1){animation:collectionLongParticle ${DELETE_ANIMATION_MS}ms cubic-bezier(.25,.78,.2,1) 0ms forwards;--dx:-30px}.collection-longpress-particles i:nth-child(2){animation:collectionLongParticle ${DELETE_ANIMATION_MS}ms cubic-bezier(.25,.78,.2,1) 70ms forwards;--dx:28px}.collection-longpress-particles i:nth-child(3){animation:collectionLongParticle ${DELETE_ANIMATION_MS}ms cubic-bezier(.25,.78,.2,1) 145ms forwards;--dx:-18px}.collection-longpress-particles i:nth-child(4){animation:collectionLongParticle ${DELETE_ANIMATION_MS}ms cubic-bezier(.25,.78,.2,1) 215ms forwards;--dx:18px}.collection-longpress-particles i:nth-child(5){animation:collectionLongParticle ${DELETE_ANIMATION_MS}ms cubic-bezier(.25,.78,.2,1) 285ms forwards;--dx:-10px}.collection-longpress-particles i:nth-child(6){animation:collectionLongParticle ${DELETE_ANIMATION_MS}ms cubic-bezier(.25,.78,.2,1) 355ms forwards;--dx:11px}
    .collection-longpress-particles i:nth-child(7){width:6px;height:6px;animation:collectionLongMainStar ${DELETE_ANIMATION_MS}ms cubic-bezier(.2,.82,.18,1) 30ms forwards;--dx:0px}
    .collection-selection-wrap.collection-layout-shift{will-change:transform;animation:collectionLongLift var(--collection-shift-ms,650ms) cubic-bezier(.22,.76,.2,1) both!important}
    @keyframes collectionSelectedPulse{0%,100%{opacity:.55}50%{opacity:1}}
    @keyframes collectionLongPressRipple{0%{opacity:.55;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(7)}}
    @keyframes collectionConfirmIn{from{opacity:0}to{opacity:1}}@keyframes collectionConfirmCardIn{from{opacity:0;transform:translate3d(0,10px,0) scale(.985)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
    @keyframes collectionLongParticle{0%{opacity:0;transform:translate3d(-50%,0,0) scale(.3)}12%{opacity:.85}100%{opacity:0;transform:translate3d(calc(-50% + var(--dx)),calc(-1 * var(--star-travel)),0) scale(.06)}}
    @keyframes collectionLongMainStar{0%{opacity:0;transform:translate3d(-50%,0,0) scale(.35)}12%{opacity:1;transform:translate3d(-50%,0,0) scale(1)}80%{opacity:.98;transform:translate3d(calc(-50% + var(--dx)),calc(-1 * var(--star-travel) + 4px),0) scale(.86)}100%{opacity:0;transform:translate3d(calc(-50% + var(--dx)),calc(-1 * var(--star-travel)),0) scale(.08)}}
    @keyframes collectionLongErase{0%{opacity:1;clip-path:inset(0 0 0 0);transform:translate3d(0,0,0)}26%{opacity:1;clip-path:inset(0 0 16% 0)}50%{opacity:.9;clip-path:inset(0 0 42% 0)}74%{opacity:.58;clip-path:inset(0 0 70% 0)}92%{opacity:.22;clip-path:inset(0 0 90% 0)}100%{opacity:0;clip-path:inset(0 0 100% 0);transform:translate3d(0,-2px,0)}}
    @keyframes collectionLongLift{from{transform:translate3d(0,var(--collection-shift-y,0px),0)}to{transform:translate3d(0,0,0)}}
    @media (prefers-reduced-motion:reduce){.collection-selection-wrap.longpress-selected>.glass-list-item{transition:none}.collection-selection-wrap.collection-deleting{animation-duration:260ms!important}.collection-longpress-particles{display:none}.collection-selection-wrap.collection-layout-shift{animation-duration:260ms!important}}
    @media (max-width:600px){.collection-delete-confirmation-card{padding:20px;border-radius:24px}.collection-delete-confirmation-actions{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

const createModal = (names, onCancel, onConfirm) => {
  const backdrop = document.createElement('div');
  backdrop.className = 'collection-delete-confirmation';
  const card = document.createElement('section');
  card.className = 'collection-delete-confirmation-card';
  card.innerHTML = `<div class="collection-delete-confirmation-icon" aria-hidden="true">✦</div><h2>Delete selected collections?</h2><p>The following collection${names.length === 1 ? '' : 's'} will be permanently removed from this workspace.</p>`;
  const list = document.createElement('div'); list.className = 'collection-delete-confirmation-list';
  names.forEach((name) => { const item = document.createElement('span'); item.textContent = name; list.appendChild(item); });
  const actions = document.createElement('div'); actions.className = 'collection-delete-confirmation-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'cancel'; cancel.textContent = 'Cancel';
  const confirm = document.createElement('button'); confirm.type = 'button'; confirm.className = 'confirm'; confirm.textContent = 'Confirm Delete';
  actions.append(cancel, confirm); card.append(list, actions); backdrop.appendChild(card);
  cancel.onclick = onCancel; confirm.onclick = onConfirm; backdrop.onclick = (event) => { if (event.target === backdrop) onCancel(); };
  return backdrop;
};

const resolveCloudIds = async (entries, course, userId) => {
  const map = readMap(userId);
  const cloudCourseId = UUID_RE.test(String(course.id)) ? String(course.id) : map[`course:${String(course.id)}`] || '';
  let rows = null;
  if (supabase) {
    let query = supabase.from('collections').select('id,course_id,name').eq('user_id', userId);
    if (UUID_RE.test(String(cloudCourseId))) query = query.eq('course_id', cloudCourseId);
    const { data, error } = await query;
    if (error) throw error;
    rows = data || [];
  }
  const used = new Set(); const nextMap = { ...map };
  const resolved = entries.map((entry) => {
    let cloudId = nextMap[`collection:${String(course.id)}:${String(entry.localId)}`] || nextMap[`collection:${String(entry.localId)}`] || '';
    if (!UUID_RE.test(String(cloudId)) && UUID_RE.test(String(entry.localId))) cloudId = entry.localId;
    if (!UUID_RE.test(String(cloudId)) && rows) {
      const candidates = rows.filter((row) => String(row.name || '').trim() === String(entry.name || '').trim());
      const match = candidates.find((row) => !used.has(String(row.id)));
      if (match) { cloudId = String(match.id); nextMap[`collection:${String(course.id)}:${String(entry.localId)}`] = cloudId; }
    }
    if (UUID_RE.test(String(cloudId))) used.add(String(cloudId));
    return { ...entry, cloudId: UUID_RE.test(String(cloudId)) ? String(cloudId) : '' };
  });
  writeMap(userId, nextMap); return resolved;
};

const animateRemaining = (beforeLayout, removedItems) => {
  const removed = new Set(removedItems.map((item) => item.wrapper));
  beforeLayout.filter(({ item }) => !removed.has(item.wrapper)).forEach(({ item, rect }) => {
    if (!item.wrapper.isConnected) return;
    const after = item.wrapper.getBoundingClientRect();
    const deltaY = rect.top - after.top;
    if (Math.abs(deltaY) < 1) return;
    item.wrapper.style.setProperty('--collection-shift-y', `${deltaY}px`);
    item.wrapper.style.setProperty('--collection-shift-ms', `${Math.min(860, Math.max(560, 620 + Math.abs(deltaY) * .45))}ms`);
    item.wrapper.classList.remove('collection-layout-shift'); void item.wrapper.offsetWidth; item.wrapper.classList.add('collection-layout-shift');
    item.wrapper.addEventListener('animationend', () => { item.wrapper.classList.remove('collection-layout-shift'); item.wrapper.style.removeProperty('--collection-shift-y'); item.wrapper.style.removeProperty('--collection-shift-ms'); }, { once: true });
  });
};

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const removeVisualDeleteState = (items) => {
  items.forEach((item) => {
    item.wrapper.classList.remove('collection-deleting', 'longpress-selected');
    item.wrapper.querySelector('.collection-longpress-particles')?.remove();
    item.wrapper.style.removeProperty('--star-travel');
  });
};

const animateAndDelete = async (selected, courseName, userId) => {
  if (busyState()) return;
  setBusyState(true);
  let deletedCloudIds = [];
  try {
    const courses = readWorkspace(userId); const course = courseForPage(courseName, courses);
    if (!course) return;
    const cloudEnabled = Boolean(supabase && userId && userId !== 'anonymous');
    let resolved = selected.map((entry) => ({ ...entry, cloudId: entry.localId }));

    if (cloudEnabled) {
      resolved = await resolveCloudIds(selected, course, userId);
      const unresolved = resolved.filter((entry) => !entry.cloudId);
      if (unresolved.length) throw new Error(`Unable to match: ${unresolved.map((entry) => entry.name).join(', ')}`);
      deletedCloudIds = resolved.map((entry) => entry.cloudId);
      markDeleted(userId, deletedCloudIds);
    }

    const wrappers = currentItems();
    const selectedItems = wrappers.filter((item) => selected.some((entry) => String(entry.localId) === String(item.localId)));
    const beforeLayout = currentItems().map((item) => ({ item, rect: item.wrapper.getBoundingClientRect() }));
    selectedItems.forEach((item) => {
      const height = Math.max(item.wrapper.getBoundingClientRect().height, 1);
      item.wrapper.style.setProperty('--star-travel', `${Math.max(height - 14, 16)}px`);
      item.wrapper.classList.add('collection-deleting');
      const particles = document.createElement('span');
      particles.className = 'collection-longpress-particles';
      for (let i = 0; i < 7; i += 1) particles.appendChild(document.createElement('i'));
      item.wrapper.appendChild(particles);
    });

    const remoteResultsPromise = cloudEnabled
      ? Promise.allSettled(resolved.map(async (entry) => {
          const { error } = await supabase.from('collections').delete().eq('user_id', userId).eq('id', entry.cloudId);
          if (error) throw error;
          const { data, error: verifyError } = await supabase.from('collections').select('id').eq('user_id', userId).eq('id', entry.cloudId).limit(1);
          if (verifyError) throw verifyError;
          if (data?.length) throw new Error(`Collection deletion was not confirmed for ${entry.name}.`);
          return entry;
        }))
      : Promise.resolve([]);

    const [remoteResults] = await Promise.all([remoteResultsPromise, wait(DELETE_ANIMATION_MS + 20)]);

    if (cloudEnabled) {
      const succeeded = remoteResults.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      const failed = remoteResults.filter((result) => result.status === 'rejected');
      if (failed.length) {
        const succeededIds = new Set(succeeded.map((entry) => String(entry.localId)));
        const failedCloudIds = resolved.filter((entry) => !succeededIds.has(String(entry.localId))).map((entry) => entry.cloudId).filter(Boolean);
        if (failedCloudIds.length) clearTombstones(userId, failedCloudIds);
        const successfulItems = selectedItems.filter((item) => succeededIds.has(String(item.localId)));
        const failedItems = selectedItems.filter((item) => !succeededIds.has(String(item.localId)));
        successfulItems.forEach((item) => item.wrapper.remove());
        removeVisualDeleteState(failedItems);
        animateRemaining(beforeLayout, successfulItems);
        const nextCourses = courses.map((entry) => entry.id !== course.id ? entry : { ...entry, collections: entry.collections.filter((collection) => !succeededIds.has(String(collection.id))) });
        writeWorkspace(userId, nextCourses);
        const errorMessage = failed.map((result) => result.reason?.message || 'Unknown deletion error.').join(' ');
        throw new Error(errorMessage || 'Some collection deletions failed.');
      }
    }

    selectedItems.forEach((item) => item.wrapper.remove());
    animateRemaining(beforeLayout, selectedItems);
    const deletedLocalIds = new Set(resolved.map((item) => String(item.localId)));
    const nextCourses = courses.map((entry) => entry.id !== course.id ? entry : { ...entry, collections: entry.collections.filter((collection) => !deletedLocalIds.has(String(collection.id))) });
    writeWorkspace(userId, nextCourses);
    window.dispatchEvent(new CustomEvent('collection-delete-completed', { detail: { courseId: course.id, collectionIds: [...deletedLocalIds] } }));
    activeController?.cleanup?.();
  } catch (error) {
    if (deletedCloudIds.length && cloudEnabledForError(userId, error)) clearTombstones(userId, deletedCloudIds);
    throw error;
  } finally {
    setBusyState(false);
  }
};

const cloudEnabledForError = (userId, error) => Boolean(supabase && userId && userId !== 'anonymous' && !String(error?.message || '').startsWith('Unknown deletion error.'));

let isBusy = false; function busyState(){ return isBusy; } function setBusyState(value){ isBusy=value; }
let currentItems = () => [];

function enhance() {
  styles();
  const heading = Array.from(document.querySelectorAll('h1')).find((el) => el.textContent.trim() === 'Collections');
  const list = document.querySelector('.collections-list'); const header = heading?.closest('header');
  if (!heading || !list || !header) return;
  const userId = getUserId();
  const rows = Array.from(list.querySelectorAll(':scope > .collection-selection-wrap'));
  if (!rows.length) return;
  if (activeController?.header === header) return;
  if (activeController) activeController.cleanup();
  const controller = { header, cleanup: () => {} }; activeController = controller;
  const selected = new Set(); let selectionMode = false; let longPress = null;
  const items = rows.map((wrapper) => {
    const checkbox = wrapper.querySelector('input[type="checkbox"]');
    const name = wrapper.querySelector('.glass-list-item')?.querySelector('h3,h4,.title,strong')?.textContent?.trim() || wrapper.textContent.replace(/\s+/g, ' ').trim();
    const localId = String(checkbox?.dataset.collectionId || '');
    return { wrapper, checkbox, localId, name };
  }).filter((item) => item.localId);
  currentItems = () => items;
  const trigger = document.querySelector('.collection-delete-trigger');
  if (trigger) {
    trigger.addEventListener('click', triggerClick, true);
    trigger.addEventListener('pointerdown', triggerBlock, true);
    trigger.addEventListener('pointerup', triggerBlock, true);
    trigger.addEventListener('pointercancel', triggerBlock, true);
    trigger.addEventListener('touchend', triggerBlock, true);
  }
  function triggerBlock(event){ event.stopImmediatePropagation(); }
  function triggerClick(event){ event.preventDefault(); event.stopImmediatePropagation(); if (isBusy || !selected.size) return; const chosen=items.filter((item)=>selected.has(item.localId)); const modal=createModal(chosen.map((item)=>item.name),()=>{ modal.remove(); },async()=>{ modal.remove(); try{ await animateAndDelete(chosen.map((item)=>({localId:item.localId,name:item.name})),header.querySelector('.eyebrow')?.textContent?.trim()||'',userId); selectionMode=false; selected.clear(); items.forEach((item)=>item.wrapper.classList.remove('longpress-selected')); }catch(error){ window.alert(`Collection deletion failed: ${error?.message||'Unknown error.'}`); selectionMode=true; } }); document.body.appendChild(modal); }
  const choose = (item) => { if (!selectionMode) { selectionMode = true; } if (selected.has(item.localId)) selected.delete(item.localId); else selected.add(item.localId); item.wrapper.classList.toggle('longpress-selected', selected.has(item.localId)); if (!selected.size) selectionMode=false; };
  const clearPress = () => { if (longPress) { window.clearTimeout(longPress.timer); longPress=null; } };
  items.forEach((item) => {
    const start = (event) => { if (isBusy) return; clearPress(); const pointX=event.clientX??0, pointY=event.clientY??0; longPress={item,timer:window.setTimeout(()=>{longPress=null; choose(item); const ripple=document.createElement('span'); ripple.className='collection-longpress-ripple'; ripple.style.left=`${pointX-item.wrapper.getBoundingClientRect().left}px`; ripple.style.top=`${pointY-item.wrapper.getBoundingClientRect().top}px`; item.wrapper.appendChild(ripple); window.setTimeout(()=>ripple.remove(),500);},LONG_PRESS_MS),x:pointX,y:pointY}; };
    const move = (event) => { if (!longPress) return; const dx=(event.clientX??0)-longPress.x, dy=(event.clientY??0)-longPress.y; if ((dx*dx+dy*dy)>64) clearPress(); };
    const end = () => { clearPress(); };
    item.wrapper.addEventListener('pointerdown', start, true); item.wrapper.addEventListener('pointermove', move, true); item.wrapper.addEventListener('pointerup', end, true); item.wrapper.addEventListener('pointercancel', end, true);
    item.wrapper.addEventListener('click', (event) => { if (!selectionMode) return; event.preventDefault(); event.stopImmediatePropagation(); choose(item); }, true);
  });
  controller.cleanup = () => { clearPress(); if (trigger) { trigger.removeEventListener('click',triggerClick,true); trigger.removeEventListener('pointerdown',triggerBlock,true); trigger.removeEventListener('pointerup',triggerBlock,true); trigger.removeEventListener('pointercancel',triggerBlock,true); trigger.removeEventListener('touchend',triggerBlock,true); } items.forEach((item)=>item.wrapper.isConnected && item.wrapper.replaceWith(item.wrapper.cloneNode(true))); if (activeController===controller) activeController=null; };
}

function start() {
  if (initialized || typeof document === 'undefined') return; initialized = true; styles();
  const run = () => { try { enhance(); } catch {} };
  run(); pageObserver = new MutationObserver(run); pageObserver.observe(document.body,{childList:true,subtree:true});
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