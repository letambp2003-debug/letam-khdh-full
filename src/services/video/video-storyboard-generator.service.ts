import { GeminiService } from '@/services/ai/gemini.service';
import {
  GenerateStoryboardRequest,
  StoryboardScene,
  VideoStoryboardData,
  VideoStyleId,
  VideoGenreId,
} from '@/types/video-storyboard.types';

export const VIDEO_STYLE_CONFIGS: Record<VideoStyleId, { label: string; promptDesc: string; negative: string }> = {
  PIXAR_3D: {
    label: '3D Pixar / Disney Animation',
    promptDesc: 'Hyper-detailed 3D Pixar-style character and environment animation, soft studio volumetric lighting, bright vibrant colors, smooth octane render 8k, cinematic depth of field',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, distorted graphics',
  },
  REALISTIC_CINEMATIC: {
    label: 'Điện ảnh Thực tế (Cinematic 4K)',
    promptDesc: 'Hyper-realistic cinematic 4k footage, National Geographic scientific documentary quality, 35mm lens, natural daylight, photorealistic textures, shallow depth of field, steady camera motion',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, CGI artifacts, blurry',
  },
  CYBERPUNK_NEON: {
    label: 'Phòng Lab Tương lai (Cyberpunk Neon)',
    promptDesc: 'Futuristic high-tech laboratory environment, glowing neon cyan and purple holographic elements, dark sleek reflective surfaces, cinematic anamorphic lens flare, 8k render',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, low resolution',
  },
  STUDIO_GHIBLI: {
    label: 'Anime Nghệ thuật (Studio Ghibli Style)',
    promptDesc: 'Beautiful hand-drawn anime aesthetic, Studio Ghibli inspired, lush painted watercolor backgrounds, warm nostalgic golden hour sunlight, poetic and expressive motion',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, 3d render artifacts',
  },
  MINIMALIST_ISOMETRIC: {
    label: 'Isometric 3D Tối giản (Pastel Clean)',
    promptDesc: 'Clean isometric 3D motion graphics, minimalist pastel color palette, soft ambient occlusion, elegant smooth geometric shapes floating, clean studio lighting',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, clutter',
  },
  CLAYMATION: {
    label: 'Đất nặn Stop-Motion (Thủ công vui nhộn)',
    promptDesc: 'Charming stop-motion claymation style, handcrafted plasticine clay textures, tactile miniature studio lighting, playful quirky character movement, depth of field',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, flat vector',
  },
  ORIGAMI_3D: {
    label: 'Origami 3D Papercraft (Gấp giấy nghệ thuật)',
    promptDesc: 'Intricate 3D origami papercraft animation, delicate folded textured paper layers, soft warm shadow casting, elegant paper engineering folding dynamically in mid-air',
    negative: '--no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, photoreal plastic',
  },
};

export const VIDEO_GENRE_CONFIGS: Record<VideoGenreId, { label: string; desc: string; focus: string }> = {
  CONCEPT_EXPLORATION: {
    label: 'Khám phá Khái niệm & Trực quan hóa',
    desc: 'Trực quan hóa bản chất toán học từ mô hình không gian, hình ảnh động chuyển hóa trực quan.',
    focus: 'Visual concept transformation, 3D math geometry morphing, intuitive discovery.',
  },
  REAL_LIFE_STORY: {
    label: 'Tình huống Đời sống & Kể chuyện (Storytelling)',
    desc: 'Đưa bài học vào câu chuyện thực tế gần gũi (kiến trúc, công viên, mua sắm, công nghệ).',
    focus: 'Real-world storytelling, relatable teenager daily scenario, applied math in life.',
  },
  STEP_BY_STEP_TUTORIAL: {
    label: 'Hướng dẫn Từng bước & Phương pháp giải',
    desc: 'Phân tích trình tự thao tác, giải quyết vấn đề theo từng bước rõ ràng, dễ hiểu.',
    focus: 'Step-by-step procedural animation, systematic problem solving, smooth progression.',
  },
  GAMIFIED_CHALLENGE: {
    label: 'Thử thách Tư duy & Game-Show',
    desc: 'Không khí sôi nổi, đồng hồ đếm ngược, tình huống thử thách tư duy nhanh cho học sinh.',
    focus: 'Game-show suspense, countdown timer atmosphere, interactive student engagement.',
  },
  MINDMAP_SUMMARY: {
    label: 'Tổng kết Sơ đồ tư duy & Bản đồ kiến thức',
    desc: 'Hệ thống hóa toàn bộ kiến thức thành mạng lưới sơ đồ tư duy phát sáng kết nối logic.',
    focus: 'Holographic mindmap branching, visual synthesis, key takeaway retention.',
  },
};

export class VideoStoryboardGeneratorService {
  /**
   * Phân tích KHDH và tạo Bảng Storyboard Phân cảnh 8 giây & Bộ Prompt AI Video chuyên nghiệp
   * Chuẩn Google Flow / Veo / Runway / Sora / Midjourney
   * Đảm bảo MỖI CẢNH 8S TUYỆT ĐỐI KHÔNG HIỆN TEXT, UI, UL, WATERMARK
   */
  public static async generateFromKhdh(req: GenerateStoryboardRequest): Promise<{
    storyboard: VideoStoryboardData;
    keyUsed?: string;
  }> {
    const keyPool = GeminiService.resolveKeyPool(undefined, req.apiKeys);
    
    // Xử lý Style & Genre
    const styleKey = (req.videoStyle as VideoStyleId) in VIDEO_STYLE_CONFIGS
      ? (req.videoStyle as VideoStyleId)
      : 'PIXAR_3D';
    const styleConfig = VIDEO_STYLE_CONFIGS[styleKey] || VIDEO_STYLE_CONFIGS.PIXAR_3D;

    const genreKey = (req.videoGenre as VideoGenreId) in VIDEO_GENRE_CONFIGS
      ? (req.videoGenre as VideoGenreId)
      : 'CONCEPT_EXPLORATION';
    const genreConfig = VIDEO_GENRE_CONFIGS[genreKey] || VIDEO_GENRE_CONFIGS.CONCEPT_EXPLORATION;

    // Số cảnh 8 giây (mặc định 5 cảnh = 40s)
    const numScenes = Math.min(Math.max(req.numScenes8s || 5, 3), 10);
    const totalDurationStr = `${numScenes * 8} giây (${numScenes} cảnh x 8s Google Flow)`;

    const systemPrompt = [
      'Bạn là Đạo diễn Video Giáo dục kiêm Chuyên gia Prompt AI Video & Google Flow hàng đầu thế giới (Google Flow, Veo, Runway Gen-3 Alpha, Kling 1.5, Sora, Midjourney v6).',
      'Nhiệm vụ: Phân tích Kế hoạch bài dạy (KHDH) và tạo kịch bản Video Micro-learning gồm đúng ' + numScenes + ' phân cảnh, mỗi phân cảnh cố định đúng 8 GIÂY.',
      '',
      '## THÔNG TIN CẤU HÌNH BẮT BUỘC:',
      `- Thể loại video: ${genreConfig.label} (${genreConfig.focus})`,
      `- Phong cách thị giác: ${styleConfig.label} (${styleConfig.promptDesc})`,
      `- Số phân cảnh: ${numScenes} phân cảnh (mỗi cảnh đúng 8 giây, tổng ${numScenes * 8}s)`,
      '',
      '## ⚠️ QUY TẮC SỐNG CÒN VỀ PROMPT (BẮT BUỘC TUÂN THỦ 100%):',
      '1. MỖI CẢNH 8S TUYỆT ĐỐI KHÔNG HIỆN TEXT, CHỮ VIẾT, SỐ, GIAO DIỆN UI, ICON, BUTTON, WATERMARK TRONG VIDEO/ẢNH BẰNG MỌI GIÁ.',
      '2. Prompt Video (videoPrompt) và Prompt Ảnh (imagePrompt) CHỈ mô tả hình ảnh điện ảnh thuần túy (pure cinematic footage, characters, camera movement, lighting, physical actions, 3D graphics).',
      '3. Cuối mỗi prompt video và prompt ảnh PHẢI luôn đính kèm:',
      '   "--no text, typography, words, letters, numbers, font, labels, captions, subtitles, watermark, ui, interface, hud, menu, icons, buttons, logos, frames, low quality"',
      '4. Chữ hiển thị và công thức toán sẽ được giáo viên chèn ở khâu hậu kỳ, được ghi riêng ở trường "onScreenText".',
      '5. Lời thoại tiếng Việt (voiceoverScript) phải cô đọng, truyền cảm, có thể đọc vừa vặn trong đúng 8 giây (khoảng 20-30 từ).',
      '',
      '## YÊU CẦU ĐẦU RA JSON BẮT BUỘC:',
      'Bạn PHẢI trả về ĐÚNG MỘT JSON OBJECT theo cấu trúc dưới đây (KHÔNG có markdown bao ngoài, KHÔNG có text chào hỏi):',
      '{',
      '  "lessonTitle": "Tên bài học",',
      '  "lessonCode": "' + (req.lessonCode || 'TOAN-8') + '",',
      '  "totalDuration": "' + totalDurationStr + '",',
      '  "videoStyle": "' + styleConfig.label + '",',
      '  "videoGenre": "' + genreConfig.label + '",',
      '  "numScenes": ' + numScenes + ',',
      '  "targetAudience": "Học sinh THCS",',
      '  "masterPromptSummary": "Prompt tóm tắt toàn bộ video thuần hình ảnh không chữ",',
      '  "scenes": [',
      '    {',
      '      "sceneNumber": 1,',
      '      "title": "Phân cảnh 1: Tiêu đề cảnh",',
      '      "duration": "8s",',
      '      "visualDescription": "Mô tả hình ảnh trực quan chi tiết bằng tiếng Việt (không có chữ trên màn hình)",',
      '      "onScreenText": "Chữ hoặc công thức Toán chèn hậu kỳ",',
      '      "imagePrompt": "English keyframe image prompt without text (--ar 16:9) --no text, words, ui, watermark",',
      '      "videoPrompt": "English 8s video camera motion prompt without text --no text, words, ui, watermark",',
      '      "voiceoverScript": "Lời thoại tiếng Việt đọc trong 8 giây (20-30 từ)",',
      '      "audioPrompt": "Nhạc nền BGM & hiệu ứng âm thanh SFX"',
      '    }',
      '  ]',
      '}',
    ].join('\n');

    const userMessage = [
      'MÃ BÀI HỌC: ' + (req.lessonCode || 'TOÁN THCS'),
      'PHONG CÁCH: ' + styleConfig.label,
      'THỂ LOẠI: ' + genreConfig.label,
      'SỐ CẢNH 8S: ' + numScenes + ' cảnh (mỗi cảnh đúng 8s, tổng thời lượng ' + numScenes * 8 + 's)',
      'DƯỚI ĐÂY LÀ BẢN THẢO KHDH ĐỂ TẠO KỊCH BẢN VIDEO:',
      '----------------------------------------',
      req.khdhDraft,
      '----------------------------------------',
      'Hãy tạo JSON Storyboard gồm đúng ' + numScenes + ' cảnh 8s, đảm bảo mọi prompt ảnh và video KHÔNG CHỨA TEXT, UI, WATERMARK.',
    ].join('\n');

    let storyboard: VideoStoryboardData;
    let keyUsed: string | undefined;

    try {
      const result = await GeminiService.generateContent({
        apiKeys: keyPool,
        systemPrompt,
        userMessage,
        model: 'flash',
      });
      keyUsed = result.keyUsed;

      let cleanText = result.text.trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }
      storyboard = JSON.parse(cleanText);

      // Đảm bảo tương thích các trường prompt và bộ lọc no-text
      if (storyboard?.scenes && Array.isArray(storyboard.scenes)) {
        storyboard.scenes = storyboard.scenes.map((s, idx) => {
          let vid = s.videoPrompt || s.aiVideoPrompt || '';
          let img = s.imagePrompt || (vid ? `${vid} --ar 16:9` : '');

          const noTextSuffix = ' --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos, distorted graphics';
          if (!vid.includes('--no text')) vid = `${vid}${noTextSuffix}`;
          if (!img.includes('--no text')) img = `${img}${noTextSuffix}`;

          return {
            ...s,
            sceneNumber: s.sceneNumber || idx + 1,
            duration: '8s',
            videoPrompt: vid,
            aiVideoPrompt: vid,
            imagePrompt: img,
            negativePrompt: 'text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
          };
        });

        storyboard.numScenes = storyboard.scenes.length;
        storyboard.totalDuration = `${storyboard.scenes.length * 8} giây (${storyboard.scenes.length} cảnh x 8s Google Flow)`;
        storyboard.videoStyle = styleConfig.label;
        storyboard.videoGenre = genreConfig.label;
        storyboard.googleFlowGuide = {
          clipDuration: '8 seconds per scene (Google Flow / Veo Standard)',
          noTextPolicy: '100% Clean Visuals (Text overlay added in Post-editing)',
          recommendedModel: 'Google Flow / Veo 2 / Runway Gen-3 Alpha',
        };
      }
    } catch {
      storyboard = VideoStoryboardGeneratorService.buildFallbackStoryboard(
        req.lessonCode || 'TOÁN HỌC',
        styleConfig.label,
        genreConfig.label,
        numScenes
      );
    }

    return {
      storyboard,
      keyUsed,
    };
  }

  /**
   * Tạo Storyboard dự phòng chuẩn mực cho Google Flow với số cảnh 8s tùy biến
   */
  public static buildFallbackStoryboard(
    lessonCode: string,
    videoStyle: string = '3D Pixar / Disney Animation',
    videoGenre: string = 'Khám phá Khái niệm & Trực quan hóa',
    numScenes: number = 5
  ): VideoStoryboardData {
    const defaultScenesPool: StoryboardScene[] = [
      {
        sceneNumber: 1,
        title: 'Phân cảnh 1: Hook thực tế - Khám phá không gian',
        duration: '8s',
        visualDescription:
          'Góc máy flycam từ trên cao lướt qua một khu vườn thông minh hình học rực rỡ ánh nắng ban mai. Một robot giáo viên vui vẻ chỉ tay vào các luống hoa hình vuông và hình chữ nhật đang tỏa sáng.',
        onScreenText: 'Khám phá: Biểu thức tính diện tích thực tế',
        imagePrompt:
          'A high-end 3D Pixar-style digital illustration of a futuristic modular garden with a cute friendly robot teacher looking at geometric glowing flower plots. Cinematic warm morning sunlight, vibrant green and amber colors, shallow depth of field, octane render 8k --ar 16:9 --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        videoPrompt:
          'Smooth cinematic drone camera flying over a futuristic modular garden. A cute 3D robot teacher gestures cheerfully towards glowing geometric garden plots. Volumetric sunlight rays, gentle camera push-in, pristine 4k 60fps --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        aiVideoPrompt:
          'Smooth cinematic drone camera flying over a futuristic modular garden. A cute 3D robot teacher gestures cheerfully towards glowing geometric garden plots. Volumetric sunlight rays, gentle camera push-in, pristine 4k 60fps --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        voiceoverScript:
          'Chào các em! Hãy cùng quan sát khu vườn thông minh này để khám phá bí quyết tính diện tích cực nhanh nhé!',
        audioPrompt: 'Upbeat electronic synthesizer intro, ambient nature morning birds.',
        negativePrompt: 'text, words, UI, interface, watermark, logos',
      },
      {
        sceneNumber: 2,
        title: 'Phân cảnh 2: Trực quan hóa Khối đơn thức',
        duration: '8s',
        visualDescription:
          'Cận cảnh tinh thể pha lê toán học phát sáng lơ lửng trong phòng thí nghiệm tương lai. Khối tinh thể tách đôi thành hai nửa màu vàng hổ phách và xanh ngọc bích.',
        onScreenText: 'Đơn thức: Hệ số & Phần biến',
        imagePrompt:
          'Macro 3D render of a luminous glowing geometric crystal floating inside a modern minimalist science room. One half glows warm golden amber, the other half glows neon cyan. Soft studio backlight, pristine glass reflections, 8k resolution --ar 16:9 --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        videoPrompt:
          'Slow 360-degree orbital camera rotation around a floating glowing geometric crystal. The crystal smoothly splits into two floating colored gem fragments with glittering particle trails. Studio lighting, shallow depth of field f/1.8, 4k --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        aiVideoPrompt:
          'Slow 360-degree orbital camera rotation around a floating glowing geometric crystal. The crystal smoothly splits into two floating colored gem fragments with glittering particle trails. Studio lighting, shallow depth of field f/1.8, 4k --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        voiceoverScript:
          'Mỗi đơn thức giống như một viên pha lê: gồm phần hệ số đứng trước và phần biến số đi liền phía sau!',
        audioPrompt: 'Crystal chime sound effect, soft inspiring ambient pad.',
        negativePrompt: 'text, words, UI, interface, watermark, logos',
      },
      {
        sceneNumber: 3,
        title: 'Phân cảnh 3: Sáp nhập Đơn thức Đồng dạng',
        duration: '8s',
        visualDescription:
          'Hai khối lập phương từ tính cùng màu cam tự động hút lại gần nhau với các tia sáng vàng và sáp nhập thành một khối lập phương lớn vững chắc.',
        onScreenText: 'Quy tắc: Gom nhóm đơn thức đồng dạng',
        imagePrompt:
          'Stylized 3D educational scene of two glowing orange magnetic cubes snapping together on a clean wooden surface with golden particle bursts. Clean minimalist design, soft pastel aesthetic, Pixar 3D quality --ar 16:9 --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        videoPrompt:
          'Dynamic push-in slow motion shot. Two orange glowing magnetic cubes smoothly attract each other and fuse into a larger radiant block with a gentle golden ripple wave. Crisp physics simulation, educational motion design, 4k --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        aiVideoPrompt:
          'Dynamic push-in slow motion shot. Two orange glowing magnetic cubes smoothly attract each other and fuse into a larger radiant block with a gentle golden ripple wave. Crisp physics simulation, educational motion design, 4k --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        voiceoverScript:
          'Những đơn thức đồng dạng sẽ tự động hút và cộng lại với nhau như hai khối nam châm kỳ diệu!',
        audioPrompt: 'Magnetic snap sound, energetic chime burst upon merge.',
        negativePrompt: 'text, words, UI, interface, watermark, logos',
      },
      {
        sceneNumber: 4,
        title: 'Phân cảnh 4: Thử thách Tư duy Nhanh',
        duration: '8s',
        visualDescription:
          'Không gian trường quay trò chơi 3D sôi động với vòng tròn ánh sáng neon đếm ngược. Một hộp quà bí ẩn bung tỏa các chùm pháo hoa xanh lá cây chúc mừng.',
        onScreenText: 'Thử thách 8 giây: Phân loại nhanh!',
        imagePrompt:
          'Exciting 3D game-show stage with glowing circular neon stage floor and celebratory emerald green fireworks bursting. Dramatic purple and gold rim lighting, volumetric stadium lights, 8k render --ar 16:9 --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        videoPrompt:
          'Fast dynamic dolly-zoom camera into a glowing 3D game-show arena. A golden interactive sphere pulses with light before bursting into celebratory green sparkles and confetti. High-energy lighting, smooth 60fps motion --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        aiVideoPrompt:
          'Fast dynamic dolly-zoom camera into a glowing 3D game-show arena. A golden interactive sphere pulses with light before bursting into celebratory green sparkles and confetti. High-energy lighting, smooth 60fps motion --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        voiceoverScript:
          'Hãy thử tài thám tử trong 8 giây: tìm ngay các đơn thức đồng dạng để ghi điểm số tuyệt đối nhé!',
        audioPrompt: 'Fast ticking heartbeat tempo, triumphant victory fanfare.',
        negativePrompt: 'text, words, UI, interface, watermark, logos',
      },
      {
        sceneNumber: 5,
        title: 'Phân cảnh 5: Tổng kết & Truyền cảm hứng',
        duration: '8s',
        visualDescription:
          'Robot giáo viên mỉm cười giơ ngón tay cái tự tin, đằng sau là sơ đồ mạng lưới ánh sáng 3D ấm áp bao quanh phòng học hiện đại.',
        onScreenText: 'Bí quyết vàng: Nhận diện phần biến -> Thu gọn!',
        imagePrompt:
          'Warm 3D Pixar-style scene of a friendly cute robot teacher giving a confident thumbs up. In the background, an intricate glowing golden network of interconnected nodes gently illuminates a modern classroom. Soft warm studio lighting, 8k render --ar 16:9 --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        videoPrompt:
          'Slow cinematic pull-back camera shot. The friendly 3D robot teacher smiles warmly, waves and gives a thumbs up as golden constellations of light gently glow in the background. Inspiring cinematic lighting, depth of field, 4k render --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        aiVideoPrompt:
          'Slow cinematic pull-back camera shot. The friendly 3D robot teacher smiles warmly, waves and gives a thumbs up as golden constellations of light gently glow in the background. Inspiring cinematic lighting, depth of field, 4k render --no text, typography, words, letters, numbers, font, labels, subtitles, watermark, ui, interface, hud, buttons, icons, logos',
        voiceoverScript:
          'Nắm chắc phần biến, thu gọn đồng dạng - mọi bài toán đại số đều trở nên thật dễ dàng. Chúc các em học tốt!',
        audioPrompt: 'Uplifting orchestral outro music fading out gently.',
        negativePrompt: 'text, words, UI, interface, watermark, logos',
      },
    ];

    const selectedScenes = defaultScenesPool.slice(0, numScenes).map((s, idx) => ({
      ...s,
      sceneNumber: idx + 1,
      duration: '8s',
    }));

    return {
      lessonTitle: 'Đơn thức và Đa thức nhiều biến',
      lessonCode,
      totalDuration: `${selectedScenes.length * 8} giây (${selectedScenes.length} cảnh x 8s Google Flow)`,
      videoStyle,
      videoGenre,
      numScenes: selectedScenes.length,
      targetAudience: 'Học sinh THCS Lớp 8',
      masterPromptSummary:
        'A sequence of clean 8-second 3D educational video clips without any text or UI overlays, ideal for Google Flow and post-editing text insertion.',
      scenes: selectedScenes,
      googleFlowGuide: {
        clipDuration: '8 seconds per scene (Google Flow / Veo Standard)',
        noTextPolicy: '100% Clean Visuals (Text overlay added in Post-editing)',
        recommendedModel: 'Google Flow / Veo 2 / Runway Gen-3 Alpha',
      },
    };
  }
}


