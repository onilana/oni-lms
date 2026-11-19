export interface LessonProgress {
  is_completed: boolean;
  completed_at?: string;
  last_position_seconds: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  type: 'text' | 'video' | 'pdf' | 'embed';
  content?: string | null;
  video_url?: string | null;
  video_duration_seconds?: number | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  order_index: number;
  is_free_preview: boolean;
  is_accessible: boolean;
  status: 'draft' | 'published';
  progress?: LessonProgress | null;
  created_at?: string;
  updated_at?: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  status: 'draft' | 'published';
  lessons: Lesson[];
}

export interface CourseProgress {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  percentage: number;
}
