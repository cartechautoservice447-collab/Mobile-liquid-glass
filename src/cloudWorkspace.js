import { supabase } from './lib/supabase.js';

const LOCAL_KEY = 'mobile-liquid-glass-workspace-v1';
const ID_MAP_KEY = 'mobile-liquid-glass-cloud-id-map-v1';
const CLOUD_HYDRATED_KEY = 'mobile-liquid-glass-cloud-hydrated-v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function findAuthUserId() {
  if (!supabase) return 'anonymous';
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return String(parsed.user.id);
      if (parsed?.access_token) {
        const parts = String(parsed.access_token).split('.');
        if (parts.length >= 2) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
          const json = decodeURIComponent(
            Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
          );
          const payload = JSON.parse(json);
          if (payload?.sub) return String(payload.sub);
        }
      }
    }
  } catch {
    return 'anonymous';
  }
  return 'anonymous';
}

function localStorageKey() {
  return `${LOCAL_KEY}:${findAuthUserId()}`;
}

function hydrationKey(userId) {
  return `${CLOUD_HYDRATED_KEY}:${userId}`;
}

function markCloudHydrated(userId) {
  try { localStorage.setItem(hydrationKey(userId), '1'); } catch {}
}

function isCloudHydrated(userId) {
  try { return localStorage.getItem(hydrationKey(userId)) === '1'; } catch { return false; }
}

function readIdMap(userId) {
  try {
    const raw = localStorage.getItem(`${ID_MAP_KEY}:${userId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function writeIdMap(userId, map) {
  try { localStorage.setItem(`${ID_MAP_KEY}:${userId}`, JSON.stringify(map)); } catch {}
}

function scopedMapKey(type, localId, scope = '') {
  return scope ? `${type}:${scope}:${localId}` : `${type}:${localId}`;
}

function cloudId(userId, type, localId, map, scope = '', occurrence = 0) {
  const normalizedLocalId = String(localId ?? '').trim();
  const baseKey = scopedMapKey(type, normalizedLocalId, scope);
  const occurrenceKey = occurrence > 0 ? `${baseKey}:duplicate-${occurrence}` : baseKey;

  if (UUID_RE.test(normalizedLocalId)) return normalizedLocalId;
  if (UUID_RE.test(String(map[occurrenceKey] || ''))) return String(map[occurrenceKey]);

  if (occurrence === 0 && scope) {
    const legacyKey = scopedMapKey(type, normalizedLocalId);
    if (UUID_RE.test(String(map[legacyKey] || ''))) {
      map[baseKey] = String(map[legacyKey]);
      return String(map[legacyKey]);
    }
  }

  const next = crypto.randomUUID();
  map[occurrenceKey] = next;
  return next;
}

function resolveCloudId(userId, type, localId, scope = '') {
  if (UUID_RE.test(String(localId))) return String(localId);
  const map = readIdMap(userId);
  const normalizedLocalId = String(localId ?? '').trim();
  const scoped = map[scopedMapKey(type, normalizedLocalId, scope)];
  if (UUID_RE.test(String(scoped || ''))) return String(scoped);
  const legacy = map[scopedMapKey(type, normalizedLocalId)];
  return UUID_RE.test(String(legacy || '')) ? String(legacy) : null;
}

function dedupeById(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    if (!row?.id) continue;
    byId.set(String(row.id), row);
  }
  return Array.from(byId.values());
}

function toMobileWorkspace(courses, collections, notes) {
  const collectionMap = new Map();
  for (const row of collections) {
    collectionMap.set(row.id, {
      id: row.id, courseId: row.course_id, title: row.name || 'New collection', description: '', notes: [],
      createdAt: Date.parse(row.created_at || '') || Date.now(), updatedAt: Date.parse(row.updated_at || '') || Date.now(),
    });
  }

  const courseMap = new Map();
  for (const row of courses) {
    courseMap.set(row.id, {
      id: row.id, name: row.name || 'Untitled course', description: row.description || '', color: row.color || 'sky', progress: 0, collections: [],
      createdAt: Date.parse(row.created_at || '') || Date.now(), updatedAt: Date.parse(row.updated_at || '') || Date.now(),
    });
  }

  for (const collection of collectionMap.values()) {
    const course = courseMap.get(collection.courseId);
    if (course) course.collections.push(collection);
  }

  for (const row of notes) {
    const course = courseMap.get(row.course_id);
    if (!course) continue;
    let collection = row.collection_id ? collectionMap.get(row.collection_id) : null;
    if (!collection) {
      collection = {
        id: row.collection_id || `uncategorized-${row.course_id}`, courseId: row.course_id, title: 'Uncategorized', description: '', notes: [],
        createdAt: Date.now(), updatedAt: Date.now(),
      };
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

  return Array.from(courseMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeCoursesForCloud(userId, courses) {
  const map = readIdMap(userId);
  const normalized = [];

  for (const course of Array.isArray(courses) ? courses : []) {
    const courseOccurrence = normalized.filter((item) => item.sourceLocalId === course.id).length;
    const courseId = cloudId(userId, 'course', course.id, map, '', courseOccurrence);
    const normalizedCourse = {
      id: courseId, user_id: userId, name: String(course.name || 'Untitled course').trim() || 'Untitled course', description: String(course.description || '').trim(), color: String(course.color || 'sky'),
      created_at: new Date(Number(course.createdAt) || Date.now()).toISOString(), updated_at: new Date().toISOString(), collections: [], sourceLocalId: course.id,
    };

    const collectionOccurrences = new Map();
    for (const collection of Array.isArray(course.collections) ? course.collections : []) {
      const collectionKey = String(collection.id ?? '').trim();
      const occurrence = collectionOccurrences.get(collectionKey) || 0;
      collectionOccurrences.set(collectionKey, occurrence + 1);
      const collectionId = cloudId(userId, 'collection', collection.id, map, String(course.id ?? courseId), occurrence);
      const normalizedCollection = {
        id: collectionId, user_id: userId, course_id: courseId, name: String(collection.title || collection.name || 'New collection').trim() || 'New collection',
        created_at: new Date(Number(collection.createdAt) || Date.now()).toISOString(), updated_at: new Date(Number(collection.updatedAt) || Date.now()).toISOString(), notes: [],
      };

      const noteOccurrences = new Map();
      for (const note of Array.isArray(collection.notes) ? collection.notes : []) {
        const noteKey = String(note.id ?? '').trim();
        const noteOccurrence = noteOccurrences.get(noteKey) || 0;
        noteOccurrences.set(noteKey, noteOccurrence + 1);
        const noteId = cloudId(
          userId,
          'note',
          note.id,
          map,
          `${String(course.id ?? courseId)}:${String(collection.id ?? collectionId)}`,
          noteOccurrence,
        );
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
    const scopedKey = localStorageKey();
    const raw = localStorage.getItem(scopedKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed?.courses)) return parsed.courses;
    if (findAuthUserId() === 'anonymous') {
      const legacy = localStorage.getItem(LOCAL_KEY);
      const legacyParsed = legacy ? JSON.parse(legacy) : null;
      return Array.isArray(legacyParsed?.courses) ? legacyParsed.courses : null;
    }
    return null;
  } catch { return null; }
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
  const workspace = toMobileWorkspace(coursesResult.data || [], collectionsResult.data || [], notesResult.data || []);
  markCloudHydrated(userId);
  return workspace;
}

export async function saveCloudWorkspace(userId, courses) {
  if (!supabase || !userId || !isCloudHydrated(userId)) return;
  const normalized = normalizeCoursesForCloud(userId, courses);
  const desiredCourses = dedupeById(normalized.map(({ collections, sourceLocalId, ...course }) => course));
  const desiredCollections = dedupeById(normalized.flatMap((course) => course.collections.map(({ notes, ...collection }) => collection)));
  const desiredNotes = dedupeById(normalized.flatMap((course) => course.collections.flatMap((collection) => collection.notes)));

  if (desiredCourses.length) {
    const { error } = await supabase.from('courses').upsert(desiredCourses, { onConflict: 'id' });
    if (error) throw error;
  }
  if (desiredCollections.length) {
    const { error } = await supabase.from('collections').upsert(desiredCollections, { onConflict: 'id' });
    if (error) throw error;
  }
  if (desiredNotes.length) {
    const { error } = await supabase.from('notes').upsert(desiredNotes, { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function deleteCloudNote(userId, noteId) {
  if (!supabase || !userId) return;
  const cloudNoteId = resolveCloudId(userId, 'note', noteId);
  if (!cloudNoteId) return;
  const { error } = await supabase.from('notes').delete().eq('user_id', userId).eq('id', cloudNoteId);
  if (error) throw error;
}

export async function deleteCloudCourse(userId, courseId) {
  if (!supabase || !userId) return;
  const cloudCourseId = resolveCloudId(userId, 'course', courseId);
  if (!cloudCourseId) return;
  const { error } = await supabase.from('courses').delete().eq('user_id', userId).eq('id', cloudCourseId);
  if (error) throw error;
}
