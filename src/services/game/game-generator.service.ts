import { GeminiService } from '@/services/ai/gemini.service';
import { GameData, GameQuestion, GenerateGameRequest } from '@/types/game.types';
import { HtmlGameTemplateBuilder } from './html-game-template';

export class GameGeneratorService {
  /**
   * Phân tích KHDH và tạo gói Trò chơi tương tác HTML
   */
  public static async generateFromKhdh(req: GenerateGameRequest): Promise<{
    gameData: GameData;
    html: string;
    keyUsed?: string;
  }> {
    const keyPool = GeminiService.resolveKeyPool(undefined, req.apiKeys);
    const templateId = req.templateId || 'SPACE_QUIZ';
    const numQuestions = req.numQuestions || 5;

    const systemPrompt = [
      'Bạn là Chuyên gia Thiết kế Trò chơi Giáo dục & EdTech Game V10.1 FINAL.',
      'Nhiệm vụ: Phân tích Bản thảo Kế hoạch bài dạy (KHDH) và tạo ngân hàng 5-6 câu hỏi trắc nghiệm Toán học tương tác nhanh cho học sinh.',
      '',
      '## YÊU CẦU ĐẦU RA JSON BẮT BUỘC:',
      'Bạn PHẢI trả về ĐÚNG MỘT JSON ARRAY chứa danh sách các câu hỏi, KHÔNG bao bọc bằng markdown, KHÔNG có text hội thoại ngoài JSON.',
      'Cấu trúc từng câu hỏi:',
      '[',
      '  {',
      '    "id": "q1",',
      '    "question": "Nội dung câu hỏi (chứa công thức $...$)",',
      '    "options": [',
      '      "Đáp án A (chứa $...$)",',
      '      "Đáp án B",',
      '      "Đáp án C",',
      '      "Đáp án D"',
      '    ],',
      '    "correctIndex": 0,',
      '    "explanation": "Giải thích ngắn gọn 1 câu vì sao đúng (chứa $...$)",',
      '    "timeLimitSeconds": 20',
      '  }',
      ']',
      'Đảm bảo các công thức toán dùng chuẩn LaTeX $...$ sắc nét.',
    ].join('\n');

    const userMessage = [
      `MÃ BÀI HỌC: ${req.lessonCode || 'TOÁN BÀI TẬP'}`,
      `SỐ LƯỢNG CÂU HỎI: ${numQuestions}`,
      'DƯỚI ĐÂY LÀ BẢN THẢO KHDH ĐỂ BÓC TÁCH CÂU HỎI:',
      '----------------------------------------',
      req.khdhDraft,
      '----------------------------------------',
      'Hãy tạo mảng JSON các câu hỏi trắc nghiệm hay nhất bám sát bài học trên.',
    ].join('\n');

    const result = await GeminiService.generateContent({
      apiKeys: keyPool,
      systemPrompt,
      userMessage,
      model: 'flash',
    });

    // Parse JSON
    let questions: GameQuestion[] = [];
    try {
      const cleanJson = result.text
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/\s*```$/im, '')
        .trim();
      questions = JSON.parse(cleanJson);
    } catch {
      // Fallback câu hỏi mặc định nếu AI parse lỗi
      questions = [
        {
          id: 'q1',
          question: 'Biểu thức nào sau đây là một đơn thức thu gọn?',
          options: ['$2x^2y$', '$3x + 2y$', '$\\frac{x+1}{y}$', '$x^2 - 4$'],
          correctIndex: 0,
          explanation: 'Đơn thức là tích của số và các biến với số mũ nguyên dương.',
          timeLimitSeconds: 20,
        },
        {
          id: 'q2',
          question: 'Bậc của đơn thức $M = -5x^3y^2z$ là bao nhiêu?',
          options: ['3', '5', '6', '7'],
          correctIndex: 2,
          explanation: 'Tổng số mũ của các biến là $3 + 2 + 1 = 6$.',
          timeLimitSeconds: 20,
        },
        {
          id: 'q3',
          question: 'Thu gọn đa thức $P = 3x^2y - 5xy + 2x^2y$ ta được kết quả là:',
          options: ['$5x^2y - 5xy$', '$x^2y - 5xy$', '$6x^4y^2 - 5xy$', '$5xy$'],
          correctIndex: 0,
          explanation: 'Cộng các đơn thức đồng dạng: $(3 + 2)x^2y - 5xy = 5x^2y - 5xy$.',
          timeLimitSeconds: 20,
        },
      ];
    }

    const title = `TRÒ CHƠI TOÁN HỌC: ${req.lessonCode || 'KHÁM PHÁ KIẾN THỨC'}`;
    const standaloneHtml = HtmlGameTemplateBuilder.buildStandaloneHtml({
      title,
      lessonCode: req.lessonCode || 'TOAN-8',
      templateId,
      questions,
    });

    const gameData: GameData = {
      title,
      lessonCode: req.lessonCode || 'TOAN-8',
      templateId,
      templateName: 'Thám Hiểm Vũ Trụ (Space Math Quiz)',
      themeColor: '#4f46e5',
      questions,
      totalQuestions: questions.length,
      standaloneHtml,
    };

    return {
      gameData,
      html: standaloneHtml,
      keyUsed: result.keyUsed,
    };
  }
}
