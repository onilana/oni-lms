export interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  provider: 'jitsi' | 'zoom' | 'google_meet' | 'teams' | 'custom';
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduled_start_at: string;
  scheduled_end_at: string;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  recording_url: string | null;
  settings?: Record<string, any>;
  is_joinable: boolean;
  can_access: boolean;
  meeting_url: string | null;
  meeting_id: string | null;
  passcode: string | null;
  course: {
    id: string;
    code: string;
    title: string;
  };
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  published_at: string;
  scope: 'course' | 'department' | 'campus';
  course?: {
    id: string;
    code: string;
    title: string;
  } | null;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
  author: {
    id: string;
    name: string;
  };
  created_at?: string;
}

export interface InAppNotification {
  id: string;
  type: 'live_class' | 'announcement' | 'assignment_due' | 'exam_scheduled' | 'grade_posted' | 'system';
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  data?: Record<string, any>;
  created_at: string;
  time_ago?: string;
}
