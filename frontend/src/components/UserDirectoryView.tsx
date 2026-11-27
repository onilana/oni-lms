import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Edit2,
  GraduationCap,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Upload,
  X,
  XCircle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type { User, Role } from '../types/auth';
import type { Department, Programme, Batch } from '../types/academic';
import { useAuth } from '../context/AuthContext';
import { StudentProfileModal } from './StudentProfileModal';

interface UserDirectoryViewProps {
  initialSection?: 'admins' | 'teachers' | 'students' | 'all';
}

export const UserDirectoryView: React.FC<UserDirectoryViewProps> = ({ initialSection }) => {
  const { user: authUser, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string; code: string; department_id?: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<'admins' | 'teachers' | 'students' | 'all'>(initialSection || 'admins');
  const [adminSubRole, setAdminSubRole] = useState<'all' | 'super_admin' | 'college_admin' | 'hod'>('all');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [progFilter, setProgFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  // Student Profile Dossier Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentUser, setSelectedStudentUser] = useState<User | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Create Form State
  const [createName, setCreateName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('Campus@2026!');
  const [createRole, setCreateRole] = useState('student');
  const [createStatus, setCreateStatus] = useState('active');
  const [createDeptId, setCreateDeptId] = useState('');
  const [createEmpId, setCreateEmpId] = useState('');
  const [createDesignation, setCreateDesignation] = useState('Faculty Member');
  const [createProgId, setCreateProgId] = useState('');
  const [createBatchId, setCreateBatchId] = useState('');
  const [createStudentId, setCreateStudentId] = useState('');
  const [createSemester, setCreateSemester] = useState(1);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editRole, setEditRole] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editEmpId, setEditEmpId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editProgId, setEditProgId] = useState('');
  const [editBatchId, setEditBatchId] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editSemester, setEditSemester] = useState(1);

  // Bulk Enroll State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<'student' | 'teacher' | 'hod' | 'college_admin'>('student');
  const [bulkDeptId, setBulkDeptId] = useState('');
  const [bulkProgId, setBulkProgId] = useState('');
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ imported_count: number; updated_count?: number; breakdown: Record<string, number>; errors: string[] } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (activeSection === 'admins') {
        if (adminSubRole === 'all') {
          queryParams.set('role', 'super_admin,college_admin,dept_admin,hod');
        } else if (adminSubRole === 'hod') {
          queryParams.set('role', 'hod,dept_admin');
        } else {
          queryParams.set('role', adminSubRole);
        }
      } else if (activeSection === 'teachers') {
        queryParams.set('role', 'teacher');
      } else if (activeSection === 'students') {
        queryParams.set('role', 'student');
      }

      if (semesterFilter && activeSection === 'students') {
        queryParams.set('semester', semesterFilter);
      }
      if (deptFilter && (activeSection === 'teachers' || activeSection === 'students' || activeSection === 'all')) {
        queryParams.set('department_id', deptFilter);
      }
      if (levelFilter && activeSection === 'students') {
        queryParams.set('level', levelFilter);
      }
      if (progFilter && activeSection === 'students') {
        queryParams.set('programme_id', progFilter);
      }
      if (courseFilter && (activeSection === 'teachers' || activeSection === 'students')) {
        queryParams.set('course_id', courseFilter);
      }
      if (statusFilter) {
        queryParams.set('status', statusFilter);
      }
      if (searchTerm) {
        queryParams.set('search', searchTerm);
      }

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const [usersRes, rolesRes, deptRes, progRes, batchRes, coursesRes] = await Promise.all([
        apiRequest<{ data: User[] }>(`/users${queryString}`),
        apiRequest<{ roles: Role[] }>('/roles').catch(() => ({ roles: [] })),
        apiRequest<{ departments: Department[] }>('/academic/departments').catch(() => ({ departments: [] })),
        apiRequest<{ programmes: Programme[] }>('/academic/programmes').catch(() => ({ programmes: [] })),
        apiRequest<{ batches: Batch[] }>('/academic/batches').catch(() => ({ batches: [] })),
        apiRequest<{ courses: any[] }>('/courses').catch(() => ({ courses: [] })),
      ]);

      setUsers(usersRes.data);
      if (rolesRes.roles.length > 0) setRoles(rolesRes.roles);
      if (deptRes.departments.length > 0) setDepartments(deptRes.departments);
      if (progRes.programmes.length > 0) setProgrammes(progRes.programmes);
      if (batchRes.batches.length > 0) setBatches(batchRes.batches);
      if (coursesRes.courses && coursesRes.courses.length > 0) setCourses(coursesRes.courses);
    } catch (err: any) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeSection, adminSubRole, semesterFilter, statusFilter, deptFilter, levelFilter, progFilter, courseFilter]);

  const getProgrammesForDepartment = (deptId: string) => {
    if (!deptId) return programmes;
    const dept = departments.find((d) => d.id === deptId);
    const direct = programmes.filter((p) => p.department_id === deptId);
    if (direct.length > 0) return direct;
    if (dept?.parent_id) {
      const parentProgs = programmes.filter((p) => p.department_id === dept.parent_id);
      if (parentProgs.length > 0) return parentProgs;
    }
    return programmes;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          username: createUsername.trim() || null,
          email: createEmail,
          password: createPassword,
          role: createRole,
          status: createStatus,
          department_id: createDeptId || null,
          employee_id_number: createEmpId || null,
          designation: createDesignation || null,
          programme_id: createProgId || null,
          batch_id: createBatchId || null,
          student_id_number: createStudentId || null,
          current_semester: createSemester,
        }),
      });

      setSuccessMsg(`User "${createName}" created successfully.`);
      setIsCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('Campus@2026!');
      setCreateStudentId('');
      setCreateEmpId('');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username || '');
    setEditEmail(u.email);
    setEditStatus(u.status);
    setEditRole(u.roles[0]?.name || 'student');
    setEditDeptId(u.teacher_profile?.department_id || u.student_profile?.department_id || '');
    setEditEmpId(u.teacher_profile?.employee_id_number || '');
    setEditDesignation(u.teacher_profile?.designation || 'Faculty Member');
    setEditProgId(u.student_profile?.programme_id || '');
    setEditBatchId(u.student_profile?.batch_id || '');
    setEditStudentId(u.student_profile?.student_id_number || '');
    setEditSemester(u.student_profile?.current_semester || 1);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await apiRequest(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          username: editUsername.trim() || null,
          email: editEmail,
          status: editStatus,
          role: editRole,
          department_id: editDeptId || null,
          employee_id_number: editEmpId || null,
          designation: editDesignation || null,
          programme_id: editProgId || null,
          batch_id: editBatchId || null,
          student_id_number: editStudentId || null,
          current_semester: editSemester,
        }),
      });

      setSuccessMsg(`User "${editName}" updated successfully.`);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    try {
      await apiRequest(`/users/${resettingUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      setSuccessMsg(`Password reset successfully for ${resettingUser.name}.`);
      setResettingUser(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === authUser?.id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }
    if (!confirm(`Are you sure you want to remove user "${u.name}" (${u.email})?`)) {
      return;
    }
    try {
      await apiRequest(`/users/${u.id}`, { method: 'DELETE' });
      setSuccessMsg(`User ${u.name} has been removed.`);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleBulkEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const lines = bulkCsvText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const headers = lines[0].toLowerCase().includes('email')
        ? lines[0].split(',').map(h => h.trim().toLowerCase())
        : null;
      const dataLines = headers ? lines.slice(1) : lines;

      const parsedUsers = dataLines.map((line) => {
        const parts = line.split(',').map(p => p.trim());
        if (headers) {
          const row: Record<string, any> = {
            role: bulkRole,
            department_id: bulkDeptId || null,
            programme_id: bulkProgId || null,
          };
          headers.forEach((h, i) => {
            if (parts[i]) row[h] = parts[i];
          });
          return row;
        }
        return {
          name: parts[0] || '',
          email: parts[1] || '',
          role: parts[2] || bulkRole,
          student_id_number: parts[3] || undefined,
          employee_id_number: parts[3] || undefined,
          department_id: bulkDeptId || null,
          programme_id: bulkProgId || null,
        };
      }).filter((u) => u.name && u.email);

      const res = await apiRequest<{
        message: string;
        imported_count: number;
        updated_count?: number;
        breakdown: Record<string, number>;
        errors: string[];
      }>('/users/bulk-enroll', {
        method: 'POST',
        body: JSON.stringify({
          users: parsedUsers,
          overwrite: isSuperAdmin ? bulkOverwrite : false,
        }),
      });
      setBulkResult(res);
      if (res.imported_count > 0) {
        setSuccessMsg(res.message);
        await fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Bulk enrollment failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getRoleBadgeClass = (roleName?: string) => {
    switch (roleName) {
      case 'super_admin':
      case 'college_admin':
        return 'badge-role-admin';
      case 'dept_admin':
        return 'badge-role-dept';
      case 'teacher':
        return 'badge-role-teacher';
      case 'student':
        return 'badge-role-student';
      default:
        return 'badge-role-default';
    }
  };

  return (
    <div className="user-directory-view">
      <div className="view-header">
        <div>
          <h2>User Directory &amp; Campus Access</h2>
          <p>Institutional identity management, faculty &amp; student records, credentials, and RBAC authorization</p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary" onClick={() => fetchUsers()} title="Refresh Directory">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {isSuperAdmin && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsBulkOpen(true);
                setBulkResult(null);
              }}
              title="Bulk Enroll Students, Faculty, HoD, or School Admins"
            >
              <Upload size={16} />
              <span>Bulk Enroll</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <UserPlus size={16} />
            <span>New User</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button className="btn-close" onClick={() => setSuccessMsg(null)}><X size={15} /></button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Primary Section Switcher */}
      <div className="tabs-bar" style={{ marginBottom: '1rem' }}>
        <button
          className={`tab-btn ${activeSection === 'admins' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('admins');
            setSemesterFilter('');
          }}
        >
          <Shield size={16} />
          <span>Leadership &amp; Admins (Super Admin, School Admin, HoD)</span>
        </button>
        <button
          className={`tab-btn ${activeSection === 'teachers' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('teachers');
            setSemesterFilter('');
          }}
        >
          <UserCheck size={16} />
          <span>Teachers &amp; Faculty</span>
        </button>
        <button
          className={`tab-btn ${activeSection === 'students' ? 'active' : ''}`}
          onClick={() => setActiveSection('students')}
        >
          <GraduationCap size={16} />
          <span>Enrolled Students</span>
        </button>
        <button
          className={`tab-btn ${activeSection === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('all');
            setSemesterFilter('');
          }}
        >
          <Users size={16} />
          <span>All Campus Directory</span>
        </button>
      </div>

      {/* Directory Toolbar with Contextual Filters */}
      <div className="courses-toolbar" style={{ marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} className="search-wrap" style={{ flex: 1 }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, student ID, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="filter-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {/* Admin Sub-Role Filters */}
          {activeSection === 'admins' && (
            <div className="view-toggle">
              <button
                className={`toggle-btn ${adminSubRole === 'all' ? 'active' : ''}`}
                onClick={() => setAdminSubRole('all')}
              >
                All Leadership
              </button>
              <button
                className={`toggle-btn ${adminSubRole === 'super_admin' ? 'active' : ''}`}
                onClick={() => setAdminSubRole('super_admin')}
              >
                Super Admin
              </button>
              <button
                className={`toggle-btn ${adminSubRole === 'college_admin' ? 'active' : ''}`}
                onClick={() => setAdminSubRole('college_admin')}
              >
                School / College Admin
              </button>
              <button
                className={`toggle-btn ${adminSubRole === 'hod' ? 'active' : ''}`}
                onClick={() => setAdminSubRole('hod')}
              >
                Head of Department (HoD)
              </button>
            </div>
          )}

          {/* Department Filter (Teachers, Students, All) */}
          {(activeSection === 'teachers' || activeSection === 'students' || activeSection === 'all') && (
            <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setProgFilter(''); }}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          )}

          {/* Level Filter (Students) */}
          {activeSection === 'students' && (
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setProgFilter(''); }}>
              <option value="">All Levels</option>
              <option value="pg">PG (Postgraduate)</option>
              <option value="ug">UG (Undergraduate)</option>
              <option value="diploma">Diploma</option>
              <option value="certificate">Certificate</option>
            </select>
          )}

          {/* Programme Filter (Students) */}
          {activeSection === 'students' && (
            <select value={progFilter} onChange={(e) => setProgFilter(e.target.value)}>
              <option value="">All Parent Programmes</option>
              {programmes
                .filter((p) => (!levelFilter || (p.level || 'ug') === levelFilter))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    [{(p.level || 'ug').toUpperCase()}] {p.name} ({p.code})
                  </option>
                ))}
            </select>
          )}

          {/* Active Course Filter (Teachers) */}
          {activeSection === 'teachers' && (
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All Active Courses</option>
              {courses
                .filter((c) => !deptFilter || c.department_id === deptFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                ))}
            </select>
          )}

          {/* Semester Filter (Students) */}
          {activeSection === 'students' && (
            <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
              <option value="">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
              <option value="8">Semester 8</option>
            </select>
          )}

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <p>Loading user directory records...</p>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Users size={48} className="empty-state-icon" />
          <h3>No users found</h3>
          <p>Try refining your search terms or register a new campus user above.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Identity</th>
                <th>Role &amp; Access</th>
                <th>Academic Affiliation</th>
                <th>Identifier ID</th>
                <th>Courses / Load</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const primaryRole = u.roles[0]?.name;
                const roleLabel = u.roles[0]?.label || primaryRole || 'Member';
                const isStudent = primaryRole === 'student';
                const isFaculty = primaryRole === 'teacher';

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#3b82f6',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div>
                          {isStudent ? (
                            <strong
                              style={{ cursor: 'pointer', color: '#1d4ed8', textDecoration: 'underline' }}
                              onClick={() => {
                                setSelectedStudentId(u.id);
                                setSelectedStudentUser(u);
                                setIsStudentModalOpen(true);
                              }}
                              title="Click to view complete student profile dossier"
                            >
                              {u.name}
                            </strong>
                          ) : (
                            <strong>{u.name}</strong>
                          )}
                          <small style={{ display: 'block', color: '#64748b' }}>
                            {u.email}{u.username ? ` · @${u.username}` : ''}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${getRoleBadgeClass(primaryRole)}`}>
                        {roleLabel}
                      </span>
                    </td>

                    <td>
                      {isFaculty ? (
                        <span>
                          <strong>{u.teacher_profile?.department_name || 'Faculty'}</strong>
                          <small style={{ display: 'block', color: '#64748b' }}>
                            {u.teacher_profile?.designation || 'Instructor'}
                          </small>
                        </span>
                      ) : isStudent ? (
                        <span>
                          <strong>{u.student_profile?.programme_name || 'Degree Programme'}</strong>
                          <small style={{ display: 'block', color: '#64748b' }}>
                            Semester {u.student_profile?.current_semester ?? 1} · {u.student_profile?.batch_name || 'Active Batch'}
                          </small>
                        </span>
                      ) : (
                        <span className="text-muted">Institutional Administration</span>
                      )}
                    </td>

                    <td>
                      {isStudent && u.student_profile?.student_id_number ? (
                        <code
                          style={{
                            cursor: 'pointer',
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                          onClick={() => {
                            setSelectedStudentId(u.id);
                            setSelectedStudentUser(u);
                            setIsStudentModalOpen(true);
                          }}
                          title="Click to view complete student profile dossier"
                        >
                          {u.student_profile.student_id_number}
                        </code>
                      ) : isFaculty && u.teacher_profile?.employee_id_number ? (
                        <code>{u.teacher_profile.employee_id_number}</code>
                      ) : (
                        <small className="text-muted">{u.id.substring(0, 8)}...</small>
                      )}
                    </td>

                    <td>
                      {isFaculty ? (
                        <span>{u.taught_courses_count ?? 0} Courses Taught</span>
                      ) : (
                        <span>{u.enrolled_courses_count ?? 0} Enrolled</span>
                      )}
                    </td>

                    <td>
                      <span className={`status ${u.status === 'active' ? 'ok' : u.status === 'suspended' ? 'danger' : 'pending'}`}>
                        {u.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isStudent && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            title="View Complete Student Profile Dossier"
                            onClick={() => {
                              setSelectedStudentId(u.id);
                              setSelectedStudentUser(u);
                              setIsStudentModalOpen(true);
                            }}
                          >
                            <GraduationCap size={13} /> Dossier
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          title="Edit Profile"
                          onClick={() => openEditModal(u)}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Reset Password"
                          onClick={() => {
                            setResettingUser(u);
                            setNewPassword('');
                          }}
                        >
                          <KeyRound size={13} />
                        </button>
                        {isSuperAdmin && u.id !== authUser?.id && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            style={{ color: '#ef4444' }}
                            title="Remove User"
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Register New User</h3>
                <p>Create a campus identity and provision student or teacher profile</p>
              </div>
              <button className="btn-close" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateUser} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Username (Optional)</label>
                  <input
                    placeholder="Auto-generated if blank"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. eleanor.vance@educare.edu"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Primary Role</label>
                  <select value={createRole} onChange={(e) => {
                    const newRole = e.target.value;
                    setCreateRole(newRole);
                    if (newRole === 'hod') setCreateDesignation('Head of Department');
                  }}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="hod">Head of Department (HoD)</option>
                    <option value="dept_admin">Department Administrator</option>
                    <option value="college_admin">College Administrator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={createStatus} onChange={(e) => setCreateStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Profile Fields based on selected role */}
              {createRole === 'student' && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Student Academic &amp; Programme Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label>Department</label>
                      <select
                        value={createDeptId}
                        onChange={(e) => {
                          const dId = e.target.value;
                          setCreateDeptId(dId);
                          // Auto select first programme of this department (or parent department)
                          const matching = getProgrammesForDepartment(dId);
                          if (matching.length > 0) setCreateProgId(matching[0].id);
                        }}
                      >
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Degree Programme</label>
                      <select
                        value={createProgId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setCreateProgId(pId);
                          const prog = programmes.find((p) => p.id === pId);
                          if (prog?.department_id && !createDeptId) setCreateDeptId(prog.department_id);
                        }}
                      >
                        <option value="">Select Programme...</option>
                        {getProgrammesForDepartment(createDeptId).map((p) => (
                          <option key={p.id} value={p.id}>{p.code}: {p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Student ID Number</label>
                      <input
                        placeholder="e.g. STU-2026-0042"
                        value={createStudentId}
                        onChange={(e) => setCreateStudentId(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Starting Semester</label>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={createSemester}
                        onChange={(e) => setCreateSemester(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Student will be automatically enrolled into all courses and curriculum of the assigned programme.
                  </small>
                </div>
              )}

              {(createRole === 'teacher' || createRole === 'hod' || createRole === 'dept_admin') && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Faculty / HoD Department Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label>Assigned Department</label>
                      <select value={createDeptId} onChange={(e) => setCreateDeptId(e.target.value)}>
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Degree Programme (Optional)</label>
                      <select value={createProgId} onChange={(e) => setCreateProgId(e.target.value)}>
                        <option value="">All Department Programmes...</option>
                        {(createDeptId ? programmes.filter((p) => p.department_id === createDeptId) : programmes).map((p) => (
                          <option key={p.id} value={p.id}>{p.code}: {p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Employee ID Number</label>
                      <input
                        placeholder="e.g. FAC-2026-018"
                        value={createEmpId}
                        onChange={(e) => setCreateEmpId(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Academic Designation</label>
                      <input
                        placeholder="e.g. Professor / Head of Department"
                        value={createDesignation}
                        onChange={(e) => setCreateDesignation(e.target.value)}
                      />
                    </div>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Instructor will be automatically assigned to teach and access all curriculum in this department.
                  </small>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '14px' }}>
                Provision Campus Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit User: {editingUser.name}</h3>
                <p>Update identity details, role permissions, and academic assignments</p>
              </div>
              <button className="btn-close" onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateUser} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    placeholder="e.g. stu_2026_001"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Primary Role</label>
                  <select value={editRole} onChange={(e) => {
                    const newRole = e.target.value;
                    setEditRole(newRole);
                    if (newRole === 'hod' && !editDesignation) setEditDesignation('Head of Department');
                  }}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="hod">Head of Department (HoD)</option>
                    <option value="dept_admin">Department Administrator</option>
                    <option value="college_admin">College Administrator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Account Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {editRole === 'student' && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Student Academic &amp; Programme Assignment</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label>Parent Programme (Level → Programme)</label>
                      <select
                        value={editProgId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setEditProgId(pId);
                          const prog = programmes.find((p) => p.id === pId);
                          const matchingDept = departments.find((d) => d.programme_id === pId);
                          if (matchingDept) {
                            setEditDeptId(matchingDept.id);
                          } else if (prog?.department_id && !editDeptId) {
                            setEditDeptId(prog.department_id);
                          }
                        }}
                      >
                        <option value="">Select Programme...</option>
                        {programmes.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{(p.level || 'ug').toUpperCase()}] {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <select
                        value={editDeptId}
                        onChange={(e) => setEditDeptId(e.target.value)}
                      >
                        <option value="">Select Department...</option>
                        {(editProgId && departments.some((d) => d.programme_id === editProgId)
                          ? departments.filter((d) => d.programme_id === editProgId)
                          : departments
                        ).map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Student ID Number</label>
                      <input
                        placeholder="e.g. STU-2026-0042"
                        value={editStudentId}
                        onChange={(e) => setEditStudentId(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Current Semester</label>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={editSemester}
                        onChange={(e) => setEditSemester(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Changing Programme/Department automatically shifts student course enrolments to the new curriculum.
                  </small>
                </div>
              )}

              {(editRole === 'teacher' || editRole === 'hod' || editRole === 'dept_admin') && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Faculty / HoD Department Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label>Assigned Department</label>
                      <select value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)}>
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Degree Programme (Optional)</label>
                      <select value={editProgId} onChange={(e) => setEditProgId(e.target.value)}>
                        <option value="">All Department Programmes...</option>
                        {(editDeptId ? programmes.filter((p) => p.department_id === editDeptId) : programmes).map((p) => (
                          <option key={p.id} value={p.id}>{p.code}: {p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Employee ID Number</label>
                      <input
                        placeholder="e.g. FAC-2026-018"
                        value={editEmpId}
                        onChange={(e) => setEditEmpId(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Academic Designation</label>
                      <input
                        placeholder="e.g. Associate Professor"
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                      />
                    </div>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Changing department automatically reassigns instructor teaching permissions to all courses in the new department.
                  </small>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '14px' }}>
                Save Profile Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="modal-backdrop" onClick={() => setResettingUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Reset Password: {resettingUser.name}</h3>
                <small className="text-muted">{resettingUser.email}</small>
              </div>
              <button className="btn-close" onClick={() => setResettingUser(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleResetPassword} className="modal-form">
              <div className="form-group">
                <label>New Account Password (Min 8 Characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Enter new secure password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Set New Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BULK ENROLLMENT MODAL */}
      {isBulkOpen && (
        <div className="modal-backdrop" onClick={() => setIsBulkOpen(false)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Bulk User Enrollment</h3>
                <p>Enroll School Admins, HoDs, Professors / Teachers, and Students in bulk</p>
              </div>
              <button className="btn-close" onClick={() => setIsBulkOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleBulkEnroll} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Default Target Role</label>
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value as any)}
                  >
                    <option value="student">Students</option>
                    <option value="teacher">Professors / Teachers</option>
                    <option value="hod">Head of Department (HoD)</option>
                    <option value="college_admin">School / College Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Default Department (Optional)</label>
                  <select
                    value={bulkDeptId}
                    onChange={(e) => {
                      const dId = e.target.value;
                      setBulkDeptId(dId);
                      const matching = getProgrammesForDepartment(dId);
                      if (matching.length > 0) setBulkProgId(matching[0].id);
                    }}
                  >
                    <option value="">— Select Department (or specify per row) —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {bulkRole === 'student' && (
                <div className="form-group" style={{ marginTop: '-4px' }}>
                  <label>Default Degree Programme (Optional)</label>
                  <select
                    value={bulkProgId}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setBulkProgId(pId);
                      const prog = programmes.find((p) => p.id === pId);
                      if (prog?.department_id && !bulkDeptId) setBulkDeptId(prog.department_id);
                    }}
                  >
                    <option value="">— Select Programme (or specify per row) —</option>
                    {getProgrammesForDepartment(bulkDeptId).map((p) => (
                      <option key={p.id} value={p.id}>{p.code}: {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ margin: 0 }}>CSV / Row Data (Name, Email, [Role], [ID Number])</label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm"
                    onClick={() => {
                      if (bulkRole === 'student') {
                        setBulkCsvText("Name, Email, Student_ID\nAarav Sharma, aarav.s@educare.edu, STU-2026-001\nDiya Patel, diya.p@educare.edu, STU-2026-002");
                      } else if (bulkRole === 'hod') {
                        setBulkCsvText("Name, Email, Employee_ID\nDr. Marcus Vance, marcus.v@educare.edu, FAC-2026-HOD1");
                      } else if (bulkRole === 'college_admin') {
                        setBulkCsvText("Name, Email\nDean Robert Miller, dean.miller@educare.edu");
                      } else {
                        setBulkCsvText("Name, Email, Employee_ID\nProf. Sarah Jenkins, sarah.j@educare.edu, FAC-2026-011\nDr. Alan Turing, alan.t@educare.edu, FAC-2026-012");
                      }
                    }}
                  >
                    Insert Example Template
                  </button>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste CSV rows here. Example:&#10;John Doe, john@educare.edu, STU-001&#10;Jane Smith, jane@educare.edu, STU-002"
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              {/* Upload file alternative */}
              <div className="form-group">
                <label>Or Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        if (content) setBulkCsvText(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </div>

              {isSuperAdmin && (
                <div className="form-group" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, color: '#9a3412', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={bulkOverwrite}
                      onChange={(e) => setBulkOverwrite(e.target.checked)}
                    />
                    <span>Overwrite existing users if email already exists (Super Admin Authority)</span>
                  </label>
                </div>
              )}

              {bulkResult && (
                <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                  <p>
                    <strong>{bulkResult.imported_count}</strong> user(s) successfully processed
                    {bulkResult.updated_count ? ` (${bulkResult.updated_count} overwritten)` : ''}!
                  </p>
                  {bulkResult.breakdown && Object.keys(bulkResult.breakdown).length > 0 && (
                    <small style={{ display: 'block', marginTop: '4px' }}>
                      Breakdown: {Object.entries(bulkResult.breakdown).map(([r, count]) => `${r}: ${count}`).join(', ')}
                    </small>
                  )}
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '12px' }}>
                      <strong>Skipped / Errors:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {bulkResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsBulkOpen(false)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bulkLoading || !bulkCsvText.trim()}
                >
                  {bulkLoading ? 'Enrolling...' : 'Process Bulk Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE DOSSIER MODAL */}
      <StudentProfileModal
        userId={selectedStudentId}
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setSelectedStudentId(null);
          setSelectedStudentUser(null);
        }}
        initialData={selectedStudentUser}
        onEdit={(student) => openEditModal(student)}
      />
    </div>
  );
};
