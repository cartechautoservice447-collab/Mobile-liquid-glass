import { supabase } from './lib/supabase.js';

const TOMBSTONE_KEY = 'mobile-liquid-glass-delete-tombstones-v1';

function clearExistingCollectionTombstones(userId, rows) {
  try {
    const key = `${TOMBSTONE_KEY}:${userId}`;
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    let changed = false;
    for (const row of rows || []) {
      const tombstoneKey = `collection:${row.id}`;
      if (Object.prototype.hasOwnProperty.call(parsed, tombstoneKey)) {
        delete parsed[tombstoneKey];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(key, JSON.stringify(parsed));
  } catch {}
}

async function repairExistingCloudCollections(userId) {
  if (!supabase || !userId || userId === 'anonymous') return;
  const { data, error } = await supabase.from('collections').select('id').eq('user_id', userId);
  if (error) return;
  clearExistingCollectionTombstones(userId, data);
}

if (supabase) {
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async (...args) => {
    const result = await originalGetSession(...args);
    const userId = result?.data?.session?.user?.id ? String(result.data.session.user.id) : 'anonymous';
    if (userId !== 'anonymous') {
      try {
        await repairExistingCloudCollections(userId);
      } catch (error) {
        console.warn('Collection tombstone repair skipped:', error?.message || error);
      }
    }
    return result;
  };
}
