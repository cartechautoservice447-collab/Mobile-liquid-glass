import { supabase } from './lib/supabase.js';

const LOCAL_KEY = 'mobile-liquid-glass-workspace-v1';

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
    localStorage.setItem(localStorageKey(), JSON.stringify({ version: 2, courses }));
  } catch {
    // Local persistence is best-effort fallback for Skip for now mode.
  }
}

export async function loadCloudWorkspace(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('user_workspace_state')
    .select('courses')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.courses) ? data.courses : null;
}

export async function saveCloudWorkspace(userId, courses) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('user_workspace_state')
    .upsert({ user_id: userId, courses, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
