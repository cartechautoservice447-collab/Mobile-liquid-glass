import { supabase } from './lib/supabase.js';

const TOMBSTONE_KEY = 'mobile-liquid-glass-delete-tombstones-v1';

function clearExistingCloudTombstones(userId, tables) {
  try {
    const key = `${TOMBSTONE_KEY}:${userId}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    let changed = false;
    for (const [type, rows] of Object.entries(tables)) {
      for (const row of rows || []) {
        const tombstoneKey = `${type}:${row.id}`;
        if (Object.prototype.hasOwnProperty.call(parsed, tombstoneKey)) {
          delete parsed[tombstoneKey];
          changed = true;
        }
      }
    }
    if (changed) localStorage.setItem(key, JSON.stringify(parsed));
  } catch {}
}

async function repairExistingCloudRows(userId) {
  if (!supabase || !userId || userId === 'anonymous') return;
  const [coursesResult, collectionsResult, notesResult] = await Promise.all([
    supabase.from('courses').select('id').eq('user_id', userId),
    supabase.from('collections').select('id').eq('user_id', userId),
    supabase.from('notes').select('id').eq('user_id', userId),
  ]);
  if (coursesResult.error || collectionsResult.error || notesResult.error) return;
  clearExistingCloudTombstones(userId, {
    course: coursesResult.data,
    collection: collectionsResult.data,
    note: notesResult.data,
  });
}

if (supabase) {
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async (...args) => {
    const result = await originalGetSession(...args);
    const userId = result?.data?.session?.user?.id ? String(result.data.session.user.id) : 'anonymous';
    if (userId !== 'anonymous') {
      try {
        await repairExistingCloudRows(userId);
      } catch (error) {
        console.warn('Cloud tombstone repair skipped:', error?.message || error);
      }
    }
    return result;
  };
}