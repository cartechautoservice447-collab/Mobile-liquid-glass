import './PomodoroRing.css';

function formatTime(totalSeconds: number) {
  const numericSeconds = Number.isFinite(Number(totalSeconds)) ? Number(totalSeconds) : 0;
  const safe = Math.max(0, Math.ceil(numericSeconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

type Props = {
  remaining: number;
  total: number;
  label?: string;
  running?: boolean;
};

export function PomodoroRing({ remaining, total, label, running = false }: Props) {
  const safeTotal = Math.max(1, Number.isFinite(Number(total)) ? Number(total) : 1);
  const safeRemaining = Math.min(safeTotal, Math.max(0, Number.isFinite(Number(remaining)) ? Number(remaining) : 0));
  const progress = safeRemaining / safeTotal;
  const size = 320;
  const radius = 138;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={`pomodoro-ring-new${running ? ' is-running' : ''}`}>
      <span aria-hidden className="pomodoro-ring-sheen" />
      <span aria-hidden className="pomodoro-ring-refraction" />
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <radialGradient id="mercuryPool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
          </radialGradient>
          <linearGradient id="mercuryFlow" x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="18%" stopColor="rgba(255,255,255,0.75)" />
            <stop offset="34%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="56%" stopColor="rgba(255,255,255,0.58)" />
            <stop offset="76%" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
            {running && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from={`0 ${size / 2} ${size / 2}`}
                to={`360 ${size / 2} ${size / 2}`}
                dur="7s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
          <filter id="mercurySoftGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="mercuryFluidGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="pomodoro-ring-groove" strokeWidth="16" />

        {/* Ambient blurred glow, synchronized to the remaining progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#mercuryPool)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          filter="url(#mercurySoftGlow)"
          opacity="0.85"
        />

        {/* Soft flowing ambient fluid locked to the exact progress arc */}
        {running && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#mercuryFlow)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            filter="url(#mercuryFluidGlow)"
            opacity="0.72"
          >
            <animate
              attributeName="opacity"
              values="0.46;0.72;0.46"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Bright frosted progress core — exact same progress as the timer */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="pomodoro-ring-core-new"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="pomodoro-ring-new-content">
        {label && <span className="pomodoro-ring-new-label">{label}</span>}
        <span className="pomodoro-ring-new-time">{formatTime(safeRemaining)}</span>
      </div>
    </div>
  );
}
