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
