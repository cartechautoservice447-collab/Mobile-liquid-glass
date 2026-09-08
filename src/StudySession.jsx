import { ArrowLeft, Check, Clock3, Coffee, Flame, Pause, Play, RotateCcw, Sparkles, TimerReset, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './StudySession.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};
const DURATIONS = { focus: 25 * 60, deep: 50 * 60, sprint: 15 * 60 };

export default function StudySession({ course, onBack }) {
  const accent = ACCENT[course.color] || ACCENT.sky;
  const [mode, setMode] = useState('focus');
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [goal, setGoal] = useState('Review course notes');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          setCompletedSessions((count) => count + 1);
          setFinished(true);
          return 0;
        }
        return value - 1;
      });
      setSessionSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const duration = DURATIONS[mode];
  const progress = Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100));
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  const sessionMinutes = Math.floor(sessionSeconds / 60);

  const setSessionMode = (nextMode) => {
    setMode(nextMode);
    setRemaining(DURATIONS[nextMode]);
    setRunning(false);
    setFinished(false);
  };
  const reset = () => { setRemaining(duration); setSessionSeconds(0); setRunning(false); setFinished(false); };
  const completeNow = () => { setRunning(false); setCompletedSessions((count) => count + 1); setFinished(true); };
  const status = useMemo(() => finished ? 'Session complete' : running ? 'Deep focus active' : remaining === duration ? 'Ready when you are' : 'Session paused', [finished, running, remaining, duration]);

  return (
    <main className="screen feature-screen study-session-screen">
      <section className="study-session-panel">
        <header className="premium-feature-header">
          <button type="button" className="premium-back-button" onClick={onBack} aria-label="Back to course workspace"><ArrowLeft size={19} /></button>
          <div className="premium-feature-heading"><span>Focus workspace</span><h1>Study Session</h1></div>
          <span className="premium-header-mark"><Zap size={17} /></span>
        </header>

        <section className="study-session-hero glass-card" style={{ '--session-accent': accent }}>
          <div className="session-context"><div><span className="session-kicker">STUDYING</span><h2>{course.name}</h2><p>{goal}</p></div><span className="session-live-pill"><span className={running ? 'live-dot is-live' : 'live-dot'} />{running ? 'LIVE' : status}</span></div>
          <div className="session-mode-tabs" role="tablist" aria-label="Study duration">
            {Object.entries({ focus: 'Focus', deep: 'Deep', sprint: 'Sprint' }).map(([key, label]) => <button type="button" key={key} className={mode === key ? 'is-selected' : ''} onClick={() => setSessionMode(key)}>{label}<small>{DURATIONS[key] / 60}m</small></button>)}
          </div>
          <div className="session-clock-wrap">
            <div className="session-orbit" style={{ '--session-progress': `${progress}%` }}><div className="session-clock"><span>{minutes}:{seconds}</span><small>{finished ? 'Complete' : running ? 'Focus time' : 'Remaining'}</small></div></div>
          </div>
          <div className="session-progress-track"><span style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, #bd86ff)` }} /></div>
          <div className="session-controls">
            <button type="button" className="session-reset-button" onClick={reset} aria-label="Reset session"><RotateCcw size={17} /></button>
            <button type="button" className="session-main-button" onClick={() => setRunning((value) => !value)} style={{ background: `linear-gradient(145deg, ${accent}, #7b61ff)` }}>{running ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}{running ? 'Pause focus' : 'Start focus'}</button>
            <button type="button" className="session-finish-button" onClick={completeNow}><Check size={17} />Finish</button>
          </div>
        </section>

        <section className="session-goal-row glass-inner">
          <div><span className="session-small-label">SESSION GOAL</span><strong>{goal}</strong></div>
          <button type="button" onClick={() => setGoal(goal === 'Review course notes' ? 'Practice key concepts' : 'Review course notes')} aria-label="Change session goal"><TimerReset size={16} /></button>
        </section>

        <section className="session-stat-grid" aria-label="Session metrics">
          <article className="session-stat glass-card"><span><Clock3 size={15} /></span><strong>{sessionMinutes}m</strong><small>Active focus</small></article>
          <article className="session-stat glass-card"><span><Flame size={15} /></span><strong>{completedSessions}</strong><small>Sessions done</small></article>
          <article className="session-stat glass-card"><span><Coffee size={15} /></span><strong>{mode === 'deep' ? '10m' : '5m'}</strong><small>Break target</small></article>
        </section>

        <section className="session-rhythm glass-card">
          <div className="session-card-heading"><div><span className="session-card-icon"><Sparkles size={15} /></span><div><span className="session-small-label">SESSION RHYTHM</span><h3>Keep the flow</h3></div></div><span className="session-chip">{completedSessions} complete</span></div>
          <div className="rhythm-row"><div><strong>Focus</strong><span>Stay on one course goal until the timer ends.</span></div><div className="rhythm-bars">{[1,2,3,4,5].map((item) => <i key={item} className={item <= Math.min(5, completedSessions + 1) ? 'is-active' : ''} />)}</div></div>
          <div className="rhythm-tip"><Sparkles size={14} /><span>{running ? 'Notifications off. Keep your attention on the current goal.' : 'Start a session when you are ready for uninterrupted study.'}</span></div>
        </section>
      </section>
    </main>
  );
}
