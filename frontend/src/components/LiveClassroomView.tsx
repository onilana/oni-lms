import React, { useState, useEffect } from 'react';
import {
  Video,
  Radio,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  Plus,
  Bell,
  Megaphone,
  Pin,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  Copy,
  Lock,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { LiveSession, Announcement, InAppNotification } from '../types/communication';
import { Course } from '../types/course';
import { User as AuthUser } from '../types/auth';

interface LiveClassroomViewProps {
  currentUser: AuthUser | null;
  courses?: Course[];
}

export const LiveClassroomView: React.FC<LiveClassroomViewProps> = ({ currentUser, courses: initialCourses }) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses || []);
  const [activeTab, setActiveTab] = useState<'live_classes' | 'announcements' | 'notifications'>('live_classes');

  // Live Sessions State
  const [upcomingSessions, setUpcomingSessions] = useState<LiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [joiningSession, setJoiningSession] = useState<LiveSession | null>(null);
  const [joinResult, setJoinResult] = useState<{ meeting_url: string; passcode?: string; meeting_id?: string } | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Schedule Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [scheduleCourseId, setScheduleCourseId] = useState<string>('');
  const [scheduleTitle, setScheduleTitle] = useState<string>('');
  const [scheduleDescription, setScheduleDescription] = useState<string>('');
  const [scheduleProvider, setScheduleProvider] = useState<'jitsi' | 'zoom' | 'google_meet' | 'teams' | 'custom'>('jitsi');
  const [scheduleMeetingUrl, setScheduleMeetingUrl] = useState<string>('');
  const [scheduleStart, setScheduleStart] = useState<string>('');
  const [scheduleEnd, setScheduleEnd] = useState<string>('');
  const [scheduleLinkAttendance, setScheduleLinkAttendance] = useState<boolean>(true);
  const [isScheduling, setIsScheduling] = useState<boolean>(false);

  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState<boolean>(false);
  const [isPostNoticeOpen, setIsPostNoticeOpen] = useState<boolean>(false);
  const [noticeTitle, setNoticeTitle] = useState<string>('');
  const [noticeContent, setNoticeContent] = useState<string>('');
  const [noticeCourseId, setNoticeCourseId] = useState<string>('');
  const [noticePriority, setNoticePriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [noticePinned, setNoticePinned] = useState<boolean>(false);
  const [isPostingNotice, setIsPostingNotice] = useState<boolean>(false);

  // Notifications State
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isStaff = currentUser?.roles?.some(r =>
    ['teacher', 'dept_admin', 'college_admin', 'super_admin'].includes(r.name)
  );

  useEffect(() => {
    if (!initialCourses || initialCourses.length === 0) {
      apiRequest<{ data?: Course[]; courses?: Course[] }>('/courses')
        .then(res => {
          const courseList = res.data || res.courses || [];
          setCourses(courseList);
          if (courseList.length > 0 && !scheduleCourseId) {
            setScheduleCourseId(courseList[0].id);
          }
        })
        .catch(() => {});
    } else if (initialCourses.length > 0 && !scheduleCourseId) {
      setScheduleCourseId(initialCourses[0].id);
    }
  }, [initialCourses]);

  useEffect(() => {
    if (activeTab === 'live_classes') {
      loadUpcomingSessions();
    } else if (activeTab === 'announcements') {
      loadAnnouncements();
    } else if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab]);

  const loadUpcomingSessions = async () => {
    setLoadingSessions(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: LiveSession[] }>('/live-sessions/upcoming');
      setUpcomingSessions(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load upcoming live classes.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadAnnouncements = async () => {
    setLoadingAnnouncements(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: Announcement[] }>('/announcements');
      setAnnouncements(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    setError(null);
    try {
      const res = await apiRequest<{ unread_count: number; data: InAppNotification[] }>('/notifications');
      setNotifications(res.data || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleJoinClass = async (session: LiveSession) => {
    setIsJoining(true);
    setError(null);
    setJoiningSession(session);
    setJoinResult(null);
    try {
      const res = await apiRequest<{ message: string; meeting_url: string; passcode?: string; meeting_id?: string }>(
        `/live-sessions/${session.id}/join`,
        { method: 'POST' }
      );
      setJoinResult(res);
    } catch (err: any) {
      setError(err.message || 'Unable to join live classroom.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleCourseId || !scheduleTitle.trim() || !scheduleStart || !scheduleEnd) {
      setError('Please fill in all required class schedule details.');
      return;
    }
    setIsScheduling(true);
    setError(null);
    try {
      await apiRequest(`/courses/${scheduleCourseId}/live-sessions`, {
        method: 'POST',
        body: JSON.stringify({
          title: scheduleTitle,
          description: scheduleDescription,
          provider: scheduleProvider,
          meeting_url: scheduleMeetingUrl || undefined,
          scheduled_start_at: scheduleStart,
          scheduled_end_at: scheduleEnd,
          link_attendance: scheduleLinkAttendance,
        }),
      });
      setSuccessMsg('Live classroom session scheduled and students notified!');
      setIsScheduleOpen(false);
      setScheduleTitle('');
      setScheduleDescription('');
      loadUpcomingSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule live class.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handlePostNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      setError('Please provide a title and content for the announcement.');
      return;
    }
    setIsPostingNotice(true);
    setError(null);
    try {
      await apiRequest('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: noticeTitle,
          content: noticeContent,
          course_id: noticeCourseId || null,
          priority: noticePriority,
          is_pinned: noticePinned,
        }),
      });
      setSuccessMsg('Announcement published successfully.');
      setIsPostNoticeOpen(false);
      setNoticeTitle('');
      setNoticeContent('');
      loadAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to publish announcement.');
    } finally {
      setIsPostingNotice(false);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await apiRequest(`/notifications/${notifId}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  const liveNowSessions = upcomingSessions.filter(s => s.status === 'live');
  const futureSessions = upcomingSessions.filter(s => s.status === 'scheduled');

  return (
    <div className="communication-workspace">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <span className="badge badge-accent">Milestone 10 &bull; Real-time Engagement</span>
          <h1 className="section-title">Communication &amp; Live Classroom</h1>
          <p className="section-subtitle">
            Virtual live lectures, multi-provider meeting adapters (Jitsi, Zoom, Meet, Teams), server-gated access control, campus announcements, and activity dispatch.
          </p>
        </div>
        <div className="header-actions">
          {isStaff && (
            <>
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={18} />
                <span>Schedule Live Class</span>
              </button>
              <button
                onClick={() => setIsPostNoticeOpen(true)}
                className="btn btn-secondary"
              >
                <Megaphone size={18} />
                <span>Post Notice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'live_classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_classes')}
        >
          <Radio size={18} className={liveNowSessions.length > 0 ? 'text-danger pulse-dot' : ''} />
          <span>
            Live Classes
            {liveNowSessions.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 6 }}>
                🔴 {liveNowSessions.length} LIVE
              </span>
            )}
          </span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <Megaphone size={18} />
          <span>Announcements &amp; Bulletins ({announcements.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} />
          <span>
            Notifications
            {unreadCount > 0 && (
              <span className="badge badge-accent" style={{ marginLeft: 6 }}>
                {unreadCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: LIVE CLASSES */}
      {activeTab === 'live_classes' && (
        <div className="live-classes-tab">
          {/* Active Live Now Banner */}
          {liveNowSessions.length > 0 && (
            <div className="live-now-banner">
              <div className="live-beacon">
                <span className="pulsing-beacon" />
                <span className="live-tag">HAPPENING NOW</span>
              </div>
              {liveNowSessions.map(session => (
                <div key={session.id} className="live-now-card">
                  <div className="live-now-info">
                    <span className="course-code-pill">{session.course?.code ?? 'N/A'}</span>
                    <h3 className="live-session-title">{session.title}</h3>
                    <p className="live-session-desc">{session.description}</p>
                    <div className="live-session-meta">
                      <span><strong>Instructor:</strong> {session.instructor?.name ?? 'Instructor'}</span>
                      <span>&bull;</span>
                      <span><strong>Provider:</strong> {(session.provider || 'jitsi').toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="live-now-action">
                    <button
                      className="btn btn-danger btn-lg"
                      onClick={() => handleJoinClass(session)}
                    >
                      <Video size={20} />
                      <span>Join Live Classroom</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Schedule List */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header-row">
              <h3>Upcoming Live Classroom Sessions</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={loadUpcomingSessions}
                title="Refresh schedule"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingSessions ? (
              <div className="empty-state">
                <RefreshCw className="animate-spin" size={32} />
                <p>Retrieving virtual classroom calendar...</p>
              </div>
            ) : futureSessions.length === 0 && liveNowSessions.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} className="text-muted" />
                <h4>No Live Classes Currently Scheduled</h4>
                <p>When instructors schedule interactive video lectures or office hours, they will appear here with instant join links.</p>
              </div>
            ) : (
              <div className="schedule-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Class Session &amp; Course</th>
                      <th>Instructor</th>
                      <th>Date &amp; Time</th>
                      <th>Provider</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingSessions.map(session => (
                      <tr key={session.id}>
                        <td>
                          {session.status === 'live' ? (
                            <span className="badge badge-danger">🔴 Live Now</span>
                          ) : (
                            <span className="badge badge-role">Scheduled</span>
                          )}
                        </td>
                        <td>
                          <strong>{session.course?.code ?? 'N/A'}</strong>: {session.title}
                          {session.description && (
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                              {session.description}
                            </div>
                          )}
                        </td>
                        <td>{session.instructor?.name ?? 'Instructor'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{new Date(session.scheduled_start_at).toLocaleDateString()}</span>
                            <small className="text-muted">
                              {new Date(session.scheduled_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &mdash; {new Date(session.scheduled_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="provider-tag">{session.provider}</span>
                        </td>
                        <td>
                          {session.status === 'live' || session.is_joinable ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleJoinClass(session)}
                            >
                              <Video size={14} />
                              <span>Join Room</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline btn-sm"
                              disabled
                              title="Room opens 15 minutes before scheduled start"
                            >
                              <Lock size={14} />
                              <span>Locked</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="announcements-tab">
          {loadingAnnouncements ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Fetching campus notices...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="empty-state card">
              <Megaphone size={48} className="text-muted" />
              <h3>No Announcements Yet</h3>
              <p>Campus bulletins, course updates, and schedule notices will appear here.</p>
            </div>
          ) : (
            <div className="announcements-grid">
              {announcements.map(notice => (
                <div
                  key={notice.id}
                  className={`card announcement-card ${notice.is_pinned ? 'pinned-notice' : ''} priority-${notice.priority}`}
                >
                  <div className="announcement-top">
                    <div className="announcement-tags">
                      {notice.is_pinned && (
                        <span className="badge badge-accent">
                          <Pin size={12} style={{ marginRight: 4 }} /> Pinned Notice
                        </span>
                      )}
                      <span className={`badge badge-priority-${notice.priority}`}>
                        {notice.priority.toUpperCase()}
                      </span>
                      {notice.course ? (
                        <span className="badge badge-role">{notice.course.code}</span>
                      ) : (
                        <span className="badge badge-role">Campus-wide</span>
                      )}
                    </div>
                    <span className="announcement-date">
                      {new Date(notice.published_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="announcement-title">{notice.title}</h3>
                  <div className="announcement-body">{notice.content}</div>

                  <div className="announcement-footer">
                    <span className="author-tag">Posted by: {notice.author?.name ?? 'Faculty/Staff'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="notifications-tab card">
          <div className="card-header-row">
            <div>
              <h3>Institutional Activity Feed</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Real-time alerts for live classes, grading releases, and deadlines.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleMarkAllRead}
              >
                <CheckCircle size={14} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {loadingNotifications ? (
            <div className="empty-state">
              <RefreshCw className="animate-spin" size={32} />
              <p>Loading notification feed...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={48} className="text-muted" />
              <h4>Inbox Zero</h4>
              <p>You are completely caught up on all academic notifications.</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                >
                  <div className="notif-icon">
                    {n.type === 'live_class' ? (
                      <Video size={20} color="#dc2626" />
                    ) : n.type === 'announcement' ? (
                      <Megaphone size={20} color="#0284c7" />
                    ) : (
                      <Bell size={20} color="#eab308" />
                    )}
                  </div>
                  <div className="notif-content">
                    <div className="notif-header">
                      <strong>{n.title}</strong>
                      <span className="notif-time">{n.time_ago || new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="notif-message">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      className="btn-mark-read"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      title="Mark as read"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOIN LIVE CLASSROOM MODAL */}
      {joiningSession && (
        <div className="modal-overlay" onClick={() => setJoiningSession(null)}>
          <div className="modal-content join-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Video size={24} color="#dc2626" />
                <div>
                  <h3 style={{ margin: 0 }}>Join Live Classroom</h3>
                  <small className="text-muted">{joiningSession.course?.code ?? 'Course'}: {joiningSession.title}</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setJoiningSession(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="join-modal-body" style={{ padding: '20px 0' }}>
              {isJoining ? (
                <div className="empty-state">
                  <RefreshCw className="animate-spin" size={32} />
                  <p>Authenticating institutional student credentials with meeting server...</p>
                </div>
              ) : joinResult ? (
                <div className="join-credentials-box">
                  <div className="alert alert-success" style={{ marginBottom: 16 }}>
                    <ShieldCheck size={20} />
                    <span>Enrolment verified. Attendance has been logged for this session.</span>
                  </div>

                  <div className="credential-row">
                    <span className="cred-label">Meeting URL:</span>
                    <a
                      href={joinResult.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cred-link"
                    >
                      {joinResult.meeting_url}
                      <ExternalLink size={14} style={{ marginLeft: 4 }} />
                    </a>
                  </div>

                  {joinResult.meeting_id && (
                    <div className="credential-row">
                      <span className="cred-label">Meeting ID:</span>
                      <strong className="code-text">{joinResult.meeting_id}</strong>
                    </div>
                  )}

                  {joinResult.passcode && (
                    <div className="credential-row">
                      <span className="cred-label">Room Passcode:</span>
                      <strong className="code-text">{joinResult.passcode}</strong>
                    </div>
                  )}

                  <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <a
                      href={joinResult.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-lg btn-block"
                      style={{ textAlign: 'center' }}
                    >
                      <Video size={18} />
                      <span>Launch Virtual Meeting Room</span>
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE LIVE CLASS MODAL (TEACHER / ADMIN) */}
      {isScheduleOpen && (
        <div className="modal-overlay" onClick={() => setIsScheduleOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule Live Classroom Lecture</h3>
              <button className="btn-close" onClick={() => setIsScheduleOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="modal-form">
              <div className="form-group">
                <label>Course:</label>
                <select
                  value={scheduleCourseId}
                  onChange={e => setScheduleCourseId(e.target.value)}
                  className="form-control"
                  required
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} &mdash; {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Session Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Graph Traversal & Dijkstra Algorithm"
                  value={scheduleTitle}
                  onChange={e => setScheduleTitle(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description &amp; Agenda:</label>
                <textarea
                  placeholder="Topics covered, preparation requirements, Q&A"
                  value={scheduleDescription}
                  onChange={e => setScheduleDescription(e.target.value)}
                  className="form-control"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Meeting Provider:</label>
                  <select
                    value={scheduleProvider}
                    onChange={e => setScheduleProvider(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="jitsi">Jitsi Meet (Self-hosted / Instant Room)</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="custom">Custom Room URL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Custom Room URL (Optional):</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={scheduleMeetingUrl}
                    onChange={e => setScheduleMeetingUrl(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date &amp; Time:</label>
                  <input
                    type="datetime-local"
                    value={scheduleStart}
                    onChange={e => setScheduleStart(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date &amp; Time:</label>
                  <input
                    type="datetime-local"
                    value={scheduleEnd}
                    onChange={e => setScheduleEnd(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: '1rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleLinkAttendance}
                    onChange={e => setScheduleLinkAttendance(e.target.checked)}
                  />
                  <span>Automatically log attendance session when students join this live room</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsScheduleOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isScheduling}
                >
                  {isScheduling ? 'Scheduling...' : 'Publish Live Classroom Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST ANNOUNCEMENT MODAL */}
      {isPostNoticeOpen && (
        <div className="modal-overlay" onClick={() => setIsPostNoticeOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Publish Academic Announcement</h3>
              <button className="btn-close" onClick={() => setIsPostNoticeOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostNoticeSubmit} className="modal-form">
              <div className="form-group">
                <label>Scope:</label>
                <select
                  value={noticeCourseId}
                  onChange={e => setNoticeCourseId(e.target.value)}
                  className="form-control"
                >
                  <option value="">Campus-Wide (All students &amp; faculty)</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>Course: {c.code} &mdash; {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notice Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Semester Schedule Update"
                  value={noticeTitle}
                  onChange={e => setNoticeTitle(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label>Content:</label>
                <textarea
                  placeholder="Enter detailed notice content..."
                  value={noticeContent}
                  onChange={e => setNoticeContent(e.target.value)}
                  className="form-control"
                  rows={4}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority:</label>
                  <select
                    value={noticePriority}
                    onChange={e => setNoticePriority(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={noticePinned}
                      onChange={e => setNoticePinned(e.target.checked)}
                    />
                    <span>Pin to top of notice board</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsPostNoticeOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPostingNotice}
                >
                  {isPostingNotice ? 'Publishing...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
