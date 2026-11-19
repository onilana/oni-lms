import { useEffect, useState } from 'react';
import {
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
import { apiRequest } from './api/client';
import type { HealthStatus } from './types/auth';

function MainApp() {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'academic' | 'courses' | 'assignments' | 'exams'>('dashboard');
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

        {(isTeacher || isSuperAdmin) && (
          <button className="nav-item" onClick={() => alert('Attendance scheduled for Milestone 5')}>
            <CalendarCheck size={18} /> Attendance
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
          <div className="version-tag">Milestone 3 · Courses & Enrolment</div>
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
            {currentView === 'dashboard' && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow light">
                  {user ? `WELCOME BACK, ${user.name.toUpperCase()}` : 'WELCOME TO ONI LEARNING SPACE'}
                </span>
                <h2>{user ? `Ready for your academic day?` : 'Build. Learn. Achieve.'}</h2>
                <p>
                  {user
                    ? `Logged in with verified role: ${user.roles.map((r) => r.label).join(', ')}.`
                    : 'A clean, modular LMS foundation built with Laravel 12 & React TypeScript.'}
                </p>
              </div>
              <GraduationCap className="welcome-icon" size={76} strokeWidth={1.2} />
            </section>

            {user && (
              <section className="role-banner">
                <ShieldCheck size={20} className="role-banner-icon" />
                <div className="role-banner-content">
                  <strong>Active Session Permissions:</strong>
                  <div className="permissions-pills">
                    {user.permissions.includes('*') ? (
                      <span className="perm-chip all">Full System Access (Super Admin)</span>
                    ) : (
                      user.permissions.map((p) => (
                        <span key={p} className="perm-chip">
                          {p}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="stats">
              <article
                className="stat-card clickable"
                onClick={() => setCurrentView('courses')}
                title="View Courses"
              >
                <span className="stat-icon">
                  <BookOpen size={20} />
                </span>
                <small>COURSE CATALOGUE</small>
                <strong>Operational</strong>
                <p>Browse & enroll in courses →</p>
              </article>
              <article
                className="stat-card clickable"
                onClick={() => setCurrentView('academic')}
                title="View Academic Setup"
              >
                <span className="stat-icon">
                  <Building2 size={20} />
                </span>
                <small>ACADEMIC STRUCTURE</small>
                <strong>Operational</strong>
                <p>Departments, Degrees & Cohorts →</p>
              </article>
              <article
                className="stat-card clickable"
                onClick={() => setCurrentView('assignments')}
                title="View Assignments"
              >
                <span className="stat-icon">
                  <ClipboardList size={20} />
                </span>
                <small>ASSIGNMENTS</small>
                <strong>Operational</strong>
                <p>Submit work & grade submissions →</p>
              </article>
              <article
                className="stat-card clickable"
                onClick={() => setCurrentView('exams')}
                title="View Examinations"
              >
                <span className="stat-icon">
                  <FileQuestion size={20} />
                </span>
                <small>EXAMINATIONS</small>
                <strong>Operational</strong>
                <p>Timed tests & auto-evaluation →</p>
              </article>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>System & API Status</h3>
                  <p>Live health indicator for backend, database, and cache</p>
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

            <section className="panel" style={{ marginTop: '20px' }}>
              <div className="panel-heading">
                <div>
                  <h3>Built Milestones Overview</h3>
                  <p>Verified server-side policies, UUID models, and Sanctum tokens</p>
                </div>
                <span className="status ok">Operational</span>
              </div>
              <div className="architecture-grid">
                <div className="arch-card">
                  <UserCheck size={18} className="arch-card-icon" />
                  <strong>Epic 2: Auth & RBAC</strong>
                  <small>5 Roles, Form Requests, Sanctum Bearer tokens, Policies</small>
                </div>
                <div className="arch-card">
                  <Building2 size={18} className="arch-card-icon" />
                  <strong>Epic 3: Academic Management</strong>
                  <small>Departments, Degree Programmes, Sessions, Semesters, Batches</small>
                </div>
                <div className="arch-card">
                  <BookOpen size={18} className="arch-card-icon" />
                  <strong>Epic 4 & 5: Courses & Lessons</strong>
                  <small>Curricula, Video, PDFs, Markdown notes, Completion tracking</small>
                </div>
                <div className="arch-card">
                  <ClipboardList size={18} className="arch-card-icon" />
                  <strong>Epic 6: Assignments & Grading</strong>
                  <small>Deadlines, file attachments, online submissions, teacher feedback</small>
                </div>
              </div>
            </section>
          </>
        )}
      </>
    )}

        <p className="footnote">ONI Learning Management System · Epics 1 to 6 Operational</p>
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
