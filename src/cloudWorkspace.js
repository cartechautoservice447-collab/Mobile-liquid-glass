import { supabase } from './lib/supabase.js';

const LOCAL_KEY = 'mobile-liquid-glass-workspace-v1';
const ID_MAP_KEY = 'mobile-liquid-glass-cloud-id-map-v1';
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

function readIdMap(userId) {
  try {
    const raw = localStorage.getItem(`${ID_MAP_KEY}:${userId}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeIdMap(userId, map) {
  try {
    localStorage.setItem(`${ID_MAP_KEY}:${userId}`, JSON.stringify(map));
  } catch {
    // Local ID mapping is best-effort; cloud data remains authoritative.
  }
}

function cloudId(userId, type, localId, map) {
  if (UUID_RE.test(String(localId))) return String(localId);
  const key = `${type}:${localId}`;
  if (UUID_RE.test(String(map[key] || ''))) return map[key];
  const next = crypto.randomUUID();
  map[key] = next;
  writeIdMap(userId, map);
  return next;
}

function toMobileWorkspace(courses, collections, notes) {
  const collectionMap = new Map();
  for (const row of collections) {
    collectionMap.set(row.id, {
      id: row.id,
      title: row.name || 'New collection',
      description: '',
      notes: [],
    });
  }

  const courseMap = new Map();
  for (const row of courses) {
    courseMap.set(row.id, {
      id: row.id,
      name: row.name || 'Untitled course',
      description: row.description || '',
      color: row.color || 'sky',
      progress: 0,
      collections: [],
      createdAt: Date.parse(row.created_at || '') || Date.now(),
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
        id: row.collection_id || `uncategorized-${row.course_id}`,
        title: 'Uncategorized',
        description: '',
        notes: [],
      };
      collectionMap.set(collection.id, collection);
      course.collections.push(collection);
    }
    collection.notes.push({
      id: row.id,
      title: row.title || 'Untitled note',
      content: row.body || '',
      favorite: Boolean(row.favorite),
      revision: Number(row.revision || 0),
      sourceId: row.source_id || null,
      createdAt: Date.parse(row.created_at || '') || Date.now(),
      updatedAt: Date.parse(row.updated_at || '') || Date.now(),
    });
  }

  for (const course of courseMap.values()) {
    course.collections.sort((a, b) => a.title.localeCompare(b.title));
    for (const collection of course.collections) {
      collection.notes.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }

  return Array.from(courseMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeCoursesForCloud(userId, courses) {
  const map = readIdMap(userId);
  const normalized = [];
  const seenCourses = new Set();
  const seenCollections = new Set();
  const seenNotes = new Set();

  for (const course of Array.isArray(courses) ? courses : []) {
    const courseId = cloudId(userId, 'course', course.id, map);
    if (seenCourses.has(courseId)) continue;
    seenCourses.add(courseId);
    const normalizedCourse = {
      id: courseId,
      user_id: userId,
      name: String(course.name || 'Untitled course').trim() || 'Untitled course',
      description: String(course.description || '').trim(),
      color: String(course.color || 'sky'),
      created_at: new Date(Number(course.createdAt) || Date.now()).toISOString(),
      updated_at: new Date().toISOString(),
      collections: [],
    };

    for (const collection of Array.isArray(course.collections) ? course.collections : []) {
      const collectionId = cloudId(userId, 'collection', collection.id, map);
      if (seenCollections.has(collectionId)) continue;
      seenCollections.add(collectionId);
      const normalizedCollection = {
        id: collectionId,
        user_id: userId,
        course_id: courseId,
        name: String(collection.title || collection.name || 'New collection').trim() || 'New collection',
        created_at: new Date(Number(collection.createdAt) || Date.now()).toISOString(),
        updated_at: new Date().toISOString(),
        notes: [],
      };

      for (const note of Array.isArray(collection.notes) ? collection.notes : []) {
        const noteId = cloudId(userId, 'note', note.id, map);
        if (seenNotes.has(noteId)) continue;
        seenNotes.add(noteId);
        normalizedCollection.notes.push({
          id: noteId,
          user_id: userId,
          course_id: courseId,
          collection_id: collectionId,
          title: String(note.title || 'Untitled note').trim() || 'Untitled note',
          body: String(note.content || note.body || ''),
          favorite: Boolean(note.favorite),
          revision: Number.isFinite(Number(note.revision)) ? Number(note.revision) : 0,
          source_id: note.sourceId || null,
          created_at: new Date(Number(note.createdAt) || Date.now()).toISOString(),
          updated_at: new Date(Number(note.updatedAt) || Date.now()).toISOString(),
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
  } catch {
    return null;
  }
}

export function writeLocalWorkspace(courses) {
  try {
    localStorage.setItem(localStorageKey(), JSON.stringify({ version: 3, courses }));
  } catch {
    // Local persistence is best-effort fallback for Skip for now mode.
  }
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

  return toMobileWorkspace(coursesResult.data || [], collectionsResult.data || [], notesResult.data || []);
}

export async function saveCloudWorkspace(userId, courses) {
  if (!supabase || !userId) return;

  const normalized = normalizeCoursesForCloud(userId, courses);
  const desiredCourses = normalized.map(({ collections, ...course }) => course);
  const desiredCollections = normalized.flatMap((course) => course.collections.map(({ notes, ...collection }) => collection));
  const desiredNotes = normalized.flatMap((course) => course.collections.flatMap((collection) => collection.notes));

  const [existingCoursesResult, existingCollectionsResult, existingNotesResult] = await Promise.all([
    supabase.from('courses').select('id').eq('user_id', userId),
    supabase.from('collections').select('id').eq('user_id', userId),
    supabase.from('notes').select('id').eq('user_id', userId),
  ]);
  if (existingCoursesResult.error) throw existingCoursesResult.error;
  if (existingCollectionsResult.error) throw existingCollectionsResult.error;
  if (existingNotesResult.error) throw existingNotesResult.error;

  const desiredCourseIds = new Set(desiredCourses.map((row) => row.id));
  const desiredCollectionIds = new Set(desiredCollections.map((row) => row.id));
  const desiredNoteIds = new Set(desiredNotes.map((row) => row.id));

  const staleNoteIds = (existingNotesResult.data || []).map((row) => row.id).filter((id) => !desiredNoteIds.has(id));
  const staleCollectionIds = (existingCollectionsResult.data || []).map((row) => row.id).filter((id) => !desiredCollectionIds.has(id));
  const staleCourseIds = (existingCoursesResult.data || []).map((row) => row.id).filter((id) => !desiredCourseIds.has(id));

  if (staleNoteIds.length) {
    const { error } = await supabase.from('notes').delete().eq('user_id', userId).in('id', staleNoteIds);
    if (error) throw error;
  }
  if (staleCollectionIds.length) {
    const { error } = await supabase.from('collections').delete().eq('user_id', userId).in('id', staleCollectionIds);
    if (error) throw error;
  }
  if (staleCourseIds.length) {
    const { error } = await supabase.from('courses').delete().eq('user_id', userId).in('id', staleCourseIds);
    if (error) throw error;
  }

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
