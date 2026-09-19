import { NextResponse } from 'next/server';
import { getEnv } from '@/config/env';

export async function GET() {
  const env = getEnv();
  const hasServerKey = Boolean(env.GOOGLE_AI_API_KEY && env.GOOGLE_AI_API_KEY.trim().length > 10);

  return NextResponse.json({
    status: 'ok',
    system: 'KHDH AUTO V10.1 FINAL',
    version: '10.1.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    school: {
      name: env.SCHOOL_NAME,
      department: env.DEPARTMENT,
      teacher: env.TEACHER_NAME,
    },
    googleAi: {
      modelPro: env.GOOGLE_AI_MODEL,
      modelFlash: env.GOOGLE_AI_FLASH_MODEL,
      serverKeyConfigured: hasServerKey,
    },
  });
}
