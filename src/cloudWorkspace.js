import { supabase } from './lib/supabase.js';

const LOCAL_KEY = 'mobile-liquid-glass-workspace-v1';
const ID_MAP_KEY = 'mobile-liquid-glass-cloud-id-map-v1';
const CLOUD_HYDRATED_KEY = 'mobile-liquid-glass-cloud-hydrated-v1';
const DELETE_TOMBSTONE_KEY = 'mobile-liquid-glass-delete-tombstones-v1';
const DELETE_TOMBSTONE_TTL = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOUD_WRITE_QUEUES = new Map();

function findAuthUserId() {
  if (!supabase) return 'anonymous';
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return String(parsed.user.id);
      if (parsed?.access_token) {
        const payload = JSON.parse(atob(parsed.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.sub) return String(payload.sub);
      }
    }
  } catch {}
  return 'anonymous';
}

function localStorageKey() { return `${LOCAL_KEY}:${findAuthUserId()}`; }
function hydrationKey(userId) { return `${CLOUD_HYDRATED_KEY}:${userId}`; }
function isCloudHydrated(userId) { try { return localStorage.getItem(hydrationKey(userId)) === '1'; } catch { return false; } }
function markCloudHydrated(userId) { try { localStorage.setItem(hydrationKey(userId), '1'); } catch {} }

function readIdMap(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${ID_MAP_KEY}:${userId}`) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
function writeIdMap(userId, map) { try { localStorage.setItem(`${ID_MAP_KEY}:${userId}`, JSON.stringify(map)); } catch {} }

function readDeleteTombstones(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${DELETE_TOMBSTONE_KEY}:${userId}`) || '{}');
    const now = Date.now();
    const active = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      if (Number(value) > now - DELETE_TOMBSTONE_TTL) active[key] = Number(value);
    }
    if (Object.keys(active).length !== Object.keys(parsed || {}).length) {
      localStorage.setItem(`${DELETE_TOMBSTONE_KEY}:${userId}`, JSON.stringify(active));
    }
    return active;
  } catch { return {}; }
}
function markDeleted(userId, type, cloudId) {
  try {
    const active = readDeleteTombstones(userId);
    active[`${type}:${cloudId}`] = Date.now();
    localStorage.setItem(`${DELETE_TOMBSTONE_KEY}:${userId}`, JSON.stringify(active));
  } catch {}
}
function isDeleted(userId, type, cloudId) {
  return Boolean(readDeleteTombstones(userId)[`${type}:${cloudId}`]);
}

function enqueueCloudWrite(userId, operation) {
  const previous = CLOUD_WRITE_QUEUES.get(userId) || Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  CLOUD_WRITE_QUEUES.set(userId, next.finally(() => {
    if (CLOUD_WRITE_QUEUES.get(userId) === next) CLOUD_WRITE_QUEUES.delete(userId);
  }));
  return next;
}

function scopedMapKey(type, localId, scope = '') { return scope ? `${type}:${scope}:${localId}` : `${type}:${localId}`; }

function cloudId(userId, type, localId, map, scope = '', occurrence = 0, usedIds = new Set()) {
  const normalized = String(localId ?? '').trim();
  const baseKey = scopedMapKey(type, normalized, scope);
  const key = occurrence ? `${baseKey}:duplicate-${occurrence}` : baseKey;
  const mapped = String(map[key] || '');
  if (UUID_RE.test(mapped) && !usedIds.has(mapped) && !isDeleted(userId, type, mapped)) {
    usedIds.add(mapped); return mapped;
  }
  if (occurrence === 0 && scope) {
    const legacy = String(map[scopedMapKey(type, normalized)] || '');
    if (UUID_RE.test(legacy) && !usedIds.has(legacy) && !isDeleted(userId, type, legacy)) {
      map[baseKey] = legacy; usedIds.add(legacy); return legacy;
    }
  }
  if (UUID_RE.test(normalized) && !usedIds.has(normalized) && !isDeleted(userId, type, normalized)) {
    usedIds.add(normalized); return normalized;
  }
  let next = crypto.randomUUID();
  while (usedIds.has(next) || isDeleted(userId, type, next)) next = crypto.randomUUID();
  map[key] = next; usedIds.add(next); return next;
}

function resolveCloudId(userId, type, localId, scope = '') {
  const raw = String(localId ?? '').trim();
  if (UUID_RE.test(raw)) return raw;
  const map = readIdMap(userId);
  const scoped = map[scopedMapKey(type, raw, scope)];
  if (UUID_RE.test(String(scoped || ''))) return String(scoped);
  const legacy = map[scopedMapKey(type, raw)];
  return UUID_RE.test(String(legacy || '')) ? String(legacy) : null;
}

function dedupeById(rows) {
  const byId = new Map();
  for (const row of rows || []) if (row?.id) byId.set(String(row.id), row);
  return [...byId.values()];
}

function toMobileWorkspace(courses, collections, notes) {
  const collectionMap = new Map((collections || []).map((row) => [row.id, {
    id: row.id, courseId: row.course_id, title: row.name || 'New collection', description: '', notes: [],
    createdAt: Date.parse(row.created_at || '') || Date.now(), updatedAt: Date.parse(row.updated_at || '') || Date.now(),
  }]));
  const courseMap = new Map((courses || []).map((row) => [row.id, {
    id: row.id, name: row.name || 'Untitled course', description: row.description || '', color: row.color || 'sky', progress: 0, collections: [],
    createdAt: Date.parse(row.created_at || '') || Date.now(), updatedAt: Date.parse(row.updated_at || '') || Date.now(),
  }]));
  for (const collection of collectionMap.values()) courseMap.get(collection.courseId)?.collections.push(collection);
  for (const row of notes || []) {
    const course = courseMap.get(row.course_id);
    if (!course) continue;
    let collection = row.collection_id ? collectionMap.get(row.collection_id) : null;
    if (!collection) {
      collection = { id: row.collection_id || `uncategorized-${row.course_id}`, courseId: row.course_id, title: 'Uncategorized', description: '', notes: [], createdAt: Date.now(), updatedAt: Date.now() };
      collectionMap.set(collection.id, collection);
      course.collections.push(collection);
    }
    collection.notes.push({
      id: row.id, title: row.title || 'Untitled note', content: row.body || '', favorite: Boolean(row.favorite), revision: Number(row.revision || 0), sourceId: row.source_id || null,
      createdAt: Date.parse(row.created_at || '') || Date.now(), updatedAt: Date.parse(row.updated_at || '') || Date.now(),
    });
  }
  for (const course of courseMap.values()) {
    course.collections.sort((a, b) => a.createdAt - b.createdAt);
    for (const collection of course.collections) collection.notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return [...courseMap.values()].sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeCoursesForCloud(userId, courses) {
  const map = readIdMap(userId);
  const normalized = [];
  const usedCourseIds = new Set();
  const usedCollectionIds = new Set();
  const usedNoteIds = new Set();
  for (const course of Array.isArray(courses) ? courses : []) {
    const courseOccurrence = normalized.filter((item) => item.sourceLocalId === course.id).length;
    const courseId = cloudId(userId, 'course', course.id, map, '', courseOccurrence, usedCourseIds);
    const normalizedCourse = {
      id: courseId, user_id: userId, name: String(course.name || 'Untitled course').trim() || 'Untitled course',
      description: String(course.description || '').trim(), color: String(course.color || 'sky'),
      created_at: new Date(Number(course.createdAt) || Date.now()).toISOString(), updated_at: new Date().toISOString(), collections: [], sourceLocalId: course.id,
    };
    const collectionOccurrences = new Map();
    for (const collection of Array.isArray(course.collections) ? course.collections : []) {
      const collectionKey = String(collection.id ?? '').trim();
      const occurrence = collectionOccurrences.get(collectionKey) || 0;
      collectionOccurrences.set(collectionKey, occurrence + 1);
      const collectionId = cloudId(userId, 'collection', collection.id, map, String(course.id ?? courseId), occurrence, usedCollectionIds);
      const normalizedCollection = {
        id: collectionId, user_id: userId, course_id: courseId, name: String(collection.title || collection.name || 'New collection').trim() || 'New collection',
        created_at: new Date(Number(collection.createdAt) || Date.now()).toISOString(), updated_at: new Date(Number(collection.updatedAt) || Date.now()).toISOString(), notes: [],
      };
      const noteOccurrences = new Map();
      for (const note of Array.isArray(collection.notes) ? collection.notes : []) {
        const noteKey = String(note.id ?? '').trim();
        const occurrence = noteOccurrences.get(noteKey) || 0;
        noteOccurrences.set(noteKey, occurrence + 1);
        const noteId = cloudId(userId, 'note', note.id, map, `${String(course.id ?? courseId)}:${String(collection.id ?? collectionId)}`, occurrence, usedNoteIds);
        normalizedCollection.notes.push({
          id: noteId, user_id: userId, course_id: courseId, collection_id: collectionId,
          title: String(note.title || 'Untitled note').trim() || 'Untitled note', body: String(note.content || note.body || ''), favorite: Boolean(note.favorite),
          revision: Number.isFinite(Number(note.revision)) ? Number(note.revision) : 0, source_id: note.sourceId || null,
          created_at: new Date(Number(note.createdAt) || Date.now()).toISOString(), updated_at: new Date(Number(note.updatedAt) || Date.now()).toISOString(),
        });
      }
      normalizedCourse.collections.push(normalizedCollection);
    }
    normalized.push(normalizedCourse);
  }
  writeIdMap(userId, map);
  return normalized;
}

export function readLocalWorkspace() {
  try {
    const raw = localStorage.getItem(localStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed?.courses)) return parsed.courses;
    if (findAuthUserId() === 'anonymous') {
      const legacy = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
      return Array.isArray(legacy?.courses) ? legacy.courses : null;
    }
  } catch {}
  return null;
}

export function writeLocalWorkspace(courses) {
  try { localStorage.setItem(localStorageKey(), JSON.stringify({ version: 3, courses })); } catch {}
}

export async function loadCloudWorkspace(userId) {
  if (!supabase || !userId) return null;
  const [coursesResult, collectionsResult, notesResult] = await Promise.all([
    supabase.from('courses').select('id,name,description,color,created_at,updated_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('collections').select('id,course_id,name,created_at,updated_at').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('notes').select('id,course_id,collection_id,title,body,favorite,revision,source_id,created_at,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }),
  ]);
  if (coursesResult.error) throw coursesResult.error;
  if (collectionsResult.error) throw collectionsResult.error;
  if (notesResult.error) throw notesResult.error;
  const tombstones = readDeleteTombstones(userId);
  const visibleNotes = (notesResult.data || []).filter((row) => !tombstones[`note:${row.id}`]);
  const workspace = toMobileWorkspace(coursesResult.data || [], collectionsResult.data || [], visibleNotes);
  markCloudHydrated(userId);
  return workspace;
}

export function saveCloudWorkspace(userId, courses) {
  if (!supabase || !userId || !isCloudHydrated(userId)) return Promise.resolve();
  return enqueueCloudWrite(userId, async () => {
    const normalized = normalizeCoursesForCloud(userId, courses);
    const desiredCourses = dedupeById(normalized.map(({ collections, sourceLocalId, ...course }) => course)).filter((row) => !isDeleted(userId, 'course', row.id));
    const desiredCollections = dedupeById(normalized.flatMap((course) => course.collections.map(({ notes, ...collection }) => collection))).filter((row) => !isDeleted(userId, 'collection', row.id));
    const desiredNotes = dedupeById(normalized.flatMap((course) => course.collections.flatMap((collection) => collection.notes))).filter((row) => !isDeleted(userId, 'note', row.id));
    if (desiredCourses.length) { const { error } = await supabase.from('courses').upsert(desiredCourses, { onConflict: 'id' }); if (error) throw error; }
    if (desiredCollections.length) { const { error } = await supabase.from('collections').upsert(desiredCollections, { onConflict: 'id' }); if (error) throw error; }
    if (desiredNotes.length) { const { error } = await supabase.from('notes').upsert(desiredNotes, { onConflict: 'id' }); if (error) throw error; }
    // Notes are intentionally NOT snapshot-deleted. Snapshot omission is ambiguous during concurrent UI mutations.
    // A note is removed only through the explicit delete path below, which creates a tombstone first.
    await deleteRowsMissingFromSnapshot('collections', userId, desiredCollections.map((row) => row.id));
    await deleteRowsMissingFromSnapshot('courses', userId, desiredCourses.map((row) => row.id));
  });
}

async function deleteRowsMissingFromSnapshot(table, userId, desiredIds) {
  const desired = new Set(desiredIds);
  const { data, error } = await supabase.from(table).select('id').eq('user_id', userId);
  if (error) throw error;
  for (const row of data || []) {
    const id = String(row.id);
    if (desired.has(id)) continue;
    const { error: deleteError } = await supabase.from(table).delete().eq('user_id', userId).eq('id', id);
    if (deleteError) throw deleteError;
  }
}

export function deleteCloudNote(userId, noteId, courseId = '', collectionId = '') {
  if (!supabase || !userId) return Promise.resolve();
  const scope = courseId || collectionId ? `${String(courseId || '').trim()}:${String(collectionId || '').trim()}` : '';
  const cloudNoteId = resolveCloudId(userId, 'note', noteId, scope);
  if (!cloudNoteId) return Promise.resolve();
  markDeleted(userId, 'note', cloudNoteId);
  return enqueueCloudWrite(userId, async () => {
    const { error } = await supabase.from('notes').delete().eq('user_id', userId).eq('id', cloudNoteId);
    if (error) throw error;
    const { data, error: verifyError } = await supabase.from('notes').select('id').eq('user_id', userId).eq('id', cloudNoteId).limit(1);
    if (verifyError) throw verifyError;
    if (data?.length) throw new Error('Note deletion was not confirmed by Supabase.');
  });
}

export function deleteCloudCourse(userId, courseId) {
  if (!supabase || !userId) return Promise.resolve();
  const cloudCourseId = resolveCloudId(userId, 'course', courseId);
  if (!cloudCourseId) return Promise.resolve();
  markDeleted(userId, 'course', cloudCourseId);
  return enqueueCloudWrite(userId, async () => {
    const { error } = await supabase.from('courses').delete().eq('user_id', userId).eq('id', cloudCourseId);
    if (error) throw error;
    const { data, error: verifyError } = await supabase.from('courses').select('id').eq('user_id', userId).eq('id', cloudCourseId).limit(1);
    if (verifyError) throw verifyError;
    if (data?.length) throw new Error('Course deletion was not confirmed by Supabase.');
  });
}
