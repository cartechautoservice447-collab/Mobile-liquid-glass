import { createClient } from '@supabase/supabase-js';

// Mobile-liquid-glass intentionally uses the exact same Supabase backend as
// fluid-glass-studio. Do not override this with a second project at runtime.
export const SUPABASE_URL = 'https://asgwpmsuutigtvaxuxmr.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fi3mpoY8ZrymYbnxdpREYw_hnUmTYxG';

// Google OAuth must return to Mobile-liquid-glass, not the Fluid Glass Studio web app.
// Native Android is overridden separately by nativeAuth.js with the custom app scheme.
export const MOBILE_WEB_AUTH_ORIGIN = 'https://mobile-liquid-glass.vercel.app';
export const MOBILE_WEB_AUTH_REDIRECT = `${MOBILE_WEB_AUTH_ORIGIN}/auth/callback`;

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
        detectSessionInUrl: true,
      },
    })
  : null;

if (supabase) {
  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (options = {}) => originalSignInWithOAuth({
    ...options,
    options: {
      ...(options.options || {}),
      // Web: always return to Mobile-liquid-glass after Google account selection.
      redirectTo: MOBILE_WEB_AUTH_REDIRECT,
    },
  });
}
