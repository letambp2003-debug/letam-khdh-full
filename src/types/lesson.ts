/**
 * Các kiểu dữ liệu cho bài học (Lesson) - KHDH AUTO V10.1
 */

export type PpctStatus = 
  | 'VERIFIED' 
  | 'TITLE_VARIANT' 
  | 'MULTIPLE_MATCH' 
  | 'NOT_FOUND' 
  | 'CONFLICT' 
  | 'MANUAL_CONFIRMED';

export type SourceStatus = 'SOURCE_OK' | 'SOURCE_WARNING' | 'SOURCE_CONFLICT';

export type OutputStatus = 
  | 'DRAFT' 
  | 'QA_OK' 
  | 'MATH_EXPORT_BLOCKED' 
  | 'MATH_QA_OK' 
  | 'FINAL';

export interface OldKhdhMatch {
  status: 'OLD_CONFIRMED' | 'OLD_POSSIBLE' | 'NEW' | 'CONFLICT';
  source_file: string;
  confidence: number;
  evidence: string[];
  conflicts: string[];
  recommended_mode: string;
  preserve_policy: string;
}

export interface LessonRecord {
  lesson_id: string;
  subject: string;
  grade: string;
  school_year: string;
  semester: string;
  strand: string;
  chapter: string;
  stt: number;
  lesson_number: string;
  lesson_title: string;
  occurrence: number;
  pl1_period_count: number;
  yccd_internal: string[];
  nls: string[];
  sgk_locator: string[];
  old_khdh_match?: OldKhdhMatch;
  source_status: string;
}

export interface PpctRecord {
  subject: string;
  grade: string;
  school_year: string;
  semester: string;
  week: number;
  strand: string;
  ppct: number;
  lesson_title: string;
  occurrence: number;
  source_row: number;
}

export interface LessonRuntime {
  lesson_id: string;
  ppct_auto: number[];
  so_tiet_auto: number;
  tuan_auto: number[];
  ppct_status: PpctStatus;
  mode: string;
  source_status: SourceStatus;
  content_qa_status: string;
  math_status: string;
  output_status: OutputStatus;
}

export interface NlsRecord {
  code: string;
  tool: string;
  task: string;
  input: string;
  product: string;
  verify: string;
  safety: string;
  fallback: string;
}

export interface PeriodRecord {
  period_id: string;
  lesson_id: string;
  ppct: number;
  week: number;
  period_index: number;
  period_title: string;
  objectives: string[];
  knowledge: string[];
  activities: string[];
  products: string[];
  nls_ai: string[];
  math_assets: string[];
  tikz_assets: string[];
  image_prompts: string[];
  previous_period_link?: string;
  next_period_link?: string;
  slide_target: number; // default 18
}

export interface SlideRecord {
  slide_id: string;
  lesson_id: string;
  ppct: number;
  number: number;
  type: string;
  title: string;
  pedagogical_purpose: string;
  visible_text: string;
  student_task: string;
  teacher_note: string;
  expected_product: string;
  time: number;
  math_assets: string[];
  tikz_assets: string[];
  image_prompts: string[];
  layout: string;
  style: string;
  source_links: string[];
  qa_status: string;
}
