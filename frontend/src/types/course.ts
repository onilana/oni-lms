import type { Department, Programme } from './academic';
import type { User } from './auth';

export interface CourseInstructor {
  id: string;
  role: 'lead' | 'assistant' | 'tutor';
  user?: User;
  academic_session_id?: string;
  created_at?: string;
}

export interface CourseEnrolment {
  id: string;
  course_id: string;
  user?: User;
  academic_session_id: string;
  academic_session_name?: string;
  semester_id?: string;
  semester_name?: string;
  status: 'enrolled' | 'completed' | 'dropped' | 'suspended';
  final_grade?: string;
  enrolled_at: string;
  completed_at?: string;
}

export interface CourseMaterial {
  title: string;
  type: 'pdf' | 'docx' | 'excel' | 'image' | 'video' | 'video_embed';
  url: string;
  name?: string;
  extension?: string;
}

export interface Course {
  id: string;
  department_id: string;
  department?: Department;
  programme_id?: string;
  programme?: Programme;
  code: string;
  title: string;
  description?: string;
  credits: number;
  level: string;
  semester_number?: number;
  status: 'draft' | 'published' | 'archived';
  syllabus?: string;
  video_url?: string | null;
  materials?: CourseMaterial[];
  creator?: User;
  instructors?: CourseInstructor[];
  enrolments_count?: number;
  is_enrolled?: boolean;
  created_at?: string;
  updated_at?: string;
}
