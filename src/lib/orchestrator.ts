import type { AgentId, AgentRunResult, AgentMessage } from '@/types/agent';
import type { JobState, JobCommand, LockType } from '@/types/job';

export const AGENT_PIPELINE: AgentId[] = [
  'SourceIndexerAgent',
  'LessonRouterAgent',
  'OldKhdhMatcherAgent',
  'KhdhBuilderAgent',
  'MathAgent',
  'VisualAssetAgent',
  'PeriodPlannerAgent',
  'SlideAgent',
  'CanvaNotebookAgent',
  'QAAgent'
];

export const GATE_RULES = {
  // Qui tắc cổng: Các agent nào phải hoàn thành trước khi chuyển sang agent khác
  'KhdhBuilderAgent': ['SourceIndexerAgent', 'LessonRouterAgent']
};

export type OrchestratorConfig = {
  maxRetryPerAgent: number;
  onConflict: (job: JobState) => void;
  onBlocked: (job: JobState) => void;
  onWarning: (job: JobState, warning: any) => void;
};

export class Orchestrator {
  private config: OrchestratorConfig;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxRetryPerAgent: config?.maxRetryPerAgent ?? 2,
      onConflict: config?.onConflict ?? (() => {}),
      onBlocked: config?.onBlocked ?? (() => {}),
      onWarning: config?.onWarning ?? (() => {})
    };
  }

  createJob(command: JobCommand, args?: string): JobState {
    return {
      job_id: `job-${Date.now()}`,
      command,
      command_args: args,
      status: 'PENDING',
      phase: 1,
      current_agent: null,
      locks: [],
      warnings: [],
      errors: [],
      artifacts: {},
      token_usage: { total_input: 0, total_output: 0, by_agent: {} },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  getNextAgent(currentAgent: AgentId | null): AgentId | null {
    if (!currentAgent) return AGENT_PIPELINE[0];
    const index = AGENT_PIPELINE.indexOf(currentAgent);
    if (index === -1 || index === AGENT_PIPELINE.length - 1) return null;
    return AGENT_PIPELINE[index + 1];
  }

  canProceed(job: JobState, nextAgent: AgentId): { allowed: boolean; reason?: string } {
    const requiredPrevAgents = GATE_RULES[nextAgent as keyof typeof GATE_RULES];
    if (requiredPrevAgents && requiredPrevAgents.length > 0) {
      if (job.errors && job.errors.some(e => e.severity === 'BLOCKING')) {
        return { allowed: false, reason: 'Có lỗi chặn (BLOCKING) từ các agent trước đó.' };
      }
    }
    return { allowed: true };
  }

  applyLock(job: JobState, agent: AgentId): void {
    const lockMap: Partial<Record<AgentId, LockType>> = {
      SourceIndexerAgent: 'LOCK_SOURCE',
      LessonRouterAgent: 'LOCK_ROUTE',
      KhdhBuilderAgent: 'LOCK_KHDH_BASE',
      PeriodPlannerAgent: 'LOCK_PERIOD_MAP',
      SlideAgent: 'LOCK_SLIDE_PLAN',
    };
    const lock = lockMap[agent];
    if (lock) {
      if (!job.locks) {
        job.locks = [];
      }
      if (!job.locks.includes(lock)) {
        job.locks.push(lock);
      }
    }
  }

  updateJobState(job: JobState, agentResult: AgentRunResult, agentMessage: AgentMessage): JobState {
    if (agentMessage.status === 'FAIL') {
      job.status = 'FAILED';
      if (job.errors) {
        job.errors.push(...agentMessage.errors);
      }
    } else {
      job.current_agent = agentMessage.sender;
      if (agentResult?.usage) {
        job.token_usage.total_input += agentResult.usage.inputTokens || 0;
        job.token_usage.total_output += agentResult.usage.outputTokens || 0;
        job.token_usage.by_agent[agentMessage.sender] = {
          input: (job.token_usage.by_agent[agentMessage.sender]?.input || 0) + (agentResult.usage.inputTokens || 0),
          output: (job.token_usage.by_agent[agentMessage.sender]?.output || 0) + (agentResult.usage.outputTokens || 0),
        };
      }
    }
    job.updated_at = new Date().toISOString();
    return job;
  }

  isComplete(job: JobState): boolean {
    return job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED';
  }
}

