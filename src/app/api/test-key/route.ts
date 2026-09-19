import { NextRequest, NextResponse } from 'next/server';
import { GeminiService } from '@/services/ai/gemini.service';
import { ApiKeyService } from '@/services/ai/api-key.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKey, apiKeys } = body;

    let keyList: string[] = [];
    if (apiKeys && Array.isArray(apiKeys) && apiKeys.length > 0) {
      keyList = apiKeys;
    } else if (apiKey && typeof apiKey === 'string') {
      keyList = ApiKeyService.parseKeys(apiKey);
    } else {
      const serverPool = GeminiService.resolveKeyPool();
      if (serverPool.length > 0) {
        keyList = serverPool;
      }
    }

    if (keyList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Chưa có API Key nào để kiểm tra. Vui lòng nhập ít nhất 1 API Key.' },
        { status: 400 }
      );
    }

    const testResult = await GeminiService.testMultiKeys(keyList);
    return NextResponse.json(testResult);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Lỗi kiểm tra API Key: ' + String(error) },
      { status: 500 }
    );
  }
}

