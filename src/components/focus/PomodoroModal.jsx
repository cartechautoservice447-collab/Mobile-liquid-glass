import { X } from 'lucide-react';
import PomodoroPanel from './PomodoroPanel.jsx';
import './PomodoroModal.css';

export default function PomodoroModal({ close }) {
  return (
    <div className="modal-backdrop pomodoro-react-backdrop" onClick={close}>
      <div onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="pomodoro-title">
        <button className="modal-close" onClick={close} aria-label="Close"><X size={18} /></button>
        <PomodoroPanel />
      </div>
    </div>
  );
}
