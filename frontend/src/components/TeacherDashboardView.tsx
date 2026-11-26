import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit2,
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

  // Edit Teacher Profile & Department State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [teacherName, setTeacherName] = useState('');
  const [teacherDeptId, setTeacherDeptId] = useState('');
  const [teacherDesignation, setTeacherDesignation] = useState('');
  const [teacherQualification, setTeacherQualification] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherSuccess, setTeacherSuccess] = useState<string | null>(null);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    apiRequest<{ departments: { id: string; name: string; code: string }[] }>('/academic/departments')
      .then((res) => setDepartments(res.departments || []))
      .catch(() => {});
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

  const openEditTeacherModal = () => {
    if (!data?.teacher) return;
    setTeacherName(data.teacher.name || '');
    const matchedDept = departments.find((d) => d.name === data.teacher.department || (data.teacher as any).department_id === d.id);
    setTeacherDeptId(matchedDept?.id || (data.teacher as any).department_id || '');
    setTeacherDesignation(data.teacher.designation || 'Faculty Member');
    setTeacherQualification(data.teacher.qualification || '');
    setTeacherPhone('');
    setTeacherError(null);
    setTeacherSuccess(null);
    setIsEditProfileOpen(true);
  };

  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTeacher(true);
    setTeacherError(null);
    try {
      await apiRequest('/teacher/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: teacherName,
          department_id: teacherDeptId,
          designation: teacherDesignation || null,
          qualification: teacherQualification || null,
          phone: teacherPhone || null,
        }),
      });
      setTeacherSuccess('Department and profile updated! Teaching courses and curriculum automatically synchronized.');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        loadDashboard();
      }, 1000);
    } catch (err: any) {
      setTeacherError(err.message || 'Failed to update faculty profile');
    } finally {
      setSavingTeacher(false);
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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={openEditTeacherModal} style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
              <Edit2 size={15} /> Edit Department &amp; Profile
            </button>
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

      {/* EDIT TEACHER PROFILE & DEPARTMENT MODAL */}
      {isEditProfileOpen && (
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
            if (e.target === e.currentTarget) setIsEditProfileOpen(false);
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Faculty Profile &amp; Department Assignment</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Update your assigned academic department, designation, or identity details.
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsEditProfileOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {teacherError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                <AlertCircle size={16} />
                <span>{teacherError}</span>
              </div>
            )}

            {teacherSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                <CheckCircle2 size={16} />
                <span>{teacherSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveTeacherProfile}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Assigned Academic Department <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={teacherDeptId}
                  onChange={(e) => setTeacherDeptId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                >
                  <option value="">Select Academic Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
                <small style={{ color: '#0d9488', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  ✨ Switching department automatically synchronizes teaching permissions and gives you access to all courses in the new department.
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Full Legal Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Academic Designation
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={teacherDesignation}
                    onChange={(e) => setTeacherDesignation(e.target.value)}
                    placeholder="e.g. Professor / Associate Professor"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Highest Qualification
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={teacherQualification}
                    onChange={(e) => setTeacherQualification(e.target.value)}
                    placeholder="e.g. Ph.D. in Computer Science"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={savingTeacher}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingTeacher}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingTeacher ? <RefreshCw size={14} className="spinning" /> : <CheckCircle2 size={14} />}
                  {savingTeacher ? 'Saving Changes...' : 'Save & Synchronize Courses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
