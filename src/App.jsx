import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import { DEFAULT_COURSE } from './courseDefaults.js';

const ICON = '/icon.svg';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';

const INITIAL_COLLECTIONS = [
  { id: 'collection-1', title: 'Getting Started', description: 'Your first collection for organizing study notes.', notes: [
    { id: 'note-1', title: 'Welcome to your notes', content: 'Capture ideas, key points, and study material here.' },
    { id: 'note-2', title: 'Getting started', content: 'Your first note is ready. Open it when you want to begin.' },
  ]},
  { id: 'collection-2', title: 'Quick Thoughts', description: 'Keep important thoughts close while you study.', notes: [
    { id: 'note-3', title: 'Quick thoughts', content: 'Keep important thoughts close while you study.' },
  ]},
];

export default function App() {
  const [session, setSession] = useState(null);
  const [skippedAuth, setSkippedAuth] = useState(() => {
    try { return window.localStorage.getItem(SKIP_AUTH_KEY) === 'true'; } catch { return false; }
  });
  const [page, setPage] = useState('workspace');
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [collections, setCollections] = useState(INITIAL_COLLECTIONS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [editorContent, setEditorContent] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const signIn = async (event) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Signed in successfully.');
    if (!error) { try { window.localStorage.removeItem(SKIP_AUTH_KEY); } catch {} setSkippedAuth(false); setPage('workspace'); }
    setBusy(false);
  };
  const signUp = async () => {
    if (!supabase) return; setBusy(true); setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled.'); setBusy(false);
  };
  const signInWithGoogle = async () => {
    if (!supabase) return; setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } });
    if (error) { setMessage(error.message); setBusy(false); }
  };
  const skipForNow = () => {
    try { window.localStorage.setItem(SKIP_AUTH_KEY, 'true'); } catch {}
    setSkippedAuth(true); setPage('workspace');
  };
  const returnToLogin = () => {
    try { window.localStorage.removeItem(SKIP_AUTH_KEY); } catch {}
    setSkippedAuth(false); setMessage(''); setPage('workspace');
  };

  const openCourse = () => { setMessage(''); setPage('collections'); };
  const openCollection = (collectionId) => { setSelectedCollectionId(collectionId); setSelectedNoteId(null); setMessage(''); setPage('notes'); };
  const openNote = (noteId) => {
    const collection = collections.find((item) => item.id === selectedCollectionId);
    const note = collection?.notes.find((item) => item.id === noteId);
    setSelectedNoteId(noteId); setEditorContent(note?.content || ''); setMessage(''); setPage('editor');
  };
  const addCollection = (event) => {
    event.preventDefault(); const title = newCollectionName.trim(); if (!title) return;
    setCollections((current) => [...current, { id: `collection-${Date.now()}`, title, description: 'New collection', notes: [] }]);
    setNewCollectionName(''); setMessage('Collection created.');
  };
  const addNote = (event) => {
    event.preventDefault(); const title = newNoteName.trim(); if (!title || !selectedCollectionId) return;
    const noteId = `note-${Date.now()}`;
    setCollections((current) => current.map((collection) => collection.id === selectedCollectionId
      ? { ...collection, notes: [...collection.notes, { id: noteId, title, content: '' }] } : collection));
    setNewNoteName(''); setSelectedNoteId(noteId); setEditorContent(''); setMessage('Note created.'); setPage('editor');
  };
  const saveNote = () => {
    if (!selectedCollectionId || !selectedNoteId) return;
    setCollections((current) => current.map((collection) => collection.id === selectedCollectionId
      ? { ...collection, notes: collection.notes.map((note) => note.id === selectedNoteId ? { ...note, content: editorContent } : note) } : collection));
    setMessage('Note saved.');
  };

  if (loading) return <main className="screen"><div className="glass-card"><p>Loading your workspace…</p></div></main>;
  if (session) return <main className="screen"><section className="glass-card welcome-card"><img className="app-icon" src={ICON} alt="Liquid Glass Studio" /><span className="eyebrow">Liquid Glass Studio</span><h1>Mobile foundation</h1><p>You are signed in. The mobile feature layers will be added one at a time.</p><button className="secondary-button" onClick={() => supabase.auth.signOut()}>Sign out</button></section></main>;

  if (skippedAuth) {
    if (page === 'editor') {
      const collection = collections.find((item) => item.id === selectedCollectionId);
      const note = collection?.notes.find((item) => item.id === selectedNoteId);
      return <main className="screen feature-screen"><section className="full-glass-panel editor-panel">
        <header className="feature-header"><button className="back-button" onClick={() => setPage('notes')} aria-label="Back to notes">‹</button><div><span className="eyebrow">{collection?.title}</span><h1>{note?.title || 'New note'}</h1></div><button className="save-button" onClick={saveNote}>Save</button></header>
        <div className="editor-layout"><section className="editor-surface glass-inner"><span className="section-label">Editor</span><textarea value={editorContent} onChange={(event) => setEditorContent(event.target.value)} placeholder="Write your note here…" aria-label="Note editor" /></section><section className="preview-surface glass-inner"><span className="section-label">Preview</span><article className="note-preview">{editorContent ? <p>{editorContent}</p> : <p className="empty-preview">Your note preview will appear here.</p>}</article></section></div>
        {message && <p className="message" role="status">{message}</p>}
      </section></main>;
    }

    if (page === 'notes') {
      const collection = collections.find((item) => item.id === selectedCollectionId);
      return <main className="screen feature-screen"><section className="full-glass-panel collection-panel">
        <header className="feature-header centered-header"><button className="back-button header-back" onClick={() => setPage('collections')} aria-label="Back to collections">‹</button><div className="header-title"><span className="eyebrow">{collection?.title}</span><h1>Notes</h1></div></header>
        <form className="top-action-form" onSubmit={addNote}><input value={newNoteName} onChange={(event) => setNewNoteName(event.target.value)} placeholder="New note name" aria-label="New note name" /><button className="primary-button compact-button" type="submit">+ New note</button></form>
        <div className="notes-list">{collection?.notes.length ? collection.notes.map((note, index) => <button className="glass-list-item" key={note.id} onClick={() => openNote(note.id)}><span className="list-index">{String(index + 1).padStart(2, '0')}</span><span className="list-copy"><strong>{note.title}</strong><span>{note.content || 'Empty note — open to start writing.'}</span></span><span className="list-arrow">›</span></button>) : <div className="empty-state glass-inner"><strong>No notes yet</strong><span>Create your first note above.</span></div>}</div>
        {message && <p className="message" role="status">{message}</p>}
      </section></main>;
    }

    if (page === 'collections') return <main className="screen feature-screen"><section className="full-glass-panel collection-panel">
      <header className="feature-header centered-header"><button className="back-button header-back" onClick={() => setPage('workspace')} aria-label="Back to courses">‹</button><div className="header-title"><span className="eyebrow">{DEFAULT_COURSE.title}</span><h1>Collections</h1></div></header>
      <form className="top-action-form" onSubmit={addCollection}><input value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="New collection name" aria-label="New collection name" /><button className="primary-button compact-button" type="submit">+ New collection</button></form>
      <div className="collections-list">{collections.map((collection, index) => <button className="glass-list-item collection-item" key={collection.id} onClick={() => openCollection(collection.id)}><span className="list-index">{String(index + 1).padStart(2, '0')}</span><span className="list-copy"><strong>{collection.title}</strong><span>{collection.description}</span></span><span className="collection-count">{collection.notes.length} {collection.notes.length === 1 ? 'note' : 'notes'}</span><span className="list-arrow">›</span></button>)}</div>
      {message && <p className="message" role="status">{message}</p>}
    </section></main>;

    return <main className="screen"><section className="workspace-page"><div className="workspace-welcome glass-card"><div><span className="eyebrow">Liquid Glass Studio</span><h1>Welcome</h1><p>Start building your learning workspace. Add a course whenever you are ready.</p></div><button className="primary-button add-course-button" onClick={() => setMessage('Course creation will be added next.')}>+ Add new course</button>{message && <p className="message" role="status">{message}</p>}</div><div className="course-grid"><button className="glass-card course-card course-card-button" onClick={openCourse}><span className="course-label">Course</span><h2>{DEFAULT_COURSE.title}</h2><p>{DEFAULT_COURSE.subtitle}</p><div className="course-meta"><span>{DEFAULT_COURSE.progress}% complete</span><span>Open course ›</span></div><div className="progress-track"><span style={{ width: `${DEFAULT_COURSE.progress}%` }} /></div></button></div><button className="link-button workspace-signin" onClick={returnToLogin}>Sign in</button></section></main>;
  }

  return <main className="screen"><section className="glass-card auth-card"><div className="brand"><img className="app-icon" src={ICON} alt="Liquid Glass Studio" /><div><span className="eyebrow">Liquid Glass Studio</span><h1>Welcome back</h1></div></div><p className="subtitle">Sign in to your mobile workspace.</p>{!isSupabaseConfigured && <div className="notice">Supabase is not configured yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your project values locally.</div>}<form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label><button className="primary-button" disabled={busy || !supabase}>{busy ? 'Working…' : 'Sign in'}</button></form><button className="google-button" onClick={signInWithGoogle} disabled={busy || !supabase}>Continue with Google</button><button className="link-button" onClick={signUp} disabled={busy || !supabase}>Create an account</button><button className="link-button skip-button" onClick={skipForNow} disabled={busy}>Skip for now</button>{message && <p className="message" role="status">{message}</p>}</section></main>;
}
