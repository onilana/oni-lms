import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Plus,
  RefreshCw,
  HardDrive,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { User as AuthUser } from '../types/auth';

interface BackupItem {
  filename: string;
  size_bytes: number;
  size_human: string;
  created_at: string;
  sha256: string;
}

interface BackupResponse {
  database_engine: string;
  backup_directory: string;
  automated_schedule: string;
  count: number;
  data: BackupItem[];
}

interface BackupManagementViewProps {
  currentUser: AuthUser | null;
}

export const BackupManagementView: React.FC<BackupManagementViewProps> = ({ currentUser }) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [info, setInfo] = useState<BackupResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<BackupResponse>('/backups');
      setInfo(res);
      setBackups(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve database snapshots.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setSuccessMsg(null);
    setError(null);
    try {
      const res = await apiRequest<{ message: string; backup: BackupItem }>('/backups', {
        method: 'POST',
      });
      setSuccessMsg(res.message);
      loadBackups();
    } catch (err: any) {
      setError(err.message || 'Failed to generate database snapshot.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/v1/backups/${encodeURIComponent(filename)}/download`, '_blank');
  };

  return (
    <div className="backup-management-workspace">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Operations &bull; Disaster Recovery</span>
          <h1 className="section-title">Database Backup &amp; Recovery Management</h1>
          <p className="section-subtitle">
            Automated database snapshots, cryptographic integrity verification (SHA-256), and point-in-time recovery for academic records.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadBackups}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCreateBackup}
            disabled={isCreating}
          >
            <Plus size={15} />
            <span>{isCreating ? 'Creating Snapshot...' : 'Create Snapshot Now'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Info Cards */}
      {info && (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="card">
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Database Engine
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0', color: '#38bdf8' }}>
              {info.database_engine.toUpperCase()}
            </div>
            <small className="text-muted">Storage: {info.backup_directory}</small>
          </div>

          <div className="card">
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Automated Schedule
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '6px 0', color: '#10b981' }}>
              Daily at 02:00 AM UTC
            </div>
            <small className="text-muted">Full Snapshot + WAL Archive</small>
          </div>

          <div className="card">
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Available Snapshots
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0', color: '#eab308' }}>
              {info.count} Archive(s)
            </div>
            <small className="text-muted">Cryptographically verified</small>
          </div>
        </div>
      )}

      {/* Disaster Recovery Policy Box */}
      <div className="card" style={{ marginBottom: 20, background: 'rgba(15, 23, 42, 0.4)', border: '1px solid #334155' }}>
        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8' }}>
          <ShieldCheck size={18} />
          Institutional Disaster Recovery Objectives (Part 11.3 &amp; Part 13.3)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, fontSize: '0.85rem' }}>
          <div>
            <strong>RPO (Recovery Point Objective):</strong>
            <p className="text-muted" style={{ margin: '2px 0 0 0' }}>Maximum 24 hours (continuous transaction logs retained for exams and grades).</p>
          </div>
          <div>
            <strong>RTO (Recovery Time Objective):</strong>
            <p className="text-muted" style={{ margin: '2px 0 0 0' }}>Under 4 hours to complete full database restoration.</p>
          </div>
          <div>
            <strong>Independent Storage:</strong>
            <p className="text-muted" style={{ margin: '2px 0 0 0' }}>Snapshots archived to secure S3-compatible offsite storage bucket.</p>
          </div>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="card">
        <h3>Existing Database Snapshots</h3>

        {loading ? (
          <div className="empty-state">
            <RefreshCw className="animate-spin" size={32} />
            <p>Loading database snapshots...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="empty-state">
            <HardDrive size={48} className="text-muted" />
            <h4>No Backup Snapshots Available</h4>
            <p>Click "Create Snapshot Now" above to generate your first manual system backup.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Archive Filename</th>
                  <th>Created At</th>
                  <th>Size</th>
                  <th>SHA-256 Checksum</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Database size={16} color="#38bdf8" />
                        <strong>{b.filename}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{new Date(b.created_at).toLocaleDateString()}</span>
                        <small className="text-muted">{new Date(b.created_at).toLocaleTimeString()}</small>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-role">{b.size_human}</span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.72rem', color: '#94a3b8' }} title={b.sha256}>
                        {b.sha256.slice(0, 16)}...
                      </code>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDownload(b.filename)}
                        title="Download backup archive"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
