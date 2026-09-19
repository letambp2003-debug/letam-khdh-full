import fs from 'fs';
import path from 'path';
import { GeminiService } from '@/services/ai/gemini.service';
import { SourceDocumentService } from '@/services/documents/source-document.service';
import { SourceContextBuilder } from '@/services/documents/source-context-builder';
import { SourceDocument } from '@/types/source-document';
import {
  CatalogLessonItem,
  CurriculumCatalog,
  ExtractCatalogRequest,
} from '@/types/curriculum-catalog.types';

export class CatalogExtractorService {
  private static readonly STORAGE_DIR = path.join(process.cwd(), 'data', 'catalogs');

  private static ensureStorageDir(): void {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  private static getCatalogFilePath(projectId: string): string {
    this.ensureStorageDir();
    const cleanId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.STORAGE_DIR, `${cleanId}.json`);
  }

  /**
   * Quét và trích xuất TÊN MÔN HỌC trực tiếp từ văn bản trong tệp tải lên
   */
  public static extractSubjectFromDocContent(text: string, fileName = ''): string {
    const combined = `${fileName} ${text}`.slice(0, 10000);

    // Bắt các mẫu "Môn học: ...", "Môn: ...", "KẾ HOẠCH DẠY HỌC MÔN: ..."
    const subjectMatch = combined.match(/(?:môn\s*học|môn|bộ\s*môn|kế\s*hoạch\s*dạy\s*học\s*môn)\s*[:–\-]\s*([A-Za-zÀ-ỹ\s&]+?)(?:\n|\r|–|\-|,|\(|lớp|khối|$)/i);
    if (subjectMatch && subjectMatch[1]) {
      const sub = subjectMatch[1].trim();
      if (sub.length >= 2 && sub.length <= 40 && !/^(học|dạy|của|cho|thcs|thpt)$/i.test(sub)) {
        return sub;
      }
    }

    const lower = combined.toLowerCase();
    if (/\b(lịch\s*sử\s*và\s*địa\s*l[íy]|ls\s*&?\s*đl)\b/i.test(lower)) return 'Lịch sử và Địa lí';
    if (/\b(lịch\s*sử|lich\s*su|sử\s*[6789])\b/i.test(lower)) return 'Lịch sử';
    if (/\b(địa\s*l[íy]|dia\s*li|địa\s*[6789])\b/i.test(lower)) return 'Địa lí';
    if (/\b(ngữ\s*văn|ngu\s*van|văn\s*[6789])\b/i.test(lower)) return 'Ngữ văn';
    if (/\b(khoa\s*học\s*tự\s*nhiên|khtn)\b/i.test(lower)) return 'Khoa học tự nhiên';
    if (/\b(vật\s*l[íy]|vat\s*ly)\b/i.test(lower)) return 'Vật lí';
    if (/\b(hóa\s*học|hoa\s*hoc)\b/i.test(lower)) return 'Hóa học';
    if (/\b(sinh\s*học|sinh\s*hoc)\b/i.test(lower)) return 'Sinh học';
    if (/\b(tin\s*học|tin\s*hoc|informatics)\b/i.test(lower)) return 'Tin học';
    if (/\b(tiếng\s*anh|english)\b/i.test(lower)) return 'Tiếng Anh';
    if (/\b(giáo\s*dục\s*công\s*dân|gdcd)\b/i.test(lower)) return 'Giáo dục công dân';
    if (/\b(công\s*nghệ|cong\s*nghe)\b/i.test(lower)) return 'Công nghệ';
    if (/\b(hoạt\s*động\s*trải\s*nghiệm|hdtn)\b/i.test(lower)) return 'Hoạt động trải nghiệm';
    if (/\b(toán|toan|đại\s*số|hình\s*học)\b/i.test(lower)) return 'Toán học';

    return 'Tài liệu nguồn';
  }

  /**
   * Quét và trích xuất KHỐI LỚP trực tiếp từ văn bản trong tệp tải lên
   */
  public static extractGradeFromDocContent(text: string, fileName = ''): string {
    const combined = `${fileName} ${text}`.slice(0, 8000);
    const gradeMatch = combined.match(/(?:lớp|khối|grade|k)\s*[:–\-\s]?\s*([6-9]|1[0-2])/i);
    if (gradeMatch && gradeMatch[1]) {
      return `Lớp ${gradeMatch[1]}`;
    }
    if (/\b(-9-|_9_|k9|lop9|lớp9)\b/i.test(combined)) return 'Lớp 9';
    if (/\b(-8-|_8_|k8|lop8|lớp8)\b/i.test(combined)) return 'Lớp 8';
    if (/\b(-7-|_7_|k7|lop7|lớp7)\b/i.test(combined)) return 'Lớp 7';
    if (/\b(-6-|_6_|k6|lop6|lớp6)\b/i.test(combined)) return 'Lớp 6';
    return 'Lớp 9';
  }

  public static getSubjectCodePrefix(subject: string): string {
    const s = (subject || '').toLowerCase();
    if (s.includes('sử')) return 'SU';
    if (s.includes('địa')) return 'DIA';
    if (s.includes('văn')) return 'VAN';
    if (s.includes('tự nhiên') || s.includes('khtn')) return 'KHTN';
    if (s.includes('tin')) return 'TIN';
    if (s.includes('anh')) return 'ENG';
    if (s.includes('công dân') || s.includes('gdcd')) return 'GDCD';
    if (s.includes('công nghệ')) return 'CN';
    if (s.includes('toán')) return 'TOAN';
    return 'MH';
  }

  /**
   * BỘ QUÉT BẢNG THUẦN DỮ LIỆU NGUỒN (Pure Content Table Parser)
   * Quét trực tiếp 100% tất cả các hàng bài học từ tệp PL1 / PPCT nạp lên mà không áp đặt môn học
   */
    public static parseLessonsFromSourceTables(docs: SourceDocument[]): {
    lessons: CatalogLessonItem[];
    detectedSubject: string;
    detectedGrade: string;
    detectedSchoolYear: string;
  } {
    const pl1Docs = docs.filter((d) => d.documentType === 'PL1' || d.documentType === 'PPCT' || d.isActive);
    const lessons: CatalogLessonItem[] = [];
    let currentPpct = 1;
    let detectedSubject = '';
    let detectedGrade = '';
    let detectedSchoolYear = '2026-2027';

    let currentChapter = 'Nội dung chương trình';
    let currentStrand = 'Mạch kiến thức cốt lõi';

    for (const doc of pl1Docs) {
      const text = doc.extractedText || '';
      if (!detectedSubject || detectedSubject === 'Tài liệu nguồn') {
        detectedSubject = this.extractSubjectFromDocContent(text, doc.displayName);
      }
      if (!detectedGrade) {
        detectedGrade = this.extractGradeFromDocContent(text, doc.displayName);
      }

      const yearMatch = text.match(/năm\s*học\s*[:–\-\s]?\s*([0-9]{4}\s*[-–]\s*[0-9]{4})/i);
      if (yearMatch && yearMatch[1]) {
        detectedSchoolYear = yearMatch[1].replace(/\s+/g, '');
      }

      const lines = text.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Bắt tên Chương / Chủ đề / Phần / Mạch nếu xuất hiện dòng tiêu đề
        if (
          line.toLowerCase().includes('chương') ||
          line.toLowerCase().includes('chủ đề') ||
          line.toLowerCase().includes('phần') ||
          line.toLowerCase().includes('mạch kiến thức')
        ) {
          const cleanLine = line.replace(/^[|#*\s-]+|[|#*\s-]+$/g, '').trim();
          if (cleanLine.length > 3 && cleanLine.length < 100 && !/^\d+$/.test(cleanLine)) {
            currentChapter = cleanLine;
            currentStrand = cleanLine.split(/[:–\-]/)[0].trim();
          }
        }

        // 1. Quét các hàng bảng Markdown (chứa dấu phân cách |)
        if (line.includes('|')) {
          const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

          if (cells.length >= 2) {
            const firstCell = cells[0];
            const sttMatch = firstCell.match(/^(\d+)$/);
            if (sttMatch) {
              const stt = parseInt(sttMatch[1]);
              const title = cells[1];

              // Bỏ qua dòng tiêu đề bảng nếu cell 1 là "Tên bài" hoặc "Tên bài dạy"
              if (
                title.toLowerCase() === 'tên bài' ||
                title.toLowerCase() === 'bài học' ||
                title.toLowerCase() === 'tên bài học' ||
                title.toLowerCase().includes('tên bài dạy') ||
                title.toLowerCase().includes('nội dung bài dạy')
              ) {
                continue;
              }

              let periods = 2;
              let ppctRange = '';
              let weekRange = '';
              const objectives: string[] = [];

              for (let i = 2; i < cells.length; i++) {
                const cell = cells[i];
                const periodMatch = cell.match(/^(\d+)(?:\s*tiết)?$/i);
                if (periodMatch && i === 2) {
                  periods = parseInt(periodMatch[1]) || 2;
                  continue;
                }

                if (
                  cell.toLowerCase().startsWith('tiết') ||
                  (!cell.toLowerCase().startsWith('tuần') && /\b\d+\s*[,-–]\s*\d+\b/.test(cell))
                ) {
                  ppctRange = cell.startsWith('Tiết') ? cell : `Tiết ${cell}`;
                } else if (cell.toLowerCase().startsWith('tuần') || (i === 4 && /^\d+$/.test(cell))) {
                  weekRange = cell.startsWith('Tuần') ? cell : `Tuần ${cell}`;
                } else if (cell.length > 8 && objectives.length === 0) {
                  objectives.push(cell);
                }
              }

              if (!ppctRange) {
                const endPpct = currentPpct + periods - 1;
                ppctRange =
                  periods === 1
                    ? `Tiết ${currentPpct}`
                    : `Tiết ${currentPpct}, ${Array.from({ length: periods - 1 }, (_, k) => currentPpct + 1 + k).join(', ')}`;
                currentPpct = endPpct + 1;
              }

              if (!weekRange) {
                weekRange = `Tuần ${Math.ceil(stt / 2)}`;
              }

              const subPrefix = this.getSubjectCodePrefix(detectedSubject || 'MH');
              const cleanGradeNum = (detectedGrade || '9').replace(/[^0-9]/g, '') || '9';
              const padStt = stt < 10 ? `0${stt}` : `${stt}`;
              const lessonCode = `${subPrefix}-${cleanGradeNum}-HKI-C01-STT${padStt}`;

              let cleanTitle = title;
              if (
                !cleanTitle.toLowerCase().startsWith('bài') &&
                !cleanTitle.toLowerCase().startsWith('chương') &&
                !cleanTitle.toLowerCase().startsWith('chủ đề')
              ) {
                cleanTitle = `Bài ${stt}: ${cleanTitle}`;
              }

              lessons.push({
                stt,
                lessonCode,
                lessonTitle: cleanTitle,
                chapter: currentChapter,
                strand: currentStrand,
                grade: detectedGrade || 'Lớp 9',
                term: 'Học kỳ I',
                totalPeriods: periods,
                ppctRange,
                weekRange,
                keyObjectives: objectives.length > 0 ? objectives : [`Bám sát YCCĐ trong Phụ lục I (${doc.displayName})`],
                sourceBasis: `${doc.documentType} (${doc.displayName})`,
                matchedSources: [doc.documentType],
              });
            }
          }
        } else {
          // 2. Quét dòng văn bản danh sách có định dạng (Bài X: ... hoặc STT. ...)
          const textLineMatch = line.match(/^(?:Bài\s*(\d+)[:.]|(\d+)[.)])\s+([^()\n]+?)(?:\s*\((\d+)\s*tiết\))?$/i);
          if (textLineMatch) {
            const stt = parseInt(textLineMatch[1] || textLineMatch[2]);
            const rawTitle = textLineMatch[3].trim();
            const periods = parseInt(textLineMatch[4]) || 2;

            if (rawTitle.length > 3 && !lessons.some((l) => l.stt === stt)) {
              const subPrefix = this.getSubjectCodePrefix(detectedSubject || 'MH');
              const cleanGradeNum = (detectedGrade || '9').replace(/[^0-9]/g, '') || '9';
              const padStt = stt < 10 ? `0${stt}` : `${stt}`;
              const lessonCode = `${subPrefix}-${cleanGradeNum}-HKI-C01-STT${padStt}`;

              const cleanTitle = rawTitle.toLowerCase().startsWith('bài') ? rawTitle : `Bài ${stt}: ${rawTitle}`;
              const endPpct = currentPpct + periods - 1;
              const ppctRange = periods === 1 ? `Tiết ${currentPpct}` : `Tiết ${currentPpct}, ${Array.from({ length: periods - 1 }, (_, k) => currentPpct + 1 + k).join(', ')}`;
              currentPpct = endPpct + 1;

              lessons.push({
                stt,
                lessonCode,
                lessonTitle: cleanTitle,
                chapter: currentChapter,
                strand: currentStrand,
                grade: detectedGrade || 'Lớp 9',
                term: 'Học kỳ I',
                totalPeriods: periods,
                ppctRange,
                weekRange: `Tuần ${Math.ceil(stt / 2)}`,
                keyObjectives: [`Bám sát YCCĐ trong Phụ lục I (${doc.displayName})`],
                sourceBasis: `${doc.documentType} (${doc.displayName})`,
                matchedSources: [doc.documentType],
              });
            }
          }
        }
      }
    }

    return {
      lessons,
      detectedSubject: detectedSubject || 'Tài liệu nguồn',
      detectedGrade: detectedGrade || 'Lớp 9',
      detectedSchoolYear,
    };
  }

  public static async getSavedCatalog(projectId = 'usr_guest'): Promise<CurriculumCatalog | null> {
    try {
      const filePath = this.getCatalogFilePath(projectId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as CurriculumCatalog;
      }
    } catch (err) {
      console.warn('Error reading saved catalog:', err);
    }
    return null;
  }

  public static async saveCatalog(projectId: string, catalog: CurriculumCatalog): Promise<void> {
    try {
      const filePath = this.getCatalogFilePath(projectId);
      fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving catalog to disk:', err);
    }
  }

  public static async clearCatalog(projectId: string): Promise<void> {
    try {
      const filePath = this.getCatalogFilePath(projectId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error deleting catalog file:', err);
    }
  }

  /**
   * Trích xuất Danh mục bài học thuần từ tệp nguồn được nạp lên
   * TUYỆT ĐỐI KHÔNG DÙNG DỮ LIỆU TOÁN MẪU KHI ĐÃ CÓ TỆP NGUỒN
   */
  public static async extractCatalog(req: ExtractCatalogRequest): Promise<{
    catalog: CurriculumCatalog;
    markdownSummary: string;
    keyUsed?: string;
    isCached?: boolean;
  }> {
    const targetProject = req.projectId || 'usr_guest';

    // 1. Lấy danh sách tài liệu nguồn sẵn sàng
    let activeDocs = await SourceDocumentService.getActiveReady(targetProject);
    console.log(`[CATALOG] Project=${targetProject}, ActiveDocs=${activeDocs.length}, RequestDocIds=${JSON.stringify(req.documentIds || 'none')}`);
    for (const d of activeDocs) {
      console.log(`  [DOC] id=${d.id} type=${d.documentType} name="${d.displayName}" textLen=${(d.extractedText || '').length}`);
    }
    // CHỈ lọc theo documentIds nếu client gửi danh sách THỰC SỰ CÓ GIÁ TRỊ
    if (req.documentIds && Array.isArray(req.documentIds) && req.documentIds.length > 0) {
      activeDocs = activeDocs.filter((d) => req.documentIds?.includes(d.id));
      console.log(`  [FILTER] After filtering by documentIds: ${activeDocs.length} docs remain`);
    }
    // Nếu documentIds rỗng hoặc không gửi → dùng TẤT CẢ active docs của project

    // 2. Bóc tách dữ liệu bảng từ tệp tải lên
    const { lessons: tableLessons, detectedSubject, detectedGrade, detectedSchoolYear } =
      this.parseLessonsFromSourceTables(activeDocs);
    console.log(`  [PARSE] TableLessons=${tableLessons.length}, Subject="${detectedSubject}", Grade="${detectedGrade}"`);

    const subjectName = req.subject && req.subject !== 'Tài liệu nguồn' ? req.subject : detectedSubject;
    const gradeName = req.grade || detectedGrade;

    const hasPL1 = activeDocs.some((d) => d.documentType === 'PL1');
    const hasPPCT = activeDocs.some((d) => d.documentType === 'PPCT');
    const hasSGK = activeDocs.some((d) => d.documentType === 'SGK');
    const hasKhdhOld = activeDocs.some((d) => d.documentType === 'KHDH_OLD');
    const hasOther = activeDocs.some((d) => d.documentType === 'OTHER');
    const sourceDocNames = activeDocs.map((d) => `[${d.documentType}] ${d.displayName}`);

    // NẾU TỆP NGUỒN CÓ BẢNG: Ưu tiên trả về 100% dữ liệu thực tế từ tệp nguồn ngay lập tức
    if (tableLessons.length > 0) {
      const realCatalog: CurriculumCatalog = {
        subject: subjectName,
        grade: gradeName,
        schoolYear: detectedSchoolYear,
        sourceSummary: `Trích xuất 100% từ tệp nguồn: ${sourceDocNames.join(', ')}`,
        totalLessons: tableLessons.length,
        totalPeriods: tableLessons.reduce((acc, cur) => acc + cur.totalPeriods, 0),
        sourcesUsed: {
          hasPL1,
          hasPPCT,
          hasSGK,
          hasKhdhOld,
          hasOther,
          docCount: activeDocs.length,
          docNames: sourceDocNames,
        },
        extractedAt: new Date().toISOString(),
        lessons: tableLessons,
      };

      await this.saveCatalog(targetProject, realCatalog);
      const markdown = this.renderCatalogToMarkdown(realCatalog);
      return {
        catalog: realCatalog,
        markdownSummary: markdown,
        isCached: false,
      };
    }

    // NẾU CÓ TÀI LIỆU NGUỒN NHƯNG DÙNG AI ĐỂ BÓC TÁCH:
    if (activeDocs.length > 0) {
      const keyPool = GeminiService.resolveKeyPool(undefined, req.apiKeys);
      const { systemContext: sourceContextText } = SourceContextBuilder.buildPromptContext(activeDocs);
      const subPrefix = this.getSubjectCodePrefix(subjectName);

      const systemPrompt = [
        'Bạn là Chuyên gia Quản lý Chương trình GDPT 2018.',
        'Nhiệm vụ: Đọc kỹ văn bản và các bảng trong tài liệu nguồn để TRÍCH XUẤT 100% DANH MỤC BÀI HỌC CÓ TRONG TỆP.',
        'QUY TẮC CỐT LÕI: ĐỌC ĐÚNG NỘI DUNG TỪ TỆP NGUỒN ĐÃ TẢI LÊN. KHÔNG TỰ BỊA DỮ LIỆU MÔN HỌC KHÁC.',
        '',
        sourceContextText,
        '',
        '## YÊU CẦU ĐẦU RA JSON:',
        '{',
        '  "subject": "' + subjectName + '",',
        '  "grade": "' + gradeName + '",',
        '  "schoolYear": "' + detectedSchoolYear + '",',
        '  "sourceSummary": "Trích xuất từ: ' + sourceDocNames.join(', ') + '",',
        '  "totalLessons": 10,',
        '  "totalPeriods": 30,',
        '  "lessons": [',
        '    {',
        '      "stt": 1,',
        '      "lessonCode": "' + subPrefix + '-01",',
        '      "lessonTitle": "Tên bài học chuẩn từ tệp",',
        '      "chapter": "Chương/Chủ đề từ tệp",',
        '      "strand": "Mạch kiến thức",',
        '      "grade": "' + gradeName + '",',
        '      "term": "Học kỳ I",',
        '      "totalPeriods": 2,',
        '      "ppctRange": "Tiết 1, 2",',
        '      "weekRange": "Tuần 1",',
        '      "keyObjectives": ["Yêu cầu cần đạt từ tệp"],',
        '      "sourceBasis": "Tệp nguồn",',
        '      "matchedSources": ["PL1"]',
        '    }',
        '  ]',
        '}',
      ].join('\n');

      try {
        if (keyPool.length > 0) {
          const response = await GeminiService.generateContent({
            systemPrompt,
            userMessage: 'Hãy trích xuất chính xác toàn bộ danh mục bài học từ tệp tài liệu nguồn đã nạp.',
            temperature: 0.1,
            apiKeys: keyPool,
          });

          let cleanJson = response.text.trim();
          if (cleanJson.includes('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
          } else if (cleanJson.includes('```')) {
            cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
          }

          const parsed = JSON.parse(cleanJson) as CurriculumCatalog;
          if (parsed && Array.isArray(parsed.lessons) && parsed.lessons.length > 0) {
            parsed.subject = parsed.subject || subjectName;
            parsed.grade = parsed.grade || gradeName;
            parsed.sourcesUsed = {
              hasPL1,
              hasPPCT,
              hasSGK,
              hasKhdhOld,
              hasOther,
              docCount: activeDocs.length,
              docNames: sourceDocNames,
            };
            parsed.extractedAt = new Date().toISOString();

            await this.saveCatalog(targetProject, parsed);
            const markdown = this.renderCatalogToMarkdown(parsed);
            return {
              catalog: parsed,
              markdownSummary: markdown,
              keyUsed: response.keyUsed,
              isCached: false,
            };
          }
        }
      } catch (err) {
        console.warn('AI Catalog extraction error:', err);
      }
    }

    // TRƯỜNG HỢP CHƯA CÓ TỆP NGUỒN NÀO ĐƯỢC TẢI LÊN
    const emptyCatalog: CurriculumCatalog = {
      subject: 'Chưa xác định',
      grade: 'Chưa xác định',
      schoolYear: '2026-2027',
      sourceSummary: 'Chưa có tài liệu nguồn nào được tải lên.',
      totalLessons: 0,
      totalPeriods: 0,
      sourcesUsed: {
        hasPL1: false,
        hasPPCT: false,
        hasSGK: false,
        hasKhdhOld: false,
        hasOther: false,
        docCount: 0,
        docNames: [],
      },
      extractedAt: new Date().toISOString(),
      lessons: [],
    };

    const emptyMarkdown = `# 📑 DANH MỤC BÀI HỌC
> ⚠️ **Chưa có tài liệu nguồn:** Vui lòng nạp tệp **Phụ lục I (PL1)** hoặc **PPCT** của Thầy/Cô ở khu vực phía trên, sau đó bấm nút **"📑 Trích xuất Danh mục"** để hệ thống quét và lập bảng bài học thực tế.`;

    return {
      catalog: emptyCatalog,
      markdownSummary: emptyMarkdown,
      isCached: false,
    };
  }

  public static renderCatalogToMarkdown(catalog: CurriculumCatalog): string {
    if (!catalog.lessons || catalog.lessons.length === 0) {
      return `# 📑 DANH MỤC BÀI HỌC
> ⚠️ **Chưa có dữ liệu:** Vui lòng tải lên tệp Phụ lục I hoặc PPCT và bấm nút **"📑 Trích xuất Danh mục"**.`;
    }

    const lines: string[] = [];
    lines.push(`# 📑 DANH MỤC BÀI HỌC & PHÂN PHỐI CHƯƠNG TRÌNH`);
    lines.push(`**Môn học:** ${catalog.subject} | **Khối lớp:** ${catalog.grade} | **Năm học:** ${catalog.schoolYear || '2026-2027'}`);
    lines.push(`**Tổng số bài học:** ${catalog.totalLessons} bài | **Tổng thời lượng:** ${catalog.totalPeriods} tiết`);
    lines.push(`> *Căn cứ tài liệu nguồn:* ${catalog.sourceSummary}`);
    lines.push('');
    lines.push('| STT | Mã bài học | Tên bài học / Chủ đề | Chương / Mạch kiến thức | Số tiết (Cột 3) | Tiết PPCT (Cột 4) | Tuần | Căn cứ nguồn |');
    lines.push('|:---:|:---|:---|:---|:---:|:---:|:---:|:---|');

    catalog.lessons.forEach((l, idx) => {
      const stt = l.stt || idx + 1;
      const code = `\`${l.lessonCode}\``;
      const title = `**${l.lessonTitle}**`;
      const chapter = `${l.strand ? `[${l.strand}] ` : ''}${l.chapter || ''}`;
      const periods = `**${l.totalPeriods}**`;
      const ppct = l.ppctRange || `Tiết ${stt}`;
      const week = l.weekRange || `Tuần ${Math.ceil(stt / 2)}`;
      const basis = l.sourceBasis || 'PL1/PPCT';

      lines.push(`| ${stt} | ${code} | ${title} | ${chapter} | ${periods} | ${ppct} | ${week} | ${basis} |`);
    });

    return lines.join('\n');
  }
}
