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
};

export function PomodoroRing({ remaining, total, label }: Props) {
  const safeTotal = Math.max(1, Number.isFinite(Number(total)) ? Number(total) : 1);
  const safeRemaining = Math.max(0, Number.isFinite(Number(remaining)) ? Number(remaining) : 0);
  const progress = Math.min(1, safeRemaining / safeTotal);
  const size = 320;
  const radius = 136;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="pomodoro-ring-new">
      <span aria-hidden className="pomodoro-ring-sheen" />
      <span aria-hidden className="pomodoro-ring-refraction" />
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <radialGradient id="mercuryPool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
          </radialGradient>
          <filter id="mercurySoftGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="pomodoro-ring-groove" strokeWidth="16" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="pomodoro-ring-ambient" strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="pomodoro-ring-core-new" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
      </svg>
      <div className="pomodoro-ring-new-content">
        {label && <span className="pomodoro-ring-new-label">{label}</span>}
        <span className="pomodoro-ring-new-time">{formatTime(safeRemaining)}</span>
      </div>
    </div>
  );
}
