export interface StudentAnalytics {
  student_name: string;
  student_email: string;
  summary: {
    enrolled_courses_count: number;
    overall_progress_percentage: number;
    overall_attendance_percentage: number;
    has_attendance_shortage: boolean;
    overall_exam_average: number | null;
    certificates_earned_count: number;
  };
  courses: Array<{
    course_id: string;
    course_code: string;
    course_title: string;
    credits: number;
    department?: string;
    progress_percentage: number;
    completed_lessons: number;
    total_lessons: number;
    attendance_percentage: number;
    has_attendance_shortage: boolean;
    exam_average: number | null;
    assignment_average: number | null;
    has_certificate: boolean;
  }>;
  recent_exam_scores: Array<{
    exam_title: string;
    course_code: string;
    score: number;
    percentage: number;
    is_passed: boolean;
    date?: string;
  }>;
}

export interface CourseAnalytics {
  course: {
    id: string;
    code: string;
    title: string;
    credits: number;
  };
  metrics: {
    total_enrolled: number;
    average_attendance: number;
    average_progress: number;
    average_exam_score: number | null;
    at_risk_count: number;
  };
  grade_distribution: Record<string, number>;
  at_risk_students: Array<{
    student_id: string;
    student_name: string;
    student_email: string;
    attendance_percentage: number;
    has_shortage: boolean;
    exam_percentage: number | null;
    progress_percentage: number;
    reason: string;
  }>;
  lesson_engagement: Array<{
    id: string;
    title: string;
    completed_count: number;
    completion_percentage: number;
  }>;
  roster: Array<{
    student_id: string;
    name: string;
    email: string;
    progress_percentage: number;
    attendance_percentage: number;
    exam_score: number | null;
  }>;
}

export interface AdminAnalytics {
  overview: {
    total_students: number;
    total_teachers: number;
    total_courses: number;
    total_departments: number;
    total_certificates_issued: number;
    college_attendance_rate: number;
    college_exam_pass_rate: number;
    college_exam_average: number | null;
  };
  departments: Array<{
    id: string;
    code: string;
    name: string;
    courses_count: number;
    active_enrolments: number;
  }>;
}
