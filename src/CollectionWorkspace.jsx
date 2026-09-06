import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Eye, FileText, Plus, Trash2, Undo2, Redo2 } from 'lucide-react';
import './CollectionWorkspace.css';

const SYMBOL_TOOLS = [
  ['h1', '# Heading 1', '# '], ['h2', '## Heading 2', '## '], ['h3', '### Heading 3', '### '], ['bullet', '* Bullet list', '* '],
  ['bold', '** Bold **', '**'], ['italic', '_ Italic _', '_'], ['code', '` Code `', '`'], ['link', '[text](url) Link', '[text](https://)'],
  ['quote', '> Quote box', '> '], ['code-block', '```python Code block', '```python\n\n```'], ['numbered', '1. Numbered list', '1. '], ['divider', '--- Divider', '---\n'],
  ['strike', '~~ Strikethrough ~~', '~~'], ['checklist', '[ ] Checklist', '- [ ] '], ['image', '![alt](url) Image', '![alt text](https://)'],
  ['table', '| | Table', '| Column 1 | Column 2 |\n| --- | --- |\n|  |  |'], ['note-callout', '> [!NOTE] Note', '> [!NOTE]\n> '],
  ['tip-callout', '> [!TIP] Tip', '> [!TIP]\n> '], ['warning-callout', '> [!WARNING] Warning', '> [!WARNING]\n> '], ['important-callout', '> [!IMPORTANT] Important', '> [!IMPORTANT]\n> '],
];

function snippet(value = '') { return value.replace(/```[\s\S]*?```/g, ' [code] ').replace(/[#>*_`|-]/g, ' ').replace(/\s+/g, ' ').trim(); }
function relativeDate(value) { const ts = typeof value === 'number' ? value : Date.parse(value || ''); if (!Number.isFinite(ts)) return 'just now'; const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000)); if (minutes < 1) return 'just now'; if (minutes < 60) return `${minutes}m ago`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.round(hours / 24); if (days < 30) return `${days}d ago`; return new Date(ts).toLocaleDateString(); }
function renderMarkdown(text = '') {
  return text.split('\n').map((line, index) => {
    const key = `${index}-${line}`;
    if (/^### /.test(line)) return <h4 key={key}>{line.slice(4)}</h4>;
    if (/^## /.test(line)) return <h3 key={key}>{line.slice(3)}</h3>;
    if (/^# /.test(line)) return <h2 key={key}>{line.slice(2)}</h2>;
    if (/^- \[ \] /.test(line)) return <div key={key} className="preview-check">☐ {line.slice(6)}</div>;
    if (/^- \[x\] /i.test(line)) return <div key={key} className="preview-check">☑ {line.slice(6)}</div>;
    if (/^[-*] /.test(line)) return <li key={key}>{line.slice(2)}</li>;
    if (/^\d+\. /.test(line)) return <li key={key}>{line.replace(/^\d+\. /, '')}</li>;
    if (/^> /.test(line)) return <blockquote key={key}>{line.slice(2)}</blockquote>;
    if (/^---$/.test(line.trim())) return <hr key={key} />;
    if (!line.trim()) return <div key={key} className="preview-space" />;
    const pieces = line.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|~~[^~]+~~)/g);
    return <p key={key}>{pieces.map((part, partIndex) => part.startsWith('**') ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part.startsWith('_') ? <em key={partIndex}>{part.slice(1, -1)}</em> : part.startsWith('`') ? <code key={partIndex}>{part.slice(1, -1)}</code> : part.startsWith('~~') ? <s key={partIndex}>{part.slice(2, -2)}</s> : part)}</p>;
  });
}

export default function CollectionWorkspace({ course, collection, newNoteName, setNewNoteName, addNote, onBack, onSaveNote, onDeleteNote, message }) {
  const [view, setView] = useState('notes');
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
  const textareaRef = useRef(null);
  const notes = collection?.notes ?? [];
  const visibleNotes = useMemo(() => notes, [notes]);

  const selectNote = (note) => { setDraft({ ...note }); setHistory([]); setRedo([]); setView('editor'); };
  const updateDraft = (patch) => { if (!draft) return; setHistory((items) => [...items.slice(-100), draft]); setRedo([]); setDraft((current) => ({ ...current, ...patch })); };
  const saveDraft = () => { if (!draft) return; onSaveNote(draft); setHistory([]); setRedo([]); };
  const insertTool = (tool) => {
    if (!draft) return;
    const textarea = textareaRef.current;
    const value = draft.content || '';
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const insert = tool[2];
    const formatted = ['bold', 'italic', 'code', 'strike'].includes(tool[0]) ? `${insert}${selected}${insert}` : `${insert}${selected}`;
    const next = value.slice(0, start) + formatted + value.slice(end);
    updateDraft({ content: next });
    requestAnimationFrame(() => { textarea?.focus(); const caret = start + formatted.length; textarea?.setSelectionRange(caret, caret); });
  };

  if (!collection) return null;
  return (
    <main className="screen feature-screen collection-workspace-screen">
      <section className="full-glass-panel collection-workspace">
        {view === 'notes' ? (
          <>
            <header className="collection-mobile-header notes-only-header">
              <button className="back-button" onClick={onBack} aria-label="Back to collections"><ArrowLeft size={20} /></button>
              <div className="collection-mobile-title"><span className="eyebrow">{course.name} · Collection</span><h1>{collection.title}</h1><p>{collection.description}</p></div>
              <span className="collection-note-count"><FileText size={14} /> {notes.length}</span>
            </header>
            <section className="collection-notes-panel glass-inner notes-only-panel">
              <div className="collection-notes-heading"><div><span className="heading-dot" /><h2>Notes</h2></div><span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span></div>
              <form className="collection-new-note" onSubmit={addNote}><input value={newNoteName} onChange={(e) => setNewNoteName(e.target.value)} placeholder="New Note" aria-label="New note name" /><button type="submit" aria-label="Create note"><Plus size={18} /></button></form>
              <div className="collection-note-list">
                {visibleNotes.length === 0 ? <div className="collection-empty"><FileText size={26} /><strong>No notes yet</strong><span>Create your first note in this collection.</span></div> : visibleNotes.map((note, index) => (
                  <article className="collection-note-card" key={note.id} onClick={() => selectNote(note)}>
                    <div className="collection-note-number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="collection-note-copy"><strong>{note.title || 'Untitled note'}</strong><small>{relativeDate(note.updatedAt || note.createdAt)}</small><span>{snippet(note.content) || 'Empty note'}</span></div>
                    {onDeleteNote && <button className="collection-delete" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }} aria-label="Delete note"><Trash2 size={16} /></button>}
                  </article>
                ))}
              </div>
            </section>
            {message && <p className="message">{message}</p>}
          </>
        ) : (
          <section className="collection-editor-full">
            <header className="collection-editor-header">
              <button className="back-button" onClick={() => setView('notes')} aria-label="Back to collection notes"><ArrowLeft size={20} /></button>
              <div><span className="eyebrow">{course.name} · {collection.title}</span><h1>Note Editor</h1></div>
              <button className="editor-save editor-save-header" onClick={saveDraft}><Check size={16} /> Save</button>
            </header>
            <div className="collection-editor-body">
              <input className="collection-title-input" value={draft?.title || ''} onChange={(e) => updateDraft({ title: e.target.value })} aria-label="Note title" placeholder="Note title" />
              <div className="collection-editor-actions">
                <label className="symbols-picker"><span>Symbols</span><ChevronDown size={13} /><select aria-label="Note symbols" defaultValue="" onChange={(e) => { const tool = SYMBOL_TOOLS.find(([key]) => key === e.target.value); if (tool) insertTool(tool); e.target.value = ''; }}><option value="">Symbols</option>{SYMBOL_TOOLS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <button onClick={() => { const previous = history[history.length - 1]; if (!previous) return; setRedo((items) => [...items, draft]); setDraft(previous); setHistory((items) => items.slice(0, -1)); }} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button>
                <button onClick={() => { const next = redo[redo.length - 1]; if (!next) return; setHistory((items) => [...items, draft]); setDraft(next); setRedo((items) => items.slice(0, -1)); }} disabled={!redo.length} aria-label="Redo"><Redo2 size={16} /></button>
                <span className="editor-mode-label">Markdown editor</span>
              </div>
              <div className="collection-editor-workarea">
                <textarea ref={textareaRef} className="collection-editor-textarea" value={draft?.content || ''} onChange={(e) => updateDraft({ content: e.target.value })} placeholder="Write your note here…" aria-label="Note content" />
                <div className="collection-preview glass-inner"><div className="preview-label"><Eye size={14} /> Preview</div><div className="collection-preview-body">{draft?.content ? renderMarkdown(draft.content) : <span className="muted">Your note preview will appear here.</span>}</div></div>
              </div>
            </div>
            {message && <p className="message">{message}</p>}
          </section>
        )}
      </section>
    </main>
  );
}
