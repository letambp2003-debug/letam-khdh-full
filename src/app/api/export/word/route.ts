import { NextRequest, NextResponse } from 'next/server';
import { WordExportService } from '@/services/export/word-export.service';
import { getEnv } from '@/config/env';
import { MathExportMode, PrintProfile } from '@/services/export/export.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { markdown, title, lessonCode, mathMode, printProfile } = body;

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Nội dung giáo án (markdown) không được để trống.' },
        { status: 400 }
      );
    }

    const env = getEnv();
    const targetMathMode: MathExportMode = mathMode === 'latex' ? 'latex' : 'omml';
    const targetProfile: PrintProfile = printProfile === 'STANDARD' ? 'STANDARD' : 'COMPACT_PRINT';

    const result = await WordExportService.exportToDocx({
      markdown,
      title: title || 'Kế hoạch bài dạy',
      lessonCode: lessonCode || 'TOAN-8',
      schoolName: env.SCHOOL_NAME,
      department: env.DEPARTMENT,
      teacherName: env.TEACHER_NAME,
      mathMode: targetMathMode,
      printProfile: targetProfile,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'X-Math-Mode': result.mathMode,
        'X-Print-Profile': result.printProfile,
        'X-Formulas-Count': String(result.formulasConverted),
        'X-OMML-Fallback-Count': String(result.ommlFallbackCount),
      },
    });
  } catch (error) {
    console.error('Error exporting to Word:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tạo file Word. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
