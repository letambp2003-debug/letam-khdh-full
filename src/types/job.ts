/**
 * Các kiểu dữ liệu cho tiến trình/công việc (Job) - KHDH AUTO V10.1
 */

import { AgentId, AgentError } from './agent';

export type JobStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export type JobPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type JobCommand = 
  | 'KHOI_DONG' 
  | 'DANH_MUC' 
  | 'TRANG_THAI' 
  | 'TUAN' 
  | 'SOAN_XUAT' 
  | 'SOAN_MOI' 
  | 'NANG_CAP' 
  | 'RA_SOAT_NHANH' 
  | 'KIEM_TRA_TOAN' 
  | 'XUAT_WORD_OMML' 
  | 'TAO_SLIDE_NGHIEN_CUU' 
  | 'CANVA_TIET' 
  | 'XUAT_CANVA_PROMPT' 
  | 'SOAN_XUAT_CANVA' 
  | 'CANVA_SLIDE' 
  | 'TIEP_THEO';

export type LockType = 
  | 'LOCK_SOURCE' 
  | 'LOCK_ROUTE' 
  | 'LOCK_KHDH_BASE' 
  | 'LOCK_PERIOD_MAP' 
  | 'LOCK_SLIDE_PLAN';

export interface JobState {
  job_id: string;
  lesson_id?: string;
  command: JobCommand;
  command_args?: any;
  current_agent: AgentId | null;
  phase: JobPhase;
  status: JobStatus;
  locks: LockType[];
  warnings: AgentError[];
  errors: AgentError[];
  artifacts: Record<string, string>;
  token_usage: {
    total_input: number;
    total_output: number;
    by_agent: Record<string, { input: number; output: number }>;
  };
  created_at: Date | string;
  updated_at: Date | string;
  completed_at?: Date | string;
}

export interface JobCreateInput {
  command: JobCommand;
  command_args?: any;
}

export interface JobLog {
  job_id: string;
  agent_id: string;
  timestamp: Date | string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}
