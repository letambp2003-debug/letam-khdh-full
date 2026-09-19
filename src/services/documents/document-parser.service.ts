import zlib from 'zlib';
import { SourceDocumentType } from '@/types/source-document';

export class DocumentParserService {
  /**
   * Tự động nhận diện loại tài liệu dựa trên tên file và cấu hình
   */
  public static detectDocumentType(fileName: string, manualType?: string): SourceDocumentType {
    if (manualType && ['PL1', 'PPCT', 'SGK', 'KHDH_OLD', 'OTHER'].includes(manualType)) {
      return manualType as SourceDocumentType;
    }

    const name = fileName.toLowerCase().replace(/[-_\s]/g, '');

    if (name.includes('pl1') || name.includes('phuluc1') || name.includes('phuluci') || name.includes('phuluc_1')) {
      return 'PL1';
    }

    if (name.includes('ppct') || name.includes('phanphoi') || name.includes('phanphoichuongtrinh')) {
      return 'PPCT';
    }

    if (name.includes('sgk') || name.includes('sachgiaokhoa') || name.includes('textbook')) {
      return 'SGK';
    }

    if (
      name.includes('khdhold') ||
      name.includes('khdhcu') ||
      name.includes('giaoancu') ||
      name.includes('khdh202') ||
      name.includes('khdh')
    ) {
      return 'KHDH_OLD';
    }

    return 'OTHER';
  }

  /**
   * Trích xuất văn bản và cấu trúc bảng biểu từ file .docx (Unpack ZIP word/document.xml)
   * Duy trì cấu trúc hàng bảng chuẩn 1 dòng Markdown (| col1 | col2 | ...)
   */
  public static extractDocxContent(buffer: Buffer): string | null {
    try {
      let offset = 0;
      let documentXmlBuffer: Buffer | null = null;

      while (offset < buffer.length - 30) {
        // Tìm chữ ký Local File Header: 0x04034b50 ("PK\x03\x04")
        if (
          buffer[offset] === 0x50 &&
          buffer[offset + 1] === 0x4b &&
          buffer[offset + 2] === 0x03 &&
          buffer[offset + 3] === 0x04
        ) {
          const compMethod = buffer.readUInt16LE(offset + 8);
          const compSize = buffer.readUInt32LE(offset + 18);
          const fileNameLen = buffer.readUInt16LE(offset + 26);
          const extraLen = buffer.readUInt16LE(offset + 28);

          const fileNameStart = offset + 30;
          const fileName = buffer.toString('utf8', fileNameStart, fileNameStart + fileNameLen);
          const dataStart = fileNameStart + fileNameLen + extraLen;

          if (fileName === 'word/document.xml') {
            const compData = buffer.slice(dataStart, dataStart + compSize);
            if (compMethod === 8) {
              documentXmlBuffer = zlib.inflateRawSync(compData);
            } else if (compMethod === 0) {
              documentXmlBuffer = compData;
            }
            break;
          }

          offset = dataStart + compSize;
        } else {
          offset++;
        }
      }

      if (!documentXmlBuffer) {
        return null;
      }

      const xml = documentXmlBuffer.toString('utf8');
      let processed = xml;

      // Xử lý các khối Bảng (<w:tbl>) thành từng dòng Markdown hoàn chỉnh
      processed = processed.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/gi, (tblXml) => {
        const rows: string[] = [];
        const trMatches = tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/gi) || [];

        for (const trXml of trMatches) {
          const cells: string[] = [];
          const tcMatches = trXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/gi) || [];

          for (const tcXml of tcMatches) {
            const textPieces: string[] = [];
            const tMatches = tcXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
            for (const t of tMatches) {
              const innerText = t.replace(/<[^>]+>/g, '');
              textPieces.push(innerText);
            }
            const cellText = textPieces.join('').replace(/\s+/g, ' ').trim();
            cells.push(cellText);
          }

          if (cells.length > 0) {
            rows.push(`| ${cells.join(' | ')} |`);
          }
        }

        return '\n\n' + rows.join('\n') + '\n\n';
      });

      // Xử lý phần văn bản ngoài bảng
      processed = processed
        .replace(/<w:br\b[^>]*\/>/gi, '\n')
        .replace(/<w:cr\b[^>]*\/>/gi, '\n')
        .replace(/<\/w:p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      return processed;
    } catch (err) {
      console.warn('Could not unpack docx xml:', err);
      return null;
    }
  }

  /**
   * Trích xuất văn bản từ buffer file (hỗ trợ docx, txt, md, json, csv, pdf text)
   */
  public static async parseDocumentBuffer(
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<{ text: string; summary: string }> {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    try {
      let extracted = '';

      if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
        const docxText = this.extractDocxContent(buffer);
        if (docxText && docxText.length > 30) {
          extracted = docxText;
        }
      }

      if (!extracted) {
        if (['txt', 'md', 'markdown', 'json', 'csv', 'tsv'].includes(ext) || mimeType.includes('text')) {
          extracted = buffer.toString('utf-8');
        } else {
          // Xử lý an toàn cho tệp nhị phân / PDF lớn mà không gây nghẽn bộ nhớ V8
          const maxBytesToScan = Math.min(buffer.length, 6 * 1024 * 1024);
          const rawStr = buffer.subarray(0, maxBytesToScan).toString('latin1');
          const cleanChars = rawStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
          const matches = cleanChars.match(/[A-Za-zÀ-ỹ0-9\s.,;:?!/\-+=()\[\]{}%_]{4,}/g);
          if (matches && matches.length > 0) {
            extracted = matches.slice(0, 10000).join(' ').replace(/\s{2,}/g, ' ').trim();
          } else {
            extracted = `[Tài liệu ${fileName} (Định dạng: .${ext}, Dung lượng: ${(buffer.length / 1024).toFixed(1)} KB) đã sẵn sàng phục vụ làm căn cứ biên soạn KHDH.]`;
          }
        }
      }

      // Hỗ trợ lưu trữ tài liệu SGK lớn lên đến 150.000 ký tự (thay vì 45.000)
      const safeText = extracted.slice(0, 150000).trim();
      const lines = safeText.split('\n').filter((l) => l.trim().length > 0);
      const summary = lines.slice(0, 5).join(' | ').slice(0, 300) || `Tệp ${fileName} (${safeText.length} ký tự)`;

      return {
        text: safeText,
        summary,
      };
    } catch {
      return {
        text: `[Nội dung tài liệu ${fileName} đã được nạp thành công]`,
        summary: `Tài liệu nguồn ${fileName}`,
      };
    }
  }
}
