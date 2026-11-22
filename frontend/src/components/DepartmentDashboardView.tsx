import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle,
  GraduationCap,
  Layers,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { DepartmentDashboardData } from '../types/dashboard';
import type { User } from '../types/auth';

interface DepartmentDashboardViewProps {
  currentUser: User | null;
  onNavigateTo: (view: 'academic' | 'courses' | 'users' | 'analytics' | 'attendance') => void;
}

export const DepartmentDashboardView: React.FC<DepartmentDashboardViewProps> = ({
  currentUser,
  onNavigateTo,
}) => {
  const [data, setData] = useState<DepartmentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartmentData();
  }, [currentUser]);

  const loadDepartmentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<DepartmentDashboardData>('/dashboard/department');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load department dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw className="spin" size={32} />
        <p>Loading department academic metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-banner">
        <AlertCircle size={20} />
        <span>{error || 'Unable to retrieve department dashboard data.'}</span>
        <button className="btn btn-secondary btn-sm" onClick={loadDepartmentData}>
          Retry
        </button>
      </div>
    );
  }

  const { department, metrics, programmes, faculty_workloads, courses } = data;

  return (
    <div className="dashboard-content">
      {/* Department Hero Banner */}
      <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #1e293b 100%)', color: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#14b8a6', color: '#fff', fontSize: '11px', textTransform: 'uppercase' }}>HOD &amp; Academic Admin</span>
              <span style={{ fontSize: '13px', opacity: 0.85 }}>Code: <strong>{department.code}</strong></span>
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              {department.name}
            </h2>
            <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '14px' }}>
              Head of Department: <strong>{department.hod_name}</strong> · {department.description || 'Departmental operations and curriculum management.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigateTo('academic')}>
              <Building2 size={16} /> Academic Setup
            </button>
            <button className="btn btn-primary" onClick={() => onNavigateTo('analytics')}>
              <TrendingUp size={16} /> Dept Reports
            </button>
          </div>
        </div>
      </div>

      {/* Department Metrics Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Programmes</span>
            <strong className="stat-value">{metrics.programmes_count}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Faculty Strength</span>
            <strong className="stat-value">{metrics.faculty_count}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Enrolled Students</span>
            <strong className="stat-value">{metrics.enrolled_students_count}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Courses Offered</span>
            <strong className="stat-value">{metrics.courses_offered_count}</strong>
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

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <GraduationCap size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Exam Pass Rate</span>
            <strong className="stat-value">{metrics.average_pass_rate_percentage}%</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Left Column: Faculty Workloads & Courses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Faculty Workload Distribution */}
          <div className="panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Faculty Teaching Workload</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Department professors, lecturers &amp; instructors</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('users')}>
                Faculty Directory <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ marginTop: '16px', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Faculty Member</th>
                    <th style={{ padding: '8px 12px' }}>Designation</th>
                    <th style={{ padding: '8px 12px' }}>Assigned Courses</th>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty_workloads.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No faculty records found.
                      </td>
                    </tr>
                  ) : (
                    faculty_workloads.map((fac) => (
                      <tr key={fac.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong>{fac.name}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fac.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                          {fac.designation || 'Faculty Instructor'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px' }}>
                            {fac.courses_count} Active Courses
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('courses')}>
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Course Offerings */}
          <div className="panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Department Course Offerings</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Curriculum catalog and enrollment counts</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('courses')}>
                All Courses <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {courses.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge" style={{ background: '#0f766e', color: '#fff', fontSize: '11px' }}>{c.code}</span>
                      <strong>{c.title}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Semester {c.semester_number} · {c.credits} Credits · {c.enrolled_count} Students Enrolled
                    </div>
                  </div>
                  <span className={`badge ${c.status === 'published' ? 'badge-success' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Academic Programmes & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Degree Programmes */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Academic Programmes</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Degrees conferred by department</p>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {programmes.map((prog) => (
                <div key={prog.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge" style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: '11px' }}>{prog.degree}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prog.duration_years} Years</span>
                  </div>
                  <strong style={{ display: 'block', margin: '6px 0 2px', fontSize: '14px' }}>{prog.name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prog.batches_count} Active Student Batches</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Quick Tools */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Department Operations</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('academic')}>
                <Building2 size={16} color="#0f766e" /> Configure Department Semesters
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('courses')}>
                <BookOpen size={16} color="#3b82f6" /> Add Course / Edit Curriculum
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('users')}>
                <Users size={16} color="#10b981" /> Department Faculty Directory
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('analytics')}>
                <TrendingUp size={16} color="#f59e0b" /> Academic Performance &amp; Pass Rates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
