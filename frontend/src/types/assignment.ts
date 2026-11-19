import type { Course } from './course';
import type { User } from './auth';

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user?: User;
  submission_text?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  submitted_at: string;
  status: 'submitted' | 'graded' | 'resubmission_requested';
  is_late: boolean;
  score?: number | null;
  feedback?: string | null;
  grader?: User | null;
  graded_at?: string | null;
}

export interface Assignment {
  id: string;
  course_id: string;
  course?: Course;
  section_id?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  due_date: string;
  is_past_due: boolean;
  max_score: number;
  submission_type: 'text' | 'file' | 'both';
  status: 'draft' | 'published' | 'closed';
  submissions_count?: number;
  my_submission?: AssignmentSubmission | null;
  created_at?: string;
  updated_at?: string;
}
