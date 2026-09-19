/**
 * Lesson Requirement Analysis & Locked Configuration Types
 * KHDH AUTO V10.1
 */

export interface LessonRequirementAnalysis {
  lessonTitle: string;
  lessonCode: string;
  subject: string;
  grade: string;
  term: string;
  totalPeriods: number;
  periodBreakdown: string[];
  objectives: {
    knowledge: string[];
    competencies: string[];
    qualities: string[];
  };
  keyConcepts: string[];
  pedagogicalMethods: string[];
  selectedOutputs: {
    khdhDraft: boolean;
    worksheet: boolean;
    game: boolean;
    videoStoryboard: boolean;
    canvaSlides: boolean;
  };
  customNotes?: string;
  isLocked?: boolean;
}

export interface AnalyzeLessonRequest {
  lessonCode: string;
  command?: string;
  apiKeys?: string[];
  documentIds?: string[];
  projectId?: string;
}

export interface AnalyzeLessonResponse {
  success: boolean;
  analysis?: LessonRequirementAnalysis;
  message?: string;
  keyUsed?: string;
}
