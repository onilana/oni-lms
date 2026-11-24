export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  parent_id?: string | null;
  parent?: {
    id: string;
    name: string;
    code: string;
  } | null;
  sub_departments?: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>;
  programmes_count?: number;
  teachers_count?: number;
  head_of_department?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Programme {
  id: string;
  department_id: string;
  department_name?: string;
  name: string;
  code: string;
  duration_years: number;
  total_semesters: number;
  status: string;
  batches_count?: number;
  students_count?: number;
}

export interface Semester {
  id: string;
  academic_session_id: string;
  name: string;
  semester_number: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export interface AcademicSession {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
  semesters?: Semester[];
}

export interface Batch {
  id: string;
  programme_id: string;
  programme_name?: string;
  programme_code?: string;
  academic_session_id: string;
  academic_session_name?: string;
  name: string;
  code: string;
  max_capacity?: number;
  status: string;
  students_count?: number;
}
