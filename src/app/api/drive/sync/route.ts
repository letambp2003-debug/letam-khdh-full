import { NextRequest, NextResponse } from 'next/server';
import { SourceDocumentService } from '@/services/documents/source-document.service';
import { TaskHistoryService } from '@/services/history/task-history.service';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientProjectId, userEmail } = body;

    const projectId = await resolveUserProjectIdFromRequest(req, clientProjectId);
    const docs = await SourceDocumentService.getAll(projectId);
    const tasks = await TaskHistoryService.getTasksByProject(projectId);

    const backupPayload = {
      userEmail: userEmail || projectId.replace('usr_', ''),
      projectId,
      timestamp: new Date().toISOString(),
      sourceDocumentsCount: docs.length,
      taskHistoryCount: tasks.length,
      sourceDocuments: docs.map((d) => ({
        id: d.id,
        name: d.displayName,
        fileName: d.originalFileName,
        type: d.documentType,
        summary: d.contentSummary,
        text: d.extractedText,
        createdAt: d.createdAt,
      })),
      recentTasks: tasks.slice(0, 20).map((t) => ({
        id: t.id,
        type: t.taskType,
        label: t.taskLabel,
        lessonCode: t.lessonCode,
        command: t.command,
        createdAt: t.createdAt,
      })),
    };

    return NextResponse.json({
      success: true,
      backupPayload,
      message: `Đã đóng gói dữ liệu không gian riêng của Thầy/Cô (${docs.length} tài liệu nguồn, ${tasks.length} nhiệm vụ) sẵn sàng sao lưu Google Drive.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi khi chuẩn bị sao lưu Google Drive.';
    console.error('Error in /api/drive/sync:', error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
