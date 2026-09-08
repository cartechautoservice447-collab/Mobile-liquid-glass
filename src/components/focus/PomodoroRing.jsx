function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function PomodoroRing({ remaining, total, running, label }) {
  const safeTotal = Math.max(1, total);
  const progress = Math.min(1, Math.max(0, remaining / safeTotal));
  const size = 320;
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const dashLength = circumference * progress;
  const gapLength = Math.max(0.001, circumference - dashLength);
  const tipAngle = 2 * Math.PI * progress;

  return (
    <div className={`pomodoro-ring${running ? ' pomodoro-ring-is-running' : ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="pomodoro-ring-svg" aria-hidden="true">
        <defs>
          <linearGradient id="pomodoroMercuryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dff7ff" />
            <stop offset="32%" stopColor="#8ad8ff" />
            <stop offset="68%" stopColor="#72baff" />
            <stop offset="100%" stopColor="#bfeaff" />
          </linearGradient>
          <filter id="pomodoroMercuryBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="blur" /></filter>
          <filter id="pomodoroMercuryBlurSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="15" result="blur" /></filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="pomodoro-ring-track" />
        <circle cx={size / 2} cy={size / 2} r={radius - 1} fill="none" stroke="url(#pomodoroMercuryGradient)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${dashLength} ${gapLength}`} strokeDashoffset="0" filter="url(#pomodoroMercuryBlurSoft)" opacity={running ? 0.34 : 0.20} className="pomodoro-ring-ambient" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#pomodoroMercuryGradient)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${dashLength} ${gapLength}`} strokeDashoffset="0" filter="url(#pomodoroMercuryBlur)" opacity={running ? 0.50 : 0.30} className="pomodoro-ring-glow" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(176,229,255,.68)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dashLength} ${gapLength}`} strokeDashoffset="0" opacity={running ? 0.60 : 0.42} className="pomodoro-ring-core" />
        {progress > 0.005 && <circle cx={size / 2 + radius * Math.cos(tipAngle)} cy={size / 2 + radius * Math.sin(tipAngle)} r={running ? 4 : 2.5} fill="#dff8ff" filter="url(#pomodoroMercuryBlur)" className="pomodoro-ring-bead" opacity={running ? 0.64 : 0.42} />}
      </svg>
      <div className="pomodoro-ring-content">
        {label && <span className="pomodoro-ring-label">{label}</span>}
        <span className="pomodoro-ring-time">{formatTime(remaining)}</span>
      </div>
    </div>
  );
}
