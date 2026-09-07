import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import LiquidEnvironment from './LiquidEnvironment.jsx';
import LiquidRefractionFilter from './LiquidRefractionFilter.jsx';
import './styles.css';
import './LiquidGlassSurfaceOverrides.css';
import './LiquidGlassEngine.css';
import './LiquidGlassFinalOverrides.css';
import './DashboardResponsive.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="app-root-layer">
      <LiquidEnvironment />
      <LiquidRefractionFilter />
      <App />
    </div>
  </StrictMode>,
);
