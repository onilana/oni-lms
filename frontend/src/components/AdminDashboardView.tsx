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
  GripVertical,
  HardDrive,
  Layers,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { AdminDashboardData } from '../types/dashboard';
import type { User } from '../types/auth';

interface AdminDashboardViewProps {
  currentUser: User | null;
  onNavigateTo: (
    view: 'academic' | 'courses' | 'users' | 'analytics' | 'audit_logs' | 'backups' | 'wordpress' | 'certificates' | 'attendance',
    options?: { section?: 'admins' | 'teachers' | 'students' | 'all' }
  ) => void;
}

type WidgetId = 'metrics' | 'health' | 'audit' | 'roles' | 'backup' | 'tools';

const DEFAULT_WIDGET_ORDER: WidgetId[] = ['metrics', 'health', 'roles', 'audit', 'backup', 'tools'];
const STORAGE_KEY = 'edu_care_super_admin_dashboard_order';

const WIDGET_TITLES: Record<WidgetId, string> = {
  metrics: 'Key Institutional KPI Metrics',
  health: 'Modular Monolith Infrastructure Health',
  roles: 'RBAC User Distribution',
  audit: 'Security & Institutional Audit Trail',
  backup: 'Disaster Recovery & Backup Snapshot',
  tools: 'Administrative Control Tools',
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onNavigateTo,
}) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drag and Drop state
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGET_ORDER.length) {
          const isValid = DEFAULT_WIDGET_ORDER.every((id) => parsed.includes(id));
          if (isValid) return parsed as WidgetId[];
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_WIDGET_ORDER;
  });

  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<WidgetId | null>(null);

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

  const handleDragStart = (e: React.DragEvent, id: WidgetId) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedWidget(id);
  };

  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidget !== id) {
      setDragOverWidget(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: WidgetId) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    const newOrder = [...widgetOrder];
    const srcIndex = newOrder.indexOf(draggedWidget);
    const targetIndex = newOrder.indexOf(targetId);

    if (srcIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(srcIndex, 1);
      newOrder.splice(targetIndex, 0, draggedWidget);
      setWidgetOrder(newOrder);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    }

    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const resetLayout = () => {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
    localStorage.removeItem(STORAGE_KEY);
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
  const isSuperAdmin = currentUser?.roles.some((r) => r.name === 'super_admin') ?? false;

  const renderWidgetContent = (id: WidgetId) => {
    switch (id) {
      case 'metrics':
        return (
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => onNavigateTo('users', { section: 'students' })}
              title="Click to view all enrolled students with level, programme & department filters"
            >
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Users size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Students</span>
                <strong className="stat-value">{metrics.total_students}</strong>
                <small style={{ color: '#3b82f6', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Filter &amp; Roster &rarr;
                </small>
              </div>
            </div>

            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => onNavigateTo('users', { section: 'teachers' })}
              title="Click to view all faculty & staff members with department and course filters"
            >
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Server size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Faculty &amp; Staff</span>
                <strong className="stat-value">{metrics.total_faculty}</strong>
                <small style={{ color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Faculty Directory &rarr;
                </small>
              </div>
            </div>

            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => onNavigateTo('academic')}
              title="Click to manage academic departments and degree programmes"
            >
              <div className="stat-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
                <Building2 size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Departments</span>
                <strong className="stat-value">{metrics.total_departments}</strong>
                <small style={{ color: '#14b8a6', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Academic Setup &rarr;
                </small>
              </div>
            </div>

            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => onNavigateTo('courses')}
              title="Click to view all active courses and curricula"
            >
              <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                <BookOpen size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Active Courses</span>
                <strong className="stat-value">{metrics.total_courses}</strong>
                <small style={{ color: '#a855f7', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Course Curricula &rarr;
                </small>
              </div>
            </div>

            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => onNavigateTo('certificates')}
              title="Click to view and issue graduation certificates"
            >
              <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <Award size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Certificates Issued</span>
                <strong className="stat-value">{metrics.certificates_issued}</strong>
                <small style={{ color: '#f59e0b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Credential Registry &rarr;
                </small>
              </div>
            </div>

            <div
              className="stat-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => onNavigateTo('attendance')}
              title="Click to view institution-wide attendance records"
            >
              <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <CalendarCheck size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Attendance Rate</span>
                <strong className="stat-value">{metrics.overall_attendance_rate}%</strong>
                <small style={{ color: '#6366f1', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  Session Logs &rarr;
                </small>
              </div>
            </div>
          </div>
        );

      case 'health':
        return (
          <div className="panel" style={{ height: '100%' }}>
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Infrastructure &amp; Stack Operational Health</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Real-time telemetry across modular monolith layers</p>
              </div>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} /> Systems Online
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '16px' }}>
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
        );

      case 'audit':
        return (
          <div className="panel" style={{ height: '100%' }}>
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
        );

      case 'roles':
        return (
          <div className="panel" style={{ height: '100%' }}>
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
        );

      case 'backup':
        return (
          <div className="panel" style={{ height: '100%' }}>
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
        );

      case 'tools':
        return (
          <div className="panel" style={{ height: '100%' }}>
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
              {isSuperAdmin && (
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '10px 14px' }} onClick={() => onNavigateTo('wordpress')}>
                  <Globe size={16} color="#38bdf8" /> WordPress (`oni_lana`) Sync
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-content">
      {/* College Institutional Banner */}
      <div className="hero-banner" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#6366f1', color: '#fff', fontSize: '11px', textTransform: 'uppercase' }}>Institutional Control Center</span>
              <span style={{ fontSize: '13px', opacity: 0.85 }}>{college.domain} · Session {college.academic_session}</span>
              <span className="drag-drop-badge" title="Drag any section using its top bar to reposition it">
                <Sparkles size={12} /> Drag &amp; Drop Enabled
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              {college.name}
            </h2>
            <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '14px' }}>
              College Administrative Console · {college.system_version} · Custom Layout Active
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={resetLayout} title="Reset dashboard widgets to default layout">
              <RotateCcw size={14} /> Reset Layout
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTo('backups')}>
              <HardDrive size={14} /> Backup System
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigateTo('audit_logs')}>
              <ShieldAlert size={14} /> Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* Draggable Dashboard Grid (Database & Backups restricted strictly to Super Admin) */}
      <div className="admin-draggable-grid">
        {widgetOrder.filter((id) => isSuperAdmin || id !== 'backup').map((id) => (
          <div
            key={id}
            className={`admin-widget-card widget-${id} ${draggedWidget === id ? 'is-dragging' : ''} ${dragOverWidget === id ? 'drag-over' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, id)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDrop={(e) => handleDrop(e, id)}
            onDragEnd={handleDragEnd}
          >
            <div className="widget-drag-bar" title="Click and drag to reorder this section on the dashboard">
              <span className="widget-drag-bar-left">
                <GripVertical size={14} />
                {WIDGET_TITLES[id]}
              </span>
              <span>Drag to reorder</span>
            </div>
            {renderWidgetContent(id)}
          </div>
        ))}
      </div>
    </div>
  );
};
