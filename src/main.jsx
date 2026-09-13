import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './workspaceHydrationRepair.js';
import './collectionTombstoneRepair.js';
import './collectionDeleteIntegration.js';
import App from './App.jsx';
import StandaloneAuth from './StandaloneAuth.jsx';
import { configureSharedNotifications } from './sharedNotifications.js';
import { supabase } from './lib/supabase.js';
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

const disableSupabaseAuthForStandaloneLogin = () => {
  if (!supabase?.auth) return;

  supabase.auth.getSession = async () => ({ data: { session: null }, error: null });
  supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
  supabase.auth.signInWithPassword = async () => ({ data: { user: null, session: null }, error: new Error('Supabase Auth is disabled. Use the new standalone login.') });
  supabase.auth.signUp = async () => ({ data: { user: null, session: null }, error: new Error('Supabase Auth is disabled. Use the new standalone login.') });
  supabase.auth.signInWithOAuth = async () => ({ data: { provider: null, url: null }, error: new Error('Supabase OAuth is disabled. Use the new standalone login.') });
  supabase.auth.exchangeCodeForSession = async () => ({ data: { session: null, user: null }, error: new Error('Supabase Auth is disabled. Use the new standalone login.') });
  supabase.auth.signOut = async () => ({ error: null });
};

disableSupabaseAuthForStandaloneLogin();
const disposeSharedNotifications = configureSharedNotifications();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="app-root-layer">
      <LiquidEnvironment />
      <LiquidRefractionFilter />
      <StandaloneAuth>
        <App />
      </StandaloneAuth>
    </div>
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => disposeSharedNotifications?.());
}
