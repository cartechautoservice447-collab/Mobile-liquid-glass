import { useEffect, useState } from 'react';

const getClearness = () => {
  const value = Number.parseFloat(document.documentElement.style.getPropertyValue('--liquid-clearness'));
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 35;
};

export default function LiquidRefractionFilter() {
  const [clearness, setClearness] = useState(getClearness);

  useEffect(() => {
    const sync = () => setClearness(getClearness());
    sync();
    window.addEventListener('glass-settings-changed', sync);
    return () => window.removeEventListener('glass-settings-changed', sync);
  }, []);

  // Exact Fluid Glass relationship: clearer liquid means less turbulence and
  // smaller displacement, keeping the rim smooth instead of visibly cracking.
  const clarity = clearness / 100;
  const frequency = (0.006 + (1 - clarity) * 0.02).toFixed(4);
  const scale = Number((1 + (1 - clarity) * 5).toFixed(2));

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
