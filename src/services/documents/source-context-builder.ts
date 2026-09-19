import { SourceDocument, SourceDocumentType, SourceReadinessReport } from '@/types/source-document';

export class SourceContextBuilder {
  /**
   * Thứ tự ưu tiên bắt buộc giữa các nguồn tài liệu
   * 1. Phụ lục I hiện hành
   * 2. PPCT hiện hành
   * 3. SGK_
   * 4. KHDH_ cũ (Chỉ làm tài liệu tham khảo)
   * 5. Tài liệu khác
   */
  public static readonly PRIORITY_MAP: Record<SourceDocumentType, number> = {
    PL1: 1,
    PPCT: 2,
    SGK: 3,
    KHDH_OLD: 4,
    OTHER: 5,
  };

  /**
   * Sắp xếp danh sách tài liệu theo thứ tự ưu tiên
   */
  public static sortByPriority(docs: SourceDocument[]): SourceDocument[] {
    return [...docs].sort((a, b) => {
      const pA = this.PRIORITY_MAP[a.documentType] || 99;
      const pB = this.PRIORITY_MAP[b.documentType] || 99;
      if (pA !== pB) return pA - pB;
      return b.version - a.version;
    });
  }

  /**
   * Kiểm tra mức độ sẵn sàng của nguồn tài liệu (Source Readiness Check)
   */
  public static checkReadiness(docs: SourceDocument[]): SourceReadinessReport {
    const activeReady = docs.filter((d) => d.isActive && d.status === 'READY');

    const hasPL1 = activeReady.some((d) => d.documentType === 'PL1');
    const hasPPCT = activeReady.some((d) => d.documentType === 'PPCT');
    const hasSGK = activeReady.some((d) => d.documentType === 'SGK');
    const hasKHDH_OLD = activeReady.some((d) => d.documentType === 'KHDH_OLD');

    const warningMessages: string[] = [];

    if (!hasPL1) {
      warningMessages.push('Chưa có Phụ lục I hiện hành (Khuyến nghị bổ sung để đảm bảo chuẩn YCCĐ và số tiết).');
    }
    if (!hasPPCT) {
      warningMessages.push('Chưa có Phân phối chương trình (PPCT) để đối chiếu tuần và thứ tự bài.');
    }
    if (!hasSGK) {
      warningMessages.push('Chưa có SGK môn học (Khuyến nghị bổ sung để bám sát thuật ngữ và ví dụ chuẩn).');
    }

    const isSufficient = hasPL1 || hasPPCT || hasSGK || activeReady.length > 0;

    return {
      pl1Status: hasPL1 ? 'READY' : 'MISSING',
      ppctStatus: hasPPCT ? 'READY' : 'MISSING',
      sgkStatus: hasSGK ? 'READY' : 'MISSING',
      khdhOldStatus: hasKHDH_OLD ? 'READY' : 'MISSING',
      isSufficient,
      readyCount: activeReady.length,
      activeCount: docs.filter((d) => d.isActive).length,
      warningMessages,
      priorityOrder: ['PL1', 'PPCT', 'SGK', 'KHDH_OLD', 'OTHER'],
    };
  }

  /**
   * Xây dựng khối ngữ cảnh tài liệu nguồn kèm quy tắc ưu tiên & giải quyết xung đột
   */
  public static buildPromptContext(docs: SourceDocument[]): {
    systemContext: string;
    sourcesUsed: { id: string; name: string; type: SourceDocumentType; version: number }[];
  } {
    const activeReady = this.sortByPriority(docs.filter((d) => d.isActive && d.status === 'READY'));

    if (activeReady.length === 0) {
      return {
        systemContext: '## TÀI LIỆU NGUỒN: Chưa có tài liệu tải lên từ người dùng. Thực hiện theo yêu cầu chuẩn Công văn 5512.',
        sourcesUsed: [],
      };
    }

    const sourcesUsed = activeReady.map((d) => ({
      id: d.id,
      name: d.displayName || d.originalFileName,
      type: d.documentType,
      version: d.version,
    }));

    const lines: string[] = [
      '# CĂN CỨ TÀI LIỆU NGUỒN VÀ QUY TẮC ƯU TIÊN (STRICT SOURCE PROTOCOL):',
      '',
      'Hệ thống đang sử dụng các tài liệu nguồn sau đây làm căn cứ chính thức:',
    ];

    activeReady.forEach((d, idx) => {
      const typeLabel =
        d.documentType === 'PL1'
          ? '⭐ PHỤ LỤC I HIỆN HÀNH (Ưu tiên cao nhất)'
          : d.documentType === 'PPCT'
          ? '📘 PHÂN PHỐI CHƯƠNG TRÌNH (Ưu tiên số 2)'
          : d.documentType === 'SGK'
          ? '📗 SÁCH GIÁO KHOA (Kiến thức môn học chính)'
          : d.documentType === 'KHDH_OLD'
          ? '📙 KHDH CŨ (TÀI LIỆU THAM KHẢO - Không ghi đè nguồn chính)'
          : '📄 TÀI LIỆU KHÁC';

      lines.push(`${idx + 1}. [${typeLabel}] - ${d.displayName} (v${d.version})`);
    });

    lines.push('');
    lines.push('## NGUYÊN TẮC BẮT BUỘC KHI XỬ LÝ NGUỒN:');
    lines.push('1. **Thứ tự ưu tiên**: Phụ lục I > PPCT > SGK > KHDH cũ > Tài liệu khác.');
    lines.push('2. **Phụ lục I**: Phải giữ nguyên tên bài, số tiết, Yêu cầu cần đạt (YCCĐ), thời điểm thực hiện.');
    lines.push('3. **PPCT**: Phải giữ nguyên thứ tự bài dạy, tuần học và số tiết phân bổ.');
    lines.push('4. **SGK**: Bám sát thuật ngữ, định nghĩa, công thức toán học, ví dụ trọng tâm.');
    lines.push('5. **KHDH cũ**: CHỈ dùng để tham khảo ý tưởng hoạt động và phân bổ thời lượng. KHÔNG được sao chép nguyên văn và KHÔNG được ghi đè thông tin mới của Phụ lục I, PPCT hay SGK.');
    lines.push('6. **Xử lý xung đột (Conflict Rule)**: Nếu phát hiện nội dung chưa thống nhất giữa các tài liệu nguồn, AI phải ưu tiên theo thứ tự trên. Nếu không thể xác định, AI phải xuất rõ cảnh báo: "Phát hiện nội dung chưa thống nhất giữa các tài liệu nguồn." và chỉ rõ tài liệu liên quan. TUYỆT ĐỐI KHÔNG TỰ BỊA DỮ LIỆU.');
    lines.push('');
    lines.push('## NỘI DUNG TRÍCH XUẤT TỪ TÀI LIỆU NGUỒN:');

    activeReady.forEach((d) => {
      lines.push(`### NGUỒN: [${d.documentType}] ${d.displayName} (v${d.version})`);
      if (d.extractedText && d.extractedText.trim().length > 0) {
        lines.push('```text');
        lines.push(d.extractedText.slice(0, 15000));
        lines.push('```');
      } else {
        lines.push(`*(Tài liệu ${d.originalFileName} sẵn sàng trong phiên làm việc)*`);
      }
      lines.push('');
    });

    return {
      systemContext: lines.join('\n'),
      sourcesUsed,
    };
  }
}
