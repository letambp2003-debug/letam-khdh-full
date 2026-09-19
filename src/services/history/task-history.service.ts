import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { TaskHistoryItem, TaskType, SaveTaskHistoryRequest } from '@/types/task-history.types';

function getHistoryStorageDir(): string {
  try {
    const localDir = path.join(process.cwd(), 'data', 'task-history');
    if (!fsSync.existsSync(localDir)) {
      fsSync.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'khdh-task-history');
    if (!fsSync.existsSync(tmpDir)) {
      fsSync.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const STORAGE_DIR = getHistoryStorageDir();
const memoryCache = new Map<string, TaskHistoryItem[]>();

export class TaskHistoryService {
  private static getProjectFilePath(projectId: string): string {
    const safeProjectId = projectId.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    return path.join(STORAGE_DIR, `${safeProjectId}.json`);
  }

  private static async loadProjectTasks(projectId: string): Promise<TaskHistoryItem[]> {
    if (memoryCache.has(projectId)) {
      return memoryCache.get(projectId)!;
    }

    try {
      const filePath = this.getProjectFilePath(projectId);
      if (fsSync.existsSync(filePath)) {
        const raw = await fs.readFile(filePath, 'utf-8');
        const list: TaskHistoryItem[] = JSON.parse(raw);
        memoryCache.set(projectId, list);
        return list;
      }
    } catch (err) {
      console.warn('Could not read task history file for project:', projectId, err);
    }

    memoryCache.set(projectId, []);
    return [];
  }

  private static async saveProjectTasks(projectId: string, tasks: TaskHistoryItem[]): Promise<void> {
    memoryCache.set(projectId, tasks);
    try {
      const filePath = this.getProjectFilePath(projectId);
      await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist task history file for project:', projectId, err);
    }
  }

  /**
   * Lấy danh sách nhiệm vụ đã làm của tài khoản người dùng
   */
  public static async getTasksByProject(
    projectId = 'usr_guest',
    searchQuery?: string,
    taskTypeFilter?: string
  ): Promise<TaskHistoryItem[]> {
    const tasks = await this.loadProjectTasks(projectId);
    let filtered = [...tasks];

    if (taskTypeFilter && taskTypeFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.taskType === taskTypeFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.lessonCode.toLowerCase().includes(q) ||
          (t.lessonTitle && t.lessonTitle.toLowerCase().includes(q)) ||
          t.taskLabel.toLowerCase().includes(q) ||
          t.command.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Lưu lại một nhiệm vụ đã thực thi
   */
  public static async recordTask(
    req: SaveTaskHistoryRequest,
    projectId = 'usr_guest',
    userEmail?: string
  ): Promise<TaskHistoryItem> {
    const tasks = await this.loadProjectTasks(projectId);
    const now = new Date().toISOString();
    const taskId = req.id || `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const snippet = req.resultSnippet || (req.fullOutput ? req.fullOutput.slice(0, 200).replace(/\n+/g, ' ') + '...' : '');

    const taskItem: TaskHistoryItem = {
      id: taskId,
      projectId,
      userEmail,
      taskType: req.taskType,
      taskLabel: req.taskLabel || this.getTaskTypeLabel(req.taskType),
      lessonCode: req.lessonCode,
      lessonTitle: req.lessonTitle,
      command: req.command,
      formatMode: req.formatMode,
      resultSnippet: snippet,
      fullOutput: req.fullOutput,
      tokenUsage: req.tokenUsage,
      modelUsed: req.modelUsed || 'Gemini Flash',
      durationMs: req.durationMs,
      keyUsed: req.keyUsed,
      status: 'SUCCESS',
      createdAt: now,
    };

    // Giữ tối đa 100 tác vụ gần nhất cho mỗi người dùng
    const updated = [taskItem, ...tasks.filter((t) => t.id !== taskId)].slice(0, 100);
    await this.saveProjectTasks(projectId, updated);

    return taskItem;
  }

  /**
   * Xóa một nhiệm vụ khỏi lịch sử
   */
  public static async deleteTask(taskId: string, projectId = 'usr_guest'): Promise<boolean> {
    const tasks = await this.loadProjectTasks(projectId);
    const updated = tasks.filter((t) => t.id !== taskId);
    if (updated.length !== tasks.length) {
      await this.saveProjectTasks(projectId, updated);
      return true;
    }
    return false;
  }

  /**
   * Xóa toàn bộ lịch sử của người dùng
   */
  public static async clearAllTasks(projectId = 'usr_guest'): Promise<boolean> {
    await this.saveProjectTasks(projectId, []);
    return true;
  }

  public static getTaskTypeLabel(type: TaskType): string {
    switch (type) {
      case 'SOAN_KHDH_V11':
        return '✍️ KHDH V11-2 (Không Tách Tiết)';
      case 'SOAN_KHDH_TACH_TIET':
        return '✂️ KHDH V10.1 (Tách Tiết PPCT)';
      case 'PHAN_TICH_BAI_HOC':
        return '🔍 Phân Tích YCCĐ & Năng Lực';
      case 'PHIEU_HOC_TAP':
        return '📄 Phiếu Học Tập & Prompt A4 8K';
      case 'TRO_CHOI_GAME':
        return '🎮 Trò Chơi Toán HTML5';
      case 'KICH_BAN_VIDEO':
        return '🎬 Kịch Bản Video Google Flow 8s';
      case 'TRICH_XUAT_DANH_MUC':
        return '📑 Danh Mục & Ma Trận PPCT';
      default:
        return '⚡ Nhiệm Vụ KHDH';
    }
  }
}
