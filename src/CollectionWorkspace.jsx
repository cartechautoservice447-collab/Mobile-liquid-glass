import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Eye, FileText, Pencil, Plus, Search, Star, Trash2, Undo2, Redo2 } from 'lucide-react';
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
  const [panel, setPanel] = useState('notes');
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
  const textareaRef = useRef(null);
  const notes = collection?.notes ?? [];
  const favoriteCount = notes.filter((note) => favoriteIds.has(note.id)).length;
  const visibleNotes = useMemo(() => notes.filter((note) => {
    if (panel === 'favorites' && !favoriteIds.has(note.id)) return false;
    const q = query.trim().toLowerCase();
    return !q || (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q);
  }), [notes, panel, query, favoriteIds]);
  const selectNote = (note) => { setDraft({ ...note }); setPanel('editor'); setHistory([]); setRedo([]); };
  const updateDraft = (patch) => { if (!draft) return; setHistory((items) => [...items.slice(-100), draft]); setRedo([]); setDraft((current) => ({ ...current, ...patch })); };
  const saveDraft = () => { if (!draft) return; onSaveNote(draft); setHistory([]); setRedo([]); };
  const toggleFavorite = (id) => setFavoriteIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const insertTool = (tool) => {
    if (!draft) return;
    const textarea = textareaRef.current;
    const value = draft.content || '';
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const [, , insert] = tool;
    let next = value.slice(0, start) + insert + (tool[0] === 'bold' || tool[0] === 'italic' || tool[0] === 'code' || tool[0] === 'strike' ? selected + insert : selected) + value.slice(end);
    if (tool[0] === 'bold' || tool[0] === 'italic' || tool[0] === 'code' || tool[0] === 'strike') next = value.slice(0, start) + insert + selected + insert + value.slice(end);
    updateDraft({ content: next });
    requestAnimationFrame(() => { textarea?.focus(); const caret = start + insert.length; textarea?.setSelectionRange(caret, selected ? caret + selected.length : caret); });
  };
  if (!collection) return null;
  return (
    <main className="screen feature-screen collection-workspace-screen">
      <section className="full-glass-panel collection-workspace">
        <header className="collection-mobile-header">
          <button className="back-button" onClick={onBack} aria-label="Back to collections"><ArrowLeft size={20} /></button>
          <div className="collection-mobile-title"><span className="eyebrow">{course.name} · Glass Notes</span><h1>{collection.title}</h1><p>{collection.description}</p></div>
          <span className="collection-note-count"><FileText size={14} /> {notes.length}</span>
        </header>
        <div className="collection-mobile-tabs" role="tablist" aria-label="Collection note views">
          <button className={panel === 'notes' ? 'active' : ''} onClick={() => setPanel('notes')} role="tab"><FileText size={14} /> All Notes <span>{notes.length}</span></button>
          <button className={panel === 'favorites' ? 'active' : ''} onClick={() => setPanel('favorites')} role="tab"><Star size={14} /> Favorites <span>{favoriteCount}</span></button>
          <button className={panel === 'editor' ? 'active' : ''} onClick={() => setPanel('editor')} role="tab"><Pencil size={14} /> Editor</button>
        </div>
        {(panel === 'notes' || panel === 'favorites') && <section className="collection-notes-panel glass-inner">
          <div className="collection-search-row"><div className="collection-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" aria-label="Search notes" /></div><button className="collection-icon-action" onClick={() => setPanel('editor')} aria-label="Open editor"><Pencil size={17} /></button></div>
          <form className="collection-new-note" onSubmit={addNote}><input value={newNoteName} onChange={(e) => setNewNoteName(e.target.value)} placeholder="New Note" aria-label="New note name" /><button type="submit" aria-label="Create note"><Plus size={18} /></button></form>
          <div className="collection-note-list">
            {visibleNotes.length === 0 ? <div className="collection-empty"><FileText size={24} /><strong>{panel === 'favorites' ? 'No favorite notes' : 'No notes match this view'}</strong><span>Use New Note to create one, or change your search.</span></div> : visibleNotes.map((note, index) => <article className={`collection-note-card ${draft?.id === note.id ? 'note-selected' : ''}`} key={note.id} onClick={() => selectNote(note)}>
              <div className="collection-note-number">{String(index + 1).padStart(2, '0')}</div><div className="collection-note-copy"><strong>{note.title || 'Untitled note'}</strong><small>{relativeDate(note.updatedAt || note.createdAt)}</small><span>{snippet(note.content) || 'Empty note'}</span></div>
              <button className="collection-favorite" onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id); }} aria-label={favoriteIds.has(note.id) ? 'Remove from favorites' : 'Add to favorites'}><Star size={17} className={favoriteIds.has(note.id) ? 'favorite-on' : ''} /></button>
              {onDeleteNote && <button className="collection-delete" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); if (draft?.id === note.id) setDraft(null); }} aria-label="Delete note"><Trash2 size={16} /></button>}
            </article>)}
          </div>
        </section>}
        {panel === 'editor' && <section className="collection-editor-panel glass-inner">
          {!draft ? <div className="collection-editor-empty"><Pencil size={28} /><strong>Select a note to edit</strong><span>Choose a note from All Notes, just like the desktop Glass Notes workspace.</span><button className="primary-button compact-button" onClick={() => setPanel('notes')}>Browse notes</button></div> : <>
            <div className="collection-editor-toolbar"><button className="collection-toolbar-back" onClick={() => setPanel('notes')} aria-label="Back to notes"><ArrowLeft size={17} /></button><input className="collection-title-input" value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} aria-label="Note title" placeholder="Note title" /><button className="collection-icon-action" onClick={() => toggleFavorite(draft.id)} aria-label="Favorite"><Star size={17} className={favoriteIds.has(draft.id) ? 'favorite-on' : ''} /></button></div>
            <div className="collection-editor-actions"><label className="symbols-picker"><span>Symbols</span><ChevronDown size={13} /><select aria-label="Note symbols" defaultValue="" onChange={(e) => { const tool = SYMBOL_TOOLS.find(([key]) => key === e.target.value); if (tool) insertTool(tool); e.target.value = ''; }}><option value="">Symbols</option>{SYMBOL_TOOLS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button onClick={() => { const previous = history[history.length - 1]; if (!previous) return; setRedo((items) => [...items, draft]); setDraft(previous); setHistory((items) => items.slice(0, -1)); }} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button><button onClick={() => { const next = redo[redo.length - 1]; if (!next) return; setHistory((items) => [...items, draft]); setDraft(next); setRedo((items) => items.slice(0, -1)); }} disabled={!redo.length} aria-label="Redo"><Redo2 size={16} /></button><span className="editor-mode-label">Markdown editor</span><button className="editor-save" onClick={saveDraft}><Check size={16} /> Save</button></div>
            <textarea ref={textareaRef} className="collection-editor-textarea" value={draft.content || ''} onChange={(e) => updateDraft({ content: e.target.value })} placeholder="Write your note here…" aria-label="Note content" />
            <div className="collection-preview glass-inner"><div className="preview-label"><Eye size={14} /> Preview</div><div className="collection-preview-body">{draft.content ? renderMarkdown(draft.content) : <span className="muted">Your note preview will appear here.</span>}</div></div>
          </>}
        </section>}
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}
