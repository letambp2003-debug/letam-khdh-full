export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiGenerateOptions {
  apiKey?: string;
  apiKeys?: string[];
  systemPrompt?: string;
  userMessage: string;
  model?: 'pro' | 'flash' | string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  signal?: AbortSignal;
}

export interface AiGenerateResult {
  text: string;
  usage: TokenUsage;
  model: string;
  durationMs: number;
  keyUsed?: string;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  message: string;
  maskedKey?: string;
}

export interface KeyTestDetail {
  key: string;
  maskedKey: string;
  isValid: boolean;
  status: 'ACTIVE' | 'QUOTA_EXHAUSTED' | 'INVALID' | 'NETWORK_ERROR';
  message: string;
  modelTested?: string;
}

export interface MultiKeyTestResult {
  success: boolean;
  totalKeys: number;
  activeKeys: number;
  message: string;
  details: KeyTestDetail[];
}

