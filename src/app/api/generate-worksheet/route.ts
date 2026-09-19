import { NextRequest, NextResponse } from 'next/server';
import { WorksheetGeneratorService } from '@/services/worksheet/worksheet-generator.service';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'QUOTA_LIMIT', message: 'Vui lòng thử lại sau giây lát.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { khdhDraft, lessonCode, apiKeys, options } = body;

    if (!khdhDraft || typeof khdhDraft !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_KHDH_DRAFT', message: 'Chưa có dữ liệu bản thảo KHDH để tạo Phiếu học tập.' },
        { status: 400 }
      );
    }

    const result = await WorksheetGeneratorService.generateFromKhdh({
      khdhDraft,
      lessonCode,
      apiKeys,
      options,
    });

    return NextResponse.json({
      success: true,
      worksheet: result.worksheet,
      markdown: result.markdown,
      keyUsed: result.keyUsed,
      tokenUsage: result.tokenUsage,
    });
  } catch (error) {
    const errStr = String(error);
    console.error('Error generating worksheet:', errStr);
    return NextResponse.json(
      {
        error: 'WORKSHEET_GEN_FAILED',
        message: 'Lỗi khi tạo Phiếu học tập: ' + errStr,
      },
      { status: 500 }
    );
  }
}
