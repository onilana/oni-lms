import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  FileQuestion,
  HelpCircle,
  Plus,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
  XCircle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { Course } from '../types/course';
import type { Exam, ExamAttempt, Question } from '../types/exam';
import { useAuth } from '../context/AuthContext';
import { ExamTakingModal } from './ExamTakingModal';

export const ExamsView: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const isStaff = hasRole('teacher') || hasRole('super_admin') || hasPermission('exams.manage');

  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active taking exam modal state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ExamAttempt | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [startingExam, setStartingExam] = useState(false);

  // Teacher create exam modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCourseId, setCreateCourseId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDuration, setCreateDuration] = useState(60);
  const [createMarks, setCreateMarks] = useState(100);
  const [createPassPct, setCreatePassPct] = useState(50);
  const [createShuffle, setCreateShuffle] = useState(true);
  const [createPublish, setCreatePublish] = useState(true);

  // Teacher add question modal
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [targetExam, setTargetExam] = useState<Exam | null>(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer'>('mcq_single');
  const [qPoints, setQPoints] = useState(2.0);
  const [qExplanation, setQExplanation] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrectChoice, setQCorrectChoice] = useState('a');

  // Load courses
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await apiRequest<{ data: Course[] }>('/courses');
      setCourses(res.data);
      if (res.data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(res.data[0].id);
        setCreateCourseId(res.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    }
  };

  // Load exams when selected course changes
  useEffect(() => {
    if (selectedCourseId) {
      loadExams(selectedCourseId);
    }
  }, [selectedCourseId]);

  const loadExams = async (courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: Exam[] }>(`/courses/${courseId}/exams`);
      setExams(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (exam: Exam) => {
    try {
      setStartingExam(true);
      const res = await apiRequest<{
        message: string;
        attempt: ExamAttempt;
        questions: Question[];
      }>(`/exams/${exam.id}/start`, {
        method: 'POST',
      });

      setActiveExam(exam);
      setActiveAttempt(res.attempt);
      setActiveQuestions(res.questions);
    } catch (err: any) {
      alert(err.message || 'Could not start examination');
    } finally {
      setStartingExam(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCourseId || !createTitle) return;

    try {
      await apiRequest(`/courses/${createCourseId}/exams`, {
        method: 'POST',
        body: JSON.stringify({
          title: createTitle,
          description: createDesc,
          duration_minutes: Number(createDuration),
          total_marks: Number(createMarks),
          passing_percentage: Number(createPassPct),
          shuffle_questions: createShuffle,
          is_published: createPublish,
        }),
      });

      setIsCreateOpen(false);
      setCreateTitle('');
      setCreateDesc('');
      if (selectedCourseId === createCourseId) {
        loadExams(selectedCourseId);
      } else {
        setSelectedCourseId(createCourseId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create exam');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExam || !qText) return;

    let options = null;
    let correctAnswers = [qCorrectChoice];

    if (qType === 'mcq_single' || qType === 'mcq_multiple') {
      options = [
        { id: 'a', text: qOptA },
        { id: 'b', text: qOptB },
      ];
      if (qOptC) options.push({ id: 'c', text: qOptC });
      if (qOptD) options.push({ id: 'd', text: qOptD });
    } else if (qType === 'true_false') {
      options = [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
    } else if (qType === 'short_answer') {
      correctAnswers = [qCorrectChoice.trim()];
    }

    try {
      // 1. Create question
      const qRes = await apiRequest<{ data: Question }>('/questions', {
        method: 'POST',
        body: JSON.stringify({
          course_id: targetExam.course_id,
          question_text: qText,
          question_type: qType,
          options,
          correct_answers: correctAnswers,
          points: Number(qPoints),
          explanation: qExplanation,
        }),
      });

      // 2. Attach to exam
      await apiRequest(`/exams/${targetExam.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          question_ids: [qRes.data.id],
        }),
      });

      setIsAddQuestionOpen(false);
      setTargetExam(null);
      setQText('');
      setQOptA('');
      setQOptB('');
      setQOptC('');
      setQOptD('');
      setQExplanation('');
      loadExams(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to add question');
    }
  };

  return (
    <div className="exams-view">
      {/* Header bar */}
      <div className="exams-header">
        <div>
          <h2>Examinations & Assessments</h2>
          <p>Timed tests with server-authoritative timer, secure evaluation, and autosave.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: '240px' }}
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.title}
              </option>
            ))}
          </select>

          <button
            className="btn btn-secondary"
            onClick={() => selectedCourseId && loadExams(selectedCourseId)}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>

          {isStaff && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} /> Create Exam
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Exams Grid */}
      {loading ? (
        <p>Loading examinations...</p>
      ) : exams.length === 0 ? (
        <div className="empty-player-state">
          <FileQuestion size={48} strokeWidth={1.2} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <h3>No Examinations Found</h3>
          <p>There are currently no scheduled examinations for this course.</p>
        </div>
      ) : (
        <div className="exams-grid">
          {exams.map((exam) => {
            const hasActiveAttempt = exam.my_active_attempt !== null && exam.my_active_attempt !== undefined;
            const latestAttempt = exam.my_latest_attempt;
            const isCompleted = latestAttempt && latestAttempt.status === 'evaluated';

            return (
              <div key={exam.id} className="exam-card">
                <div className="exam-card-header">
                  <div>
                    <h3>{exam.title}</h3>
                    <div className="exam-badges">
                      <span className="badge-duration">
                        <Clock size={12} /> {exam.duration_minutes} Mins
                      </span>
                      <span className="badge-marks">
                        <Award size={12} /> {exam.total_marks} Marks
                      </span>
                      <span className="badge-pass">Pass: {exam.passing_percentage}%</span>
                      {!exam.is_published && (
                        <span className="badge-draft">Draft</span>
                      )}
                    </div>
                  </div>
                </div>

                {exam.description && <p className="exam-desc">{exam.description}</p>}

                <div className="exam-info-bar">
                  <span>Questions: <strong>{exam.questions_count ?? 0}</strong></span>
                  <span>Max Attempts: <strong>{exam.max_attempts}</strong></span>
                </div>

                {/* Score summary for student if completed */}
                {isCompleted && (
                  <div className={`exam-latest-score ${latestAttempt.is_passed ? 'passed' : 'failed'}`}>
                    {latestAttempt.is_passed ? (
                      <CheckCircle size={18} className="score-icon passed" />
                    ) : (
                      <XCircle size={18} className="score-icon failed" />
                    )}
                    <div>
                      <strong>
                        {latestAttempt.is_passed ? 'Passed' : 'Failed'} · {latestAttempt.percentage}%
                      </strong>
                      <small>Score: {latestAttempt.score} / {exam.total_marks}</small>
                    </div>
                  </div>
                )}

                <div className="exam-card-actions">
                  {hasActiveAttempt ? (
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => handleStartExam(exam)}
                      disabled={startingExam}
                    >
                      <Play size={16} /> Resume Examination
                    </button>
                  ) : isCompleted ? (
                    <button
                      className="btn btn-secondary btn-block"
                      onClick={() => handleStartExam(exam)}
                      disabled={startingExam}
                    >
                      Retake Exam (Attempt {(latestAttempt.attempt_number || 1) + 1} of {exam.max_attempts})
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => handleStartExam(exam)}
                      disabled={startingExam || !exam.is_open}
                    >
                      <Play size={16} /> Start Examination
                    </button>
                  )}

                  {isStaff && (
                    <button
                      className="btn btn-outline"
                      title="Add Question to Exam"
                      onClick={() => {
                        setTargetExam(exam);
                        setIsAddQuestionOpen(true);
                      }}
                    >
                      <Plus size={15} /> Add Question
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Taking Exam Modal */}
      {activeExam && activeAttempt && (
        <ExamTakingModal
          exam={activeExam}
          initialAttempt={activeAttempt}
          initialQuestions={activeQuestions}
          onClose={() => {
            setActiveExam(null);
            setActiveAttempt(null);
            setActiveQuestions([]);
            loadExams(selectedCourseId);
          }}
          onFinished={() => {
            loadExams(selectedCourseId);
          }}
        />
      )}

      {/* Create Exam Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Create Examination</h3>
              <button className="btn-icon" onClick={() => setIsCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExam}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Course</label>
                  <select
                    className="form-control"
                    value={createCourseId}
                    onChange={(e) => setCreateCourseId(e.target.value)}
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Exam Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Midterm Assessment: Binary Trees & Heaps"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description / Overview</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                  />
                </div>

                <div className="field-row">
                  <div className="form-group">
                    <label>Duration (Minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={createDuration}
                      min={5}
                      max={600}
                      onChange={(e) => setCreateDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Marks</label>
                    <input
                      type="number"
                      className="form-control"
                      value={createMarks}
                      min={1}
                      onChange={(e) => setCreateMarks(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="form-group">
                    <label>Passing Percentage (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={createPassPct}
                      min={1}
                      max={100}
                      onChange={(e) => setCreatePassPct(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px' }}>
                      <input
                        type="checkbox"
                        checked={createShuffle}
                        onChange={(e) => setCreateShuffle(e.target.checked)}
                      />
                      <span>Shuffle Questions</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createPublish}
                      onChange={(e) => setCreatePublish(e.target.checked)}
                    />
                    <span>Publish Immediately (Students can view & attempt)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {isAddQuestionOpen && targetExam && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>Add Question to {targetExam.title}</h3>
              <button className="btn-icon" onClick={() => setIsAddQuestionOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddQuestion}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Question Type</label>
                  <select
                    className="form-control"
                    value={qType}
                    onChange={(e: any) => setQType(e.target.value)}
                  >
                    <option value="mcq_single">Single Choice (Radio)</option>
                    <option value="mcq_multiple">Multiple Choice (Checkboxes)</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer (Text)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Question Prompt / Text</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="e.g. What is the time complexity of QuickSort average case?"
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    required
                  />
                </div>

                {(qType === 'mcq_single' || qType === 'mcq_multiple') && (
                  <div className="options-input-group">
                    <label>Options & Correct Answer</label>
                    <div className="option-input-row">
                      <span className="opt-key">A</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Option A text"
                        value={qOptA}
                        onChange={(e) => setQOptA(e.target.value)}
                        required
                      />
                    </div>
                    <div className="option-input-row">
                      <span className="opt-key">B</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Option B text"
                        value={qOptB}
                        onChange={(e) => setQOptB(e.target.value)}
                        required
                      />
                    </div>
                    <div className="option-input-row">
                      <span className="opt-key">C</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Option C text (optional)"
                        value={qOptC}
                        onChange={(e) => setQOptC(e.target.value)}
                      />
                    </div>
                    <div className="option-input-row">
                      <span className="opt-key">D</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Option D text (optional)"
                        value={qOptD}
                        onChange={(e) => setQOptD(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label>Correct Option Key</label>
                      <select
                        className="form-control"
                        value={qCorrectChoice}
                        onChange={(e) => setQCorrectChoice(e.target.value)}
                      >
                        <option value="a">Option A</option>
                        <option value="b">Option B</option>
                        {qOptC && <option value="c">Option C</option>}
                        {qOptD && <option value="d">Option D</option>}
                      </select>
                    </div>
                  </div>
                )}

                {qType === 'true_false' && (
                  <div className="form-group">
                    <label>Correct Answer</label>
                    <select
                      className="form-control"
                      value={qCorrectChoice}
                      onChange={(e) => setQCorrectChoice(e.target.value)}
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                )}

                {qType === 'short_answer' && (
                  <div className="form-group">
                    <label>Expected Answer (Exact or Case-Insensitive)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. stack"
                      value={qCorrectChoice}
                      onChange={(e) => setQCorrectChoice(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="field-row">
                  <div className="form-group">
                    <label>Points / Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className="form-control"
                      value={qPoints}
                      onChange={(e) => setQPoints(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Explanation / Feedback (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Shown after completion"
                      value={qExplanation}
                      onChange={(e) => setQExplanation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddQuestionOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
