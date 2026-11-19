import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Save,
  Send,
  XCircle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { Exam, ExamAttempt, Question } from '../types/exam';

interface ExamTakingModalProps {
  exam: Exam;
  initialAttempt: ExamAttempt;
  initialQuestions: Question[];
  onClose: () => void;
  onFinished: () => void;
}

export const ExamTakingModal: React.FC<ExamTakingModalProps> = ({
  exam,
  initialAttempt,
  initialQuestions,
  onClose,
  onFinished,
}) => {
  const [attempt, setAttempt] = useState<ExamAttempt>(initialAttempt);
  const [questions] = useState<Question[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student answer state: questionId -> value (string | string[])
  const [answers, setAnswers] = useState<Record<string, any>>(
    initialAttempt.answers_snapshot || {}
  );

  const [timeRemaining, setTimeRemaining] = useState<number>(
    initialAttempt.time_remaining_seconds || exam.duration_minutes * 60
  );

  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamAttempt | null>(
    initialAttempt.status === 'evaluated' ? initialAttempt : null
  );
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (result) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [result]);

  // Autosave function
  const autosave = useCallback(async (currentAnswers: Record<string, any>) => {
    if (attempt.status !== 'in_progress') return;
    try {
      setSaving(true);
      const res = await apiRequest<{ message: string; time_remaining_seconds: number }>(
        `/attempts/${attempt.id}/save`,
        {
          method: 'POST',
          body: JSON.stringify({ answers: currentAnswers }),
        }
      );
      setLastSavedTime(new Date());
      if (res.time_remaining_seconds !== undefined) {
        setTimeRemaining(res.time_remaining_seconds);
      }
    } catch (err) {
      console.error('Autosave error', err);
    } finally {
      setSaving(false);
    }
  }, [attempt.id, attempt.status]);

  // Periodic autosave every 25 seconds
  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      autosave(answers);
    }, 25000);
    return () => clearInterval(interval);
  }, [answers, autosave, result]);

  const handleSelectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      if (isMultiple) {
        const currentArr = Array.isArray(updated[questionId]) ? [...updated[questionId]] : [];
        if (currentArr.includes(optionId)) {
          updated[questionId] = currentArr.filter((id) => id !== optionId);
        } else {
          updated[questionId] = [...currentArr, optionId];
        }
      } else {
        updated[questionId] = optionId;
      }
      return updated;
    });
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleAutoSubmit = async () => {
    if (submitting || result) return;
    await submitExam();
  };

  const submitExam = async () => {
    try {
      setSubmitting(true);
      const res = await apiRequest<{ message: string; data: ExamAttempt }>(
        `/attempts/${attempt.id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ answers }),
        }
      );
      setResult(res.data);
      setAttempt(res.data);
      setConfirmSubmitOpen(false);
      onFinished();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== '' && (!Array.isArray(answers[k]) || answers[k].length > 0)
  ).length;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 180; // less than 3 minutes

  return (
    <div className="modal-overlay exam-take-overlay">
      <div className="modal-container exam-take-container">
        {/* Exam Header */}
        <header className="exam-header">
          <div>
            <span className="exam-category-pill">ACADEMIC ASSESSMENT</span>
            <h2>{exam.title}</h2>
          </div>

          {!result && (
            <div className="exam-header-right">
              <div className={`countdown-box ${isLowTime ? 'urgent' : ''}`}>
                <Clock size={18} />
                <span className="countdown-time">{formatTimer(timeRemaining)}</span>
              </div>
              <div className="autosave-indicator">
                <Save size={14} className={saving ? 'spinning' : ''} />
                <span>{saving ? 'Autosaving...' : `Saved ${lastSavedTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}</span>
              </div>
            </div>
          )}
        </header>

        {result ? (
          /* Result scorecard screen */
          <div className="exam-result-screen">
            <div className={`scorecard-banner ${result.is_passed ? 'passed' : 'failed'}`}>
              {result.is_passed ? (
                <CheckCircle size={56} className="scorecard-icon passed" />
              ) : (
                <XCircle size={56} className="scorecard-icon failed" />
              )}
              <h3>{result.is_passed ? 'Congratulations! You Passed!' : 'Exam Completed'}</h3>
              <p>
                {result.is_passed
                  ? `You have achieved the required passing benchmark of ${exam.passing_percentage}%.`
                  : `Your score is below the required passing percentage of ${exam.passing_percentage}%.`}
              </p>
            </div>

            <div className="result-metrics-grid">
              <div className="result-metric-card">
                <small>YOUR SCORE</small>
                <strong>{result.score} / {exam.total_marks}</strong>
              </div>
              <div className="result-metric-card">
                <small>PERCENTAGE</small>
                <strong>{result.percentage}%</strong>
              </div>
              <div className="result-metric-card">
                <small>PASSING BENCHMARK</small>
                <strong>{exam.passing_percentage}%</strong>
              </div>
              <div className="result-metric-card">
                <small>STATUS</small>
                <strong className={result.is_passed ? 'text-success' : 'text-danger'}>
                  {result.is_passed ? 'PASSED' : 'NOT PASSED'}
                </strong>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={onClose}>
                Back to Exams Catalogue
              </button>
            </div>
          </div>
        ) : (
          /* Active Examination Interface */
          <div className="exam-active-layout">
            <div className="exam-question-area">
              {currentQ ? (
                <div className="question-card">
                  <div className="question-top-meta">
                    <span className="question-number">Question {currentIndex + 1} of {questions.length}</span>
                    <span className="question-points">
                      {currentQ.pivot_points || currentQ.points} Points
                    </span>
                  </div>

                  <p className="question-text">{currentQ.question_text}</p>

                  <div className="options-container">
                    {/* MCQ Single / True False */}
                    {(currentQ.question_type === 'mcq_single' || currentQ.question_type === 'true_false') && (
                      <div className="options-list">
                        {currentQ.options?.map((opt) => {
                          const isSelected = answers[currentQ.id] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              className={`option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectOption(currentQ.id, opt.id, false)}
                            >
                              <input
                                type="radio"
                                name={`q_${currentQ.id}`}
                                checked={isSelected}
                                onChange={() => {}}
                              />
                              <span className="option-label">{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* MCQ Multiple */}
                    {currentQ.question_type === 'mcq_multiple' && (
                      <div className="options-list">
                        <small className="hint-text">Select all applicable options</small>
                        {currentQ.options?.map((opt) => {
                          const currentArr = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                          const isChecked = currentArr.includes(opt.id);
                          return (
                            <label
                              key={opt.id}
                              className={`option-item ${isChecked ? 'selected' : ''}`}
                              onClick={() => handleSelectOption(currentQ.id, opt.id, true)}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                              />
                              <span className="option-label">{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer */}
                    {currentQ.question_type === 'short_answer' && (
                      <div className="short-answer-input-wrap">
                        <textarea
                          className="form-control"
                          rows={3}
                          placeholder="Type your answer here..."
                          value={answers[currentQ.id] || ''}
                          onChange={(e) => handleShortAnswerChange(currentQ.id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="question-nav-actions">
                    <button
                      className="btn btn-secondary"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    {currentIndex < questions.length - 1 ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary finish-btn"
                        onClick={() => setConfirmSubmitOpen(true)}
                      >
                        Review & Submit <Send size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p>No questions found in this assessment.</p>
              )}
            </div>

            {/* Sidebar question grid */}
            <aside className="exam-nav-sidebar">
              <h4>Question Navigator</h4>
              <p className="summary-text">
                Answered: <strong>{answeredCount}</strong> of <strong>{questions.length}</strong>
              </p>
              <div className="questions-number-grid">
                {questions.map((q, idx) => {
                  const hasAnswered =
                    answers[q.id] !== undefined &&
                    answers[q.id] !== '' &&
                    (!Array.isArray(answers[q.id]) || answers[q.id].length > 0);
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      className={`grid-number-btn ${isCurrent ? 'active' : ''} ${
                        hasAnswered ? 'answered' : ''
                      }`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="submit-attempt-box">
                <button
                  className="btn btn-success btn-block"
                  onClick={() => setConfirmSubmitOpen(true)}
                  disabled={submitting}
                >
                  <Send size={16} /> Submit Assessment
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Confirmation modal */}
        {confirmSubmitOpen && (
          <div className="modal-overlay inner-confirm-overlay">
            <div className="modal-container" style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h3>Submit Assessment?</h3>
              </div>
              <div className="modal-body">
                <p>
                  You have answered <strong>{answeredCount}</strong> out of{' '}
                  <strong>{questions.length}</strong> questions.
                </p>
                {answeredCount < questions.length && (
                  <p className="text-warning">
                    <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    You have unanswered questions. Once submitted, your answers will be finalized immediately.
                  </p>
                )}
                <p>Are you sure you want to end this examination now?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmSubmitOpen(false)}
                  disabled={submitting}
                >
                  Return to Test
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitExam}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
