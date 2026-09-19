/**
 * Video Storyboard & AI Video Prompt Types (Google Flow & Video AI Ready)
 * KHDH AUTO V10.1
 */

export type VideoStyleId =
  | 'PIXAR_3D'
  | 'REALISTIC_CINEMATIC'
  | 'CYBERPUNK_NEON'
  | 'STUDIO_GHIBLI'
  | 'MINIMALIST_ISOMETRIC'
  | 'CLAYMATION'
  | 'ORIGAMI_3D';

export type VideoGenreId =
  | 'CONCEPT_EXPLORATION'
  | 'REAL_LIFE_STORY'
  | 'STEP_BY_STEP_TUTORIAL'
  | 'GAMIFIED_CHALLENGE'
  | 'MINDMAP_SUMMARY';

export interface StoryboardScene {
  sceneNumber: number;
  title: string;
  duration: string;       // Cố định "8s" cho chuẩn Google Flow / Veo / AI Video
  visualDescription: string;
  onScreenText: string;   // Chữ/Công thức hiển thị hậu kỳ (Overlay)
  imagePrompt: string;    // Prompt tạo ảnh Keyframe (Midjourney v6 / Flux / DALL-E 3) - KHÔNG TEXT/UI
  videoPrompt: string;    // Prompt chuyển động Video 8s (Google Flow / Veo / Runway / Sora) - KHÔNG TEXT/UI
  aiVideoPrompt?: string; // Legacy alias for videoPrompt
  voiceoverScript: string;// Lời thoại / Thuyết minh tiếng Việt chuẩn sư phạm (đọc trong 8s)
  audioPrompt: string;    // Nhạc nền BGM & Hiệu ứng âm thanh SFX
  negativePrompt?: string;// Bộ lọc loại bỏ text, UI, icon, watermark
}

export interface VideoStoryboardData {
  lessonTitle: string;
  lessonCode: string;
  totalDuration: string;
  videoStyle: string;
  videoGenre: string;
  numScenes: number;
  targetAudience: string;
  scenes: StoryboardScene[];
  masterPromptSummary: string;
  googleFlowGuide?: {
    clipDuration: string;
    noTextPolicy: string;
    recommendedModel: string;
  };
}

export interface GenerateStoryboardRequest {
  khdhDraft: string;
  lessonCode?: string;
  apiKeys?: string[];
  videoStyle?: string;
  videoGenre?: string;
  numScenes8s?: number;
  targetDuration?: string;
}

export interface GenerateStoryboardResponse {
  success: boolean;
  storyboard?: VideoStoryboardData;
  message?: string;
  keyUsed?: string;
}

export const VIDEO_STYLES: { id: VideoStyleId; label: string; icon: string; desc: string }[] = [
  { id: 'PIXAR_3D', label: '3D Pixar / Disney', icon: '🎨', desc: 'Màu sắc sống động, nhân vật 3D thân thiện' },
  { id: 'REALISTIC_CINEMATIC', label: 'Điện ảnh Siêu thực', icon: '🎬', desc: 'Góc máy điện ảnh 4K/8K, chân thực' },
  { id: 'STUDIO_GHIBLI', label: 'Anime Studio Ghibli', icon: '🍃', desc: 'Màu nước thơ mộng, vẽ tay nghệ thuật' },
  { id: 'CYBERPUNK_NEON', label: 'Khoa học Công nghệ Neon', icon: '⚡', desc: 'Phòng Lab viễn tưởng, Hologram phát sáng' },
  { id: 'MINIMALIST_ISOMETRIC', label: 'Isometric 3D Tối giản', icon: '📐', desc: 'Hình khối pastel trực quan, mô hình khoa học' },
  { id: 'CLAYMATION', label: 'Đất nặn Stop-Motion', icon: '🧸', desc: 'Mộc mạc vui nhộn, kích thích tò mò' },
  { id: 'ORIGAMI_3D', label: 'Origami Gấp giấy 3D', icon: '📄', desc: 'Không gian hình học nghệ thuật sáng tạo' },
];

export const VIDEO_GENRES: { id: VideoGenreId; label: string; icon: string; desc: string }[] = [
  { id: 'CONCEPT_EXPLORATION', label: 'Khám phá Khái niệm & Trực quan hóa', icon: '💡', desc: 'Trực quan hóa bản chất và quy luật kiến thức' },
  { id: 'REAL_LIFE_STORY', label: 'Tình huống Đời sống & Kể chuyện', icon: '🌍', desc: 'Gắn kiến thức với câu chuyện thực tế gần gũi' },
  { id: 'STEP_BY_STEP_TUTORIAL', label: 'Hướng dẫn Từng bước & Phương pháp giải', icon: '🪜', desc: 'Quy trình giải quyết vấn đề logic, rõ ràng' },
  { id: 'GAMIFIED_CHALLENGE', label: 'Thử thách Tư duy & Game-show', icon: '🏆', desc: 'Kịch tính, kích thích tinh thần phản xạ' },
  { id: 'MINDMAP_SUMMARY', label: 'Tổng kết Sơ đồ tư duy & Bản đồ tri thức', icon: '🧠', desc: 'Hệ thống hóa toàn bộ bài học tinh gọn' },
];

export const SCENE_COUNT_OPTIONS = [3, 4, 5, 6, 8, 10];


