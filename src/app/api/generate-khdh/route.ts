import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { GeminiService } from '@/services/ai/gemini.service';
import { SourceDocumentService } from '@/services/documents/source-document.service';
import { SourceContextBuilder } from '@/services/documents/source-context-builder';
import { ContentNormalizer } from '@/services/export/content-normalizer';
import { checkRateLimit } from '@/lib/rate-limiter';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'QUOTA_LIMIT',
          message: 'Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau 1 phút.',
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      command,
      lessonCode,
      jobId,
      apiKey,
      apiKeys,
      documentIds,
      projectId,
      lockedConfig,
      formatMode, // 'SPLIT_PERIODS' | 'CONTINUOUS_4SECTION'
      sectionStage, // 'ALL' | 'STAGE_1_MUC_TIEU_KHOI_DONG' | 'STAGE_2_HINH_THANH_KT' | 'STAGE_3_LUYEN_TAP' | 'STAGE_4_VAN_DUNG_HUONG_DAN'
    } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_COMMAND', message: 'Lệnh (command) không được để trống' },
        { status: 400 }
      );
    }

    const keyPool = GeminiService.resolveKeyPool(apiKey, apiKeys);
    if (keyPool.length === 0) {
      return NextResponse.json(
        {
          error: 'MISSING_API_KEY',
          message: 'Chưa cấu hình Google AI API Key. Vui lòng nhập API Key trên giao diện hoặc trong .env.local',
        },
        { status: 401 }
      );
    }

    const env = getEnv();
    const activeJobId = jobId || `JOB-${Date.now()}`;
    const targetProject = await resolveUserProjectIdFromRequest(request, projectId);

    // Xác định chính xác giai đoạn (Section Stage)
    const cmdUpper = command.toUpperCase();
    const effectiveStage = sectionStage || (
      cmdUpper.includes('PHAN_A') || cmdUpper.includes('STAGE_1') ? 'STAGE_1_MUC_TIEU_KHOI_DONG' :
      cmdUpper.includes('PHAN_B') || cmdUpper.includes('STAGE_2') ? 'STAGE_2_HINH_THANH_KT' :
      cmdUpper.includes('PHAN_C') || cmdUpper.includes('STAGE_3') ? 'STAGE_3_LUYEN_TAP' :
      cmdUpper.includes('PHAN_D') || cmdUpper.includes('STAGE_4') ? 'STAGE_4_VAN_DUNG_HUONG_DAN' :
      'ALL'
    );

    const isContinuous4Section =
      formatMode === 'CONTINUOUS_4SECTION' ||
      cmdUpper.includes('KHONG_TACH_TIET') ||
      cmdUpper.includes('4PHAN') ||
      cmdUpper.includes('4_PHAN') ||
      cmdUpper.includes('V11') ||
      effectiveStage !== 'ALL';

    // 1. Lấy danh sách tài liệu nguồn sẵn sàng (Source Documents)
    let activeDocs = await SourceDocumentService.getActiveReady(targetProject);
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      activeDocs = activeDocs.filter((d) => documentIds.includes(d.id));
    }

    // Nếu lệnh là DANH_MUC: Trích xuất danh mục và ma trận bài học trực tiếp
    if (cmdUpper.includes('DANH_MUC')) {
      const { CatalogExtractorService } = await import('@/services/catalog/catalog-extractor.service');
      const { markdownSummary, keyUsed } = await CatalogExtractorService.extractCatalog({
        grade: lockedConfig?.grade || 'Lớp 8',
        subject: lockedConfig?.subject || 'Toán học',
        term: lockedConfig?.term || 'Học kỳ I',
        apiKeys: keyPool,
        documentIds,
        projectId: targetProject,
      });

      return NextResponse.json({
        status: 'OK',
        job_id: activeJobId,
        command,
        format_mode: isContinuous4Section ? 'CONTINUOUS_4SECTION' : 'SPLIT_PERIODS',
        lesson_code: lessonCode || 'DANH_MUC_GDPT2018',
        khdh_draft: markdownSummary,
        token_usage: { inputTokens: 500, outputTokens: 1200, totalTokens: 1700 },
        model: 'Gemini (Catalog Extractor)',
        duration_ms: 1200,
        key_used: keyUsed,
        sources_used: activeDocs.map((d) => ({ id: d.id, name: d.displayName, type: d.documentType, version: d.version })),
        source_readiness: SourceContextBuilder.checkReadiness(activeDocs),
      });
    }

    const { systemContext: sourceContextText, sourcesUsed } = SourceContextBuilder.buildPromptContext(activeDocs);
    const readinessReport = SourceContextBuilder.checkReadiness(activeDocs);

    // Xây dựng khối cấu hình cố định
    let lockedConfigSection = '';
    if (lockedConfig && typeof lockedConfig === 'object') {
      lockedConfigSection = [
        '',
        '## 🔒 CẤU HÌNH YÊU CẦU ĐÃ ĐƯỢC GIÁO VIÊN CỐ ĐỊNH (BẮT BUỘC TUÂN THỦ 100%):',
        `- Tên bài học chuẩn: ${lockedConfig.lessonTitle || ''}`,
        `- Mã bài học: ${lockedConfig.lessonCode || lessonCode || ''}`,
        `- Khối lớp & Học kỳ: ${lockedConfig.grade || 'Lớp 8'} - ${lockedConfig.subject || 'Toán học'} (${lockedConfig.term || 'Học kỳ I'})`,
        `- Tổng số tiết: ${lockedConfig.totalPeriods || 2} tiết`,
        `- Phân phối từng tiết: ${(lockedConfig.periodBreakdown || []).join(' | ')}`,
        `- Yêu cầu cần đạt về KIẾN THỨC: ${(lockedConfig.objectives?.knowledge || []).join('; ')}`,
        `- Yêu cầu cần đạt về NĂNG LỰC: ${(lockedConfig.objectives?.competencies || []).join('; ')}`,
        `- Yêu cầu cần đạt về PHẨM CHẤT: ${(lockedConfig.objectives?.qualities || []).join('; ')}`,
        `- Khái niệm trọng tâm: ${(lockedConfig.keyConcepts || []).join(', ')}`,
        `- Phương pháp dạy học: ${(lockedConfig.pedagogicalMethods || []).join(', ')}`,
        lockedConfig.customNotes ? `- Ghi chú riêng: ${lockedConfig.customNotes}` : '',
        '',
      ].join('\n');
    }

    let systemPrompt = '';
    let userMessage = '';

    // ==========================================
    // PHÂN LUỒNG PROMPT CHUYÊN BIỆT THEO TỪNG GIAI ĐOẠN
    // ==========================================

    if (effectiveStage === 'STAGE_4_VAN_DUNG_HUONG_DAN') {
      // GIAI ĐOẠN 4: VẬN DỤNG & HƯỚNG DẪN VỀ NHÀ
      systemPrompt = [
        'Bạn là KhdhBuilderAgent V11-2 FINAL — Chuyên gia biên soạn HOẠT ĐỘNG VẬN DỤNG và HƯỚNG DẪN VỀ NHÀ.',
        `Trường: ${env.SCHOOL_NAME} | Tổ: ${env.DEPARTMENT} | Giáo viên: ${env.TEACHER_NAME}`,
        '',
        '## 🎯 NHIỆM VỤ ĐỘC LẬP CHO GIAI ĐOẠN 4 (PHẦN D & MỤC IV):',
        'BẠN CHỈ ĐƯỢC PHÉP SOẠN ĐÚNG 2 MỤC SAU (TUYỆT ĐỐI KHÔNG SOẠN LẠI PHẦN ĐẦU, MỤC TIÊU, HOẶC PHẦN A, B, C):',
        '',
        '1. ## D. HOẠT ĐỘNG VẬN DỤNG',
        '   - a) Mục tiêu: Vận dụng kiến thức bài học để giải quyết các vấn đề thực tiễn sinh động, tích hợp liên môn hoặc mô hình thực tế.',
        '   - b) Nội dung: Tình huống thực tế, bài toán thực tế (hoặc dự án/nhiệm vụ nhỏ) phù hợp với trình độ học sinh.',
        '   - c) Sản phẩm: Kết quả giải quyết vấn đề, lời giải chi tiết của bài toán thực tế hoặc sản phẩm dự án của HS.',
        '   - d) Tổ chức thực hiện: BẢNG 2 CỘT CHUẨN 5512 (HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN) với đủ 4 bước (Bước 1: Chuyển giao, Bước 2: Thực hiện, Bước 3: Báo cáo thảo luận, Bước 4: Kết luận nhận định).',
        '',
        '2. # IV. HƯỚNG DẪN VỀ NHÀ',
        '   - Ôn tập, củng cố toàn bộ kiến thức trọng tâm của bài học.',
        '   - Bài tập về nhà trong SGK, SBT.',
        '   - Nhiệm vụ chuẩn bị cho bài học kế tiếp.',
        '',
        '## ⛔ QUY TẮC CẤM VI PHẠM CHO GIAI ĐOẠN 4:',
        '- BẮT ĐẦU TRỰC TIẾP bằng dòng tiêu đề: "## D. HOẠT ĐỘNG VẬN DỤNG"',
        '- TUYỆT ĐỐI KHÔNG xuất tiêu đề trường, tổ, tên bài ở đầu.',
        '- TUYỆT ĐỐI KHÔNG xuất "# I. MỤC TIÊU", "# II. THIẾT BỊ".',
        '- TUYỆT ĐỐI KHÔNG xuất "## A. HOẠT ĐỘNG KHỞI ĐỘNG", "## B. HÌNH THÀNH KIẾN THỨC", "## C. LUYỆN TẬP".',
        '- Bảng chỉ dùng đúng 2 cột. Công thức toán dùng chuẩn LaTeX $...$.',
        '',
        lockedConfigSection,
        '',
        sourceContextText,
      ].join('\n');

      userMessage = [
        `LỆNH: Soạn Giai đoạn 4: ## D. HOẠT ĐỘNG VẬN DỤNG và # IV. HƯỚNG DẪN VỀ NHÀ cho bài học: ${lockedConfig?.lessonTitle || lessonCode || 'TỰ ĐỘNG'}`,
        `MÃ CÔNG VIỆC: ${activeJobId}`,
        '',
        'BẮT ĐẦU TRỰC TIẾP BẰNG: "## D. HOẠT ĐỘNG VẬN DỤNG". Soạn đầy đủ, sâu sắc, bảng 2 cột chi tiết và kết thúc sau mục IV. HƯỚNG DẪN VỀ NHÀ.',
      ].join('\n');

    } else if (effectiveStage === 'STAGE_3_LUYEN_TAP') {
      // GIAI ĐOẠN 3: HOẠT ĐỘNG LUYỆN TẬP
      systemPrompt = [
        'Bạn là KhdhBuilderAgent V11-2 FINAL — Chuyên gia biên soạn HOẠT ĐỘNG LUYỆN TẬP.',
        `Trường: ${env.SCHOOL_NAME} | Tổ: ${env.DEPARTMENT} | Giáo viên: ${env.TEACHER_NAME}`,
        '',
        '## 🎯 NHIỆM VỤ ĐỘC LẬP CHO GIAI ĐOẠN 3 (PHẦN C):',
        'BẠN CHỈ ĐƯỢC PHÉP SOẠN DUY NHẤT MỤC: ## C. HOẠT ĐỘNG LUYỆN TẬP',
        '- a) Mục tiêu: Rèn luyện kỹ năng, củng cố và khắc sâu kiến thức trọng tâm.',
        '- b) Nội dung: Hệ thống câu hỏi trắc nghiệm củng cố và bài tập tự luận phân hóa (Nhận biết, Thông hiểu, Vận dụng) bám sát SGK/SBT.',
        '- c) Sản phẩm: Lời giải chi tiết 100%, đáp án rõ ràng từng bước.',
        '- d) Tổ chức thực hiện: BẢNG 2 CỘT CHUẨN 5512 (HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN) với 4 bước sư phạm.',
        '',
        '## ⛔ QUY TẮC CẤM VI PHẠM:',
        '- BẮT ĐẦU TRỰC TIẾP bằng dòng tiêu đề: "## C. HOẠT ĐỘNG LUYỆN TẬP"',
        '- TUYỆT ĐỐI KHÔNG xuất Phần đầu, Mục tiêu, Phần A, B, D hay IV.',
        '',
        lockedConfigSection,
        '',
        sourceContextText,
      ].join('\n');

      userMessage = [
        `LỆNH: Soạn Giai đoạn 3: ## C. HOẠT ĐỘNG LUYỆN TẬP cho bài học: ${lockedConfig?.lessonTitle || lessonCode || 'TỰ ĐỘNG'}`,
        'BẮT ĐẦU TRỰC TIẾP BẰNG: "## C. HOẠT ĐỘNG LUYỆN TẬP". Soạn hệ thống bài tập phong phú, lời giải chi tiết và bảng 2 cột chuẩn.',
      ].join('\n');

    } else if (effectiveStage === 'STAGE_2_HINH_THANH_KT') {
      // GIAI ĐOẠN 2: HÌNH THÀNH KIẾN THỨC MỚI
      systemPrompt = [
        'Bạn là KhdhBuilderAgent V11-2 FINAL — Chuyên gia biên soạn HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI.',
        `Trường: ${env.SCHOOL_NAME} | Tổ: ${env.DEPARTMENT} | Giáo viên: ${env.TEACHER_NAME}`,
        '',
        '## 🎯 NHIỆM VỤ ĐỘC LẬP CHO GIAI ĐOẠN 2 (PHẦN B):',
        'BẠN CHỈ ĐƯỢC PHÉP SOẠN DUY NHẤT MỤC: ## B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI',
        '- Chia thành các hoạt động khám phá cụ thể (Hoạt động 1, Hoạt động 2...).',
        '- Mỗi hoạt động có đầy đủ a) Mục tiêu, b) Nội dung, c) Sản phẩm (định nghĩa, công thức, ví dụ giải mẫu), d) Tổ chức thực hiện trong BẢNG 2 CỘT chuẩn.',
        '- Chèn mã TikZ / Overleaf cho hình vẽ hình học và Prompt tạo ảnh minh họa.',
        '',
        '## ⛔ QUY TẮC CẤM VI PHẠM:',
        '- BẮT ĐẦU TRỰC TIẾP bằng dòng tiêu đề: "## B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI"',
        '- TUYỆT ĐỐI KHÔNG xuất Phần đầu, Mục tiêu, Phần A, C, D hay IV.',
        '',
        lockedConfigSection,
        '',
        sourceContextText,
      ].join('\n');

      userMessage = [
        `LỆNH: Soạn Giai đoạn 2: ## B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI cho bài học: ${lockedConfig?.lessonTitle || lessonCode || 'TỰ ĐỘNG'}`,
        'BẮT ĐẦU TRỰC TIẾP BẰNG: "## B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI". Soạn chuyên sâu từng hoạt động khám phá, bảng 2 cột chi tiết và mã TikZ/Prompt ảnh.',
      ].join('\n');

    } else if (effectiveStage === 'STAGE_1_MUC_TIEU_KHOI_DONG') {
      // GIAI ĐOẠN 1: PHẦN ĐẦU + MỤC TIÊU + THIẾT BỊ + A. KHỞI ĐỘNG
      systemPrompt = [
        'Bạn là KhdhBuilderAgent V11-2 FINAL — Chuyên gia biên soạn PHẦN ĐẦU, MỤC TIÊU VÀ HOẠT ĐỘNG KHỞI ĐỘNG.',
        `Trường: ${env.SCHOOL_NAME} | Tổ: ${env.DEPARTMENT} | Giáo viên: ${env.TEACHER_NAME}`,
        '',
        '## 🎯 NHIỆM VỤ ĐỘC LẬP CHO GIAI ĐOẠN 1:',
        'Soạn hoàn chỉnh từ đầu bài học đến hết Hoạt động Khởi động:',
        '1. PHẦN ĐẦU KHDH (Trường, Tổ, Giáo viên, Tên bài, Lớp, Thời lượng, PPCT, Tuần).',
        '2. # I. MỤC TIÊU (## 1. Kiến thức - cụm danh từ ngắn; ## 2. Năng lực - hành động quan sát được; ## 3. Phẩm chất - hành vi cụ thể).',
        '3. # II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU (## 1. Giáo viên, ## 2. Học sinh).',
        '4. # III. TIẾN TRÌNH DẠY HỌC -> ## A. HOẠT ĐỘNG KHỞI ĐỘNG (a) Mục tiêu, b) Nội dung bài toán mở đầu, c) Sản phẩm, d) Tổ chức thực hiện bảng 2 cột).',
        '',
        '## ⛔ QUY TẮC CẤM VI PHẠM:',
        '- DỪNG LẠI NGAY sau khi kết thúc Hoạt động Khởi động (A).',
        '- TUYỆT ĐỐI KHÔNG xuất Phần B, C, D hay IV.',
        '',
        lockedConfigSection,
        '',
        sourceContextText,
      ].join('\n');

      userMessage = [
        `LỆNH: Soạn Giai đoạn 1: Phần đầu -> # I. MỤC TIÊU -> # II. THIẾT BỊ -> ## A. HOẠT ĐỘNG KHỞI ĐỘNG cho bài học: ${lockedConfig?.lessonTitle || lessonCode || 'TỰ ĐỘNG'}`,
        'Bắt đầu từ Phần đầu KHDH và dừng lại sau khi kết thúc Hoạt động Khởi động.',
      ].join('\n');

    } else {
      // SOẠN TOÀN BỘ TRONG 1 LƯỢT (CHẾ ĐỘ TỔNG QUAN)
      let skillContent = '';
      try {
        const v11FormPath = join(process.cwd(), '03_FORM_KHDH_V11_2_4PHAN_KHONG_TACHTIET.MD');
        skillContent = await readFile(v11FormPath, 'utf-8');
      } catch {
        skillContent = 'Soạn KHDH V11-2 FINAL 4 phần A-B-C-D không tách tiết, bảng 2 cột CV 5512.';
      }

      systemPrompt = isContinuous4Section
        ? [
            'Bạn là KhdhBuilderAgent V11-2 FINAL — Chế độ SOẠN KHDH 4 PHẦN LIỀN MẠCH, KHÔNG TÁCH TIẾT.',
            `Trường: ${env.SCHOOL_NAME} | Tổ: ${env.DEPARTMENT} | Giáo viên: ${env.TEACHER_NAME}`,
            '',
            '## CẤU TRÚC XUẤT ĐẦY ĐỦ:',
            'Phần đầu KHDH -> # I. MỤC TIÊU -> # II. THIẾT BỊ -> # III. TIẾN TRÌNH (A. Khởi động -> B. Kiến thức mới -> C. Luyện tập -> D. Vận dụng) -> # IV. HƯỚNG DẪN VỀ NHÀ.',
            'Bảng tổ chức thực hiện 2 cột (HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN). Công thức toán LaTeX.',
            '',
            lockedConfigSection,
            '',
            sourceContextText,
            '',
            '## HƯỚNG DẪN CẤU TRÚC:',
            skillContent,
          ].join('\n')
        : [
            'Bạn là KhdhBuilderAgent V10.1 FINAL - Chế độ SOẠN KHDH TÁCH TIẾT THEO PPCT.',
            `Trường: ${env.SCHOOL_NAME} | Tổ: ${env.DEPARTMENT} | Giáo viên: ${env.TEACHER_NAME}`,
            '',
            'Phân chia theo từng TIẾT [PPCT] (Tiết 1, Tiết 2...), bảng 2 cột chuẩn 5512.',
            '',
            lockedConfigSection,
            '',
            sourceContextText,
          ].join('\n');

      userMessage = [
        `LỆNH THỰC THI: ${command} ${lessonCode || ''}`,
        `CHẾ ĐỘ SOẠN: ${isContinuous4Section ? 'V11 FINAL - 4 PHẦN A-B-C-D' : 'V10.1 - TÁCH TIẾT'}`,
        `MÃ BÀI HỌC: ${lockedConfig?.lessonTitle || lessonCode || 'TỰ ĐỘNG'}`,
        `MÃ CÔNG VIỆC: ${activeJobId}`,
        lockedConfigSection,
        '',
        isContinuous4Section
          ? 'Hãy thực thi lệnh và tạo bản Kế hoạch bài dạy hoàn chỉnh theo đúng FORM V11-2. BẮT BUỘC XUẤT ĐẦY ĐỦ TỪ: Phần đầu KHDH -> # I. MỤC TIÊU -> # II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU -> # III. TIẾN TRÌNH DẠY HỌC (A, B, C, D bảng 2 cột) -> # IV. HƯỚNG DẪN VỀ NHÀ.'
          : 'Hãy thực thi lệnh và tạo bản Kế hoạch bài dạy hoàn chỉnh, chi tiết theo đúng định dạng Tách tiết V10.1.',
      ].join('\n');
    }

    const result = await GeminiService.generateContent({
      apiKeys: keyPool,
      systemPrompt,
      userMessage,
      model: 'pro',
      maxTokens: 8192,
    });

    const cleanDraft = ContentNormalizer.cleanMetadata(result.text);

    return NextResponse.json({
      status: 'OK',
      job_id: activeJobId,
      command,
      section_stage: effectiveStage,
      format_mode: isContinuous4Section ? 'CONTINUOUS_4SECTION' : 'SPLIT_PERIODS',
      lesson_code: lessonCode || 'AUTO',
      khdh_draft: cleanDraft,
      token_usage: result.usage,
      model: result.model,
      duration_ms: result.durationMs,
      key_used: result.keyUsed,
      sources_used: sourcesUsed,
      source_readiness: readinessReport,
    });
  } catch (error) {
    const errStr = String(error);
    console.error('API Error in generate-khdh:', errStr);
    return NextResponse.json(
      {
        error: 'GENERATION_FAILED',
        message: errStr.includes('API key')
          ? 'Google AI API Key không hợp lệ hoặc đã hết hạn.'
          : 'Đã xảy ra lỗi khi tạo KHDH: ' + errStr,
      },
      { status: 500 }
    );
  }
}
