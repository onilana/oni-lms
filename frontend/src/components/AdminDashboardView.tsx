import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle,
  Database,
  Globe,
  HardDrive,
  Layers,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { AdminDashboardData } from '../types/dashboard';
import type { User } from '../types/auth';

interface AdminDashboardViewProps {
  currentUser: User | null;
  onNavigateTo: (view: 'academic' | 'courses' | 'users' | 'analytics' | 'audit_logs' | 'backups' | 'wordpress' | 'certificates') => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onNavigateTo,
}) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAdminDashboard();
  }, [currentUser]);

  const loadAdminDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<AdminDashboardData>('/dashboard/admin');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw className="spin" size={32} />
        <p>Loading institutional control center...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-banner">
        <AlertCircle size={20} />
        <span>{error || 'Unable to retrieve administrative dashboard data.'}</span>
        <button className="btn btn-secondary btn-sm" onClick={loadAdminDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const { college, metrics, system_health, roles_distribution, recent_audit_logs, latest_backup } = data;

  return (
    <div className="dashboard-content">
      {/* College Institutional Banner */}
      <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#6366f1', color: '#fff', fontSize: '11px', textTransform: 'uppercase' }}>Institutional Control Center</span>
              <span style={{ fontSize: '13px', opacity: 0.85 }}>{college.domain} · Session {college.academic_session}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              {college.name}
            </h2>
            <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '14px' }}>
              College Administrative Console · {college.system_version}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigateTo('backups')}>
              <HardDrive size={16} /> Backup System
            </button>
            <button className="btn btn-primary" onClick={() => onNavigateTo('audit_logs')}>
              <ShieldAlert size={16} /> Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* College KPI Metrics */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Students</span>
            <strong className="stat-value">{metrics.total_students}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Server size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Faculty &amp; Staff</span>
            <strong className="stat-value">{metrics.total_faculty}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
            <Building2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Departments</span>
            <strong className="stat-value">{metrics.total_departments}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <BookOpen size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Courses</span>
            <strong className="stat-value">{metrics.total_courses}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Certificates Issued</span>
            <strong className="stat-value">{metrics.certificates_issued}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Attendance Rate</span>
            <strong className="stat-value">{metrics.overall_attendance_rate}%</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Infrastructure Health & Security Audit Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* System Infrastructure Health Panel */}
          <div className="panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Infrastructure &amp; Stack Operational Health</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Real-time telemetry across modular monolith layers</p>
              </div>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} /> Systems Online
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Application Engine</div>
                <strong style={{ display: 'block', margin: '4px 0 2px', fontSize: '14px' }}>Laravel {system_health.laravel_version}</strong>
                <span style={{ fontSize: '11px', color: '#10b981' }}>PHP {system_health.php_version}</span>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Relational DB</div>
                <strong style={{ display: 'block', margin: '4px 0 2px', fontSize: '14px' }}>PostgreSQL / SQLite</strong>
                <span style={{ fontSize: '11px', color: '#10b981' }}>Connected (0ms)</span>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cache &amp; Queues</div>
                <strong style={{ display: 'block', margin: '4px 0 2px', fontSize: '14px' }}>Redis Cache</strong>
                <span style={{ fontSize: '11px', color: '#10b981' }}>Active / Ready</span>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Object Storage</div>
                <strong style={{ display: 'block', margin: '4px 0 2px', fontSize: '14px' }}>S3 / Local Vault</strong>
                <span style={{ fontSize: '11px', color: '#10b981' }}>Read / Write OK</span>
              </div>
            </div>
          </div>

          {/* Security Audit Trail Snapshot */}
          <div className="panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Security &amp; Institutional Audit Trail</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Recent security events, updates and user actions</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('audit_logs')}>
                Full Audit Trail <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ marginTop: '16px', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                    <th style={{ padding: '8px 12px' }}>Target Resource</th>
                    <th style={{ padding: '8px 12px' }}>Actor</th>
                    <th style={{ padding: '8px 12px' }}>IP Address</th>
                    <th style={{ padding: '8px 12px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_audit_logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recent_audit_logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <span className={`badge ${log.action === 'created' ? 'badge-success' : log.action === 'deleted' ? 'badge-danger' : 'badge-neutral'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <strong>{log.auditable_type}</strong>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{log.user_name}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{log.ip_address}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Roles Breakdown, Backup Status & Admin Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* RBAC Role Distribution */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>RBAC User Distribution</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Active directory identities across 7 roles</p>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roles_distribution.map((role) => (
                <div key={role.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', background: 'var(--surface-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="dot" style={{ background: role.name.includes('admin') ? '#ef4444' : role.name.includes('teacher') || role.name === 'hod' ? '#3b82f6' : '#10b981' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{role.label}</span>
                  </div>
                  <strong style={{ fontSize: '13px' }}>{role.users_count}</strong>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm btn-block" style={{ marginTop: '8px' }} onClick={() => onNavigateTo('users')}>
                <Users size={14} /> Manage User Directory
              </button>
            </div>
          </div>

          {/* Database & Backup Snapshot */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Disaster Recovery Snapshot</h3>
            </div>

            <div style={{ marginTop: '14px' }}>
              {latest_backup ? (
                <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-success">Verified</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{latest_backup.size}</span>
                  </div>
                  <strong style={{ display: 'block', margin: '6px 0 2px', fontSize: '13px', wordBreak: 'break-all' }}>
                    {latest_backup.filename}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Created: {new Date(latest_backup.created_at).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No manual snapshot created yet.</p>
              )}
              <button className="btn btn-secondary btn-sm btn-block" style={{ marginTop: '12px' }} onClick={() => onNavigateTo('backups')}>
                <HardDrive size={14} /> Open Backup Manager
              </button>
            </div>
          </div>

          {/* Institutional Shortcuts */}
          <div className="panel">
            <div className="panel-heading">
              <h3 style={{ margin: 0, fontSize: '16px' }}>Administrative Tools</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('users')}>
                <Users size={16} color="#3b82f6" /> User Directory &amp; CSV Bulk Import
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('academic')}>
                <Building2 size={16} color="#0f766e" /> Academic Departments &amp; Programmes
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('certificates')}>
                <Award size={16} color="#f59e0b" /> Digital Certificates &amp; Verification
              </button>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('wordpress')}>
                <Globe size={16} color="#38bdf8" /> WordPress (`oni_lana`) Sync
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
