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
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { apiRequest, ApiError } from '../api/client';
import type { Department, Programme, AcademicSession, Batch, Semester } from '../types/academic';
import { useAuth } from '../context/AuthContext';

export const AcademicView: React.FC = () => {
  const { hasPermission, hasRole } = useAuth();
  const canManage =
    hasPermission('academic.manage') ||
    hasRole('super_admin') ||
    hasRole('college_admin') ||
    hasRole('dept_admin') ||
    hasRole('hod');

  const [activeTab, setActiveTab] = useState<'departments' | 'programmes' | 'sessions' | 'batches'>('departments');
  const [deptFilterType, setDeptFilterType] = useState<'all' | 'parent' | 'sub'>('all');
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
  const [deptParentId, setDeptParentId] = useState('');

  const [isProgModalOpen, setIsProgModalOpen] = useState(false);
  const [progDeptId, setProgDeptId] = useState('');
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progYears, setProgYears] = useState(4);
  const [progSems, setProgSems] = useState(8);

  // Edit Department modal
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [editDeptStatus, setEditDeptStatus] = useState('active');
  const [editDeptParentId, setEditDeptParentId] = useState('');

  // Edit Programme modal
  const [editingProg, setEditingProg] = useState<Programme | null>(null);
  const [editProgDeptId, setEditProgDeptId] = useState('');
  const [editProgName, setEditProgName] = useState('');
  const [editProgCode, setEditProgCode] = useState('');
  const [editProgYears, setEditProgYears] = useState(4);
  const [editProgSems, setEditProgSems] = useState(8);
  const [editProgStatus, setEditProgStatus] = useState('active');

  // Semester modals (Edit & Create)
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [editSemName, setEditSemName] = useState('');
  const [editSemNumber, setEditSemNumber] = useState(1);
  const [editSemStart, setEditSemStart] = useState('');
  const [editSemEnd, setEditSemEnd] = useState('');
  const [editSemActive, setEditSemActive] = useState(false);
  const [editSemSessionId, setEditSemSessionId] = useState('');

  const [isNewSemModalOpen, setIsNewSemModalOpen] = useState(false);
  const [newSemSessionId, setNewSemSessionId] = useState('');
  const [newSemName, setNewSemName] = useState('');
  const [newSemNumber, setNewSemNumber] = useState(1);
  const [newSemStart, setNewSemStart] = useState('');
  const [newSemEnd, setNewSemEnd] = useState('');
  const [newSemActive, setNewSemActive] = useState(false);

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
          parent_id: deptParentId || null,
          status: 'active',
        }),
      });
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      setDeptParentId('');
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

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setEditDeptName(dept.name);
    setEditDeptCode(dept.code);
    setEditDeptDesc(dept.description || '');
    setEditDeptStatus(dept.status || 'active');
    setEditDeptParentId(dept.parent_id || '');
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      const res = await apiRequest<{ message: string; department: Department }>(`/academic/departments/${editingDept.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editDeptName,
          code: editDeptCode,
          description: editDeptDesc,
          status: editDeptStatus,
          parent_id: editDeptParentId || null,
        }),
      });
      setDepartments((prev) => prev.map((d) => (d.id === res.department.id ? res.department : d)));
      setEditingDept(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating department');
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete department "${dept.name}" (${dept.code})? This will also remove any nested sub-department mappings.`)) {
      return;
    }
    try {
      await apiRequest(`/academic/departments/${dept.id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting department');
    }
  };

  const openEditProgramme = (prog: Programme) => {
    setEditingProg(prog);
    setEditProgDeptId(prog.department_id);
    setEditProgName(prog.name);
    setEditProgCode(prog.code);
    setEditProgYears(prog.duration_years);
    setEditProgSems(prog.total_semesters);
    setEditProgStatus(prog.status || 'active');
  };

  const handleUpdateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProg) return;
    try {
      await apiRequest(`/academic/programmes/${editingProg.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          department_id: editProgDeptId,
          name: editProgName,
          code: editProgCode,
          duration_years: editProgYears,
          total_semesters: editProgSems,
          status: editProgStatus,
        }),
      });
      setEditingProg(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating programme');
    }
  };

  const handleDeleteProgramme = async (prog: Programme) => {
    if (!confirm(`Are you sure you want to delete degree programme "${prog.name}" (${prog.code})?`)) {
      return;
    }
    try {
      await apiRequest(`/academic/programmes/${prog.id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting programme');
    }
  };

  const openEditSemester = (sem: Semester, sessionId: string) => {
    setEditingSemester(sem);
    setEditSemSessionId(sessionId);
    setEditSemName(sem.name);
    setEditSemNumber(sem.semester_number);
    setEditSemStart(sem.start_date || '');
    setEditSemEnd(sem.end_date || '');
    setEditSemActive(sem.is_active);
  };

  const handleUpdateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSemester) return;
    try {
      await apiRequest(`/academic/semesters/${editingSemester.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          academic_session_id: editSemSessionId,
          name: editSemName,
          semester_number: editSemNumber,
          start_date: editSemStart || null,
          end_date: editSemEnd || null,
          is_active: editSemActive,
        }),
      });
      setEditingSemester(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating semester');
    }
  };

  const openCreateSemester = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    const nextNumber = session?.semesters ? session.semesters.length + 1 : 1;
    setNewSemSessionId(sessionId);
    setNewSemName(`Semester ${nextNumber}`);
    setNewSemNumber(nextNumber);
    setNewSemStart(session?.start_date || '');
    setNewSemEnd(session?.end_date || '');
    setNewSemActive(false);
    setIsNewSemModalOpen(true);
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/academic/semesters', {
        method: 'POST',
        body: JSON.stringify({
          academic_session_id: newSemSessionId,
          name: newSemName,
          semester_number: newSemNumber,
          start_date: newSemStart || null,
          end_date: newSemEnd || null,
          is_active: newSemActive,
        }),
      });
      setIsNewSemModalOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating semester');
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
          <div>
            {/* Department Hierarchy Filter Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div className="view-toggle" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`toggle-btn ${deptFilterType === 'all' ? 'active' : ''}`}
                  onClick={() => setDeptFilterType('all')}
                >
                  All Departments ({departments.length})
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${deptFilterType === 'parent' ? 'active' : ''}`}
                  onClick={() => setDeptFilterType('parent')}
                >
                  Parent Departments ({departments.filter(d => !d.parent_id).length})
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${deptFilterType === 'sub' ? 'active' : ''}`}
                  onClick={() => setDeptFilterType('sub')}
                >
                  Sub-Departments ({departments.filter(d => !!d.parent_id).length})
                </button>
              </div>

              {canManage && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setDeptParentId('');
                    setIsDeptModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Create Parent / Sub Department
                </button>
              )}
            </div>

            <div className="grid-cards">
              {departments
                .filter(d => {
                  if (deptFilterType === 'parent') return !d.parent_id;
                  if (deptFilterType === 'sub') return !!d.parent_id;
                  return true;
                })
                .map((dept) => (
                  <article key={dept.id} className="card-item" style={{ borderLeft: dept.parent_id ? '4px solid #0284c7' : '4px solid #0f766e' }}>
                    <div className="card-header">
                      <span className="card-tag">{dept.code}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {dept.parent_id ? (
                          <span className="badge badge-accent" style={{ fontSize: '11px' }}>Sub-Department</span>
                        ) : (
                          <span className="badge badge-role" style={{ fontSize: '11px' }}>Parent Department</span>
                        )}
                        <span className={`status ${dept.status === 'active' ? 'ok' : 'pending'}`}>
                          {dept.status}
                        </span>
                      </div>
                    </div>
                    <h3 style={{ margin: '8px 0 4px' }}>{dept.name}</h3>

                    {dept.parent && (
                      <div style={{ margin: '4px 0 8px' }}>
                        <span style={{ fontSize: '12px', color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ↳ Nested under Parent: <strong>{dept.parent.name}</strong>
                        </span>
                      </div>
                    )}

                    <p>{dept.description || 'No description provided.'}</p>
                    <div className="card-footer">
                      <span><strong>{dept.programmes_count ?? 0}</strong> Programmes</span>
                      <span><strong>{dept.teachers_count ?? 0}</strong> Faculty</span>
                      {dept.sub_departments && dept.sub_departments.length > 0 && (
                        <span style={{ color: '#0f766e' }}><strong>{dept.sub_departments.length}</strong> Sub-Depts</span>
                      )}
                      {canManage && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditDept(dept)}
                            title="Edit Department Name, Code, or Parent Department"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDeleteDepartment(dept)}
                            title="Delete Department"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
            </div>
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
                  {canManage && <th>Actions</th>}
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
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditProgramme(prog)}
                            title="Edit Programme"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDeleteProgramme(prog)}
                            title="Delete Programme"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {sess.is_current && (
                      <span className="badge badge-current">
                        <CheckCircle2 size={13} /> Current Active Year
                      </span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openCreateSemester(sess.id)}
                      >
                        <Plus size={13} /> Add Semester
                      </button>
                    )}
                  </div>
                </div>

                <div className="semesters-row">
                  {sess.semesters && sess.semesters.length > 0 ? (
                    sess.semesters.map((sem) => (
                      <div key={sem.id} className={`semester-chip ${sem.is_active ? 'active-sem' : ''}`}>
                        <span>{sem.name} (#{sem.semester_number})</span>
                        {sem.is_active && <small>Active Term</small>}
                        {canManage && (
                          <button
                            type="button"
                            className="btn-link"
                            style={{ marginLeft: '6px', padding: '2px', color: 'inherit' }}
                            title="Edit Semester"
                            onClick={() => openEditSemester(sem, sess.id)}
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
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
                  placeholder="e.g. ZOO, BOT, PHY, CHE"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Department Full Name</label>
                <input
                  required
                  placeholder="e.g. Department of Zoology"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '6px' }}>
                <label style={{ fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} /> Hierarchy: Parent Department Setting
                </label>
                <select
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                  style={{ background: '#fff' }}
                >
                  <option value="">— Standalone / Top-Level Parent Department (No Parent) —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      ↳ Sub-Department under: {d.name} ({d.code})
                    </option>
                  ))}
                </select>
                <small style={{ color: '#15803d', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                  {deptParentId
                    ? 'Creating as a Sub-Department nested under the selected parent.'
                    : 'Creating as a Top-Level Parent Department.'}
                </small>
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
                  placeholder="e.g. BA, BSC, BCOM, BED"
                  value={progCode}
                  onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Programme Name</label>
                <input
                  required
                  placeholder="e.g. Bachelor of Science"
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

      {/* Modal: Edit Department */}
      {editingDept && (
        <div className="modal-backdrop" onClick={() => setEditingDept(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Department: {editingDept.code}</h3>
              <button className="btn-close" onClick={() => setEditingDept(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateDepartment} className="modal-form">
              <div className="form-group">
                <label>Department Code (Unique)</label>
                <input
                  required
                  placeholder="e.g. ZOO, BOT, PHY, CHE"
                  value={editDeptCode}
                  onChange={(e) => setEditDeptCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Department Full Name</label>
                <input
                  required
                  placeholder="e.g. Department of Zoology"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '6px' }}>
                <label style={{ fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} /> Hierarchy: Parent Department Setting
                </label>
                <select
                  value={editDeptParentId}
                  onChange={(e) => setEditDeptParentId(e.target.value)}
                  style={{ background: '#fff' }}
                >
                  <option value="">— Standalone / Top-Level Parent Department (No Parent) —</option>
                  {departments
                    .filter((d) => d.id !== editingDept?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        ↳ Sub-Department under: {d.name} ({d.code})
                      </option>
                    ))}
                </select>
                <small style={{ color: '#15803d', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                  {editDeptParentId
                    ? 'This department is configured as a Sub-Department nested under the selected parent.'
                    : 'This department is configured as a Top-Level Parent Department (can have sub-departments under it).'}
                </small>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={editDeptStatus} onChange={(e) => setEditDeptStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="Overview of the department and faculty..."
                  rows={3}
                  value={editDeptDesc}
                  onChange={(e) => setEditDeptDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Programme */}
      {editingProg && (
        <div className="modal-backdrop" onClick={() => setEditingProg(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Degree Programme: {editingProg.code}</h3>
              <button className="btn-close" onClick={() => setEditingProg(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateProgramme} className="modal-form">
              <div className="form-group">
                <label>Parent Department</label>
                <select value={editProgDeptId} onChange={(e) => setEditProgDeptId(e.target.value)}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Programme Code</label>
                <input
                  required
                  placeholder="e.g. BA, BSC, BCOM, BED"
                  value={editProgCode}
                  onChange={(e) => setEditProgCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Programme Name</label>
                <input
                  required
                  placeholder="e.g. Bachelor of Science"
                  value={editProgName}
                  onChange={(e) => setEditProgName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Duration (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={editProgYears}
                    onChange={(e) => setEditProgYears(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="form-group">
                  <label>Total Semesters</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editProgSems}
                    onChange={(e) => setEditProgSems(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={editProgStatus} onChange={(e) => setEditProgStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Programme Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Semester */}
      {editingSemester && (
        <div className="modal-backdrop" onClick={() => setEditingSemester(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Semester: {editingSemester.name}</h3>
              <button className="btn-close" onClick={() => setEditingSemester(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateSemester} className="modal-form">
              <div className="form-group">
                <label>Semester Term Name</label>
                <input
                  required
                  placeholder="e.g. Fall Semester, Spring Semester, Semester 1"
                  value={editSemName}
                  onChange={(e) => setEditSemName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Semester Sequence Number (1-16)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={16}
                  value={editSemNumber}
                  onChange={(e) => setEditSemNumber(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={editSemStart}
                    onChange={(e) => setEditSemStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={editSemEnd}
                    onChange={(e) => setEditSemEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editSemActive}
                    onChange={(e) => setEditSemActive(e.target.checked)}
                  />
                  <span>Mark as Active Term</span>
                </label>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Semester</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Semester */}
      {isNewSemModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewSemModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Semester Term</h3>
              <button className="btn-close" onClick={() => setIsNewSemModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSemester} className="modal-form">
              <div className="form-group">
                <label>Semester Term Name</label>
                <input
                  required
                  placeholder="e.g. Monsoon Semester, Semester 2"
                  value={newSemName}
                  onChange={(e) => setNewSemName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Semester Sequence Number (1-16)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={16}
                  value={newSemNumber}
                  onChange={(e) => setNewSemNumber(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newSemStart}
                    onChange={(e) => setNewSemStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={newSemEnd}
                    onChange={(e) => setNewSemEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newSemActive}
                    onChange={(e) => setNewSemActive(e.target.checked)}
                  />
                  <span>Mark as Active Term</span>
                </label>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Create Semester</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
