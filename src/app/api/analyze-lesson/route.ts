import { NextRequest, NextResponse } from 'next/server';
import { LessonAnalyzerService } from '@/services/analysis/lesson-analyzer.service';
import { AnalyzeLessonRequest } from '@/types/lesson-analysis.types';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeLessonRequest = await req.json();

    if (!body.lessonCode || typeof body.lessonCode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mã bài học hoặc tham số cần phân tích.' },
        { status: 400 }
      );
    }

    const targetProject = await resolveUserProjectIdFromRequest(req, body.projectId);
    const { analysis, keyUsed } = await LessonAnalyzerService.analyzeLesson({
      ...body,
      projectId: targetProject,
    });

    return NextResponse.json({
      success: true,
      analysis,
      keyUsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định khi phân tích yêu cầu bài học.';
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}