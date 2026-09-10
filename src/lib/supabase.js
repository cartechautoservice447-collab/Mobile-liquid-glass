import { createClient } from '@supabase/supabase-js';

// Mobile-liquid-glass intentionally uses the exact same Supabase backend as
// fluid-glass-studio. Do not override this with a second project at runtime.
export const SUPABASE_URL = 'https://asgwpmsuutigtvaxuxmr.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fi3mpoY8ZrymYbnxdpREYw_hnUmTYxG';

export const MOBILE_WEB_AUTH_ORIGIN = 'https://mobile-liquid-glass.vercel.app';
export const MOBILE_WEB_AUTH_REDIRECT = `${MOBILE_WEB_AUTH_ORIGIN}/auth/callback`;
export const MOBILE_NATIVE_AUTH_REDIRECT = 'com.liquidglass.studio://auth/callback';

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

/**
 * Returns the final web callback owned by Mobile-liquid-glass.
 * Local development may use its local callback; production is always the
 * Mobile app's production host so it can never fall back to Fluid Glass Studio's Site URL.
 */
export function getMobileWebAuthRedirect() {
  if (typeof window === 'undefined') return MOBILE_WEB_AUTH_REDIRECT;
  const origin = window.location.origin;
  const isLocal = /^(https?:\/\/localhost(?::\d+)?|https?:\/\/127\.0\.0\.1(?::\d+)?)$/i.test(origin);
  return isLocal ? `${origin}/auth/callback` : MOBILE_WEB_AUTH_REDIRECT;
}

// App.jsx currently calls signInWithOAuth directly. Enforce the Mobile-owned
// redirect at the shared client boundary so no caller can accidentally reuse
// Fluid Glass Studio's Site URL/default redirect.
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

if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    import('../collectionDeleteFeature.js').catch(() => {});
    import('../collectionDeletePolish.js').catch(() => {});
  });
}
