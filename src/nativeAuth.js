import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from './lib/supabase.js';

const NATIVE_AUTH_REDIRECT = 'com.liquidglass.studio://auth/callback';
const AUTH_ERROR_KEY = 'mobile-liquid-glass-auth-error';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';
const handledCodes = new Set();
let bridgeConfigured = false;

function isNativeAuthUrl(url) {
  return typeof url === 'string' && url.startsWith(NATIVE_AUTH_REDIRECT);
}

async function handleAuthUrl(url) {
  if (!isNativeAuthUrl(url) || !supabase) return;

  let callbackUrl;
  try {
    callbackUrl = new URL(url);
  } catch {
    localStorage.setItem(AUTH_ERROR_KEY, 'The sign-in callback URL was invalid. Please try again.');
    return;
  }

  const code = callbackUrl.searchParams.get('code');
  const errorDescription = callbackUrl.searchParams.get('error_description');
  const errorCode = callbackUrl.searchParams.get('error');

  if (errorDescription || errorCode) {
    const message = errorDescription || errorCode || 'Google sign-in failed.';
    localStorage.setItem(AUTH_ERROR_KEY, message);
    return;
  }

  if (!code || handledCodes.has(code)) return;
  handledCodes.add(code);

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      localStorage.setItem(AUTH_ERROR_KEY, error.message);
      return;
    }

    localStorage.removeItem(AUTH_ERROR_KEY);
    localStorage.removeItem(SKIP_AUTH_KEY);
  } catch (error) {
    localStorage.setItem(AUTH_ERROR_KEY, error instanceof Error ? error.message : 'Unable to complete sign-in. Please try again.');
  }
}

export async function configureNativeAuth() {
  if (!Capacitor.isNativePlatform() || !supabase || bridgeConfigured) return undefined;
  bridgeConfigured = true;

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

  try {
    const launch = await CapacitorApp.getLaunchUrl();
    if (active && launch?.url) void handleAuthUrl(launch.url);
  } catch (error) {
    localStorage.setItem(AUTH_ERROR_KEY, error instanceof Error ? error.message : 'Unable to read the Android sign-in callback.');
  }

  return () => {
    active = false;
    bridgeConfigured = false;
    void listener.remove();
  };
}
