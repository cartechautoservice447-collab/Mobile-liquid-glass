import { useMemo, useState } from 'react';
import { ArrowLeft, FileText, Folder, Plus, Search } from 'lucide-react';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};

export default function CourseFolderPage({ courses, onBack, onOpenCourse, onAddCourse, onHome, onCollections, onNotes, onMore }) {
  const [query, setQuery] = useState('');
  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => `${course.name} ${course.description}`.toLowerCase().includes(normalized));
  }, [courses, query]);

  return (
    <main className="screen feature-screen course-folder-screen">
      <section className="full-glass-panel course-folder-panel">
        <header className="feature-header course-folder-header">
          <button className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
          <div className="header-title">
            <span className="eyebrow">Course library</span>
            <h1>Course Folders</h1>
            <p>{courses.length} {courses.length === 1 ? 'course' : 'courses'} · {courses.reduce((sum, course) => sum + course.collections.reduce((inner, collection) => inner + collection.notes.length, 0), 0)} notes</p>
          </div>
          <button className="folder-add-button" onClick={onAddCourse} aria-label="Add new course"><Plus size={20} /></button>
        </header>

        <label className="course-search glass-inner">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses…" aria-label="Search courses" />
        </label>

        <div className="course-folder-list">
          {filteredCourses.map((course) => {
            const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0);
            const accent = ACCENT[course.color] || ACCENT.sky;
            return (
              <button className="course-folder-card glass-card" key={course.id} onClick={() => onOpenCourse(course.id)}>
                <span className="course-folder-icon" style={{ '--course-accent': accent }}><Folder size={22} /></span>
                <span className="course-folder-copy">
                  <strong>{course.name}</strong>
                  <small>{course.description}</small>
                  <span className="course-folder-badge" style={{ '--course-accent': accent }}>{course.color}</span>
                </span>
                <span className="course-folder-note-count"><FileText size={12} />{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
                <span className="course-folder-arrow">›</span>
              </button>
            );
          })}
          {!filteredCourses.length && <div className="empty-state glass-inner">No courses match “{query}”.</div>}
        </div>

        <MobileCourseNav active="courses" onHome={onHome} onCourses={() => {}} onCollections={onCollections} onNotes={onNotes} onMore={onMore} />
      </section>
    </main>
  );
}

function MobileCourseNav({ active, onHome, onCourses, onCollections, onNotes, onMore }) {
  const items = [
    ['home', 'Home', onHome], ['courses', 'Courses', onCourses], ['collections', 'Collections', onCollections], ['notes', 'Notes', onNotes], ['more', 'More', onMore],
  ];
  return <nav className="course-mobile-nav" aria-label="Course navigation">{items.map(([key, label, handler]) => <button key={key} className={active === key ? 'nav-active' : ''} onClick={handler} aria-current={active === key ? 'page' : undefined}><span>{key === 'home' ? '⌂' : key === 'courses' ? '▣' : key === 'collections' ? '▥' : key === 'notes' ? '▤' : '•••'}</span><small>{label}</small></button>)}</nav>;
}
