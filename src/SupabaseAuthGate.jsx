import { useEffect, useState } from 'react';
import StandaloneAuth from './StandaloneAuth.jsx';
import { supabase } from './lib/supabase.js';

const LEGACY_KEYS = [
  'mobile-liquid-glass-local-users-v1',
  'mobile-liquid-glass-local-session-v1',
  'mobile-liquid-glass-skip-auth',
];

export default function SupabaseAuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    if (!supabase) {
      setReady(true);
      return undefined;
    }

    let active = true;
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data?.session || null);
      setReady(true);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession || null);
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    });

    void initialize();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <div />;
  if (session) return children;
  return <StandaloneAuth>{children}</StandaloneAuth>;
}
