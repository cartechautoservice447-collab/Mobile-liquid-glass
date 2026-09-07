import { useCallback, useEffect, useMemo, useState } from 'react';

export const ENGINE_DEFAULTS = {
  displayName: '',
  uiTextClarity: 'default',
  performance: 'high',
  theme: 'light',
  pureBlack: false,
  backgroundThemeEnabled: false,
  backgroundOpacity: 100,
  fullDarkBackground: false,
  liquidDensity: 12,
  liquidTransparency: 45,
  liquidClearness: 35,
  liquidGel: 55,
  bounceStiffness: 200,
  bounceDamping: 24,
};

const LEGACY_PERFORMANCE_KEY = 'mobile-liquid-glass-performance';
const STORAGE_PREFIX = 'mobile-liquid-glass-engine-v1';
const CLARITY_VALUES = ['default', 'smooth', 'medium', 'punchy'];

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const readStored = (key, fallback, parse = (value) => value) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
};

const writeStored = (key, value) => {
  try { localStorage.setItem(key, String(value)); } catch { /* storage can be unavailable */ }
};

const scopeKey = (userId, suffix) => `${STORAGE_PREFIX}:${userId || 'guest'}:${suffix}`;

export default function useEngineSettings(userId) {
  const [settings, setSettings] = useState(ENGINE_DEFAULTS);
  const [hydratedUser, setHydratedUser] = useState(null);

  useEffect(() => {
    const scope = userId || 'guest';
    const legacyPerformance = readStored(LEGACY_PERFORMANCE_KEY, ENGINE_DEFAULTS.performance);
    setSettings({
      displayName: readStored(scopeKey(scope, 'display-name'), ENGINE_DEFAULTS.displayName, (value) => value.trim().slice(0, 40)),
      uiTextClarity: (() => {
        const value = readStored(scopeKey(scope, 'ui-text-clarity'), ENGINE_DEFAULTS.uiTextClarity);
        return CLARITY_VALUES.includes(value) ? value : ENGINE_DEFAULTS.uiTextClarity;
      })(),
      performance: readStored(scopeKey(scope, 'performance'), legacyPerformance) === 'ultra' ? 'ultra' : 'high',
      theme: readStored(scopeKey(scope, 'theme'), ENGINE_DEFAULTS.theme) === 'dark' ? 'dark' : 'light',
      pureBlack: readStored(scopeKey(scope, 'pure-black'), ENGINE_DEFAULTS.pureBlack) === 'true',
      backgroundThemeEnabled: readStored(scopeKey(scope, 'background-theme'), ENGINE_DEFAULTS.backgroundThemeEnabled) === 'true',
      backgroundOpacity: clamp(readStored(scopeKey(scope, 'background-opacity'), ENGINE_DEFAULTS.backgroundOpacity), 0, 100, ENGINE_DEFAULTS.backgroundOpacity),
      fullDarkBackground: readStored(scopeKey(scope, 'full-dark-background'), ENGINE_DEFAULTS.fullDarkBackground) === 'true',
      liquidDensity: clamp(readStored(scopeKey(scope, 'liquid-density'), ENGINE_DEFAULTS.liquidDensity), 0, 40, ENGINE_DEFAULTS.liquidDensity),
      liquidTransparency: clamp(readStored(scopeKey(scope, 'liquid-transparency'), ENGINE_DEFAULTS.liquidTransparency), 5, 95, ENGINE_DEFAULTS.liquidTransparency),
      liquidClearness: clamp(readStored(scopeKey(scope, 'liquid-clearness'), ENGINE_DEFAULTS.liquidClearness), 0, 100, ENGINE_DEFAULTS.liquidClearness),
      liquidGel: clamp(readStored(scopeKey(scope, 'liquid-gel'), ENGINE_DEFAULTS.liquidGel), 0, 100, ENGINE_DEFAULTS.liquidGel),
      bounceStiffness: clamp(readStored(scopeKey(scope, 'bounce-stiffness'), ENGINE_DEFAULTS.bounceStiffness), 100, 500, ENGINE_DEFAULTS.bounceStiffness),
      bounceDamping: clamp(readStored(scopeKey(scope, 'bounce-damping'), ENGINE_DEFAULTS.bounceDamping), 10, 40, ENGINE_DEFAULTS.bounceDamping),
    });
    setHydratedUser(scope);
  }, [userId]);

  useEffect(() => {
    if (!hydratedUser) return;
    const entries = [
      ['display-name', settings.displayName],
      ['ui-text-clarity', settings.uiTextClarity],
      ['performance', settings.performance],
      ['theme', settings.theme],
      ['pure-black', settings.pureBlack],
      ['background-theme', settings.backgroundThemeEnabled],
      ['background-opacity', settings.backgroundOpacity],
      ['full-dark-background', settings.fullDarkBackground],
      ['liquid-density', settings.liquidDensity],
      ['liquid-transparency', settings.liquidTransparency],
      ['liquid-clearness', settings.liquidClearness],
      ['liquid-gel', settings.liquidGel],
      ['bounce-stiffness', settings.bounceStiffness],
      ['bounce-damping', settings.bounceDamping],
    ];
    entries.forEach(([suffix, value]) => writeStored(scopeKey(hydratedUser, suffix), value));
    writeStored(LEGACY_PERFORMANCE_KEY, settings.performance);
  }, [hydratedUser, settings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.documentElement.style.colorScheme = settings.theme;
    document.documentElement.classList.toggle('pure-black', settings.pureBlack);
    document.documentElement.dataset.backgroundTheme = settings.backgroundThemeEnabled ? 'on' : 'off';
    document.documentElement.dataset.fullDarkBackground = settings.fullDarkBackground ? 'on' : 'off';
    document.documentElement.dataset.uiTextClarity = settings.uiTextClarity;
    document.documentElement.dataset.glassPerformance = settings.performance;

    const transparency = settings.liquidTransparency / 100;
    const density = settings.liquidDensity;
    const clearness = settings.liquidClearness / 100;
    const gel = settings.liquidGel / 100;
    const glassAlpha = transparency;
    const darkAlpha = transparency * 0.16;
    const veilAlpha = transparency * 0.36;
    const darkVeilAlpha = transparency <= 0.45
      ? 0.0775 + 0.45 * transparency
      : 0.46 - 0.4 * transparency;

    const root = document.documentElement;
    root.style.setProperty('--liquid-density', `${density}px`);
    root.style.setProperty('--liquid-transparency', String(transparency));
    root.style.setProperty('--liquid-glass-alpha', String(glassAlpha));
    root.style.setProperty('--liquid-glass-dark-alpha', String(darkAlpha));
    root.style.setProperty('--liquid-veil-alpha', String(veilAlpha));
    root.style.setProperty('--liquid-dark-veil-alpha', String(darkVeilAlpha));
    root.style.setProperty('--liquid-clearness', String(clearness));
    root.style.setProperty('--liquid-gel', String(gel));
    root.style.setProperty('--liquid-bounce', String(settings.bounceStiffness));
    root.style.setProperty('--liquid-bounce-damping', String(settings.bounceDamping));
    root.style.setProperty('--background-opacity', String(settings.backgroundOpacity / 100));
    root.style.setProperty('--liquid-motion-duration', `${Math.round(420 - (settings.bounceStiffness - 100) * 0.7)}ms`);

    const opacity = settings.backgroundOpacity / 100;
    if (settings.pureBlack) {
      document.body.style.background = '#000';
    } else if (settings.fullDarkBackground) {
      document.body.style.background = '#050507';
    } else if (settings.backgroundThemeEnabled) {
      document.body.style.background = settings.theme === 'dark'
        ? `radial-gradient(circle at 20% 0%, rgb(23 59 98 / ${opacity}) 0, transparent 45%), radial-gradient(circle at 100% 100%, rgb(44 22 93 / ${opacity}) 0, transparent 48%), #07111f`
        : `radial-gradient(circle at 20% 0%, rgb(110 197 255 / ${opacity}) 0, transparent 45%), radial-gradient(circle at 100% 100%, rgb(171 126 255 / ${opacity}) 0, transparent 48%), #eef4fb`;
    } else {
      document.body.style.background = settings.theme === 'dark' ? '#07111f' : '#eef4fb';
    }
  }, [settings]);

  useEffect(() => {
    const onPerformanceChange = (event) => {
      const mode = event.detail === 'ultra' ? 'ultra' : 'high';
      setSettings((current) => ({ ...current, performance: mode }));
    };
    window.addEventListener('glass-performance-changed', onPerformanceChange);
    return () => window.removeEventListener('glass-performance-changed', onPerformanceChange);
  }, []);

  const update = useCallback((key, value) => {
    setSettings((current) => {
      if (key === 'displayName') return { ...current, displayName: String(value).trim().slice(0, 40) };
      if (key === 'uiTextClarity') return { ...current, uiTextClarity: CLARITY_VALUES.includes(value) ? value : current.uiTextClarity };
      if (key === 'performance') {
        const performance = value === 'ultra' ? 'ultra' : 'high';
        window.dispatchEvent(new CustomEvent('glass-performance-changed', { detail: performance }));
        return { ...current, performance };
      }
      if (key === 'theme') return { ...current, theme: value === 'dark' ? 'dark' : 'light' };
      if (key === 'pureBlack' || key === 'backgroundThemeEnabled' || key === 'fullDarkBackground') return { ...current, [key]: Boolean(value) };
      if (key === 'backgroundOpacity') return { ...current, backgroundOpacity: clamp(value, 0, 100, current.backgroundOpacity) };
      if (key === 'liquidDensity') return { ...current, liquidDensity: clamp(value, 0, 40, current.liquidDensity) };
      if (key === 'liquidTransparency') return { ...current, liquidTransparency: clamp(value, 5, 95, current.liquidTransparency) };
      if (key === 'liquidClearness') return { ...current, liquidClearness: clamp(value, 0, 100, current.liquidClearness) };
      if (key === 'liquidGel') return { ...current, liquidGel: clamp(value, 0, 100, current.liquidGel) };
      if (key === 'bounceStiffness') return { ...current, bounceStiffness: clamp(value, 100, 500, current.bounceStiffness) };
      if (key === 'bounceDamping') return { ...current, bounceDamping: clamp(value, 10, 40, current.bounceDamping) };
      return current;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(ENGINE_DEFAULTS);
  }, []);

  return useMemo(() => ({ settings, setSetting: update, reset }), [settings, update, reset]);
}
