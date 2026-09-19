import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().default(''),
  GOOGLE_AI_MODEL: z.string().default('gemini-3.8-flash'),
  GOOGLE_AI_FLASH_MODEL: z.string().default('gemini-3.8-flash-lite'),
  GOOGLE_AI_MAX_TOKENS: z.coerce.number().default(65536),
  GOOGLE_AI_TEMPERATURE: z.coerce.number().default(0.2),
  GOOGLE_AI_TOP_P: z.coerce.number().default(0.95),
  GOOGLE_AI_RATE_LIMIT_RPM: z.coerce.number().default(60),

  AUTH_SECRET: z.string().default('khdh-auto-default-secret-key-32-chars-minimum'),
  AUTH_PASSWORD_HASH: z.string().optional().default(''),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(''),

  NEXT_PUBLIC_APP_NAME: z.string().default('KHDH Auto V10.1'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().default('file:./data/khdh.db'),

  SCHOOL_NAME: z.string().default('TRƯỜNG THCS QUANG TRUNG'),
  DEPARTMENT: z.string().default('TOÁN TIN'),
  TEACHER_NAME: z.string().default('LÊ TÂM'),

  OMML_ENGINE: z.string().default('node'),
  TIKZ_COMPILE_ENABLED: z.coerce.boolean().default(false),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(30),
  SESSION_MAX_AGE_HOURS: z.coerce.number().default(24),

  UPLOAD_DIR: z.string().default('./data/uploads'),
  OUTPUT_DIR: z.string().default('./data/outputs'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(50),

  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('./data/logs'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    cachedEnv = envSchema.parse({});
    return cachedEnv;
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = getEnv();
