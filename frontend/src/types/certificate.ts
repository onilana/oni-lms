export interface Certificate {
  id: string;
  certificate_code: string;
  title: string;
  grade: string | null;
  final_score: number | null;
  attendance_percentage: number | null;
  lessons_completed_count: number;
  issued_at: string;
  is_revoked: boolean;
  revoked_at: string | null;
  revocation_reason: string | null;
  student: {
    id?: string;
    name?: string;
    email?: string;
  };
  course: {
    id?: string;
    code?: string;
    title?: string;
    credits?: number;
  };
  issuer: {
    id?: string;
    name?: string;
  } | null;
  metadata?: {
    institution_name?: string;
    issuer_name?: string;
    signatory_role?: string;
    department?: string;
    programme?: string;
    student_name?: string;
    course_title?: string;
    [key: string]: any;
  };
  verification_url: string;
  created_at?: string;
}

export interface CertificateEligibility {
  eligible: boolean;
  is_enrolled: boolean;
  lessons: {
    total: number;
    completed: number;
    percentage: number;
    passed: boolean;
  };
  attendance: {
    total_sessions: number;
    percentage: number;
    required_percentage: number;
    has_shortage: boolean;
    passed: boolean;
  };
  exams: {
    total: number;
    passed: number;
    average_score: number | null;
    passed_all: boolean;
  };
  existing_certificate?: Certificate | null;
  reasons: string[];
}

export interface CertificateVerificationResult {
  valid: boolean;
  certificate_code?: string;
  title?: string;
  student_name?: string;
  course_title?: string;
  course_code?: string;
  credits?: number;
  issued_at?: string;
  grade?: string;
  final_score?: number | null;
  institution_name?: string;
  is_revoked?: boolean;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  message?: string;
}
