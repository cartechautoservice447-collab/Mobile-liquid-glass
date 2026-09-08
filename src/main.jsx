import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { configureNativeAuth } from './nativeAuth.js';
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
import './GlassSurfaceRuntimeLock.js';

void configureNativeAuth();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="app-root-layer">
      <LiquidEnvironment />
      <LiquidRefractionFilter />
      <App />
    </div>
  </StrictMode>,
);
