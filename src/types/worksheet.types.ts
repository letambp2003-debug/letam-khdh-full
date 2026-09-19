/**
 * Types definition for Worksheet (Phiếu Học Tập) Module
 */

export type QuestionLevel = 'MUC_1' | 'MUC_2' | 'MUC_3'; // Mức 1: Nhận biết - Thông hiểu | Mức 2: Vận dụng | Mức 3: Vận dụng cao

export interface WorksheetQuestionItem {
  id: string;
  orderNumber: number;
  level: QuestionLevel;
  levelLabel: string; // "Mức 1: Nhận biết" | "Mức 2: Vận dụng" | "Mức 3: Vận dụng cao"
  questionType: 'multiple_choice' | 'fill_in_blank' | 'essay' | 'challenge';
  content: string; // Câu hỏi (chứa LaTeX $...$)
  options?: string[]; // Cho trắc nghiệm
  correctAnswer?: string;
  blankLinesCount?: number; // Số dòng kẻ chấm cho học sinh làm bài (mặc định 3-6 dòng)
  hints?: string;
}

export interface WorksheetSection {
  title: string;
  description?: string;
  items: WorksheetQuestionItem[];
}

export interface WorksheetData {
  schoolName?: string;
  department?: string;
  worksheetTitle: string; // "PHIẾU HỌC TẬP SỐ 01: ĐƠN THỨC VÀ ĐA THỨC"
  lessonCode: string;
  grade: string;
  subject: string;
  durationMinutes?: number;
  coreKnowledgeBox: string[]; // Các điểm kiến thức trọng tâm cần nhớ
  sections: WorksheetSection[];
  rubricEvaluation: {
    criteria: string;
    levels: string[];
  }[];
  imagePromptA4?: string;
  imagePromptA4Vi?: string;
  markdownContent: string; // Toàn bộ nội dung dạng Markdown
}

export interface GenerateWorksheetRequest {
  khdhDraft: string;
  lessonCode?: string;
  apiKeys?: string[];
  options?: {
    numQuestions?: number;
    includeSummary?: boolean;
    includeRubric?: boolean;
  };
}

export interface GenerateWorksheetResponse {
  success: boolean;
  worksheet?: WorksheetData;
  markdown?: string;
  imagePromptA4?: string;
  imagePromptA4Vi?: string;
  message?: string;
  keyUsed?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
