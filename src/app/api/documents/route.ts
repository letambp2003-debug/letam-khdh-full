export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { SourceDocumentService } from '@/services/documents/source-document.service';
import { SourceDocumentType } from '@/types/source-document';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Always resolve project ID from the authenticated JWT session cookie.
    // Never trust the client-supplied projectId parameter to prevent cross-user data access.
    const projectId = await resolveUserProjectIdFromRequest(request);
    const documents = await SourceDocumentService.getAll(projectId);
    const readiness = await SourceDocumentService.getReadiness(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      documents,
      readiness,
    });
  } catch (error) {
    console.error('API Error in GET /api/documents:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách tài liệu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const preferredType = formData.get('documentType') as SourceDocumentType | undefined;
    // SECURITY: Always resolve project ID from the authenticated JWT session cookie.
    const projectId = await resolveUserProjectIdFromRequest(request);

    const allFiles: File[] = [];
    if (singleFile) allFiles.push(singleFile);
    if (files && files.length > 0) {
      for (const f of files) {
        if (!allFiles.includes(f)) allFiles.push(f);
      }
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn ít nhất 1 tệp tài liệu để tải lên.' }, { status: 400 });
    }

    const createdDocs = [];
    for (const f of allFiles) {
      if (!f.name || f.size === 0) continue;
      const buffer = Buffer.from(await f.arrayBuffer());
      const doc = await SourceDocumentService.create(
        {
          name: f.name,
          size: f.size,
          type: f.type,
          buffer,
        },
        preferredType,
        projectId
      );
      createdDocs.push(doc);
    }

    const readiness = await SourceDocumentService.getReadiness(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      documents: createdDocs,
      document: createdDocs[0],
      message: `Đã tải lên thành công ${createdDocs.length} tài liệu nguồn vào không gian riêng của bạn.`,
      readiness,
    });
  } catch (error) {
    console.error('API Error in POST /api/documents:', error);
    return NextResponse.json({ success: false, message: 'Lỗi trong quá trình tải tài liệu lên máy chủ.' }, { status: 500 });
  }
}
