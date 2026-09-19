import { NextRequest, NextResponse } from 'next/server';
import { SourceDocumentService } from '@/services/documents/source-document.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await SourceDocumentService.getById(id);
    if (!doc) {
      return NextResponse.json({ success: false, message: 'Tài liệu không tồn tại' }, { status: 404 });
    }
    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('API Error in GET /api/documents/[id]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await SourceDocumentService.update(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Tài liệu không tồn tại' }, { status: 404 });
    }
    const readiness = await SourceDocumentService.getReadiness(updated.projectId);
    return NextResponse.json({ success: true, document: updated, readiness });
  } catch (error) {
    console.error('API Error in PATCH /api/documents/[id]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi cập nhật tài liệu' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await SourceDocumentService.getById(id);
    if (!doc) {
      return NextResponse.json({ success: false, message: 'Tài liệu không tồn tại' }, { status: 404 });
    }
    const deleted = await SourceDocumentService.delete(id);
    const readiness = await SourceDocumentService.getReadiness(doc.projectId);
    return NextResponse.json({ success: deleted, message: 'Đã xóa tài liệu nguồn.', readiness });
  } catch (error) {
    console.error('API Error in DELETE /api/documents/[id]:', error);
    return NextResponse.json({ success: false, message: 'Lỗi xóa tài liệu' }, { status: 500 });
  }
}
