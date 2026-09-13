import { createClient } from '@supabase/supabase-js';

// Exact same Supabase project and public publishable key used by fluid-glass-studio.
// Prefer Vercel environment variables, but keep the same public fallbacks as the
// reference project so hosted builds remain connected when VITE_* is not injected.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://asgwpmsuutigtvaxuxmr.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fi3mpoY8ZrymYbnxdpREYw_hnUmTYxG';

export const MOBILE_WEB_AUTH_ORIGIN = 'https://mobile-liquid-glass.vercel.app';
export const MOBILE_WEB_AUTH_REDIRECT = `${MOBILE_WEB_AUTH_ORIGIN}/auth/callback`;
export const MOBILE_NATIVE_AUTH_REDIRECT = 'com.liquidglass.studio://auth/callback';

function isNativeCapacitorApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (supabaseKey.startsWith('sb_publishable_') && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export function getMobileWebAuthRedirect() {
  if (typeof window === 'undefined') return MOBILE_WEB_AUTH_REDIRECT;
  if (isNativeCapacitorApp()) return MOBILE_NATIVE_AUTH_REDIRECT;

  // Keep OAuth on the exact browser origin where it started. This is important
  // for Vercel preview deployments because the PKCE verifier is stored on the
  // browser origin and must survive the Google -> callback round trip.
  return `${window.location.origin}/auth/callback`;
}

if (supabase) {
  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (options = {}) => originalSignInWithOAuth({
    ...options,
    options: {
      ...(options.options || {}),
      redirectTo: getMobileWebAuthRedirect(),
    },
  });
}
