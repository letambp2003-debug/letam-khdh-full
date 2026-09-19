import { GoogleGenAI } from '@google/genai';
import { getEnv } from '@/config/env';
import { AiGenerateOptions, AiGenerateResult, KeyTestDetail, MultiKeyTestResult } from './ai.types';
import { MissingApiKeyError, parseAiError } from './ai.errors';
import { ApiKeyService } from './api-key.service';

// Danh sách các model Flash theo thứ tự ưu tiên
export const PRODUCTION_FLASH_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
];

export class GeminiService {
  /**
   * Tổng hợp danh sách key từ request và từ biến môi trường
   */
  public static resolveKeyPool(apiKey?: string, apiKeys?: string[]): string[] {
    const pool: string[] = [];
    const seen = new Set<string>();

    // 1. Thêm danh sách key gửi lên từ client
    if (apiKeys && Array.isArray(apiKeys)) {
      for (const k of apiKeys) {
        const trimmed = k?.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          pool.push(trimmed);
        }
      }
    }

    // 2. Thêm single key nếu có
    if (apiKey && typeof apiKey === 'string') {
      const trimmed = apiKey.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        pool.push(trimmed);
      }
    }

    // 3. Thêm key từ server env nếu chưa có
    const env = getEnv();
    if (env.GOOGLE_AI_API_KEY && !seen.has(env.GOOGLE_AI_API_KEY)) {
      seen.add(env.GOOGLE_AI_API_KEY);
      pool.push(env.GOOGLE_AI_API_KEY);
    }

    return pool;
  }

  /**
   * Kiểm tra 1 API key duy nhất
   */
  public static async testSingleKey(apiKey: string): Promise<KeyTestDetail> {
    const maskedKey = ApiKeyService.maskKey(apiKey);
    const trimmed = apiKey?.trim() || '';

    if (!trimmed) {
      return {
        key: apiKey,
        maskedKey,
        isValid: false,
        status: 'INVALID',
        message: 'API Key trống',
      };
    }

    // Thử với các model production ổn định nhất trước
    const testModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastErrorMsg = '';

    for (const model of testModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: trimmed });
        const response = await ai.models.generateContent({
          model,
          contents: 'Ping',
        });

        if (response && response.text !== undefined) {
          return {
            key: apiKey,
            maskedKey,
            isValid: true,
            status: 'ACTIVE',
            message: `Hoạt động tốt (Model: ${model})`,
            modelTested: model,
          };
        }
      } catch (err: unknown) {
        const error = err as { status?: number; code?: number; message?: string };
        const status = error?.status || error?.code;
        const msg = error?.message || String(err);
        lastErrorMsg = msg;

        // Nếu lỗi do hạn mức / quota 429
        if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
          return {
            key: apiKey,
            maskedKey,
            isValid: true,
            status: 'QUOTA_EXHAUSTED',
            message: 'Hợp lệ nhưng tạm thời hết hạn mức (Quota Exceeded / 429)',
            modelTested: model,
          };
        }

        // Nếu lỗi xác thực / key sai (400, 401, 403 API_KEY_INVALID)
        if (
          status === 400 ||
          status === 401 ||
          status === 403 ||
          msg.includes('API_KEY_INVALID') ||
          msg.includes('API key not valid') ||
          msg.includes('unauthenticated') ||
          msg.includes('permission')
        ) {
          return {
            key: apiKey,
            maskedKey,
            isValid: false,
            status: 'INVALID',
            message: 'API Key không chính xác hoặc chưa được kích hoạt trên Google AI Studio',
            modelTested: model,
          };
        }

        // Nếu model không tồn tại thì thử model tiếp theo trong danh sách
        continue;
      }
    }

    return {
      key: apiKey,
      maskedKey,
      isValid: false,
      status: 'INVALID',
      message: `Không thể xác thực: ${lastErrorMsg.slice(0, 120)}`,
    };
  }

  /**
   * Kiểm tra danh sách nhiều API Keys cùng lúc
   */
  public static async testMultiKeys(apiKeys: string[]): Promise<MultiKeyTestResult> {
    const validKeys = ApiKeyService.parseKeys(apiKeys.join('\n'));

    if (validKeys.length === 0) {
      return {
        success: false,
        totalKeys: 0,
        activeKeys: 0,
        message: 'Không tìm thấy API Key nào hợp lệ để kiểm tra.',
        details: [],
      };
    }

    // Chạy kiểm tra đồng thời cho tất cả các key
    const details = await Promise.all(validKeys.map((k) => this.testSingleKey(k)));
    const activeCount = details.filter((d) => d.status === 'ACTIVE').length;
    const quotaCount = details.filter((d) => d.status === 'QUOTA_EXHAUSTED').length;

    let message = '';
    let success = false;

    if (activeCount > 0) {
      success = true;
      message = `Kiểm tra hoàn tất: ${activeCount}/${validKeys.length} Key đang hoạt động tốt!`;
      if (quotaCount > 0) {
        message += ` (${quotaCount} key hết hạn mức, sẽ tự động dùng khi reset quota)`;
      }
    } else if (quotaCount > 0) {
      message = `Tất cả ${quotaCount} Key hợp lệ nhưng hiện tại đang bị hết hạn mức (Quota 429).`;
    } else {
      message = 'Tất cả các API Key đều không hợp lệ hoặc đã bị vô hiệu hóa.';
    }

    return {
      success,
      totalKeys: validKeys.length,
      activeKeys: activeCount,
      message,
      details,
    };
  }

  /**
   * Tạo nội dung sử dụng Multi-Key Pool & Model Cascade Failover
   */
  public static async generateContent(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const startTime = Date.now();
    const env = getEnv();

    const keyPool = this.resolveKeyPool(options.apiKey, options.apiKeys);
    if (keyPool.length === 0) {
      throw new MissingApiKeyError();
    }

    // Danh sách models cần thử theo thứ tự
    const modelsToTry: string[] = [];
    if (options.model && options.model !== 'pro' && options.model !== 'flash') {
      modelsToTry.push(options.model);
    }
    if (env.GOOGLE_AI_FLASH_MODEL && !modelsToTry.includes(env.GOOGLE_AI_FLASH_MODEL)) {
      modelsToTry.push(env.GOOGLE_AI_FLASH_MODEL);
    }
    if (env.GOOGLE_AI_MODEL && !modelsToTry.includes(env.GOOGLE_AI_MODEL)) {
      modelsToTry.push(env.GOOGLE_AI_MODEL);
    }
    for (const m of PRODUCTION_FLASH_MODELS) {
      if (!modelsToTry.includes(m)) {
        modelsToTry.push(m);
      }
    }

    let lastError: unknown = null;

    // Duyệt qua từng Key trong pool (Failover đa tầng: Key -> Model)
    for (let keyIdx = 0; keyIdx < keyPool.length; keyIdx++) {
      const currentKey = keyPool[keyIdx];
      const masked = ApiKeyService.maskKey(currentKey);

      for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
        const currentModel = modelsToTry[modelIdx];

        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: options.userMessage,
            config: {
              systemInstruction: options.systemPrompt,
              temperature: options.temperature ?? 0.4,
              maxOutputTokens: options.maxTokens ?? 8192,
            },
          });

          const text = response.text || '';
          const duration = Date.now() - startTime;

          return {
            text,
            model: currentModel,
            durationMs: duration,
            usage: {
              inputTokens: response.usageMetadata?.promptTokenCount || 0,
              outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata?.totalTokenCount || 0,
            },
            keyUsed: masked,
          };
        } catch (err: unknown) {
          lastError = err;
          const errorObj = err as { status?: number; code?: number; message?: string };
          const status = errorObj?.status || errorObj?.code;
          const msg = errorObj?.message || String(err);

          // Nếu Key bị hết Quota (429) hoặc sai Key (401/403) -> Chuyển ngay sang Key tiếp theo trong pool
          if (
            status === 429 ||
            status === 401 ||
            status === 403 ||
            msg.includes('429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('API_KEY_INVALID') ||
            msg.includes('quota')
          ) {
            // Ngắt vòng lặp model để đổi sang Key tiếp theo
            break;
          }

          // Nếu do model không tìm thấy (404 / NOT_FOUND) -> Thử model tiếp theo với cùng Key
          continue;
        }
      }
    }

    // Nếu duyệt qua toàn bộ Key và Model mà vẫn lỗi -> Parse và ném lỗi rõ ràng
    throw parseAiError(lastError);
  }
}

