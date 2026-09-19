import { readFile } from 'fs/promises';
import { join } from 'path';
import { runAgent } from '@/lib/google-ai';
import type { AgentId, AgentRunResult, AgentMessage, AgentStatus } from '@/types/agent';
import type { JobState } from '@/types/job';

export abstract class BaseAgent {
  abstract readonly id: AgentId;
  abstract readonly skillFileName: string;

  protected get docsDir(): string {
    return join(process.cwd(), 'docs', 'agents');
  }

  protected get skillPath(): string {
    const folderMap: Record<AgentId, string> = {
      SourceIndexerAgent: '01_SourceIndexerAgent',
      LessonRouterAgent: '02_LessonRouterAgent',
      OldKhdhMatcherAgent: '03_OldKhdhMatcherAgent',
      KhdhBuilderAgent: '04_KhdhBuilderAgent',
      MathAgent: '05_MathAgent',
      VisualAssetAgent: '06_VisualAssetAgent',
      PeriodPlannerAgent: '07_PeriodPlannerAgent',
      SlideAgent: '08_SlideAgent',
      CanvaNotebookAgent: '09_CanvaNotebookAgent',
      QAAgent: '10_QAAgent',
    };
    return join(this.docsDir, folderMap[this.id], this.skillFileName);
  }

  async loadSkill(): Promise<string> {
    try {
      return await readFile(this.skillPath, 'utf-8');
    } catch {
      return `Agent ${this.id} - KHDH AUTO V10.1`;
    }
  }

  abstract buildContext(job: JobState, input?: unknown): Record<string, unknown>;
  abstract parseOutput(raw: string): unknown;
  abstract validateOutput(parsed: unknown): { valid: boolean; errors: string[] };

  async run(job: JobState, userInput: string, extraInput?: unknown, apiKey?: string): Promise<AgentRunResult> {
    const skill = await this.loadSkill();
    const context = this.buildContext(job, extraInput);
    const startTime = Date.now();
    const result = await runAgent(this.id, skill, context, userInput, apiKey);
    return {
      text: result.text || '',
      usage: result.usage,
      model: result.model,
      agent: this.id,
      duration_ms: Date.now() - startTime,
    };
  }

  buildMessage(job: JobState, status: AgentStatus, payload: unknown, warnings: unknown[] = [], errors: unknown[] = []): AgentMessage {
    return {
      job_id: job.job_id,
      lesson_id: job.lesson_id,
      sender: this.id,
      receiver: 'WorkflowOrchestrator' as AgentId,
      status,
      payload: payload as Record<string, unknown>,
      warnings: warnings as any[],
      errors: errors as any[],
      next_action: '',
    };
  }
}
