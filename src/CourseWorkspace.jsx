import { useState } from 'react';
import { BookOpen, FileText, FolderOpen, History, Play, ArrowLeft, ChevronRight } from 'lucide-react';
import './CourseWorkspace.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};

export default function CourseWorkspace({ course, onBack, onCourses, onOpenCollection, onOpenNote, onStudySession, onOverview }) {
  const [view, setView] = useState('workspace');
  const accent = ACCENT[course.color] || ACCENT.sky;
  const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0);
  const collections = course.collections.length;
  const progress = Math.min(100, Math.max(0, course.progress || 0));

  const openCollectionView = () => setView('collections');
  const openNotesView = () => setView('notes');
  const openCollection = (collectionId) => onOpenCollection?.(collectionId);
  const openNote = (collectionId, noteId) => onOpenNote?.(collectionId, noteId);

  const tools = [
    { title: 'Study Session', text: 'Start a focused study session for this course.', icon: <Play size={21} />, onClick: onStudySession },
    { title: 'Collections', text: `${collections} ${collections === 1 ? 'collection' : 'collections'} in this course.`, icon: <FolderOpen size={21} />, onClick: openCollectionView },
    { title: 'All Notes', text: `Open all ${noteCount} ${noteCount === 1 ? 'note' : 'notes'} stored in this course.`, icon: <FileText size={21} />, onClick: openNotesView },
    { title: 'Course Overview', text: 'See this course progress, notes and activity.', icon: <BookOpen size={21} />, onClick: onOverview },
  ];

  if (view === 'collections') {
    return (
      <main className="screen feature-screen course-workspace-screen">
        <section className="full-glass-panel course-workspace-panel">
          <header className="course-workspace-header">
            <button className="back-button" onClick={() => setView('workspace')} aria-label="Back to course folders"><ArrowLeft size={19} /></button>
            <div className="course-workspace-title">
              <span className="eyebrow">{course.name}</span>
              <h1>Collections</h1>
            </div>
            <button className="course-mini-action" onClick={onCourses} aria-label="All courses"><History size={17} /></button>
          </header>

          <div className="course-workspace-section-heading">
            <div><span className="heading-dot" /><h2>Collection folders</h2></div>
            <span>{collections}</span>
          </div>

          <section className="course-workspace-tools" aria-label="Collections">
            {course.collections.map((collection, index) => (
              <button key={collection.id} className="glass-card course-tool-folder" onClick={() => openCollection(collection.id)} style={{ '--course-accent': accent }}>
                <span className="course-tool-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="course-tool-icon"><FolderOpen size={21} /></span>
                <span className="course-tool-copy"><strong>{collection.title}</strong><small>{collection.notes.length} {collection.notes.length === 1 ? 'note' : 'notes'} · Open collection</small></span>
                <span className="course-tool-arrow"><ChevronRight size={19} /></span>
              </button>
            ))}
            {course.collections.length === 0 && <div className="glass-inner empty-state">No collections yet.</div>}
          </section>
        </section>
      </main>
    );
  }

  if (view === 'notes') {
    const notes = course.collections.flatMap((collection) => collection.notes.map((note) => ({ ...note, collectionId: collection.id, collectionTitle: collection.title })));
    return (
      <main className="screen feature-screen course-workspace-screen">
        <section className="full-glass-panel course-workspace-panel">
          <header className="course-workspace-header">
            <button className="back-button" onClick={() => setView('workspace')} aria-label="Back to course folders"><ArrowLeft size={19} /></button>
            <div className="course-workspace-title">
              <span className="eyebrow">{course.name}</span>
              <h1>All Notes</h1>
            </div>
            <button className="course-mini-action" onClick={onCourses} aria-label="All courses"><History size={17} /></button>
          </header>

          <div className="course-workspace-section-heading">
            <div><span className="heading-dot" /><h2>Every note</h2></div>
            <span>{notes.length}</span>
          </div>

          <section className="course-workspace-tools" aria-label="All course notes">
            {notes.map((note, index) => (
              <button key={note.id} className="glass-card course-tool-folder" onClick={() => openNote(note.collectionId, note.id)} style={{ '--course-accent': accent }}>
                <span className="course-tool-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="course-tool-icon"><FileText size={21} /></span>
                <span className="course-tool-copy"><strong>{note.title}</strong><small>{note.collectionTitle} · Open note</small></span>
                <span className="course-tool-arrow"><ChevronRight size={19} /></span>
              </button>
            ))}
            {notes.length === 0 && <div className="glass-inner empty-state">No notes yet.</div>}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="screen feature-screen course-workspace-screen">
      <section className="full-glass-panel course-workspace-panel">
        <header className="course-workspace-header">
          <button className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
          <div className="course-workspace-title">
            <span className="eyebrow">Course workspace</span>
            <h1>{course.name}</h1>
          </div>
          <button className="course-mini-action" onClick={onCourses} aria-label="All courses"><History size={17} /></button>
        </header>

        <section className="course-workspace-hero glass-card" style={{ '--course-accent': accent }}>
          <span className="course-workspace-icon"><FolderOpen size={26} /></span>
          <div className="course-workspace-copy">
            <div className="course-workspace-title-row">
              <h2>{course.name}</h2>
              <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
            </div>
            <p>{course.description}</p>
            <span className="course-workspace-badge">{course.color}</span>
          </div>
        </section>

        <section className="course-workspace-progress glass-inner">
          <div className="course-workspace-progress-heading"><span>Progress</span><strong>{progress}%</strong></div>
          <div className="course-workspace-progress-track"><span style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, #bd86ff)` }} /></div>
          <div className="course-workspace-progress-meta"><span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span><span>{collections} {collections === 1 ? 'collection' : 'collections'}</span></div>
        </section>

        <div className="course-workspace-section-heading">
          <div><span className="heading-dot" /><h2>Course tools</h2></div>
          <span>4 folders</span>
        </div>

        <section className="course-workspace-tools" aria-label="Course tools">
          {tools.map((tool, index) => <button key={tool.title} className="glass-card course-tool-folder" onClick={tool.onClick} style={{ '--course-accent': accent }}>
            <span className="course-tool-index">0{index + 1}</span>
            <span className="course-tool-icon">{tool.icon}</span>
            <span className="course-tool-copy"><strong>{tool.title}</strong><small>{tool.text}</small></span>
            <span className="course-tool-arrow">›</span>
          </button>)}
        </section>
      </section>
    </main>
  );
}
