import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  Edit2,
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
  const [attemptResponseTiming, setAttemptResponseTiming] = useState<{ requestedAt: number; receivedAt: number } | null>(null);
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

  // Teacher edit exam modal
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editMarks, setEditMarks] = useState(100);
  const [editPassPct, setEditPassPct] = useState(50);
  const [editShuffle, setEditShuffle] = useState(true);
  const [editMaxAttempts, setEditMaxAttempts] = useState(1);
  const [editPublish, setEditPublish] = useState(true);

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
  const [qCorrectChoices, setQCorrectChoices] = useState<string[]>(['a']);

  // Edit Question modal
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQPoints, setEditQPoints] = useState(2.0);
  const [editQExplanation, setEditQExplanation] = useState('');
  const [editQOptA, setEditQOptA] = useState('');
  const [editQOptB, setEditQOptB] = useState('');
  const [editQOptC, setEditQOptC] = useState('');
  const [editQOptD, setEditQOptD] = useState('');
  const [editQCorrectChoice, setEditQCorrectChoice] = useState('a');
  const [editQCorrectChoices, setEditQCorrectChoices] = useState<string[]>(['a']);

  // Manage Questions modal
  const [isManageQuestionsOpen, setIsManageQuestionsOpen] = useState(false);
  const [manageQuestionsExam, setManageQuestionsExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const selectedCourseIdRef = useRef(selectedCourseId);
  selectedCourseIdRef.current = selectedCourseId;
  const examsLoadIdRef = useRef(0);

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
    const requestId = ++examsLoadIdRef.current;
    const isCurrentRequest = () =>
      requestId === examsLoadIdRef.current && courseId === selectedCourseIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: Exam[] }>(`/courses/${courseId}/exams`);
      if (!isCurrentRequest()) return;
      setExams(res.data);
    } catch (err: any) {
      if (!isCurrentRequest()) return;
      setError(err.message || 'Failed to load examinations');
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  };

  const selectCourse = (courseId: string) => {
    selectedCourseIdRef.current = courseId;
    examsLoadIdRef.current += 1;
    setSelectedCourseId(courseId);
    setExams([]);
    setError(null);
    setLoading(!!courseId);
  };

  const handleStartExam = async (exam: Exam) => {
    try {
      setStartingExam(true);
      const requestedAt = Date.now();
      const res = await apiRequest<{
        message: string;
        attempt: ExamAttempt;
        questions: Question[];
      }>(`/exams/${exam.id}/start`, {
        method: 'POST',
      });
      const receivedAt = Date.now();

      setActiveExam(exam);
      setActiveAttempt(res.attempt);
      setActiveQuestions(res.questions);
      setAttemptResponseTiming({ requestedAt, receivedAt });
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
        selectCourse(createCourseId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create exam');
    }
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDesc(exam.description || '');
    setEditDuration(exam.duration_minutes);
    setEditMarks(exam.total_marks);
    setEditPassPct(exam.passing_percentage);
    setEditShuffle(exam.shuffle_questions);
    setEditMaxAttempts(exam.max_attempts);
    setEditPublish(exam.is_published);
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    try {
      await apiRequest(`/exams/${editingExam.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          duration_minutes: Number(editDuration),
          total_marks: Number(editMarks),
          passing_percentage: Number(editPassPct),
          shuffle_questions: editShuffle,
          max_attempts: Number(editMaxAttempts),
          is_published: editPublish,
        }),
      });

      setEditingExam(null);
      if (selectedCourseId) {
        loadExams(selectedCourseId);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating exam');
    }
  };

  const loadExamQuestions = async (exam: Exam) => {
    setLoadingQuestions(true);
    try {
      const res = await apiRequest<{ data: Question[] }>(`/exams/${exam.id}/questions`);
      setExamQuestions(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const openManageQuestions = async (exam: Exam) => {
    setManageQuestionsExam(exam);
    setIsManageQuestionsOpen(true);
    await loadExamQuestions(exam);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditQText(q.question_text);
    setEditQPoints(q.points);
    setEditQExplanation(q.explanation || '');
    const opts = q.options as Array<{ id: string; text: string }> | null;
    if (opts) {
      setEditQOptA(opts.find(o => o.id === 'a')?.text || '');
      setEditQOptB(opts.find(o => o.id === 'b')?.text || '');
      setEditQOptC(opts.find(o => o.id === 'c')?.text || '');
      setEditQOptD(opts.find(o => o.id === 'd')?.text || '');
    }
    const ca = q.correct_answers as string[];
    if (q.question_type === 'mcq_multiple') {
      setEditQCorrectChoices(ca || ['a']);
      setEditQCorrectChoice(ca?.[0] || 'a');
    } else {
      setEditQCorrectChoice(ca?.[0] || 'a');
      setEditQCorrectChoices(ca || ['a']);
    }
    setIsEditQuestionOpen(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      const opts = (editingQuestion.question_type === 'mcq_single' || editingQuestion.question_type === 'mcq_multiple')
        ? [
            { id: 'a', text: editQOptA },
            { id: 'b', text: editQOptB },
            ...(editQOptC.trim() ? [{ id: 'c', text: editQOptC }] : []),
            ...(editQOptD.trim() ? [{ id: 'd', text: editQOptD }] : []),
          ]
        : editingQuestion.options;
      const correctAnswers = editingQuestion.question_type === 'mcq_multiple'
        ? editQCorrectChoices
        : [editQCorrectChoice];
      await apiRequest(`/questions/${editingQuestion.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          question_text: editQText,
          options: opts,
          correct_answers: correctAnswers,
          points: Number(editQPoints),
          explanation: editQExplanation,
        }),
      });
      setIsEditQuestionOpen(false);
      setEditingQuestion(null);
      if (manageQuestionsExam) {
        await loadExamQuestions(manageQuestionsExam);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update question');
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
      if (qOptC.trim()) options.push({ id: 'c', text: qOptC });
      if (qOptD.trim()) options.push({ id: 'd', text: qOptD });
      const optionIds = new Set(options.map((option) => option.id));
      correctAnswers = qType === 'mcq_multiple' ? qCorrectChoices : [qCorrectChoice];
      if (
        correctAnswers.length === 0 ||
        correctAnswers.some((answer) => !optionIds.has(answer))
      ) {
        alert('Select at least one correct answer from the current options.');
        return;
      }
    } else if (qType === 'true_false') {
      options = [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
      if (!['true', 'false'].includes(qCorrectChoice)) {
        alert('Select a valid True/False answer.');
        return;
      }
    } else if (qType === 'short_answer') {
      correctAnswers = [qCorrectChoice.trim()];
      if (!correctAnswers[0]) {
        alert('Enter the expected short answer.');
        return;
      }
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
      if (selectedCourseIdRef.current === targetExam.course_id) {
        loadExams(targetExam.course_id);
      }
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
            onChange={(e) => selectCourse(e.target.value)}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        title="Add Question to Exam"
                        onClick={() => {
                          setTargetExam(exam);
                          setIsAddQuestionOpen(true);
                        }}
                      >
                        <Plus size={14} /> Add
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        title="View and Edit Questions"
                        onClick={() => openManageQuestions(exam)}
                      >
                        <FileQuestion size={14} /> Questions
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Edit Exam Configuration"
                        onClick={() => handleOpenEdit(exam)}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </div>
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
          initialResponseTiming={attemptResponseTiming ?? undefined}
          onClose={() => {
            setActiveExam(null);
            setActiveAttempt(null);
            setActiveQuestions([]);
            setAttemptResponseTiming(null);
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

      {/* Edit Exam Modal */}
      {editingExam && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Edit Examination: {editingExam.title}</h3>
              <button className="btn-icon" onClick={() => setEditingExam(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateExam}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Exam Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Midterm Assessment: Binary Trees & Heaps"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description / Overview</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>

                <div className="field-row">
                  <div className="form-group">
                    <label>Duration (Minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editDuration}
                      min={1}
                      max={600}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Marks</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editMarks}
                      min={1}
                      onChange={(e) => setEditMarks(Number(e.target.value))}
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
                      value={editPassPct}
                      min={1}
                      max={100}
                      onChange={(e) => setEditPassPct(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Attempts</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editMaxAttempts}
                      min={1}
                      max={10}
                      onChange={(e) => setEditMaxAttempts(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editShuffle}
                      onChange={(e) => setEditShuffle(e.target.checked)}
                    />
                    <span>Shuffle Questions</span>
                  </label>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editPublish}
                      onChange={(e) => setEditPublish(e.target.checked)}
                    />
                    <span>Publish (Visible &amp; Accessible to Enrolled Students)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingExam(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
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
                    onChange={(e) => {
                      const nextType = e.target.value as typeof qType;
                      setQType(nextType);
                      setQCorrectChoice(nextType === 'true_false' ? 'true' : nextType === 'short_answer' ? '' : 'a');
                      setQCorrectChoices(['a']);
                    }}
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

                    {qType === 'mcq_single' ? (
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Correct Option Key</label>
                        <select
                          className="form-control"
                          value={qCorrectChoice}
                          onChange={(e) => setQCorrectChoice(e.target.value)}
                        >
                          <option value="a">Option A</option>
                          <option value="b">Option B</option>
                          {qOptC.trim() && <option value="c">Option C</option>}
                          {qOptD.trim() && <option value="d">Option D</option>}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Correct Option Keys</label>
                        {[
                          { id: 'a', text: 'Option A' },
                          { id: 'b', text: 'Option B' },
                          ...(qOptC.trim() ? [{ id: 'c', text: 'Option C' }] : []),
                          ...(qOptD.trim() ? [{ id: 'd', text: 'Option D' }] : []),
                        ].map((option) => (
                          <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={qCorrectChoices.includes(option.id)}
                              onChange={(e) => setQCorrectChoices((current) =>
                                e.target.checked
                                  ? [...current, option.id]
                                  : current.filter((id) => id !== option.id)
                              )}
                            />
                            {option.text}
                          </label>
                        ))}
                      </div>
                    )}
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

      {/* Manage Exam Questions Modal */}
      {isManageQuestionsOpen && manageQuestionsExam && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3>Manage Questions: {manageQuestionsExam.title}</h3>
              <button className="btn-icon" onClick={() => setIsManageQuestionsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {loadingQuestions ? (
                <p>Loading questions...</p>
              ) : examQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <FileQuestion size={40} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                  <p>No questions attached to this examination yet.</p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setTargetExam(manageQuestionsExam);
                      setIsAddQuestionOpen(true);
                    }}
                  >
                    <Plus size={14} /> Add First Question
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {examQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span className="badge badge-role">Q{idx + 1}</span>
                          <span className="badge badge-duration">{q.points} Marks</span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>{q.question_type}</span>
                        </div>
                        <p style={{ margin: '4px 0', fontWeight: 600 }}>{q.question_text}</p>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {q.options.map((opt: any) => (
                              <span key={opt.id} style={{ marginRight: '10px' }}>
                                <strong>{opt.id.toUpperCase()}:</strong> {opt.text}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.explanation && (
                          <small style={{ color: '#0284c7', display: 'block', marginTop: '4px' }}>
                            Explanation: {q.explanation}
                          </small>
                        )}
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEditQuestion(q)}
                        title="Edit Question"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setTargetExam(manageQuestionsExam);
                  setIsAddQuestionOpen(true);
                }}
              >
                <Plus size={14} /> Add Another Question
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsManageQuestionsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {isEditQuestionOpen && editingQuestion && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>Edit Question ({editingQuestion.question_type})</h3>
              <button className="btn-icon" onClick={() => setIsEditQuestionOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateQuestion}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Question Prompt / Text</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={editQText}
                    onChange={(e) => setEditQText(e.target.value)}
                    required
                  />
                </div>

                {(editingQuestion.question_type === 'mcq_single' || editingQuestion.question_type === 'mcq_multiple') && (
                  <div className="options-input-group">
                    <label>Options & Correct Answer</label>
                    <div className="option-input-row">
                      <span className="opt-key">A</span>
                      <input
                        type="text"
                        className="form-control"
                        value={editQOptA}
                        onChange={(e) => setEditQOptA(e.target.value)}
                        required
                      />
                    </div>
                    <div className="option-input-row">
                      <span className="opt-key">B</span>
                      <input
                        type="text"
                        className="form-control"
                        value={editQOptB}
                        onChange={(e) => setEditQOptB(e.target.value)}
                        required
                      />
                    </div>
                    <div className="option-input-row">
                      <span className="opt-key">C</span>
                      <input
                        type="text"
                        className="form-control"
                        value={editQOptC}
                        onChange={(e) => setEditQOptC(e.target.value)}
                        placeholder="Option C (optional)"
                      />
                    </div>
                    <div className="option-input-row">
                      <span className="opt-key">D</span>
                      <input
                        type="text"
                        className="form-control"
                        value={editQOptD}
                        onChange={(e) => setEditQOptD(e.target.value)}
                        placeholder="Option D (optional)"
                      />
                    </div>

                    {editingQuestion.question_type === 'mcq_single' ? (
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Correct Option Key</label>
                        <select
                          className="form-control"
                          value={editQCorrectChoice}
                          onChange={(e) => setEditQCorrectChoice(e.target.value)}
                        >
                          <option value="a">Option A</option>
                          <option value="b">Option B</option>
                          {editQOptC.trim() && <option value="c">Option C</option>}
                          {editQOptD.trim() && <option value="d">Option D</option>}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Correct Option Keys</label>
                        {[
                          { id: 'a', text: 'Option A' },
                          { id: 'b', text: 'Option B' },
                          ...(editQOptC.trim() ? [{ id: 'c', text: 'Option C' }] : []),
                          ...(editQOptD.trim() ? [{ id: 'd', text: 'Option D' }] : []),
                        ].map((option) => (
                          <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={editQCorrectChoices.includes(option.id)}
                              onChange={(e) => setEditQCorrectChoices((current) =>
                                e.target.checked
                                  ? [...current, option.id]
                                  : current.filter((id) => id !== option.id)
                              )}
                            />
                            {option.text}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editingQuestion.question_type === 'true_false' && (
                  <div className="form-group">
                    <label>Correct Answer</label>
                    <select
                      className="form-control"
                      value={editQCorrectChoice}
                      onChange={(e) => setEditQCorrectChoice(e.target.value)}
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                )}

                {editingQuestion.question_type === 'short_answer' && (
                  <div className="form-group">
                    <label>Expected Short Answer</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editQCorrectChoice}
                      onChange={(e) => setEditQCorrectChoice(e.target.value)}
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
                      value={editQPoints}
                      onChange={(e) => setEditQPoints(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Explanation / Feedback (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Shown after completion"
                      value={editQExplanation}
                      onChange={(e) => setEditQExplanation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditQuestionOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
