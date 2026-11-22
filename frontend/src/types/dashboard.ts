export interface StudentProfileInfo {
  name: string;
  email: string;
  student_id: string;
  department: string;
  programme: string;
  batch: string;
  current_semester: number;
  academic_session: string;
  status: string;
}

export interface StudentMetrics {
  enrolled_courses_count: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  overall_progress_percentage: number;
  pending_assignments_count: number;
  completed_exams_count: number;
  attendance_percentage: number;
}

export interface NextLessonInfo {
  id: string;
  title: string;
  type: string;
  duration?: number | null;
}

export interface StudentCourseCard {
  id: string;
  code: string;
  title: string;
  credits: number;
  department_code?: string;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  next_lesson?: NextLessonInfo | null;
}

export interface UpcomingDeadlineItem {
  type: 'assignment' | 'exam';
  id: string;
  course_id: string;
  course_code: string;
  title: string;
  due_date?: string | null;
  is_past_due?: boolean;
  max_score?: number;
  is_submitted?: boolean;
  submission_status?: string;
  grade?: number | null;
}

export interface StudentExamSummary {
  id: string;
  course_id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
  passing_percentage: number;
  is_open: boolean;
  has_active_attempt: boolean;
  latest_attempt?: {
    id: string;
    status: string;
    score: number;
    percentage: number;
    is_passed: boolean;
  } | null;
}

export interface RecentGradeItem {
  type: 'assignment' | 'exam';
  title: string;
  course_code: string;
  score: number;
  max_score: number;
  percentage?: number;
  is_passed?: boolean;
  feedback?: string | null;
  graded_at?: string | null;
}

export interface StudentDashboardData {
  student: StudentProfileInfo;
  metrics: StudentMetrics;
  enrolled_courses: StudentCourseCard[];
  upcoming_deadlines: UpcomingDeadlineItem[];
  exams: StudentExamSummary[];
  recent_grades: RecentGradeItem[];
}

// ======================== TEACHER DASHBOARD ========================

export interface TeacherProfileInfo {
  name: string;
  email: string;
  employee_id: string;
  department: string;
  designation: string;
  qualification: string;
  status: string;
}

export interface TeacherMetrics {
  active_courses_count: number;
  total_students_count: number;
  pending_evaluations_count: number;
  upcoming_live_sessions_count: number;
  total_assignments_count: number;
  total_exams_count: number;
  average_attendance_percentage: number;
}

export interface TeacherCourseSummary {
  id: string;
  code: string;
  title: string;
  credits: number;
  department_code: string;
  enrolled_students_count: number;
  lessons_count: number;
  assignments_count: number;
  exams_count: number;
  status: string;
}

export interface PendingEvaluationItem {
  id: string;
  assignment_id: string;
  assignment_title: string;
  course_code: string;
  student_name: string;
  student_id: string;
  submitted_at: string;
  max_score: number;
}

export interface UpcomingLiveSessionItem {
  id: string;
  course_id: string;
  course_title: string;
  course_code: string;
  title: string;
  provider: string;
  scheduled_start: string;
  duration_minutes: number;
  status: string;
  join_url?: string;
}

export interface TeacherDashboardData {
  teacher: TeacherProfileInfo;
  metrics: TeacherMetrics;
  teaching_courses: TeacherCourseSummary[];
  pending_evaluations: PendingEvaluationItem[];
  upcoming_live_sessions: UpcomingLiveSessionItem[];
}

// ===================== DEPARTMENT / HOD DASHBOARD =====================

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  hod_name: string;
  status: string;
}

export interface DepartmentMetrics {
  programmes_count: number;
  faculty_count: number;
  enrolled_students_count: number;
  courses_offered_count: number;
  average_attendance_percentage: number;
  average_pass_rate_percentage: number;
}

export interface FacultyWorkloadItem {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  designation?: string;
  courses_count: number;
}

export interface DepartmentCourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester_number: number;
  status: string;
  enrolled_count: number;
}

export interface DepartmentProgrammeItem {
  id: string;
  code: string;
  name: string;
  degree: string;
  duration_years: number;
  batches_count: number;
}

export interface DepartmentDashboardData {
  department: DepartmentInfo;
  metrics: DepartmentMetrics;
  programmes: DepartmentProgrammeItem[];
  faculty_workloads: FacultyWorkloadItem[];
  courses: DepartmentCourseItem[];
}

// ======================== ADMIN DASHBOARD ========================

export interface CollegeInfo {
  name: string;
  code: string;
  domain: string;
  academic_session: string;
  system_version: string;
}

export interface AdminMetrics {
  total_students: number;
  total_faculty: number;
  total_departments: number;
  total_courses: number;
  total_enrollments: number;
  certificates_issued: number;
  attendance_sessions: number;
  overall_attendance_rate: number;
}

export interface SystemHealthInfo {
  application: string;
  database: string;
  redis: string;
  storage: string;
  php_version: string;
  laravel_version: string;
}

export interface RoleDistributionItem {
  name: string;
  label: string;
  users_count: number;
}

export interface RecentAuditLogItem {
  id: string;
  action: string;
  auditable_type: string;
  user_name: string;
  ip_address: string;
  created_at: string;
}

export interface LatestBackupInfo {
  filename: string;
  size: string;
  created_at: string;
  status: string;
}

export interface AdminDashboardData {
  college: CollegeInfo;
  metrics: AdminMetrics;
  system_health: SystemHealthInfo;
  roles_distribution: RoleDistributionItem[];
  recent_audit_logs: RecentAuditLogItem[];
  latest_backup?: LatestBackupInfo | null;
}
