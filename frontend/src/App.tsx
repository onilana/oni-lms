import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  LogIn,
  Radio,
  ShieldCheck,
  UserCheck,
  Users,
  Building2,
  CalendarCheck,
  FileQuestion,
  Sparkles,
  Globe,
  HardDrive,
  ShieldAlert
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginModal } from './components/LoginModal';
import { AcademicView } from './components/AcademicView';
import { CoursesView } from './components/CoursesView';
import { LessonPlayerView } from './components/LessonPlayerView';
import { AssignmentsView } from './components/AssignmentsView';
import { ExamsView } from './components/ExamsView';
import { StudentDashboardView } from './components/StudentDashboardView';
import { AttendanceView } from './components/AttendanceView';
import { CertificatesView } from './components/CertificatesView';
import { LiveClassroomView } from './components/LiveClassroomView';
import { AnalyticsView } from './components/AnalyticsView';
import { AIAssistantView } from './components/AIAssistantView';
import { WordPressIntegrationView } from './components/WordPressIntegrationView';
import { UserDirectoryView } from './components/UserDirectoryView';
import { AuditLogsView } from './components/AuditLogsView';
import { BackupManagementView } from './components/BackupManagementView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { DepartmentDashboardView } from './components/DepartmentDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { apiRequest } from './api/client';
import type { HealthStatus } from './types/auth';

function MainApp() {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'academic' | 'courses' | 'assignments' | 'exams' | 'attendance' | 'certificates' | 'live_classroom' | 'analytics' | 'ai_assistant' | 'wordpress' | 'users' | 'audit_logs' | 'backups'>('dashboard');
  const [dashboardRoleMode, setDashboardRoleMode] = useState<'student' | 'teacher' | 'department' | 'admin'>('student');
  const [learningCourseId, setLearningCourseId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userDirectorySection, setUserDirectorySection] = useState<'admins' | 'teachers' | 'students' | 'all'>('admins');

  useEffect(() => {
    if (user) {
      if (user.roles.some((r) => r.name === 'super_admin' || r.name === 'college_admin')) {
        setDashboardRoleMode('admin');
      } else if (user.roles.some((r) => r.name === 'hod' || r.name === 'dept_admin')) {
        setDashboardRoleMode('department');
      } else if (user.roles.some((r) => r.name === 'teacher')) {
        setDashboardRoleMode('teacher');
      } else {
        setDashboardRoleMode('student');
      }
    } else {
      setDashboardRoleMode('student');
    }
  }, [user]);

  useEffect(() => {
    apiRequest<HealthStatus>('/health')
      .then(setHealth)
      .catch((err: Error) => setHealthError(err.message));
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const isSuperAdmin = hasRole('super_admin');
  const isTeacher = hasRole('teacher');
  const isAdmin = hasRole(['super_admin', 'college_admin', 'dept_admin', 'hod']);
  const isStudent = hasRole('student') && !isAdmin && !isTeacher;

  // Active portal modes
  const isTeacherPortal = dashboardRoleMode === 'teacher' || (isTeacher && !isAdmin);
  const isStudentPortal = dashboardRoleMode === 'student' || isStudent;
  const isDeptAdminPortal = dashboardRoleMode === 'department';
  const isInstitutionalAdminPortal = dashboardRoleMode === 'admin';

  // Administration items visibility (Database & Backups strictly restricted to Super Admin, removed from Department/HOD, Teacher, and Student)
  const canViewAdminSection = !isTeacherPortal && !isStudentPortal && isAdmin;
  const canViewUserDirectory = canViewAdminSection;
  const canViewAuditLogs = canViewAdminSection && (isSuperAdmin || hasRole('college_admin'));
  const canViewBackups = canViewAdminSection && isSuperAdmin && !isDeptAdminPortal;

  // Certificate: Available to Students (view/claim) and Admins (issue/verify), but explicitly removed from Teacher dashboard
  const canViewCertificates = !isTeacherPortal;

  // WordPress ('oni_lana'): Restricted exclusively to Super Admin
  const canViewWordPress = isSuperAdmin && !isTeacherPortal && !isStudentPortal;

  useEffect(() => {
    if (isTeacherPortal && ['academic', 'users', 'audit_logs', 'backups', 'certificates', 'wordpress'].includes(currentView)) {
      setCurrentView('dashboard');
    } else if (isStudentPortal && ['academic', 'users', 'audit_logs', 'backups', 'wordpress'].includes(currentView)) {
      setCurrentView('dashboard');
    } else if (isDeptAdminPortal && ['backups', 'wordpress'].includes(currentView)) {
      setCurrentView('dashboard');
    } else if (!isSuperAdmin && currentView === 'wordpress') {
      setCurrentView('dashboard');
    }
  }, [dashboardRoleMode, currentView, isTeacherPortal, isStudentPortal, isDeptAdminPortal, isSuperAdmin]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">O</span>
          <div>
            <strong>ONI LMS</strong>
            <small>College Learning Portal</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <button
          className={`nav-item ${currentView === 'dashboard' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('dashboard');
            setLearningCourseId(null);
          }}
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <button
          className={`nav-item ${currentView === 'courses' || learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('courses');
            setLearningCourseId(null);
          }}
        >
          <BookOpen size={18} /> Courses
        </button>
        <button
          className={`nav-item ${currentView === 'assignments' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('assignments');
            setLearningCourseId(null);
          }}
        >
          <ClipboardList size={18} /> Assignments
        </button>
        <button
          className={`nav-item ${currentView === 'exams' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('exams');
            setLearningCourseId(null);
          }}
        >
          <FileQuestion size={18} /> Examinations
        </button>

        {canViewAdminSection && (
          <>
            <div className="nav-label" style={{ marginTop: '16px' }}>ADMINISTRATION</div>
            <button
              className={`nav-item ${currentView === 'academic' ? 'active' : ''}`}
              onClick={() => setCurrentView('academic')}
            >
              <Building2 size={18} /> Academic Setup
            </button>
            {canViewUserDirectory && (
              <button
                className={`nav-item ${currentView === 'users' && !learningCourseId ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('users');
                  setLearningCourseId(null);
                }}
              >
                <Users size={18} /> User Directory
              </button>
            )}
            {canViewAuditLogs && (
              <button
                className={`nav-item ${currentView === 'audit_logs' && !learningCourseId ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('audit_logs');
                  setLearningCourseId(null);
                }}
              >
                <ShieldAlert size={18} color="#ef4444" /> Security Audit Logs
              </button>
            )}
            {canViewBackups && (
              <button
                className={`nav-item ${currentView === 'backups' && !learningCourseId ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('backups');
                  setLearningCourseId(null);
                }}
              >
                <HardDrive size={18} color="#10b981" /> Database &amp; Backups
              </button>
            )}
          </>
        )}

        <button
          className={`nav-item ${currentView === 'attendance' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('attendance');
            setLearningCourseId(null);
          }}
        >
          <CalendarCheck size={18} /> Attendance
        </button>

        {canViewCertificates && (
          <button
            className={`nav-item ${currentView === 'certificates' && !learningCourseId ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('certificates');
              setLearningCourseId(null);
            }}
          >
            <Award size={18} /> Certificates
          </button>
        )}

        <button
          className={`nav-item ${currentView === 'live_classroom' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('live_classroom');
            setLearningCourseId(null);
          }}
        >
          <Radio size={18} /> Live Classroom
        </button>

        <button
          className={`nav-item ${currentView === 'analytics' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('analytics');
            setLearningCourseId(null);
          }}
        >
          <BarChart3 size={18} /> Analytics &amp; Reports
        </button>

        <button
          className={`nav-item ${currentView === 'ai_assistant' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('ai_assistant');
            setLearningCourseId(null);
          }}
        >
          <Sparkles size={18} color="#eab308" /> AI Study Assistant
        </button>

        {canViewWordPress && (
          <button
            className={`nav-item ${currentView === 'wordpress' && !learningCourseId ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('wordpress');
              setLearningCourseId(null);
            }}
          >
            <Globe size={18} color="#38bdf8" /> WordPress (`oni_lana`)
          </button>
        )}

        <div className="sidebar-footer">
          {user ? (
            <div className="user-sidebar-card">
              <div className="user-sidebar-info">
                <strong>{user.name}</strong>
                <span>{user.roles[0]?.label ?? 'Member'}</span>
              </div>
              <button className="btn-icon" onClick={logout} title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-block" onClick={() => setIsLoginOpen(true)}>
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
          )}
          <div className="version-tag">Blueprint v1.0 · Complete Architecture</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">COLLEGE LEARNING PLATFORM</span>
            <h1>
              {currentView === 'academic'
                ? 'Academic Management'
                : currentView === 'courses'
                ? 'Courses & Curricula'
                : currentView === 'assignments'
                ? 'Assignments & Coursework'
                : currentView === 'exams'
                ? 'Examinations & Assessments'
                : currentView === 'attendance'
                ? 'Attendance & Session Logs'
                : currentView === 'certificates'
                ? 'Certificates & Degree Verification'
                : currentView === 'live_classroom'
                ? 'Communication & Live Classroom'
                : currentView === 'analytics'
                ? 'Analytics & Academic Reporting'
                : currentView === 'ai_assistant'
                ? 'AI Learning Assistant (RAG)'
                : currentView === 'wordpress'
                ? 'WordPress Integration (oni_lana)'
                : currentView === 'users'
                ? 'Institutional User Directory'
                : currentView === 'audit_logs'
                ? 'Security & Institutional Audit Trail'
                : currentView === 'backups'
                ? 'Database Backup & Disaster Recovery'
                : dashboardRoleMode === 'admin'
                ? 'College Administration Console'
                : dashboardRoleMode === 'department'
                ? 'Department & HOD Academic Portal'
                : dashboardRoleMode === 'teacher'
                ? 'Faculty Instructional Dashboard'
                : 'Student Learning Dashboard'}
            </h1>
          </div>
          <div className="topbar-actions">
            {user ? (
              <div className="user-pill">
                <span className="avatar">{getInitials(user.name)}</span>
                <div className="user-pill-text">
                  <strong>{user.name}</strong>
                  <span className="badge badge-role">{user.roles[0]?.label ?? 'User'}</span>
                </div>
                <button className="btn-icon-subtle" onClick={logout} title="Sign out">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => setIsLoginOpen(true)}>
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {learningCourseId ? (
          <LessonPlayerView
            courseId={learningCourseId}
            onBack={() => setLearningCourseId(null)}
          />
        ) : (
          <>
            {currentView === 'academic' && <AcademicView />}
            {currentView === 'users' && <UserDirectoryView initialSection={userDirectorySection} />}
            {currentView === 'audit_logs' && <AuditLogsView currentUser={user} />}
            {currentView === 'backups' && <BackupManagementView currentUser={user} />}
            {currentView === 'courses' && (
              <CoursesView
                onOpenLogin={() => setIsLoginOpen(true)}
                onOpenLearning={(cId) => setLearningCourseId(cId)}
              />
            )}
            {currentView === 'assignments' && <AssignmentsView />}
            {currentView === 'exams' && <ExamsView />}
            {currentView === 'attendance' && <AttendanceView />}
            {currentView === 'certificates' && <CertificatesView currentUser={user} />}
            {currentView === 'live_classroom' && <LiveClassroomView currentUser={user} />}
            {currentView === 'analytics' && <AnalyticsView currentUser={user} />}
            {currentView === 'ai_assistant' && <AIAssistantView currentUser={user} />}
            {currentView === 'wordpress' && (
              isSuperAdmin ? (
                <WordPressIntegrationView currentUser={user} />
              ) : (
                <div className="error-banner">
                  <ShieldAlert size={20} />
                  <span>Access restricted to Super Administrator.</span>
                </div>
              )
            )}
            {currentView === 'dashboard' && (
              <>
                {user && !isStudent && (
                  <div
                    className="dashboard-portal-switcher"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '20px',
                      background: 'var(--surface-subtle)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      PORTAL SWITCHER:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className={`btn btn-sm ${dashboardRoleMode === 'student' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDashboardRoleMode('student')}
                      >
                        <GraduationCap size={14} /> Student Portal
                      </button>
                      <button
                        className={`btn btn-sm ${dashboardRoleMode === 'teacher' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDashboardRoleMode('teacher')}
                      >
                        <BookOpen size={14} /> Faculty / Teacher
                      </button>
                      {(isSuperAdmin || hasRole(['college_admin', 'dept_admin', 'hod'])) && (
                        <button
                          className={`btn btn-sm ${dashboardRoleMode === 'department' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setDashboardRoleMode('department')}
                        >
                          <Building2 size={14} /> Department / HOD
                        </button>
                      )}
                      {(isSuperAdmin || hasRole('college_admin')) && (
                        <button
                          className={`btn btn-sm ${dashboardRoleMode === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setDashboardRoleMode('admin')}
                        >
                          <ShieldCheck size={14} /> Institutional Admin
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {dashboardRoleMode === 'admin' && (
                  <AdminDashboardView
                    currentUser={user}
                    onNavigateTo={(view, options) => {
                      if (options?.section) {
                        setUserDirectorySection(options.section);
                      }
                      setCurrentView(view);
                      setLearningCourseId(null);
                    }}
                  />
                )}

                {dashboardRoleMode === 'department' && (
                  <DepartmentDashboardView
                    currentUser={user}
                    onNavigateTo={(view, options) => {
                      if (options?.section) {
                        setUserDirectorySection(options.section);
                      }
                      setCurrentView(view);
                      setLearningCourseId(null);
                    }}
                  />
                )}

                {dashboardRoleMode === 'teacher' && (
                  <TeacherDashboardView
                    currentUser={user}
                    onNavigateTo={(view) => {
                      setCurrentView(view);
                      setLearningCourseId(null);
                    }}
                    onOpenCourse={(cId) => setLearningCourseId(cId)}
                  />
                )}

                {dashboardRoleMode === 'student' && (
                  <StudentDashboardView
                    onOpenCourse={(cId) => setLearningCourseId(cId)}
                    onNavigateTo={(view) => {
                      setCurrentView(view);
                      setLearningCourseId(null);
                    }}
                    onOpenLogin={() => setIsLoginOpen(true)}
                  />
                )}

                {/* System & Architecture Status Panel (Staff & Verification) */}
                <section className="panel" style={{ marginTop: '36px' }}>
                  <div className="panel-heading">
                    <div>
                      <h3>System & API Infrastructure</h3>
                      <p>Real-time health indicator for backend, database, and cache</p>
                    </div>
                    <span className={`status ${health?.success ? 'ok' : 'pending'}`}>
                      {health?.success ? 'Connected' : 'Checking'}
                    </span>
                  </div>

                  {healthError && (
                    <p className="error">
                      API connection unavailable: {healthError}. Verify local development services.
                    </p>
                  )}

                  <div className="health-grid">
                    {['application', 'database', 'redis'].map((name) => (
                      <div className="health-item" key={name}>
                        <span className={`dot ${health?.checks?.[name] === 'ok' ? 'green' : ''}`} />
                        <span>{name}</span>
                        <b>{health?.checks?.[name] ?? 'Pending'}</b>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
      </>
    )}

        <p className="footnote">ONI Learning Management System · College Technical Blueprint Architecture v1.0 Operational</p>
      </main>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
