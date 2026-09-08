import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from './lib/supabase.js';

const NATIVE_AUTH_REDIRECT = 'com.liquidglass.studio://auth/callback';

function isNativeAuthUrl(url) {
  return typeof url === 'string' && url.startsWith(NATIVE_AUTH_REDIRECT);
}

async function handleAuthUrl(url) {
  if (!isNativeAuthUrl(url) || !supabase) return;

  const callbackUrl = new URL(url);
  const code = callbackUrl.searchParams.get('code');
  const errorDescription = callbackUrl.searchParams.get('error_description');

  if (errorDescription) {
    localStorage.setItem('mobile-liquid-glass-auth-error', decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
    return;
  }

  if (!code) return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    localStorage.setItem('mobile-liquid-glass-auth-error', error.message);
  } else {
    localStorage.removeItem('mobile-liquid-glass-auth-error');
    localStorage.removeItem('mobile-liquid-glass-skip-auth');
  }
}

export async function configureNativeAuth() {
  if (!Capacitor.isNativePlatform() || !supabase) return undefined;

  const originalSignInWithOAuth = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = (options = {}) => originalSignInWithOAuth({
    ...options,
    options: {
      ...(options.options || {}),
      redirectTo: NATIVE_AUTH_REDIRECT,
    },
  });

  let active = true;
  const listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (active) void handleAuthUrl(url);
  });

  const launch = await CapacitorApp.getLaunchUrl();
  if (active && launch?.url) void handleAuthUrl(launch.url);

  return () => {
    active = false;
    void listener.remove();
  };
}
