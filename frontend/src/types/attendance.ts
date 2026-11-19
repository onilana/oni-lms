export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  attendance_session_id: string;
  student_user_id: string;
  student_name?: string;
  student_email?: string;
  status: AttendanceStatus;
  remarks?: string | null;
  marked_by?: string | null;
  created_at?: string;
}

export interface AttendanceSessionSummary {
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: string;
  start_time?: string | null;
  end_time?: string | null;
  topic?: string | null;
  room?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  summary?: AttendanceSessionSummary;
  my_record?: {
    id: string;
    status: AttendanceStatus;
    remarks?: string | null;
  } | null;
  records?: AttendanceRecord[];
  created_at?: string;
}

export interface CourseAttendanceStats {
  total_sessions: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  percentage: number;
  has_shortage: boolean;
}

export interface StudentCourseAttendance {
  course_id: string;
  code: string;
  title: string;
  department?: string;
  stats: CourseAttendanceStats;
  recent_sessions: Array<{
    date: string;
    topic?: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface MyAttendanceSummary {
  overall_percentage: number;
  has_shortage: boolean;
  courses: StudentCourseAttendance[];
}
