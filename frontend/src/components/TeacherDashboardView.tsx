import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  GraduationCap,
  PlayCircle,
  PlusCircle,
  Radio,
  RefreshCw,
  Sparkles,
  Users,
  Video
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { TeacherDashboardData } from '../types/dashboard';
import type { User } from '../types/auth';
import { StudentProfileModal } from './StudentProfileModal';

interface TeacherDashboardViewProps {
  currentUser: User | null;
  onNavigateTo: (view: 'courses' | 'assignments' | 'exams' | 'attendance' | 'live_classroom' | 'ai_assistant') => void;
  onOpenCourse?: (courseId: string) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  currentUser,
  onNavigateTo,
  onOpenCourse,
}) => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [currentUser]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<TeacherDashboardData>('/dashboard/teacher');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load faculty dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw className="spin" size={32} />
        <p>Loading faculty instructional portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-banner">
        <AlertCircle size={20} />
        <span>{error || 'Unable to retrieve faculty dashboard data.'}</span>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const { teacher, metrics, teaching_courses, pending_evaluations, upcoming_live_sessions } = data;

  return (
    <div className="dashboard-content">
      {/* Teacher Profile Banner */}
      <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)', color: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faculty Portal</span>
              <span style={{ fontSize: '13px', opacity: 0.85 }}>{teacher.department}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              Welcome back, {teacher.name}
            </h2>
            <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '14px' }}>
              {teacher.designation} · {teacher.qualification} · ID: <strong>{teacher.employee_id}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigateTo('live_classroom')}>
              <Radio size={16} /> Live Classroom
            </button>
            <button className="btn btn-primary" onClick={() => onNavigateTo('assignments')}>
              <ClipboardList size={16} /> Evaluate Submissions
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Teaching Courses</span>
            <strong className="stat-value">{metrics.active_courses_count}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Enrolled Students</span>
            <strong className="stat-value">{metrics.total_students_count}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <ClipboardList size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending Grading</span>
            <strong className="stat-value" style={{ color: metrics.pending_evaluations_count > 0 ? '#ef4444' : 'inherit' }}>
              {metrics.pending_evaluations_count}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Radio size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Live Sessions</span>
            <strong className="stat-value">{metrics.upcoming_live_sessions_count}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg Attendance</span>
            <strong className="stat-value">{metrics.average_attendance_percentage}%</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Teaching Courses & Evaluation Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Teaching Courses */}
          <div className="panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Active Courses Instructed</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Assigned curricula for current academic semester</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('courses')}>
                View Catalog <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {teaching_courses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No active courses assigned.</p>
              ) : (
                teaching_courses.map((course) => (
                  <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '11px' }}>{course.code}</span>
                        <strong style={{ fontSize: '15px' }}>{course.title}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span>{course.credits} Credits</span>
                        <span>•</span>
                        <span>{course.enrolled_students_count} Students Enrolled</span>
                        <span>•</span>
                        <span>{course.lessons_count} Lessons</span>
                        <span>•</span>
                        <span>{course.assignments_count} Assignments</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {onOpenCourse && (
                        <button className="btn btn-secondary btn-sm" onClick={() => onOpenCourse(course.id)}>
                          <PlayCircle size={14} /> Curriculum
                        </button>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => onNavigateTo('attendance')}>
                        Attendance
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Submissions Queue */}
          <div className="panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Submissions Awaiting Grading</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Student coursework requiring faculty review</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('assignments')}>
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              {pending_evaluations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>All submissions evaluated!</p>
                  <small>No pending student coursework in your grading queue.</small>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pending_evaluations.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '11px' }}>{item.course_code}</span>
                          <strong>{item.assignment_title}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Submitted by{' '}
                          <strong
                            style={{ cursor: 'pointer', color: '#1d4ed8', textDecoration: 'underline' }}
                            onClick={() => {
                              setSelectedStudentId(item.student_id);
                              setIsStudentModalOpen(true);
                            }}
                            title="Click to view student profile"
                          >
                            {item.student_name}
                          </strong>{' '}
                          (
                          <code
                            style={{ cursor: 'pointer', background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '4px' }}
                            onClick={() => {
                              setSelectedStudentId(item.student_id);
                              setIsStudentModalOpen(true);
                            }}
                            title="Click to view student profile"
                          >
                            {item.student_id}
                          </code>
                          ) · Max: {item.max_score} pts
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => onNavigateTo('assignments')}>
                        Grade
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Classes & Quick Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Upcoming Live Sessions */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Upcoming Live Classes</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Scheduled lectures & discussions</p>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcoming_live_sessions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No live classes scheduled for today.</p>
              ) : (
                upcoming_live_sessions.map((session) => (
                  <div key={session.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px' }}>{session.provider.toUpperCase()}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session.duration_minutes} min</span>
                    </div>
                    <strong style={{ display: 'block', margin: '8px 0 4px', fontSize: '14px' }}>{session.title}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session.course_title}</span>
                    <div style={{ marginTop: '10px' }}>
                      <button className="btn btn-secondary btn-sm btn-block" onClick={() => onNavigateTo('live_classroom')}>
                        <Radio size={14} /> Open Classroom
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button className="btn btn-secondary btn-sm btn-block" onClick={() => onNavigateTo('live_classroom')}>
                <PlusCircle size={14} /> Schedule New Lecture
              </button>
            </div>
          </div>

          {/* Quick Faculty Actions */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Faculty Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('assignments')}>
                <ClipboardList size={16} color="#3b82f6" /> Create New Assignment
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('attendance')}>
                <CalendarCheck size={16} color="#10b981" /> Take Daily Attendance
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('exams')}>
                <GraduationCap size={16} color="#f59e0b" /> Manage Question Banks &amp; Exams
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('live_classroom')}>
                <Radio size={16} color="#ef4444" /> Launch Instant Video Lecture
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('ai_assistant')}>
                <Sparkles size={16} color="#eab308" /> AI Curriculum Assistant
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT PROFILE DOSSIER MODAL */}
      <StudentProfileModal
        userId={selectedStudentId}
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setSelectedStudentId(null);
        }}
      />
    </div>
  );
};
