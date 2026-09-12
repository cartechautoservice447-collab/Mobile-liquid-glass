import { useEffect, useState } from 'react';

const getLens = () => {
  const value = Number.parseFloat(document.documentElement.style.getPropertyValue('--liquid-lens'));
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.35;
};

const getIsMobileViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches
);

export default function LiquidRefractionFilter() {
  const [lens, setLens] = useState(getLens);
  const [mobileViewport, setMobileViewport] = useState(getIsMobileViewport);

  useEffect(() => {
    const syncLens = () => setLens(getLens());
    const syncViewport = () => setMobileViewport(getIsMobileViewport());
    syncLens();
    syncViewport();
    window.addEventListener('glass-settings-changed', syncLens);
    window.addEventListener('resize', syncViewport);
    return () => {
      window.removeEventListener('glass-settings-changed', syncLens);
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  // Android/Chromium can crash the renderer when several large glass surfaces
  // reference an SVG turbulence + displacement filter at once. The mobile UI
  // keeps its glass appearance through the CSS surfaces and skips the expensive
  // SVG refraction definition entirely on small viewports.
  if (mobileViewport) return null;

  const frequency = (0.006 + (1 - lens) * 0.018).toFixed(4);
  const scale = Number((lens * 5).toFixed(2));

  return (
    <svg aria-hidden="true" className="liquid-refraction-defs" width="0" height="0" focusable="false">
      <defs>
        <filter id="liquid-refraction" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
