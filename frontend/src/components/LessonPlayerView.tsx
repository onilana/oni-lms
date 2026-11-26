import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  Lock,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  Video,
  X
} from 'lucide-react';
import { apiRequest, ApiError } from '../api/client';
import type { Course } from '../types/course';
import type { CourseProgress, CourseSection, Lesson, LessonType } from '../types/lesson';
import { useAuth } from '../context/AuthContext';
import { DocumentViewer } from './DocumentViewer';

interface LessonPlayerViewProps {
  courseId: string;
  onBack: () => void;
}

export const LessonPlayerView: React.FC<LessonPlayerViewProps> = ({ courseId, onBack }) => {
  const { user, hasPermission, hasRole } = useAuth();
  const canManage = hasPermission('lessons.manage') || hasRole('teacher') || hasRole('super_admin') || hasRole('college_admin') || hasRole('hod');

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New section modal
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  // Lesson Create / Edit modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('text');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideo, setLessonVideo] = useState('');
  const [lessonAttachmentPath, setLessonAttachmentPath] = useState('');
  const [lessonAttachmentName, setLessonAttachmentName] = useState('');
  const [lessonPreview, setLessonPreview] = useState(false);

  // File Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openCreateLessonModal = (sectionId?: string) => {
    setEditingLessonId(null);
    setTargetSectionId(sectionId || (sections[0]?.id ?? ''));
    setLessonTitle('');
    setLessonType('text');
    setLessonContent('');
    setLessonVideo('');
    setLessonAttachmentPath('');
    setLessonAttachmentName('');
    setLessonPreview(false);
    setUploadStatus(null);
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setTargetSectionId(lesson.section_id);
    setLessonTitle(lesson.title);
    setLessonType(lesson.type);
    setLessonContent(lesson.content || '');
    setLessonVideo(lesson.video_url || '');
    setLessonAttachmentPath(lesson.attachment_path || '');
    setLessonAttachmentName(lesson.attachment_name || '');
    setLessonPreview(lesson.is_free_preview);
    setUploadStatus(null);
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = async (lesson: Lesson) => {
    if (!window.confirm(`Are you sure you want to delete lesson "${lesson.title}"?`)) {
      return;
    }

    try {
      await apiRequest(`/lessons/${lesson.id}`, {
        method: 'DELETE',
      });
      if (activeLesson?.id === lesson.id) {
        setActiveLesson(null);
      }
      await fetchCourseData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting lesson');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest<{
        message: string;
        attachment_path: string;
        attachment_url: string;
        attachment_name: string;
        extension: string;
      }>('/lessons/upload-attachment', {
        method: 'POST',
        body: formData,
      });

      setLessonAttachmentPath(res.attachment_path);
      setLessonAttachmentName(res.attachment_name);

      const ext = res.extension.toLowerCase();
      if (ext === 'pdf') {
        setLessonType('pdf');
      } else if (['doc', 'docx'].includes(ext)) {
        setLessonType('doc');
      } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        setLessonType('excel');
      } else if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) {
        setLessonType('video');
        setLessonVideo(res.attachment_url || res.attachment_path);
      }

      setUploadStatus(`Uploaded: ${res.attachment_name}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error uploading file');
      setUploadStatus(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, any> = {
        title: lessonTitle,
        type: lessonType,
        content: lessonContent || undefined,
        video_url: lessonVideo.trim() || undefined,
        attachment_path: lessonAttachmentPath.trim() || undefined,
        attachment_name: lessonAttachmentName.trim() || undefined,
        is_free_preview: lessonPreview,
        status: 'published',
      };

      if (editingLessonId) {
        await apiRequest(`/lessons/${editingLessonId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/sections/${targetSectionId}/lessons`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsLessonModalOpen(false);
      setEditingLessonId(null);
      await fetchCourseData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving lesson');
    }
  };

  const getLessonTypeIcon = (type: LessonType) => {
    switch (type) {
      case 'video':
        return <Video size={14} className="text-primary" />;
      case 'pdf':
        return <FileText size={14} className="text-danger" />;
      case 'doc':
      case 'word':
        return <FileText size={14} className="text-primary" />;
      case 'excel':
      case 'spreadsheet':
        return <FileSpreadsheet size={14} className="text-success" />;
      case 'link':
      case 'embed':
        return <ExternalLink size={14} className="text-info" />;
      default:
        return <FileText size={14} />;
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
                  title="Add Module Section"
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
                  {canManage && (
                    <button
                      className="btn-icon-tiny"
                      title="Add Lesson to this Module"
                      onClick={() => openCreateLessonModal(section.id)}
                    >
                      <Plus size={12} />
                    </button>
                  )}
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
                            {getLessonTypeIcon(lesson.type)}
                          </span>
                          <span className="lesson-item-title">{lesson.title}</span>
                        </button>

                        <div className="lesson-item-actions">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="btn-icon-ghost"
                                title="Edit Lesson"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditLessonModal(lesson);
                                }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon-ghost text-danger"
                                title="Delete Lesson"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLesson(lesson);
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}

                          {lesson.is_accessible ? (
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
                          ) : (
                            <span title="Enroll to access" style={{ display: 'grid' }}>
                              <Lock size={13} className="icon-locked" />
                            </span>
                          )}
                        </div>
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
                onClick={() => openCreateLessonModal()}
              >
                <Plus size={14} /> Add Lesson
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Pane: Lesson Content & Document Viewer */}
        <main className="player-content-pane">
          {activeLesson ? (
            <div className="lesson-content-card">
              <div className="lesson-header-row">
                <div>
                  <div className="lesson-tag-line">
                    <span className="lesson-type-badge">{activeLesson.type.toUpperCase()} LESSON</span>
                    {activeLesson.is_free_preview && (
                      <span className="badge-preview">FREE PREVIEW</span>
                    )}
                  </div>
                  <h2>{activeLesson.title}</h2>
                </div>

                <div className="lesson-top-controls">
                  {canManage && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditLessonModal(activeLesson)}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  )}

                  {activeLesson.is_accessible && (
                    <button
                      className={`btn ${activeLesson.progress?.is_completed ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={() => handleToggleComplete(activeLesson)}
                    >
                      <CheckCircle2 size={16} />
                      <span>
                        {activeLesson.progress?.is_completed ? 'Completed ✓' : 'Mark as Completed'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {!activeLesson.is_accessible ? (
                <div className="locked-lesson-notice">
                  <Lock size={40} className="lock-icon" />
                  <h3>Content Protected</h3>
                  <p>You must be enrolled in {course?.code} to view this lesson material.</p>
                </div>
              ) : (
                <div className="lesson-render-area">
                  {/* DIRECT IN-LMS DOCUMENT / VIDEO / SPREADSHEET VIEWER */}
                  {activeLesson.type !== 'text' && (
                    <DocumentViewer
                      type={activeLesson.type}
                      url={activeLesson.attachment_url || activeLesson.attachment_path || activeLesson.video_url}
                      fileName={activeLesson.attachment_name}
                      title={activeLesson.title}
                      content={activeLesson.content}
                    />
                  )}

                  {/* Lesson Notes & Explanation Text */}
                  {activeLesson.content && (
                    <div className="lesson-text-body">
                      <h4 className="lesson-notes-heading">Lesson Notes & Guidelines</h4>
                      <div className="formatted-text">
                        {activeLesson.content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeLesson.type === 'text' && !activeLesson.content && (
                    <div className="viewer-empty-placeholder">
                      <FileText size={40} />
                      <p>No reading content provided for this lesson yet.</p>
                    </div>
                  )}
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
                  placeholder="e.g. Module 3: Database Indexing & Optimisation"
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

      {/* Modal: Create or Edit Lesson */}
      {isLessonModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLessonModalOpen(false)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLessonId ? 'Edit Lesson' : 'Add Lesson to Course'}</h3>
              <button className="btn-close" onClick={() => setIsLessonModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="modal-form">
              <div className="form-group">
                <label>Parent Module</label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  required
                  disabled={Boolean(editingLessonId)}
                >
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
                    placeholder="e.g. 3.1 B-Tree Index Architecture"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Content Type</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                  >
                    <option value="text">Text / Reading</option>
                    <option value="video">Video Lecture (Embed / YouTube / MP4)</option>
                    <option value="pdf">PDF Document</option>
                    <option value="doc">Word Document (.docx, .doc)</option>
                    <option value="excel">Excel Spreadsheet (.xlsx, .csv)</option>
                    <option value="link">External Web Link</option>
                    <option value="embed">Interactive Web Embed</option>
                  </select>
                </div>
              </div>

              {/* Upload Document / Media File Section */}
              <div className="form-group upload-resource-box">
                <label className="upload-box-title">
                  <UploadCloud size={16} />
                  <span>Upload File (PDF, Word, Excel, Video)</span>
                </label>
                <div className="upload-dropzone">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.webm,.mov,.txt"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    id="lesson-file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="lesson-file-input" className="btn btn-secondary btn-sm upload-btn-label">
                    {uploading ? (
                      <>
                        <RefreshCw size={14} className="spin-icon" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        <span>Choose File to Upload</span>
                      </>
                    )}
                  </label>
                  <span className="upload-help-text">
                    Supported: PDF, DOCX, XLSX, XLS, CSV, MP4 (Max 25MB)
                  </span>
                </div>

                {uploadStatus && (
                  <div className="upload-status-badge">
                    <CheckCircle2 size={14} className="text-success" />
                    <span>{uploadStatus}</span>
                  </div>
                )}
              </div>

              {/* Video URL or Embed Input */}
              {(lessonType === 'video' || lessonType === 'embed') && (
                <div className="form-group">
                  <label>
                    {lessonType === 'video'
                      ? 'Video Stream, YouTube, Vimeo URL or Embed Code'
                      : 'Embed Iframe Code or URL'}
                  </label>
                  <input
                    placeholder={
                      lessonType === 'video'
                        ? 'e.g. https://www.youtube.com/watch?v=... or direct MP4 link'
                        : 'e.g. https://... or <iframe src="..."></iframe>'
                    }
                    value={lessonVideo}
                    onChange={(e) => setLessonVideo(e.target.value)}
                  />
                  <small className="form-help">
                    You can paste YouTube, Vimeo, direct MP4 URLs, or iframe embed snippets.
                  </small>
                </div>
              )}

              {/* Web Link Input */}
              {lessonType === 'link' && (
                <div className="form-group">
                  <label>External Link / Resource URL</label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/... or https://..."
                    value={lessonAttachmentPath}
                    onChange={(e) => setLessonAttachmentPath(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Document Source / Attachment Path & Name */}
              {(lessonType === 'pdf' || lessonType === 'doc' || lessonType === 'word' || lessonType === 'excel' || lessonType === 'spreadsheet') && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Document Path or URL</label>
                    <input
                      placeholder="Uploaded file path or public URL (e.g. https://...)"
                      value={lessonAttachmentPath}
                      onChange={(e) => setLessonAttachmentPath(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>File Display Name</label>
                    <input
                      placeholder="e.g. Lecture Notes.docx"
                      value={lessonAttachmentName}
                      onChange={(e) => setLessonAttachmentName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Notes & Reading Content */}
              <div className="form-group">
                <label>Lesson Notes & Guidelines</label>
                <textarea
                  rows={4}
                  placeholder="Accompanying explanations, study objectives, code snippets, or reference links..."
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                />
              </div>

              {/* Free Preview Toggle */}
              <div className="form-group preview-toggle-wrap">
                <input
                  type="checkbox"
                  id="preview-check"
                  checked={lessonPreview}
                  onChange={(e) => setLessonPreview(e.target.checked)}
                />
                <label htmlFor="preview-check" style={{ margin: 0, cursor: 'pointer' }}>
                  Enable Free Preview (accessible to prospective students without enrollment)
                </label>
              </div>

              <div className="modal-actions-bar">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsLessonModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {editingLessonId ? 'Update Lesson' : 'Save & Publish Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
