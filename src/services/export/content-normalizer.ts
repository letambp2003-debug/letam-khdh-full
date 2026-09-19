export class ContentNormalizer {
  /**
   * Danh sách các mẫu câu mở đầu / kết thúc mang tính chất chatbot cần loại bỏ
   */
  private static readonly BOILERPLATE_PATTERNS: RegExp[] = [
    /^dưới đây là (bản|nội dung|kế hoạch|giáo án)[^\n]*\n+/im,
    /^sau đây là (bản|nội dung|kế hoạch|giáo án)[^\n]*\n+/im,
    /^tôi xin (trình bày|gửi bạn|chia sẻ)[^\n]*\n+/im,
    /^chào bạn[^\n]*\n+/im,
    /\n+hy vọng (bản|kế hoạch|giáo án)[^\n]*$/im,
    /\n+nếu bạn cần (thêm|chỉnh sửa|bổ sung)[^\n]*$/im,
    /\n+chúc bạn dạy học tốt[^\n]*$/im,
  ];

  /**
   * Loại bỏ các khối JSON / AgentMessage / YAML / Metadata râu ria ở đầu văn bản
   * ĐẢM BẢO TUYỆT ĐỐI KHÔNG XÓA NHẦM MỤC "I. MỤC TIÊU" VÀ CÁC NỘI DUNG GIỮA DẤU PHÂN CÁCH "---"
   */
  public static cleanMetadata(markdown: string): string {
    if (!markdown) return '';
    let text = markdown.trim();

    // 1. Unwrap whole markdown wrapper ```markdown ... ```
    text = text.replace(/^\`\`\`(?:markdown|md)\s*\n([\s\S]*?)\n\`\`\`\s*$/i, '$1');

    // 2. Loại bỏ khối code JSON ở đầu (ví dụ ```json { "job_id": ... } ```)
    if (text.startsWith('```json') || text.startsWith('```JSON')) {
      const endBlock = text.indexOf('```', 7);
      if (endBlock !== -1) {
        const potentialJson = text.slice(7, endBlock);
        if (potentialJson.includes('"job_id"') || potentialJson.includes('"status"')) {
          text = text.slice(endBlock + 3).trim();
        }
      }
    }

    // 3. Loại bỏ khối YAML frontmatter ở đầu (CHỈ KHI ở ngay đầu chuỗi và không chứa tiêu đề Markdown #)
    if (text.startsWith('---')) {
      const secondDivider = text.indexOf('\n---', 3);
      if (secondDivider !== -1 && secondDivider < 500) {
        const potentialYaml = text.slice(3, secondDivider);
        // Kiểm tra xem có chứa tiêu đề Markdown # I. MỤC TIÊU không. Nếu có thì TUYỆT ĐỐI KHÔNG xóa!
        if (!potentialYaml.includes('#') && (potentialYaml.includes('FORM_MODE') || potentialYaml.includes('lesson_id'))) {
          text = text.slice(secondDivider + 4).trim();
        }
      }
    }

    // 4. Loại bỏ khối code YAML ở đầu (ví dụ ```yaml FORM_MODE: ... ```)
    if (text.startsWith('```yaml') || text.startsWith('```yml')) {
      const endBlock = text.indexOf('```', 7);
      if (endBlock !== -1) {
        text = text.slice(endBlock + 3).trim();
      }
    }

    // 5. Loại bỏ đối tượng JSON thô ở đầu văn bản (ví dụ { "job_id": ..., "status": ... })
    if (text.startsWith('{')) {
      const firstHeading = text.indexOf('\n#');
      const closeBrace = text.indexOf('}\n');
      if (closeBrace !== -1 && (firstHeading === -1 || closeBrace < firstHeading)) {
        const potentialJson = text.slice(0, closeBrace + 1);
        if (potentialJson.includes('"job_id"') || potentialJson.includes('"status"')) {
          text = text.slice(closeBrace + 2).trim();
        }
      }
    }

    // 6. Loại bỏ các dòng lệnh metadata lặp lại (LỆNH THỰC THI: ..., MÃ BÀI HỌC: ...)
    text = text.replace(/^(?:LỆNH THỰC THI|MÃ BÀI HỌC|MÃ CÔNG VIỆC|JOB_ID|COMMAND):[^\n]*\n+/gim, '');

    return text.trim();
  }

  /**
   * Chuẩn hóa văn bản trước khi đưa vào Word Document Builder
   */
  public static normalize(markdown: string): string {
    if (!markdown) return '';

    // 1. Làm sạch JSON và metadata ở đầu
    let text = this.cleanMetadata(markdown);

    // 2. Loại bỏ các câu hội thoại chatbot thừa
    for (const pattern of this.BOILERPLATE_PATTERNS) {
      text = text.replace(pattern, '');
    }

    // 3. Chuẩn hóa khoảng trắng và dấu câu
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');

    // 4. Chuẩn hóa khoảng trắng trước dấu câu (ngoài khối code/math)
    text = text.replace(/\s+([.,;:?!])(?=\s|$)/g, '$1');

    // 5. Loại bỏ các ký tự điều khiển không in được (trừ newline & tab)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return text.trim();
  }
}
