import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, FolderOpen, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import './CourseWorkspace.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};

export default function CourseWorkspace({ course, onBack, onCourses, onOpenCollection, onOpenNote, onUpdateCourse, onDelete, onMore }) {
  const [tab, setTab] = useState('notes');
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(course.name);
  const [draftDescription, setDraftDescription] = useState(course.description);
  const accent = ACCENT[course.color] || ACCENT.sky;
  const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0);
  const collections = course.collections.length;
  const notes = useMemo(() => course.collections.flatMap((collection) => collection.notes.map((note) => ({ ...note, collectionId: collection.id, collectionTitle: collection.title }))), [course.collections]);

  useEffect(() => {
    setDraftName(course.name);
    setDraftDescription(course.description);
  }, [course.name, course.description]);

  const saveEdit = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    onUpdateCourse({ name, description: draftDescription.trim() || 'New course workspace' });
    setEditOpen(false);
  };

  return (
    <main className="screen feature-screen course-details-screen">
      <section className="full-glass-panel course-details-panel">
        <header className="course-details-header">
          <button className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
          <div className="course-details-title"><span className="eyebrow">Course workspace</span><h1>Course Details</h1></div>
          <div className="course-header-actions">
            <button className="icon-button" onClick={() => setEditOpen(true)} aria-label="Edit course"><Pencil size={17} /></button>
            <button className="icon-button" onClick={onMore} aria-label="More course actions"><MoreHorizontal size={19} /></button>
          </div>
        </header>

        <section className="course-hero glass-card" style={{ '--course-accent': accent }}>
          <span className="course-detail-icon"><FolderOpen size={27} /></span>
          <div className="course-hero-copy">
            <div className="course-hero-title-row"><h2>{course.name}</h2><span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span></div>
            <p>{course.description}</p>
            <span className="course-detail-badge">{course.color}</span>
          </div>
        </section>

        <section className="course-progress-card glass-inner">
          <div className="course-progress-heading"><span>Progress</span><strong>{course.progress ? `${course.progress}%` : '0%'}</strong></div>
          <div className="course-progress-track"><span style={{ width: `${Math.min(100, Math.max(0, course.progress || 0))}%`, background: `linear-gradient(90deg, ${accent}, #bd86ff)` }} /></div>
          <div className="course-progress-meta"><span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span><span>{collections} {collections === 1 ? 'collection' : 'collections'}</span></div>
        </section>

        <div className="course-content-tabs" role="tablist" aria-label="Course content">
          <button role="tab" aria-selected={tab === 'notes'} className={tab === 'notes' ? 'tab-active' : ''} onClick={() => setTab('notes')}>Notes</button>
          <button role="tab" aria-selected={tab === 'collections'} className={tab === 'collections' ? 'tab-active' : ''} onClick={() => setTab('collections')}>Collections</button>
        </div>

        {tab === 'notes' ? (
          <section className="course-detail-list">
            {notes.map((note) => <button className="course-detail-row glass-card" key={`${note.collectionId}-${note.id}`} onClick={() => onOpenNote(note.collectionId, note.id)}><span className="detail-row-icon"><FileText size={18} /></span><span className="detail-row-copy"><strong>{note.title}</strong><small>{note.collectionTitle}</small></span><ChevronRight size={17} /></button>)}
            {!notes.length && <div className="empty-state glass-inner">No notes yet. Open Collections to create your first note.</div>}
          </section>
        ) : (
          <section className="course-detail-list">
            {course.collections.map((collection) => <button className="course-detail-row glass-card" key={collection.id} onClick={() => onOpenCollection(collection.id)}><span className="detail-row-icon collection-row-icon"><FolderOpen size={18} /></span><span className="detail-row-copy"><strong>{collection.title}</strong><small>{collection.notes.length} {collection.notes.length === 1 ? 'note' : 'notes'}</small></span><ChevronRight size={17} /></button>)}
            {!course.collections.length && <div className="empty-state glass-inner">No collections yet. Use the action below to create one.</div>}
          </section>
        )}

        <button className="course-manage-button glass-card" onClick={() => onOpenCollection(course.collections[0]?.id)} disabled={!course.collections[0]}><span className="action-icon"><Plus size={18} /></span><span><strong>Manage Collections</strong><small>Organize notes and add new study groups.</small></span><ChevronRight size={17} /></button>
        <MobileCourseNav active="courses" onHome={onBack} onCourses={onCourses} onCollections={() => course.collections[0] && onOpenCollection(course.collections[0].id)} onNotes={() => setTab('notes')} onMore={onMore} />

        {editOpen && <div className="modal-backdrop" onClick={() => setEditOpen(false)}><section className="glass-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditOpen(false)} aria-label="Close"><MoreHorizontal size={18} /></button><span className="modal-symbol"><Pencil size={20} /></span><h2>Edit course</h2><p>Update the course identity without changing its notes or collections.</p><form className="course-edit-form" onSubmit={saveEdit}><label><span>Course name</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} required autoFocus /></label><label><span>Description</span><textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} rows={3} /></label><div className="course-form-actions"><button type="button" className="secondary-button" onClick={() => setEditOpen(false)}>Cancel</button><button type="submit" className="primary-button">Save changes</button></div></form><button className="course-danger-button" onClick={() => { setEditOpen(false); onDelete(); }}><Trash2 size={15} /> Delete course</button></section></div>}
      </section>
    </main>
  );
}

function MobileCourseNav({ active, onHome, onCourses, onCollections, onNotes, onMore }) {
  const items = [
    ['home', 'Home', onHome], ['courses', 'Courses', onCourses], ['collections', 'Collections', onCollections], ['notes', 'Notes', onNotes], ['more', 'More', onMore],
  ];
  return <nav className="course-mobile-nav" aria-label="Course navigation">{items.map(([key, label, handler]) => <button key={key} className={active === key ? 'nav-active' : ''} onClick={handler}><span>{key === 'home' ? '⌂' : key === 'courses' ? '▣' : key === 'collections' ? '▥' : key === 'notes' ? '▤' : '•••'}</span><small>{label}</small></button>)}</nav>;
}
