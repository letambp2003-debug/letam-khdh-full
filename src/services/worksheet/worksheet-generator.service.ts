import { GeminiService } from '@/services/ai/gemini.service';
import { ContentNormalizer } from '@/services/export/content-normalizer';
import { WorksheetData, GenerateWorksheetRequest } from '@/types/worksheet.types';
import { getEnv } from '@/config/env';

export class WorksheetGeneratorService {
  /**
   * Tạo Phiếu học tập phân hóa từ Bản thảo KHDH
   */
  public static async generateFromKhdh(req: GenerateWorksheetRequest): Promise<{
    worksheet: WorksheetData;
    markdown: string;
    keyUsed?: string;
    tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  }> {
    const env = getEnv();
    const keyPool = GeminiService.resolveKeyPool(undefined, req.apiKeys);

    const systemPrompt = [
      'Bạn là Chuyên gia Khảo thí & Sư phạm Toán học V10.1 FINAL.',
      'Nhiệm vụ của bạn là đọc Bản thảo Kế hoạch bài dạy (KHDH) được cung cấp và tạo ra một PHIẾU HỌC TẬP PHÂN HÓA 3 MỨC ĐỘ hoàn chỉnh, chuẩn sư phạm, sẵn sàng in cho học sinh.',
      '',
      '## NGUYÊN TẮC BẮT BUỘC:',
      '1. Bám sát 100% kiến thức, thuật ngữ, công thức và dữ kiện từ KHDH.',
      '2. Mọi công thức toán học PHẢI được viết chuẩn cú pháp LaTeX trong cặp dấu $...$ (inline) hoặc $$...$$ (display).',
      '3. Cấu trúc Phiếu học tập bắt buộc gồm 3 phần:',
      '   - KHUNG THÔNG TIN: Trường, Lớp, Họ và tên học sinh, Nhóm, Thời gian làm bài.',
      '   - PHẦN I: KIẾN THỨC TRỌNG TÂM CẦN NHỚ (Tóm tắt ngắn gọn 3-5 gạch đầu dòng các công thức/định nghĩa cốt lõi nhất).',
      '   - PHẦN II: BÀI TẬP LUYỆN TẬP PHÂN HÓA 3 MỨC ĐỘ:',
      '     * ★ MỨC 1 (Nhận biết - Thông hiểu): 2-3 câu trắc nghiệm 4 lựa chọn (A, B, C, D) hoặc điền khuyết công thức.',
      '     * ★★ MỨC 2 (Vận dụng): 2 bài toán tính toán / chứng minh / rút gọn có yêu cầu trình bày lời giải chi tiết (để sẵn khoảng trống làm bài).',
      '     * ★★★ MỨC 3 (Vận dụng cao / Thực tế): 1 bài toán mở hoặc bài toán mô hình hóa thực tiễn liên hệ đời sống.',
      '   - PHẦN III: GÓC TỰ ĐÁNH GIÁ (Bảng Rubric mức độ hoàn thành bài học: Đã hiểu & Tự tin / Cần luyện tập thêm / Cần GV hướng dẫn lại).',
      '4. TUYỆT ĐỐI KHÔNG xuất JSON envelope, không chèn metadata chatbot râu ria ở đầu.',
      '5. Bắt đầu trực tiếp bằng: # PHIẾU HỌC TẬP: [TÊN BÀI HỌC]',
    ].join('\n');

    const userMessage = [
      `MÃ BÀI HỌC: ${req.lessonCode || 'TOÁN BÀI TẬP'}`,
      'DƯỚI ĐÂY LÀ BẢN THẢO KHDH ĐỂ BÓC TÁCH NỘI DUNG:',
      '----------------------------------------',
      req.khdhDraft,
      '----------------------------------------',
      'Hãy phân tích KHDH trên và tạo Phiếu học tập phân hóa 3 mức độ chất lượng cao nhất.',
    ].join('\n');

    const result = await GeminiService.generateContent({
      apiKeys: keyPool,
      systemPrompt,
      userMessage,
      model: 'flash',
    });

    const cleanMarkdown = ContentNormalizer.normalize(result.text);

    const coreKnowledge = this.extractCoreKnowledge(cleanMarkdown);
    const lessonTitle = req.lessonCode || 'BÀI HỌC';
    const imagePromptA4 = this.generateA4ImagePrompt(lessonTitle, coreKnowledge, env.SCHOOL_NAME, env.DEPARTMENT);
    const imagePromptA4Vi = this.generateA4ImagePromptVi(lessonTitle, coreKnowledge, env.SCHOOL_NAME, env.DEPARTMENT);

    // Bổ sung khối Prompt Tạo Ảnh A4 vào cuối nội dung Markdown
    const markdownWithImagePrompt = [
      cleanMarkdown,
      '',
      '---',
      '## 🎨 MÃ PROMPT TẠO ẢNH PHIẾU HỌC TẬP KHỔ A4 DỌC (8K ULTRA HD & TIẾT KIỆM IN ẤN)',
      '',
      '> **💡 Hướng dẫn:** Sao chép các đoạn mã prompt dưới đây và dán vào Midjourney, DALL-E 3, Canva AI, Bing Image Creator hoặc Imagen 3 để tạo mẫu phiếu in đồ họa tuyệt đẹp.',
      '',
      '### 1. Mã Prompt Tiếng Anh (Chuẩn Midjourney v6 / DALL-E 3 / Flux.1 / Imagen 3):',
      '```text',
      imagePromptA4,
      '```',
      '',
      '### 2. Mã Prompt Tiếng Việt (Chuẩn Canva AI / ChatGPT DALL-E / Bing Creator):',
      '```text',
      imagePromptA4Vi,
      '```',
    ].join('\n');

    // Xây dựng cấu trúc WorksheetData
    const worksheetData: WorksheetData = {
      schoolName: env.SCHOOL_NAME,
      department: env.DEPARTMENT,
      worksheetTitle: `PHIẾU HỌC TẬP: ${lessonTitle}`,
      lessonCode: req.lessonCode || 'TOAN-8',
      grade: 'Lớp 8',
      subject: 'Toán học',
      durationMinutes: 20,
      coreKnowledgeBox: coreKnowledge,
      sections: [],
      rubricEvaluation: [
        {
          criteria: 'Mức độ nắm vững kiến thức & công thức',
          levels: ['🌟 Tự tin giải đúng', '👍 Hiểu cơ bản', '⚠️ Cần thầy cô giảng lại'],
        },
        {
          criteria: 'Mức độ hoàn thành các bài tập',
          levels: ['Hoàn thành 100%', 'Hoàn thành Mức 1 & 2', 'Chỉ hoàn thành Mức 1'],
        },
      ],
      imagePromptA4,
      imagePromptA4Vi,
      markdownContent: markdownWithImagePrompt,
    };

    return {
      worksheet: worksheetData,
      markdown: markdownWithImagePrompt,
      keyUsed: result.keyUsed,
      tokenUsage: result.usage,
    };
  }

  /**
   * Tạo mã Prompt Tiếng Anh cho AI sinh ảnh Khổ A4 Dọc
   */
  public static generateA4ImagePrompt(
    lessonTitle: string,
    coreKnowledge: string[],
    schoolName = 'TRƯỜNG THCS QUANG TRUNG',
    department = 'TỔ TOÁN TIN'
  ): string {
    const knowledgeSummary = coreKnowledge.slice(0, 3).join(', ');

    return [
      `A clean, minimalist print-ready Vietnamese educational student worksheet design on a vertical A4 portrait format (aspect ratio 9:16).`,
      `Top header: Minimalist school branding header '${schoolName} | ${department}', student information box (Họ và tên: ...................., Lớp: ......, Ngày: ......, Nhóm: ......).`,
      `Main Header Title: Bold, elegant centered typography reading 'PHIẾU HỌC TẬP: ${lessonTitle.toUpperCase()}' in deep navy blue (#0F4C81).`,
      `Box 1: 'KIẾN THỨC TRỌNG TÂM CẦN NHỚ' - Neat rounded card container highlighting core mathematical rules (${knowledgeSummary}) with clean minimalist math icons.`,
      `Box 2: 'BÀI TẬP PHÂN HÓA 3 MỨC ĐỘ' - Level 1 (Nhận biết/Thông hiểu) with clean multiple choice bubbles, Level 2 (Vận dụng) with neat dotted lines for student handwriting, Level 3 (Vận dụng cao) with 2D vector geometry illustrations.`,
      `Footer: Pedagogical self-evaluation rating stars rubric ('Đã hiểu & Tự tin', 'Cần rèn luyện thêm') and teacher signature line.`,
      `Style & Visual Quality: Eco-friendly ink-saving print layout, pure white paper background (#FFFFFF), sharp black typography, navy blue accents (#0F4C81), vector-sharp mathematical geometry line art, high contrast, ultra-high resolution 8K UHD, 300 DPI print quality, zero blur, zero visual clutter, authentic Vietnamese pedagogical worksheet design --ar 9:16 --v 6.1 --style raw --c 0`,
    ].join(' ');
  }

  /**
   * Tạo mã Prompt Tiếng Việt cho AI sinh ảnh Khổ A4 Dọc
   */
  public static generateA4ImagePromptVi(
    lessonTitle: string,
    coreKnowledge: string[],
    schoolName = 'TRƯỜNG THCS QUANG TRUNG',
    department = 'TỔ TOÁN TIN'
  ): string {
    const knowledgeSummary = coreKnowledge.slice(0, 3).join('; ');

    return [
      `Thiết kế mẫu phiếu học tập học sinh khổ A4 dọc chuẩn sư phạm cho bài học '${lessonTitle}'.`,
      `Bố cục trang giấy A4 dọc gồm:`,
      `1. Tiêu đề trường: '${schoolName} - ${department}', khung điền thông tin học sinh (Họ và tên, Lớp, Nhóm, Ngày tháng).`,
      `2. Tiêu đề lớn in đậm: 'PHIẾU HỌC TẬP: ${lessonTitle.toUpperCase()}'.`,
      `3. Khung tóm tắt Kiến thức trọng tâm cần nhớ (${knowledgeSummary}).`,
      `4. Hệ thống bài tập phân hóa 3 mức độ (Mức 1 Nhận biết - Trắc nghiệm; Mức 2 Vận dụng - Có các dòng kẻ chấm chấm để học sinh trình bày bài làm; Mức 3 Vận dụng thực tế kèm hình vẽ hình học vector sắc nét).`,
      `5. Góc tự đánh giá Rubric mức độ hiểu bài và chữ ký nhận xét của giáo viên.`,
      `Yêu cầu thiết kế: Phong cách đồ họa giáo dục tối giản, nền trắng tinh khôi tiết kiệm mực in ấn, chữ tiếng Việt chuẩn đẹp, hình vẽ sắc nét 8K, bố cục sư phạm thông thoáng và trang nhã.`,
    ].join(' ');
  }

  private static extractCoreKnowledge(markdown: string): string[] {
    const lines = markdown.split('\n');
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.includes('KIẾN THỨC TRỌNG TÂM') || line.includes('KIẾN THỨC CẦN NHỚ')) {
        inSection = true;
        continue;
      }
      if (inSection && line.startsWith('## ')) {
        break;
      }
      if (inSection && (line.trim().startsWith('-') || line.trim().startsWith('*'))) {
        items.push(line.trim().replace(/^[-*]\s*/, ''));
      }
    }

    if (items.length === 0) {
      items.push('Nắm vững các khái niệm, định nghĩa và tính chất cơ bản trong bài học.');
      items.push('Vận dụng đúng quy tắc và công thức toán học vào bài tập tính toán.');
      items.push('Rèn luyện kỹ năng trình bày logic và giải quyết bài toán thực tiễn.');
    }

    return items;
  }
}
