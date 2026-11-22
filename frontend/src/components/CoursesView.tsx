import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Edit2,
  FileText,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { apiRequest, ApiError } from '../api/client';
import type { Course } from '../types/course';
import type { Department, Programme, AcademicSession } from '../types/academic';
import { useAuth } from '../context/AuthContext';

interface CoursesViewProps {
  onOpenLogin: () => void;
  onOpenLearning: (courseId: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ onOpenLogin, onOpenLearning }) => {
  const { user, hasPermission, hasRole } = useAuth();
  const canCreateCourse = hasPermission('courses.create') || hasRole('teacher') || hasRole('super_admin');

  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [currentSession, setCurrentSession] = useState<AcademicSession | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');

  // Course Details modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // New Course modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDeptId, setNewDeptId] = useState('');
  const [newProgId, setNewProgId] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCredits, setNewCredits] = useState(3);
  const [newLevel, setNewLevel] = useState('Undergraduate');
  const [newSemester, setNewSemester] = useState(1);
  const [newStatus, setNewStatus] = useState<'draft' | 'published'>('published');
  const [newDesc, setNewDesc] = useState('');
  const [newSyllabus, setNewSyllabus] = useState('');

  // Edit Course modal
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editDeptId, setEditDeptId] = useState('');
  const [editProgId, setEditProgId] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCredits, setEditCredits] = useState(3);
  const [editLevel, setEditLevel] = useState('Undergraduate');
  const [editSemester, setEditSemester] = useState(1);
  const [editStatus, setEditStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [editDesc, setEditDesc] = useState('');
  const [editSyllabus, setEditSyllabus] = useState('');

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (viewFilter === 'my') {
        queryParams.set('my_courses', '1');
      }
      if (deptFilter) {
        queryParams.set('department_id', deptFilter);
      }

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const [coursesRes, deptRes, progRes, sessRes] = await Promise.all([
        apiRequest<{ courses: Course[] }>(`/courses${queryString}`),
        apiRequest<{ departments: Department[] }>('/academic/departments'),
        apiRequest<{ programmes: Programme[] }>('/academic/programmes'),
        apiRequest<{ sessions: AcademicSession[] }>('/academic/sessions'),
      ]);

      setCourses(coursesRes.courses);
      setDepartments(deptRes.departments);
      setProgrammes(progRes.programmes);
      const activeSess = sessRes.sessions.find((s) => s.is_current) ?? sessRes.sessions[0] ?? null;
      setCurrentSession(activeSess);

      if (deptRes.departments.length > 0 && !newDeptId) {
        setNewDeptId(deptRes.departments[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load courses.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [viewFilter, deptFilter]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      onOpenLogin();
      return;
    }

    if (!currentSession) {
      alert('No active academic session found for enrolment.');
      return;
    }

    try {
      await apiRequest(`/courses/${courseId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({
          academic_session_id: currentSession.id,
        }),
      });
      await fetchCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error enrolling in course');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify({
          department_id: newDeptId,
          programme_id: newProgId || undefined,
          code: newCode,
          title: newTitle,
          credits: newCredits,
          level: newLevel,
          semester_number: newSemester,
          status: newStatus,
          description: newDesc,
          syllabus: newSyllabus,
        }),
      });

      setIsCreateOpen(false);
      setNewCode('');
      setNewTitle('');
      setNewDesc('');
      setNewSyllabus('');
      await fetchCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating course');
    }
  };

  const handleOpenEdit = (c: Course) => {
    setEditingCourse(c);
    setEditDeptId(c.department_id);
    setEditProgId(c.programme_id || '');
    setEditCode(c.code);
    setEditTitle(c.title);
    setEditCredits(c.credits);
    setEditLevel(c.level || 'Undergraduate');
    setEditSemester(c.semester_number || 1);
    setEditStatus(c.status);
    setEditDesc(c.description || '');
    setEditSyllabus(c.syllabus || '');
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      const res = await apiRequest<{ message: string; course: Course }>(`/courses/${editingCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          department_id: editDeptId,
          programme_id: editProgId || undefined,
          code: editCode,
          title: editTitle,
          credits: editCredits,
          level: editLevel,
          semester_number: editSemester,
          status: editStatus,
          description: editDesc,
          syllabus: editSyllabus,
        }),
      });

      const updated = res.course;
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCourse?.id === updated.id) {
        setSelectedCourse(updated);
      }
      setEditingCourse(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating course');
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.department?.name && c.department.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="courses-view">
      <div className="view-header">
        <div>
          <h2>Courses & Curricula</h2>
          <p>Explore college course catalogues, instructor assignments, and active student enrolments</p>
        </div>
        <div className="view-actions">
          <button className="btn btn-secondary" onClick={fetchCourses} title="Refresh catalog">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canCreateCourse && (
            <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              <span>Create Course</span>
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="courses-toolbar">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by course code, title, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          {user && (
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setViewFilter('all')}
              >
                All Courses
              </button>
              <button
                className={`toggle-btn ${viewFilter === 'my' ? 'active' : ''}`}
                onClick={() => setViewFilter('my')}
              >
                My Enrolled / Taught
              </button>
            </div>
          )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={44} className="empty-state-icon" />
          <h3>No courses found</h3>
          <p>Try adjusting your search filters or create a new course using the action above.</p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((c) => (
            <article key={c.id} className="course-card">
              <div className="course-card-top">
                <div className="course-badges">
                  <span className="card-tag">{c.code}</span>
                  <span className="badge badge-credits">{c.credits} Credits</span>
                </div>
                <span className={`status ${c.status === 'published' ? 'ok' : 'pending'}`}>
                  {c.status}
                </span>
              </div>

              <h3>{c.title}</h3>
              <p className="course-dept">{c.department?.name ?? 'Department General'}</p>
              <p className="course-desc">{c.description || 'Comprehensive curriculum with practical labs.'}</p>

              <div className="course-meta-row">
                <span><GraduationCap size={14} /> Sem {c.semester_number ?? 1}</span>
                <span><Users size={14} /> {c.enrolments_count ?? 0} Enrolled</span>
              </div>

              <div className="course-card-footer">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setSelectedCourse(c)}
                >
                  <FileText size={14} /> Syllabus & Details
                </button>

                {canCreateCourse && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    title="Edit Course"
                    onClick={() => handleOpenEdit(c)}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                )}

                {c.is_enrolled || canCreateCourse ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenLearning(c.id)}
                  >
                    <BookOpen size={13} /> Lessons Player
                  </button>
                ) : user ? (
                  <>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenLearning(c.id)}
                    >
                      <BookOpen size={13} /> Preview Lessons
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleEnroll(c.id)}
                    >
                      Enroll Now
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEnroll(c.id)}
                  >
                    Enroll Now
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="modal-backdrop" onClick={() => setSelectedCourse(null)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="card-tag">{selectedCourse.code}</span>
                <h3>{selectedCourse.title}</h3>
                <small>{selectedCourse.department?.name} · {selectedCourse.credits} Credits · {selectedCourse.level}</small>
              </div>
              <button className="btn-close" onClick={() => setSelectedCourse(null)}><X size={18} /></button>
            </div>

            <div className="course-modal-body">
              <div className="modal-section">
                <h4>Description & Overview</h4>
                <p>{selectedCourse.description || 'No detailed description available.'}</p>
              </div>

              <div className="modal-section">
                <h4>Instructors & Faculty</h4>
                {selectedCourse.instructors && selectedCourse.instructors.length > 0 ? (
                  <div className="instructors-list">
                    {selectedCourse.instructors.map((inst) => (
                      <div key={inst.id} className="instructor-badge">
                        <UserCheck size={15} />
                        <div>
                          <strong>{inst.user?.name ?? 'Faculty Member'}</strong>
                          <small>Role: {inst.role.toUpperCase()}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No instructors assigned yet.</p>
                )}
              </div>

              <div className="modal-section">
                <h4>Curriculum & Syllabus</h4>
                <pre className="syllabus-box">{selectedCourse.syllabus || 'Syllabus topics to be uploaded by instructor.'}</pre>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCourse(null)}>Close</button>
              {canCreateCourse && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    handleOpenEdit(selectedCourse);
                    setSelectedCourse(null);
                  }}
                >
                  <Edit2 size={14} /> Edit Course
                </button>
              )}
              {!selectedCourse.is_enrolled && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleEnroll(selectedCourse.id);
                    setSelectedCourse(null);
                  }}
                >
                  Enroll in this Course
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Create New Course</h3>
                <p>Register a course under a department and specify credits</p>
              </div>
              <button className="btn-close" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateCourse} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Department</label>
                  <select value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)} required>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Programme (Optional)</label>
                  <select value={newProgId} onChange={(e) => setNewProgId(e.target.value)}>
                    <option value="">General Department Course</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Course Code</label>
                  <input
                    required
                    placeholder="e.g. CS101, MATH201"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label>Course Title</label>
                  <input
                    required
                    placeholder="e.g. Data Structures and Algorithms"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newCredits}
                    onChange={(e) => setNewCredits(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)}>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Diploma">Diploma</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newSemester}
                    onChange={(e) => setNewSemester(parseInt(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as 'draft' | 'published')}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of course topics and prerequisites..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Syllabus Units & Structure</label>
                <textarea
                  rows={4}
                  placeholder="Unit 1: Fundamentals...&#10;Unit 2: Core Concepts...&#10;Unit 3: Applications..."
                  value={newSyllabus}
                  onChange={(e) => setNewSyllabus(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Save & Publish Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="modal-backdrop" onClick={() => setEditingCourse(null)}>
          <div className="modal-dialog modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit Course: {editingCourse.code}</h3>
                <p>Modify course information, credits, syllabus, and publication status</p>
              </div>
              <button className="btn-close" onClick={() => setEditingCourse(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateCourse} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Department</label>
                  <select value={editDeptId} onChange={(e) => setEditDeptId(e.target.value)}>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Programme (Optional)</label>
                  <select value={editProgId} onChange={(e) => setEditProgId(e.target.value)}>
                    <option value="">General Department Course</option>
                    {programmes.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Course Code</label>
                  <input
                    required
                    placeholder="e.g. CS101, MATH201"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label>Course Title</label>
                  <input
                    required
                    placeholder="e.g. Data Structures and Algorithms"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editCredits}
                    onChange={(e) => setEditCredits(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select value={editLevel} onChange={(e) => setEditLevel(e.target.value)}>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={editSemester}
                    onChange={(e) => setEditSemester(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'draft' | 'published' | 'archived')}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of course topics and prerequisites..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Syllabus Units & Structure</label>
                <textarea
                  rows={4}
                  placeholder="Unit 1: Fundamentals...&#10;Unit 2: Core Concepts...&#10;Unit 3: Applications..."
                  value={editSyllabus}
                  onChange={(e) => setEditSyllabus(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
