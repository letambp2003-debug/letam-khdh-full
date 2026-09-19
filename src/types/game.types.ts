/**
 * Types definition for Interactive HTML Game Module
 */

export type GameTemplateId = 'SPACE_QUIZ' | 'LUCKY_WHEEL' | 'MEMORY_MATCH';

export interface GameQuestion {
  id: string;
  question: string; // Nội dung câu hỏi (chứa LaTeX $...$)
  options: string[]; // 4 lựa chọn A, B, C, D (chứa LaTeX)
  correctIndex: number; // 0, 1, 2, 3
  explanation?: string; // Giải thích ngắn gọn
  timeLimitSeconds?: number; // Mặc định 15-20s
}

export interface GameData {
  title: string;
  lessonCode: string;
  templateId: GameTemplateId;
  templateName: string;
  themeColor: string;
  questions: GameQuestion[];
  totalQuestions: number;
  standaloneHtml: string;
}

export interface GenerateGameRequest {
  khdhDraft: string;
  lessonCode?: string;
  templateId?: GameTemplateId;
  apiKeys?: string[];
  numQuestions?: number;
}

export interface GenerateGameResponse {
  success: boolean;
  gameData?: GameData;
  html?: string;
  message?: string;
  keyUsed?: string;
}
