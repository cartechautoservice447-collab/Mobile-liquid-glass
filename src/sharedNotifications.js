import { Capacitor } from '@capacitor/core';
import { supabase } from './lib/supabase.js';

const WEB_PUSH_PUBLIC_KEY = 'BOMQ0gr879geMIiymoRz_NkMobpvHh04WX5-XYiyp54FacZnEltC8QxRVmyIGEl1OW6rdUI1-uszdH9wWbO-56g';

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function getRegistration() {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    const registration = existing ?? await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export async function registerSharedPushSubscription(userId) {
  if (!supabase || !userId) return null;
  const registration = await getRegistration();
  if (!registration) return null;

  try {
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission !== 'granted') return null;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return null;

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint, p256dh, auth },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;
    return endpoint;
  } catch {
    return null;
  }
}

export function configureSharedNotifications() {
  if (!supabase) return () => {};

  let disposed = false;
  const registerForSession = (session) => {
    if (disposed || !session?.user?.id) return;
    void registerSharedPushSubscription(session.user.id);
  };

  void supabase.auth.getSession().then(({ data }) => registerForSession(data.session));
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => registerForSession(session));

  return () => {
    disposed = true;
    listener.subscription.unsubscribe();
  };
}
