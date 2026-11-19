export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  question_bank_id?: string | null;
  course_id?: string | null;
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[] | null;
  points: number;
  pivot_points?: number;
  order_index?: number;
  correct_answers?: string[];
  explanation?: string | null;
  created_at?: string;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'timed_out' | 'evaluated';

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  attempt_number: number;
  started_at: string;
  expires_at: string;
  submitted_at?: string | null;
  status: AttemptStatus;
  time_remaining_seconds: number;
  score?: number | null;
  percentage?: number | null;
  is_passed?: boolean | null;
  answers_snapshot?: Record<string, any> | null;
  created_at?: string;
}

export interface Exam {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  duration_minutes: number;
  total_marks: number;
  passing_percentage: number;
  start_time?: string | null;
  end_time?: string | null;
  is_open: boolean;
  shuffle_questions: boolean;
  max_attempts: number;
  is_published: boolean;
  questions_count?: number;
  questions?: Question[];
  my_active_attempt?: ExamAttempt | null;
  my_latest_attempt?: ExamAttempt | null;
  created_at?: string;
  updated_at?: string;
}
