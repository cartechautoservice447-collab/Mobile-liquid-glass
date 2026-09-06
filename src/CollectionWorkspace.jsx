import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Eye, FileText, Pencil, Plus, Search, Star, Trash2, Undo2, Redo2 } from 'lucide-react';
import './CollectionWorkspace.css';

function snippet(value = '') {
  return value.replace(/```[\s\S]*?```/g, ' [code] ').replace(/[#>*_`|-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function CollectionWorkspace({ course, collection, newNoteName, setNewNoteName, addNote, onBack, onSaveNote, onDeleteNote, message }) {
  const [panel, setPanel] = useState('notes');
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
  const notes = collection?.notes ?? [];
  const visibleNotes = useMemo(() => notes.filter((note) => {
    if (panel === 'favorites' && !favoriteIds.has(note.id)) return false;
    const q = query.trim().toLowerCase();
    return !q || (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q);
  }), [notes, panel, query, favoriteIds]);
  const selectNote = (note) => { setDraft({ ...note }); setPanel('editor'); setHistory([]); setRedo([]); };
  const updateDraft = (patch) => { if (!draft) return; setHistory((items) => [...items.slice(-49), draft]); setRedo([]); setDraft((current) => ({ ...current, ...patch })); };
  const saveDraft = () => { if (!draft) return; onSaveNote(draft); setHistory([]); setRedo([]); };
  const toggleFavorite = (id) => setFavoriteIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  if (!collection) return null;
  return (
    <main className="screen feature-screen collection-workspace-screen">
      <section className="full-glass-panel collection-workspace">
        <header className="collection-mobile-header">
          <button className="back-button" onClick={onBack} aria-label="Back to collections"><ArrowLeft size={20} /></button>
          <div className="collection-mobile-title"><span className="eyebrow">{course.name}</span><h1>{collection.title}</h1><p>{collection.description}</p></div>
          <span className="collection-note-count"><FileText size={14} /> {notes.length}</span>
        </header>
        <div className="collection-mobile-tabs" role="tablist" aria-label="Collection workspace panels">
          <button className={panel === 'notes' ? 'active' : ''} onClick={() => setPanel('notes')} role="tab">Notes <span>{notes.length}</span></button>
          <button className={panel === 'favorites' ? 'active' : ''} onClick={() => setPanel('favorites')} role="tab"><Star size={14} /> Favorites <span>{favoriteIds.size}</span></button>
          <button className={panel === 'editor' ? 'active' : ''} onClick={() => setPanel('editor')} role="tab">Editor</button>
        </div>
        {(panel === 'notes' || panel === 'favorites') && (
          <section className="collection-notes-panel glass-inner">
            <div className="collection-search-row"><div className="collection-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" aria-label="Search notes" /></div><button className="collection-icon-action" onClick={() => setPanel('editor')} aria-label="Open editor"><Pencil size={17} /></button></div>
            <form className="collection-new-note" onSubmit={addNote}><input value={newNoteName} onChange={(e) => setNewNoteName(e.target.value)} placeholder="New note name" aria-label="New note name" /><button type="submit" aria-label="Create note"><Plus size={18} /></button></form>
            <div className="collection-note-list">
              {visibleNotes.length === 0 ? <div className="collection-empty"><FileText size={24} /><strong>{panel === 'favorites' ? 'No favorite notes' : 'No notes yet'}</strong><span>Create a note or change your search.</span></div> : visibleNotes.map((note, index) => (
                <article className="collection-note-card" key={note.id} onClick={() => selectNote(note)}>
                  <div className="collection-note-number">{String(index + 1).padStart(2, '0')}</div><div className="collection-note-copy"><strong>{note.title || 'Untitled note'}</strong><span>{snippet(note.content) || 'Empty note'}</span></div>
                  <button className="collection-favorite" onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id); }} aria-label={favoriteIds.has(note.id) ? 'Remove from favorites' : 'Add to favorites'}><Star size={17} className={favoriteIds.has(note.id) ? 'favorite-on' : ''} /></button>
                  {onDeleteNote && <button className="collection-delete" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); if (draft?.id === note.id) setDraft(null); }} aria-label="Delete note"><Trash2 size={16} /></button>}
                </article>
              ))}
            </div>
          </section>
        )}
        {panel === 'editor' && (
          <section className="collection-editor-panel glass-inner">
            {!draft ? <div className="collection-editor-empty"><Pencil size={28} /><strong>Select a note to edit</strong><span>Choose a note from Notes, or create a new one.</span><button className="primary-button compact-button" onClick={() => setPanel('notes')}>Browse notes</button></div> : <>
              <div className="collection-editor-toolbar"><button className="collection-toolbar-back" onClick={() => setPanel('notes')} aria-label="Back to notes"><ArrowLeft size={17} /></button><input className="collection-title-input" value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} aria-label="Note title" placeholder="Note title" /><button className="collection-icon-action" onClick={() => toggleFavorite(draft.id)} aria-label="Favorite"><Star size={17} className={favoriteIds.has(draft.id) ? 'favorite-on' : ''} /></button></div>
              <div className="collection-editor-actions"><button onClick={() => { const previous = history[history.length - 1]; if (!previous) return; setRedo((items) => [...items, draft]); setDraft(previous); setHistory((items) => items.slice(0, -1)); }} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button><button onClick={() => { const next = redo[redo.length - 1]; if (!next) return; setHistory((items) => [...items, draft]); setDraft(next); setRedo((items) => items.slice(0, -1)); }} disabled={!redo.length} aria-label="Redo"><Redo2 size={16} /></button><span>Markdown editor</span><button className="editor-save" onClick={saveDraft}><Check size={16} /> Save</button></div>
              <textarea className="collection-editor-textarea" value={draft.content} onChange={(e) => updateDraft({ content: e.target.value })} placeholder="Write your note here…" aria-label="Note content" />
              <div className="collection-preview glass-inner"><div className="preview-label"><Eye size={14} /> Preview</div><div className="collection-preview-body">{draft.content ? draft.content : <span className="muted">Your note preview will appear here.</span>}</div></div>
            </>}
          </section>
        )}
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}
