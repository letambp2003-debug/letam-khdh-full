/**
 * Các kiểu dữ liệu cho hệ thống 10 agent (KHDH AUTO V10.1)
 */

export type AgentId = 
  | 'SourceIndexerAgent'
  | 'LessonRouterAgent'
  | 'OldKhdhMatcherAgent'
  | 'KhdhBuilderAgent'
  | 'MathAgent'
  | 'VisualAssetAgent'
  | 'PeriodPlannerAgent'
  | 'SlideAgent'
  | 'CanvaNotebookAgent'
  | 'QAAgent';

export type AgentStatus = 'OK' | 'WARNING' | 'CONFLICT' | 'BLOCKED' | 'FAIL';

export type ErrorSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

export interface AgentError {
  code: string;
  type: string;
  location: string;
  owner_agent: string;
  action: string;
  severity: ErrorSeverity;
  message?: string;
}

export interface AgentMessage {
  job_id: string;
  lesson_id?: string;
  sender: AgentId;
  receiver: AgentId;
  status: AgentStatus;
  payload: any;
  warnings: AgentError[];
  errors: AgentError[];
  next_action?: string;
}

export interface AgentConfig {
  id: string;
  version: string;
  system: string;
  skill_file: string;
  next_agents: string[];
  orchestrated: boolean;
  direct_agent_to_agent_calls: boolean;
  language: string;
}

export interface AgentRunResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  agent: string;
  duration_ms: number;
}
