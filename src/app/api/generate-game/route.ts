import { NextRequest, NextResponse } from 'next/server';
import { GameGeneratorService } from '@/services/game/game-generator.service';
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
    const { khdhDraft, lessonCode, templateId, apiKeys, numQuestions } = body;

    if (!khdhDraft || typeof khdhDraft !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_KHDH_DRAFT', message: 'Chưa có dữ liệu bản thảo KHDH để tạo Trò chơi.' },
        { status: 400 }
      );
    }

    const result = await GameGeneratorService.generateFromKhdh({
      khdhDraft,
      lessonCode,
      templateId,
      apiKeys,
      numQuestions,
    });

    return NextResponse.json({
      success: true,
      gameData: result.gameData,
      html: result.html,
      keyUsed: result.keyUsed,
    });
  } catch (error) {
    const errStr = String(error);
    console.error('Error generating game:', errStr);
    return NextResponse.json(
      {
        error: 'GAME_GEN_FAILED',
        message: 'Lỗi khi tạo Trò chơi tương tác: ' + errStr,
      },
      { status: 500 }
    );
  }
}
