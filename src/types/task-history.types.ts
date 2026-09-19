/**
 * Types for Per-User Task & Job Execution History
 */

export type TaskType =
  | 'SOAN_KHDH_V11'
  | 'SOAN_KHDH_TACH_TIET'
  | 'PHAN_TICH_BAI_HOC'
  | 'PHIEU_HOC_TAP'
  | 'TRO_CHOI_GAME'
  | 'KICH_BAN_VIDEO'
  | 'TRICH_XUAT_DANH_MUC'
  | 'OTHER_TASK';

export interface TaskHistoryItem {
  id: string;
  projectId: string;          // usr_<email> - 100% Watertight User Isolation
  userEmail?: string;
  taskType: TaskType;
  taskLabel: string;
  lessonCode: string;
  lessonTitle?: string;
  command: string;
  formatMode?: 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION';
  resultSnippet: string;
  fullOutput: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  modelUsed?: string;
  durationMs?: number;
  keyUsed?: string;
  status: 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export interface GetTaskHistoryResponse {
  success: boolean;
  tasks: TaskHistoryItem[];
  totalCount: number;
  projectId: string;
  message?: string;
}

export interface SaveTaskHistoryRequest {
  id?: string;
  projectId?: string;
  taskType: TaskType;
  taskLabel?: string;
  lessonCode: string;
  lessonTitle?: string;
  command: string;
  formatMode?: 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION';
  resultSnippet?: string;
  fullOutput: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  modelUsed?: string;
  durationMs?: number;
  keyUsed?: string;
}
