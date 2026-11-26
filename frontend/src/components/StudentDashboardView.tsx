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
  Edit2,
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
  Video,
  X
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { StudentDashboardData } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';

interface StudentDashboardViewProps {
  onOpenCourse: (courseId: string) => void;
  onNavigateTo: (view: 'courses' | 'assignments' | 'exams' | 'academic' | 'attendance') => void;
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

  // Student Profile Edit State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [profileRollNo, setProfileRollNo] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileFatherName, setProfileFatherName] = useState('');
  const [profileMotherName, setProfileMotherName] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

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

  const openEditProfile = () => {
    if (!data?.student) return;
    setProfileName(data.student.name || '');
    setProfileDob(data.student.date_of_birth ? data.student.date_of_birth.substring(0, 10) : '');
    setProfileGender(data.student.gender || '');
    setProfileRollNo(data.student.class_roll_no || '');
    setProfilePhone(data.student.phone || '');
    setProfileFatherName(data.student.father_name || '');
    setProfileMotherName(data.student.mother_name || '');
    setProfileAddress(data.student.address || '');
    setProfileError(null);
    setProfileSuccess(null);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await apiRequest('/student/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileName,
          date_of_birth: profileDob || null,
          gender: profileGender || null,
          class_roll_no: profileRollNo || null,
          phone: profilePhone || null,
          father_name: profileFatherName || null,
          mother_name: profileMotherName || null,
          address: profileAddress || null,
        }),
      });
      setProfileSuccess('Profile details successfully saved for certification and institutional records!');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        loadDashboard();
      }, 1000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update student profile');
    } finally {
      setIsSavingProfile(false);
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
              <span className="badge badge-roll">{student.student_id_number || student.student_id}</span>
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

      {/* Official Student Academic Details & Profile Card */}
      <section className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px' }}>Student Profile & Official Record</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Institutional profile details used for communication, certification, and academic documentation</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={openEditProfile} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={13} /> Edit / Fill Profile Details
            </button>
            <span className={`badge ${student.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ textTransform: 'uppercase' }}>
              {student.status}
            </span>
          </div>
        </div>

        {/* 9 Personal & Official Profile Details */}
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Personal Details (Communication & Certification)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>1. Full Name</span>
              <strong style={{ display: 'block', fontSize: '15px', marginTop: '2px', color: 'var(--text-primary)' }}>{student.name}</strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>2. Date of Birth</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: student.date_of_birth ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not Provided'}
              </strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>3. Gender</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', textTransform: 'capitalize', color: student.gender ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {student.gender || 'Not Provided'}
              </strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>4. Class Roll No.</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: student.class_roll_no ? '#173f73' : 'var(--text-muted)' }}>
                {student.class_roll_no || 'Not Set'}
              </strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>5. Phone No.</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: student.phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {student.phone || 'Not Provided'}
              </strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>6. Enrolled Email</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', wordBreak: 'break-all' }}>{student.email}</strong>
              <small style={{ color: '#0d9488', fontSize: '11px' }}>Auto-fetched from account</small>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>7. Father's Name</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: student.father_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {student.father_name || 'Not Provided'}
              </strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>8. Mother's Name</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: student.mother_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {student.mother_name || 'Not Provided'}
              </strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>9. Permanent / Mailing Address</span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: student.address ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {student.address || 'Not Provided'}
              </p>
            </div>
          </div>

          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '20px 0 12px' }}>
            Academic Cohort & Enrollment Identifiers
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Student ID</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px', color: '#173f73' }}>{student.student_id_number || student.student_id}</strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Programme</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{student.programme}</strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Department</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{student.department}</strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Batch / Session</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{student.batch}</strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{student.academic_session}</small>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Current Semester</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>Semester {student.current_semester}</strong>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Admission Date</span>
              <strong style={{ display: 'block', fontSize: '14px', marginTop: '2px' }}>{student.admission_date}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Highlights Bar */}
      <section className="student-metrics-row">
        <article
          className="student-metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateTo('attendance')}
          title="View Attendance Breakdown"
        >
          <div className="metric-header">
            <small>ENROLLED COURSES</small>
            <BookOpen size={18} className="metric-icon blue" />
          </div>
          <strong>{metrics.enrolled_courses_count}</strong>
          <span className="metric-sub">Active semester curricula</span>
        </article>

        <article
          className="student-metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateTo('attendance')}
          title="View Attendance Breakdown"
        >
          <div className="metric-header">
            <small>COURSE COMPLETION</small>
            <TrendingUp size={18} className="metric-icon green" />
          </div>
          <strong>{metrics.overall_progress_percentage}%</strong>
          <span className="metric-sub">
            {metrics.completed_lessons_count} of {metrics.total_lessons_count} lessons done
          </span>
        </article>

        <article
          className="student-metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateTo('attendance')}
          title="View Attendance Breakdown"
        >
          <div className="metric-header">
            <small>ATTENDANCE RATE</small>
            <UserCheck size={18} className="metric-icon purple" />
          </div>
          <strong>{metrics.attendance_percentage}%</strong>
          <span className="metric-sub">Above 75% required quota</span>
        </article>

        <article
          className="student-metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateTo('attendance')}
          title="View Attendance Breakdown"
        >
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

      {/* Modal: Fill / Edit Student Profile Details */}
      {isProfileModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '680px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Official Student Profile Details</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Provide accurate details for institutional communication, grade sheets, and certification.
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsProfileModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {profileError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                <CheckCircle size={16} />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              {/* Official Academic Assignment (Managed by Admin/HoD - Read Only for Student) */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Institutional Academic Enrollment
                  </span>
                  <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Managed by Admin / HoD
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Department: </span>
                    <strong style={{ color: '#0f172a' }}>{data.student.department || 'Not Assigned'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Programme: </span>
                    <strong style={{ color: '#0f172a' }}>{data.student.programme || 'Not Assigned'}</strong>
                  </div>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  * To correct or change your assigned Degree Programme or Department, please contact your College Administrator or Head of Department (HoD).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* 1. Name */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    1. Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    placeholder="Enter full legal name"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* 6. Enrolled Email (Auto-fetched, read-only) */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    6. Enrolled Email <small style={{ color: '#0d9488', fontWeight: 500 }}>(Auto-fetched from account)</small>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={data.student.email}
                    disabled
                    readOnly
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }}
                  />
                </div>

                {/* 2. Date of Birth */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    2. Date of Birth
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={profileDob}
                    onChange={(e) => setProfileDob(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* 3. Gender */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    3. Gender
                  </label>
                  <select
                    className="form-control"
                    value={profileGender}
                    onChange={(e) => setProfileGender(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* 4. Class Roll No */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    4. Class Roll No.
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileRollNo}
                    onChange={(e) => setProfileRollNo(e.target.value)}
                    placeholder="e.g. CS-2026-042"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* 5. Phone No */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    5. Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* 7. Father Name */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    7. Father's Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileFatherName}
                    onChange={(e) => setProfileFatherName(e.target.value)}
                    placeholder="Enter father's full name"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* 8. Mother Name */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    8. Mother's Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileMotherName}
                    onChange={(e) => setProfileMotherName(e.target.value)}
                    placeholder="Enter mother's full name"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* 9. Address */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    9. Permanent / Communication Address
                  </label>
                  <textarea
                    rows={3}
                    className="form-control"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder="Enter house/street, city, state, postal code"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsProfileModalOpen(false)}
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingProfile}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSavingProfile ? <RefreshCw size={14} className="spinning" /> : <CheckCircle size={14} />}
                  {isSavingProfile ? 'Saving Details...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function in_array_status(status?: string): boolean {
  return status === 'evaluated' || status === 'submitted';
}
