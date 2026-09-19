import { NextRequest, NextResponse } from 'next/server';
import { SourceDocumentService } from '@/services/documents/source-document.service';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientProjectId = formData.get('projectId') as string | null;
    const projectId = await resolveUserProjectIdFromRequest(request, clientProjectId);

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn tệp mới để thay thế.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { oldDoc, newDoc } = await SourceDocumentService.replace(
      id,
      {
        name: file.name,
        size: file.size,
        type: file.type,
        buffer,
      },
      projectId
    );

    const readiness = await SourceDocumentService.getReadiness(newDoc.projectId);

    return NextResponse.json({
      success: true,
      message: `Đã thay thế tài liệu thành công (Phiên bản mới: v${newDoc.version}).`,
      document: newDoc,
      oldDocument: oldDoc,
      readiness,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/documents/[id]/replace:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Lỗi thay thế tài liệu' }, { status: 500 });
  }
}
