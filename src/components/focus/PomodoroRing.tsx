
import { useId } from 'react';
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
  const remainingArcLength = circumference * progress;
  const idBase = useId().replace(/:/g, '');
  const glowId = `${idBase}-glow`;

  return (
    <div className={`pomodoro-ring-new${running ? ' is-running' : ''}`}>
      <span aria-hidden className="pomodoro-ring-sheen" />
      <span aria-hidden className="pomodoro-ring-refraction" />
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="pomodoro-ring-groove"
          strokeWidth="16"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${remainingArcLength} ${circumference}`}
          strokeDashoffset="0"
          filter={`url(#${glowId})`}
          className="pomodoro-ring-fluid"
        />
      </svg>
      <div className="pomodoro-ring-new-content">
        {label && <span className="pomodoro-ring-new-label">{label}</span>}
        <span className="pomodoro-ring-new-time">{formatTime(safeRemaining)}</span>
      </div>
    </div>
  );
}