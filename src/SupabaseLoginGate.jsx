import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import './StandaloneAuth.css';
import { supabase, getMobileWebAuthRedirect } from './lib/supabase.js';

const LEGACY_KEYS = ['mobile-liquid-glass-local-users-v1', 'mobile-liquid-glass-local-session-v1', 'mobile-liquid-glass-skip-auth'];
const clearLegacy = () => LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));

function AuthCard({ mode, email, setEmail, password, setPassword, name, setName, busy, message, submit, switchMode, google }) {
  const [showPassword, setShowPassword] = useState(false);
  const creating = mode === 'signup';
  return (
    <section className="standalone-auth-card">
      <div className="standalone-auth-glow standalone-auth-glow-one" />
      <div className="standalone-auth-glow standalone-auth-glow-two" />
      <div className="standalone-auth-brand">
        <div className="standalone-auth-icon-wrap"><img src="/icon.svg" alt="Mobile Liquid Glass" className="standalone-auth-icon" /><span className="standalone-auth-icon-ring" /></div>
        <div><span className="standalone-auth-eyebrow">Mobile Liquid Glass</span><h1>{creating ? 'Create your space' : 'Welcome back'}</h1></div>
      </div>
      <p className="standalone-auth-subtitle">{creating ? 'Create your secure study workspace.' : 'Sign in to continue to your study workspace.'}</p>
      <form className="standalone-auth-form" onSubmit={submit}>
        {creating && <label className="standalone-auth-field"><span>Name</span><div className="standalone-auth-input-wrap"><UserRound size={17} aria-hidden="true" /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required /></div></label>}
        <label className="standalone-auth-field"><span>Email</span><div className="standalone-auth-input-wrap"><Mail size={17} aria-hidden="true" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
        <label className="standalone-auth-field"><span>Password</span><div className="standalone-auth-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={creating ? 'new-password' : 'current-password'} minLength={8} required /><button type="button" className="standalone-auth-icon-button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        {message && <div className="standalone-auth-message" role="status">{message}</div>}
        <button className="standalone-auth-primary" type="submit" disabled={busy}><Sparkles size={17} />{busy ? 'Working…' : creating ? 'Create account' : 'Sign in'}</button>
      </form>
      <div className="standalone-auth-divider"><span>or</span></div>
      <button className="standalone-auth-secondary" type="button" onClick={google} disabled={busy}><span className="standalone-auth-google-mark">G</span>Continue with Google</button>
      <div className="standalone-auth-switch"><span>{creating ? 'Already have an account?' : 'New to Mobile Liquid Glass?'}</span><button type="button" className="standalone-auth-link" onClick={switchMode} disabled={busy}>{creating ? 'Sign in' : 'Create account'}</button></div>
      <div className="standalone-auth-footnote"><KeyRound size={14} />Secure authentication is handled by your dedicated Supabase project.</div>
    </section>
  );
}

export default function SupabaseLoginGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    clearLegacy();
    if (!supabase) { setMessage('Supabase is not configured for this deployment.'); setReady(true); return undefined; }
    let active = true;
    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) setMessage(error.message);
      setSession(data?.session || null);
      setReady(true);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      clearLegacy();
      setSession(nextSession || null);
      if (nextSession) setMessage('');
    });
    void initialize();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!supabase) { setMessage('Supabase is not configured for this deployment.'); return; }
    setBusy(true); setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { display_name: name.trim() || normalizedEmail.split('@')[0] }, emailRedirectTo: getMobileWebAuthRedirect() } });
        if (error) throw error;
        if (data.session) setSession(data.session);
        setMessage(data.session ? 'Account created successfully.' : 'Account created. Check your email to confirm your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        setPassword('');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  };

  const google = async () => {
    if (!supabase) { setMessage('Supabase is not configured for this deployment.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getMobileWebAuthRedirect(), queryParams: { prompt: 'select_account' } } });
    if (error) { setMessage(error.message); setBusy(false); }
  };

  if (!ready) return <main className="standalone-auth-screen"><div className="standalone-auth-backdrop" /><div className="standalone-auth-orb standalone-auth-orb-left" /><div className="standalone-auth-orb standalone-auth-orb-right" /><section className="standalone-auth-card standalone-auth-loading">Loading secure sign-in…</section></main>;
  if (session) return children;
  return <main className="standalone-auth-screen"><div className="standalone-auth-backdrop" /><div className="standalone-auth-orb standalone-auth-orb-left" /><div className="standalone-auth-orb standalone-auth-orb-right" /><AuthCard mode={mode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} name={name} setName={setName} busy={busy} message={message} submit={submit} switchMode={() => { setMessage(''); setMode((v) => v === 'signin' ? 'signup' : 'signin'); }} google={google} /></main>;
}
