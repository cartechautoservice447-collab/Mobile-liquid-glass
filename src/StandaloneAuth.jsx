import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import './StandaloneAuth.css';

const USERS_KEY = 'mobile-liquid-glass-local-users-v1';
const SESSION_KEY = 'mobile-liquid-glass-local-session-v1';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const hashPassword = async (value) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, '0')).join('');
};

const makeUserId = (email) => `local-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

if (!window.__mobileLiquidGlassStandaloneAuthPatched) {
  const nativeRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = (key) => {
    nativeRemoveItem(key);
    if (key === SKIP_AUTH_KEY) {
      nativeRemoveItem(SESSION_KEY);
      window.dispatchEvent(new CustomEvent('standalone-auth-changed'));
    }
  };
  window.__mobileLiquidGlassStandaloneAuthPatched = true;
}

export const getStandaloneSession = () => readJson(SESSION_KEY, null);

export const clearStandaloneSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SKIP_AUTH_KEY);
  window.dispatchEvent(new CustomEvent('standalone-auth-changed'));
};

function AuthForm({ mode, email, setEmail, password, setPassword, name, setName, busy, message, onSubmit, onSwitch, onGoogle }) {
  const [showPassword, setShowPassword] = useState(false);
  const creating = mode === 'signup';

  return (
    <section className="standalone-auth-card">
      <div className="standalone-auth-glow standalone-auth-glow-one" />
      <div className="standalone-auth-glow standalone-auth-glow-two" />

      <div className="standalone-auth-brand">
        <div className="standalone-auth-icon-wrap">
          <img src="/icon.svg" alt="Mobile Liquid Glass" className="standalone-auth-icon" />
          <span className="standalone-auth-icon-ring" />
        </div>
        <div>
          <span className="standalone-auth-eyebrow">Mobile Liquid Glass</span>
          <h1>{creating ? 'Create your space' : 'Welcome back'}</h1>
        </div>
      </div>

      <p className="standalone-auth-subtitle">
        {creating ? 'Create a private study workspace on this device.' : 'Sign in to continue to your study workspace.'}
      </p>

      <form className="standalone-auth-form" onSubmit={onSubmit}>
        {creating && (
          <label className="standalone-auth-field">
            <span>Name</span>
            <div className="standalone-auth-input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required />
            </div>
          </label>
        )}

        <label className="standalone-auth-field">
          <span>Email</span>
          <div className="standalone-auth-input-wrap">
            <Mail size={17} aria-hidden="true" />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </div>
        </label>

        <label className="standalone-auth-field">
          <span>Password</span>
          <div className="standalone-auth-input-wrap">
            <LockKeyhole size={17} aria-hidden="true" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={creating ? 'new-password' : 'current-password'} minLength={8} required />
            <button type="button" className="standalone-auth-icon-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {message && <div className="standalone-auth-message" role="status">{message}</div>}

        <button className="standalone-auth-primary" type="submit" disabled={busy}>
          <Sparkles size={17} />
          {busy ? 'Working…' : creating ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="standalone-auth-divider"><span>or</span></div>

      <button className="standalone-auth-secondary" type="button" onClick={onGoogle} disabled={busy}>
        <span className="standalone-auth-google-mark">G</span>
        Continue with Google
      </button>

      <div className="standalone-auth-switch">
        <span>{creating ? 'Already have an account?' : 'New to Mobile Liquid Glass?'}</span>
        <button type="button" className="standalone-auth-link" onClick={onSwitch} disabled={busy}>
          {creating ? 'Sign in' : 'Create account'}
        </button>
      </div>

      <div className="standalone-auth-footnote">
        <KeyRound size={14} />
        This new login is independent from Supabase Auth.
      </div>
    </section>
  );
}

export default function StandaloneAuth({ children }) {
  const [session, setSession] = useState(() => getStandaloneSession());
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => setSession(getStandaloneSession());
    window.addEventListener('standalone-auth-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('standalone-auth-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const users = readJson(USERS_KEY, {});
      const passwordHash = await hashPassword(password);

      if (mode === 'signup') {
        if (users[normalizedEmail]) {
          setMessage('An account with this email already exists.');
          return;
        }
        const user = { id: makeUserId(normalizedEmail), name: name.trim() || normalizedEmail.split('@')[0], email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() };
        localStorage.setItem(USERS_KEY, JSON.stringify({ ...users, [normalizedEmail]: user }));
        const nextSession = { user: { id: user.id, name: user.name, email: user.email }, createdAt: Date.now() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        localStorage.setItem(SKIP_AUTH_KEY, 'true');
        setSession(nextSession);
        window.dispatchEvent(new CustomEvent('standalone-auth-changed'));
        return;
      }

      const user = users[normalizedEmail];
      if (!user || user.passwordHash !== passwordHash) {
        setMessage('Email or password is incorrect.');
        return;
      }

      const nextSession = { user: { id: user.id, name: user.name, email: user.email }, createdAt: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      localStorage.setItem(SKIP_AUTH_KEY, 'true');
      setSession(nextSession);
      window.dispatchEvent(new CustomEvent('standalone-auth-changed'));
    } catch (error) {
      setMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const google = () => setMessage('Google sign-in is reserved for the new external provider connection; no Supabase OAuth is used here.');

  if (session) return children;

  return (
    <main className="standalone-auth-screen">
      <div className="standalone-auth-backdrop" />
      <div className="standalone-auth-orb standalone-auth-orb-left" />
      <div className="standalone-auth-orb standalone-auth-orb-right" />
      <AuthForm
        mode={mode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        name={name}
        setName={setName}
        busy={busy}
        message={message}
        onSubmit={submit}
        onSwitch={() => { setMessage(''); setMode((value) => value === 'signin' ? 'signup' : 'signin'); }}
        onGoogle={google}
      />
    </main>
  );
}
