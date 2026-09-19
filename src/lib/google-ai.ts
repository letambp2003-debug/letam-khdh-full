import { GeminiService } from '@/services/ai/gemini.service';

export interface LegacyCallAgentOptions {
  agentName: string;
  systemPrompt: string;
  userMessage: string;
  apiKey?: string;
  model?: 'pro' | 'flash';
  maxTokens?: number;
  temperature?: number;
}

export async function callAgent(options: LegacyCallAgentOptions) {
  const result = await GeminiService.generateContent({
    apiKey: options.apiKey,
    systemPrompt: options.systemPrompt,
    userMessage: options.userMessage,
    model: options.model,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });

  return {
    text: result.text,
    usage: result.usage,
    model: result.model,
    agent: options.agentName,
  };
}

export async function runAgent(
  agentName: string,
  skillContent: string,
  jobContext: Record<string, unknown>,
  userInput: string,
  apiKey?: string
) {
  const systemPrompt = `Bạn là ${agentName}.\n\nKỹ năng chuyên môn:\n${skillContent}`;
  const userMessage = [
    '## NGỮ CẢNH CÔNG VIỆC (JOB CONTEXT)',
    '```json',
    JSON.stringify(jobContext, null, 2),
    '```',
    '',
    '## YÊU CẦU NGƯỜI DÙNG (USER INPUT)',
    userInput,
  ].join('\n');

  return callAgent({
    agentName,
    systemPrompt,
    userMessage,
    apiKey,
  });
}
