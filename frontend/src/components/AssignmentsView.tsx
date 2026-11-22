import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileCheck,
  FileEdit,
  GraduationCap,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Upload,
  UserCheck,
  X
} from 'lucide-react';
import { apiDownload, apiRequest, ApiError } from '../api/client';
import type { Assignment, AssignmentSubmission } from '../types/assignment';
import type { Course } from '../types/course';
import { useAuth } from '../context/AuthContext';

interface UploadedAssignmentAttachment {
  attachment_reference: string;
  attachment_path: string;
  attachment_name: string;
}

export const AssignmentsView: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const isStaff = hasRole('teacher') || hasRole('super_admin') || hasPermission('assignments.manage');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student submission modal
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [uploadedAttachment, setUploadedAttachment] = useState<UploadedAssignmentAttachment | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState<string | null>(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Teacher grading modal
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [submissionsList, setSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeSubmissionToGrade, setActiveSubmissionToGrade] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Create assignment modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCourseId, setCreateCourseId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createInstructions, setCreateInstructions] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createMaxScore, setCreateMaxScore] = useState(100);
  const [createType, setCreateType] = useState<'text' | 'file' | 'both'>('both');

  // Edit assignment modal
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editMaxScore, setEditMaxScore] = useState(100);
  const [editType, setEditType] = useState<'text' | 'file' | 'both'>('both');
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'closed'>('published');

  const selectedCourseIdRef = useRef(selectedCourseId);
  selectedCourseIdRef.current = selectedCourseId;
  const assignmentLoadIdRef = useRef(0);
  const gradingSessionIdRef = useRef(0);
  const gradingAssignmentIdRef = useRef<string | null>(null);
  const submissionAttachmentUploadIdRef = useRef(0);
  const submissionAssignmentIdRef = useRef<string | null>(null);

  const fetchAssignments = async (courseId = selectedCourseId) => {
    const requestId = ++assignmentLoadIdRef.current;
    const isCurrentRequest = () =>
      requestId === assignmentLoadIdRef.current && courseId === selectedCourseIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const url = courseId ? `/courses/${courseId}/assignments` : '/assignments';
      const [assignRes, coursesRes] = await Promise.all([
        apiRequest<{ assignments: Assignment[] }>(url),
        apiRequest<{ courses: Course[] }>('/courses'),
      ]);

      if (!isCurrentRequest()) return;
      setAssignments(assignRes.assignments);
      setCourses(coursesRes.courses);

      if (coursesRes.courses.length > 0 && !createCourseId) {
        setCreateCourseId(coursesRes.courses[0].id);
      }
    } catch (err) {
      if (!isCurrentRequest()) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load assignments.');
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  };

  const selectCourse = (courseId: string) => {
    selectedCourseIdRef.current = courseId;
    assignmentLoadIdRef.current += 1;
    setSelectedCourseId(courseId);
    setAssignments([]);
    setError(null);
    setLoading(true);
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedCourseId]);

  const handleOpenSubmit = (assignment: Assignment) => {
    submissionAttachmentUploadIdRef.current += 1;
    submissionAssignmentIdRef.current = assignment.id;
    setSubmittingAssignment(assignment);
    setSubmissionText(assignment.my_submission?.submission_text ?? '');
    setSubmissionFile(null);
    setUploadedAttachment(null);
    setUploadingAttachment(false);
    setAttachmentUploadError(null);
    setSubmittingResponse(false);
  };

  const closeSubmit = () => {
    submissionAttachmentUploadIdRef.current += 1;
    submissionAssignmentIdRef.current = null;
    setSubmittingAssignment(null);
    setSubmissionText('');
    setSubmissionFile(null);
    setUploadedAttachment(null);
    setUploadingAttachment(false);
    setAttachmentUploadError(null);
    setSubmittingResponse(false);
  };

  const handleSubmissionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file || !submittingAssignment) return;

    const assignmentId = submittingAssignment.id;
    const uploadId = ++submissionAttachmentUploadIdRef.current;
    setSubmissionFile(file);
    setUploadedAttachment(null);
    setAttachmentUploadError(null);
    setUploadingAttachment(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const attachment = await apiRequest<UploadedAssignmentAttachment>(
        `/assignments/${assignmentId}/attachments`,
        { method: 'POST', body: formData }
      );
      if (
        uploadId === submissionAttachmentUploadIdRef.current &&
        submissionAssignmentIdRef.current === assignmentId
      ) {
        setUploadedAttachment(attachment);
      }
    } catch (err) {
      if (
        uploadId === submissionAttachmentUploadIdRef.current &&
        submissionAssignmentIdRef.current === assignmentId
      ) {
        setAttachmentUploadError(err instanceof Error ? err.message : 'Error uploading attachment');
      }
    } finally {
      if (
        uploadId === submissionAttachmentUploadIdRef.current &&
        submissionAssignmentIdRef.current === assignmentId
      ) {
        setUploadingAttachment(false);
      }
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || uploadingAttachment || submittingResponse) return;

    const assignment = submittingAssignment;
    const hasText = submissionText.trim().length > 0;
    const hasAttachment = !!uploadedAttachment;
    if (assignment.submission_type === 'text' && !hasText) {
      alert('Enter a text response before submitting.');
      return;
    }
    if (assignment.submission_type === 'file' && !hasAttachment) {
      alert('Upload a file before submitting.');
      return;
    }
    if (assignment.submission_type === 'both' && !hasText && !hasAttachment) {
      alert('Enter a text response or upload a file before submitting.');
      return;
    }

    try {
      setSubmittingResponse(true);
      const payload: {
        submission_text?: string;
        attachment_path?: string;
        attachment_name?: string;
      } = {};
      if (assignment.submission_type !== 'file' && hasText) {
        payload.submission_text = submissionText;
      }
      if (assignment.submission_type !== 'text' && uploadedAttachment) {
        payload.attachment_path = uploadedAttachment.attachment_reference;
        payload.attachment_name = uploadedAttachment.attachment_name;
      }

      await apiRequest(`/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      closeSubmit();
      await fetchAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error submitting assignment');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleDownloadAttachment = async (submission: AssignmentSubmission) => {
    if (!submission.attachment_path) return;
    try {
      await apiDownload(
        submission.attachment_path,
        submission.attachment_name ?? 'assignment-attachment'
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error downloading attachment');
    }
  };

  const handleOpenGrading = async (assignment: Assignment) => {
    const sessionId = ++gradingSessionIdRef.current;
    gradingAssignmentIdRef.current = assignment.id;
    setGradingAssignment(assignment);
    setSubmissionsList([]);
    setLoadingSubmissions(true);
    setActiveSubmissionToGrade(null);
    setGradeScore(0);
    setGradeFeedback('');
    try {
      const res = await apiRequest<{ submissions: AssignmentSubmission[] }>(
        `/assignments/${assignment.id}/submissions`
      );
      if (
        sessionId !== gradingSessionIdRef.current ||
        gradingAssignmentIdRef.current !== assignment.id
      ) return;
      setSubmissionsList(res.submissions);
    } catch (err) {
      if (
        sessionId === gradingSessionIdRef.current &&
        gradingAssignmentIdRef.current === assignment.id
      ) {
        alert(err instanceof Error ? err.message : 'Error fetching submissions');
      }
    } finally {
      if (
        sessionId === gradingSessionIdRef.current &&
        gradingAssignmentIdRef.current === assignment.id
      ) {
        setLoadingSubmissions(false);
      }
    }
  };

  const closeGrading = () => {
    gradingSessionIdRef.current += 1;
    gradingAssignmentIdRef.current = null;
    setGradingAssignment(null);
    setSubmissionsList([]);
    setLoadingSubmissions(false);
    setActiveSubmissionToGrade(null);
    setGradeScore(0);
    setGradeFeedback('');
  };

  const handleSelectSubmissionToGrade = (sub: AssignmentSubmission) => {
    if (!gradingAssignment || sub.assignment_id !== gradingAssignment.id) return;
    setActiveSubmissionToGrade(sub);
    setGradeScore(sub.score ?? 0);
    setGradeFeedback(sub.feedback ?? '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !activeSubmissionToGrade ||
      !gradingAssignment ||
      activeSubmissionToGrade.assignment_id !== gradingAssignment.id ||
      gradingAssignmentIdRef.current !== gradingAssignment.id
    ) return;
    const assignmentId = gradingAssignment.id;
    const submissionId = activeSubmissionToGrade.id;
    const sessionId = gradingSessionIdRef.current;

    try {
      await apiRequest(`/submissions/${submissionId}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score: gradeScore,
          feedback: gradeFeedback,
          status: 'graded',
        }),
      });

      // Refresh submissions
      const res = await apiRequest<{ submissions: AssignmentSubmission[] }>(
        `/assignments/${assignmentId}/submissions`
      );
      if (
        sessionId !== gradingSessionIdRef.current ||
        gradingAssignmentIdRef.current !== assignmentId
      ) return;
      setSubmissionsList(res.submissions);
      setLoadingSubmissions(false);
      setActiveSubmissionToGrade(null);
      await fetchAssignments();
    } catch (err) {
      if (
        sessionId === gradingSessionIdRef.current &&
        gradingAssignmentIdRef.current === assignmentId
      ) {
        alert(err instanceof Error ? err.message : 'Error saving grade');
      }
    }
  };

  const localDateTimeToUtc = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Enter a valid assignment due date and time.');
    }
    return date.toISOString();
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/courses/${createCourseId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          title: createTitle,
          description: createDesc,
          instructions: createInstructions,
          due_date: localDateTimeToUtc(createDueDate),
          max_score: createMaxScore,
          submission_type: createType,
          status: 'published',
        }),
      });

      setIsCreateOpen(false);
      setCreateTitle('');
      setCreateDesc('');
      setCreateInstructions('');
      setCreateDueDate('');
      await fetchAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating assignment');
    }
  };

  const handleOpenEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setEditTitle(a.title);
    setEditDesc(a.description || '');
    setEditInstructions(a.instructions || '');
    try {
      const dt = new Date(a.due_date);
      const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditDueDate(localIso);
    } catch {
      setEditDueDate('');
    }
    setEditMaxScore(a.max_score);
    setEditType(a.submission_type);
    setEditStatus((a.status as any) || 'published');
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    try {
      await apiRequest(`/assignments/${editingAssignment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          instructions: editInstructions,
          due_date: localDateTimeToUtc(editDueDate),
          max_score: editMaxScore,
          submission_type: editType,
          status: editStatus,
        }),
      });

      setEditingAssignment(null);
      await fetchAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating assignment');
    }
  };

  return (
    <div className="assignments-view">
      <div className="view-header">
        <div>
          <h2>Assignments & Assessment</h2>
          <p>Complete course tasks, review teacher feedback, and grade student submissions</p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary" onClick={() => fetchAssignments()} title="Refresh assignments">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {isStaff && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="assignments-toolbar">
        <select value={selectedCourseId} onChange={(e) => selectCourse(e.target.value)}>
          <option value="">All Course Assignments</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
          ))}
        </select>
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state">
          <FileCheck size={44} className="empty-state-icon" />
          <h3>No assignments posted yet</h3>
          <p>Check back later or choose another course from the filter above.</p>
        </div>
      ) : (
        <div className="assignments-grid">
          {assignments.map((a) => {
            const hasSubmitted = !!a.my_submission;
            const isGraded = a.my_submission?.status === 'graded';

            return (
              <article key={a.id} className="assignment-card">
                <div className="assignment-card-header">
                  <span className="card-tag">{a.course?.code ?? 'COURSE'}</span>
                  <span className="badge badge-credits">{a.max_score} Points</span>
                </div>

                <h3>{a.title}</h3>
                <p className="assignment-desc">{a.description || 'No summary provided.'}</p>

                <div className="assignment-meta">
                  <div className={`due-info ${a.is_past_due ? 'past-due' : ''}`}>
                    <Clock size={14} />
                    <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>
                  </div>
                  <span className="type-tag">{a.submission_type.toUpperCase()} SUBMISSION</span>
                </div>

                {/* Student's Grade Box (if graded) */}
                {isGraded && (
                  <div className="student-grade-box">
                    <div className="grade-header">
                      <Award size={16} className="grade-icon" />
                      <strong>Grade Awarded: {a.my_submission?.score} / {a.max_score}</strong>
                    </div>
                    {a.my_submission?.feedback && (
                      <p className="grade-feedback">
                        <em>Teacher Feedback:</em> "{a.my_submission.feedback}"
                      </p>
                    )}
                  </div>
                )}

                <div className="assignment-card-footer">
                  {isStaff ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleOpenGrading(a)}
                      >
                        <UserCheck size={14} /> Submissions ({a.submissions_count ?? 0})
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        title="Edit Assignment"
                        onClick={() => handleOpenEdit(a)}
                      >
                        <FileEdit size={14} /> Edit
                      </button>
                    </div>
                  ) : hasSubmitted ? (
                    <button
                      className="btn btn-secondary btn-sm btn-block"
                      onClick={() => handleOpenSubmit(a)}
                    >
                      <CheckCircle size={14} className="text-green" /> Submitted ({a.my_submission?.is_late ? 'Late' : 'On Time'})
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm btn-block"
                      onClick={() => handleOpenSubmit(a)}
                    >
                      <Send size={14} /> Submit Response
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Student Submit Modal */}
      {submittingAssignment && (
        <div className="modal-backdrop" onClick={closeSubmit}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="card-tag">{submittingAssignment.course?.code}</span>
                <h3>{submittingAssignment.title}</h3>
                <small>Due: {new Date(submittingAssignment.due_date).toLocaleString()}</small>
              </div>
              <button className="btn-close" onClick={closeSubmit}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="modal-form">
              {submittingAssignment.instructions && (
                <div className="instructions-box">
                  <strong>Instructions:</strong>
                  <p>{submittingAssignment.instructions}</p>
                </div>
              )}

              {submittingAssignment.submission_type !== 'file' && (
                <div className="form-group">
                  <label>
                    Text Response / Solution Notes
                    {submittingAssignment.submission_type === 'both' ? ' (Optional when attaching a file)' : ''}
                  </label>
                  <textarea
                    rows={6}
                    required={submittingAssignment.submission_type === 'text'}
                    placeholder="Paste your implementation source code, written explanation, or repository URL..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                  />
                </div>
              )}

              {submittingAssignment.submission_type !== 'text' && (
                <div className="form-group">
                  <label htmlFor="assignment-submission-file">
                    Attachment File{submittingAssignment.submission_type === 'file' ? ' (Required)' : ' (Optional when text is provided)'}
                  </label>
                  <input
                    id="assignment-submission-file"
                    type="file"
                    aria-required={submittingAssignment.submission_type === 'file'}
                    onChange={handleSubmissionFileChange}
                    disabled={uploadingAttachment || submittingResponse}
                  />
                  {submissionFile && (
                    <small>
                      {submissionFile.name}
                      {uploadingAttachment ? ' · Uploading…' : uploadedAttachment ? ' · Uploaded' : ''}
                    </small>
                  )}
                  {submittingAssignment.my_submission?.attachment_name && !submissionFile && (
                    <small>Previously submitted: {submittingAssignment.my_submission.attachment_name}</small>
                  )}
                  {attachmentUploadError && <div className="alert alert-error">{attachmentUploadError}</div>}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block" disabled={uploadingAttachment || submittingResponse}>
                <Send size={16} />
                <span>{submittingResponse ? 'Submitting…' : 'Confirm & Submit Assignment'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Grading Modal */}
      {gradingAssignment && (
        <div className="modal-backdrop" onClick={closeGrading}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="card-tag">{gradingAssignment.course?.code}</span>
                <h3>Submissions: {gradingAssignment.title}</h3>
                <small>Max Score: {gradingAssignment.max_score} Points</small>
              </div>
              <button className="btn-close" onClick={closeGrading}><X size={18} /></button>
            </div>

            <div className="grading-modal-body">
              {activeSubmissionToGrade ? (
                <form onSubmit={handleSaveGrade} className="grading-form">
                  <button
                    type="button"
                    className="btn-link"
                    style={{ marginBottom: '12px' }}
                    onClick={() => setActiveSubmissionToGrade(null)}
                  >
                    ← Back to Submissions List
                  </button>

                  <div className="student-sub-preview">
                    <strong>Student: {activeSubmissionToGrade.user?.name}</strong>
                    <small>Submitted at {new Date(activeSubmissionToGrade.submitted_at).toLocaleString()}</small>
                    <div className="submission-content-box">
                      <pre>{activeSubmissionToGrade.submission_text || 'No text provided.'}</pre>
                      {activeSubmissionToGrade.attachment_path && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadAttachment(activeSubmissionToGrade)}
                        >
                          <Download size={14} />
                          {activeSubmissionToGrade.attachment_name ?? 'Download attachment'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Score (Max: {gradingAssignment.max_score})</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={gradingAssignment.max_score}
                      value={gradeScore}
                      onChange={(e) => setGradeScore(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Teacher Feedback & Rubric Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Constructive feedback for the student..."
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Save & Publish Grade
                  </button>
                </form>
              ) : loadingSubmissions ? (
                <div className="empty-state">
                  <p>Loading submissions...</p>
                </div>
              ) : submissionsList.length === 0 ? (
                <div className="empty-state">
                  <p>No student submissions received yet for this assignment.</p>
                </div>
              ) : (
                <div className="submissions-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Submitted At</th>
                        <th>Timing</th>
                        <th>Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsList.map((sub) => (
                        <tr key={sub.id}>
                          <td><strong>{sub.user?.name ?? 'Learner'}</strong></td>
                          <td>{new Date(sub.submitted_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`status ${sub.is_late ? 'pending' : 'ok'}`}>
                              {sub.is_late ? 'Late' : 'On Time'}
                            </span>
                          </td>
                          <td>
                            {sub.score !== null && sub.score !== undefined ? (
                              <strong>{sub.score} / {gradingAssignment.max_score}</strong>
                            ) : (
                              <span className="text-muted">Not Graded</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectSubmissionToGrade(sub)}
                            >
                              Grade / Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Assignment */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Course Assignment</h3>
              <button className="btn-close" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateAssignment} className="modal-form">
              <div className="form-group">
                <label>Target Course</label>
                <select value={createCourseId} onChange={(e) => setCreateCourseId(e.target.value)} required>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assignment Title</label>
                <input
                  required
                  placeholder="e.g. Programming Lab 2: Binary Search Tree"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Due Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Points</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={createMaxScore}
                    onChange={(e) => setCreateMaxScore(parseInt(e.target.value) || 100)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Short Description</label>
                <input
                  placeholder="Summary of assignment goals..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Detailed Instructions & Rubric</label>
                <textarea
                  rows={4}
                  placeholder="Step 1: Download starter code...&#10;Step 2: Implement algorithms...&#10;Step 3: Run unit tests..."
                  value={createInstructions}
                  onChange={(e) => setCreateInstructions(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Publish Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Assignment */}
      {editingAssignment && (
        <div className="modal-backdrop" onClick={() => setEditingAssignment(null)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Assignment: {editingAssignment.title}</h3>
              <button className="btn-close" onClick={() => setEditingAssignment(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateAssignment} className="modal-form">
              <div className="form-group">
                <label>Assignment Title</label>
                <input
                  required
                  placeholder="e.g. Programming Lab 2: Binary Search Tree"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Due Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Points</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={editMaxScore}
                    onChange={(e) => setEditMaxScore(parseInt(e.target.value) || 100)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Submission Format</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value as 'text' | 'file' | 'both')}>
                    <option value="both">Both (Text or File Attachment)</option>
                    <option value="text">Text / Code Only</option>
                    <option value="file">File Attachment Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'draft' | 'published' | 'closed')}>
                    <option value="published">Published (Open for Submissions)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Short Description</label>
                <input
                  placeholder="Summary of assignment goals..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Detailed Instructions & Rubric</label>
                <textarea
                  rows={4}
                  placeholder="Step 1: Download starter code...&#10;Step 2: Implement algorithms...&#10;Step 3: Run unit tests..."
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Save Assignment Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
