import { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  LogIn,
  ShieldCheck,
  UserCheck,
  Users,
  Building2,
  CalendarCheck,
  FileQuestion
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
import { apiRequest } from './api/client';
import type { HealthStatus } from './types/auth';

function MainApp() {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'academic' | 'courses' | 'assignments' | 'exams' | 'attendance' | 'certificates'>('dashboard');
  const [learningCourseId, setLearningCourseId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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
  const canViewAcademic = hasPermission('academic.view') || isSuperAdmin;

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

        {canViewAcademic && (
          <>
            <div className="nav-label" style={{ marginTop: '16px' }}>ADMINISTRATION</div>
            <button
              className={`nav-item ${currentView === 'academic' ? 'active' : ''}`}
              onClick={() => setCurrentView('academic')}
            >
              <Building2 size={18} /> Academic Setup
            </button>
            <button className="nav-item" onClick={() => alert('User Directory scheduled for next sub-task')}>
              <Users size={18} /> User Directory
            </button>
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

        <button
          className={`nav-item ${currentView === 'certificates' && !learningCourseId ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('certificates');
            setLearningCourseId(null);
          }}
        >
          <Award size={18} /> Certificates
        </button>

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
          <div className="version-tag">Milestone 9 · Certificates &amp; Credentials</div>
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
                : 'Dashboard'}
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
            {currentView === 'dashboard' && (
              <>
                <StudentDashboardView
                  onOpenCourse={(cId) => setLearningCourseId(cId)}
                  onNavigateTo={(view) => {
                    setCurrentView(view);
                    setLearningCourseId(null);
                  }}
                  onOpenLogin={() => setIsLoginOpen(true)}
                />

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

        <p className="footnote">ONI Learning Management System · Epics 1 to 9 Operational (Certificates, Attendance, Exams, RBAC)</p>
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
