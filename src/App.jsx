import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';

const ICON = '/icon.svg';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';

export default function App() {
  const [session, setSession] = useState(null);
  const [skippedAuth, setSkippedAuth] = useState(() => {
    try {
      return window.localStorage.getItem(SKIP_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Signed in successfully.');
    if (!error) {
      try {
        window.localStorage.removeItem(SKIP_AUTH_KEY);
      } catch {
        // Ignore unavailable storage.
      }
      setSkippedAuth(false);
    }
    setBusy(false);
  };

  const signUp = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled.');
    setBusy(false);
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  };

  const skipForNow = () => {
    try {
      window.localStorage.setItem(SKIP_AUTH_KEY, 'true');
    } catch {
      // Continue for this session if storage is unavailable.
    }
    setSkippedAuth(true);
  };

  const returnToLogin = () => {
    try {
      window.localStorage.removeItem(SKIP_AUTH_KEY);
    } catch {
      // Ignore unavailable storage.
    }
    setSkippedAuth(false);
    setMessage('');
  };

  if (loading) return <main className="screen"><div className="glass-card"><p>Loading your workspace…</p></div></main>;

  if (session || skippedAuth) {
    return (
      <main className="screen">
        <section className="glass-card welcome-card">
          <img className="app-icon" src={ICON} alt="Liquid Glass Studio" />
          <span className="eyebrow">Liquid Glass Studio</span>
          <h1>Mobile foundation</h1>
          <p>{session ? 'You are signed in. The mobile feature layers will be added one at a time.' : 'You are continuing without signing in for now. You can sign in later.'}</p>
          {session ? (
            <button className="secondary-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
          ) : (
            <button className="secondary-button" onClick={returnToLogin}>Sign in</button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="screen">
      <section className="glass-card auth-card">
        <div className="brand">
          <img className="app-icon" src={ICON} alt="Liquid Glass Studio" />
          <div>
            <span className="eyebrow">Liquid Glass Studio</span>
            <h1>Welcome back</h1>
          </div>
        </div>

        <p className="subtitle">Sign in to your mobile workspace.</p>

        {!isSupabaseConfigured && (
          <div className="notice">Supabase is not configured yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your project values locally.</div>
        )}

        <form onSubmit={signIn}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          <button className="primary-button" disabled={busy || !supabase}>{busy ? 'Working…' : 'Sign in'}</button>
        </form>

        <button className="google-button" onClick={signInWithGoogle} disabled={busy || !supabase}>Continue with Google</button>
        <button className="link-button" onClick={signUp} disabled={busy || !supabase}>Create an account</button>
        <button className="link-button skip-button" onClick={skipForNow} disabled={busy}>Skip for now</button>
        {message && <p className="message" role="status">{message}</p>}
      </section>
    </main>
  );
}
