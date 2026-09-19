export class AiServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;

  constructor(code: string, message: string, userMessage: string, statusCode = 500) {
    super(message);
    this.name = 'AiServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
  }
}

export class MissingApiKeyError extends AiServiceError {
  constructor() {
    super(
      'MISSING_API_KEY',
      'Google AI API Key is missing',
      'Chưa cấu hình Google AI API Key. Vui lòng nhập API Key của bạn trên giao diện hoặc cấu hình GOOGLE_AI_API_KEY trong .env.local',
      401
    );
  }
}

export class InvalidApiKeyError extends AiServiceError {
  constructor(details?: string) {
    super(
      'INVALID_API_KEY',
      `Invalid Google AI API Key: ${details || ''}`,
      'Google AI API Key không hợp lệ hoặc đã bị vô hiệu hoá. Vui lòng kiểm tra lại key.',
      401
    );
  }
}

export class QuotaExceededError extends AiServiceError {
  constructor() {
    super(
      'QUOTA_EXCEEDED',
      'Google AI API Quota or Rate Limit exceeded',
      'Đã vượt quá hạn mức sử dụng (Quota / Rate Limit) của Google AI API. Vui lòng đợi 1 phút và thử lại.',
      429
    );
  }
}

export class AiTimeoutError extends AiServiceError {
  constructor() {
    super(
      'REQUEST_TIMEOUT',
      'Request to Google AI timed out',
      'Yêu cầu tạo nội dung bị quá thời gian xử lý (Timeout). Vui lòng thử lại với nội dung ngắn hơn.',
      408
    );
  }
}

export class NetworkConnectionError extends AiServiceError {
  constructor(details?: string) {
    super(
      'NETWORK_ERROR',
      `Network error: ${details || ''}`,
      'Không thể kết nối đến máy chủ Google AI. Vui lòng kiểm tra kết nối mạng Internet.',
      503
    );
  }
}

export function parseAiError(error: unknown): AiServiceError {
  if (error instanceof AiServiceError) {
    return error;
  }

  const errStr = String(error).toLowerCase();

  if (errStr.includes('api_key') || errStr.includes('api key not valid') || errStr.includes('403') || errStr.includes('unauthenticated')) {
    return new InvalidApiKeyError(String(error));
  }
  if (errStr.includes('quota') || errStr.includes('429') || errStr.includes('resource_exhausted')) {
    return new QuotaExceededError();
  }
  if (errStr.includes('abort') || errStr.includes('timeout') || errStr.includes('deadline')) {
    return new AiTimeoutError();
  }
  if (errStr.includes('econnrefused') || errStr.includes('fetch failed') || errStr.includes('network')) {
    return new NetworkConnectionError(String(error));
  }

  return new AiServiceError(
    'UNKNOWN_AI_ERROR',
    String(error),
    'Đã xảy ra lỗi khi tạo nội dung với Google AI. Vui lòng thử lại.'
  );
}
