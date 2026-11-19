import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Lock,
  PlayCircle,
  Plus,
  RefreshCw,
  Video,
  X
} from 'lucide-react';
import { apiRequest, ApiError } from '../api/client';
import type { Course } from '../types/course';
import type { CourseProgress, CourseSection, Lesson } from '../types/lesson';
import { useAuth } from '../context/AuthContext';

interface LessonPlayerViewProps {
  courseId: string;
  onBack: () => void;
}

export const LessonPlayerView: React.FC<LessonPlayerViewProps> = ({ courseId, onBack }) => {
  const { user, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission('lessons.manage') || hasRole('teacher') || hasRole('super_admin');

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New section / lesson modals
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<'text' | 'video' | 'pdf'>('text');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonVideo, setNewLessonVideo] = useState('');
  const [newLessonAttachmentPath, setNewLessonAttachmentPath] = useState('');
  const [newLessonAttachmentName, setNewLessonAttachmentName] = useState('');
  const [newLessonPreview, setNewLessonPreview] = useState(false);
  const courseIdRef = useRef(courseId);
  courseIdRef.current = courseId;
  const courseLoadIdRef = useRef(0);
  const lessonSelectionIdRef = useRef(0);
  const progressQueueRef = useRef<Promise<void>>(Promise.resolve());
  const desiredProgressRef = useRef<Record<string, boolean>>({});
  const confirmedProgressRef = useRef<Record<string, boolean>>({});
  const progressIntentRevisionRef = useRef<Record<string, number>>({});

  const fetchCourseData = async (requestedCourseId = courseId) => {
    const requestId = ++courseLoadIdRef.current;
    const isCurrentRequest = () =>
      requestId === courseLoadIdRef.current && requestedCourseId === courseIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const [courseRes, sectionsRes, progressRes] = await Promise.all([
        apiRequest<{ course: Course }>(`/courses/${requestedCourseId}`),
        apiRequest<{ sections: CourseSection[] }>(`/courses/${requestedCourseId}/sections`),
        apiRequest<{ progress: CourseProgress }>(`/courses/${requestedCourseId}/progress`).catch(() => ({
          progress: { course_id: requestedCourseId, total_lessons: 0, completed_lessons: 0, percentage: 0 },
        })),
      ]);

      if (!isCurrentRequest()) return;
      setCourse(courseRes.course);
      setSections(sectionsRes.sections);
      setProgress(progressRes.progress);

      const activeLessonExists = sectionsRes.sections.some((section) =>
        section.lessons.some((lesson) => lesson.id === activeLesson?.id)
      );
      if ((!activeLesson || activeLesson.course_id !== requestedCourseId || !activeLessonExists) && sectionsRes.sections.length > 0) {
        for (const sec of sectionsRes.sections) {
          if (sec.lessons && sec.lessons.length > 0) {
            setActiveLesson(sec.lessons[0]);
            break;
          }
        }
      }

      if (sectionsRes.sections.length > 0 && (!targetSectionId || !sectionsRes.sections.some((section) => section.id === targetSectionId))) {
        setTargetSectionId(sectionsRes.sections[0].id);
      }
    } catch (err) {
      if (!isCurrentRequest()) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load course lessons.');
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  };

  useEffect(() => {
    courseLoadIdRef.current += 1;
    lessonSelectionIdRef.current += 1;
    setCourse(null);
    setSections([]);
    setActiveLesson(null);
    setProgress(null);
    setTargetSectionId('');
    desiredProgressRef.current = {};
    confirmedProgressRef.current = {};
    progressIntentRevisionRef.current = {};
    fetchCourseData(courseId);
  }, [courseId]);

  const handleSelectLesson = async (lesson: Lesson) => {
    const selectionId = ++lessonSelectionIdRef.current;
    setActiveLesson(lesson);

    // Fetch full lesson details with access check
    try {
      const res = await apiRequest<{ lesson: Lesson }>(`/lessons/${lesson.id}`);
      if (
        selectionId === lessonSelectionIdRef.current &&
        res.lesson.id === lesson.id &&
        res.lesson.course_id === courseIdRef.current
      ) {
        setActiveLesson(res.lesson);
      }
    } catch (err) {
      if (selectionId === lessonSelectionIdRef.current) {
        console.warn('Error refreshing lesson details', err);
      }
    }
  };

  const handleToggleComplete = async (lesson: Lesson) => {
    const isCurrentlyCompleted = desiredProgressRef.current[lesson.id] ?? lesson.progress?.is_completed ?? false;
    const newStatus = !isCurrentlyCompleted;
    const intentRevision = (progressIntentRevisionRef.current[lesson.id] ?? 0) + 1;
    progressIntentRevisionRef.current[lesson.id] = intentRevision;
    desiredProgressRef.current[lesson.id] = newStatus;

    const setLessonCompletion = (lessonId: string, isCompleted: boolean) => {
      setActiveLesson((prev) => (prev && prev.id === lessonId
        ? { ...prev, progress: { ...(prev.progress ?? { last_position_seconds: 0 }), is_completed: isCompleted } }
        : prev));
      setSections((prevSecs) =>
        prevSecs.map((sec) => ({
          ...sec,
          lessons: sec.lessons.map((item) => (item.id === lessonId
            ? { ...item, progress: { ...(item.progress ?? { last_position_seconds: 0 }), is_completed: isCompleted } }
            : item)),
        }))
      );
    };

    setLessonCompletion(lesson.id, newStatus);

    const mutation = progressQueueRef.current.then(async () => {
      const res = await apiRequest<{
        message: string;
        progress: { is_completed: boolean; completed_at?: string; last_position_seconds: number };
        course_progress: CourseProgress;
      }>(`/lessons/${lesson.id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ is_completed: newStatus }),
      });

      if (courseIdRef.current !== lesson.course_id) return;
      confirmedProgressRef.current[lesson.id] = res.progress.is_completed;
      setProgress(res.course_progress);
      if (progressIntentRevisionRef.current[lesson.id] === intentRevision) {
        desiredProgressRef.current[lesson.id] = res.progress.is_completed;
        setActiveLesson((prev) => (prev && prev.id === lesson.id ? { ...prev, progress: res.progress } : prev));
        setSections((prevSecs) =>
          prevSecs.map((sec) => ({
            ...sec,
            lessons: sec.lessons.map((item) => (item.id === lesson.id ? { ...item, progress: res.progress } : item)),
          }))
        );
      }
    });
    progressQueueRef.current = mutation.then(() => undefined, () => undefined);

    try {
      await mutation;
    } catch (err) {
      if (
        courseIdRef.current === lesson.course_id &&
        progressIntentRevisionRef.current[lesson.id] === intentRevision
      ) {
        const rollbackStatus = confirmedProgressRef.current[lesson.id] ?? !newStatus;
        desiredProgressRef.current[lesson.id] = rollbackStatus;
        setLessonCompletion(lesson.id, rollbackStatus);
      }
      alert(err instanceof Error ? err.message : 'Error updating lesson progress');
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/courses/${courseId}/sections`, {
        method: 'POST',
        body: JSON.stringify({
          title: newSectionTitle,
          description: newSectionDesc,
          order_index: sections.length + 1,
        }),
      });

      setIsSectionModalOpen(false);
      setNewSectionTitle('');
      setNewSectionDesc('');
      await fetchCourseData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating module section');
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/sections/${targetSectionId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: newLessonTitle,
          type: newLessonType,
          content: newLessonContent,
          video_url: newLessonVideo || undefined,
          attachment_path: newLessonType === 'pdf' ? newLessonAttachmentPath.trim() || undefined : undefined,
          attachment_name: newLessonType === 'pdf' ? newLessonAttachmentName.trim() || undefined : undefined,
          is_free_preview: newLessonPreview,
          status: 'published',
        }),
      });

      setIsLessonModalOpen(false);
      setNewLessonTitle('');
      setNewLessonContent('');
      setNewLessonVideo('');
      setNewLessonAttachmentPath('');
      setNewLessonAttachmentName('');
      await fetchCourseData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating lesson');
    }
  };

  return (
    <div className="player-workspace">
      {/* Player Header */}
      <div className="player-topbar">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} />
          <span>Course Catalogue</span>
        </button>

        <div className="player-course-title">
          <span className="card-tag">{course?.code}</span>
          <h2>{course?.title ?? 'Loading Course...'}</h2>
        </div>

        <div className="player-progress-wrap">
          <div className="progress-info">
            <small>COURSE COMPLETION</small>
            <strong>{progress?.percentage ?? 0}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress?.percentage ?? 0}%` }} />
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Main Learning Workspace */}
      <div className="player-body">
        {/* Left Sidebar: Syllabus Modules & Lessons */}
        <aside className="player-sidebar">
          <div className="player-sidebar-header">
            <h3>Course Curriculum</h3>
            {canManage && (
              <div className="admin-actions">
                <button
                  className="btn-icon"
                  title="Add Section"
                  onClick={() => setIsSectionModalOpen(true)}
                >
                  <Plus size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="sections-container">
            {sections.map((section, secIdx) => (
              <div key={section.id} className="player-section-block">
                <div className="section-title-row">
                  <span className="section-number">Unit {secIdx + 1}</span>
                  <h4>{section.title}</h4>
                </div>

                <div className="lessons-list">
                  {section.lessons.map((lesson) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isCompleted = lesson.progress?.is_completed ?? false;

                    return (
                    <div key={lesson.id} className={`lesson-item ${isSelected ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="lesson-select"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => handleSelectLesson(lesson)}
                      >
                        <span className="lesson-type-icon">
                          {lesson.type === 'video' && <Video size={14} />}
                          {lesson.type === 'pdf' && <FileText size={14} />}
                          {lesson.type === 'text' && <FileText size={14} />}
                        </span>
                        <span className="lesson-item-title">{lesson.title}</span>
                      </button>
                        {lesson.is_accessible && (
                          <button
                            type="button"
                            className="btn-check"
                            onClick={() => handleToggleComplete(lesson)}
                            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={16} className="icon-completed" />
                            ) : (
                              <Circle size={16} className="icon-pending" />
                            )}
                          </button>
                        )}

                        {!lesson.is_accessible && (
                          <span title="Enroll to access" style={{ marginLeft: 'auto', display: 'grid' }}>
                            <Lock size={13} className="icon-locked" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {canManage && sections.length > 0 && (
              <button
                className="btn btn-secondary btn-block btn-sm"
                style={{ marginTop: '12px' }}
                onClick={() => setIsLessonModalOpen(true)}
              >
                <Plus size={14} /> Add Lesson
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Pane: Lesson Content & Player */}
        <main className="player-content-pane">
          {activeLesson ? (
            <div className="lesson-content-card">
              <div className="lesson-header-row">
                <div>
                  <span className="lesson-type-badge">{activeLesson.type.toUpperCase()} LESSON</span>
                  <h2>{activeLesson.title}</h2>
                </div>

                {activeLesson.is_accessible && (
                  <button
                    className={`btn ${activeLesson.progress?.is_completed ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggleComplete(activeLesson)}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {activeLesson.progress?.is_completed ? 'Completed ✓' : 'Mark as Completed'}
                    </span>
                  </button>
                )}
              </div>

              {!activeLesson.is_accessible ? (
                <div className="locked-lesson-notice">
                  <Lock size={40} className="lock-icon" />
                  <h3>Content Protected</h3>
                  <p>You must be enrolled in {course?.code} to view this lesson material.</p>
                </div>
              ) : (
                <div className="lesson-render-area">
                  {/* Video Lesson */}
                  {activeLesson.type === 'video' && (
                    <div className="video-player-container">
                      {activeLesson.video_url ? (
                        <video
                          controls
                          className="html5-video"
                          src={activeLesson.video_url}
                          key={activeLesson.video_url}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div className="video-placeholder">
                          <PlayCircle size={48} />
                          <p>Video streaming link being processed by instructor.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF Document Lesson */}
                  {activeLesson.type === 'pdf' && (
                    <div className="pdf-resource-card">
                      <FileText size={36} className="pdf-icon" />
                      <div>
                        <strong>{activeLesson.attachment_name ?? 'Lecture Slides & Notes.pdf'}</strong>
                        <p>Official course slide deck and reading materials.</p>
                      </div>
                      {activeLesson.attachment_path ? (
                        <a
                          href={activeLesson.attachment_path}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          <Download size={14} /> Download PDF
                        </a>
                      ) : (
                        <button className="btn btn-primary btn-sm" disabled>
                          <Download size={14} /> PDF unavailable
                        </button>
                      )}
                    </div>
                  )}

                  {/* Rich Text / Markdown Content */}
                  <div className="lesson-text-body">
                    {activeLesson.content ? (
                      <div className="formatted-text">
                        {activeLesson.content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">No additional reading text provided for this lesson.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-player-state">
              <FileText size={48} />
              <h3>Select a lesson from the curriculum sidebar to start learning</h3>
            </div>
          )}
        </main>
      </div>

      {/* Modal: New Module Section */}
      {isSectionModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSectionModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Course Module</h3>
              <button className="btn-close" onClick={() => setIsSectionModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSection} className="modal-form">
              <div className="form-group">
                <label>Module Title</label>
                <input
                  required
                  placeholder="e.g. Module 3: Trees & Binary Search Trees"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Module Summary (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Key concepts covered in this module..."
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Module</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Lesson */}
      {isLessonModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLessonModalOpen(false)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Lesson to Course</h3>
              <button className="btn-close" onClick={() => setIsLessonModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateLesson} className="modal-form">
              <div className="form-group">
                <label>Parent Module</label>
                <select value={targetSectionId} onChange={(e) => setTargetSectionId(e.target.value)} required>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Lesson Title</label>
                  <input
                    required
                    placeholder="e.g. 2.2 Stack Implementation & Infix-to-Postfix"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Content Type</label>
                  <select
                    value={newLessonType}
                    onChange={(e) => setNewLessonType(e.target.value as 'text' | 'video' | 'pdf')}
                  >
                    <option value="text">Text / Reading</option>
                    <option value="video">Video Stream</option>
                    <option value="pdf">PDF Document</option>
                  </select>
                </div>
              </div>

              {newLessonType === 'video' && (
                <div className="form-group">
                  <label>Video Stream / Embed URL</label>
                  <input
                    placeholder="https://... (S3 signed URL, CloudFront, or MP4)"
                    value={newLessonVideo}
                    onChange={(e) => setNewLessonVideo(e.target.value)}
                  />
                </div>
              )}

              {newLessonType === 'pdf' && (
                <>
                  <div className="form-group">
                    <label>PDF Source Path or URL</label>
                    <input
                      type="text"
                      placeholder="https://... or authorized storage path"
                      value={newLessonAttachmentPath}
                      onChange={(e) => setNewLessonAttachmentPath(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>PDF File Name (Optional)</label>
                    <input
                      placeholder="e.g. Lecture 2 Notes.pdf"
                      value={newLessonAttachmentName}
                      onChange={(e) => setNewLessonAttachmentName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Lesson Notes & Body Text</label>
                <textarea
                  rows={4}
                  placeholder="Lesson explanations, code snippets, or reading guidelines..."
                  value={newLessonContent}
                  onChange={(e) => setNewLessonContent(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="preview-check"
                  checked={newLessonPreview}
                  onChange={(e) => setNewLessonPreview(e.target.checked)}
                />
                <label htmlFor="preview-check" style={{ margin: 0, cursor: 'pointer' }}>
                  Enable Free Preview (accessible without enrolment)
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block">Save Lesson</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
