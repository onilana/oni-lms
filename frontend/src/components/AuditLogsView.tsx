import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User as UserIcon,
  Globe,
  Database,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { User as AuthUser } from '../types/auth';

interface AuditLogItem {
  id: string;
  user_id: string | null;
  action: string;
  auditable_type: string | null;
  auditable_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface AuditStats {
  total_events: number;
  today_events: number;
  top_actions: Record<string, number>;
}

interface AuditLogsViewProps {
  currentUser: AuthUser | null;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await apiRequest<{ data: AuditLogItem[] }>(`/audit-logs?${params.toString()}`);
      setLogs(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await apiRequest<AuditStats>('/audit-logs/stats');
      setStats(res);
    } catch (err) {}
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete') || action.includes('revoke') || action.includes('suspend')) {
      return 'badge-danger';
    }
    if (action.includes('create') || action.includes('publish') || action.includes('sync')) {
      return 'badge-success';
    }
    if (action.includes('grade') || action.includes('login') || action.includes('backup')) {
      return 'badge-accent';
    }
    return 'badge-role';
  };

  return (
    <div className="audit-logs-workspace">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Security &bull; Regulatory Compliance</span>
          <h1 className="section-title">Security &amp; Institutional Audit Trail</h1>
          <p className="section-subtitle">
            Tamper-resistant audit log capturing all sensitive administrative actions, grade changes, role allocations, and system events.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => { loadLogs(); loadStats(); }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div className="card">
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Recorded Events
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#38bdf8' }}>
              {stats.total_events.toLocaleString()}
            </div>
            <small className="text-muted">Immutable storage log</small>
          </div>

          <div className="card">
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Events Captured Today
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#10b981' }}>
              {stats.today_events.toLocaleString()}
            </div>
            <small className="text-muted">Active institutional audit</small>
          </div>

          <div className="card">
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Retention Policy
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '6px 0', color: '#eab308' }}>
              7 Years (DPDP / UGC)
            </div>
            <small className="text-muted">Compliant with education standards</small>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by action, user email, IP address..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="form-control"
            style={{ width: '200px' }}
          >
            <option value="">All Action Types</option>
            <option value="user">User &amp; Auth (login, create, reset)</option>
            <option value="grade">Grades &amp; Evaluations</option>
            <option value="exam">Examinations</option>
            <option value="certificate">Certificates</option>
            <option value="system">System &amp; Backups</option>
            <option value="wordpress">WordPress Sync</option>
          </select>

          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={14} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state">
            <RefreshCw className="animate-spin" size={32} />
            <p>Loading security audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={48} className="text-muted" />
            <h4>No Audit Records Found</h4>
            <p>No actions match your current search criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const isExpanded = expandedRow === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                            <small className="text-muted">{new Date(log.created_at).toLocaleTimeString()}</small>
                          </div>
                        </td>
                        <td>
                          {log.user ? (
                            <div>
                              <strong>{log.user.name}</strong>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted">System Automated</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.78rem' }}>
                            {log.auditable_type || 'N/A'}{log.auditable_id ? ` #${log.auditable_id.slice(0, 8)}` : ''}
                          </code>
                        </td>
                        <td>
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                            {log.ip_address || '127.0.0.1'}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                          <td colSpan={6} style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              <div>
                                <strong style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Previous State (Old Values):</strong>
                                <pre style={{ background: '#0f172a', padding: 10, borderRadius: 6, fontSize: '0.75rem', marginTop: 4, overflowX: 'auto', border: '1px solid #334155' }}>
                                  {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div>
                                <strong style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Modified State (New Values):</strong>
                                <pre style={{ background: '#0f172a', padding: 10, borderRadius: 6, fontSize: '0.75rem', marginTop: 4, overflowX: 'auto', border: '1px solid #334155' }}>
                                  {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                            {log.user_agent && (
                              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#64748b' }}>
                                <strong>User Agent:</strong> {log.user_agent}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
