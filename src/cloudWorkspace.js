import { supabase } from './lib/supabase.js';

const LOCAL_KEY = 'mobile-liquid-glass-workspace-v1';

export function readLocalWorkspace() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.courses) ? parsed.courses : null;
  } catch {
    return null;
  }
}

export function writeLocalWorkspace(courses) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ version: 1, courses }));
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
