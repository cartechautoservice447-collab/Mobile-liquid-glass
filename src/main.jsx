import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './workspaceHydrationRepair.js';
import './collectionTombstoneRepair.js';
import './collectionDeleteIntegration.js';
import App from './App.jsx';
import SupabaseLoginGate from './SupabaseLoginGate.jsx';
import { configureNativeAuth } from './nativeAuth.js';
import { configureSharedNotifications } from './sharedNotifications.js';
import { supabase, getMobileWebAuthRedirect } from './lib/supabase.js';
import LiquidEnvironment from './LiquidEnvironment.jsx';
import LiquidRefractionFilter from './LiquidRefractionFilter.jsx';
import './styles.css';
import './LiquidGlassSurfaceOverrides.css';
import './LiquidGlassEngine.css';
import './LiquidGlassFinalOverrides.css';
import './DashboardResponsive.css';
import './AddCourseCompactResponsive.css';
import './CourseWorkspaceSpacing.css';
import './NotesEditorResponsive.css';
import './MobileNoteEditorFrame.css';
import './MobileNoteEditorChrome.css';
import './MobileNoteEditorHorizontalFit.css';
import './MobileNoteEditorViewportFix.css';
import './NoteEditorPremiumRefinement.css';
import './AndroidMobileHardening.css';
import './FeatureBackgroundUnification.css';
import './MobileNoteCodeBlockFix.css';
import './GlassSurfaceRuntimeLock.js';

function AuthCallbackScreen({ message }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="standalone-auth-card standalone-auth-loading" role="status" aria-live="polite">
        {message}
      </section>
    </main>
  );
}

function ApplicationShell() {
  const [sharedNotificationsDispose, setSharedNotificationsDispose] = useState(null);

  useEffect(() => {
    const dispose = configureSharedNotifications();
    setSharedNotificationsDispose(() => dispose);
    return () => dispose?.();
  }, []);

  useEffect(() => () => sharedNotificationsDispose?.(), [sharedNotificationsDispose]);

  return (
    <SupabaseLoginGate>
      <div className="app-root-layer">
        <LiquidEnvironment />
        <LiquidRefractionFilter />
        <App />
      </div>
    </SupabaseLoginGate>
  );
}

async function finishWebAuthCallback() {
  if (!supabase || typeof window === 'undefined') return { handled: false, error: null };
  if (window.location.pathname !== '/auth/callback') return { handled: false, error: null };

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');
  const errorCode = url.searchParams.get('error');

  if (!code && !errorDescription && !errorCode) return { handled: false, error: null };

  if (errorDescription || errorCode) {
    return { handled: true, error: errorDescription || errorCode || 'Google sign-in failed.' };
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { handled: true, error: error.message };

    window.history.replaceState({}, document.title, '/');
    return { handled: true, error: null };
  } catch (error) {
    return {
      handled: true,
      error: error instanceof Error ? error.message : 'Unable to complete Google sign-in. Please try again.',
    };
  }
}

function mountApplication() {
  const root = document.getElementById('root');
  if (!root) return () => {};

  const dispose = configureSharedNotifications();
  createRoot(root).render(
    <StrictMode>
      <ApplicationShell />
    </StrictMode>,
  );
  return dispose;
}

async function bootstrap() {
  const root = document.getElementById('root');
  if (!root) return;

  const callbackPath = typeof window !== 'undefined' && window.location.pathname === '/auth/callback';
  if (callbackPath) {
    root.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section class="standalone-auth-card standalone-auth-loading" role="status" aria-live="polite">Signing you in securely…</section></main>';
  }

  const callback = await finishWebAuthCallback();
  if (callback.error) {
    root.innerHTML = '';
    createRoot(root).render(
      <StrictMode>
        <AuthCallbackScreen message={callback.error} />
      </StrictMode>,
    );
    return;
  }

  mountApplication();
}

void configureNativeAuth();
void bootstrap();
