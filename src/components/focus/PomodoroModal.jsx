import { Clock3, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PomodoroRing } from './PomodoroRing.tsx';
import './PomodoroModal.css';

const MODES = {
  focus: { label: 'Focus', minutes: 25 },
  short: { label: 'Short Break', minutes: 5 },
  long: { label: 'Long Break', minutes: 15 },
};

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function PomodoroModal({ close }) {
  const [mode, setMode] = useState('focus');
  const [remaining, setRemaining] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);

  const duration = MODES[mode].minutes * 60;
  const label = MODES[mode].label;

  useEffect(() => {
    if (!running) return undefined;
    let frame = 0;
    const startedAt = performance.now();
    const startRemaining = remaining;
    const tick = (now) => {
      const elapsed = (now - startedAt) / 1000;
      const next = Math.max(0, startRemaining - elapsed);
      setRemaining(next);
      if (next > 0) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const status = useMemo(() => {
    if (remaining <= 0) return 'Complete';
    if (running) return 'Stay focused';
    if (remaining === duration) return 'Ready when you are';
    return 'Paused';
  }, [duration, remaining, running]);

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    setRemaining(MODES[nextMode].minutes * 60);
    setRunning(false);
  };

  const reset = () => {
    setRemaining(duration);
    setRunning(false);
  };

  return (
    <div className="modal-backdrop pomodoro-react-backdrop" onClick={close}>
      <section className="glass-modal pomodoro-react-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pomodoro-title">
        <button className="modal-close" onClick={close} aria-label="Close"><X size={18} /></button>
        <header className="pomodoro-react-header">
          <div>
            <span className="eyebrow">Focus timer</span>
            <h2 id="pomodoro-title">Pomodoro</h2>
          </div>
          <span className="pomodoro-react-icon"><Clock3 size={17} /></span>
        </header>

        <div className="pomodoro-react-ring-area">
          <PomodoroRing remaining={remaining} total={duration} label={label} running={running} />
          <p>{status}</p>
        </div>

        <div className="pomodoro-react-modes" role="tablist" aria-label="Pomodoro duration">
          {Object.entries(MODES).map(([key, item]) => (
            <button type="button" key={key} className={mode === key ? 'is-active' : ''} onClick={() => chooseMode(key)}>
              <strong>{item.label}</strong><small>{item.minutes} min</small>
            </button>
          ))}
        </div>

        <div className="pomodoro-react-controls">
          <button type="button" className="pomodoro-react-secondary" onClick={reset} aria-label="Reset Pomodoro"><RotateCcw size={17} /></button>
          <button type="button" className="pomodoro-react-primary" onClick={() => remaining <= 0 ? reset() : setRunning((value) => !value)}>
            {running ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
            {running ? 'Pause' : remaining <= 0 ? 'Restart' : 'Start'}
          </button>
        </div>
        <span className="pomodoro-react-time-aria" aria-live="polite">{formatTime(remaining)}</span>
      </section>
    </div>
  );
}
