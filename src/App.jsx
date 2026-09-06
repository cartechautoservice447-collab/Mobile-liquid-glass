import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Folder, History, Moon, Plus, Settings2, Sparkles, Timer, Trash2, User, X, Zap } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import { DEFAULT_COURSE } from './courseDefaults.js';
import CourseWorkspace from './CourseWorkspace.jsx';

const ICON = '/icon.svg';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';
const PERFORMANCE_KEY = 'mobile-liquid-glass-performance';
const COURSE_ACCENTS = [
  { name: 'sky', value: '#72d7ff' }, { name: 'violet', value: '#bd86ff' }, { name: 'amber', value: '#ffd166' },
  { name: 'emerald', value: '#67e8b1' }, { name: 'rose', value: '#ff88a8' }, { name: 'cyan', value: '#65e6ff' },
];
const INITIAL_COURSES = [{
  id: DEFAULT_COURSE.id, name: DEFAULT_COURSE.title, description: DEFAULT_COURSE.subtitle, color: 'sky', progress: DEFAULT_COURSE.progress,
  collections: [
    { id: 'collection-1', title: 'Getting Started', description: 'Your first collection for organizing study notes.', notes: [
      { id: 'note-1', title: 'Welcome to your notes', content: 'Capture ideas, key points, and study material here.' },
      { id: 'note-2', title: 'Getting started', content: 'Your first note is ready. Open it when you want to begin.' },
    ]},
    { id: 'collection-2', title: 'Quick Thoughts', description: 'Keep important thoughts close while you study.', notes: [
      { id: 'note-3', title: 'Quick thoughts', content: 'Keep important thoughts close while you study.' },
    ]},
  ],
}];

export default function App() {
  const [session, setSession] = useState(null);
  const [skippedAuth, setSkippedAuth] = useState(() => localStorage.getItem(SKIP_AUTH_KEY) === 'true');
  const [page, setPage] = useState('workspace');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [courses, setCourses] = useState(INITIAL_COURSES);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('sky');
  const [courseCreateOpen, setCourseCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [performance, setPerformance] = useState(() => localStorage.getItem(PERFORMANCE_KEY) === 'ultra' ? 'ultra' : 'high');
  const [action, setAction] = useState(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const selectedCourse = useMemo(() => courses.find((course) => course.id === selectedCourseId) || null, [courses, selectedCourseId]);
  const selectedCollection = useMemo(() => selectedCourse?.collections.find((collection) => collection.id === selectedCollectionId) || null, [selectedCourse, selectedCollectionId]);
  const selectedNote = useMemo(() => selectedCollection?.notes.find((note) => note.id === selectedNoteId) || null, [selectedCollection, selectedNoteId]);
  const totalNotes = courses.reduce((sum, course) => sum + course.collections.reduce((inner, collection) => inner + collection.notes.length, 0), 0);

  const signIn = async (event) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Signed in successfully.');
    if (!error) { localStorage.removeItem(SKIP_AUTH_KEY); setSkippedAuth(false); setPage('workspace'); }
    setBusy(false);
  };
  const signUp = async () => { if (!supabase) return; setBusy(true); setMessage(''); const { error } = await supabase.auth.signUp({ email, password }); setMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled.'); setBusy(false); };
  const signInWithGoogle = async () => { if (!supabase) return; setBusy(true); setMessage(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } }); if (error) { setMessage(error.message); setBusy(false); } };
  const skipForNow = () => { localStorage.setItem(SKIP_AUTH_KEY, 'true'); setSkippedAuth(true); setPage('workspace'); };
  const returnToLogin = () => { localStorage.removeItem(SKIP_AUTH_KEY); setSkippedAuth(false); setMessage(''); setPage('workspace'); };
  const setPerformanceMode = (mode) => { setPerformance(mode); localStorage.setItem(PERFORMANCE_KEY, mode); };

  const openCourse = (id) => { setSelectedCourseId(id); setSelectedCollectionId(null); setSelectedNoteId(null); setPage('course-workspace'); setMessage(''); };
  const openCollection = (id) => { setSelectedCollectionId(id); setSelectedNoteId(null); setPage('notes'); setMessage(''); };
  const openNote = (id) => { const note = selectedCollection?.notes.find((item) => item.id === id); setSelectedNoteId(id); setEditorContent(note?.content || ''); setPage('editor'); setMessage(''); };
  const openCourseCreator = () => { setNewCourseName(''); setNewCourseDescription(''); setNewCourseColor('sky'); setMessage(''); setCourseCreateOpen(true); };
  const closeCourseCreator = () => { setCourseCreateOpen(false); setNewCourseName(''); setNewCourseDescription(''); setNewCourseColor('sky'); };
  const addCourse = (event) => {
    event.preventDefault(); const name = newCourseName.trim(); if (!name) return;
    const description = newCourseDescription.trim() || 'New course workspace';
    setCourses((current) => [...current, { id: `course-${Date.now()}`, name, description, color: newCourseColor, progress: 0, collections: [] }]);
    closeCourseCreator(); setMessage('Course created.');
  };
  const deleteCourse = (id) => { setCourses((current) => current.filter((course) => course.id !== id)); setMessage('Course deleted.'); };
  const addCollection = (event) => {
    event.preventDefault(); const title = newCollectionName.trim(); if (!title || !selectedCourseId) return;
    setCourses((current) => current.map((course) => course.id === selectedCourseId ? { ...course, collections: [...course.collections, { id: `collection-${Date.now()}`, title, description: 'New collection', notes: [] }] } : course));
    setNewCollectionName(''); setMessage('Collection created.');
  };
  const addNote = (event) => {
    event.preventDefault(); const title = newNoteName.trim(); if (!title || !selectedCourseId || !selectedCollectionId) return;
    const noteId = `note-${Date.now()}`;
    setCourses((current) => current.map((course) => course.id !== selectedCourseId ? course : { ...course, collections: course.collections.map((collection) => collection.id !== selectedCollectionId ? collection : { ...collection, notes: [...collection.notes, { id: noteId, title, content: '' }] }) }));
    setNewNoteName(''); setSelectedNoteId(noteId); setEditorContent(''); setPage('editor'); setMessage('Note created.');
  };
  const saveNote = () => {
    if (!selectedCourseId || !selectedCollectionId || !selectedNoteId) return;
    setCourses((current) => current.map((course) => course.id !== selectedCourseId ? course : { ...course, collections: course.collections.map((collection) => collection.id !== selectedCollectionId ? collection : { ...collection, notes: collection.notes.map((note) => note.id === selectedNoteId ? { ...note, content: editorContent } : note) }) }));
    setMessage('Note saved.');
  };

  if (loading) return <main className="screen"><div className="glass-card loading-card">Loading your workspace…</div></main>;
  if (!session && !skippedAuth) return <AuthScreen email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} signIn={signIn} signUp={signUp} signInWithGoogle={signInWithGoogle} skipForNow={skipForNow} />;
  if (page === 'course-workspace' && selectedCourse) return <CourseWorkspace course={selectedCourse} totalNotes={totalNotes} onBack={() => setPage('workspace')} onCollections={() => setPage('collections')} onNotes={() => setPage('course-notes')} onStudySession={() => setAction('study')} onPomodoro={() => setAction('pomodoro')} onOverview={() => setAction('overview')} />;
  if (page === 'editor' && selectedCourse && selectedCollection) return <EditorPage course={selectedCourse} collection={selectedCollection} note={selectedNote} content={editorContent} setContent={setEditorContent} onBack={() => setPage('notes')} onSave={saveNote} message={message} />;
  if (page === 'notes' && selectedCourse && selectedCollection) return <NotesPage course={selectedCourse} collection={selectedCollection} newNoteName={newNoteName} setNewNoteName={setNewNoteName} addNote={addNote} onBack={() => setPage('collections')} openNote={openNote} message={message} />;
  if (page === 'course-notes' && selectedCourse) return <AllCourseNotesPage course={selectedCourse} onBack={() => setPage('course-workspace')} openCollection={openCollection} />;
  if (page === 'collections' && selectedCourse) return <CollectionsPage course={selectedCourse} newCollectionName={newCollectionName} setNewCollectionName={setNewCollectionName} addCollection={addCollection} onBack={() => setPage('course-workspace')} openCollection={openCollection} message={message} />;
  return <Dashboard courses={courses} totalNotes={totalNotes} performance={performance} setPerformanceMode={setPerformanceMode} openCourseCreator={openCourseCreator} openCourse={openCourse} deleteCourse={deleteCourse} action={action} setAction={setAction} message={message} courseCreateOpen={courseCreateOpen} closeCourseCreator={closeCourseCreator} newCourseName={newCourseName} newCourseDescription={newCourseDescription} newCourseColor={newCourseColor} setNewCourseName={setNewCourseName} setNewCourseDescription={setNewCourseDescription} setNewCourseColor={setNewCourseColor} addCourse={addCourse} onLogout={session ? () => supabase?.auth.signOut() : returnToLogin} />;
}

function AuthScreen({ email, password, setEmail, setPassword, busy, message, signIn, signUp, signInWithGoogle, skipForNow }) {
  return <main className="screen"><section className="glass-card auth-card"><div className="brand"><img className="app-icon" src={ICON} alt="Liquid Glass Studio" /><div><span className="eyebrow">Liquid Glass Studio</span><h1>Welcome back</h1></div></div><p className="subtitle">Sign in to your mobile workspace.</p>{!isSupabaseConfigured && <div className="notice">Supabase is not configured yet. Add your Vite public Supabase values to the environment before signing in.</div>}<form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label><button className="primary-button" disabled={busy || !supabase}>{busy ? 'Working…' : 'Sign in'}</button></form><button className="google-button" onClick={signInWithGoogle} disabled={busy || !supabase}>Continue with Google</button><button className="link-button" onClick={signUp} disabled={busy || !supabase}>Create an account</button><button className="link-button skip-button" onClick={skipForNow} disabled={busy}>Skip for now</button>{message && <p className="message">{message}</p>}</section></main>;
}

function Dashboard({ courses, totalNotes, performance, setPerformanceMode, openCourseCreator, openCourse, deleteCourse, action, setAction, message, courseCreateOpen, closeCourseCreator, newCourseName, newCourseDescription, newCourseColor, setNewCourseName, setNewCourseDescription, setNewCourseColor, addCourse, onLogout }) {
  return <main className="screen dashboard-screen"><section className="dashboard-shell"><header className="dashboard-header glass-card"><div className="dashboard-copy"><span className="eyebrow">Liquid Glass Studio</span><h1>Welcome back!</h1><p>Select a course folder to access your workspace</p></div><div className="dashboard-controls"><div className="performance-control glass-inner"><Zap size={15} /><span>Performance</span><button className={performance === 'high' ? 'toggle-active' : ''} onClick={() => setPerformanceMode('high')}>High</button><button className={performance === 'ultra' ? 'toggle-active' : ''} onClick={() => setPerformanceMode('ultra')}>Ultra</button></div><button className="icon-button" onClick={() => setAction('theme')} aria-label="Theme"><Moon size={18} /></button><button className="icon-button" onClick={() => setAction('settings')} aria-label="Settings"><Settings2 size={18} /></button><button className="icon-button" onClick={onLogout} aria-label="Account"><User size={18} /></button></div></header><div className="quick-actions"><ActionCard icon={<BookOpen size={22} />} title="Study Hub" text="CS50 lectures" onClick={() => setAction('study')} /><ActionCard icon={<Timer size={22} />} title="Pomodoro" text="Focus, breaks & Study Session" onClick={() => setAction('pomodoro')} /><ActionCard icon={<History size={22} />} title="Overview" text="All study tools and progress" onClick={() => setAction('overview')} /></div><div className="section-heading"><div><span className="heading-dot" /><h2>Course Folders</h2></div><span className="note-total">{totalNotes} total notes</span></div><button className="glass-card add-course-trigger" type="button" onClick={openCourseCreator}><span className="add-course-symbol"><Plus size={20} /></span><span><strong>Add New Course</strong><small>Create a course folder and customize its details.</small></span><span className="action-arrow">›</span></button><div className="course-grid">{courses.map((course) => <CourseDashboardCard key={course.id} course={course} onOpen={() => openCourse(course.id)} onDelete={() => deleteCourse(course.id)} />)}</div>{message && <p className="message">{message}</p>}{action && <ActionModal action={action} close={() => setAction(null)} />}{courseCreateOpen && <CourseCreateModal close={closeCourseCreator} name={newCourseName} description={newCourseDescription} color={newCourseColor} setName={setNewCourseName} setDescription={setNewCourseDescription} setColor={setNewCourseColor} submit={addCourse} />}</section></main>;
}
function ActionCard({ icon, title, text, onClick }) { return <button className="glass-card action-card" onClick={onClick}><span className="action-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><span className="action-arrow">›</span></button>; }
function CourseDashboardCard({ course, onOpen, onDelete }) { const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0); return <article className="glass-card course-dashboard-card"><button className="course-open" onClick={onOpen}><div className="course-top"><span className="folder-icon"><Folder size={20} /></span><span className="note-pill"><FileText size={12} />{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span></div><div className="course-copy"><h3>{course.name}</h3><span className="course-color">{course.color}</span><p>{course.description}</p></div><div className="course-footer"><span>{course.progress ? `${course.progress}% complete` : 'No notes yet'}</span><span>Open course ›</span></div></button><button className="delete-course" onClick={(event) => { event.stopPropagation(); if (window.confirm(`Delete ${course.name}?`)) onDelete(); }} aria-label={`Delete ${course.name}`}><Trash2 size={15} /></button></article>; }
function CourseCreateModal({ close, name, description, color, setName, setDescription, setColor, submit }) {
  return <div className="modal-backdrop" onClick={close}><section className="glass-modal course-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={close} aria-label="Close"><X size={18} /></button><span className="modal-symbol"><Plus size={22} /></span><h2>New course</h2><p>Fill in your course details, then confirm to create the course card.</p><form onSubmit={submit} className="course-create-form"><label><span>Course name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Organic Chemistry II" autoFocus required /></label><label><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What's this course about?" rows={3} /></label><div className="course-form-row"><span className="course-form-label">Accent color</span><div className="accent-options">{COURSE_ACCENTS.map((accent) => <button key={accent.name} type="button" aria-label={accent.name} onClick={() => setColor(accent.name)} className={`accent-swatch ${color === accent.name ? 'accent-selected' : ''}`} style={{ backgroundColor: accent.value }} />)}</div></div><div className="course-form-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button type="submit" className="primary-button" disabled={!name.trim()}>Confirm & Save</button></div></form></section></div>;
}
function ActionModal({ action, close }) { const details = { study: ['Study Hub', 'CS50 lectures and study workspace will open here.'], pomodoro: ['Pomodoro', 'Focus, short break, long break and Study Session controls will open here.'], overview: ['Overview', 'Your study tools, progress and activity overview will appear here.'], theme: ['Theme', 'Liquid Glass appearance controls will be available here.'], settings: ['Engine Settings', 'Liquid density, gel, bounce and display controls will be available here.'] }[action]; return <div className="modal-backdrop" onClick={close}><section className="glass-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={close} aria-label="Close"><X size={18} /></button><span className="modal-symbol"><Sparkles size={22} /></span><h2>{details[0]}</h2><p>{details[1]}</p><button className="primary-button" onClick={close}>Close</button></section></div>; }
function CollectionsPage({ course, newCollectionName, setNewCollectionName, addCollection, onBack, openCollection, message }) { return <main className="screen feature-screen"><section className="full-glass-panel"><header className="feature-header centered-header"><button className="back-button" onClick={onBack} aria-label="Back">‹</button><div className="header-title"><span className="eyebrow">{course.name}</span><h1>Collections</h1></div></header><form className="top-action-form" onSubmit={addCollection}><input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="New collection name" /><button className="primary-button compact-button">+ New collection</button></form><div className="collections-list">{course.collections.map((collection, index) => <button className="glass-list-item" key={collection.id} onClick={() => openCollection(collection.id)}><span className="list-index">{String(index + 1).padStart(2, '0')}</span><span className="list-copy"><strong>{collection.title}</strong><span>{collection.description}</span></span><span className="collection-count">{collection.notes.length} notes</span><span className="list-arrow">›</span></button>)}</div>{message && <p className="message">{message}</p>}</section></main>; }
function NotesPage({ course, collection, newNoteName, setNewNoteName, addNote, onBack, openNote, message }) { return <main className="screen feature-screen"><section className="full-glass-panel"><header className="feature-header centered-header"><button className="back-button" onClick={onBack} aria-label="Back">‹</button><div className="header-title"><span className="eyebrow">{course.name} · {collection.title}</span><h1>Notes</h1></div></header><form className="top-action-form" onSubmit={addNote}><input value={newNoteName} onChange={(e) => setNewNoteName(e.target.value)} placeholder="New note name" /><button className="primary-button compact-button">+ New note</button></form><div className="notes-list">{collection.notes.map((note, index) => <button className="glass-list-item" key={note.id} onClick={() => openNote(note.id)}><span className="list-index">{String(index + 1).padStart(2, '0')}</span><span className="list-copy"><strong>{note.title}</strong><span>{note.content || 'Empty note — open to start writing.'}</span></span><span className="list-arrow">›</span></button>)}{collection.notes.length === 0 && <div className="empty-state glass-inner">No notes yet. Create your first note above.</div>}</div>{message && <p className="message">{message}</p>}</section></main>; }
function AllCourseNotesPage({ course, onBack, openCollection }) { const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0); return <main className="screen feature-screen"><section className="full-glass-panel"><header className="feature-header centered-header"><button className="back-button" onClick={onBack} aria-label="Back">‹</button><div className="header-title"><span className="eyebrow">{course.name}</span><h1>All Notes</h1></div></header><div className="section-heading course-section-heading"><div><span className="heading-dot" /><h2>Course notes</h2></div><span className="note-total">{noteCount} total</span></div><div className="notes-list">{course.collections.map((collection, index) => <button className="glass-list-item" key={collection.id} onClick={() => openCollection(collection.id)}><span className="list-index">{String(index + 1).padStart(2, '0')}</span><span className="list-copy"><strong>{collection.title}</strong><span>{collection.notes.length} notes · Open collection</span></span><span className="collection-count">{collection.notes.length}</span><span className="list-arrow">›</span></button>)}{course.collections.length === 0 && <div className="empty-state glass-inner">No collections yet. Open Collections to create one.</div>}</div></section></main>; }
function EditorPage({ course, collection, note, content, setContent, onBack, onSave, message }) { return <main className="screen feature-screen"><section className="full-glass-panel editor-panel"><header className="feature-header"><button className="back-button" onClick={onBack} aria-label="Back">‹</button><div><span className="eyebrow">{course.name} · {collection.title}</span><h1>{note?.title || 'New note'}</h1></div><button className="primary-button compact-button" onClick={onSave}>Save</button></header><div className="editor-layout"><section className="editor-surface glass-inner"><span className="section-label">Editor</span><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note here…" /></section><section className="preview-surface glass-inner"><span className="section-label">Preview</span><article className="note-preview">{content ? <p>{content}</p> : <p className="empty-preview">Your note preview will appear here.</p>}</article></section></div>{message && <p className="message">{message}</p>}</section></main>; }
