import { GeminiService } from '@/services/ai/gemini.service';
import { SourceDocumentService } from '@/services/documents/source-document.service';
import { SourceContextBuilder } from '@/services/documents/source-context-builder';
import {
  AnalyzeLessonRequest,
  LessonRequirementAnalysis,
} from '@/types/lesson-analysis.types';

export class LessonAnalyzerService {
  /**
   * Phân tích mã bài học / tham số kết hợp với tài liệu nguồn (PL1, PPCT, SGK)
   * Trích xuất các YCCĐ, số tiết, tiến trình để giáo viên cố định cấu hình trước khi soạn.
   */
  public static async analyzeLesson(req: AnalyzeLessonRequest): Promise<{
    analysis: LessonRequirementAnalysis;
    keyUsed?: string;
  }> {
    const keyPool = GeminiService.resolveKeyPool(undefined, req.apiKeys);
    const targetProject = req.projectId || 'default';

    // Lấy tài liệu nguồn sẵn sàng
    let activeDocs = await SourceDocumentService.getActiveReady(targetProject);
    if (req.documentIds && Array.isArray(req.documentIds) && req.documentIds.length > 0) {
      activeDocs = activeDocs.filter((d) => req.documentIds?.includes(d.id));
    }

    const { systemContext: sourceContextText } = SourceContextBuilder.buildPromptContext(activeDocs);

    // Tự động nhận diện khối lớp từ input hoặc tài liệu
    const lessonInput = (req.lessonCode || '').toLowerCase();
    let detectedGrade = 'Lớp 9';
    if (lessonInput.includes('9') || lessonInput.includes('toan-9') || lessonInput.includes('toán 9')) {
      detectedGrade = 'Lớp 9';
    } else if (lessonInput.includes('8') || lessonInput.includes('toan-8') || lessonInput.includes('toán 8')) {
      detectedGrade = 'Lớp 8';
    } else if (lessonInput.includes('7') || lessonInput.includes('toan-7') || lessonInput.includes('toán 7')) {
      detectedGrade = 'Lớp 7';
    } else if (lessonInput.includes('6') || lessonInput.includes('toan-6') || lessonInput.includes('toán 6')) {
      detectedGrade = 'Lớp 6';
    } else {
      const docText = activeDocs.map((d) => `${d.displayName} ${d.originalFileName}`).join(' ').toLowerCase();
      if (docText.includes('9') || docText.includes('toán 9')) detectedGrade = 'Lớp 9';
      else if (docText.includes('8') || docText.includes('toán 8')) detectedGrade = 'Lớp 8';
      else if (docText.includes('7') || docText.includes('toán 7')) detectedGrade = 'Lớp 7';
      else if (docText.includes('6') || docText.includes('toán 6')) detectedGrade = 'Lớp 6';
    }

    const systemPrompt = [
      'Bạn là Chuyên viên Phân tích Sư phạm & Thẩm định Chương trình GDPT 2018 (Toán học THCS).',
      'Nhiệm vụ: Phân tích Mã bài học hoặc Tên bài/Yêu cầu của giáo viên, tra cứu và đối chiếu với Tài liệu nguồn (Phụ lục I, PPCT, SGK) để trích xuất CẤU HÌNH YÊU CẦU BÀI HỌC CHUẨN.',
      '',
      sourceContextText,
      '',
      '## NGUYÊN TẮC BẮT BUỘC:',
      `1. **ĐÚNG KHỐI LỚP**: Xác định chính xác khối lớp từ mã bài học/tên bài và tài liệu nguồn (Đang phân tích: ${detectedGrade}). TUYỆT ĐỐI KHÔNG NHẦM LẪN KIẾN THỨC GIỮA CÁC KHỐI LỚP (Ví dụ: Toán 9 gồm Phương trình bậc nhất 2 ẩn, Căn bậc hai, Hệ thức lượng, Đường tròn...; Toán 8 gồm Đa thức, Hằng đẳng thức, Tứ giác, Thalès...).`,
      '2. **ĐÚNG YCCĐ CỐT LÕI**: Bóc tách chính xác Yêu cầu cần đạt từ Phụ lục I và SGK hiện hành.',
      '',
      '## YÊU CẦU ĐẦU RA JSON BẮT BUỘC:',
      'Bạn PHẢI trả về ĐÚNG MỘT JSON OBJECT theo đúng cấu trúc sau (KHÔNG có markdown bao ngoài, KHÔNG có text giải thích ngoài JSON):',
      '{',
      '  "lessonTitle": "Tên bài học chuẩn từ nguồn",',
      '  "lessonCode": "' + (req.lessonCode || `TOAN-${detectedGrade.replace(/[^0-9]/g, '')}`) + '",',
      '  "subject": "Toán học",',
      '  "grade": "' + detectedGrade + '",',
      '  "term": "Học kỳ I",',
      '  "totalPeriods": 2,',
      '  "periodBreakdown": [',
      '    "Tiết 1: Tên nội dung tiết 1",',
      '    "Tiết 2: Tên nội dung tiết 2"',
      '  ],',
      '  "objectives": {',
      '    "knowledge": [',
      '      "Yêu cầu về kiến thức 1",',
      '      "Yêu cầu về kiến thức 2"',
      '    ],',
      '    "competencies": [',
      '      "Năng lực tư duy và lập luận toán học",',
      '      "Năng lực giải quyết vấn đề toán học",',
      '      "Năng lực mô hình hóa toán học"',
      '    ],',
      '    "qualities": [',
      '      "Chăm chỉ, tích cực tham gia hoạt động nhóm",',
      '      "Trách nhiệm, cẩn thận và chính xác trong tính toán"',
      '    ]',
      '  },',
      '  "keyConcepts": [',
      '    "Khái niệm trọng tâm 1",',
      '    "Khái niệm trọng tâm 2"',
      '  ],',
      '  "pedagogicalMethods": [',
      '    "Dạy học khám phá và phát hiện vấn đề",',
      '    "Trực quan hóa và mô hình hóa",',
      '    "Thảo luận nhóm & Khăn trải bàn"',
      '  ],',
      '  "selectedOutputs": {',
      '    "khdhDraft": true,',
      '    "worksheet": true,',
      '    "game": true,',
      '    "videoStoryboard": true,',
      '    "canvaSlides": true',
      '  },',
      '  "customNotes": "Bám sát định dạng 2 cột theo CV 5512 và chuẩn OMML"',
      '}',
    ].join('\n');

    const userMessage = [
      'MÃ BÀI HỌC / THAM SỐ ĐẦU VÀO TỪ GIÁO VIÊN: ' + (req.lessonCode || 'Chưa nhập'),
      'LỆNH QUY ĐỊNH: ' + (req.command || 'SOAN_XUAT'),
      `HÃY PHÂN TÍCH CHÍNH XÁC YÊU CẦU BÀI HỌC THEO ĐÚNG KHỐI ${detectedGrade.toUpperCase()} VÀ TÀI LIỆU NGUỒN.`,
    ].join('\n');

    let analysis: LessonRequirementAnalysis;
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
      analysis = JSON.parse(cleanText);
    } catch {
      analysis = LessonAnalyzerService.buildFallbackAnalysis(req.lessonCode || 'TOAN-9-HKI-SODAISO-C01-STT01');
    }

    return {
      analysis,
      keyUsed,
    };
  }

  /**
   * Tạo bản phân tích dự phòng chuẩn mực theo đúng Khối lớp
   */
  public static buildFallbackAnalysis(lessonInput: string): LessonRequirementAnalysis {
    const clean = (lessonInput || '').toLowerCase();
    let grade = 'Lớp 9';
    let term = 'Học kỳ I';

    if (clean.includes('8') || clean.includes('-8-') || clean.includes('toán 8')) {
      grade = 'Lớp 8';
    } else if (clean.includes('7') || clean.includes('-7-') || clean.includes('toán 7')) {
      grade = 'Lớp 7';
    } else if (clean.includes('6') || clean.includes('-6-') || clean.includes('toán 6')) {
      grade = 'Lớp 6';
    } else {
      grade = 'Lớp 9';
    }

    if (clean.includes('hkii') || clean.includes('hk2') || clean.includes('học kỳ 2')) {
      term = 'Học kỳ II';
    }

    if (grade === 'Lớp 9') {
      return {
        lessonTitle: 'Bài 1: Khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn',
        lessonCode: lessonInput || 'TOAN-9-HKI-C01-STT01',
        subject: 'Toán học',
        grade: 'Lớp 9',
        term,
        totalPeriods: 2,
        periodBreakdown: [
          'Tiết 1: Khái niệm phương trình bậc nhất hai ẩn và tập nghiệm',
          'Tiết 2: Khái niệm hệ hai phương trình bậc nhất hai ẩn',
        ],
        objectives: {
          knowledge: [
            'Nhận biết được phương trình bậc nhất hai ẩn và nghiệm của phương trình',
            'Nhận biết được hệ hai phương trình bậc nhất hai ẩn và nghiệm của hệ',
          ],
          competencies: [
            'Năng lực tư duy và lập luận toán học trong biểu diễn nghiệm',
            'Năng lực giải quyết vấn đề toán học thông qua bài toán thực tế',
            'Năng lực mô hình hóa toán học',
          ],
          qualities: [
            'Chăm chỉ, tích cực tìm tòi khám phá kiến thức',
            'Trách nhiệm, cẩn thận và chính xác trong tính toán',
          ],
        },
        keyConcepts: [
          'Phương trình bậc nhất hai ẩn ax + by = c',
          'Nghiệm và tập nghiệm của phương trình bậc nhất hai ẩn',
          'Hệ hai phương trình bậc nhất hai ẩn',
        ],
        pedagogicalMethods: [
          'Dạy học phát hiện và giải quyết vấn đề',
          'Phương pháp trực quan hóa nghiệm trên mặt phẳng tọa độ',
          'Phương pháp thảo luận nhóm',
        ],
        selectedOutputs: {
          khdhDraft: true,
          worksheet: true,
          game: true,
          videoStoryboard: true,
          canvaSlides: true,
        },
        customNotes: 'Bám sát SGK Toán 9 hiện hành (GDPT 2018) và chuẩn CV 5512',
      };
    }

    // Default Lớp 8 Fallback
    return {
      lessonTitle: 'Bài 1: Đơn thức nhiều biến. Đa thức nhiều biến',
      lessonCode: lessonInput || 'TOAN-8-HKI-C01-STT01',
      subject: 'Toán học',
      grade: 'Lớp 8',
      term,
      totalPeriods: 2,
      periodBreakdown: [
        'Tiết 1: Đơn thức nhiều biến và thu gọn đơn thức',
        'Tiết 2: Đa thức nhiều biến và thu gọn đa thức',
      ],
      objectives: {
        knowledge: [
          'Nhận biết được đơn thức, đa thức nhiều biến',
          'Thu gọn và xác định bậc của đơn thức, đa thức',
        ],
        competencies: [
          'Năng lực tư duy và lập luận toán học',
          'Năng lực giải quyết vấn đề toán học',
        ],
        qualities: [
          'Chăm chỉ, tích cực tham gia xây dựng bài',
          'Trách nhiệm, cẩn thận và chính xác',
        ],
      },
      keyConcepts: ['Đơn thức nhiều biến', 'Bậc của đơn thức', 'Đa thức nhiều biến'],
      pedagogicalMethods: ['Dạy học khám phá', 'Luyện tập thực hành', 'Khăn trải bàn'],
      selectedOutputs: {
        khdhDraft: true,
        worksheet: true,
        game: true,
        videoStoryboard: true,
        canvaSlides: true,
      },
      customNotes: 'Bám sát định dạng 2 cột theo CV 5512 và chuẩn OMML',
    };
  }
}
