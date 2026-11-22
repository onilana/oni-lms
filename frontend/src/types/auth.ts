export interface Role {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface TeacherProfileInfo {
  id?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  employee_id_number?: string;
  designation?: string;
  qualification?: string;
}

export interface StudentProfileInfo {
  id?: string;
  programme_id?: string;
  programme_name?: string;
  batch_id?: string;
  batch_name?: string;
  student_id_number?: string;
  current_semester?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  email_verified_at?: string;
  last_login_at?: string;
  roles: Role[];
  permissions: string[];
  teacher_profile?: TeacherProfileInfo | null;
  student_profile?: StudentProfileInfo | null;
  enrolled_courses_count?: number;
  taught_courses_count?: number;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: User;
}

export interface HealthStatus {
  success: boolean;
  service: string;
  checks: Record<string, string>;
}
