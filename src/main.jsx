import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { configureNativeAuth } from './nativeAuth.js';
import { configureSharedNotifications } from './sharedNotifications.js';
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
import './AndroidMobileHardening.css';
import './FeatureBackgroundUnification.css';
import './GlassSurfaceRuntimeLock.js';

void configureNativeAuth();
const disposeSharedNotifications = configureSharedNotifications();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="app-root-layer">
      <LiquidEnvironment />
      <LiquidRefractionFilter />
      <App />
    </div>
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => disposeSharedNotifications?.());
}
