import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  FileCheck,
  FileEdit,
  GraduationCap,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  UserCheck,
  X
} from 'lucide-react';
import { apiRequest, ApiError } from '../api/client';
import type { Assignment, AssignmentSubmission } from '../types/assignment';
import type { Course } from '../types/course';
import { useAuth } from '../context/AuthContext';

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
  const [submissionAttachment, setSubmissionAttachment] = useState('');

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

  const selectedCourseIdRef = useRef(selectedCourseId);
  selectedCourseIdRef.current = selectedCourseId;
  const assignmentLoadIdRef = useRef(0);
  const gradingSessionIdRef = useRef(0);
  const gradingAssignmentIdRef = useRef<string | null>(null);

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
    setSubmittingAssignment(assignment);
    setSubmissionText(assignment.my_submission?.submission_text ?? '');
    setSubmissionAttachment(assignment.my_submission?.attachment_name ?? '');
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;

    try {
      await apiRequest(`/assignments/${submittingAssignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          submission_text: submissionText,
          attachment_name: submissionAttachment || undefined,
        }),
      });

      setSubmittingAssignment(null);
      await fetchAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error submitting assignment');
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
                    <button
                      className="btn btn-secondary btn-sm btn-block"
                      onClick={() => handleOpenGrading(a)}
                    >
                      <UserCheck size={14} /> Review Submissions ({a.submissions_count ?? 0})
                    </button>
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
        <div className="modal-backdrop" onClick={() => setSubmittingAssignment(null)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="card-tag">{submittingAssignment.course?.code}</span>
                <h3>{submittingAssignment.title}</h3>
                <small>Due: {new Date(submittingAssignment.due_date).toLocaleString()}</small>
              </div>
              <button className="btn-close" onClick={() => setSubmittingAssignment(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="modal-form">
              {submittingAssignment.instructions && (
                <div className="instructions-box">
                  <strong>Instructions:</strong>
                  <p>{submittingAssignment.instructions}</p>
                </div>
              )}

              <div className="form-group">
                <label>Text Response / Solution Notes</label>
                <textarea
                  rows={6}
                  required={submittingAssignment.submission_type === 'text' || submittingAssignment.submission_type === 'both'}
                  placeholder="Paste your implementation source code, written explanation, or repository URL..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Attachment File / Document Name (Optional)</label>
                <input
                  placeholder="e.g. Solution-Archive.zip or Report.pdf"
                  value={submissionAttachment}
                  onChange={(e) => setSubmissionAttachment(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <Send size={16} />
                <span>Confirm & Submit Assignment</span>
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
                        <a
                          href={activeSubmissionToGrade.attachment_path}
                          target="_blank"
                          rel="noreferrer"
                          download={activeSubmissionToGrade.attachment_name ?? undefined}
                        >
                          {activeSubmissionToGrade.attachment_name ?? 'Open attachment'}
                        </a>
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
    </div>
  );
};
