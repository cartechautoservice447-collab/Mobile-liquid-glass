function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type Props = {
  remaining: number;
  total: number;
  label?: string;
};

export function PomodoroRing({ remaining, total, label }: Props) {
  const safeTotal = Math.max(1, total);
  const progress = Math.min(1, Math.max(0, remaining / safeTotal));
  const size = 320;
  const radius = 128;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="relative mx-auto flex size-[280px] max-w-full items-center justify-center rounded-full sm:size-[320px]"
      style={{
        backgroundColor: "var(--water-gel-bg)",
        backdropFilter: "blur(var(--liquid-density, 12px)) saturate(200%) contrast(105%)",
        border: "1px solid rgba(255, 255, 255, 0.22)",
        borderTopColor: "rgba(255, 255, 255, 0.4)",
        boxShadow:
          "inset 0 2px 3px 0 rgba(255, 255, 255, 0.35), inset 0 -4px 8px 0 rgba(0, 0, 0, 0.2), 0 10px 40px 0 rgba(0, 0, 0, 0.28)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.02) 55%, rgba(255, 255, 255, 0.09) 100%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full border border-white/35 mix-blend-screen opacity-25"
        style={{ filter: "url(#liquid-refraction)" }}
      />

      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <defs>
          <radialGradient id="mercuryPool" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
          </radialGradient>
          <filter id="mercurySoftGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="16" />

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

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        {label && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </span>
        )}
        <span className="mt-1 text-6xl font-semibold tabular-nums tracking-[-0.05em] text-foreground sm:text-7xl">
          {formatTime(remaining)}
        </span>
      </div>
    </div>
  );
}
