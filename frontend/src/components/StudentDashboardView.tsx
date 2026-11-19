import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  ExternalLink,
  FileCheck,
  FileQuestion,
  GraduationCap,
  Play,
  PlayCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  Video
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { StudentDashboardData } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';

interface StudentDashboardViewProps {
  onOpenCourse: (courseId: string) => void;
  onNavigateTo: (view: 'courses' | 'assignments' | 'exams' | 'academic') => void;
  onOpenLogin: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  onOpenCourse,
  onNavigateTo,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<StudentDashboardData>('/dashboard/student');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Could not load student dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="student-dashboard-guest">
        <div className="guest-hero-card">
          <GraduationCap size={64} className="guest-hero-icon" />
          <h2>Welcome to ONI College Learning Space</h2>
          <p>
            Sign in with your student or faculty credentials to access your course curricula,
            assignments, timed examinations, and grades.
          </p>
          <div className="guest-actions">
            <button className="btn btn-primary btn-lg" onClick={onOpenLogin}>
              Sign In to Student Portal
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNavigateTo('courses')}>
              Browse Public Catalogue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-loading-state">
        <RefreshCw size={28} className="spinning" />
        <p>Loading your academic workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert alert-danger" style={{ margin: '24px 0' }}>
        <AlertCircle size={20} />
        <div>
          <strong>Failed to load dashboard</strong>
          <p>{error || 'An unexpected error occurred while loading student information.'}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { student, metrics, enrolled_courses, upcoming_deadlines, exams, recent_grades } = data;

  return (
    <div className="student-dashboard">
      {/* Student Profile Identity Header */}
      <section className="student-hero-banner">
        <div className="student-hero-profile">
          <div className="student-avatar-badge">
            {student.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="student-hero-details">
            <div className="student-meta-top">
              <span className="badge badge-roll">{student.student_id}</span>
              <span className="badge badge-sem">Semester {student.current_semester}</span>
              <span className="badge badge-active">{student.status.toUpperCase()}</span>
            </div>
            <h2>{student.name}</h2>
            <p className="student-degree-text">
              <strong>{student.programme}</strong> · {student.department}
            </p>
            <span className="student-cohort-sub">
              {student.batch} · Academic Session {student.academic_session}
            </span>
          </div>
        </div>

        <button className="btn btn-secondary btn-sm refresh-btn" onClick={loadDashboard} title="Refresh workspace">
          <RefreshCw size={14} /> Refresh
        </button>
      </section>

      {/* Metrics Highlights Bar */}
      <section className="student-metrics-row">
        <article className="student-metric-card">
          <div className="metric-header">
            <small>ENROLLED COURSES</small>
            <BookOpen size={18} className="metric-icon blue" />
          </div>
          <strong>{metrics.enrolled_courses_count}</strong>
          <span className="metric-sub">Active semester curricula</span>
        </article>

        <article className="student-metric-card">
          <div className="metric-header">
            <small>COURSE COMPLETION</small>
            <TrendingUp size={18} className="metric-icon green" />
          </div>
          <strong>{metrics.overall_progress_percentage}%</strong>
          <span className="metric-sub">
            {metrics.completed_lessons_count} of {metrics.total_lessons_count} lessons done
          </span>
        </article>

        <article className="student-metric-card">
          <div className="metric-header">
            <small>ATTENDANCE RATE</small>
            <UserCheck size={18} className="metric-icon purple" />
          </div>
          <strong>{metrics.attendance_percentage}%</strong>
          <span className="metric-sub">Above 75% required quota</span>
        </article>

        <article className="student-metric-card">
          <div className="metric-header">
            <small>PENDING TASKS</small>
            <ClipboardList size={18} className="metric-icon amber" />
          </div>
          <strong>{metrics.pending_assignments_count}</strong>
          <span className="metric-sub">Assignments due soon</span>
        </article>
      </section>

      {/* Continue Learning / Enrolled Courses Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h3>Continue Learning</h3>
            <p>Pick up right where you left off in your enrolled courses</p>
          </div>
          <button className="btn-link" onClick={() => onNavigateTo('courses')}>
            View All Courses <ArrowRight size={14} />
          </button>
        </div>

        <div className="enrolled-courses-grid">
          {enrolled_courses.map((course) => (
            <div key={course.id} className="student-course-card">
              <div className="course-card-top">
                <span className="course-tag">{course.code}</span>
                <span className="course-credits">{course.credits} Credits</span>
              </div>
              <h4>{course.title}</h4>

              {/* Progress bar */}
              <div className="course-progress-wrap">
                <div className="progress-info">
                  <small>Progress: {course.completed_lessons}/{course.total_lessons} Lessons</small>
                  <strong>{course.progress_percentage}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${course.progress_percentage}%` }}
                  />
                </div>
              </div>

              {/* Next Lesson Action */}
              {course.next_lesson ? (
                <div className="next-lesson-box">
                  <div className="next-lesson-info">
                    {course.next_lesson.type === 'video' ? (
                      <Video size={16} className="lesson-type-icon video" />
                    ) : (
                      <BookOpen size={16} className="lesson-type-icon text" />
                    )}
                    <div>
                      <small>NEXT LESSON</small>
                      <strong>{course.next_lesson.title}</strong>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm btn-block"
                    onClick={() => onOpenCourse(course.id)}
                  >
                    <Play size={14} /> Resume Lesson
                  </button>
                </div>
              ) : (
                <div className="all-completed-box">
                  <CheckCircle size={16} className="text-success" />
                  <span>All course lessons completed!</span>
                  <button
                    className="btn btn-secondary btn-sm btn-block"
                    style={{ marginTop: '8px' }}
                    onClick={() => onOpenCourse(course.id)}
                  >
                    Review Course Materials
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Two-Column Layout: Left (Deadlines & Exams), Right (Grades & Quick Tools) */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Deadlines & Assessments */}
        <div className="dashboard-col">
          {/* Upcoming Assignments */}
          <section className="dashboard-card-panel">
            <div className="panel-title-bar">
              <div className="panel-title-left">
                <ClipboardList size={18} className="panel-icon amber" />
                <h4>Assignments & Coursework</h4>
              </div>
              <button className="btn-link" onClick={() => onNavigateTo('assignments')}>
                View all ({upcoming_deadlines.length}) →
              </button>
            </div>

            {upcoming_deadlines.length === 0 ? (
              <p className="empty-panel-text">No active assignments due.</p>
            ) : (
              <div className="deadlines-list">
                {upcoming_deadlines.map((item) => (
                  <div key={item.id} className="deadline-item">
                    <div className="deadline-item-left">
                      <span className="deadline-course-pill">{item.course_code}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <div className="deadline-subtext">
                          <Clock size={12} />
                          <span>
                            Due: {item.due_date ? new Date(item.due_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : 'No deadline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="deadline-item-right">
                      {item.is_submitted ? (
                        <span className="badge badge-submitted">
                          <CheckCircle size={12} /> Submitted
                        </span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onNavigateTo('assignments')}
                        >
                          Submit Work
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Examinations & Tests */}
          <section className="dashboard-card-panel">
            <div className="panel-title-bar">
              <div className="panel-title-left">
                <FileQuestion size={18} className="panel-icon blue" />
                <h4>Examinations & Assessments</h4>
              </div>
              <button className="btn-link" onClick={() => onNavigateTo('exams')}>
                View all ({exams.length}) →
              </button>
            </div>

            {exams.length === 0 ? (
              <p className="empty-panel-text">No examinations scheduled currently.</p>
            ) : (
              <div className="deadlines-list">
                {exams.map((exam) => {
                  const latest = exam.latest_attempt;
                  const isFinished = latest && in_array_status(latest.status);

                  return (
                    <div key={exam.id} className="deadline-item">
                      <div className="deadline-item-left">
                        <span className="deadline-course-pill exam">EXAM</span>
                        <div>
                          <strong>{exam.title}</strong>
                          <div className="deadline-subtext">
                            <Clock size={12} />
                            <span>{exam.duration_minutes} Mins · {exam.total_marks} Marks</span>
                          </div>
                        </div>
                      </div>

                      <div className="deadline-item-right">
                        {isFinished ? (
                          <div className="exam-status-tag">
                            <span className={latest.is_passed ? 'tag-passed' : 'tag-failed'}>
                              {latest.is_passed ? 'Passed' : 'Failed'} ({latest.percentage}%)
                            </span>
                          </div>
                        ) : exam.has_active_attempt ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onNavigateTo('exams')}
                          >
                            <Play size={12} /> Resume
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onNavigateTo('exams')}
                          >
                            Start Exam
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Grades & Quick Services */}
        <div className="dashboard-col">
          {/* Recent Grades & Feedback */}
          <section className="dashboard-card-panel">
            <div className="panel-title-bar">
              <div className="panel-title-left">
                <Award size={18} className="panel-icon purple" />
                <h4>Recent Grades & Feedback</h4>
              </div>
            </div>

            {recent_grades.length === 0 ? (
              <div className="empty-feedback-state">
                <FileCheck size={32} strokeWidth={1.2} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                <p>No graded coursework yet. Submit your assignments and exams to see teacher feedback here!</p>
              </div>
            ) : (
              <div className="recent-grades-list">
                {recent_grades.map((grade, idx) => (
                  <div key={idx} className="recent-grade-item">
                    <div className="grade-item-header">
                      <div>
                        <span className="grade-course-code">{grade.course_code}</span>
                        <strong>{grade.title}</strong>
                      </div>
                      <span className="grade-score-chip">
                        {grade.score} / {grade.max_score}
                      </span>
                    </div>
                    {grade.feedback && (
                      <p className="grade-feedback-quote">
                        "{grade.feedback}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* College Quick Services */}
          <section className="dashboard-card-panel">
            <div className="panel-title-bar">
              <div className="panel-title-left">
                <Sparkles size={18} className="panel-icon amber" />
                <h4>Student Quick Actions</h4>
              </div>
            </div>

            <div className="quick-services-grid">
              <div
                className="quick-service-btn"
                onClick={() => onNavigateTo('courses')}
              >
                <BookOpen size={20} className="service-icon" />
                <div>
                  <strong>Browse Course Catalogue</strong>
                  <small>Explore elective courses & syllabi</small>
                </div>
              </div>

              <div
                className="quick-service-btn"
                onClick={() => onNavigateTo('assignments')}
              >
                <ClipboardList size={20} className="service-icon" />
                <div>
                  <strong>Submit Coursework</strong>
                  <small>Upload files or code submissions</small>
                </div>
              </div>

              <div
                className="quick-service-btn"
                onClick={() => onNavigateTo('exams')}
              >
                <FileQuestion size={20} className="service-icon" />
                <div>
                  <strong>Assessments & Quizzes</strong>
                  <small>Practice tests & scheduled exams</small>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

function in_array_status(status?: string): boolean {
  return status === 'evaluated' || status === 'submitted';
}
