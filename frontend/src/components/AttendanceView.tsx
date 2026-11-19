import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Clock,
  Edit,
  GraduationCap,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  UserCheck,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { apiRequest } from '../api/client';
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  MyAttendanceSummary
} from '../types/attendance';
import type { Course } from '../types/course';
import { useAuth } from '../context/AuthContext';

export const AttendanceView: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const isTeacherOrAdmin =
    hasRole('teacher') ||
    hasRole('super_admin') ||
    hasRole('college_admin') ||
    hasRole('dept_admin') ||
    hasPermission('attendance.mark');

  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student mode state
  const [studentSummary, setStudentSummary] = useState<MyAttendanceSummary | null>(null);

  // Teacher mode state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'summary'>('sessions');

  // Course summary roster
  const [courseSummaryRoster, setCourseSummaryRoster] = useState<any[]>([]);

  // Create session modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [topic, setTopic] = useState('');
  const [room, setRoom] = useState('Hall 3B');

  // Active roster marking modal
  const [markingSession, setMarkingSession] = useState<AttendanceSession | null>(null);
  const [rosterDraft, setRosterDraft] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [savingRoster, setSavingRoster] = useState(false);

  useEffect(() => {
    if (isTeacherOrAdmin) {
      loadCourses();
    } else {
      loadStudentAttendance();
    }
  }, [isTeacherOrAdmin]);

  // Load courses for staff
  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ data: Course[] }>('/courses');
      setCourses(res.data);
      if (res.data.length > 0) {
        setSelectedCourseId(res.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  // Load sessions when course selected
  useEffect(() => {
    if (selectedCourseId && isTeacherOrAdmin) {
      loadSessions(selectedCourseId);
      loadCourseSummary(selectedCourseId);
    }
  }, [selectedCourseId, isTeacherOrAdmin]);

  const loadSessions = async (courseId: string) => {
    try {
      const res = await apiRequest<{ data: AttendanceSession[] }>(`/courses/${courseId}/attendance/sessions`);
      setSessions(res.data);
    } catch (err: any) {
      console.error('Failed to load sessions', err);
    }
  };

  const loadCourseSummary = async (courseId: string) => {
    try {
      const res = await apiRequest<{ students: any[] }>(`/courses/${courseId}/attendance/summary`);
      setCourseSummaryRoster(res.students);
    } catch (err: any) {
      console.error('Failed to load summary', err);
    }
  };

  // Load student attendance
  const loadStudentAttendance = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<MyAttendanceSummary>('/my-attendance');
      setStudentSummary(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load your attendance record');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    try {
      await apiRequest(`/courses/${selectedCourseId}/attendance/sessions`, {
        method: 'POST',
        body: JSON.stringify({
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          topic,
          room,
          status: 'completed',
        }),
      });

      setIsCreateOpen(false);
      setTopic('');
      loadSessions(selectedCourseId);
      loadCourseSummary(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to create session');
    }
  };

  const openMarkingModal = async (session: AttendanceSession) => {
    try {
      const res = await apiRequest<{ data: AttendanceSession }>(`/attendance/sessions/${session.id}`);
      const s = res.data;
      setMarkingSession(s);

      // Prepopulate draft roster
      const draft: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      s.records?.forEach((r) => {
        draft[r.student_user_id] = {
          status: r.status,
          remarks: r.remarks || '',
        };
      });
      setRosterDraft(draft);
    } catch (err: any) {
      alert(err.message || 'Could not open session roster');
    }
  };

  const handleMarkAllPresent = () => {
    if (!markingSession?.records) return;
    setRosterDraft((prev) => {
      const updated = { ...prev };
      markingSession.records?.forEach((r) => {
        updated[r.student_user_id] = {
          status: 'present',
          remarks: prev[r.student_user_id]?.remarks || '',
        };
      });
      return updated;
    });
  };

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRosterDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const setStudentRemarks = (studentId: string, remarks: string) => {
    setRosterDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleSaveRoster = async () => {
    if (!markingSession) return;

    const recordsArray = Object.keys(rosterDraft).map((studentId) => ({
      student_user_id: studentId,
      status: rosterDraft[studentId].status,
      remarks: rosterDraft[studentId].remarks || null,
    }));

    try {
      setSavingRoster(true);
      await apiRequest(`/attendance/sessions/${markingSession.id}/bulk-mark`, {
        method: 'POST',
        body: JSON.stringify({ records: recordsArray }),
      });

      setMarkingSession(null);
      loadSessions(selectedCourseId);
      loadCourseSummary(selectedCourseId);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance roster');
    } finally {
      setSavingRoster(false);
    }
  };

  // Render Student Attendance View
  if (!isTeacherOrAdmin) {
    if (loading) {
      return (
        <div className="dashboard-loading-state">
          <RefreshCw size={24} className="spinning" />
          <p>Loading attendance record...</p>
        </div>
      );
    }

    if (!studentSummary) {
      return (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>No attendance records available.</span>
        </div>
      );
    }

    return (
      <div className="attendance-view student-mode">
        {/* Top summary card */}
        <div className={`attendance-hero-card ${studentSummary.has_shortage ? 'shortage' : 'good'}`}>
          <div className="hero-left">
            <div className="hero-pct-badge">
              <strong>{studentSummary.overall_percentage}%</strong>
              <small>OVERALL</small>
            </div>
            <div>
              <h3>Cumulative Academic Attendance</h3>
              <p>
                {studentSummary.has_shortage
                  ? 'Attendance Alert: Your attendance is below the 75% college minimum prerequisite.'
                  : 'Great job! Your attendance is in full compliance with the 75% college minimum standard.'}
              </p>
            </div>
          </div>

          <div className="hero-right">
            <span className={`compliance-tag ${studentSummary.has_shortage ? 'danger' : 'success'}`}>
              {studentSummary.has_shortage ? (
                <>
                  <AlertTriangle size={15} /> Shortage Warning (&lt;75%)
                </>
              ) : (
                <>
                  <CheckCircle size={15} /> Quota Satisfied (≥75%)
                </>
              )}
            </span>
          </div>
        </div>

        {/* Course breakdown cards */}
        <div className="section-header" style={{ marginTop: '24px' }}>
          <div>
            <h3>Course Attendance Breakdown</h3>
            <p>Session-by-session compliance for your enrolled courses</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadStudentAttendance}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="student-courses-att-grid">
          {studentSummary.courses.map((c) => (
            <div key={c.course_id} className="course-att-card">
              <div className="course-att-header">
                <div>
                  <span className="course-tag">{c.code}</span>
                  <h4>{c.title}</h4>
                </div>
                <div className="att-pct-box">
                  <strong>{c.stats.percentage}%</strong>
                  <small>{c.stats.present + c.stats.late} / {c.stats.total_sessions} Sessions</small>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-track" style={{ margin: '14px 0' }}>
                <div
                  className={`progress-fill ${c.stats.has_shortage ? 'bg-danger' : 'bg-primary'}`}
                  style={{ width: `${c.stats.percentage}%` }}
                />
              </div>

              {/* Stats badges */}
              <div className="att-chips-row">
                <span className="chip-att present">Present: {c.stats.present}</span>
                <span className="chip-att late">Late: {c.stats.late}</span>
                <span className="chip-att absent">Absent: {c.stats.absent}</span>
                {c.stats.excused > 0 && <span className="chip-att excused">Excused: {c.stats.excused}</span>}
              </div>

              {/* Recent sessions log */}
              <div className="recent-sessions-wrap">
                <small className="sub-title">Recent Session Logs:</small>
                {c.recent_sessions.length === 0 ? (
                  <p className="empty-log">No session logs recorded yet.</p>
                ) : (
                  <div className="session-mini-list">
                    {c.recent_sessions.map((sess, idx) => (
                      <div key={idx} className="session-mini-item">
                        <div className="session-mini-date">
                          <Calendar size={13} />
                          <span>{sess.date}</span>
                        </div>
                        <span className="session-mini-topic">{sess.topic || 'Class Session'}</span>
                        <span className={`status-pill ${sess.status}`}>{sess.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Teacher / Staff Mode
  return (
    <div className="attendance-view staff-mode">
      {/* Header bar */}
      <div className="attendance-header">
        <div>
          <h2>Attendance Management</h2>
          <p>Record daily class sessions, check off student rosters, and monitor attendance quotas.</p>
        </div>

        <div className="header-controls">
          <select
            className="form-control"
            style={{ width: '260px' }}
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.title}
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={() => setIsCreateOpen(true)}
            disabled={!selectedCourseId}
          >
            <Plus size={16} /> Record Session
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="attendance-tabs">
        <button
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <CalendarCheck size={16} /> Class Sessions ({sessions.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <Users size={16} /> Student Compliance Roster ({courseSummaryRoster.length})
        </button>
      </div>

      {activeTab === 'sessions' ? (
        /* Sessions Table / Grid */
        sessions.length === 0 ? (
          <div className="empty-player-state">
            <Calendar size={48} strokeWidth={1.2} style={{ color: '#94a3b8', marginBottom: '12px' }} />
            <h3>No Sessions Recorded</h3>
            <p>Click "Record Session" to take attendance for a lecture or laboratory.</p>
          </div>
        ) : (
          <div className="sessions-list-grid">
            {sessions.map((sess) => (
              <div key={sess.id} className="session-card">
                <div className="session-card-header">
                  <div>
                    <span className="session-date-tag">
                      <Calendar size={13} /> {sess.session_date}
                    </span>
                    <h4>{sess.topic || 'Class Lecture'}</h4>
                  </div>
                  <span className={`session-status-badge ${sess.status}`}>
                    {sess.status.toUpperCase()}
                  </span>
                </div>

                <div className="session-meta-row">
                  {sess.start_time && (
                    <span>
                      <Clock size={13} /> {sess.start_time} - {sess.end_time || 'Done'}
                    </span>
                  )}
                  {sess.room && <span>Room: {sess.room}</span>}
                </div>

                {sess.summary && (
                  <div className="session-summary-box">
                    <span className="chip-att present">Present: {sess.summary.present}</span>
                    <span className="chip-att late">Late: {sess.summary.late}</span>
                    <span className="chip-att absent">Absent: {sess.summary.absent}</span>
                  </div>
                )}

                <div className="session-card-actions">
                  <button
                    className="btn btn-secondary btn-block"
                    onClick={() => openMarkingModal(sess)}
                  >
                    <Edit size={14} /> Open Roster & Edit Marks
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Student Compliance Roster Table */
        <div className="summary-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Attendance %</th>
                <th>Total Attended</th>
                <th>Absent</th>
                <th>Excused</th>
                <th>Quota Compliance</th>
              </tr>
            </thead>
            <tbody>
              {courseSummaryRoster.map((item) => (
                <tr key={item.student_id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small style={{ display: 'block', color: '#64748b' }}>{item.email}</small>
                  </td>
                  <td>
                    <strong>{item.metrics.percentage}%</strong>
                  </td>
                  <td>
                    {item.metrics.present + item.metrics.late} of {item.metrics.total_sessions}
                  </td>
                  <td>
                    <span className={item.metrics.absent > 0 ? 'text-danger' : ''}>
                      {item.metrics.absent}
                    </span>
                  </td>
                  <td>{item.metrics.excused}</td>
                  <td>
                    {item.metrics.has_shortage ? (
                      <span className="compliance-tag danger">
                        <AlertTriangle size={13} /> Shortage (&lt;75%)
                      </span>
                    ) : (
                      <span className="compliance-tag success">
                        <CheckCircle size={13} /> Satisfactory
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Record Attendance Session</h3>
              <button className="btn-icon" onClick={() => setIsCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Session Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </div>

                <div className="field-row">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      className="form-control"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Lecture Topic / Session Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Lecture 4: Stacks and Queue Principles"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Classroom / Laboratory</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Hall 3B or Lab 204"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Initialize Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Marking Modal */}
      {markingSession && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '780px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <h3>{markingSession.topic || 'Class Session'}</h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  {markingSession.session_date} · Room: {markingSession.room || 'General Hall'}
                </p>
              </div>
              <button className="btn-icon" onClick={() => setMarkingSession(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto' }}>
              <div className="roster-toolbar">
                <button className="btn btn-secondary btn-sm" onClick={handleMarkAllPresent}>
                  <CheckCircle size={14} className="text-success" /> Mark All as Present
                </button>
                <small className="text-muted">
                  Enrolled Students: <strong>{markingSession.records?.length ?? 0}</strong>
                </small>
              </div>

              <div className="roster-table-wrap">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Attendance Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markingSession.records?.map((record) => {
                      const studentId = record.student_user_id;
                      const currentStatus = rosterDraft[studentId]?.status || 'present';
                      const currentRemarks = rosterDraft[studentId]?.remarks || '';

                      return (
                        <tr key={record.id}>
                          <td>
                            <strong>{record.student_name}</strong>
                            <small style={{ display: 'block', color: '#64748b' }}>
                              {record.student_email}
                            </small>
                          </td>
                          <td>
                            <div className="status-toggle-group">
                              {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  className={`toggle-btn ${st} ${currentStatus === st ? 'active' : ''}`}
                                  onClick={() => setStudentStatus(studentId, st)}
                                >
                                  {st.charAt(0).toUpperCase() + st.slice(1)}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="e.g. Late bus, Medical"
                              value={currentRemarks}
                              onChange={(e) => setStudentRemarks(studentId, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMarkingSession(null)}
                disabled={savingRoster}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRoster}
                disabled={savingRoster}
              >
                <Save size={15} /> {savingRoster ? 'Saving Roster...' : 'Save Attendance Roster'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
