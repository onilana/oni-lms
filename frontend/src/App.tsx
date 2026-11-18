import { useEffect, useState } from 'react';
import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

type Health = {
  success: boolean;
  service: string;
  checks: Record<string, string>;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/health`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">O</span><div><strong>ONI LMS</strong><small>Learning Portal</small></div></div>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item active" href="#"><LayoutDashboard size={18} /> Dashboard</a>
        <a className="nav-item" href="#"><BookOpen size={18} /> Courses</a>
        <a className="nav-item" href="#"><ClipboardList size={18} /> Assignments</a>
        <a className="nav-item" href="#"><Users size={18} /> Users</a>
        <div className="sidebar-footer">Starter build · v0.1.0</div>
      </aside>

      <main className="main">
        <header className="topbar"><div><span className="eyebrow">COLLEGE LEARNING PLATFORM</span><h1>Dashboard</h1></div><div className="avatar">ON</div></header>
        <section className="welcome">
          <div><span className="eyebrow light">WELCOME TO YOUR LEARNING SPACE</span><h2>Build. Learn. Achieve.</h2><p>ONI LMS foundation is ready for the next development phase.</p></div>
          <GraduationCap className="welcome-icon" size={76} strokeWidth={1.2} />
        </section>
        <section className="stats">
          <article className="stat-card"><span className="stat-icon"><BookOpen size={20} /></span><small>COURSES</small><strong>—</strong><p>Not configured yet</p></article>
          <article className="stat-card"><span className="stat-icon"><Users size={20} /></span><small>STUDENTS</small><strong>—</strong><p>Not configured yet</p></article>
          <article className="stat-card"><span className="stat-icon"><ClipboardList size={20} /></span><small>ASSIGNMENTS</small><strong>—</strong><p>Not configured yet</p></article>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h3>System status</h3><p>Live connection check for the development services</p></div><span className={`status ${health?.success ? 'ok' : 'pending'}`}>{health?.success ? 'Connected' : 'Checking'}</span></div>
          {error && <p className="error">API connection unavailable: {error}. Check that Docker services are running.</p>}
          <div className="health-grid">
            {['application', 'database', 'redis'].map((name) => <div className="health-item" key={name}><span className={`dot ${health?.checks?.[name] === 'ok' ? 'green' : ''}`} /><span>{name}</span><b>{health?.checks?.[name] ?? 'Pending'}</b></div>)}
          </div>
        </section>
        <p className="footnote">This is the initial software foundation, not a finished production LMS.</p>
      </main>
    </div>
  );
}
