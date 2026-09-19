import { NextRequest, NextResponse } from 'next/server';
import { VideoStoryboardGeneratorService } from '@/services/video/video-storyboard-generator.service';
import { GenerateStoryboardRequest } from '@/types/video-storyboard.types';

export async function POST(req: NextRequest) {
  try {
    const body: GenerateStoryboardRequest = await req.json();

    if (!body.khdhDraft || typeof body.khdhDraft !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Thiếu nội dung bản thảo KHDH (khdhDraft).' },
        { status: 400 }
      );
    }

    const { storyboard, keyUsed } =
      await VideoStoryboardGeneratorService.generateFromKhdh(body);

    return NextResponse.json({
      success: true,
      storyboard,
      keyUsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định khi tạo Storyboard.';
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
