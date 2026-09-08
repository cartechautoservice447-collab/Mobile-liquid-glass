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
  const tipAngle = 2 * Math.PI * progress;

  return (
    <div className="pomodoro-ring">
      <svg viewBox={`0 0 ${size} ${size}`} className="pomodoro-ring-svg" aria-hidden="true">
        <defs>
          <linearGradient id="pomodoroMercuryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8f4ff" />
            <stop offset="35%" stopColor="#9fd8ff" />
            <stop offset="65%" stopColor="#6fb8ff" />
            <stop offset="100%" stopColor="#c9ecff" />
          </linearGradient>
          <filter id="pomodoroMercuryBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
          </filter>
          <filter id="pomodoroMercuryBlurSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" result="blur" />
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="pomodoro-ring-track"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - 2}
          fill="none"
          stroke="url(#pomodoroMercuryGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
          strokeDashoffset="0"
          filter="url(#pomodoroMercuryBlurSoft)"
          opacity={running ? 0.55 : 0.3}
          className="pomodoro-ring-ambient"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#pomodoroMercuryGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
          strokeDashoffset="0"
          filter="url(#pomodoroMercuryBlur)"
          opacity={running ? 0.9 : 0.5}
          className="pomodoro-ring-glow"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#pomodoroMercuryGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
          strokeDashoffset="0"
          className="pomodoro-ring-core"
        />

        {progress > 0.01 && (
          <circle
            cx={size / 2 + radius * Math.cos(tipAngle)}
            cy={size / 2 + radius * Math.sin(tipAngle)}
            r={running ? 5 : 3}
            fill="#ffffff"
            filter="url(#pomodoroMercuryBlur)"
            className="pomodoro-ring-bead"
            opacity={running ? 1 : 0.6}
          >
            {running && (
              <animate
                attributeName="r"
                values="4;6;4"
                dur="2.2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        )}
      </svg>

      <div className="pomodoro-ring-content">
        {label && <span className="pomodoro-ring-label">{label}</span>}
        <span className="pomodoro-ring-time">{formatTime(remaining)}</span>
      </div>
    </div>
  );
}
