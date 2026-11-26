import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { apiDownload, apiRequest } from '../api/client';
import { StudentAnalytics, CourseAnalytics, AdminAnalytics } from '../types/analytics';
import { Course } from '../types/course';
import { User as AuthUser } from '../types/auth';

interface AnalyticsViewProps {
  currentUser: AuthUser | null;
  courses?: Course[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ currentUser, courses: initialCourses }) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [activeTab, setActiveTab] = useState<'student' | 'course' | 'institutional'>('student');

  // Student Analytics
  const [studentData, setStudentData] = useState<StudentAnalytics | null>(null);
  const [loadingStudent, setLoadingStudent] = useState<boolean>(false);

  // Course Analytics
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseData, setCourseData] = useState<CourseAnalytics | null>(null);
  const [loadingCourse, setLoadingCourse] = useState<boolean>(false);

  // Admin Analytics
  const [adminData, setAdminData] = useState<AdminAnalytics | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const isStaff = currentUser?.roles?.some(r =>
    ['teacher', 'dept_admin', 'college_admin', 'super_admin'].includes(r.name)
  );

  const isAdmin = currentUser?.roles?.some(r =>
    ['dept_admin', 'college_admin', 'super_admin'].includes(r.name)
  );

  useEffect(() => {
    if (!initialCourses || initialCourses.length === 0) {
      apiRequest<{ data: Course[] }>('/courses')
        .then(res => {
          setCourses(res.data);
          if (res.data.length > 0 && !selectedCourseId) {
            setSelectedCourseId(res.data[0].id);
          }
        })
        .catch(() => {});
    } else if (initialCourses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(initialCourses[0].id);
    }
  }, [initialCourses]);

  useEffect(() => {
    if (activeTab === 'student') {
      loadStudentAnalytics();
    } else if (activeTab === 'course' && selectedCourseId) {
      loadCourseAnalytics(selectedCourseId);
    } else if (activeTab === 'institutional' && isAdmin) {
      loadAdminAnalytics();
    }
  }, [activeTab, selectedCourseId]);

  const loadStudentAnalytics = async () => {
    setLoadingStudent(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: StudentAnalytics }>('/analytics/student');
      setStudentData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load student learning analytics.');
    } finally {
      setLoadingStudent(false);
    }
  };

  const loadCourseAnalytics = async (courseId: string) => {
    setLoadingCourse(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: CourseAnalytics }>(`/analytics/courses/${courseId}`);
      setCourseData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load course performance analytics.');
    } finally {
      setLoadingCourse(false);
    }
  };

  const loadAdminAnalytics = async () => {
    setLoadingAdmin(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: AdminAnalytics }>('/analytics/admin');
      setAdminData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load institutional analytics.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleExportCsv = (courseId: string) => {
    const filename = `Course_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`;
    apiDownload(`/analytics/export/csv?course_id=${courseId}`, filename)
      .catch(() => alert('Failed to download CSV export.'));
  };

  return (
    <div className="analytics-workspace">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Milestone 11 &bull; Institutional Intelligence</span>
          <h1 className="section-title">Analytics &amp; Academic Reporting</h1>
          <p className="section-subtitle">
            Comprehensive learning velocity metrics, 75% attendance quota audit tracking, grade distribution curves, and CSV report exports.
          </p>
        </div>
        <div className="header-actions">
          {activeTab === 'course' && selectedCourseId && isStaff && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => handleExportCsv(selectedCourseId)}
              >
                <FileSpreadsheet size={16} />
                <span>Export CSV Report</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                <span>Print Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
          onClick={() => setActiveTab('student')}
        >
          <GraduationCap size={18} />
          <span>My Learning Analytics</span>
        </button>

        {isStaff && (
          <button
            className={`tab-btn ${activeTab === 'course' ? 'active' : ''}`}
            onClick={() => setActiveTab('course')}
          >
            <BarChart3 size={18} />
            <span>Course &amp; Class Performance</span>
          </button>
        )}

        {isAdmin && (
          <button
            className={`tab-btn ${activeTab === 'institutional' ? 'active' : ''}`}
            onClick={() => setActiveTab('institutional')}
          >
            <TrendingUp size={18} />
            <span>Institutional &amp; Department Overview</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: STUDENT ANALYTICS */}
      {activeTab === 'student' && (
        <div className="student-analytics-view">
          {loadingStudent ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Analyzing learning progress, examination metrics, and attendance safety margins...</p>
            </div>
          ) : studentData ? (
            <>
              {/* Metric Highlights */}
              <div className="metrics-grid">
                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <BookOpen size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Enrolled Courses</span>
                    <strong className="metric-val">{studentData.summary.enrolled_courses_count}</strong>
                    <small className="text-muted">Active curriculum</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Syllabus Completion</span>
                    <strong className="metric-val">{studentData.summary.overall_progress_percentage}%</strong>
                    <small className="text-muted">Lessons completed</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div
                    className="metric-icon-wrap"
                    style={{
                      background: studentData.summary.has_attendance_shortage ? '#fef2f2' : '#f0fdf4',
                      color: studentData.summary.has_attendance_shortage ? '#dc2626' : '#16a34a',
                    }}
                  >
                    <Calendar size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Overall Attendance</span>
                    <strong className="metric-val">{studentData.summary.overall_attendance_percentage}%</strong>
                    <small style={{ color: studentData.summary.has_attendance_shortage ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {studentData.summary.has_attendance_shortage ? '⚠️ Below 75% Quota' : '✓ Good Standing (≥75%)'}
                    </small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <Award size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Verified Certificates</span>
                    <strong className="metric-val">{studentData.summary.certificates_earned_count}</strong>
                    <small className="text-muted">Conferred awards</small>
                  </div>
                </div>
              </div>

              {/* Course-by-Course Learning Progress */}
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Course Performance &amp; Quota Compliance</h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Syllabus Progress</th>
                        <th>Attendance Rate</th>
                        <th>Exam Score Avg</th>
                        <th>Assignment Avg</th>
                        <th>Certification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData.courses.map(course => (
                        <tr key={course.course_id}>
                          <td>
                            <strong>{course.course_code}</strong>: {course.course_title}
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{course.department}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress-bar-sm" style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${course.progress_percentage}%`, height: '100%', background: '#3b82f6' }} />
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{course.progress_percentage}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${course.has_attendance_shortage ? 'badge-danger' : 'badge-success'}`}>
                              {course.attendance_percentage}%
                              {course.has_attendance_shortage ? ' (Shortage)' : ''}
                            </span>
                          </td>
                          <td>
                            {course.exam_average !== null ? (
                              <strong style={{ color: course.exam_average >= 75 ? '#16a34a' : '#0f172a' }}>
                                {course.exam_average}%
                              </strong>
                            ) : (
                              <span className="text-muted">&mdash;</span>
                            )}
                          </td>
                          <td>
                            {course.assignment_average !== null ? (
                              <span>{course.assignment_average}%</span>
                            ) : (
                              <span className="text-muted">&mdash;</span>
                            )}
                          </td>
                          <td>
                            {course.has_certificate ? (
                              <span className="badge badge-success">
                                <Award size={12} style={{ marginRight: 4 }} /> Conferred
                              </span>
                            ) : (
                              <span className="badge badge-role">In Progress</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Exam Evaluation Trajectory */}
              {studentData.recent_exam_scores.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Recent Examination Evaluations</h3>
                  <div className="exam-scores-grid">
                    {studentData.recent_exam_scores.map((exam, i) => (
                      <div key={i} className="card exam-score-tile">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span className="badge badge-role">{exam.course_code}</span>
                          <span className={`badge ${exam.is_passed ? 'badge-success' : 'badge-danger'}`}>
                            {exam.is_passed ? 'PASSED' : 'NEEDS RETAKE'}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>{exam.exam_title}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto' }}>
                          <span className="score-big">{exam.percentage}%</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{exam.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: COURSE & CLASS PERFORMANCE (TEACHER / ADMIN) */}
      {activeTab === 'course' && isStaff && (
        <div className="course-analytics-view">
          {/* Course Selector Filter */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="course-select-analytics" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Select Course for Performance Audit:
              </label>
              <select
                id="course-select-analytics"
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="form-control"
                style={{ fontSize: '1rem', padding: '0.75rem' }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} &mdash; {c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingCourse ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Computing course completion distributions and attendance aggregates...</p>
            </div>
          ) : courseData ? (
            <>
              {/* Course Topline Metrics */}
              <div className="metrics-grid">
                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Users size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Enrolled Students</span>
                    <strong className="metric-val">{courseData.metrics.total_enrolled}</strong>
                    <small className="text-muted">Active learners</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <Calendar size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Class Attendance Avg</span>
                    <strong className="metric-val">{courseData.metrics.average_attendance}%</strong>
                    <small className="text-muted">Across all completed sessions</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Syllabus Completion</span>
                    <strong className="metric-val">{courseData.metrics.average_progress}%</strong>
                    <small className="text-muted">Average student progress</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div
                    className="metric-icon-wrap"
                    style={{
                      background: courseData.metrics.at_risk_count > 0 ? '#fef2f2' : '#f0fdf4',
                      color: courseData.metrics.at_risk_count > 0 ? '#dc2626' : '#16a34a',
                    }}
                  >
                    <AlertTriangle size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">At-Risk Students</span>
                    <strong className="metric-val">{courseData.metrics.at_risk_count}</strong>
                    <small style={{ color: courseData.metrics.at_risk_count > 0 ? '#dc2626' : '#16a34a' }}>
                      {courseData.metrics.at_risk_count > 0 ? 'Requires intervention' : 'Zero shortage'}
                    </small>
                  </div>
                </div>
              </div>

              {/* Grade Distribution & Early Warning Rows */}
              <div className="analytics-two-col" style={{ marginTop: '1.5rem' }}>
                {/* Grade Distribution Histogram */}
                <div className="card">
                  <h3>Exam Grade Distribution</h3>
                  <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 16 }}>
                    Student count per academic grade bucket across course examinations.
                  </p>

                  <div className="histogram-container">
                    {Object.entries(courseData.grade_distribution).map(([grade, count]) => {
                      const maxCount = Math.max(1, ...Object.values(courseData.grade_distribution));
                      const pct = Math.round((count / maxCount) * 100);

                      return (
                        <div key={grade} className="histogram-row">
                          <span className="histogram-label">{grade}</span>
                          <div className="histogram-bar-wrap">
                            <div className="histogram-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="histogram-count"><strong>{count}</strong> students</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* At-Risk Warning Box */}
                <div className="card">
                  <h3>Early Warning &amp; At-Risk Alerts</h3>
                  <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 16 }}>
                    Learners falling behind the 75% statutory attendance quota or failing examinations.
                  </p>

                  {courseData.at_risk_students.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <CheckCircle size={36} color="#16a34a" />
                      <h4>All Students in Good Standing</h4>
                      <p>No learners currently have attendance shortages or failing marks.</p>
                    </div>
                  ) : (
                    <div className="at-risk-list">
                      {courseData.at_risk_students.map(s => (
                        <div key={s.student_id} className="at-risk-item">
                          <div>
                            <strong>{s.student_name}</strong>
                            <small className="text-muted" style={{ display: 'block' }}>{s.student_email}</small>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="badge badge-danger">{s.reason}</span>
                            <small className="text-muted" style={{ display: 'block', marginTop: 2 }}>
                              Attendance: {s.attendance_percentage}%
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Course Roster Performance Table */}
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header-row">
                  <h3>Class Enrolment Roster Performance</h3>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleExportCsv(selectedCourseId)}
                  >
                    <Download size={14} />
                    <span>Download CSV</span>
                  </button>
                </div>

                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Syllabus Progress</th>
                        <th>Attendance Rate</th>
                        <th>Best Exam Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseData.roster.map(st => (
                        <tr key={st.student_id}>
                          <td><strong>{st.name}</strong></td>
                          <td className="text-muted">{st.email}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="progress-bar-sm" style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${st.progress_percentage}%`, height: '100%', background: '#3b82f6' }} />
                              </div>
                              <span style={{ fontSize: '0.85rem' }}>{st.progress_percentage}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${st.attendance_percentage < 75 ? 'badge-danger' : 'badge-success'}`}>
                              {st.attendance_percentage}%
                            </span>
                          </td>
                          <td>
                            {st.exam_score !== null ? (
                              <strong>{st.exam_score}%</strong>
                            ) : (
                              <span className="text-muted">&mdash;</span>
                            )}
                          </td>
                          <td>
                            {st.attendance_percentage < 75 ? (
                              <span className="badge badge-danger">At Risk</span>
                            ) : (
                              <span className="badge badge-success">Good Standing</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 3: INSTITUTIONAL & DEPARTMENT OVERVIEW (ADMIN) */}
      {activeTab === 'institutional' && isAdmin && (
        <div className="institutional-analytics-view">
          {loadingAdmin ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Aggregating college-wide department statistics and university retention rates...</p>
            </div>
          ) : adminData ? (
            <>
              {/* College Overview Grid */}
              <div className="metrics-grid">
                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <Users size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Total Active Students</span>
                    <strong className="metric-val">{adminData.overview.total_students}</strong>
                    <small className="text-muted">Enrolled learners</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <BookOpen size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Published Courses</span>
                    <strong className="metric-val">{adminData.overview.total_courses}</strong>
                    <small className="text-muted">{adminData.overview.total_departments} Departments</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <Calendar size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">College Attendance Avg</span>
                    <strong className="metric-val">{adminData.overview.college_attendance_rate}%</strong>
                    <small className="text-muted">Statutory quota standard</small>
                  </div>
                </div>

                <div className="card metric-card">
                  <div className="metric-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <Award size={24} />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Exam Pass Rate</span>
                    <strong className="metric-val">{adminData.overview.college_exam_pass_rate}%</strong>
                    <small className="text-muted">{adminData.overview.total_certificates_issued} Degrees Conferred</small>
                  </div>
                </div>
              </div>

              {/* Department Breakdown Table */}
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3>Academic Department Intelligence</h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Department Code</th>
                        <th>Department Name</th>
                        <th>Active Courses</th>
                        <th>Total Course Enrolments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminData.departments.map(d => (
                        <tr key={d.id}>
                          <td><strong>{d.code}</strong></td>
                          <td>{d.name}</td>
                          <td><span className="badge badge-role">{d.courses_count} courses</span></td>
                          <td><strong>{d.active_enrolments}</strong> enrolments</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
