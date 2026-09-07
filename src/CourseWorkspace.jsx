import { BookOpen, FileText, FolderOpen, History, Play, ArrowLeft } from 'lucide-react';
import './CourseWorkspace.css';

export default function CourseWorkspace({ course, totalNotes, onBack, onCollections, onNotes, onStudySession, onOverview }) {
  const collections = course.collections.length;
  const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0);
  return (
    <main className="screen feature-screen">
      <section className="full-glass-panel course-workspace-panel">
        <header className="course-workspace-nav">
          <button className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={20} /></button>
          <h1>Course workspace</h1>
        </header>
        <section className="course-workspace-stat-panel glass-inner">
          <div className="course-workspace-stats">
            <div className="workspace-stat"><FolderOpen size={18} /><strong>{collections}</strong><span>Collections</span></div>
            <div className="workspace-stat"><FileText size={18} /><strong>{noteCount}</strong><span>Notes</span></div>
            <div className="workspace-stat"><History size={18} /><strong>{course.progress || 0}%</strong><span>Progress</span></div>
          </div>
        </section>
        <section className="course-workspace-actions">
          <button className="glass-card course-tool-card" onClick={onStudySession}><span className="action-icon"><Play size={21} /></span><span><strong>Study Session</strong><small>Start a focused study session for this course.</small></span><span className="action-arrow">›</span></button>
          <button className="glass-card course-tool-card" onClick={onCollections}><span className="action-icon"><FolderOpen size={21} /></span><span><strong>Collections</strong><small>Organize the notes inside this course.</small></span><span className="action-arrow">›</span></button>
          <button className="glass-card course-tool-card" onClick={onNotes}><span className="action-icon"><FileText size={21} /></span><span><strong>All Notes</strong><small>Open and continue writing course notes.</small></span><span className="action-arrow">›</span></button>
          <button className="glass-card course-tool-card" onClick={onOverview}><span className="action-icon"><BookOpen size={21} /></span><span><strong>Course Overview</strong><small>See this course's activity, notes and progress.</small></span><span className="action-arrow">›</span></button>
        </section>
        <section className="glass-inner course-workspace-summary"><div><span className="section-label">Course progress</span><strong>{course.progress || 0}% complete</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, course.progress || 0))}%` }} /></div><p>{noteCount} notes across {collections} collections.</p></section>
      </section>
    </main>
  );
}
