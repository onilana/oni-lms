import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  FolderGit2,
  GraduationCap,
  Plus,
  RefreshCw,
  Users,
  CheckCircle2,
  X
} from 'lucide-react';
import { apiRequest, ApiError } from '../api/client';
import type { Department, Programme, AcademicSession, Batch } from '../types/academic';
import { useAuth } from '../context/AuthContext';

export const AcademicView: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('academic.manage');

  const [activeTab, setActiveTab] = useState<'departments' | 'programmes' | 'sessions' | 'batches'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [isProgModalOpen, setIsProgModalOpen] = useState(false);
  const [progDeptId, setProgDeptId] = useState('');
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progYears, setProgYears] = useState(4);
  const [progSems, setProgSems] = useState(8);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, progRes, sessRes, batchRes] = await Promise.all([
        apiRequest<{ departments: Department[] }>('/academic/departments'),
        apiRequest<{ programmes: Programme[] }>('/academic/programmes'),
        apiRequest<{ sessions: AcademicSession[] }>('/academic/sessions'),
        apiRequest<{ batches: Batch[] }>('/academic/batches'),
      ]);

      setDepartments(deptRes.departments);
      setProgrammes(progRes.programmes);
      setSessions(sessRes.sessions);
      setBatches(batchRes.batches);
      if (deptRes.departments.length > 0 && !progDeptId) {
        setProgDeptId(deptRes.departments[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch academic records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/academic/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: deptName,
          code: deptCode,
          description: deptDesc,
          status: 'active',
        }),
      });
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating department');
    }
  };

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/academic/programmes', {
        method: 'POST',
        body: JSON.stringify({
          department_id: progDeptId,
          name: progName,
          code: progCode,
          duration_years: progYears,
          total_semesters: progSems,
          status: 'active',
        }),
      });
      setIsProgModalOpen(false);
      setProgName('');
      setProgCode('');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating programme');
    }
  };

  return (
    <div className="academic-view">
      <div className="view-header">
        <div>
          <h2>Academic Management</h2>
          <p>Configure college departments, degree programmes, sessions, and student cohorts</p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary" onClick={fetchData} title="Refresh records">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canManage && activeTab === 'departments' && (
            <button className="btn btn-primary" onClick={() => setIsDeptModalOpen(true)}>
              <Plus size={16} />
              <span>New Department</span>
            </button>
          )}
          {canManage && activeTab === 'programmes' && (
            <button className="btn btn-primary" onClick={() => setIsProgModalOpen(true)}>
              <Plus size={16} />
              <span>New Programme</span>
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building2 size={16} />
          <span>Departments ({departments.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'programmes' ? 'active' : ''}`}
          onClick={() => setActiveTab('programmes')}
        >
          <FolderGit2 size={16} />
          <span>Programmes ({programmes.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Calendar size={16} />
          <span>Sessions & Semesters ({sessions.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <Users size={16} />
          <span>Batches ({batches.length})</span>
        </button>
      </div>

      <div className="tab-content">
        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="grid-cards">
            {departments.map((dept) => (
              <article key={dept.id} className="card-item">
                <div className="card-header">
                  <span className="card-tag">{dept.code}</span>
                  <span className={`status ${dept.status === 'active' ? 'ok' : 'pending'}`}>
                    {dept.status}
                  </span>
                </div>
                <h3>{dept.name}</h3>
                <p>{dept.description || 'No description provided.'}</p>
                <div className="card-footer">
                  <span><strong>{dept.programmes_count ?? 0}</strong> Programmes</span>
                  <span><strong>{dept.teachers_count ?? 0}</strong> Faculty</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Programmes Tab */}
        {activeTab === 'programmes' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Programme Name</th>
                  <th>Department</th>
                  <th>Duration</th>
                  <th>Semesters</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {programmes.map((prog) => (
                  <tr key={prog.id}>
                    <td><code>{prog.code}</code></td>
                    <td><strong>{prog.name}</strong></td>
                    <td>{prog.department_name ?? '—'}</td>
                    <td>{prog.duration_years} Years</td>
                    <td>{prog.total_semesters} Semesters</td>
                    <td>
                      <span className={`status ${prog.status === 'active' ? 'ok' : 'pending'}`}>
                        {prog.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="sessions-list">
            {sessions.map((sess) => (
              <div key={sess.id} className="session-card">
                <div className="session-card-header">
                  <div>
                    <h3>{sess.name}</h3>
                    <small>{sess.start_date} to {sess.end_date}</small>
                  </div>
                  {sess.is_current && (
                    <span className="badge badge-current">
                      <CheckCircle2 size={13} /> Current Active Year
                    </span>
                  )}
                </div>

                <div className="semesters-row">
                  {sess.semesters && sess.semesters.length > 0 ? (
                    sess.semesters.map((sem) => (
                      <div key={sem.id} className={`semester-chip ${sem.is_active ? 'active-sem' : ''}`}>
                        <span>{sem.name}</span>
                        {sem.is_active && <small>Active Term</small>}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted">No semesters configured for this session yet.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Batches Tab */}
        {activeTab === 'batches' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Batch / Cohort Name</th>
                  <th>Programme</th>
                  <th>Academic Session</th>
                  <th>Capacity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td><code>{b.code}</code></td>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.programme_name ?? '—'}</td>
                    <td>{b.academic_session_name ?? '—'}</td>
                    <td>{b.max_capacity ?? 'Unlimited'}</td>
                    <td><span className="status ok">{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Department */}
      {isDeptModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeptModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Department</h3>
              <button className="btn-close" onClick={() => setIsDeptModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateDepartment} className="modal-form">
              <div className="form-group">
                <label>Department Code (Unique)</label>
                <input
                  required
                  placeholder="e.g. CSE, ECE, MECH"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Department Full Name</label>
                <input
                  required
                  placeholder="e.g. Department of Computer Science & Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="Overview of the department and faculty..."
                  rows={3}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Department</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Programme */}
      {isProgModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProgModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Degree Programme</h3>
              <button className="btn-close" onClick={() => setIsProgModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateProgramme} className="modal-form">
              <div className="form-group">
                <label>Parent Department</label>
                <select value={progDeptId} onChange={(e) => setProgDeptId(e.target.value)}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Programme Code</label>
                <input
                  required
                  placeholder="e.g. BTECH-CSE"
                  value={progCode}
                  onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Programme Name</label>
                <input
                  required
                  placeholder="e.g. Bachelor of Technology in Computer Science"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Duration (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={progYears}
                    onChange={(e) => setProgYears(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Total Semesters</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={progSems}
                    onChange={(e) => setProgSems(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Programme</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
