import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { WorksheetDocxBuilder } from '@/services/worksheet/worksheet-docx-builder';
import { OOXmlValidator } from '@/services/export/ooxml-validator';
import { getEnv } from '@/config/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { markdown, lessonCode } = body;

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Nội dung phiếu học tập không được để trống.' },
        { status: 400 }
      );
    }

    const env = getEnv();
    const builder = new WorksheetDocxBuilder();
    const doc = builder.build(
      markdown,
      lessonCode || 'TOAN-8',
      env.SCHOOL_NAME,
      env.DEPARTMENT
    );

    const buffer = await Packer.toBuffer(doc);

    // Kiểm tra tính hợp lệ của gói Word
    const validation = await OOXmlValidator.validate(buffer);
    if (!validation.valid) {
      console.error('[WORKSHEET_DOCX_VALIDATION_FAILED]', validation.errors);
      return NextResponse.json(
        { success: false, message: `Lỗi đóng gói file Word: ${validation.errors.join('; ')}` },
        { status: 500 }
      );
    }

    const safeCode = (lessonCode || 'TOAN-8').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `PHT_${safeCode}_IN_AN_${dateStr}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Formulas-Count': String(builder.formulasConverted),
      },
    });
  } catch (error) {
    console.error('Error exporting worksheet to Word:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể xuất file Word Phiếu học tập.' },
      { status: 500 }
    );
  }
}
