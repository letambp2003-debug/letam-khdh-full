import { NextRequest, NextResponse } from 'next/server';
import { TaskHistoryService } from '@/services/history/task-history.service';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';
import { SaveTaskHistoryRequest } from '@/types/task-history.types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientProjectId = searchParams.get('projectId');
    const query = searchParams.get('q') || undefined;
    const typeFilter = searchParams.get('type') || undefined;

    const projectId = await resolveUserProjectIdFromRequest(req, clientProjectId);
    const tasks = await TaskHistoryService.getTasksByProject(projectId, query, typeFilter);

    return NextResponse.json({
      success: true,
      tasks,
      totalCount: tasks.length,
      projectId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi khi tải lịch sử nhiệm vụ.';
    console.error('Error in GET /api/task-history:', error);
    return NextResponse.json({ success: false, message: msg, tasks: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveTaskHistoryRequest = await req.json().catch(() => ({}));
    if (!body.fullOutput || !body.lessonCode) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin kết quả hoặc mã bài học.' },
        { status: 400 }
      );
    }

    const projectId = await resolveUserProjectIdFromRequest(req, body.projectId);
    const saved = await TaskHistoryService.recordTask(body, projectId);

    return NextResponse.json({
      success: true,
      task: saved,
      projectId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi khi lưu lịch sử nhiệm vụ.';
    console.error('Error in POST /api/task-history:', error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';
    const clientProjectId = searchParams.get('projectId');

    const projectId = await resolveUserProjectIdFromRequest(req, clientProjectId);

    if (clearAll) {
      await TaskHistoryService.clearAllTasks(projectId);
      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ lịch sử nhiệm vụ.' });
    }

    if (!taskId) {
      return NextResponse.json({ success: false, message: 'Cần cung cấp ID nhiệm vụ để xóa.' }, { status: 400 });
    }

    const deleted = await TaskHistoryService.deleteTask(taskId, projectId);
    return NextResponse.json({ success: deleted });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi khi xóa nhiệm vụ.';
    console.error('Error in DELETE /api/task-history:', error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
