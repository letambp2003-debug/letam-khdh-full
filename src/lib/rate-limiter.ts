import { getEnv } from './env';

interface RateLimitData {
  count: number;
  resetAt: number;
}

const rateLimiterStore = new Map<string, RateLimitData>();

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
  const env = getEnv();
  const now = Date.now();
  const data = rateLimiterStore.get(identifier);

  if (data && now < data.resetAt) {
    if (data.count >= env.RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: data.resetAt,
      };
    }
    data.count++;
    return {
      allowed: true,
      remaining: env.RATE_LIMIT_MAX_REQUESTS - data.count,
      resetAt: data.resetAt,
    };
  }

  // Xóa mục đã hết hạn nếu có
  if (data && now >= data.resetAt) {
      rateLimiterStore.delete(identifier);
  }

  const resetAt = now + env.RATE_LIMIT_WINDOW_MS;
  rateLimiterStore.set(identifier, { count: 1, resetAt });

  // Dọn dẹp định kỳ các mục đã hết hạn (xác suất 5%)
  if (Math.random() < 0.05) {
      for (const [key, value] of rateLimiterStore.entries()) {
          if (now >= value.resetAt) {
              rateLimiterStore.delete(key);
          }
      }
  }

  return {
    allowed: true,
    remaining: env.RATE_LIMIT_MAX_REQUESTS - 1,
    resetAt,
  };
}
