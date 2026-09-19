import { TaskHistoryItem, TaskType } from '@/types/task-history.types';
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ApiKeyService } from '@/services/ai/api-key.service';
import type { MultiKeyTestResult } from '@/services/ai/ai.types';
import type { SourceDocument, SourceDocumentType, SourceReadinessReport } from '@/types/source-document';
import type {
  VideoStoryboardData,
  VideoStyleId,
  VideoGenreId,
} from '@/types/video-storyboard.types';
import {
  VIDEO_STYLES,
  VIDEO_GENRES,
  SCENE_COUNT_OPTIONS,
} from '@/types/video-storyboard.types';
import type { LessonRequirementAnalysis } from '@/types/lesson-analysis.types';
import type { CurriculumCatalog, CatalogLessonItem } from '@/types/curriculum-catalog.types';

const COMMANDS = [
  { id: 'SOAN_4_PHAN_LIEN_HOAN', label: '✨ Soạn liên hoàn 4 Phần (Đầy đủ 100%)', desc: 'Chạy tuần tự 4 giai đoạn A-B-C-D rồi ghép nối liền mạch (Không bị cắt ngắn)' },
  { id: 'DANH_MUC', label: '📑 Danh mục bài học (Trích xuất)', desc: 'Trích xuất toàn bộ danh mục bài học, số tiết, tuần từ PL1/PPCT' },
  { id: 'SOAN_V11_KHONG_TACH_TIET', label: '📄 Soạn KHDH V11 (1 lượt)', desc: 'Tiến trình 4 phần A-B-C-D liền mạch (V11-2 FINAL)' },
  { id: 'SOAN_XUAT', label: '✂️ Soạn KHDH (Tách tiết)', desc: 'Phân chia theo từng Tiết PPCT (V10.1)' },
  { id: 'SOAN_PHAN_A', label: '🚩 Phần A: Khởi động & Mục tiêu', desc: 'Soạn Mục tiêu, Thiết bị & Hoạt động mở đầu' },
  { id: 'SOAN_PHAN_B', label: '💡 Phần B: Hình thành kiến thức', desc: 'Soạn chuyên sâu từng hoạt động khám phá & TikZ' },
  { id: 'SOAN_PHAN_C', label: '📝 Phần C: Luyện tập phân hóa', desc: 'Soạn hệ thống bài tập và lời giải chi tiết' },
  { id: 'SOAN_PHAN_D', label: '🚀 Phần D: Vận dụng & Về nhà', desc: 'Soạn tình huống thực tế và hướng dẫn tự học' },
  { id: 'KHOI_DONG', label: '🚀 Khởi động & Kiểm tra', desc: 'Lập chỉ mục nguồn & kiểm tra hệ thống' },
  { id: 'RA_SOAT_NHANH', label: '🔍 Rà soát nhanh (Delta QA)', desc: 'Kiểm tra lỗi và độ khớp nguồn' },
  { id: 'KIEM_TRA_TOAN', label: '📐 Kiểm tra Toán & OMML', desc: 'Chuẩn hóa công thức & Word Equation' },
  { id: 'TAO_SLIDE_NGHIEN_CUU', label: '📊 Tạo Slide nghiên cứu', desc: '15-20 slide chuẩn sư phạm mỗi tiết' },
  { id: 'XUAT_CANVA_PROMPT', label: '🎨 Xuất Canva Prompt', desc: 'Mã prompt độc lập cho từng slide' }
];

const DOC_TYPE_LABELS: Record<SourceDocumentType, { label: string; icon: string; badgeClass: string; desc: string }> = {
  PL1: {
    label: 'Phụ lục I',
    icon: '⭐',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    desc: 'Ưu tiên số 1: Danh mục bài, số tiết, YCCĐ, phân phối tiến trình.'
  },
  PPCT: {
    label: 'PPCT (Phân phối CT)',
    icon: '📘',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    desc: 'Ưu tiên số 2: Thứ tự bài, số tiết, tuần học.'
  },
  SGK: {
    label: 'Sách giáo khoa (SGK)',
    icon: '📗',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    desc: 'Nguồn kiến thức môn học chính: Thuật ngữ, công thức, ví dụ chuẩn.'
  },
  KHDH_OLD: {
    label: 'KHDH cũ (Tham khảo)',
    icon: '📙',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    desc: 'Tài liệu tham khảo cấu trúc & hoạt động. Không ghi đè nguồn chính.'
  },
  OTHER: {
    label: 'Tài liệu khác',
    icon: '📄',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    desc: 'SBT, SGV, Phụ lục III, Khung năng lực số, Tài liệu địa phương...'
  }
};

interface UserSession {
  email: string;
  name: string;
  picture?: string;
  role: string;
  hasConfiguredKeys: boolean;
  keyCount: number;
}

interface OutputData {
  status: string;
  job_id: string;
  command: string;
  format_mode?: 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION';
  lesson_code: string;
  khdh_draft: string;
  token_usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model?: string;
  duration_ms?: number;
  key_used?: string;
  sources_used?: { id: string; name: string; type: SourceDocumentType; version: number }[];
  source_readiness?: SourceReadinessReport;
}


/**
 * Helper phân tích JSON an toàn: Không bao giờ ném lỗi Unexpected token 'R'
 * nếu máy chủ trả về mã lỗi 413, 502, 504 hoặc văn bản thô
 */
async function parseSafeJson(res: Response): Promise<{ success: boolean; [key: string]: any }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      // Fallback nếu JSON bị lỗi cú pháp
    }
  }

  const rawText = await res.text().catch(() => '');
  if (res.status === 413 || rawText.includes('Request Entity Too Large') || rawText.includes('bodySizeLimit')) {
    throw new Error('Tệp tải lên quá lớn (vượt quá giới hạn máy chủ). Vui lòng chọn tệp nhỏ hơn hoặc nạp SGK theo từng Chương / Bài.');
  }
  if (res.status === 504 || res.status === 502) {
    throw new Error('Máy chủ phản hồi chậm hoặc tạm thời quá tải (Gateway Timeout). Vui lòng thử lại sau giây lát.');
  }
  if (!res.ok) {
    throw new Error(rawText ? `Lỗi máy chủ (${res.status}): ${rawText.slice(0, 180)}` : `Lỗi máy chủ (HTTP ${res.status})`);
  }
  return { success: true, message: rawText };
}

export default function Home() {
  // Authentication & User Vault State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [command, setCommand] = useState('SOAN_V11_KHONG_TACH_TIET');
  const [khdhFormatMode, setKhdhFormatMode] = useState<'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION'>('CONTINUOUS_4SECTION');
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán');
  const [selectedGrade, setSelectedGrade] = useState<'Lớp 9' | 'Lớp 8' | 'Lớp 7' | 'Lớp 6'>('Lớp 8');
  const [lessonCode, setLessonCode] = useState('TOAN-8-HKI-C01-STT01');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'draft' | 'preview' | 'catalog' | 'worksheet' | 'game' | 'storyboard' | 'slide' | 'sources' | 'history' | 'stats'>('draft');
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [taskHistoryQuery, setTaskHistoryQuery] = useState('');
  const [taskHistoryTypeFilter, setTaskHistoryTypeFilter] = useState<string>('ALL');
  const [showDriveSyncModal, setShowDriveSyncModal] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [driveSyncStatus, setDriveSyncStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputData, setOutputData] = useState<OutputData | null>(null);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [exportingWord, setExportingWord] = useState(false);
  const [showWordMenu, setShowWordMenu] = useState(false);

  // Worksheet State
  const [worksheetMarkdown, setWorksheetMarkdown] = useState<string | null>(null);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);
  const [exportingWorksheetWord, setExportingWorksheetWord] = useState(false);

  // Interactive HTML Game State
  const [gameHtml, setGameHtml] = useState<string | null>(null);
  const [generatingGame, setGeneratingGame] = useState(false);
  const [selectedGameTemplate, setSelectedGameTemplate] = useState<'SPACE_QUIZ' | 'LUCKY_WHEEL' | 'MEMORY_MATCH'>('SPACE_QUIZ');

  // Video Storyboard State (Google Flow 8s Config)
  const [storyboardData, setStoryboardData] = useState<VideoStoryboardData | null>(null);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<VideoStyleId>('PIXAR_3D');
  const [selectedVideoGenre, setSelectedVideoGenre] = useState<VideoGenreId>('CONCEPT_EXPLORATION');
  const [selectedNumScenes8s, setSelectedNumScenes8s] = useState<number>(5);

  // Lesson Requirement Analysis & Locked Configuration State
  const [lessonAnalysis, setLessonAnalysis] = useState<LessonRequirementAnalysis | null>(null);
  const [analyzingLesson, setAnalyzingLesson] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isConfigLocked, setIsConfigLocked] = useState(false);

  // Curriculum Catalog State (Ma trận danh mục bài học)
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogData, setCatalogData] = useState<CurriculumCatalog | null>(null);
  const [extractingCatalog, setExtractingCatalog] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogTermFilter, setCatalogTermFilter] = useState<'ALL' | 'Học kỳ I' | 'Học kỳ II'>('ALL');
  const [savedCatalogSuccess, setSavedCatalogSuccess] = useState(false);
  const [selectedCatalogLessonCode, setSelectedCatalogLessonCode] = useState('');

  // Multi-Key State
  const [showSettings, setShowSettings] = useState(false);
  const [rawKeysInput, setRawKeysInput] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [multiKeyResult, setMultiKeyResult] = useState<MultiKeyTestResult | null>(null);
  const [configuredKeyCount, setConfiguredKeyCount] = useState(0);

  // Source Documents State
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [readiness, setReadiness] = useState<SourceReadinessReport | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SourceDocument | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<{ id: string; displayName: string; documentType: SourceDocumentType } | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<SourceDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadTypeRef = useRef<SourceDocumentType | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Google Client ID state
  const [googleClientId, setGoogleClientId] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '497311553353-sjkaf83820uim4tecedosk1pd512josg.apps.googleusercontent.com'
  );
  const [showGcpGuideModal, setShowGcpGuideModal] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement | null>(null);

  const getUserWorkspaceId = (user: UserSession | null): string => {
    if (!user || !user.email) return 'usr_guest';
    return 'usr_' + user.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  };


  const fetchSavedCatalog = async (wsIdOverride?: string) => {
    try {
      const wsId = wsIdOverride || getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/extract-catalog?projectId=${encodeURIComponent(wsId)}`);
      const data = await res.json();
      if (data.success && data.catalog) {
        setCatalogData(data.catalog);
        try {
          localStorage.setItem(`khdh_catalog_${wsId}`, JSON.stringify(data.catalog));
        } catch {}
      }
    } catch (err) {
      console.warn('Error fetching saved catalog:', err);
    }
  };

  // Check session and load documents on mount
  useEffect(() => {
    checkUserSession();

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authErr = searchParams.get('auth_error');
      if (authErr) {
        if (authErr === 'MISSING_GOOGLE_CLIENT_ID' || authErr === 'MISSING_CLIENT_ID') {
          setError('Chưa cấu hình Google Client ID trên máy chủ. Bạn có thể nhập Email Google bên dưới để đăng nhập tức thì hoặc nhập Client ID trong phần cài đặt.');
        } else {
          setError(`Đăng nhập Google không thành công (${authErr}). Vui lòng thử lại hoặc đăng nhập bằng Email Google.`);
        }
      }
    }

    // Check localStorage for saved Google Client ID if any
    const savedClientId = localStorage.getItem('khdh_google_client_id');
    if (savedClientId) {
      setGoogleClientId(savedClientId);
    }

    // NOTE: catalog is NOT loaded from localStorage here anymore.
    // It will be loaded per-user after login in the currentUser effect below,
    // using a user-specific key to prevent cross-user data leakage.
  }, []);

  // Fetch documents and state whenever user changes or on app load
  useEffect(() => {
    // 1. CLEAR ALL STATE from the previous user to prevent cross-user data leakage
    setCatalogData(null);
    setDocuments([]);
    setReadiness(null);
    setOutputData(null);
    setTaskHistory([]);
    setSelectedCatalogLessonCode('');

    // 2. If logged out, nothing more to do
    if (!currentUser?.email) return;

    const wsId = getUserWorkspaceId(currentUser);

    // 3. Load per-user catalog from localStorage using user-specific key
    const userCatalogKey = `khdh_catalog_${wsId}`;
    try {
      const savedCat = localStorage.getItem(userCatalogKey);
      if (savedCat) {
        const parsedCat = JSON.parse(savedCat);
        setCatalogData(parsedCat);
      }
    } catch {}

    // 4. Load user's own documents, history, and catalog from server
    fetchDocuments(wsId);
    fetchTaskHistory(wsId);
    fetchSavedCatalog(wsId);
  }, [currentUser?.email]);

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    const activeClientId = googleClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '497311553353-sjkaf83820uim4tecedosk1pd512josg.apps.googleusercontent.com';
    if (!activeClientId) return;

    const interval = setInterval(() => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        clearInterval(interval);
        try {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: activeClientId,
            callback: (response: { credential: string }) => {
              if (response?.credential) {
                handleGoogleLogin({ credential: response.credential });
              }
            },
            auto_select: false,
          });

          if (googleBtnContainerRef.current) {
            // @ts-ignore
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              logo_alignment: 'left',
              width: 320,
            });
          }
        } catch (e) {
          console.error('Error initializing Google GIS:', e);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [googleClientId, currentUser]);

  const checkUserSession = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        setConfiguredKeyCount(data.user.keyCount || 0);
        if (!data.user.hasConfiguredKeys) {
          setShowOnboardingModal(true);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async (profileData?: { email?: string; name?: string; picture?: string; credential?: string }) => {
    setLoggingIn(true);
    setError(null);
    try {
      let body: { email?: string; name?: string; picture?: string; credential?: string };

      if (profileData?.credential) {
        body = { credential: profileData.credential };
      } else if (profileData?.email) {
        body = {
          email: profileData.email.trim().toLowerCase(),
          name: profileData.name?.trim() || profileData.email.split('@')[0],
          picture: profileData.picture || '',
        };
      } else {
        const email = loginEmailInput.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          throw new Error('Vui lòng nhập địa chỉ Email Google của bạn (ví dụ: gv.toantin@gmail.com).');
        }
        const name = loginNameInput.trim() || email.split('@')[0];
        body = {
          email,
          name,
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        };
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Đăng nhập Google thất bại.');
      }

      setCurrentUser(data.user);
      setConfiguredKeyCount(data.user.keyCount || 0);

      if (data.isFirstTime || !data.user.hasConfiguredKeys) {
        setShowOnboardingModal(true);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Lỗi kết nối khi đăng nhập.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSaveOnboardingKeys = async () => {
    if (currentParsedKeys.length === 0) {
      setError('Vui lòng nhập ít nhất 1 Google AI API Key để kích hoạt tài khoản.');
      return;
    }

    setTestingKey(true);
    try {
      const res = await fetch('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: currentParsedKeys }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể lưu API Key.');
      }

      ApiKeyService.saveClientKeys(currentParsedKeys, true);
      setConfiguredKeyCount(currentParsedKeys.length);

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          hasConfiguredKeys: true,
          keyCount: currentParsedKeys.length,
        });
      }

      setShowOnboardingModal(false);
      setShowSettings(false);
      alert('Kích hoạt thành công! API Key đã được mã hóa an toàn và lưu giữ vĩnh viễn theo tài khoản Google của Thầy/Cô.');
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Lỗi khi lưu API Key.');
    } finally {
      setTestingKey(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    // Clear ALL user-specific state completely
    setCurrentUser(null);
    setDocuments([]);
    setReadiness(null);
    setCatalogData(null);
    setOutputData(null);
    setTaskHistory([]);
    setSelectedCatalogLessonCode('');
    ApiKeyService.clearClientKeys();
    setConfiguredKeyCount(0);
    setRawKeysInput('');
  };

  const currentParsedKeys = ApiKeyService.parseKeys(rawKeysInput);

  
  const fetchTaskHistory = async (wsIdOverride?: string) => {
    setLoadingHistory(true);
    try {
      const wsId = wsIdOverride || getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/task-history?projectId=${encodeURIComponent(wsId)}`);
      const data = await res.json();
      if (data.success) {
        setTaskHistory(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching task history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRecordTaskHistory = async (
    taskType: TaskType,
    lessonCodeStr: string,
    commandStr: string,
    fullOutputStr: string,
    formatModeStr?: 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION',
    tokenUsageObj?: { inputTokens: number; outputTokens: number; totalTokens: number },
    modelStr?: string,
    durationMsNum?: number,
    keyUsedStr?: string
  ) => {
    try {
      const wsId = getUserWorkspaceId(currentUser);
      await fetch('/api/task-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: wsId,
          userEmail: currentUser?.email,
          taskType,
          lessonCode: lessonCodeStr,
          command: commandStr,
          formatMode: formatModeStr,
          fullOutput: fullOutputStr,
          tokenUsage: tokenUsageObj,
          modelUsed: modelStr,
          durationMs: durationMsNum,
          keyUsed: keyUsedStr,
        }),
      });
      fetchTaskHistory(wsId);
    } catch (err) {
      console.warn('Could not record task history:', err);
    }
  };

  const handleRerunTask = (task: TaskHistoryItem) => {
    setLessonCode(task.lessonCode);
    setCommand(task.command);
    if (task.formatMode) {
      setKhdhFormatMode(task.formatMode);
    }
    setActiveTab('draft');

    if (task.taskType === 'SOAN_KHDH_V11' || task.taskType === 'SOAN_KHDH_TACH_TIET') {
      handleSubmit(undefined, undefined, task.command, task.formatMode, task.lessonCode);
    } else if (task.taskType === 'PHAN_TICH_BAI_HOC') {
      handleAnalyzeLesson(task.lessonCode);
    } else {
      handleSubmit(undefined, undefined, task.command, task.formatMode, task.lessonCode);
    }
  };

  const handleViewTaskResult = (task: TaskHistoryItem) => {
    setOutputData({
      status: 'OK',
      job_id: task.id,
      command: task.command,
      format_mode: task.formatMode,
      lesson_code: task.lessonCode,
      khdh_draft: task.fullOutput,
      token_usage: task.tokenUsage,
      model: task.modelUsed,
      duration_ms: task.durationMs,
      key_used: task.keyUsed,
    });

    if (task.taskType === 'PHIEU_HOC_TAP') {
      setWorksheetMarkdown(task.fullOutput);
      setActiveTab('worksheet');
    } else if (task.taskType === 'TRO_CHOI_GAME') {
      setGameHtml(task.fullOutput);
      setActiveTab('game');
    } else {
      setActiveTab('draft');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/task-history?id=${encodeURIComponent(taskId)}&projectId=${encodeURIComponent(wsId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTaskHistory((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleClearAllTasks = async () => {
    if (!confirm('Thầy/Cô có chắc chắn muốn xóa toàn bộ lịch sử nhiệm vụ không?')) return;
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/task-history?clearAll=true&projectId=${encodeURIComponent(wsId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTaskHistory([]);
      }
    } catch (err) {
      console.error('Error clearing tasks:', err);
    }
  };

  const handleDriveBackup = async () => {
    setDriveSyncing(true);
    setDriveSyncStatus(null);
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientProjectId: wsId,
          userEmail: currentUser?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDriveSyncStatus(data.message || 'Sao lưu thành công!');
      } else {
        throw new Error(data.message || 'Lỗi khi sao lưu.');
      }
    } catch (err) {
      setDriveSyncStatus('Lỗi: ' + ((err as Error)?.message || 'Không thể sao lưu'));
    } finally {
      setDriveSyncing(false);
    }
  };

  const handleDownloadBackupJson = async () => {
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientProjectId: wsId, userEmail: currentUser?.email }),
      });
      const data = await res.json();
      if (data.backupPayload) {
        const jsonStr = JSON.stringify(data.backupPayload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BACKUP_KHDH_${currentUser?.email ? currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : 'GUEST'}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('Lỗi tải tệp sao lưu: ' + (e as Error)?.message);
    }
  };


  const fetchDocuments = async (wsIdOverride?: string) => {
    setDocLoading(true);
    try {
      const wsId = wsIdOverride || getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/documents?projectId=${encodeURIComponent(wsId)}`);
      const data = await parseSafeJson(res);
      if (data.success) {
        setDocuments(data.documents || []);
        setReadiness(data.readiness || null);

        // Tự động nhận diện MÔN HỌC và KHỐI LỚP từ tài liệu nạp lên
        const docText = (data.documents || [])
          .map((d: SourceDocument) => `${d.displayName} ${d.originalFileName} ${d.contentSummary || ''}`)
          .join(' ')
          .toLowerCase();

        let detectedSub = selectedSubject;
        if (/(toán|toan|đại\s*số|hình\s*học)/i.test(docText)) {
          detectedSub = 'Toán';
        } else if (/(lịch\s*sử|lich\s*su|ls\s*&?\s*đl|sử\s*[6789]|lichsu)/i.test(docText)) {
          detectedSub = 'Lịch sử';
        } else if (/(địa\s*l[íy]|dia\s*li|địa\s*[6789])/i.test(docText)) {
          detectedSub = 'Địa lí';
        } else if (/(ngữ\s*văn|ngu\s*van|văn\s*[6789])/i.test(docText)) {
          detectedSub = 'Ngữ văn';
        } else if (/(khoa\s*học\s*tự\s*nhiên|khtn|vật\s*l[íy]|hóa\s*học|sinh\s*học)/i.test(docText)) {
          detectedSub = 'Khoa học tự nhiên';
        } else if (/(tin\s*học|tin\s*hoc|tin\s*[6789])/i.test(docText)) {
          detectedSub = 'Tin học';
        } else if (/(tiếng\s*anh|english|tienganh)/i.test(docText)) {
          detectedSub = 'Tiếng Anh';
        }
        setSelectedSubject(detectedSub);

        let detectedG = selectedGrade;
        if (/(lớp\s*8|lop\s*8|k8|khoi\s*8|khối\s*8|-8-|_8_|toan8|toán8|[_\-\s]8[_\-\.\s])/i.test(docText)) {
          detectedG = 'Lớp 8';
          setSelectedGrade('Lớp 8');
        } else if (/(lớp\s*9|lop\s*9|k9|khoi\s*9|khối\s*9|-9-|_9_|toan9|toán9|[_\-\s]9[_\-\.\s])/i.test(docText)) {
          detectedG = 'Lớp 9';
          setSelectedGrade('Lớp 9');
        } else if (/(lớp\s*7|lop\s*7|k7|khoi\s*7|khối\s*7|-7-|_7_|toan7|toán7|[_\-\s]7[_\-\.\s])/i.test(docText)) {
          detectedG = 'Lớp 7';
          setSelectedGrade('Lớp 7');
        } else if (/(lớp\s*6|lop\s*6|k6|khoi\s*6|khối\s*6|-6-|_6_|toan6|toán6|[_\-\s]6[_\-\.\s])/i.test(docText)) {
          detectedG = 'Lớp 6';
          setSelectedGrade('Lớp 6');
        }

      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setDocLoading(false);
    }
  };

  const handleTriggerUpload = (type?: SourceDocumentType) => {
    pendingUploadTypeRef.current = type;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const wsId = getUserWorkspaceId(currentUser);
    const formData = new FormData();
    formData.append('projectId', wsId);
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    if (pendingUploadTypeRef.current) {
      formData.append('documentType', pendingUploadTypeRef.current);
    }

    setDocLoading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const data = await parseSafeJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi tải tài liệu');
      }

      // Purge old cached catalog immediately so the new document is read fresh
      try {
        localStorage.removeItem(`khdh_catalog_${wsId}`);
      } catch {}
      setCatalogData(null);

      // Cập nhật danh sách tài liệu trước
      await fetchDocuments(wsId);

      // Tự động trích xuất danh mục từ tệp vừa tải lên
      handleExtractCatalogServerSide(true);

    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi tải tệp';
      setError(msg);
    } finally {
      setDocLoading(false);
      pendingUploadTypeRef.current = undefined;
    }
  };

  const handleTriggerReplace = (docId: string) => {
    setReplacingDocId(docId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !replacingDocId) return;

    const wsId = getUserWorkspaceId(currentUser);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', wsId);

    setDocLoading(true);
    try {
      const res = await fetch(`/api/documents/${replacingDocId}/replace`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi thay thế tài liệu');
      }
      await fetchDocuments(wsId);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi thay thế tệp';
      setError(msg);
    } finally {
      setDocLoading(false);
      setReplacingDocId(null);
    }
  };

  const handleToggleDocActive = async (id: string, currentActive: boolean) => {
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        await fetchDocuments(wsId);
      }
    } catch (err) {
      console.error('Error toggling document:', err);
    }
  };

  const handleSaveDocEdit = async () => {
    if (!editingDoc) return;
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editingDoc.displayName,
          documentType: editingDoc.documentType,
        }),
      });
      if (res.ok) {
        setEditingDoc(null);
        await fetchDocuments(wsId);
      }
    } catch (err) {
      console.error('Error updating document:', err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmDoc(null);
        await fetchDocuments(wsId);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const handleTestKeys = async () => {
    if (currentParsedKeys.length === 0) {
      setMultiKeyResult({
        success: false,
        totalKeys: 0,
        activeKeys: 0,
        message: 'Vui lòng nhập ít nhất 1 Google AI API Key để kiểm tra.',
        details: [],
      });
      return;
    }

    setTestingKey(true);
    setMultiKeyResult(null);

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: currentParsedKeys }),
      });

      const data: MultiKeyTestResult = await res.json();
      setMultiKeyResult(data);

      if (data.activeKeys > 0) {
        setConfiguredKeyCount(currentParsedKeys.length);
      }
    } catch {
      setMultiKeyResult({
        success: false,
        totalKeys: currentParsedKeys.length,
        activeKeys: 0,
        message: 'Không thể kết nối đến máy chủ kiểm tra API Key.',
        details: [],
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveSettings = () => {
    if (currentParsedKeys.length > 0) {
      ApiKeyService.saveClientKeys(currentParsedKeys, rememberKey);
      setConfiguredKeyCount(currentParsedKeys.length);
    } else {
      ApiKeyService.clearClientKeys();
      setConfiguredKeyCount(0);
    }
    setShowSettings(false);
  };

  const handleCommandClick = (cmdId: string) => {
    setCommand(cmdId);
    if (cmdId === 'DANH_MUC') {
      handleExtractCatalog();
    }
  };


  const handleSwitchGrade = (newGrade: 'Lớp 9' | 'Lớp 8' | 'Lớp 7' | 'Lớp 6') => {
    setSelectedGrade(newGrade);
    const num = newGrade.replace(/[^0-9]/g, '');
    const subPrefix = selectedSubject.includes('Sử') ? 'SU' : selectedSubject.includes('Văn') ? 'VAN' : selectedSubject.includes('KHTN') ? 'KHTN' : selectedSubject.includes('Tin') ? 'TIN' : selectedSubject.includes('Địa') ? 'DIA' : selectedSubject.includes('Anh') ? 'ENG' : 'TOAN';
    setLessonCode(`${subPrefix}-${num}-HKI-C01-STT01`);
    setSelectedCatalogLessonCode('');
    setCatalogData(null);
    try {
      const wsId = getUserWorkspaceId(currentUser);
      localStorage.removeItem(`khdh_catalog_${wsId}`);
    } catch {}
    handleExtractCatalogServerSide(true, newGrade, selectedSubject);
  };

  const handleResetCatalogCache = () => {
    const wsId = getUserWorkspaceId(currentUser);
    localStorage.removeItem(`khdh_catalog_${wsId}`);
    setCatalogData(null);
    handleExtractCatalogServerSide(true, selectedGrade, selectedSubject);
  };

  const handleSwitchSubject = (newSubject: string) => {
    setSelectedSubject(newSubject);
    const num = selectedGrade.replace(/[^0-9]/g, '');
    const subPrefix = newSubject.includes('Sử') ? 'SU' : newSubject.includes('Văn') ? 'VAN' : newSubject.includes('KHTN') ? 'KHTN' : newSubject.includes('Tin') ? 'TIN' : newSubject.includes('Địa') ? 'DIA' : newSubject.includes('Anh') ? 'ENG' : 'TOAN';
    setLessonCode(`${subPrefix}-${num}-HKI-C01-STT01`);
    setSelectedCatalogLessonCode('');
    setCatalogData(null);
    try {
      const wsId = getUserWorkspaceId(currentUser);
      localStorage.removeItem(`khdh_catalog_${wsId}`);
    } catch {}
    handleExtractCatalogServerSide(true, selectedGrade, newSubject);
  };

  const handleResetAllSystemData = async () => {
    if (!confirm('Thầy/Cô có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu cũ, bộ nhớ đệm và đặt lại hệ thống từ đầu không?')) return;
    try {
      const wsId = getUserWorkspaceId(currentUser);
      localStorage.removeItem(`khdh_catalog_${wsId}`);
      setCatalogData(null);
      setOutputData(null);
      setDocuments([]);
      setTaskHistory([]);
      setReadiness(null);
      await fetch('/api/extract-catalog?projectId=' + encodeURIComponent(wsId), { method: 'DELETE' });
      await fetch('/api/task-history?clearAll=true&projectId=' + encodeURIComponent(wsId), { method: 'DELETE' });
      await fetchDocuments(wsId);
      alert('Đã xóa sạch toàn bộ dữ liệu đệm thành công! Hệ thống sẵn sàng với tệp mới của Thầy/Cô.');
    } catch {
      alert('Đã làm mới dữ liệu cục bộ.');
    }
  };

  /**
   * Trích xuất danh mục thuần từ phía server, KHÔNG gửi documentIds
   * Dùng sau khi upload file mới để tránh race condition với React state
   */
  const handleExtractCatalogServerSide = async (
    forceRefresh: boolean,
    overrideGrade?: 'Lớp 9' | 'Lớp 8' | 'Lớp 7' | 'Lớp 6',
    overrideSubject?: string
  ) => {
    const targetGrade = overrideGrade || selectedGrade;
    const targetSubject = overrideSubject || selectedSubject;
    setExtractingCatalog(true);
    setError(null);
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();

      const res = await fetch('/api/extract-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: targetGrade,
          subject: targetSubject,
          apiKeys: activeKeys,
          // QUAN TRỌNG: KHÔNG gửi documentIds — server tự lấy TẤT CẢ active docs
          projectId: wsId,
          forceRefresh: true,
        }),
      });

      const data = await parseSafeJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể trích xuất danh mục bài học.');
      }

      setCatalogData(data.catalog);

      if (overrideSubject) {
        setSelectedSubject(overrideSubject);
      } else if (data.catalog?.subject && data.catalog.subject !== 'Tài liệu nguồn' && data.catalog.subject !== 'Chưa xác định') {
        setSelectedSubject(data.catalog.subject);
      }

      if (overrideGrade) {
        setSelectedGrade(overrideGrade);
      } else if (data.catalog?.grade && ['Lớp 9', 'Lớp 8', 'Lớp 7', 'Lớp 6'].includes(data.catalog.grade)) {
        setSelectedGrade(data.catalog.grade as 'Lớp 9' | 'Lớp 8' | 'Lớp 7' | 'Lớp 6');
      }
      try {
        const wsId = getUserWorkspaceId(currentUser);
        localStorage.setItem(`khdh_catalog_${wsId}`, JSON.stringify(data.catalog));
      } catch {}
      setShowCatalogModal(true);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi khi trích xuất danh mục bài học.';
      setError(msg);
    } finally {
      setExtractingCatalog(false);
    }
  };

  const handleExtractCatalog = async (
    forceRefresh?: boolean | React.SyntheticEvent,
    overrideGrade?: 'Lớp 9' | 'Lớp 8' | 'Lớp 7' | 'Lớp 6',
    overrideSubject?: string
  ) => {
    const isForce = typeof forceRefresh === 'boolean' ? forceRefresh : false;
    const targetGrade = overrideGrade || selectedGrade || 'Lớp 8';
    const targetSubject = overrideSubject || selectedSubject || 'Toán';
    setExtractingCatalog(true);
    setError(null);
    try {
      const wsId = getUserWorkspaceId(currentUser);
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();
      // Chỉ gửi documentIds nếu thực sự có docs trong state, nếu rỗng thì KHÔNG gửi
      const activeDocIds = documents.filter((d) => d.isActive && d.status === 'READY').map((d) => d.id);

      const bodyPayload: Record<string, unknown> = {
        grade: targetGrade,
        subject: targetSubject,
        apiKeys: activeKeys,
        projectId: wsId,
        forceRefresh: isForce,
      };
      // CHỈ gửi documentIds nếu thực sự có giá trị, KHÔNG gửi mảng rỗng
      if (activeDocIds.length > 0) {
        bodyPayload.documentIds = activeDocIds;
      }

      const res = await fetch('/api/extract-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await parseSafeJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể trích xuất danh mục bài học.');
      }

      setCatalogData(data.catalog);
      try {
        const wsId = getUserWorkspaceId(currentUser);
        localStorage.setItem(`khdh_catalog_${wsId}`, JSON.stringify(data.catalog));
      } catch {}
      setShowCatalogModal(true);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi khi trích xuất danh mục bài học.';
      setError(msg);
    } finally {
      setExtractingCatalog(false);
    }
  };

  const handleSaveCatalog = () => {
    if (!catalogData) return;
    try {
      const wsId = getUserWorkspaceId(currentUser);
      localStorage.setItem(`khdh_catalog_${wsId}`, JSON.stringify(catalogData));
      setSavedCatalogSuccess(true);
      setTimeout(() => setSavedCatalogSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving catalog:', e);
    }
  };

  const handleSelectCatalogLesson = (
    lesson: CatalogLessonItem,
    autoAction?: 'CONTINUOUS_4SECTION' | 'SPLIT_PERIODS' | 'ANALYZE' | 'WORKSHEET'
  ) => {
    const code = lesson.lessonCode
      ? `${lesson.lessonCode} (${lesson.lessonTitle} - ${lesson.totalPeriods} tiết)`
      : lesson.lessonTitle;
    setLessonCode(code);
    setSelectedCatalogLessonCode(lesson.lessonCode);
    setShowCatalogModal(false);

    if (autoAction === 'CONTINUOUS_4SECTION') {
      setKhdhFormatMode('CONTINUOUS_4SECTION');
      const cmd = 'SOAN_V11_KHONG_TACH_TIET';
      setCommand(cmd);
      handleSubmit(undefined, undefined, cmd, 'CONTINUOUS_4SECTION', code);
    } else if (autoAction === 'SPLIT_PERIODS') {
      setKhdhFormatMode('SPLIT_PERIODS');
      const cmd = 'SOAN_XUAT';
      setCommand(cmd);
      handleSubmit(undefined, undefined, cmd, 'SPLIT_PERIODS', code);
    } else if (autoAction === 'ANALYZE') {
      handleAnalyzeLesson(code);
    }
  };

  const handleCopyCatalogMarkdown = () => {
    if (!catalogData) return;
    let md = `# 📑 DANH MỤC BÀI HỌC: ${catalogData.subject} ${catalogData.grade}\n\n`;
    md += `| STT | Mã bài học | Tên bài học | Chương / Mạch | Số tiết | PPCT | Tuần |\n|:---:|:---|:---|:---|:---:|:---:|:---:|\n`;
    catalogData.lessons.forEach((l, idx) => {
      md += `| ${l.stt || idx + 1} | \`${l.lessonCode}\` | **${l.lessonTitle}** | ${l.chapter || ''} | **${l.totalPeriods}** | ${l.ppctRange || ''} | ${l.weekRange || ''} |\n`;
    });
    navigator.clipboard.writeText(md);
    alert('Đã sao chép bảng Danh mục bài học vào Clipboard!');
  };

  const handleDownloadCatalog = () => {
    if (!catalogData) return;
    let md = `# 📑 DANH MỤC BÀI HỌC VÀ MA TRẬN PPCT\n**Môn:** ${catalogData.subject} | **Lớp:** ${catalogData.grade} | **Năm học:** ${catalogData.schoolYear || '2026-2027'}\n\n`;
    md += `| STT | Mã bài học | Tên bài học | Chương / Mạch | Số tiết | PPCT | Tuần |\n|:---:|:---|:---|:---|:---:|:---:|:---:|\n`;
    catalogData.lessons.forEach((l, idx) => {
      md += `| ${l.stt || idx + 1} | \`${l.lessonCode}\` | **${l.lessonTitle}** | ${l.chapter || ''} | **${l.totalPeriods}** | ${l.ppctRange || ''} | ${l.weekRange || ''} |\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DANH_MUC_${catalogData.subject}_${catalogData.grade}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeLesson = async (overrideCode?: string | React.SyntheticEvent) => {
    const targetCode = (typeof overrideCode === 'string' && overrideCode ? overrideCode : lessonCode).trim();
    if (!targetCode) {
      setError('Vui lòng nhập Mã bài học hoặc Tên bài cần phân tích.');
      return;
    }

    setAnalyzingLesson(true);
    setError(null);

    try {
      const wsId = getUserWorkspaceId(currentUser);
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();
      const activeDocIds = documents.filter((d) => d.isActive && d.status === 'READY').map((d) => d.id);

      const res = await fetch('/api/analyze-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonCode: targetCode,
          command: command.trim(),
          apiKeys: activeKeys,
          documentIds: activeDocIds,
          projectId: wsId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể phân tích yêu cầu bài học.');
      }

      setLessonAnalysis(data.analysis);
      setShowAnalysisModal(true);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi khi phân tích yêu cầu bài học.';
      setError(msg);
    } finally {
      setAnalyzingLesson(false);
    }
  };

  const handleLockConfig = (
    executeImmediately: boolean = false,
    customMode?: 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION',
    customCmd?: string
  ) => {
    if (!lessonAnalysis) return;
    setIsConfigLocked(true);
    setShowAnalysisModal(false);
    if (executeImmediately) {
      const activeMode = customMode || khdhFormatMode;
      const activeCmd = customCmd || (activeMode === 'CONTINUOUS_4SECTION' ? 'SOAN_V11_KHONG_TACH_TIET' : 'SOAN_XUAT');
      handleSubmit(undefined, lessonAnalysis, activeCmd, activeMode);
    }
  };

  const handleUnlockConfig = () => {
    setIsConfigLocked(false);
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    configOverride?: LessonRequirementAnalysis,
    overrideCommand?: string,
    overrideMode?: 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION',
    overrideLessonCode?: string
  ) => {
    if (e) e.preventDefault();
    if (loading) return;

    const activeCmd = (overrideCommand || command).trim();
    const activeMode = overrideMode || khdhFormatMode;
    const activeLessonCode = (overrideLessonCode || lessonCode).trim();

    if (!activeCmd) {
      setError('Vui lòng chọn hoặc nhập Lệnh (Command).');
      return;
    }

    setLoading(true);
    setError(null);
    setOutputData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const startTime = Date.now();

    try {
      const wsId = getUserWorkspaceId(currentUser);
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();
      const jobId = `JOB-${Date.now()}`;
      const activeDocIds = documents.filter((d) => d.isActive && d.status === 'READY').map((d) => d.id);
      const targetConfig = configOverride || (isConfigLocked ? lessonAnalysis : undefined);

      // XỬ LÝ CHẾ ĐỘ SOẠN LIÊN HOÀN 4 PHẦN (MULTI-STAGE PIPELINE)
      if (activeCmd === 'SOAN_4_PHAN_LIEN_HOAN') {
        const stages = [
          { stage: 'STAGE_1_MUC_TIEU_KHOI_DONG', label: 'Bước 1/4: Mục tiêu, Thiết bị & Hoạt động Khởi động' },
          { stage: 'STAGE_2_HINH_THANH_KT', label: 'Bước 2/4: Hình thành kiến thức mới chuyên sâu & TikZ' },
          { stage: 'STAGE_3_LUYEN_TAP', label: 'Bước 3/4: Luyện tập phân hóa & Bảng 2 cột' },
          { stage: 'STAGE_4_VAN_DUNG_HUONG_DAN', label: 'Bước 4/4: Vận dụng & Hướng dẫn về nhà' },
        ];

        let combinedDraft = '';
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let lastModel = 'Gemini Pro (4-Stage Cascade)';
        let lastKey = '';

        for (let i = 0; i < stages.length; i++) {
          const st = stages[i];
          setPipelineStep(`⏳ ${st.label}...`);

          const res = await fetch('/api/generate-khdh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: 'SOAN_V11_KHONG_TACH_TIET',
              formatMode: 'CONTINUOUS_4SECTION',
              sectionStage: st.stage,
              lessonCode: targetConfig?.lessonTitle || activeLessonCode,
              jobId: `${jobId}-STAGE-${i + 1}`,
              apiKeys: activeKeys,
              documentIds: activeDocIds,
              projectId: wsId,
              lockedConfig: targetConfig,
            }),
            signal: controller.signal,
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || `Lỗi tại ${st.label}`);
          }

          if (data.khdh_draft) {
            combinedDraft = combinedDraft ? `${combinedDraft}\n\n---\n\n${data.khdh_draft}` : data.khdh_draft;
          }
          if (data.token_usage) {
            totalInputTokens += data.token_usage.inputTokens || 0;
            totalOutputTokens += data.token_usage.outputTokens || 0;
          }
          lastModel = data.model || lastModel;
          lastKey = data.key_used || lastKey;
        }

        const mergedOutput: OutputData = {
          status: 'OK',
          job_id: jobId,
          command: activeCmd,
          format_mode: 'CONTINUOUS_4SECTION',
          lesson_code: activeLessonCode,
          khdh_draft: combinedDraft,
          token_usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
          },
          model: lastModel,
          duration_ms: Date.now() - startTime,
          key_used: lastKey,
          sources_used: activeDocIds.map((id) => ({ id, name: id, type: 'PL1' as SourceDocumentType, version: 1 })),
        };

        setOutputData(mergedOutput);
        setPipelineStep('Hoàn tất giáo án 4 phần chuẩn 100%!');
        handleRecordTaskHistory(
          'SOAN_KHDH_V11',
          activeLessonCode,
          activeCmd,
          combinedDraft,
          'CONTINUOUS_4SECTION',
          mergedOutput.token_usage,
          lastModel,
          mergedOutput.duration_ms,
          lastKey
        );
        setActiveTab('draft');
        return;
      }

      // XỬ LÝ SOẠN ĐƠN LẺ / TÁCH TIẾT / CÁC LỆNH KHÁC
      const effectiveStageParam = (
        activeCmd === 'SOAN_PHAN_A' ? 'STAGE_1_MUC_TIEU_KHOI_DONG' :
        activeCmd === 'SOAN_PHAN_B' ? 'STAGE_2_HINH_THANH_KT' :
        activeCmd === 'SOAN_PHAN_C' ? 'STAGE_3_LUYEN_TAP' :
        activeCmd === 'SOAN_PHAN_D' ? 'STAGE_4_VAN_DUNG_HUONG_DAN' :
        undefined
      );

      if (activeCmd === 'SOAN_PHAN_A') {
        setPipelineStep('Đang soạn Giai đoạn 1: Phần đầu, Mục tiêu & Hoạt động Khởi động (Phần A)...');
      } else if (activeCmd === 'SOAN_PHAN_B') {
        setPipelineStep('Đang soạn Giai đoạn 2: Hình thành kiến thức mới & TikZ (Phần B)...');
      } else if (activeCmd === 'SOAN_PHAN_C') {
        setPipelineStep('Đang soạn Giai đoạn 3: Luyện tập phân hóa & Bảng 2 cột (Phần C)...');
      } else if (activeCmd === 'SOAN_PHAN_D') {
        setPipelineStep('Đang soạn Giai đoạn 4: Vận dụng thực tế & Hướng dẫn về nhà (Phần D)...');
      } else {
        setPipelineStep(
          activeMode === 'CONTINUOUS_4SECTION'
            ? 'Đang soạn KHDH V11 (4 phần A-B-C-D liền mạch, bảng 2 cột chuẩn)...'
            : 'Đang soạn KHDH Tách tiết (Phân theo từng Tiết PPCT, chuẩn CV 5512)...'
        );
      }

      const res = await fetch('/api/generate-khdh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: activeCmd,
          formatMode: activeMode,
          sectionStage: effectiveStageParam,
          lessonCode: targetConfig?.lessonTitle || activeLessonCode,
          jobId,
          apiKeys: activeKeys,
          documentIds: activeDocIds,
          projectId: wsId,
          lockedConfig: targetConfig,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đã xảy ra lỗi trong quá trình xử lý.');
      }

      setOutputData(data);
      setPipelineStep('Hoàn tất!');
      handleRecordTaskHistory(
        activeMode === 'CONTINUOUS_4SECTION' ? 'SOAN_KHDH_V11' : 'SOAN_KHDH_TACH_TIET',
        activeLessonCode,
        activeCmd,
        data.khdh_draft,
        activeMode,
        data.token_usage,
        data.model,
        data.duration_ms,
        data.key_used
      );
      setActiveTab('draft');
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name === 'AbortError') {
        setError('Yêu cầu đã được bạn chủ động hủy.');
      } else {
        setError(errorObj?.message || 'Có lỗi không xác định xảy ra khi kết nối máy chủ.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopy = () => {
    if (!outputData?.khdh_draft) return;
    navigator.clipboard.writeText(outputData.khdh_draft);
    alert('Đã sao chép nội dung vào Clipboard!');
  };

  
  const handleDownloadWord = async (
    mathMode: 'omml' | 'latex' = 'omml',
    printProfile: 'COMPACT_PRINT' | 'STANDARD' = 'COMPACT_PRINT'
  ) => {
    if (!outputData?.khdh_draft) {
      alert('Chưa có nội dung KHDH để xuất file Word.');
      return;
    }

    setExportingWord(true);
    try {
      const res = await fetch('/api/export/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: outputData.khdh_draft,
          title: 'Kế hoạch bài dạy',
          lessonCode: outputData.lesson_code || 'TOAN-8',
          mathMode,
          printProfile,
        }),
      });

      if (!res.ok) {
        let errMessage = 'Không thể tạo file Word. Vui lòng thử lại.';
        try {
          const errData = await res.json();
          if (errData?.message) errMessage = errData.message;
        } catch {}
        throw new Error(errMessage);
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const errData = await res.json();
        throw new Error(errData?.message || 'Lỗi xử lý file Word.');
      }

      const blob = await res.blob();
      const docxBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = `TIET_${outputData.lesson_code ? outputData.lesson_code.replace(/[^a-zA-Z0-9]/g, '_') : '1_2_BAI_HOC'}.docx`;
      
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch {
          filename = match[1];
        }
      }

      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Dọn dẹp URL Blob sau 3 giây để tránh lỗi ngắt kết nối tải ở lần xuất thứ 2
      setTimeout(() => {
        try {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(url);
        } catch {}
      }, 3000);

    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Không thể tạo file Word. Vui lòng thử lại.';
      setError(msg);
      alert('Lỗi xuất file Word: ' + msg);
    } finally {
      setExportingWord(false);
    }
  };

  const handleDownload = () => {
    if (!outputData?.khdh_draft) return;
    const blob = new Blob([outputData.khdh_draft], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KHDH_${outputData.lesson_code || 'V10'}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateWorksheet = async () => {
    if (!outputData?.khdh_draft) return;
    setGeneratingWorksheet(true);
    setError(null);
    try {
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();
      const res = await fetch('/api/generate-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          khdhDraft: outputData.khdh_draft,
          lessonCode: outputData.lesson_code,
          apiKeys: activeKeys,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo Phiếu học tập.');
      }

      setWorksheetMarkdown(data.markdown);
      setActiveTab('worksheet');
      handleRecordTaskHistory(
        'PHIEU_HOC_TAP',
        outputData.lesson_code || 'PHT',
        'TAO_PHIEU_HOC_TAP',
        data.markdown,
        khdhFormatMode,
        data.tokenUsage,
        'Gemini Flash',
        undefined,
        data.keyUsed
      );
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi khi tạo Phiếu học tập.';
      setError(msg);
    } finally {
      setGeneratingWorksheet(false);
    }
  };

  const handleDownloadWorksheetWord = async () => {
    if (!worksheetMarkdown) return;
    setExportingWorksheetWord(true);
    try {
      const res = await fetch('/api/export/worksheet-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: worksheetMarkdown,
          lessonCode: outputData?.lesson_code || 'TOAN-8',
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể xuất file Word Phiếu học tập.');
      }

      const blob = await res.blob();
      const docxBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PHT_${outputData?.lesson_code || 'TOAN-8'}_IN_AN_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi tải Word Phiếu học tập.';
      setError(msg);
    } finally {
      setExportingWorksheetWord(false);
    }
  };

  const handleCopyWorksheet = () => {
    if (!worksheetMarkdown) return;
    navigator.clipboard.writeText(worksheetMarkdown);
    alert('Đã sao chép nội dung Phiếu học tập vào Clipboard!');
  };

  const handleGenerateGame = async (templateOverride?: 'SPACE_QUIZ' | 'LUCKY_WHEEL' | 'MEMORY_MATCH') => {
    if (!outputData?.khdh_draft) return;
    const targetTemplate = templateOverride || selectedGameTemplate;
    setGeneratingGame(true);
    setError(null);
    try {
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();
      const res = await fetch('/api/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          khdhDraft: outputData.khdh_draft,
          lessonCode: outputData.lesson_code,
          templateId: targetTemplate,
          apiKeys: activeKeys,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo Trò chơi tương tác.');
      }

      setGameHtml(data.html);
      setActiveTab('game');
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi khi tạo Trò chơi.';
      setError(msg);
    } finally {
      setGeneratingGame(false);
    }
  };

  const handleDownloadGameHtml = () => {
    if (!gameHtml) return;
    const blob = new Blob([gameHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GAME_${outputData?.lesson_code || 'TOAN-8'}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateStoryboard = async () => {
    if (!outputData?.khdh_draft) return;
    setGeneratingStoryboard(true);
    setError(null);
    try {
      const activeKeys = currentParsedKeys.length > 0 ? currentParsedKeys : ApiKeyService.getClientKeys();
      const res = await fetch('/api/generate-storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          khdhDraft: outputData.khdh_draft,
          lessonCode: outputData.lesson_code,
          apiKeys: activeKeys,
          videoStyle: selectedVideoStyle,
          videoGenre: selectedVideoGenre,
          numScenes8s: selectedNumScenes8s,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo Kịch bản Video.');
      }

      setStoryboardData(data.storyboard);
      setActiveTab('storyboard');
      handleRecordTaskHistory(
        'KICH_BAN_VIDEO',
        outputData.lesson_code || 'VIDEO',
        'XUAT_KICH_BAN_VIDEO',
        data.storyboardMarkdown || JSON.stringify(data.storyboard, null, 2),
        khdhFormatMode,
        data.tokenUsage,
        'Gemini Flash',
        undefined,
        data.keyUsed
      );
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Lỗi khi tạo Kịch bản Video.';
      setError(msg);
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  const handleCopySnippet = (text: string, targetKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTarget(targetKey);
    setTimeout(() => {
      setCopiedTarget(null);
    }, 2000);
  };

  const handleCopyFullScene = (scene: any, sceneIndex: number) => {
    const sceneCodeText = [
      `// ==========================================`,
      `// CẢNH ${scene.sceneNumber}: ${scene.title.toUpperCase()} (${scene.duration})`,
      `// ==========================================`,
      ``,
      `// [1. PROMPT ẢNH KEYFRAME - MIDJOURNEY / FLUX / DALL-E 3]`,
      scene.imagePrompt || scene.videoPrompt || '',
      ``,
      `// [2. PROMPT VIDEO CHUYỂN ĐỘNG - RUNWAY GEN-3 / KLING 1.5 / SORA]`,
      scene.videoPrompt || scene.aiVideoPrompt || '',
      ``,
      `// [3. LỜI THOẠI THUYẾT MINH TIẾNG VIỆT]`,
      scene.voiceoverScript || '',
      ``,
      `// [4. CHỮ / CÔNG THỨC TRÊN MÀN HÌNH]`,
      scene.onScreenText || '',
      ``,
      `// [5. ÂM THANH / NHẠC NỀN BGM]`,
      scene.audioPrompt || '',
    ].join('\n');

    handleCopySnippet(sceneCodeText, `scene_full_${sceneIndex}`);
  };

  const handleCopyAllVideoPrompts = () => {
    if (!storyboardData?.scenes) return;
    const allVideoPrompts = storyboardData.scenes
      .map((s) => `// --- CẢNH ${s.sceneNumber}: ${s.title} (${s.duration}) ---\n${s.videoPrompt || s.aiVideoPrompt || ''}\n`)
      .join('\n');
    handleCopySnippet(allVideoPrompts, 'all_video_prompts');
  };

  const handleCopyAllImagePrompts = () => {
    if (!storyboardData?.scenes) return;
    const allImgPrompts = storyboardData.scenes
      .map((s) => `// --- CẢNH ${s.sceneNumber}: ${s.title} (${s.duration}) ---\n${s.imagePrompt || s.videoPrompt || ''}\n`)
      .join('\n');
    handleCopySnippet(allImgPrompts, 'all_img_prompts');
  };

  const handleCopyAllVoiceovers = () => {
    if (!storyboardData?.scenes) return;
    const allVoiceovers = storyboardData.scenes
      .map((s) => `[Cảnh ${s.sceneNumber} - ${s.duration}]: "${s.voiceoverScript}"\n`)
      .join('\n');
    handleCopySnippet(allVoiceovers, 'all_voiceovers');
  };

  const handleCopyFullCodeText = () => {
    if (!storyboardData?.scenes) return;
    const fullCodeText = [
      `/* =========================================================================`,
      ` * KỊCH BẢN VIDEO MICRO-LEARNING & BỘ PROMPTS AI TỔNG HỢP`,
      ` * BÀI HỌC: ${storyboardData.lessonTitle}`,
      ` * MÃ BÀI HỌC: ${storyboardData.lessonCode}`,
      ` * TỔNG THỜI LƯỢNG: ${storyboardData.totalDuration}`,
      ` * PHONG CÁCH: ${storyboardData.videoStyle}`,
      ` * ĐỐI TƯỢNG: ${storyboardData.targetAudience}`,
      ` * ========================================================================= */`,
      ``,
      ...storyboardData.scenes.map((s) =>
        [
          `// ==========================================`,
          `// CẢNH ${s.sceneNumber}: ${s.title.toUpperCase()} (${s.duration})`,
          `// ==========================================`,
          `// 👁️ MÔ TẢ HÌNH ẢNH: ${s.visualDescription}`,
          `// 📺 HIỂN THỊ MÀN HÌNH: ${s.onScreenText}`,
          `// 🎵 ÂM THANH / BGM: ${s.audioPrompt}`,
          ``,
          `// 🖼️ [PROMPT ẢNH KEYFRAME - MIDJOURNEY / FLUX]:`,
          s.imagePrompt || s.videoPrompt || '',
          ``,
          `// 🎬 [PROMPT VIDEO CHUYỂN ĐỘNG - RUNWAY / KLING / SORA]:`,
          s.videoPrompt || s.aiVideoPrompt || '',
          ``,
          `// 🎙️ [LỜI THOẠI THUYẾT MINH TIẾNG VIỆT]:`,
          `"${s.voiceoverScript}"`,
          `\n`,
        ].join('\n')
      ),
    ].join('\n');

    handleCopySnippet(fullCodeText, 'all_full_code');
  };

  const handleDownloadStoryboardMd = () => {
    if (!storyboardData) return;
    const mdLines = [
      `# KỊCH BẢN VIDEO & PROMPTS AI: ${storyboardData.lessonTitle}`,
      `- Mã bài học: ${storyboardData.lessonCode}`,
      `- Tổng thời lượng: ${storyboardData.totalDuration}`,
      `- Phong cách video: ${storyboardData.videoStyle}`,
      `- Đối tượng: ${storyboardData.targetAudience}`,
      `\n---\n`,
      ...storyboardData.scenes.map((s) =>
        [
          `## Cảnh ${s.sceneNumber}: ${s.title} (${s.duration})`,
          `- **Mô tả thị giác:** ${s.visualDescription}`,
          `- **Chữ hiển thị:** ${s.onScreenText}`,
          `- **Âm thanh / BGM:** ${s.audioPrompt}`,
          `- **Lời thoại tiếng Việt:**`,
          `> "${s.voiceoverScript}"`,
          `- **Prompt Ảnh Keyframe (Midjourney / Flux):**`,
          `\`\`\`text\n${s.imagePrompt || s.videoPrompt || ''}\n\`\`\``,
          `- **Prompt Video Chuyển động (Runway / Kling / Sora):**`,
          `\`\`\`text\n${s.videoPrompt || s.aiVideoPrompt || ''}\n\`\`\``,
          `\n`,
        ].join('\n')
      ),
    ];

    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STORYBOARD_${outputData?.lesson_code || 'TOAN-8'}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Loading State during session check
  if (authLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4 max-w-sm">
          <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full mx-auto shadow-lg" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">KHDH AUTO V11</h2>
            <p className="text-xs text-slate-400">Đang kiểm tra bảo mật &amp; phiên đăng nhập Google...</p>
          </div>
        </div>
      </main>
    );
  }

  // 2. Google Login Screen if not authenticated
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-400/30 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
              <span>🔐</span> BẢO MẬT &amp; XÁC THỰC GOOGLE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              KHDH AUTO V11
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Hệ thống Soạn Kế hoạch bài dạy, Phiếu học tập, Trò chơi tương tác &amp; Kịch bản Video AI chuẩn Bộ Giáo dục.
            </p>
          </div>

          {/* Login Action Area */}
          <div className="space-y-4 pt-2">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Google One-Click Button with Native GIS */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div ref={googleBtnContainerRef} className="flex justify-center w-full min-h-[44px]" />

              {/* Fallback button if GIS button container is not rendered */}
              <button
                type="button"
                onClick={() => {
                  const activeClientId = googleClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '497311553353-sjkaf83820uim4tecedosk1pd512josg.apps.googleusercontent.com';
                  // @ts-ignore
                  if (activeClientId && typeof window !== 'undefined' && window.google?.accounts?.id) {
                    // @ts-ignore
                    window.google.accounts.id.prompt();
                  } else {
                    setShowGcpGuideModal(true);
                  }
                }}
                disabled={loggingIn}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 border border-slate-200"
              >
                {loggingIn ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full" />
                    <span>Đang kết nối Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Tiếp tục với Google</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-slate-700" />
              <span className="px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Hoặc nhập Email Google
              </span>
              <div className="flex-1 border-t border-slate-700" />
            </div>

            {/* Custom Google Email Login */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Địa chỉ Email Google (Gmail / Edu):
                </label>
                <input
                  type="email"
                  value={loginEmailInput}
                  onChange={(e) => setLoginEmailInput(e.target.value)}
                  placeholder="Nhập email của Thầy/Cô (ví dụ: gv.toan@gmail.com)"
                  className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Họ và tên hiển thị giáo viên:
                </label>
                <input
                  type="text"
                  value={loginNameInput}
                  onChange={(e) => setLoginNameInput(e.target.value)}
                  placeholder="Nhập họ và tên Thầy/Cô (ví dụ: Cô Nguyễn Thị Lan)"
                  className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={loggingIn}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>Đăng Nhập Ngay</span>
              </button>
            </div>
          </div>

          {/* Privacy & Key Vault Notice */}
          <div className="p-3.5 bg-blue-950/50 border border-blue-800/40 rounded-2xl text-[11px] text-blue-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-300">
              <span>🛡️</span> Cơ chế lưu giữ API Key an toàn:
            </div>
            <p className="text-slate-300 leading-relaxed">
              API Key của Thầy/Cô chỉ cần nhập <strong>1 lần duy nhất khi đăng ký lần đầu</strong>, được mã hóa chuẩn <strong>AES-256</strong> và tự động lưu giữ theo tài khoản Google. Các lần mở link sau không bao giờ phải nhập lại.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 font-sans">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUploadChange}
        multiple
        accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileChange}
        accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md"
        className="hidden"
      />

      {/* Header */}
      <header className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs">
              V11 FINAL &amp; V10.1
            </span>
            <h1 className="text-2xl font-black text-blue-800 tracking-tight">KHDH AUTO</h1>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Trường THCS Quang Trung | Tổ Toán Tin | GV: {currentUser?.name || 'Lê Tâm'}
          </p>
        </div>

        {/* User Profile & Key Status */}
        <div className="flex flex-wrap items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-3 rounded-2xl border border-slate-200 shadow-2xs">
              {currentUser.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-300 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <div className="font-bold text-xs text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {currentUser.email}
                </div>
              </div>
            </div>
          )}

          
          {/* Quick Open Catalog Button */}
          <button
            type="button"
            onClick={() => {
              if (catalogData) {
                setActiveTab('catalog');
              } else {
                handleExtractCatalog();
              }
            }}
            disabled={extractingCatalog}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-900 border-purple-300 hover:from-purple-100 hover:to-indigo-100"
            title="Mở nhanh Danh mục bài học & Ma trận PPCT bám sát PL1, PPCT, SGK, KHDH cũ"
          >
            <span>📑</span>
            <span>
              {extractingCatalog ? 'Đang trích xuất...' : catalogData ? `Danh Mục (${catalogData.totalLessons} bài)` : 'Mở Danh Mục'}
            </span>
            <span className="text-[10px] bg-purple-700 text-white px-1.5 py-0.5 rounded-md font-bold">
              PL1/PPCT
            </span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs ${
              configuredKeyCount > 1
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : configuredKeyCount === 1
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <span>
              {configuredKeyCount > 1
                ? `🟢 ${configuredKeyCount} Keys (Đã lưu)`
                : configuredKeyCount === 1
                ? '🟢 1 Key (Đã lưu)'
                : '🟡 Cấu hình Key'}
            </span>
            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
              Đổi key
            </span>
          </button>

          <button
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-slate-200 transition-all flex items-center gap-1"
          >
            <span>🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Thông báo:</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 text-lg leading-none font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION TÀI LIỆU NGUỒN (SOURCE DOCUMENTS MODULE) */}
      <section className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>📚</span> TÀI LIỆU NGUỒN
              </h2>
              {currentUser && (
                <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span>🔒</span> Không gian riêng: {currentUser.name || currentUser.email}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Căn cứ pháp lý & học liệu chính thức cho AI biên soạn KHDH (Thứ tự ưu tiên: Phụ lục I &gt; PPCT &gt; SGK &gt; KHDH cũ). Tài liệu được bảo mật và cách ly 100% theo từng tài khoản.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTriggerUpload('PL1')}
              disabled={docLoading}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Bổ sung Phụ lục I
            </button>
            <button
              onClick={() => handleTriggerUpload('PPCT')}
              disabled={docLoading}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Bổ sung PPCT
            </button>
            <button
              onClick={() => handleTriggerUpload('SGK')}
              disabled={docLoading}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Bổ sung SGK_
            </button>
            <button
              onClick={() => handleTriggerUpload('KHDH_OLD')}
              disabled={docLoading}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Bổ sung KHDH_ cũ
            </button>
            <button
              onClick={() => handleTriggerUpload('OTHER')}
              disabled={docLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
            >
              <span>+</span> Thêm tài liệu khác
            </button>
            <button
              onClick={() => setShowDriveSyncModal(true)}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>☁️</span>
              <span>Sao Lưu Google Drive</span>
            </button>
            <button
              onClick={handleExtractCatalog}
              disabled={extractingCatalog || docLoading}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {extractingCatalog ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Đang trích xuất...</span>
                </>
              ) : (
                <>
                  <span>📑</span>
                  <span>Trích xuất Danh mục</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Source Readiness Status Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700">Mức độ sẵn sàng nguồn:</span>
            
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold border ${
              readiness?.pl1Status === 'READY'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-200 text-slate-600 border-slate-300'
            }`}>
              <span>{readiness?.pl1Status === 'READY' ? '🟢' : '⚪'}</span>
              <span>Phụ lục I: {readiness?.pl1Status === 'READY' ? 'Sẵn sàng' : 'Chưa có'}</span>
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold border ${
              readiness?.ppctStatus === 'READY'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-200 text-slate-600 border-slate-300'
            }`}>
              <span>{readiness?.ppctStatus === 'READY' ? '🟢' : '⚪'}</span>
              <span>PPCT: {readiness?.ppctStatus === 'READY' ? 'Sẵn sàng' : 'Chưa có'}</span>
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold border ${
              readiness?.sgkStatus === 'READY'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-200 text-slate-600 border-slate-300'
            }`}>
              <span>{readiness?.sgkStatus === 'READY' ? '🟢' : '⚪'}</span>
              <span>SGK: {readiness?.sgkStatus === 'READY' ? 'Sẵn sàng' : 'Chưa có'}</span>
            </span>

            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold border ${
              readiness?.khdhOldStatus === 'READY'
                ? 'bg-purple-100 text-purple-900 border-purple-300'
                : 'bg-slate-200 text-slate-600 border-slate-300'
            }`}>
              <span>{readiness?.khdhOldStatus === 'READY' ? '🟣' : '⚪'}</span>
              <span>KHDH cũ: {readiness?.khdhOldStatus === 'READY' ? 'Có (Tham khảo)' : 'Chưa có'}</span>
            </span>
          </div>

          <div className="text-slate-500 text-xs italic">
            {readiness?.isSufficient 
              ? '✅ Đã đủ căn cứ tài liệu nguồn để thực thi tác vụ AI.'
              : '💡 Có thể bổ sung thêm tài liệu để tăng độ chính xác.'}
          </div>
        </div>

        {/* Document List / Empty State */}
        {docLoading && (
          <div className="p-6 text-center text-xs text-slate-500">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
            Đang xử lý tài liệu nguồn...
          </div>
        )}


        {!docLoading && documents.length === 0 && (
          <div className="space-y-4">
            {/* Standard Pipeline Process Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-blue-900 uppercase tracking-wide">
                  🎯 QUY TRÌNH CHUẨN TRÍCH XUẤT TỪ DỮ LIỆU NGUỒN TẢI LÊN:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-1">
                  <div className="font-bold text-blue-800 flex items-center gap-1">
                    <span>1️⃣</span> Nạp Phụ lục I &amp; PPCT
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bấm các nút phía trên hoặc kéo thả tệp .docx/.pdf vào các ô dưới.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-1">
                  <div className="font-bold text-indigo-800 flex items-center gap-1">
                    <span>2️⃣</span> Giải nén Bảng biểu XML
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hệ thống đọc chuẩn Cột 1 (STT), Cột 2 (Tên bài), Cột 3 (Số tiết), Cột 4 (PPCT).
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-1">
                  <div className="font-bold text-purple-800 flex items-center gap-1">
                    <span>3️⃣</span> Trích xuất 100% tệp nạp
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Lập bảng Danh mục bài học chính xác từ tệp, tuyệt đối không dùng dữ liệu mẫu.
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-1">
                  <div className="font-bold text-emerald-800 flex items-center gap-1">
                    <span>4️⃣</span> Soạn KHDH 1-Chạm
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bấm chọn bất kỳ bài học nào trên bảng để tạo KHDH V11-2 ngay lập tức.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Quick Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleTriggerUpload('PL1')}
                className="p-4 bg-amber-50/70 hover:bg-amber-100/90 border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⭐</span>
                  <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">ƯU TIÊN 1</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-amber-950 group-hover:text-amber-900">
                    + Bổ sung Phụ lục I
                  </div>
                  <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                    Tệp .docx/.pdf: Quyết định Tên bài, Cột 3 (Số tiết) &amp; YCCĐ.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-amber-700 underline">Bấm để chọn tệp...</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerUpload('PPCT')}
                className="p-4 bg-blue-50/70 hover:bg-blue-100/90 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📘</span>
                  <span className="text-[10px] font-black bg-blue-200 text-blue-900 px-2 py-0.5 rounded-md">ƯU TIÊN 2</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-blue-950 group-hover:text-blue-900">
                    + Bổ sung PPCT
                  </div>
                  <p className="text-[11px] text-blue-800/80 mt-0.5 leading-snug">
                    Tệp .docx/.pdf: Quyết định Thứ tự bài, Tiết PPCT &amp; Tuần học.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-700 underline">Bấm để chọn tệp...</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerUpload('SGK')}
                className="p-4 bg-emerald-50/70 hover:bg-emerald-100/90 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📗</span>
                  <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">ƯU TIÊN 3</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-950 group-hover:text-emerald-900">
                    + Bổ sung SGK_
                  </div>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-snug">
                    Sách giáo khoa: Khái niệm, định nghĩa, công thức &amp; bài tập chuẩn.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 underline">Bấm để chọn tệp...</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerUpload('KHDH_OLD')}
                className="p-4 bg-purple-50/70 hover:bg-purple-100/90 border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-2xl text-left transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📙</span>
                  <span className="text-[10px] font-black bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md">THAM KHẢO</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-purple-950 group-hover:text-purple-900">
                    + Bổ sung KHDH cũ
                  </div>
                  <p className="text-[11px] text-purple-800/80 mt-0.5 leading-snug">
                    Giáo án cũ: Tham khảo ý tưởng hoạt động, không ghi đè nguồn mới.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-purple-700 underline">Bấm để chọn tệp...</span>
              </button>
            </div>
          </div>
        )}


        {!docLoading && documents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {documents.map((doc) => {
              const meta = DOC_TYPE_LABELS[doc.documentType] || DOC_TYPE_LABELS.OTHER;
              return (
                <div
                  key={doc.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                    doc.isActive && doc.status === 'READY'
                      ? 'bg-white border-slate-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 overflow-hidden">
                      <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm text-slate-800 truncate" title={doc.displayName}>
                          {doc.displayName}
                        </div>
                        <div className="text-xs text-slate-500 truncate" title={doc.originalFileName}>
                          {doc.originalFileName}
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doc.isActive}
                        onChange={() => handleToggleDocActive(doc.id, doc.isActive)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{doc.isActive ? 'Sử dụng' : 'Tắt'}</span>
                    </label>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${meta.badgeClass}`}>
                      {meta.label}
                    </span>

                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
                      v{doc.version}
                    </span>

                    <span className="text-slate-500 text-[11px]">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </span>

                    <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                      doc.status === 'READY'
                        ? 'bg-emerald-50 text-emerald-700'
                        : doc.status === 'REPLACED'
                        ? 'bg-slate-100 text-slate-600'
                        : doc.status === 'ERROR'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {doc.status === 'READY'
                        ? '✓ Sẵn sàng'
                        : doc.status === 'REPLACED'
                        ? 'Đã thay thế'
                        : doc.status === 'ERROR'
                        ? 'Lỗi xử lý'
                        : 'Đang xử lý'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs gap-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2 py-1 text-slate-700 hover:bg-slate-100 rounded font-medium border border-slate-200 shadow-2xs"
                      >
                        👁️ Xem
                      </button>
                      <button
                        onClick={() => handleTriggerReplace(doc.id)}
                        className="px-2 py-1 text-blue-700 hover:bg-blue-50 rounded font-medium border border-blue-200 shadow-2xs"
                      >
                        🔄 Thay thế
                      </button>
                      <button
                        onClick={() =>
                          setEditingDoc({
                            id: doc.id,
                            displayName: doc.displayName,
                            documentType: doc.documentType,
                          })
                        }
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded font-medium border border-slate-200"
                      >
                        ✏️ Sửa
                      </button>
                    </div>

                    <button
                      onClick={() => setDeleteConfirmDoc(doc)}
                      className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded font-medium border border-rose-200"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="card space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>⚡</span> Bảng Điều Khiển Lệnh
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {khdhFormatMode === 'CONTINUOUS_4SECTION' ? '📄 V11 Không Tách Tiết' : '✂️ Tách Tiết PPCT'}
              </span>
            </h2>

            {/* Chế độ định dạng KHDH (Mode Switcher) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Định dạng giáo án mục tiêu:
              </label>
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setKhdhFormatMode('CONTINUOUS_4SECTION');
                    setCommand('SOAN_V11_KHONG_TACH_TIET');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    khdhFormatMode === 'CONTINUOUS_4SECTION'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>📄</span> (2) Không Tách Tiết
                  </span>
                  <span className={`text-[10px] font-normal ${
                    khdhFormatMode === 'CONTINUOUS_4SECTION' ? 'text-emerald-100' : 'text-slate-500'
                  }`}>
                    V11-2 — 4 Phần A-B-C-D
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setKhdhFormatMode('SPLIT_PERIODS');
                    setCommand('SOAN_XUAT');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    khdhFormatMode === 'SPLIT_PERIODS'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>✂️</span> (1) Tách Tiết
                  </span>
                  <span className={`text-[10px] font-normal ${
                    khdhFormatMode === 'SPLIT_PERIODS' ? 'text-blue-100' : 'text-slate-500'
                  }`}>
                    V10.1 — Tiết [PPCT]
                  </span>
                </button>
              </div>

              {/* Format Description Tooltip */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                {khdhFormatMode === 'CONTINUOUS_4SECTION' ? (
                  <p>
                    <strong className="text-emerald-800">📄 Chuẩn V11-2 (4 phần A-B-C-D):</strong> Tiến trình 4 hoạt động lớn liền mạch; Kiến thức dạng cụm danh từ; Năng lực quan sát được không chia nhóm; Phẩm chất gắn với hành vi; Bảng 2 cột; Kết thúc tại Hướng dẫn về nhà.
                  </p>
                ) : (
                  <p>
                    <strong className="text-blue-800">✂️ Chuẩn V10.1 (Tách tiết):</strong> Phân chia cấu trúc bài học thành các mốc Tiết 1 [PPCT 1], Tiết 2 [PPCT 2]... phù hợp với đơn vị yêu cầu giáo án theo từng tiết rời.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Command Chips */}
            {/* BỘ CHỌN MÔN HỌC & KHỐI LỚP TRỰC QUAN */}
            <div className="space-y-2 p-3.5 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 border border-blue-200 rounded-2xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📚</span> Môn học &amp; Khối lớp:
                </span>
                <span className="text-[11px] font-black bg-blue-700 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                  {selectedSubject} — {selectedGrade}
                </span>
              </div>

              {/* Môn học Quick Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { id: 'Lịch sử', label: '🏛️ Lịch sử' },
                  { id: 'Địa lí', label: '🌍 Địa lí' },
                  { id: 'Ngữ văn', label: '📖 Ngữ văn' },
                  { id: 'Toán học', label: '📐 Toán học' },
                  { id: 'Khoa học tự nhiên', label: '🔬 KHTN' },
                  { id: 'Tin học', label: '💻 Tin học' },
                  { id: 'Tiếng Anh', label: '🇬🇧 Tiếng Anh' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSwitchSubject(sub.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSubject === sub.id
                        ? 'bg-blue-700 text-white shadow-xs scale-102 ring-1 ring-blue-500'
                        : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Khối lớp Quick Chips */}
              <div className="flex gap-1.5 pt-1 border-t border-blue-100">
                {(['Lớp 9', 'Lớp 8', 'Lớp 7', 'Lớp 6'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSwitchGrade(g)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedGrade === g
                        ? 'bg-indigo-700 text-white shadow-xs scale-102 ring-1 ring-indigo-500'
                        : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Reset & Quick Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-blue-200/80">
                <button
                  type="button"
                  onClick={() => handleExtractCatalog(true)}
                  className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Xem danh mục bài học & ma trận phân phối chương trình"
                >
                  <span>📑</span>
                  <span>Danh mục bài học</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerUpload('PL1')}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Tải tệp Phụ lục I hoặc PPCT mới"
                >
                  <span>📤</span>
                  <span>Tải tệp mới</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllSystemData}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Xóa sạch toàn bộ dữ liệu đệm cũ và đặt lại hệ thống"
                >
                  <span>🧹</span>
                  <span>Đặt lại dữ liệu</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Các lệnh thực thi nhanh:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COMMANDS.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleCommandClick(cmd.id)}
                    disabled={loading}
                    className={`text-left p-2 rounded-lg border text-xs font-medium transition-all ${
                      command === cmd.id
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">{cmd.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Command Input */}
            <div>
              <label htmlFor="cmd-input" className="block text-xs font-semibold text-slate-600 mb-1">
                Lệnh thực thi (Command):
              </label>
              <input
                id="cmd-input"
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={loading}
                className="input-field font-mono text-sm"
                placeholder="Ví dụ: SOAN_XUAT, KHOI_DONG..."
              />
            </div>

            {/* Saved Catalog Quick Picker Card */}
            {catalogData && catalogData.lessons && catalogData.lessons.length > 0 && (
              <div className="p-3.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                    <span>📚</span> Danh Mục Bài Học Đã Lưu ({catalogData.lessons.length} bài)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCatalogModal(true)}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-bold bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs hover:bg-blue-50 transition-all flex items-center gap-1"
                  >
                    <span>📊</span> Xem Ma Trận
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="catalog-quick-select" className="block text-[11px] font-semibold text-slate-700">
                    Chọn nhanh bài học để thực thi 1-chạm:
                  </label>
                  <select
                    id="catalog-quick-select"
                    value={selectedCatalogLessonCode || ''}
                    onChange={(e) => {
                      const selCode = e.target.value;
                      setSelectedCatalogLessonCode(selCode);
                      const lesson = catalogData.lessons.find((l) => l.lessonCode === selCode);
                      if (lesson) {
                        const formatted = `${lesson.lessonCode} (${lesson.lessonTitle} - ${lesson.totalPeriods} tiết)`;
                        setLessonCode(formatted);
                      }
                    }}
                    className="w-full bg-white border border-blue-300 text-slate-900 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">-- Bấm chọn bài học từ danh mục --</option>
                    {catalogData.lessons.map((l, idx) => (
                      <option key={idx} value={l.lessonCode}>
                        [STT {l.stt || idx + 1}] {l.lessonTitle} ({l.totalPeriods}t - {l.ppctRange || `Tiết ${l.stt || idx + 1}`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3 Direct 1-Click Action Buttons for Selected Lesson */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const lesson = catalogData.lessons.find((l) => l.lessonCode === selectedCatalogLessonCode) || catalogData.lessons[0];
                      if (lesson) handleSelectCatalogLesson(lesson, 'CONTINUOUS_4SECTION');
                    }}
                    disabled={loading}
                    title="Soạn KHDH V11-2 4 phần không tách tiết chuẩn 100%"
                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1"
                  >
                    <span>⚡</span> V11-2 (4 phần)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const lesson = catalogData.lessons.find((l) => l.lessonCode === selectedCatalogLessonCode) || catalogData.lessons[0];
                      if (lesson) handleSelectCatalogLesson(lesson, 'SPLIT_PERIODS');
                    }}
                    disabled={loading}
                    title="Soạn KHDH tách tiết chuẩn PPCT"
                    className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1"
                  >
                    <span>✂️</span> Tách tiết
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const lesson = catalogData.lessons.find((l) => l.lessonCode === selectedCatalogLessonCode) || catalogData.lessons[0];
                      if (lesson) handleSelectCatalogLesson(lesson, 'ANALYZE');
                    }}
                    disabled={analyzingLesson || loading}
                    title="Phân tích chuyên sâu bài học"
                    className="py-1.5 px-2 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-lg text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1"
                  >
                    <span>🔍</span> Phân tích
                  </button>
                </div>
              </div>
            )}

            {/* Lesson Code Input */}
            <div>
              <label htmlFor="lesson-input" className="block text-xs font-semibold text-slate-600 mb-1">
                Mã bài học / Tham số:
              </label>
              <textarea
                id="lesson-input"
                rows={3}
                value={lessonCode}
                onChange={(e) => {
                  setLessonCode(e.target.value);
                  if (isConfigLocked) setIsConfigLocked(false);
                }}
                disabled={loading || analyzingLesson}
                className="input-field text-sm"
                placeholder="Ví dụ: TOAN-8-HKI-SODAISO-C01-STT01 hoặc Đơn thức và đa thức nhiều biến - 2 tiết"
              />
            </div>

            {/* Catalog Extraction & Pre-Analysis Action Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExtractCatalog}
                  disabled={extractingCatalog || loading}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                >
                  {extractingCatalog ? (
                    <>
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-amber-700 border-t-transparent rounded-full" />
                      <span>Đang trích xuất...</span>
                    </>
                  ) : (
                    <>
                      <span>📑</span>
                      <span>Trích xuất Danh mục</span>
                    </>
                  )}
                </button>

                {!isConfigLocked && (
                  <button
                    type="button"
                    onClick={handleAnalyzeLesson}
                    disabled={analyzingLesson || loading}
                    className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    {analyzingLesson ? (
                      <>
                        <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-purple-700 border-t-transparent rounded-full" />
                        <span>Đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Phân tích yêu cầu</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {isConfigLocked && lessonAnalysis && (
                <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <span className="text-sm">🔒</span> CẤU HÌNH ĐÃ CỐ ĐỊNH
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAnalysisModal(true)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] underline"
                    >
                      Chi tiết
                    </button>
                  </div>

                  <div className="font-bold text-slate-900 text-xs leading-snug">
                    {lessonAnalysis.lessonTitle}
                  </div>

                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-1.5">
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-medium">
                      ⏱️ {lessonAnalysis.totalPeriods} tiết
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-medium">
                      📚 {lessonAnalysis.grade} ({lessonAnalysis.term})
                    </span>
                  </div>

                  <div className="text-[11px] text-emerald-800">
                    ✓ Đã khóa {lessonAnalysis.objectives.knowledge.length} YCCĐ kiến thức &amp; {lessonAnalysis.objectives.competencies.length} năng lực.
                  </div>

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={handleUnlockConfig}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-300 text-[11px] font-medium"
                    >
                      Mở khóa
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnalysisModal(true)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex-1 text-center"
                    >
                      ✏️ Chỉnh sửa cấu hình
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TRUNG TÂM NÚT LỆNH THỰC THI SOẠN KHDH CHUYÊN NGHIỆP */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span> Trung tâm thực thi KHDH (1-Chạm):
                </label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Chuẩn CV 5512
                </span>
              </div>

              {/* NÚT CHÍNH 1: SOẠN LIÊN HOÀN 4 PHẦN (KHUYÊN DÙNG) */}
              <button
                type="button"
                onClick={() => {
                  setKhdhFormatMode('CONTINUOUS_4SECTION');
                  setCommand('SOAN_4_PHAN_LIEN_HOAN');
                  handleSubmit(undefined, undefined, 'SOAN_4_PHAN_LIEN_HOAN', 'CONTINUOUS_4SECTION');
                }}
                disabled={loading}
                className="w-full p-3.5 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 hover:from-indigo-800 hover:via-purple-800 hover:to-pink-800 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center text-center gap-1 border border-purple-300 ring-2 ring-purple-300/40 cursor-pointer group"
              >
                <div className="flex items-center gap-2 text-sm font-black tracking-tight">
                  <span className="text-base group-hover:scale-110 transition-transform">✨</span>
                  <span>(KHUYÊN DÙNG) SOẠN LIÊN HOÀN 4 PHẦN (100% ĐẦY ĐỦ)</span>
                </div>
                <div className="text-[11px] text-purple-100 font-medium">
                  Chạy tuần tự 4 giai đoạn độc lập có ngân sách token riêng — Tuyệt đối không bị cắt ngắn
                </div>
              </button>

              {/* KHỐI 4 NÚT LỆNH THỰC THI TỪNG PHẦN RIÊNG BIỆT */}
              <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>🧩</span> Thực thi soạn riêng từng phần độc lập:
                  </span>
                  <span className="text-[10px] text-slate-500 italic">Bấm để chạy ngay</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Nút Phần A */}
                  <button
                    type="button"
                    onClick={() => {
                      setKhdhFormatMode('CONTINUOUS_4SECTION');
                      setCommand('SOAN_PHAN_A');
                      handleSubmit(undefined, undefined, 'SOAN_PHAN_A', 'CONTINUOUS_4SECTION');
                    }}
                    disabled={loading}
                    className="p-2.5 bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 hover:border-amber-400 rounded-xl text-left transition-all shadow-2xs group flex flex-col justify-between space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 group-hover:text-amber-800 flex items-center gap-1">
                        <span>🚩</span> Phần A: Khởi động
                      </span>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Giai đoạn 1</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      Mục tiêu 3 phần + Thiết bị + Mở đầu
                    </p>
                  </button>

                  {/* Nút Phần B */}
                  <button
                    type="button"
                    onClick={() => {
                      setKhdhFormatMode('CONTINUOUS_4SECTION');
                      setCommand('SOAN_PHAN_B');
                      handleSubmit(undefined, undefined, 'SOAN_PHAN_B', 'CONTINUOUS_4SECTION');
                    }}
                    disabled={loading}
                    className="p-2.5 bg-white hover:bg-blue-50 text-blue-950 border border-blue-300 hover:border-blue-400 rounded-xl text-left transition-all shadow-2xs group flex flex-col justify-between space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900 group-hover:text-blue-800 flex items-center gap-1">
                        <span>💡</span> Phần B: Kiến thức mới
                      </span>
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Giai đoạn 2</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      Hoạt động khám phá + Bảng 2 cột + TikZ
                    </p>
                  </button>

                  {/* Nút Phần C */}
                  <button
                    type="button"
                    onClick={() => {
                      setKhdhFormatMode('CONTINUOUS_4SECTION');
                      setCommand('SOAN_PHAN_C');
                      handleSubmit(undefined, undefined, 'SOAN_PHAN_C', 'CONTINUOUS_4SECTION');
                    }}
                    disabled={loading}
                    className="p-2.5 bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300 hover:border-emerald-400 rounded-xl text-left transition-all shadow-2xs group flex flex-col justify-between space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 group-hover:text-emerald-800 flex items-center gap-1">
                        <span>📝</span> Phần C: Luyện tập
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Giai đoạn 3</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      Bài tập trắc nghiệm + Tự luận phân hóa
                    </p>
                  </button>

                  {/* Nút Phần D */}
                  <button
                    type="button"
                    onClick={() => {
                      setKhdhFormatMode('CONTINUOUS_4SECTION');
                      setCommand('SOAN_PHAN_D');
                      handleSubmit(undefined, undefined, 'SOAN_PHAN_D', 'CONTINUOUS_4SECTION');
                    }}
                    disabled={loading}
                    className="p-2.5 bg-white hover:bg-purple-50 text-purple-950 border border-purple-300 hover:border-purple-400 rounded-xl text-left transition-all shadow-2xs group flex flex-col justify-between space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900 group-hover:text-purple-800 flex items-center gap-1">
                        <span>🚀</span> Phần D: Vận dụng
                      </span>
                      <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Giai đoạn 4</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      Tình huống thực tế + Hướng dẫn về nhà
                    </p>
                  </button>
                </div>
              </div>

              {/* 2 NÚT SOẠN NHANH TRUYỀN THỐNG */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKhdhFormatMode('CONTINUOUS_4SECTION');
                    setCommand('SOAN_V11_KHONG_TACH_TIET');
                    handleSubmit(undefined, undefined, 'SOAN_V11_KHONG_TACH_TIET', 'CONTINUOUS_4SECTION');
                  }}
                  disabled={loading}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📄</span> Soạn 1 lượt nhanh
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setKhdhFormatMode('SPLIT_PERIODS');
                    setCommand('SOAN_XUAT');
                    handleSubmit(undefined, undefined, 'SOAN_XUAT', 'SPLIT_PERIODS');
                  }}
                  disabled={loading}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>✂️</span> Tách tiết (PPCT)
                </button>
              </div>

              {/* Progress & Cancel Toolbar when loading */}
              {loading && (
                <div className="flex items-center justify-between p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-900 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span className="font-semibold">{pipelineStep || 'Đang xử lý...'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-all shadow-2xs"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* System Info Card */}
          <div className="card text-xs text-slate-600 space-y-2 bg-slate-50/50">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>ℹ️</span> Thông tin cấu hình hệ thống
            </div>
            <div className="flex justify-between">
              <span>Mô hình ưu tiên:</span>
              <span className="font-semibold text-slate-800">Gemini Flash (Cascade Auto)</span>
            </div>
            <div className="flex justify-between">
              <span>Cơ chế API Key:</span>
              <span className="font-semibold text-blue-700">
                {configuredKeyCount > 1 ? `Multi-Key (${configuredKeyCount} keys xoay vòng)` : 'Single Key'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Căn cứ nguồn:</span>
              <span className="font-semibold text-slate-800">
                {documents.filter((d) => d.isActive && d.status === 'READY').length} tài liệu sẵn sàng
              </span>
            </div>
            <div className="flex justify-between">
              <span>Định dạng bảng:</span>
              <span className="font-semibold text-slate-800">2 cột (CV 5512)</span>
            </div>
            <div className="flex justify-between">
              <span>Công thức Toán:</span>
              <span className="font-semibold text-slate-800">LaTeX / KaTeX / OMML</span>
            </div>
          </div>
        </div>

        {/* Right Output Area (8 cols) */}
        <div className="lg:col-span-8">
          <div className="card p-0 overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 overflow-x-auto">
              {[
                { id: 'draft', label: '📝 Bản Thảo KHDH' },
                { id: 'preview', label: '📐 Xem Trước 2 Cột' },
                { id: 'catalog', label: `📑 Danh Mục (${catalogData?.totalLessons || catalogData?.lessons?.length || 0})` },
                { id: 'worksheet', label: '📋 Phiếu Học Tập' },
                { id: 'game', label: '🎮 Trò Chơi HTML' },
                { id: 'storyboard', label: '🎬 Kịch Bản Video AI' },
                { id: 'slide', label: '📊 Slide & Canva' },
                { id: 'sources', label: '📚 Nguồn Sử Dụng' },
                { id: 'history', label: `📜 Lịch Sử (${taskHistory.length})` },
                { id: 'stats', label: '📈 Thống Kê & Key' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'draft' | 'preview' | 'catalog' | 'worksheet' | 'game' | 'storyboard' | 'slide' | 'sources' | 'history' | 'stats')}
                  className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-5 overflow-auto max-h-[680px]">
              {loading && (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
                  <div>
                    <p className="font-bold text-slate-800">{pipelineStep}</p>
                    <p className="text-xs text-slate-500 mt-1">Đang sử dụng Google AI Gemini để tạo nội dung...</p>
                  </div>
                </div>
              )}

              {!loading && !outputData && activeTab !== 'history' && activeTab !== 'catalog' && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                  <span className="text-4xl">📋</span>
                  <p className="font-medium text-sm text-slate-600">Chưa có dữ liệu giáo án.</p>
                  <p className="text-xs text-slate-400">Chọn lệnh và nhấn &quot;Thực Thi Ngay&quot; để tạo Kế hoạch bài dạy.</p>
                </div>
              )}
              

              {/* TAB 3: CURRICULUM CATALOG (DANH MỤC BÀI HỌC) */}
              {!loading && activeTab === 'catalog' && (
                <div className="space-y-4">
                  {/* Catalog Header & Controls */}
                  <div className="p-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm space-y-3 border border-purple-800/40">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-purple-600 text-white font-black text-[10px] uppercase tracking-wider rounded-md">
                            4-SOURCE STRICT PROTOCOL
                          </span>
                          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                            <span>📑</span> DANH MỤC BÀI HỌC &amp; MA TRẬN PHÂN PHỐI CHƯƠNG TRÌNH
                          </h3>
                        </div>
                        <p className="text-xs text-purple-200 mt-1">
                          Trích xuất và đối chiếu bám sát: <strong>⭐ Phụ lục I</strong>, <strong>📘 PPCT</strong>, <strong>📗 SGK</strong> và <strong>📙 KHDH cũ</strong>. Bấm nút để soạn KHDH, làm phiếu hoặc phân tích YCCĐ chỉ với 1 chạm.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExtractCatalog(true)}
                          disabled={extractingCatalog}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 border border-purple-400"
                        >
                          {extractingCatalog ? (
                            <>
                              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                              <span>Đang trích xuất lại...</span>
                            </>
                          ) : (
                            <>
                              <span>🔄</span>
                              <span>Trích xuất lại từ nguồn</span>
                            </>
                          )}
                        </button>
                        {catalogData && (
                          <>
                            <button
                              type="button"
                              onClick={handleCopyCatalogMarkdown}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1"
                            >
                              <span>📋</span> Sao chép bảng
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadCatalog}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1"
                            >
                              <span>⬇️</span> Tải .MD
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Source Badges Summary */}
                    {catalogData && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-900/60 text-xs">
                        <span className="bg-purple-900/80 text-purple-200 px-2.5 py-0.5 rounded-full font-bold border border-purple-700">
                          Môn: {catalogData.subject} {catalogData.grade}
                        </span>
                        <span className="bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-800">
                          Tổng: {catalogData.totalLessons} bài ({catalogData.totalPeriods} tiết)
                        </span>
                        <span className="text-purple-300 text-[11px] italic">
                          Căn cứ: {catalogData.sourceSummary}
                        </span>
                      </div>
                    )}

                    {/* Search & Filter */}
                    <div className="pt-2 border-t border-purple-900/60 flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          value={catalogSearchQuery}
                          onChange={(e) => setCatalogSearchQuery(e.target.value)}
                          placeholder="🔍 Tìm theo mã bài học, tên bài, chương, mạch kiến thức..."
                          className="w-full bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-purple-800 text-xs focus:ring-1 focus:ring-purple-400 outline-hidden"
                        />
                        {catalogSearchQuery && (
                          <button
                            onClick={() => setCatalogSearchQuery('')}
                            className="absolute right-2 top-1.5 text-purple-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                        {(['ALL', 'Học kỳ I', 'Học kỳ II'] as const).map((term) => (
                          <button
                            key={term}
                            onClick={() => setCatalogTermFilter(term)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border whitespace-nowrap ${
                              catalogTermFilter === term
                                ? 'bg-purple-600 text-white border-purple-500'
                                : 'bg-slate-900 text-slate-300 border-purple-900 hover:bg-purple-900/60'
                            }`}
                          >
                            {term === 'ALL' ? 'Tất cả học kỳ' : term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Extracting Loading State */}
                  {extractingCatalog && (
                    <div className="p-8 text-center text-xs text-purple-700 bg-purple-50 rounded-2xl border border-purple-200">
                      <span className="animate-spin inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full mr-2" />
                      Đang phân tích và trích xuất danh mục từ Phụ lục I, PPCT, SGK và KHDH cũ...
                    </div>
                  )}

                  {/* Empty Catalog State */}
                  {!extractingCatalog && (!catalogData || !catalogData.lessons || catalogData.lessons.length === 0) && (
                    <div className="p-12 text-center bg-purple-50/50 rounded-2xl border-2 border-dashed border-purple-200 space-y-3">
                      <span className="text-4xl">📑</span>
                      <h4 className="font-bold text-slate-800 text-sm">Chưa có danh mục bài học</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Hệ thống sẽ tự động quét tài liệu nguồn (Phụ lục I, PPCT, SGK) của Thầy/Cô để lập ma trận danh mục bài học đầy đủ kèm dải tiết và tuần học.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleExtractCatalog(true)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        ⚡ Trích xuất Danh mục ngay
                      </button>
                    </div>
                  )}

                  {/* Catalog Table */}
                  {!extractingCatalog && catalogData && catalogData.lessons && catalogData.lessons.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-center w-12">STT</th>
                            <th className="p-3 min-w-[240px]">Mã &amp; Tên bài học chuẩn</th>
                            <th className="p-3 min-w-[170px]">Chương / Mạch</th>
                            <th className="p-3 text-center w-16">Số tiết</th>
                            <th className="p-3 text-center w-24">Tiết PPCT</th>
                            <th className="p-3 text-center w-20">Tuần</th>
                            <th className="p-3 text-center min-w-[130px]">Căn cứ nguồn</th>
                            <th className="p-3 text-center min-w-[210px]">Thực thi nhanh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {catalogData.lessons
                            .filter((l) => {
                              if (catalogTermFilter !== 'ALL' && l.term && !l.term.includes(catalogTermFilter)) {
                                return false;
                              }
                              if (!catalogSearchQuery.trim()) return true;
                              const q = catalogSearchQuery.toLowerCase();
                              return (
                                l.lessonTitle.toLowerCase().includes(q) ||
                                l.lessonCode.toLowerCase().includes(q) ||
                                (l.chapter && l.chapter.toLowerCase().includes(q)) ||
                                (l.strand && l.strand.toLowerCase().includes(q))
                              );
                            })
                            .map((lesson, idx) => (
                              <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                                <td className="p-3 text-center font-bold text-slate-500">
                                  {lesson.stt || idx + 1}
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 leading-snug">
                                    {lesson.lessonTitle}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <code className="bg-slate-100 text-blue-700 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border border-slate-200">
                                      {lesson.lessonCode}
                                    </code>
                                    {lesson.term && (
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        • {lesson.term}
                                      </span>
                                    )}
                                  </div>
                                  {lesson.keyObjectives && lesson.keyObjectives.length > 0 && (
                                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                                      🎯 YCCĐ: {lesson.keyObjectives.join('; ')}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-slate-700">
                                  {lesson.strand && (
                                    <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1 mb-0.5 border border-slate-200">
                                      {lesson.strand}
                                    </span>
                                  )}
                                  <div className="text-[11px] font-medium text-slate-600">
                                    {lesson.chapter || 'Theo phân phối chuẩn'}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[11px] border border-amber-300">
                                    {lesson.totalPeriods}t
                                  </span>
                                </td>
                                <td className="p-3 text-center text-[11px] font-bold text-blue-800">
                                  {lesson.ppctRange || `Tiết ${lesson.stt || idx + 1}`}
                                </td>
                                <td className="p-3 text-center text-[11px] font-medium text-slate-600">
                                  {lesson.weekRange || `Tuần ${Math.ceil((lesson.stt || idx + 1) / 2)}`}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200 whitespace-nowrap">
                                    {lesson.sourceBasis || 'PL1 & PPCT'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex flex-wrap items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCatalogLesson(lesson, 'CONTINUOUS_4SECTION')}
                                      title="Soạn KHDH V11-2 4 phần không tách tiết"
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1"
                                    >
                                      <span>⚡</span>
                                      <span>V11-2</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCatalogLesson(lesson, 'SPLIT_PERIODS')}
                                      title="Soạn KHDH tách tiết PPCT"
                                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1"
                                    >
                                      <span>✂️</span>
                                      <span>Tách tiết</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const code = lesson.lessonCode
                                          ? `${lesson.lessonCode} (${lesson.lessonTitle} - ${lesson.totalPeriods} tiết)`
                                          : lesson.lessonTitle;
                                        setLessonCode(code);
                                        handleAnalyzeLesson(code);
                                      }}
                                      title="Phân tích YCCĐ & Năng lực bài này"
                                      className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1"
                                    >
                                      <span>🔍</span>
                                      <span>Phân tích</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {!loading && activeTab === 'history' && (
                
                  
                    <div className="space-y-4">
                      {/* Header & Controls */}
                      <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-md">
                                WATERTIGHT PER-USER ISOLATION
                              </span>
                              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                                <span>📜</span> LỊCH SỬ NHIỆM VỤ ĐÃ THỰC HIỆN ({taskHistory.length} nhiệm vụ)
                              </h3>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">
                              Không gian riêng của <strong>{currentUser?.name || currentUser?.email || 'Thầy/Cô'}</strong>. Bấm <strong>&quot;Thực Hiện Lại&quot;</strong> để làm lại bài cũ với 1 chạm hoặc <strong>&quot;Xem Lại&quot;</strong> kết quả đã tạo không tốn thêm token AI.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fetchTaskHistory()}
                              disabled={loadingHistory}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1"
                            >
                              <span>🔄</span> Làm mới
                            </button>
                            {taskHistory.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearAllTasks}
                                className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-xl text-xs font-bold transition-all border border-rose-700 flex items-center gap-1"
                              >
                                <span>🗑️</span> Xóa toàn bộ
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                          <div className="relative flex-1 w-full">
                            <input
                              type="text"
                              value={taskHistoryQuery}
                              onChange={(e) => setTaskHistoryQuery(e.target.value)}
                              placeholder="🔍 Tìm theo mã bài học, tên bài, lệnh thực thi..."
                              className="w-full bg-slate-800 text-white px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:ring-1 focus:ring-blue-400 outline-hidden"
                            />
                            {taskHistoryQuery && (
                              <button
                                onClick={() => setTaskHistoryQuery('')}
                                className="absolute right-2 top-1.5 text-slate-400 hover:text-white text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                            {[
                              { id: 'ALL', label: 'Tất cả' },
                              { id: 'SOAN_KHDH_V11', label: 'V11-2' },
                              { id: 'SOAN_KHDH_TACH_TIET', label: 'Tách tiết' },
                              { id: 'PHAN_TICH_BAI_HOC', label: 'Phân tích' },
                              { id: 'PHIEU_HOC_TAP', label: 'Phiếu học tập' },
                              { id: 'TRO_CHOI_GAME', label: 'Game' },
                              { id: 'KICH_BAN_VIDEO', label: 'Video 8s' },
                            ].map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setTaskHistoryTypeFilter(f.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border whitespace-nowrap ${
                                  taskHistoryTypeFilter === f.id
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Loading State */}
                      {loadingHistory && (
                        <div className="p-8 text-center text-xs text-slate-500">
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                          Đang tải lịch sử nhiệm vụ...
                        </div>
                      )}

                      {/* Empty State */}
                      {!loadingHistory && taskHistory.length === 0 && (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                          <span className="text-4xl">📜</span>
                          <h4 className="font-bold text-slate-800 text-sm">Chưa có lịch sử nhiệm vụ</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Khi Thầy/Cô thực hiện các lệnh soạn KHDH, phân tích bài học, tạo phiếu học tập hay làm video, lịch sử sẽ tự động được ghi nhận tại đây để xem lại hoặc thực hiện lại bất kỳ lúc nào.
                          </p>
                        </div>
                      )}

                      {/* Task History Cards List */}
                      {!loadingHistory && taskHistory.length > 0 && (
                        <div className="space-y-3">
                          {taskHistory
                            .filter((t) => {
                              if (taskHistoryTypeFilter !== 'ALL' && t.taskType !== taskHistoryTypeFilter) {
                                return false;
                              }
                              if (!taskHistoryQuery.trim()) return true;
                              const q = taskHistoryQuery.toLowerCase();
                              return (
                                t.lessonCode.toLowerCase().includes(q) ||
                                (t.lessonTitle && t.lessonTitle.toLowerCase().includes(q)) ||
                                t.taskLabel.toLowerCase().includes(q) ||
                                t.command.toLowerCase().includes(q)
                              );
                            })
                            .map((task) => {
                              const timeStr = new Date(task.createdAt).toLocaleString('vi-VN');
                              return (
                                <div
                                  key={task.id}
                                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-blue-300 transition-all space-y-3"
                                >
                                  {/* Card Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs ${
                                          task.taskType === 'SOAN_KHDH_V11'
                                            ? 'bg-emerald-600 text-white'
                                            : task.taskType === 'SOAN_KHDH_TACH_TIET'
                                            ? 'bg-blue-600 text-white'
                                            : task.taskType === 'PHAN_TICH_BAI_HOC'
                                            ? 'bg-purple-600 text-white'
                                            : task.taskType === 'PHIEU_HOC_TAP'
                                            ? 'bg-teal-600 text-white'
                                            : task.taskType === 'TRO_CHOI_GAME'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-purple-700 text-white'
                                        }`}
                                      >
                                        {task.taskLabel}
                                      </span>
                                      <span className="font-mono text-xs font-bold text-slate-800">
                                        {task.lessonCode}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <span>⏱️ {timeStr}</span>
                                      {task.tokenUsage && (
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">
                                          {task.tokenUsage.totalTokens} tokens
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Snippet preview */}
                                  <p className="text-xs text-slate-600 leading-relaxed font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                                    {task.resultSnippet}
                                  </p>

                                  {/* Actions Bar */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleRerunTask(task)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1"
                                      >
                                        <span>🔄</span>
                                        <span>Thực Hiện Lại (Rerun)</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleViewTaskResult(task)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-all flex items-center gap-1"
                                      >
                                        <span>👁️</span>
                                        <span>Xem Lại Kết Quả</span>
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(task.fullOutput);
                                          alert('Đã sao chép nội dung kết quả!');
                                        }}
                                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                                      >
                                        <span>📋</span>
                                        <span>Copy</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-xs font-bold transition-all"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

              {!loading && outputData && (
                <>
                  {activeTab === 'draft' && (
                    <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {outputData.khdh_draft}
                    </div>
                  )}

                  {activeTab === 'preview' && (
                    <div className="space-y-4 text-sm leading-relaxed">
                      <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                        <div className="font-bold text-blue-900">TRƯỜNG THCS QUANG TRUNG | TỔ TOÁN TIN</div>
                        <div className="text-xs text-blue-700 mt-0.5">Giáo viên: Lê Tâm | Năm học 2026-2027</div>
                      </div>
                      <div className="font-mono text-xs whitespace-pre-wrap bg-white p-4 border rounded-xl">
                        {outputData.khdh_draft}
                      </div>
                    </div>
                  )}

                  {activeTab === 'worksheet' && (
                    <div className="space-y-4">
                      {/* Action & Status Header */}
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                            <span>📋</span> PHIẾU HỌC TẬP PHÂN HÓA 3 MỨC ĐỘ
                          </h3>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Tự động bóc tách từ KHDH: Khung ghi nhớ, Bài tập Mức 1-2-3, Dòng kẻ chấm in ấn &amp; Rubric
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={handleGenerateWorksheet}
                            disabled={generatingWorksheet}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                          >
                            {generatingWorksheet ? (
                              <>
                                <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                <span>Đang tạo PHT...</span>
                              </>
                            ) : (
                              <>
                                <span>⚡</span>
                                <span>{worksheetMarkdown ? 'Tạo Lại PHT' : 'Tạo Phiếu Học Tập'}</span>
                              </>
                            )}
                          </button>

                          {worksheetMarkdown && (
                            <>
                              <button
                                onClick={handleCopyWorksheet}
                                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              >
                                <span>📋</span> Sao chép
                              </button>
                              <button
                                onClick={handleDownloadWorksheetWord}
                                disabled={exportingWorksheetWord}
                                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                              >
                                {exportingWorksheetWord ? (
                                  <>
                                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                    <span>Đang xuất Word...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>📥</span>
                                    <span>Tải Word PHT (Chuẩn in)</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content Preview */}
                      {generatingWorksheet && (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full" />
                          <div>
                            <p className="font-bold text-slate-800">Đang phân tích KHDH &amp; tạo Phiếu học tập phân hóa...</p>
                            <p className="text-xs text-slate-500 mt-1">Trích xuất kiến thức trọng tâm, bài tập 3 mức độ và dòng kẻ in ấn...</p>
                          </div>
                        </div>
                      )}

                      {!generatingWorksheet && !worksheetMarkdown && (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                          <span className="text-4xl">📄</span>
                          <h4 className="font-bold text-slate-800 text-sm">Chưa tạo Phiếu học tập cho bài này</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Nhấn nút &quot;Tạo Phiếu Học Tập&quot; ở trên để AI tự động bóc tách bản thảo KHDH thành Phiếu học tập 3 mức độ sẵn sàng in ấn cho học sinh.
                          </p>
                          <button
                            onClick={handleGenerateWorksheet}
                            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                          >
                            <span>🚀</span> Tạo Phiếu Học Tập Ngay
                          </button>
                        </div>
                      )}

                      {!generatingWorksheet && worksheetMarkdown && (
                        <div className="space-y-4">
                          {/* Student Header Mockup */}
                          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-slate-800 border-b pb-2">
                              <span>TRƯỜNG THCS QUANG TRUNG — TỔ TOÁN TIN</span>
                              <span>NĂM HỌC 2026 - 2027</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-1">
                              <div>Họ và tên học sinh: ................................................................</div>
                              <div>Lớp: 8A.....  Nhóm: ........  Thời gian: 15-20 phút</div>
                            </div>
                          </div>

                          {/* Visual AI Image Prompt Box for A4 Portrait Educational Worksheet (8K & Ink-Saving) */}
                          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-2xl shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-emerald-200/80 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-md">
                                    KHỔ A4 DỌC • 8K UHD • TIẾT KIỆM MỰC IN
                                  </span>
                                  <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1">
                                    <span>🎨</span> BỘ PROMPT TẠO ẢNH PHIẾU HỌC TẬP (AI IMAGE GENERATOR)
                                  </h4>
                                </div>
                                <p className="text-[11px] text-emerald-800 mt-0.5">
                                  Mã prompt chuyên biệt cho Midjourney v6, DALL-E 3, Canva AI, Flux.1 và Imagen 3 — Tối ưu in ấn học đường, không tốn mực, nét chữ và hình vẽ toán học siêu nét.
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="bg-white/80 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  📐 Khổ: 9:16 (A4 Dọc)
                                </span>
                                <span className="bg-white/80 text-teal-900 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  🌱 Nền trắng Eco
                                </span>
                                <span className="bg-white/80 text-blue-900 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  ✨ 8K Vector
                                </span>
                              </div>
                            </div>

                            {/* 2 Dedicated Prompt Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* 1. English Prompt (Midjourney / DALL-E / Flux / Imagen 3) */}
                              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 flex flex-col justify-between">
                                <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                                    <span>🇬🇧</span> Midjourney v6 / DALL-E 3 / Flux.1:
                                  </span>
                                  <button
                                    onClick={() => {
                                      const promptEn = `A clean, minimalist print-ready Vietnamese educational student worksheet design on a vertical A4 portrait format (aspect ratio 9:16). Top header: 'TRƯỜNG THCS QUANG TRUNG | TỔ TOÁN TIN', student information box (Họ và tên, Lớp, Ngày, Nhóm). Header Title: 'PHIẾU HỌC TẬP: ${(outputData?.lesson_code || 'BÀI HỌC').toUpperCase()}' in navy blue (#0F4C81). Box 1: Core Knowledge Summary with clean icons. Box 2: 3-tier differentiated practice problems with dotted lines for student written answers and 2D vector geometry diagrams. Footer: Self-evaluation rubric stars and teacher signature. Style: Eco-friendly ink-saving print layout, pure white background (#FFFFFF), sharp Vietnamese typography, 8K UHD resolution, 300 DPI print quality --ar 9:16 --v 6.1 --style raw`;
                                      handleCopySnippet(promptEn, 'worksheet_prompt_en');
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                                      copiedTarget === 'worksheet_prompt_en'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700'
                                    }`}
                                  >
                                    <span>{copiedTarget === 'worksheet_prompt_en' ? '✓' : '📋'}</span>
                                    <span>{copiedTarget === 'worksheet_prompt_en' ? 'Đã copy!' : 'Copy Prompt EN'}</span>
                                  </button>
                                </div>
                                <div className="p-2.5 font-mono text-[11px] text-sky-300 leading-relaxed max-h-32 overflow-y-auto select-all">
                                  A clean, minimalist print-ready Vietnamese educational student worksheet design on a vertical A4 portrait format (aspect ratio 9:16). Top header: &apos;TRƯỜNG THCS QUANG TRUNG | TỔ TOÁN TIN&apos;, student info box. Header Title: &apos;PHIẾU HỌC TẬP: {(outputData?.lesson_code || 'BÀI HỌC').toUpperCase()}&apos; in navy blue (#0F4C81). 3-tier differentiated practice problems with dotted lines and 2D vector geometry. Eco-friendly ink-saving print layout, pure white background, sharp typography, 8K UHD, 300 DPI --ar 9:16 --v 6.1 --style raw
                                </div>
                              </div>

                              {/* 2. Vietnamese Prompt (Canva AI / ChatGPT / Bing Creator) */}
                              <div className="rounded-xl overflow-hidden border border-emerald-300 bg-white flex flex-col justify-between">
                                <div className="px-3 py-2 bg-emerald-100/70 border-b border-emerald-200 flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                                    <span>🇻🇳</span> Canva AI / ChatGPT DALL-E / Bing Creator:
                                  </span>
                                  <button
                                    onClick={() => {
                                      const promptVi = `Thiết kế mẫu phiếu học tập học sinh khổ A4 dọc chuẩn sư phạm cho bài học '${outputData?.lesson_code || 'Toán học'}'. Bố cục gồm: Tiêu đề trường 'TRƯỜNG THCS QUANG TRUNG - TỔ TOÁN TIN', khung điền thông tin học sinh (Họ tên, Lớp, Ngày). Tiêu đề lớn in đậm: 'PHIẾU HỌC TẬP: ${(outputData?.lesson_code || 'BÀI HỌC').toUpperCase()}'. Khung tóm tắt Kiến thức trọng tâm; Hệ thống bài tập phân hóa 3 mức độ (Nhận biết, Vận dụng, Vận dụng cao) có các dòng kẻ chấm chấm để học sinh ghi lời giải; Góc tự đánh giá Rubric và chữ ký giáo viên. Phong cách tối giản, nền trắng tiết kiệm mực in, hình vẽ sắc nét 8K, chuẩn tiếng Việt.`;
                                      handleCopySnippet(promptVi, 'worksheet_prompt_vi');
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                                      copiedTarget === 'worksheet_prompt_vi'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-50 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                                    }`}
                                  >
                                    <span>{copiedTarget === 'worksheet_prompt_vi' ? '✓' : '📋'}</span>
                                    <span>{copiedTarget === 'worksheet_prompt_vi' ? 'Đã copy!' : 'Copy Prompt VI'}</span>
                                  </button>
                                </div>
                                <div className="p-2.5 font-mono text-[11px] text-emerald-950 leading-relaxed max-h-32 overflow-y-auto select-all">
                                  Thiết kế mẫu phiếu học tập học sinh khổ A4 dọc chuẩn sư phạm cho bài học &apos;{outputData?.lesson_code || 'Toán học'}&apos;. Bố cục gồm: Tiêu đề trường học &apos;TRƯỜNG THCS QUANG TRUNG - TỔ TOÁN TIN&apos;, khung điền thông tin học sinh, tiêu đề lớn &apos;PHIẾU HỌC TẬP&apos;, khung tóm tắt kiến thức trọng tâm, bài tập phân hóa 3 mức độ có dòng kẻ chấm làm bài, góc tự đánh giá rubric. Nền trắng tinh khôi tiết kiệm mực in, độ nét 8K, chuẩn tiếng Việt.
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Markdown Body */}
                          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                            {worksheetMarkdown}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'game' && (
                    <div className="space-y-4">
                      {/* Action & Control Bar */}
                      <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                            <span>🎮</span> TRÒ CHƠI TƯƠNG TÁC (SINGLE-FILE HTML CHẠY OFFLINE)
                          </h3>
                          <p className="text-xs text-indigo-800 mt-0.5">
                            Bóc tách câu hỏi từ KHDH, tích hợp âm thanh Web Audio, KaTeX công thức Toán &amp; pháo hoa chiến thắng
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleGenerateGame()}
                            disabled={generatingGame}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                          >
                            {generatingGame ? (
                              <>
                                <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                <span>Đang tạo Game...</span>
                              </>
                            ) : (
                              <>
                                <span>⚡</span>
                                <span>{gameHtml ? 'Tạo Lại Game' : 'Tạo Trò Chơi'}</span>
                              </>
                            )}
                          </button>

                          {gameHtml && (
                            <button
                              onClick={handleDownloadGameHtml}
                              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <span>📥</span>
                              <span>Tải File Game (.html)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Loading State */}
                      {generatingGame && (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
                          <div>
                            <p className="font-bold text-slate-800">Đang phân tích KHDH &amp; biên dịch Trò chơi tương tác...</p>
                            <p className="text-xs text-slate-500 mt-1">Đóng gói âm thanh hiệu ứng, công thức Toán KaTeX và giao diện chơi...</p>
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {!generatingGame && !gameHtml && (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                          <span className="text-4xl">🚀</span>
                          <h4 className="font-bold text-slate-800 text-sm">Chưa có Trò chơi tương tác cho bài học này</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Nhấn nút &quot;Tạo Trò Chơi&quot; ở trên để AI tự động trích xuất các câu hỏi từ KHDH thành file game HTML5 chuyên nghiệp, chơi được trực tiếp hoặc chiếu trên lớp học.
                          </p>
                          <button
                            onClick={() => handleGenerateGame()}
                            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                          >
                            <span>🎮</span> Tạo Trò Chơi Ngay
                          </button>
                        </div>
                      )}

                      {/* Live Interactive Iframe Preview */}
                      {!generatingGame && gameHtml && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span>🕹️</span> Khung chơi thử trực tiếp (Interactive Live Preview):
                            </span>
                            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              🟢 Sẵn sàng trình chiếu / Chạy Offline
                            </span>
                          </div>
                          <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-xl">
                            <iframe
                              srcDoc={gameHtml}
                              title="Interactive Math Game"
                              className="w-full h-[560px] border-0"
                              sandbox="allow-scripts allow-same-origin allow-modals"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'storyboard' && (
                    <div className="space-y-4">
                      {/* Google Flow & Video AI Master Configuration Bar */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 bg-purple-700 text-white font-black text-[10px] uppercase tracking-wider rounded-md">
                                GOOGLE FLOW &amp; VIDEO AI READY
                              </span>
                              <h3 className="text-sm font-black text-purple-950 flex items-center gap-1.5">
                                <span>🎬</span> KỊCH BẢN VIDEO GIÁO DỤC 8S (GOOGLE FLOW / VEO / SORA)
                              </h3>
                            </div>
                            <p className="text-xs text-purple-800 mt-1">
                              Tạo bộ phân cảnh chuẩn <strong>8 giây/clip</strong> cho Google Flow. Prompt B-Roll cam kết <strong>KHÔNG TEXT, KHÔNG UI, KHÔNG WATERMARK</strong>; lời thoại và công thức được tách riêng cho khâu chèn hậu kỳ.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={handleGenerateStoryboard}
                              disabled={generatingStoryboard}
                              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                            >
                              {generatingStoryboard ? (
                                <>
                                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                  <span>Đang xuất kịch bản 8s...</span>
                                </>
                              ) : (
                                <>
                                  <span>🚀</span>
                                  <span>{storyboardData ? 'Tạo Lại Kịch Bản 8s' : 'Xuất Kịch Bản Google Flow'}</span>
                                </>
                              )}
                            </button>

                            {storyboardData && (
                              <button
                                onClick={handleDownloadStoryboardMd}
                                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                              >
                                <span>📥</span>
                                <span>Tải Kịch Bản (.md)</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 3 Interactive Buttons / Selectors for Google Flow */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-purple-200/80 text-xs">
                          {/* (1) Phong cách (Visual Style) */}
                          <div className="bg-white/90 p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                            <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1">
                              <span>🎨</span> (1) Phong cách Thị giác:
                            </label>
                            <select
                              value={selectedVideoStyle}
                              onChange={(e) => setSelectedVideoStyle(e.target.value as VideoStyleId)}
                              disabled={generatingStoryboard}
                              className="w-full bg-purple-50/50 border border-purple-300 text-purple-950 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                            >
                              {VIDEO_STYLES.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.icon} {st.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-slate-500 leading-tight">
                              {VIDEO_STYLES.find((s) => s.id === selectedVideoStyle)?.desc}
                            </p>
                          </div>

                          {/* (2) Số cảnh 8 giây (Number of 8s Scenes) */}
                          <div className="bg-white/90 p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                            <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>⏱️</span> (2) Số cảnh 8 giây:
                              </span>
                              <span className="text-[11px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                                Tổng: {selectedNumScenes8s * 8}s
                              </span>
                            </label>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {SCENE_COUNT_OPTIONS.map((count) => (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => setSelectedNumScenes8s(count)}
                                  disabled={generatingStoryboard}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                    selectedNumScenes8s === count
                                      ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                                      : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {count} cảnh ({count * 8}s)
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                              Mỗi clip đúng 8s theo chuẩn tạo video Google Flow &amp; Veo.
                            </p>
                          </div>

                          {/* (3) Các thể loại video giáo dục (Educational Video Genres) */}
                          <div className="bg-white/90 p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                            <label className="block text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1">
                              <span>📚</span> (3) Thể loại Video Giáo dục:
                            </label>
                            <select
                              value={selectedVideoGenre}
                              onChange={(e) => setSelectedVideoGenre(e.target.value as VideoGenreId)}
                              disabled={generatingStoryboard}
                              className="w-full bg-purple-50/50 border border-purple-300 text-purple-950 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                            >
                              {VIDEO_GENRES.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.icon} {g.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-slate-500 leading-tight">
                              {VIDEO_GENRES.find((g) => g.id === selectedVideoGenre)?.desc}
                            </p>
                          </div>
                        </div>

                        {/* Standard Compliance Banner */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-100/70 border border-purple-200 rounded-xl text-[11px] text-purple-900 font-medium">
                          <span className="text-sm">🛡️</span>
                          <span>
                            <strong>Quy chuẩn Google Flow:</strong> Mọi cảnh video &amp; ảnh sinh ra đều có cờ <code>--no text, words, ui, buttons, watermark</code>. Video thuần hiệu ứng thị giác b-roll để bạn ghép voiceover và overlay text trong CapCut/Canva.
                          </span>
                        </div>

                        {/* Batch Copy Toolbar */}
                        {storyboardData && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-200/80 text-xs">
                            <span className="text-purple-900 font-bold text-[11px] flex items-center gap-1 mr-1">
                              <span>⚡</span> Sao chép nhanh:
                            </span>

                            <button
                              onClick={handleCopyAllVideoPrompts}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all border shadow-2xs flex items-center gap-1 ${
                                copiedTarget === 'all_video_prompts'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                              }`}
                            >
                              <span>{copiedTarget === 'all_video_prompts' ? '✓' : '🎬'}</span>
                              <span>{copiedTarget === 'all_video_prompts' ? 'Đã copy All Video Prompts!' : 'Copy Tất Cả Prompt Video'}</span>
                            </button>

                            <button
                              onClick={handleCopyAllImagePrompts}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all border shadow-2xs flex items-center gap-1 ${
                                copiedTarget === 'all_img_prompts'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                              }`}
                            >
                              <span>{copiedTarget === 'all_img_prompts' ? '✓' : '🖼️'}</span>
                              <span>{copiedTarget === 'all_img_prompts' ? 'Đã copy All Image Prompts!' : 'Copy Tất Cả Prompt Ảnh'}</span>
                            </button>

                            <button
                              onClick={handleCopyAllVoiceovers}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all border shadow-2xs flex items-center gap-1 ${
                                copiedTarget === 'all_voiceovers'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white hover:bg-purple-50 text-purple-900 border-purple-200'
                              }`}
                            >
                              <span>{copiedTarget === 'all_voiceovers' ? '✓' : '🎙️'}</span>
                              <span>{copiedTarget === 'all_voiceovers' ? 'Đã copy All Lời thoại!' : 'Copy Tất Cả Lời Thoại'}</span>
                            </button>

                            <button
                              onClick={handleCopyFullCodeText}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all border shadow-2xs flex items-center gap-1 ${
                                copiedTarget === 'all_full_code'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-purple-900 hover:bg-purple-950 text-white border-purple-900'
                              }`}
                            >
                              <span>{copiedTarget === 'all_full_code' ? '✓' : '📋'}</span>
                              <span>{copiedTarget === 'all_full_code' ? 'Đã copy Toàn Bộ Kịch Bản!' : 'Copy Full Code Text'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Loading State */}
                      {generatingStoryboard && (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="animate-spin w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full" />
                          <div>
                            <p className="font-bold text-slate-800">Đang kiến tạo Storyboard &amp; Bộ Prompt AI Video...</p>
                            <p className="text-xs text-slate-500 mt-1">Đóng gói Prompt Ảnh, Prompt Video Runway/Sora và Lời thoại tiếng Việt chuẩn sư phạm...</p>
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {!generatingStoryboard && !storyboardData && (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                          <span className="text-4xl">🎬</span>
                          <h4 className="font-bold text-slate-800 text-sm">Chưa có Kịch bản Video cho bài học này</h4>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Nhấn nút &quot;Tạo Kịch Bản Video&quot; để AI tự động chuyển hóa KHDH thành kịch bản phân cảnh Storyboard 5 bước có đủ Prompt Ảnh, Prompt Video và Lời thoại tiếng Việt dưới dạng code text dễ copy.
                          </p>
                          <button
                            onClick={handleGenerateStoryboard}
                            className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                          >
                            <span>🚀</span> Tạo Kịch Bản Video Ngay
                          </button>
                        </div>
                      )}

                      {/* Storyboard Content Matrix */}
                      {!generatingStoryboard && storyboardData && (
                        <div className="space-y-4">
                          {/* Summary Bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs">
                              <span className="text-purple-700 font-semibold block">⏱️ Thời lượng 8s/clip:</span>
                              <span className="font-bold text-purple-950 text-xs sm:text-sm">{storyboardData.totalDuration}</span>
                            </div>
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                              <span className="text-blue-700 font-semibold block">🎨 Phong cách:</span>
                              <span className="font-bold text-blue-950 text-xs">{storyboardData.videoStyle}</span>
                            </div>
                            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs">
                              <span className="text-indigo-700 font-semibold block">📚 Thể loại:</span>
                              <span className="font-bold text-indigo-950 text-xs">{storyboardData.videoGenre || 'Khám phá kiến thức'}</span>
                            </div>
                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                              <span className="text-emerald-700 font-semibold block">🎯 Quy chuẩn Prompt:</span>
                              <span className="font-bold text-emerald-950 text-xs">Zero-Text / Clean B-Roll</span>
                            </div>
                          </div>

                          {/* Scenes List */}
                          <div className="space-y-5">
                            {storyboardData.scenes.map((scene, idx) => {
                              const imgPrompt = scene.imagePrompt || scene.videoPrompt || '';
                              const vidPrompt = scene.videoPrompt || scene.aiVideoPrompt || '';
                              const voScript = scene.voiceoverScript || '';

                              return (
                                <div
                                  key={idx}
                                  className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 hover:border-purple-300 transition-all"
                                >
                                  {/* Scene Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                      <span className="px-2.5 py-1 bg-purple-700 text-white rounded-lg font-black text-xs shadow-2xs">
                                        CẢNH {scene.sceneNumber}
                                      </span>
                                      <h4 className="font-bold text-slate-900 text-sm">
                                        {scene.title}
                                      </h4>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 border border-purple-200 rounded-full text-xs font-bold flex items-center gap-1">
                                        <span>⏱️</span> {scene.duration || '8s'} (Google Flow Ready)
                                      </span>
                                      <button
                                        onClick={() => handleCopyFullScene(scene, idx)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
                                          copiedTarget === `scene_full_${idx}`
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                        }`}
                                      >
                                        <span>{copiedTarget === `scene_full_${idx}` ? '✓' : '📋'}</span>
                                        <span>{copiedTarget === `scene_full_${idx}` ? 'Đã copy Cảnh ' + scene.sceneNumber : 'Copy Trọn Cảnh ' + scene.sceneNumber}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Scene Context Info */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div>
                                      <span className="font-bold text-slate-700 block mb-0.5">👁️ Mô tả thị giác &amp; Góc quay:</span>
                                      <p className="text-slate-600 leading-relaxed">{scene.visualDescription}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                      {scene.onScreenText && (
                                        <div>
                                          <span className="font-bold text-slate-700 block mb-0.5">📺 Chữ / Công thức trên màn hình:</span>
                                          <div className="font-mono text-blue-800 font-bold bg-blue-50/80 p-1.5 rounded border border-blue-200 text-[11px]">
                                            {scene.onScreenText}
                                          </div>
                                        </div>
                                      )}
                                      {scene.audioPrompt && (
                                        <div className="text-[11px] text-slate-500">
                                          <span className="font-bold text-slate-700">🎵 Âm thanh:</span> {scene.audioPrompt}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* 3 Core Code Text Blocks */}
                                  <div className="space-y-3">
                                    {/* 1. Lời thoại tiếng Việt */}
                                    <div className="rounded-xl overflow-hidden border border-amber-200 bg-amber-50/40">
                                      <div className="px-3 py-2 bg-amber-100/70 border-b border-amber-200 flex items-center justify-between">
                                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                          <span>🎙️</span> Lời Thoại Thuyết Minh Tiếng Việt (Sư Phạm / ElevenLabs / Vbee):
                                        </span>
                                        <button
                                          onClick={() => handleCopySnippet(voScript, `vo_${idx}`)}
                                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                                            copiedTarget === `vo_${idx}`
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
                                          }`}
                                        >
                                          <span>{copiedTarget === `vo_${idx}` ? '✓' : '📋'}</span>
                                          <span>{copiedTarget === `vo_${idx}` ? 'Đã copy!' : 'Copy Lời Thoại'}</span>
                                        </button>
                                      </div>
                                      <div className="p-3 font-mono text-xs text-amber-950 whitespace-pre-wrap leading-relaxed bg-white/70">
                                        &quot;{voScript}&quot;
                                      </div>
                                    </div>

                                    {/* 2. Prompt Ảnh Keyframe */}
                                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100">
                                      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                                          <span>🖼️</span> Prompt Ảnh Keyframe (Midjourney v6 / Flux.1 / DALL-E 3):
                                        </span>
                                        <button
                                          onClick={() => handleCopySnippet(imgPrompt, `img_${idx}`)}
                                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                                            copiedTarget === `img_${idx}`
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700'
                                          }`}
                                        >
                                          <span>{copiedTarget === `img_${idx}` ? '✓' : '📋'}</span>
                                          <span>{copiedTarget === `img_${idx}` ? 'Đã copy!' : 'Copy Prompt Ảnh'}</span>
                                        </button>
                                      </div>
                                      <div className="p-3 font-mono text-xs text-sky-300 whitespace-pre-wrap leading-relaxed overflow-x-auto select-all">
                                        {imgPrompt}
                                      </div>
                                    </div>

                                    {/* 3. Prompt Video Chuyển Động */}
                                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100">
                                      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                          <span>🎬</span> Prompt Video Chuyển Động (Runway Gen-3 Alpha / Kling 1.5 / Sora):
                                        </span>
                                        <button
                                          onClick={() => handleCopySnippet(vidPrompt, `vid_${idx}`)}
                                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                                            copiedTarget === `vid_${idx}`
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                                          }`}
                                        >
                                          <span>{copiedTarget === `vid_${idx}` ? '✓' : '📋'}</span>
                                          <span>{copiedTarget === `vid_${idx}` ? 'Đã copy!' : 'Copy Prompt Video'}</span>
                                        </button>
                                      </div>
                                      <div className="p-3 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto select-all">
                                        {vidPrompt}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'slide' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs font-medium border border-amber-200">
                        💡 Mỗi tiết học tạo 1 deck gồm 15-20 slide với Canva Prompt độc lập.
                      </div>
                      <div className="font-mono text-xs whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border">
                        {outputData.khdh_draft.includes('[CANVA_SLIDE_PROMPT]')
                          ? outputData.khdh_draft
                          : 'Để xem Canva prompt chi tiết, hãy chạy lệnh XUAT_CANVA_PROMPT hoặc SOAN_XUAT_CANVA.'}
                      </div>
                    </div>
                  )}

                  {activeTab === 'sources' && (
                    <div className="space-y-4 text-xs">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                        <p className="font-bold flex items-center gap-1.5">
                          <span>📚</span> Danh sách căn cứ tài liệu nguồn đã được AI sử dụng:
                        </p>
                      </div>

                      {outputData.sources_used && outputData.sources_used.length > 0 ? (
                        <div className="space-y-2">
                          {outputData.sources_used.map((s, idx) => {
                            const meta = DOC_TYPE_LABELS[s.type] || DOC_TYPE_LABELS.OTHER;
                            return (
                              <div
                                key={idx}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{meta.icon}</span>
                                  <div>
                                    <div className="font-bold text-slate-800">{s.name}</div>
                                    <div className="text-slate-500 text-[11px]">{meta.desc}</div>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded font-bold text-xs border ${meta.badgeClass}`}>
                                  v{s.version}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border">
                          Chưa có tài liệu nguồn nào được tải lên cho lần tạo này (dùng chuẩn mặc định 5512).
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'stats' && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 border rounded-xl">
                          <span className="text-slate-500 block">Input Tokens:</span>
                          <span className="text-base font-bold text-slate-800">
                            {outputData.token_usage?.inputTokens || 0}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-xl">
                          <span className="text-slate-500 block">Output Tokens:</span>
                          <span className="text-base font-bold text-slate-800">
                            {outputData.token_usage?.outputTokens || 0}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-xl">
                          <span className="text-slate-500 block">Tổng Token:</span>
                          <span className="text-base font-bold text-blue-700">
                            {outputData.token_usage?.totalTokens || 0}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-xl">
                          <span className="text-slate-500 block">Thời gian xử lý:</span>
                          <span className="text-base font-bold text-slate-800">
                            {((outputData.duration_ms || 0) / 1000).toFixed(2)}s
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                        <div><span className="font-semibold">Mã Job:</span> {outputData.job_id}</div>
                        <div><span className="font-semibold">Mô hình AI:</span> {outputData.model}</div>
                        <div><span className="font-semibold">Key đã sử dụng:</span> <code className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-700">{outputData.key_used || 'Mặc định'}</code></div>
                        <div><span className="font-semibold">Lệnh thực thi:</span> {outputData.command}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Toolbar */}
            {outputData && (
              <div className="border-t border-slate-200 bg-slate-50 p-3 px-5 flex flex-wrap justify-between items-center gap-3">
                <span className="text-xs text-slate-500">
                  Job ID: <code className="font-semibold">{outputData.job_id}</code>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <span>📋</span> Sao chép Markdown
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <span>⬇️</span> Tải file (.md)
                  </button>

                  {/* Word Download Dropdown */}
                  <div className="relative inline-block text-left">
                    <button
                      onClick={() => setShowWordMenu(!showWordMenu)}
                      disabled={exportingWord}
                      className="btn-primary text-xs flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-3.5 rounded-lg shadow-sm transition-all"
                    >
                      {exportingWord ? (
                        <>
                          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Đang tạo Word...</span>
                        </>
                      ) : (
                        <>
                          <span>📥</span>
                          <span>Tải xuống Word ▼</span>
                        </>
                      )}
                    </button>

                    {showWordMenu && !exportingWord && (
                      <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                          Tùy chọn xuất Word (.docx)
                        </div>

                        {/* Option 1: Compact Print OMML (Default) */}
                        <button
                          onClick={() => {
                            setShowWordMenu(false);
                            handleDownloadWord('omml', 'COMPACT_PRINT');
                          }}
                          className="w-full text-left p-2.5 hover:bg-blue-50/80 rounded-xl transition-all flex flex-col gap-0.5 group border border-transparent hover:border-blue-200 bg-blue-50/40"
                        >
                          <div className="font-bold text-blue-900 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>🖨️</span> Word OMML – Tiết kiệm in
                            </span>
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-bold">Mặc định</span>
                          </div>
                          <p className="text-[11px] text-slate-600 group-hover:text-blue-800 leading-snug mt-0.5">
                            Font 13pt, lề gọn 15-20mm, giãn dòng 1.05, tối ưu trang &amp; mực in đen trắng
                          </p>
                        </button>

                        {/* Option 2: Standard OMML */}
                        <button
                          onClick={() => {
                            setShowWordMenu(false);
                            handleDownloadWord('omml', 'STANDARD');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl transition-all flex flex-col gap-0.5 group border border-transparent hover:border-slate-200"
                        >
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>📄</span> Word OMML – Tiêu chuẩn
                          </div>
                          <p className="text-[11px] text-slate-500 group-hover:text-slate-700 leading-snug mt-0.5">
                            Font 14pt, lề chuẩn 20-25mm, giãn dòng 1.15 rộng rãi, công thức Equation
                          </p>
                        </button>

                        {/* Option 3: LaTeX Raw Mode */}
                        <button
                          onClick={() => {
                            setShowWordMenu(false);
                            handleDownloadWord('latex', 'COMPACT_PRINT');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl transition-all flex flex-col gap-0.5 group border border-transparent hover:border-slate-200"
                        >
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>📐</span> Word giữ công thức LaTeX
                          </div>
                          <p className="text-[11px] text-slate-500 group-hover:text-slate-700 leading-snug mt-0.5">
                            Giữ nguyên mã nguồn $...$ để dễ copy và tái sử dụng
                          </p>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

            {/* Google Cloud OAuth 2.0 Connection Guide Modal */}
      {showGcpGuideModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <h3 className="text-base font-black text-slate-800">
                  Liên Kết Ứng Dụng Với Google OAuth 2.0
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGcpGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>💡</span> Kết nối trực tiếp với tài khoản Google:
                </p>
                <p>
                  Để cửa sổ Google bật lên cho Thầy/Cô chọn tài khoản, ứng dụng cần <strong>Google Client ID</strong> từ Google Cloud Console.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhập Google Client ID của bạn:
                </label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="xxxx-xxxxxxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Hoặc cấu hình biến môi trường <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> trong Vercel / .env.local
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-800">Các bước tạo Client ID (2 phút):</div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Google Cloud Console Credentials</a>.</li>
                  <li>Bấm <strong>Create Credentials</strong> &gt; chọn <strong>OAuth client ID</strong>.</li>
                  <li>Chọn Application type là <strong>Web application</strong>.</li>
                  <li>Thêm Authorized JavaScript origins: domain website của bạn.</li>
                  <li>Copy <strong>Client ID</strong> dán vào ô trên và bấm <strong>Lưu &amp; Kích Hoạt</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 gap-2">
              <button
                type="button"
                onClick={() => setShowGcpGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  if (googleClientId.trim()) {
                    localStorage.setItem('khdh_google_client_id', googleClientId.trim());
                    alert('Đã lưu Google Client ID! Nút đăng nhập Google sẽ tự động kích hoạt.');
                  }
                  setShowGcpGuideModal(false);
                }}
                className="btn-primary text-xs px-5 py-2.5"
              >
                Lưu &amp; Kích Hoạt Nút Google
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-Time Activation / Onboarding Modal */}
      {showOnboardingModal && currentUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl shadow-xs">
                🎉
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Chào mừng Thầy/Cô {currentUser.name}!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tài khoản: <strong className="text-slate-700">{currentUser.email}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🔑</span> Kích hoạt quyền sử dụng lần đầu:
                </p>
                <p>
                  Để hệ thống AI soạn giáo án, phiếu học tập và kịch bản video hoạt động, Thầy/Cô vui lòng dán <strong>Google AI API Key</strong> vào ô bên dưới.
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold pt-1">
                  ✓ Khóa này sẽ được mã hóa an toàn và gắn liền với tài khoản Google của Thầy/Cô vĩnh viễn (không cần nhập lại lần sau).
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-slate-700">
                    Nhập Google AI API Key của bạn:
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 underline"
                  >
                    <span>🔗</span> Lấy Key miễn phí tại Google AI Studio
                  </a>
                </div>
                <textarea
                  rows={4}
                  value={rawKeysInput}
                  onChange={(e) => setRawKeysInput(e.target.value)}
                  placeholder="AIzaSyA123456789... (Có thể dán nhiều key, mỗi key 1 dòng)"
                  className="input-field font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Test key feedback */}
              {multiKeyResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    multiKeyResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {multiKeyResult.message}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-2">
              <button
                type="button"
                onClick={handleTestKeys}
                disabled={testingKey || currentParsedKeys.length === 0}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 flex items-center justify-center gap-1.5"
              >
                {testingKey ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full" />
                    <span>Đang test...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Kiểm tra Key</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveOnboardingKeys}
                disabled={currentParsedKeys.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>Lưu &amp; Kích Hoạt Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Key Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>🔐</span> Cấu Hình Danh Sách Google AI API Keys
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hỗ trợ nhập nhiều key – tự động xoay vòng và dự phòng khi hết hạn mức
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <span>💡</span> Mẹo sử dụng Multi-Key:
                </p>
                <p>
                  Bạn có thể dán <strong>nhiều API Keys</strong> (mỗi key trên 1 dòng hoặc cách nhau bằng dấu phẩy). Hệ thống sẽ tự động luân phiên (Round-Robin) và tự chuyển sang Key tiếp theo nếu Key trước hết Quota trong ngày.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">
                    Danh sách Google AI API Keys:
                  </label>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {currentParsedKeys.length} Key hợp lệ
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={rawKeysInput}
                  onChange={(e) => setRawKeysInput(e.target.value)}
                  placeholder={`AIzaSyKey1...\nAIzaSyKey2...\nAIzaSyKey3...`}
                  className="input-field font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember-key"
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-key" className="text-slate-700 font-medium cursor-pointer">
                  Ghi nhớ danh sách key trên thiết bị này (localStorage)
                </label>
              </div>

              {/* Multi-Key Test Results */}
              {multiKeyResult && (
                <div className="space-y-2 pt-2 border-t">
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold ${
                      multiKeyResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {multiKeyResult.message}
                  </div>

                  {multiKeyResult.details.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {multiKeyResult.details.map((d, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-slate-50 border rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span>
                              {d.status === 'ACTIVE'
                                ? '🟢'
                                : d.status === 'QUOTA_EXHAUSTED'
                                ? '🟡'
                                : '🔴'}
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {d.maskedKey}
                            </span>
                          </div>
                          <span
                            className={`text-xs ${
                              d.status === 'ACTIVE'
                                ? 'text-emerald-700 font-medium'
                                : d.status === 'QUOTA_EXHAUSTED'
                                ? 'text-amber-700 font-medium'
                                : 'text-rose-700 font-medium'
                            }`}
                          >
                            {d.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-4 gap-2">
              <button
                onClick={handleTestKeys}
                disabled={testingKey || currentParsedKeys.length === 0}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                {testingKey ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full" />
                    <span>Đang kiểm tra {currentParsedKeys.length} keys...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Kiểm tra tất cả Key</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="btn-primary text-xs"
                >
                  Lưu & Áp Dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{DOC_TYPE_LABELS[previewDoc.documentType]?.icon || '📄'}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-800 truncate">{previewDoc.displayName}</h3>
                  <p className="text-xs text-slate-500">{previewDoc.originalFileName} (Phiên bản v{previewDoc.version})</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="font-semibold">Phân loại:</span> {DOC_TYPE_LABELS[previewDoc.documentType]?.label}</div>
                <div><span className="font-semibold">Dung lượng:</span> {(previewDoc.fileSize / 1024).toFixed(1)} KB</div>
                <div><span className="font-semibold">Ngày nạp:</span> {new Date(previewDoc.createdAt).toLocaleString('vi-VN')}</div>
                <div><span className="font-semibold">Trạng thái:</span> {previewDoc.status}</div>
                <div><span className="font-semibold">Tóm tắt:</span> {previewDoc.contentSummary}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nội dung văn bản trích xuất:</label>
                <div className="font-mono text-xs whitespace-pre-wrap bg-slate-900 text-slate-100 p-4 rounded-xl max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
                  {previewDoc.extractedText || 'Chưa có nội dung văn bản trích xuất.'}
                </div>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setPreviewDoc(null)}
                className="btn-primary text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>✏️</span> Chỉnh Sửa Thông Tin Tài Liệu Nguồn
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị:</label>
                <input
                  type="text"
                  value={editingDoc.displayName}
                  onChange={(e) => setEditingDoc({ ...editingDoc, displayName: e.target.value })}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phân loại tài liệu:</label>
                <select
                  value={editingDoc.documentType}
                  onChange={(e) => setEditingDoc({ ...editingDoc, documentType: e.target.value as SourceDocumentType })}
                  className="input-field text-xs"
                >
                  <option value="PL1">⭐ Phụ lục I hiện hành (Ưu tiên 1)</option>
                  <option value="PPCT">📘 PPCT - Phân phối chương trình (Ưu tiên 2)</option>
                  <option value="SGK">📗 Sách giáo khoa - SGK (Kiến thức chính)</option>
                  <option value="KHDH_OLD">📙 KHDH cũ (Tài liệu tham khảo)</option>
                  <option value="OTHER">📄 Tài liệu khác (SBT, SGV, Phụ lục III...)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveDocEdit}
                className="btn-primary text-xs"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
              <span>⚠️</span> Xác Nhận Xóa Tài Liệu
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài liệu <strong>&quot;{deleteConfirmDoc.displayName}&quot;</strong> không?
              {deleteConfirmDoc.isActive && (
                <span className="block mt-1 text-amber-700 font-semibold">
                  Tài liệu này đang được kích hoạt để phục vụ biên soạn KHDH AI.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteConfirmDoc.id)}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Requirement Analysis & Locked Configuration Modal */}
      {showAnalysisModal && lessonAnalysis && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>🔍</span> Phân Tích Yêu Cầu &amp; Cố Định Cấu Hình Bài Học
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bóc tách từ Chương trình GDPT 2018 &amp; Căn cứ tài liệu nguồn (Phụ lục I, PPCT, SGK)
                </p>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="space-y-4 text-xs">
              {/* 1. Tên bài & Thời lượng */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📌</span> 1. Thông tin bài dạy chuẩn:
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Tên bài học chuẩn:
                  </label>
                  <input
                    type="text"
                    value={lessonAnalysis.lessonTitle}
                    onChange={(e) =>
                      setLessonAnalysis({ ...lessonAnalysis, lessonTitle: e.target.value })
                    }
                    className="input-field text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Số tiết:</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={lessonAnalysis.totalPeriods}
                      onChange={(e) =>
                        setLessonAnalysis({
                          ...lessonAnalysis,
                          totalPeriods: parseInt(e.target.value) || 1,
                        })
                      }
                      className="input-field text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Khối lớp:</label>
                    <input
                      type="text"
                      value={lessonAnalysis.grade}
                      onChange={(e) =>
                        setLessonAnalysis({ ...lessonAnalysis, grade: e.target.value })
                      }
                      className="input-field text-xs text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Học kỳ:</label>
                    <input
                      type="text"
                      value={lessonAnalysis.term}
                      onChange={(e) =>
                        setLessonAnalysis({ ...lessonAnalysis, term: e.target.value })
                      }
                      className="input-field text-xs text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Phân bổ nội dung từng tiết:
                  </label>
                  <div className="space-y-1.5">
                    {lessonAnalysis.periodBreakdown.map((periodText, pIdx) => (
                      <input
                        key={pIdx}
                        type="text"
                        value={periodText}
                        onChange={(e) => {
                          const updated = [...lessonAnalysis.periodBreakdown];
                          updated[pIdx] = e.target.value;
                          setLessonAnalysis({ ...lessonAnalysis, periodBreakdown: updated });
                        }}
                        className="input-field text-xs"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Yêu cầu cần đạt (YCCĐ) */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="font-bold text-blue-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🎯</span> 2. Yêu cầu cần đạt (YCCĐ) cố định:
                  </span>
                  <span className="text-[11px] text-blue-700 font-normal">
                    AI sẽ tuân thủ nghiêm ngặt các mục này
                  </span>
                </div>

                {/* Kiến thức */}
                <div>
                  <span className="font-bold text-slate-700 block mb-1">a) Về Kiến thức:</span>
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-blue-100">
                    {lessonAnalysis.objectives.knowledge.map((k, kIdx) => (
                      <div key={kIdx} className="flex items-center gap-2 text-slate-800">
                        <span className="text-blue-600 font-bold">•</span>
                        <input
                          type="text"
                          value={k}
                          onChange={(e) => {
                            const updated = [...lessonAnalysis.objectives.knowledge];
                            updated[kIdx] = e.target.value;
                            setLessonAnalysis({
                              ...lessonAnalysis,
                              objectives: { ...lessonAnalysis.objectives, knowledge: updated },
                            });
                          }}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden py-0.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Năng lực */}
                <div>
                  <span className="font-bold text-slate-700 block mb-1">b) Về Năng lực toán học:</span>
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-blue-100">
                    {lessonAnalysis.objectives.competencies.map((c, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-2 text-slate-800">
                        <span className="text-emerald-600 font-bold">•</span>
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => {
                            const updated = [...lessonAnalysis.objectives.competencies];
                            updated[cIdx] = e.target.value;
                            setLessonAnalysis({
                              ...lessonAnalysis,
                              objectives: { ...lessonAnalysis.objectives, competencies: updated },
                            });
                          }}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden py-0.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Phẩm chất */}
                <div>
                  <span className="font-bold text-slate-700 block mb-1">c) Về Phẩm chất:</span>
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-blue-100">
                    {lessonAnalysis.objectives.qualities.map((q, qIdx) => (
                      <div key={qIdx} className="flex items-center gap-2 text-slate-800">
                        <span className="text-purple-600 font-bold">•</span>
                        <input
                          type="text"
                          value={q}
                          onChange={(e) => {
                            const updated = [...lessonAnalysis.objectives.qualities];
                            updated[qIdx] = e.target.value;
                            setLessonAnalysis({
                              ...lessonAnalysis,
                              objectives: { ...lessonAnalysis.objectives, qualities: updated },
                            });
                          }}
                          className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden py-0.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Khái niệm & Phương pháp */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>💡</span> 3. Khái niệm trọng tâm &amp; Phương pháp dạy học:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="font-semibold text-slate-600 block mb-1">Khái niệm cốt lõi:</span>
                    <div className="bg-white p-2 rounded-lg border text-[11px] text-slate-700 space-y-1">
                      {lessonAnalysis.keyConcepts.map((kc, kcIdx) => (
                        <div key={kcIdx} className="flex items-center gap-1.5">
                          <span className="text-amber-500 font-bold">✓</span> {kc}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block mb-1">Phương pháp sư phạm:</span>
                    <div className="bg-white p-2 rounded-lg border text-[11px] text-slate-700 space-y-1">
                      {lessonAnalysis.pedagogicalMethods.map((pm, pmIdx) => (
                        <div key={pmIdx} className="flex items-center gap-1.5">
                          <span className="text-indigo-500 font-bold">✓</span> {pm}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Ghi chú riêng */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Ghi chú hoặc yêu cầu riêng của bạn cho bài này:
                </label>
                <input
                  type="text"
                  value={lessonAnalysis.customNotes || ''}
                  onChange={(e) =>
                    setLessonAnalysis({ ...lessonAnalysis, customNotes: e.target.value })
                  }
                  placeholder="Ví dụ: Tăng cường bài toán thực tế về kinh tế, dùng phương pháp khăn trải bàn..."
                  className="input-field text-xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-4 gap-3">
              <button
                type="button"
                onClick={() => setShowAnalysisModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Đóng
              </button>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleLockConfig(false)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>🔒</span>
                  <span>Lưu &amp; Cố Định Cấu Hình</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLockConfig(true)}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Cố Định &amp; Thực Thi KHDH Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum Catalog Extraction Modal */}
      {showCatalogModal && catalogData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-5xl w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📑</span>
                  <h3 className="text-lg font-black text-slate-800">
                    DANH MỤC BÀI HỌC &amp; MA TRẬN PHÂN PHỐI CHƯƠNG TRÌNH
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                  <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
                    Môn: {catalogData.subject} {catalogData.grade}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                    {catalogData.totalLessons} bài học
                  </span>
                  <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                    {catalogData.totalPeriods} tiết
                  </span>
                  <span className="text-slate-500 italic text-[11px]">
                    (Nguồn: {catalogData.sourceSummary})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Subject & Grade Tab Switcher inside Modal */}
            <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 p-2.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                {/* Subject Tabs */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700 mr-1">Môn học:</span>
                  {[
                    { id: 'Toán học', label: '📐 Toán' },
                    { id: 'Ngữ văn', label: '📖 Văn' },
                    { id: 'Lịch sử', label: '🏛️ Sử' },
                    { id: 'Địa lí', label: '🌍 Địa' },
                    { id: 'Khoa học tự nhiên', label: '🔬 KHTN' },
                    { id: 'Tin học', label: '💻 Tin' },
                    { id: 'Tiếng Anh', label: '🇬🇧 Anh' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSwitchSubject(sub.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        selectedSubject === sub.id
                          ? 'bg-blue-700 text-white shadow-2xs ring-1 ring-blue-600'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Grade Tabs */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700 mr-1">Khối lớp:</span>
                  {(['Lớp 9', 'Lớp 8', 'Lớp 7', 'Lớp 6'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleSwitchGrade(g)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        selectedGrade === g
                          ? 'bg-indigo-700 text-white shadow-2xs ring-1 ring-indigo-600'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Toolbar inside Modal */}
              <div className="flex flex-wrap items-center justify-between pt-1.5 border-t border-slate-200/80 text-[11px] gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExtractCatalogServerSide(true)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Bắt buộc trích xuất lại từ tệp tài liệu nguồn vừa tải lên"
                  >
                    <span>🔄</span>
                    <span>Trích xuất lại từ Tệp nguồn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCatalogModal(false);
                      handleTriggerUpload('PL1');
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Bổ sung hoặc nạp tệp Phụ lục I / PPCT mới"
                  >
                    <span>📤</span>
                    <span>Nạp tệp mới (.docx/.pdf)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetAllSystemData}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  title="Xóa toàn bộ dữ liệu nguồn cũ và bộ nhớ đệm để bắt đầu lại"
                >
                  <span>🧹</span>
                  <span>Đặt lại tài liệu &amp; Xóa đệm</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  placeholder="🔍 Tìm bài học, chương, từ khóa..."
                  className="w-full bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
                {catalogSearchQuery && (
                  <button
                    onClick={() => setCatalogSearchQuery('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-slate-500 font-medium mr-1">Học kỳ:</span>
                {(['ALL', 'Học kỳ I', 'Học kỳ II'] as const).map((term) => (
                  <button
                    key={term}
                    onClick={() => setCatalogTermFilter(term)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all text-xs border ${
                      catalogTermFilter === term
                        ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {term === 'ALL' ? 'Tất cả' : term}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Table */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl max-h-[50vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-2.5 text-center w-12">STT</th>
                    <th className="p-2.5 min-w-[220px]">Mã &amp; Tên bài học</th>
                    <th className="p-2.5 min-w-[180px]">Chương / Mạch kiến thức</th>
                    <th className="p-2.5 text-center w-16">Số tiết</th>
                    <th className="p-2.5 text-center w-24">Tiết PPCT</th>
                    <th className="p-2.5 text-center w-20">Tuần</th>
                    <th className="p-2.5 text-center min-w-[200px]">Thao tác trực tiếp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {catalogData.lessons
                    .filter((l) => {
                      if (catalogTermFilter !== 'ALL' && l.term && !l.term.includes(catalogTermFilter)) {
                        return false;
                      }
                      if (!catalogSearchQuery.trim()) return true;
                      const q = catalogSearchQuery.toLowerCase();
                      return (
                        l.lessonTitle.toLowerCase().includes(q) ||
                        l.lessonCode.toLowerCase().includes(q) ||
                        (l.chapter && l.chapter.toLowerCase().includes(q)) ||
                        (l.strand && l.strand.toLowerCase().includes(q))
                      );
                    })
                    .map((lesson, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-2.5 text-center font-semibold text-slate-500">
                          {lesson.stt || idx + 1}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 leading-snug">
                            {lesson.lessonTitle}
                          </div>
                          <div className="text-[11px] font-mono text-blue-700 mt-0.5">
                            <code>{lesson.lessonCode}</code>
                          </div>
                          {lesson.keyObjectives && lesson.keyObjectives.length > 0 && (
                            <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                              🎯 YCCĐ: {lesson.keyObjectives.join('; ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {lesson.strand && (
                            <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1 mb-0.5">
                              {lesson.strand}
                            </span>
                          )}
                          <div className="text-[11px] font-medium text-slate-600">
                            {lesson.chapter || 'Theo phân phối chuẩn'}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[11px] border border-amber-300">
                            {lesson.totalPeriods}t
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-[11px] font-medium text-slate-700">
                          {lesson.ppctRange || `Tiết ${lesson.stt || idx + 1}`}
                        </td>
                        <td className="p-2.5 text-center text-[11px] font-medium text-slate-600">
                          {lesson.weekRange || `Tuần ${Math.ceil((lesson.stt || idx + 1) / 2)}`}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectCatalogLesson(lesson, 'CONTINUOUS_4SECTION')}
                              title="Soạn KHDH V11-2 4 phần không tách tiết"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1"
                            >
                              <span>⚡</span>
                              <span>V11-2</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectCatalogLesson(lesson, 'SPLIT_PERIODS')}
                              title="Soạn KHDH V10.1 tách tiết"
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1"
                            >
                              <span>✂️</span>
                              <span>Tách tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLessonCode(lesson.lessonCode || lesson.lessonTitle);
                                setShowCatalogModal(false);
                                handleAnalyzeLesson();
                              }}
                              title="Phân tích chi tiết YCCĐ &amp; Năng lực bài này"
                              className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1"
                            >
                              <span>🔍</span>
                              <span>Phân tích</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions & Exports */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCatalogMarkdown}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>Sao chép bảng Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCatalog}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <span>⬇️</span>
                  <span>Tải file (.md)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all border border-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Backup & Sync Modal */}
      {showDriveSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>☁️</span> SAO LƯU &amp; ĐỒNG BỘ GOOGLE DRIVE CÁ NHÂN
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ vĩnh viễn tài liệu nguồn và lịch sử nhiệm vụ theo tài khoản Gmail của Thầy/Cô
                </p>
              </div>
              <button
                onClick={() => setShowDriveSyncModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span>🔒</span> Không gian lưu trữ riêng biệt:
                </div>
                <div className="text-blue-900">
                  - <strong>Tài khoản Gmail:</strong> {currentUser?.email || 'Chưa đăng nhập'}
                </div>
                <div className="text-blue-900">
                  - <strong>Tài liệu nguồn đã nạp:</strong> {documents.length} tệp ({documents.filter((d) => d.isActive).length} tệp đang kích hoạt)
                </div>
                <div className="text-blue-900">
                  - <strong>Nhiệm vụ đã thực thi:</strong> {taskHistory.length} tác vụ đã lưu
                </div>
              </div>

              {driveSyncStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold text-xs flex items-center gap-2">
                  <span>✅</span>
                  <span>{driveSyncStatus}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800">💡 Các tùy chọn sao lưu &amp; kết nối:</div>
                <p className="text-slate-600 leading-relaxed">
                  Hệ thống tự động bảo vệ dữ liệu theo nguyên tắc <strong>mail nào biết mail đó</strong>, tuyệt đối không bị lẫn lộn giữa các tài khoản giáo viên khác nhau.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackupJson}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition-all flex items-center justify-center gap-1.5"
              >
                <span>📥</span> Tải Gói Dữ Liệu Offline (.json)
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowDriveSyncModal(false)}
                  className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleDriveBackup}
                  disabled={driveSyncing}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {driveSyncing ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      <span>Đang đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <span>☁️</span>
                      <span>Đồng Bộ Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
