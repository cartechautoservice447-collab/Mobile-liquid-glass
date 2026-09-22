import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Compass,
  Image as ImageIcon,
  Layers,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Sliders,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { BACKGROUND_PRESETS } from './backgroundPresets.js';
import {
  ALL_TEMPLATES,
  DEEP_BLACK_ORBS_URL,
  SHOWCASE_TEMPLATES,
  STUDIO_WHITE_ORBS_URL,
} from './data/backgroundTemplates.js';
import './EngineSettingsModal.css';

const CLARITY_OPTIONS = [
  ['default', 'Default'],
  ['smooth', 'Smooth'],
  ['medium', 'Medium'],
  ['punchy', 'Punchy'],
];

const GLASS_THEME_OPTIONS = [
  ['type-1', 'Type 1', 'Dashboard glass'],
  ['type-2', 'Type 2', 'Course card glass'],
  ['type-3', 'Type 3', 'Progress box glass'],
  ['type-4', 'Type 4', 'Saved notes glass'],
];

const OPTICAL_PRESETS = [
  {
    id: 'apple-vision',
    name: 'Apple Vision Liquid',
    badge: 'Balanced Default',
    desc: 'Deep refraction, smooth dispersion, and balanced specular glint.',
    params: {
      webglIOR: 3.0,
      webglDispersion: 1.9,
      webglBlur: 1.5,
      webglSpecular: 0.55,
      webglThickness: 50,
      webglBezel: 55,
      webglShadow: 0.5,
      webglTint: 0.08,
    },
  },
  {
    id: 'crystal-prism',
    name: 'Prismatic Crystal',
    badge: 'Max Dispersion',
    desc: 'High chromatic dispersion splitting with crystal sharp optics.',
    params: {
      webglIOR: 2.4,
      webglDispersion: 3.2,
      webglBlur: 0.2,
      webglSpecular: 0.8,
      webglThickness: 40,
      webglBezel: 60,
      webglShadow: 0.35,
      webglTint: 0.04,
    },
  },
  {
    id: 'frosted-velvet',
    name: 'Frosted Velvet',
    badge: 'Soft Diffusion',
    desc: 'Dense Poisson disk blur with gentle refractive caustics.',
    params: {
      webglIOR: 1.8,
      webglDispersion: 0.8,
      webglBlur: 3.5,
      webglSpecular: 0.4,
      webglThickness: 65,
      webglBezel: 45,
      webglShadow: 0.65,
      webglTint: 0.12,
    },
  },
  {
    id: 'minimal-lens',
    name: 'Ultra Minimal Lens',
    badge: 'Subtle Glass',
    desc: 'Subtle light bending with minimal blur for maximum legibility.',
    params: {
      webglIOR: 1.4,
      webglDispersion: 0.3,
      webglBlur: 0.8,
      webglSpecular: 0.3,
      webglThickness: 30,
      webglBezel: 35,
      webglShadow: 0.2,
      webglTint: 0.02,
    },
  },
];

const SCENE_CATEGORIES = [
  { id: 'all', label: 'All Scenes' },
  { id: '3d', label: '3D Orbs' },
  { id: 'showcase', label: 'Optics Showcase' },
  { id: 'minimal', label: 'Minimal Studio' },
];

function Slider({ label, value, min, max, step = 1, display, onChange }) {
  return (
    <label className="engine-slider">
      <span className="engine-setting-line">
        <span>{label}</span>
        <strong>{display ?? value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      />
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="engine-toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="engine-switch" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

export default function EngineSettingsModal({ settings, setSetting, reset, close }) {
  const [sceneCategory, setSceneCategory] = useState('all');
  const [customBgInput, setCustomBgInput] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  const filteredTemplates = useMemo(() => {
    if (sceneCategory === 'all') return ALL_TEMPLATES;
    if (sceneCategory === '3d')
      return ALL_TEMPLATES.filter(
        (t) => t.url === DEEP_BLACK_ORBS_URL || t.url === STUDIO_WHITE_ORBS_URL
      );
    if (sceneCategory === 'showcase')
      return ALL_TEMPLATES.filter((t) => t.category === 'showcase');
    if (sceneCategory === 'minimal')
      return ALL_TEMPLATES.filter((t) => t.category === 'white' || t.category === 'dark');
    return ALL_TEMPLATES;
  }, [sceneCategory]);

  const applyPreset = (preset) => {
    Object.entries(preset.params).forEach(([key, val]) => {
      setSetting(key, val);
    });
  };

  const handleApplyCustomBg = (e) => {
    e.preventDefault();
    const url = customBgInput.trim();
    if (url) {
      setSetting('webglBg', url);
      setCustomBgInput('');
    }
  };

  return (
    <div className="modal-backdrop engine-settings-backdrop" onClick={close}>
      <section
        className="engine-settings-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-settings-title"
      >
        <header className="engine-settings-header">
          <div className="engine-settings-title-wrap">
            <span className="engine-settings-icon">
              <Settings2 size={20} />
            </span>
            <div>
              <span className="eyebrow">Physical Shader Engine</span>
              <h2 id="engine-settings-title">Engine & WebGL Settings</h2>
              <p>Full real-time physical optics, 3D scenes, Snell's law refraction, and appearance tuning.</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Close settings">
            ×
          </button>
        </header>

        <div className="engine-settings-scroll">
          {/* Engine Selector */}
          <section className="engine-settings-section engine-settings-engine-mode-section">
            <div className="engine-section-heading">
              <span>Liquid Glass Engine</span>
              <small>Switch between the exact WebGL physics shader from new-mobile-updated and the CSS/SVG engine.</small>
            </div>
            <div className="engine-switch-container" role="group" aria-label="Liquid Glass Engine">
              <button
                type="button"
                className={`engine-switch-btn ${settings.glassEngine === 'webgl' ? 'active' : ''}`}
                onClick={() => setSetting('glassEngine', 'webgl')}
                aria-pressed={settings.glassEngine === 'webgl'}
              >
                <span className="engine-switch-title">Exact WebGL Liquid Glass</span>
                <span className="engine-switch-badge">Snell's Law, 3D Orbs & Dispersion</span>
              </button>
              <button
                type="button"
                className={`engine-switch-btn ${settings.glassEngine === 'current' ? 'active' : ''}`}
                onClick={() => setSetting('glassEngine', 'current')}
                aria-pressed={settings.glassEngine === 'current'}
              >
                <span className="engine-switch-title">Current Liquid Glass</span>
                <span className="engine-switch-badge">CSS Backdrop & SVG Filter</span>
              </button>
            </div>
          </section>

          {settings.glassEngine === 'webgl' && (
            <>
              {/* WebGL Optics Presets */}
              <section className="engine-settings-section">
                <div className="engine-section-heading">
                  <span>WebGL Optical Presets</span>
                  <small>Quickly switch between signature physical glass calibrations.</small>
                </div>
                <div className="webgl-preset-grid">
                  {OPTICAL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="webgl-preset-card"
                      onClick={() => applyPreset(preset)}
                    >
                      <div className="webgl-preset-header">
                        <strong>{preset.name}</strong>
                        <span className="webgl-preset-badge">{preset.badge}</span>
                      </div>
                      <p className="webgl-preset-desc">{preset.desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* WebGL Scenes & Backdrops */}
              <section className="engine-settings-section">
                <div className="engine-section-heading">
                  <span>WebGL 3D Scenes & Backgrounds</span>
                  <small>Select the optical backdrop for physical refraction and 3D animated orbs.</small>
                </div>

                <div className="webgl-category-tabs">
                  {SCENE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`webgl-cat-btn ${sceneCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSceneCategory(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="webgl-template-grid" role="group" aria-label="WebGL Scenes">
                  {filteredTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      className={`webgl-template-item ${settings.webglBg === tmpl.url ? 'active' : ''}`}
                      onClick={() => setSetting('webglBg', tmpl.url)}
                      aria-pressed={settings.webglBg === tmpl.url}
                    >
                      <img src={tmpl.thumb} alt={tmpl.label} className="webgl-template-thumb" />
                      <div className="webgl-template-info">
                        <span className="webgl-template-name">{tmpl.label}</span>
                        {tmpl.badge && <span className="webgl-template-badge">{tmpl.badge}</span>}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Scene Image URL */}
                <form className="webgl-custom-bg-form" onSubmit={handleApplyCustomBg}>
                  <input
                    type="url"
                    placeholder="Or enter custom image URL (https://...)"
                    value={customBgInput}
                    onChange={(e) => setCustomBgInput(e.target.value)}
                    className="webgl-custom-bg-input"
                  />
                  <button type="submit" className="webgl-custom-bg-btn" disabled={!customBgInput.trim()}>
                    Apply URL
                  </button>
                </form>
              </section>

              {/* Physical WebGL Optics Parameters */}
              <section className="engine-settings-section">
                <div className="engine-section-heading">
                  <span>Physical WebGL Optics Customization</span>
                  <small>Tune real-time Snell's law refraction, Poisson disk blur, chromatic dispersion, and caustics.</small>
                </div>
                <Slider
                  label="Refraction Index (IOR)"
                  value={settings.webglIOR}
                  min={1.0}
                  max={5.0}
                  step={0.05}
                  display={settings.webglIOR.toFixed(2)}
                  onChange={(val) => setSetting('webglIOR', val)}
                />
                <Slider
                  label="Chromatic Dispersion"
                  value={settings.webglDispersion}
                  min={0.0}
                  max={4.0}
                  step={0.05}
                  display={`${settings.webglDispersion.toFixed(2)}x`}
                  onChange={(val) => setSetting('webglDispersion', val)}
                />
                <Slider
                  label="Poisson Disk Blur"
                  value={settings.webglBlur}
                  min={0.0}
                  max={5.0}
                  step={0.1}
                  display={`${settings.webglBlur.toFixed(1)} px`}
                  onChange={(val) => setSetting('webglBlur', val)}
                />
                <Slider
                  label="Specular Glint & Sheen"
                  value={settings.webglSpecular}
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  display={`${Math.round(settings.webglSpecular * 100)}%`}
                  onChange={(val) => setSetting('webglSpecular', val)}
                />
                <Slider
                  label="Glass Slab Thickness"
                  value={settings.webglThickness}
                  min={10}
                  max={100}
                  step={1}
                  display={`${settings.webglThickness} px`}
                  onChange={(val) => setSetting('webglThickness', val)}
                />
                <Slider
                  label="Bezel Curvature"
                  value={settings.webglBezel}
                  min={10}
                  max={90}
                  step={1}
                  display={`${settings.webglBezel} px`}
                  onChange={(val) => setSetting('webglBezel', val)}
                />
                <Slider
                  label="Contact Shadow Depth"
                  value={settings.webglShadow}
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  display={`${Math.round(settings.webglShadow * 100)}%`}
                  onChange={(val) => setSetting('webglShadow', val)}
                />
                <Slider
                  label="Liquid Glass Tint"
                  value={settings.webglTint}
                  min={0.0}
                  max={0.5}
                  step={0.01}
                  display={`${Math.round(settings.webglTint * 100)}%`}
                  onChange={(val) => setSetting('webglTint', val)}
                />
              </section>
            </>
          )}

          {/* Performance */}
          <section className="engine-settings-section engine-settings-performance-section">
            <div className="engine-section-heading">
              <span>Rendering Performance</span>
              <small>High mode renders at standard 60fps; Ultra renders at full 2x Retina resolution with multi-tap shadow sampling.</small>
            </div>
            <div className="engine-performance-switch engine-performance-switch-prominent" role="group" aria-label="Performance mode">
              <button
                type="button"
                className={settings.performance === 'high' ? 'active' : ''}
                onClick={() => setSetting('performance', 'high')}
                aria-pressed={settings.performance === 'high'}
              >
                <Zap size={13} /> High (60 FPS)
              </button>
              <button
                type="button"
                className={settings.performance === 'ultra' ? 'active' : ''}
                onClick={() => setSetting('performance', 'ultra')}
                aria-pressed={settings.performance === 'ultra'}
              >
                <Sparkles size={13} /> Ultra (Retina 2x)
              </button>
            </div>
          </section>

          {/* Profile */}
          <section className="engine-settings-section">
            <div className="engine-section-heading">
              <span>Profile</span>
              <small>Your display name is limited to 40 characters.</small>
            </div>
            <label className="engine-field">
              <span>Display name</span>
              <input
                value={settings.displayName}
                maxLength={40}
                placeholder="Your name"
                onChange={(event) => setSetting('displayName', event.target.value)}
              />
            </label>
          </section>

          {/* Rendering text clarity */}
          <section className="engine-settings-section">
            <div className="engine-section-heading">
              <span>Text Clarity</span>
              <small>Separate text subpixel rendering clarity from glass physics.</small>
            </div>
            <div className="engine-chip-grid" aria-label="UI text clarity">
              {CLARITY_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={settings.uiTextClarity === value ? 'engine-chip active' : 'engine-chip'}
                  aria-pressed={settings.uiTextClarity === value}
                  onClick={() => setSetting('uiTextClarity', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Appearance */}
          <section className="engine-settings-section">
            <div className="engine-section-heading">
              <span>Appearance</span>
              <small>Theme and canvas stage controls.</small>
            </div>
            <div className="engine-theme-pair">
              <button
                type="button"
                className={settings.theme === 'light' ? 'active' : ''}
                onClick={() => setSetting('theme', 'light')}
                aria-pressed={settings.theme === 'light'}
              >
                <Sun size={15} /> Day
              </button>
              <button
                type="button"
                className={settings.theme === 'dark' ? 'active' : ''}
                onClick={() => setSetting('theme', 'dark')}
                aria-pressed={settings.theme === 'dark'}
              >
                <Moon size={15} /> Night
              </button>
            </div>
            <ToggleRow
              label="Pure black"
              description="Force a flat black canvas behind the glass."
              checked={settings.pureBlack}
              onChange={(value) => setSetting('pureBlack', value)}
            />
          </section>

          {/* Motion */}
          <section className="engine-settings-section">
            <div className="engine-section-heading">
              <span>Motion & Spring Response</span>
              <small>Control the physical spring response used by interactive glass cards.</small>
            </div>
            <Slider
              label="Bounce stiffness"
              value={settings.bounceStiffness}
              min={100}
              max={500}
              step={5}
              display={settings.bounceStiffness}
              onChange={(value) => setSetting('bounceStiffness', value)}
            />
            <Slider
              label="Bounce damping"
              value={settings.bounceDamping}
              min={10}
              max={40}
              display={settings.bounceDamping}
              onChange={(value) => setSetting('bounceDamping', value)}
            />
          </section>
        </div>

        <footer className="engine-settings-footer">
          <button type="button" className="engine-reset-button" onClick={reset}>
            <RotateCcw size={15} /> Reset WebGL defaults
          </button>
          <button type="button" className="primary-button engine-done-button" onClick={close}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}

