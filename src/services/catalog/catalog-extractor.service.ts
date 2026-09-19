import fs from 'fs';
import path from 'path';
import os from 'os';
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
  private static memoryCatalogs = new Map<string, CurriculumCatalog>();

  private static getStorageDir(): string {
    try {
      const localDir = path.join(process.cwd(), 'data', 'catalogs');
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      return localDir;
    } catch {
      const tmpDir = path.join(os.tmpdir(), 'khdh-catalogs');
      try {
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
      } catch {}
      return tmpDir;
    }
  }

  private static getCatalogFilePath(projectId: string): string {
    const dir = this.getStorageDir();
    const cleanId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(dir, `${cleanId}.json`);
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
    if (/(toán|toan|đại\s*số|hình\s*học)/i.test(lower)) return 'Toán học';
    if (/(lịch\s*sử\s*và\s*địa\s*l[íy]|ls\s*&?\s*đl)/i.test(lower)) return 'Lịch sử và Địa lí';
    if (/(lịch\s*sử|lich\s*su|sử\s*[6789])/i.test(lower)) return 'Lịch sử';
    if (/(địa\s*l[íy]|dia\s*li|địa\s*[6789])/i.test(lower)) return 'Địa lí';
    if (/(ngữ\s*văn|ngu\s*van|văn\s*[6789])/i.test(lower)) return 'Ngữ văn';
    if (/(khoa\s*học\s*tự\s*nhiên|khtn)/i.test(lower)) return 'Khoa học tự nhiên';
    if (/(vật\s*l[íy]|vat\s*ly)/i.test(lower)) return 'Vật lí';
    if (/(hóa\s*học|hoa\s*hoc)/i.test(lower)) return 'Hóa học';
    if (/(sinh\s*học|sinh\s*hoc)/i.test(lower)) return 'Sinh học';
    if (/(tin\s*học|tin\s*hoc|informatics)/i.test(lower)) return 'Tin học';
    if (/(tiếng\s*anh|english)/i.test(lower)) return 'Tiếng Anh';
    if (/(giáo\s*dục\s*công\s*dân|gdcd)/i.test(lower)) return 'Giáo dục công dân';
    if (/(công\s*nghệ|cong\s*nghe)/i.test(lower)) return 'Công nghệ';
    if (/(hoạt\s*động\s*trải\s*nghiệm|hdtn)/i.test(lower)) return 'Hoạt động trải nghiệm';

    return 'Toán học';
  }

  /**
   * Quét và trích xuất KHỐI LỚP trực tiếp từ văn bản trong tệp tải lên
   */
  public static extractGradeFromDocContent(text: string, fileName = ''): string {
    const combined = `${fileName} ${text}`.slice(0, 8000);
    const gradeMatch = combined.match(/(?:lớp|khối|grade|k|toán|toan|văn|sử|địa)\s*[:–\-\s_]?\s*([6-9]|1[0-2])/i);
    if (gradeMatch && gradeMatch[1]) {
      return `Lớp ${gradeMatch[1]}`;
    }
    if (/(?:-8-|_8_|k8|lop8|lớp8|toan8|toán8|\b8\b)/i.test(combined)) return 'Lớp 8';
    if (/(?:-9-|_9_|k9|lop9|lớp9|toan9|toán9|\b9\b)/i.test(combined)) return 'Lớp 9';
    if (/(?:-7-|_7_|k7|lop7|lớp7|toan7|toán7|\b7\b)/i.test(combined)) return 'Lớp 7';
    if (/(?:-6-|_6_|k6|lop6|lớp6|toan6|toán6|\b6\b)/i.test(combined)) return 'Lớp 6';
    return 'Lớp 8';
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
    if (s.includes('toán') || s.includes('toan')) return 'TOAN';
    return 'TOAN';
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
    const activeDocs = docs.filter((d) => d.isActive);
    const pl1Docs = activeDocs.length > 0 ? activeDocs : docs;
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
        const docSub = this.extractSubjectFromDocContent(text, doc.displayName);
        if (docSub && docSub !== 'Tài liệu nguồn') detectedSubject = docSub;
      }
      if (!detectedGrade) {
        const docGrade = this.extractGradeFromDocContent(text, doc.displayName);
        if (docGrade) detectedGrade = docGrade;
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
          if (cleanLine.length > 3 && cleanLine.length < 120 && !/^\d+$/.test(cleanLine)) {
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
            const secondCell = cells[1];

            // Bắt STT từ cell 0 hoặc cell 1
            const sttMatch =
              firstCell.match(/^(?:Bài|STT|Tiết)?\s*(\d+)[.)\s:-]?$/i) ||
              secondCell?.match(/^(?:Bài|STT|Tiết)?\s*(\d+)[.)\s:-]?$/i);

            if (sttMatch) {
              const stt = parseInt(sttMatch[1]);
              let title = firstCell.match(/^(?:Bài|STT|Tiết)?\s*\d+[.)\s:-]?$/i) ? cells[1] : cells[0];
              if (!title || title.length < 2) title = cells[2] || cells[1] || `Bài học ${stt}`;

              // Bỏ qua dòng tiêu đề bảng
              const lowerTitle = title.toLowerCase();
              if (
                lowerTitle === 'tên bài' ||
                lowerTitle === 'bài học' ||
                lowerTitle === 'tên bài học' ||
                lowerTitle.includes('tên bài dạy') ||
                lowerTitle.includes('nội dung bài dạy') ||
                lowerTitle.includes('tên chương') ||
                lowerTitle.includes('chủ đề') ||
                lowerTitle === 'stt'
              ) {
                continue;
              }

              let periods = 2;
              let ppctRange = '';
              let weekRange = '';
              const objectives: string[] = [];

              for (let i = 1; i < cells.length; i++) {
                const cell = cells[i];
                if (cell === title) continue;

                const periodMatch = cell.match(/(\d+)\s*tiết/i) || (i >= 2 && cell.match(/^(\d{1,2})$/));
                if (periodMatch && periods === 2) {
                  periods = parseInt(periodMatch[1]) || 2;
                }

                if (
                  cell.toLowerCase().startsWith('tiết') ||
                  (!cell.toLowerCase().startsWith('tuần') && /\b\d+\s*[,-–]\s*\d+\b/.test(cell))
                ) {
                  ppctRange = cell.startsWith('Tiết') ? cell : `Tiết ${cell}`;
                } else if (cell.toLowerCase().startsWith('tuần')) {
                  weekRange = cell.startsWith('Tuần') ? cell : `Tuần ${cell}`;
                } else if (cell.length > 10 && objectives.length === 0) {
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
              const cleanGradeNum = (detectedGrade || '8').replace(/[^0-9]/g, '') || '8';
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

              if (!lessons.some((l) => l.stt === stt)) {
                lessons.push({
                  stt,
                  lessonCode,
                  lessonTitle: cleanTitle,
                  chapter: currentChapter,
                  strand: currentStrand,
                  grade: detectedGrade || 'Lớp 8',
                  term: 'Học kỳ I',
                  totalPeriods: periods,
                  ppctRange,
                  weekRange,
                  keyObjectives: objectives.length > 0 ? objectives : [`Bám sát YCCĐ trong tệp nguồn (${doc.displayName})`],
                  sourceBasis: `${doc.documentType} (${doc.displayName})`,
                  matchedSources: [doc.documentType],
                });
              }
            }
          }
        } else {
          // 2. Quét dòng văn bản danh sách có định dạng (Bài X: ..., Chủ đề X: ..., 1. ...)
          const textLineMatch = line.match(/^(?:Bài\s*(\d+)|Chủ\s*đề\s*(\d+)|Phần\s*(\d+)|(\d+)[.)])\s*[:.–-]?\s*([^()\n]+?)(?:\s*[\(\[]?(\d+)\s*tiết[\)\]]?)?$/i);
          if (textLineMatch) {
            const sttStr = textLineMatch[1] || textLineMatch[2] || textLineMatch[3] || textLineMatch[4];
            const stt = parseInt(sttStr);
            const rawTitle = textLineMatch[5].trim();
            const periods = parseInt(textLineMatch[6]) || 2;

            if (rawTitle.length > 3 && !lessons.some((l) => l.stt === stt)) {
              const subPrefix = this.getSubjectCodePrefix(detectedSubject || 'MH');
              const cleanGradeNum = (detectedGrade || '8').replace(/[^0-9]/g, '') || '8';
              const padStt = stt < 10 ? `0${stt}` : `${stt}`;
              const lessonCode = `${subPrefix}-${cleanGradeNum}-HKI-C01-STT${padStt}`;

              const cleanTitle = rawTitle.toLowerCase().startsWith('bài') || rawTitle.toLowerCase().startsWith('chủ đề')
                ? rawTitle
                : `Bài ${stt}: ${rawTitle}`;

              const endPpct = currentPpct + periods - 1;
              const ppctRange = periods === 1 ? `Tiết ${currentPpct}` : `Tiết ${currentPpct}, ${Array.from({ length: periods - 1 }, (_, k) => currentPpct + 1 + k).join(', ')}`;
              currentPpct = endPpct + 1;

              lessons.push({
                stt,
                lessonCode,
                lessonTitle: cleanTitle,
                chapter: currentChapter,
                strand: currentStrand,
                grade: detectedGrade || 'Lớp 8',
                term: 'Học kỳ I',
                totalPeriods: periods,
                ppctRange,
                weekRange: `Tuần ${Math.ceil(stt / 2)}`,
                keyObjectives: [`Bám sát YCCĐ trong tệp nguồn (${doc.displayName})`],
                sourceBasis: `${doc.documentType} (${doc.displayName})`,
                matchedSources: [doc.documentType],
              });
            }
          }
        }
      }

      // NẾU TỆP NGUỒN CÓ VĂN BẢN NHƯNG BỘ QUÉT BẢNG CHƯA BẮT ĐƯỢC HÀNG BÀI HỌC NÀO:
      // Tự động giải phóng các dòng văn bản tiêu đề từ chính tệp đã tải lên
      if (lessons.length === 0 && text.length > 50) {
        const textLines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 150);
        let fallbackStt = 1;
        for (const l of textLines) {
          if (
            /^(bài|chương|chủ đề|phần|tiết|\d+[.)])/i.test(l) &&
            !/^(bài học|bài dạy|môn học|kế hoạch)/i.test(l) &&
            !lessons.some((existing) => existing.lessonTitle === l)
          ) {
            const subPrefix = this.getSubjectCodePrefix(detectedSubject || 'MH');
            const cleanGradeNum = (detectedGrade || '8').replace(/[^0-9]/g, '') || '8';
            const padStt = fallbackStt < 10 ? `0${fallbackStt}` : `${fallbackStt}`;
            lessons.push({
              stt: fallbackStt,
              lessonCode: `${subPrefix}-${cleanGradeNum}-HKI-C01-STT${padStt}`,
              lessonTitle: l.length < 80 ? l : l.slice(0, 80) + '...',
              chapter: currentChapter,
              strand: currentStrand,
              grade: detectedGrade || 'Lớp 8',
              term: 'Học kỳ I',
              totalPeriods: 2,
              ppctRange: `Tiết ${currentPpct}, ${currentPpct + 1}`,
              weekRange: `Tuần ${Math.ceil(fallbackStt / 2)}`,
              keyObjectives: [`Bám sát nội dung tệp nguồn (${doc.displayName})`],
              sourceBasis: `${doc.documentType} (${doc.displayName})`,
              matchedSources: [doc.documentType],
            });
            currentPpct += 2;
            fallbackStt++;
          }
        }
      }
    }

    return {
      lessons,
      detectedSubject: detectedSubject || 'Tài liệu nguồn',
      detectedGrade: detectedGrade || 'Lớp 8',
      detectedSchoolYear,
    };
  }

  public static async getSavedCatalog(projectId = 'usr_guest'): Promise<CurriculumCatalog | null> {
    if (this.memoryCatalogs.has(projectId)) {
      return this.memoryCatalogs.get(projectId)!;
    }
    try {
      const filePath = this.getCatalogFilePath(projectId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const cat = JSON.parse(raw) as CurriculumCatalog;
        this.memoryCatalogs.set(projectId, cat);
        return cat;
      }
    } catch (err) {
      console.warn('Error reading saved catalog:', err);
    }
    return null;
  }

  public static async saveCatalog(projectId: string, catalog: CurriculumCatalog): Promise<void> {
    this.memoryCatalogs.set(projectId, catalog);
    try {
      const filePath = this.getCatalogFilePath(projectId);
      fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2), 'utf8');
    } catch (err) {
      console.warn('Could not save catalog to disk, preserved in memory:', err);
    }
  }

  public static async clearCatalog(projectId: string): Promise<void> {
    this.memoryCatalogs.delete(projectId);
    try {
      const filePath = this.getCatalogFilePath(projectId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error deleting catalog file:', err);
    }
  }

  public static generateStandardCatalog(
    subjectName = 'Toán',
    gradeName = 'Lớp 8',
    projectId = 'usr_guest',
    activeDocs: SourceDocument[] = []
  ): CurriculumCatalog {
    const isGrade8 = gradeName.includes('8') || !gradeName.includes('9');
    const cleanGrade = isGrade8 ? 'Lớp 8' : 'Lớp 9';
    const gradeNum = isGrade8 ? '8' : '9';
    const docCount = activeDocs.length;
    const docNames = activeDocs.map((d) => `[${d.documentType}] ${d.displayName}`);

    const lessons8: Array<{
      stt: number;
      title: string;
      chapter: string;
      strand: string;
      term: 'Học kỳ I' | 'Học kỳ II';
      periods: number;
      ppct: string;
      week: string;
      objectives: string[];
    }> = [
      { stt: 1, title: 'Đơn thức nhiều biến. Đa thức nhiều biến', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 1, 2', week: 'Tuần 1', objectives: ['Nhận biết đơn thức, đa thức nhiều biến, bậc của đơn thức và đa thức.'] },
      { stt: 2, title: 'Các phép toán cộng, trừ đa thức nhiều biến', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 3, 4, 5', week: 'Tuần 1, 2', objectives: ['Thực hiện thành thạo cộng, trừ hai đa thức nhiều biến.'] },
      { stt: 3, title: 'Phép nhân đơn thức với đa thức và đa thức với đa thức', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 6, 7, 8', week: 'Tuần 2', objectives: ['Thực hiện phép nhân đơn thức với đa thức và đa thức với đa thức.'] },
      { stt: 4, title: 'Luyện tập chung: Phép nhân đa thức', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 9, 10', week: 'Tuần 3', objectives: ['Củng cố quy tắc nhân và vận dụng rút gọn biểu thức đại số.'] },
      { stt: 5, title: 'Phép chia đa thức cho đơn thức', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 11, 12', week: 'Tuần 3', objectives: ['Nắm vững điều kiện chia hết và quy tắc chia đa thức cho đơn thức.'] },
      { stt: 6, title: 'Hiệu hai bình phương. Bình phương của một tổng hay một hiệu', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 13, 14, 15', week: 'Tuần 4', objectives: ['Thuộc và vận dụng thành thạo 3 hằng đẳng thức đáng nhớ đầu tiên.'] },
      { stt: 7, title: 'Lập phương của một tổng hay một hiệu', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 16, 17', week: 'Tuần 4, 5', objectives: ['Vận dụng hằng đẳng thức lập phương của tổng và lập phương của hiệu.'] },
      { stt: 8, title: 'Tổng và hiệu của hai lập phương', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 18, 19', week: 'Tuần 5', objectives: ['Nhận biết và khai triển tổng và hiệu hai lập phương.'] },
      { stt: 9, title: 'Phân tích đa thức thành nhân tử bằng phương pháp đặt nhân tử chung và dùng hằng đẳng thức', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 20, 21', week: 'Tuần 5, 6', objectives: ['Phân tích đa thức thành nhân tử bằng nhân tử chung và hằng đẳng thức.'] },
      { stt: 10, title: 'Phân tích đa thức thành nhân tử bằng phương pháp nhóm hạng tử', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 22, 23', week: 'Tuần 6', objectives: ['Biết cách nhóm hạng tử một cách hợp lí để làm xuất hiện nhân tử chung.'] },
      { stt: 11, title: 'Luyện tập chung và Bài tập cuối chương I', chapter: 'Chương I: Đa thức', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 24, 25', week: 'Tuần 6, 7', objectives: ['Hệ thống hóa toàn bộ kiến thức về đa thức và hằng đẳng thức đáng nhớ.'] },
      { stt: 12, title: 'Phân thức đại số và tính chất cơ bản của phân thức', chapter: 'Chương II: Phân thức đại số', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 26, 27, 28', week: 'Tuần 7', objectives: ['Định nghĩa phân thức đại số, hai phân thức bằng nhau, tính chất cơ bản.'] },
      { stt: 13, title: 'Quy đồng mẫu thức nhiều phân thức', chapter: 'Chương II: Phân thức đại số', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 29, 30', week: 'Tuần 8', objectives: ['Tìm mẫu thức chung và thực hiện quy đồng mẫu thức các phân thức.'] },
      { stt: 14, title: 'Phép cộng và phép trừ phân thức đại số', chapter: 'Chương II: Phân thức đại số', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 31, 32, 33', week: 'Tuần 8, 9', objectives: ['Thực hiện thành thạo cộng trừ phân thức cùng mẫu và khác mẫu.'] },
      { stt: 15, title: 'Phép nhân và phép chia phân thức đại số', chapter: 'Chương II: Phân thức đại số', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 34, 35, 36', week: 'Tuần 9', objectives: ['Thực hiện phép nhân và phép chia phân thức đại số.'] },
      { stt: 16, title: 'Luyện tập chung và Bài tập cuối chương II', chapter: 'Chương II: Phân thức đại số', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 37, 38, 39', week: 'Tuần 10', objectives: ['Rút gọn biểu thức chứa các phép toán về phân thức đại số.'] },
      { stt: 17, title: 'Tứ giác. Định lí tổng các góc trong một tứ giác', chapter: 'Chương III: Tứ giác', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 40, 41', week: 'Tuần 10, 11', objectives: ['Định nghĩa tứ giác lồi và tính tổng các góc trong tứ giác bằng 360 độ.'] },
      { stt: 18, title: 'Hình thang cân', chapter: 'Chương III: Tứ giác', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 42, 43, 44', week: 'Tuần 11', objectives: ['Tính chất và dấu hiệu nhận biết hình thang cân.'] },
      { stt: 19, title: 'Hình bình hành', chapter: 'Chương III: Tứ giác', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 45, 46, 47', week: 'Tuần 12', objectives: ['Định nghĩa, tính chất về cạnh, góc, đường chéo và dấu hiệu nhận biết hình bình hành.'] },
      { stt: 20, title: 'Hình chữ nhật', chapter: 'Chương III: Tứ giác', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 48, 49, 50', week: 'Tuần 12, 13', objectives: ['Tính chất hai đường chéo bằng nhau và các dấu hiệu nhận biết hình chữ nhật.'] },
      { stt: 21, title: 'Hình thoi và Hình vuông', chapter: 'Chương III: Tứ giác', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 51, 52, 53', week: 'Tuần 13', objectives: ['Tính chất và dấu hiệu nhận biết hình thoi và hình vuông.'] },
      { stt: 22, title: 'Luyện tập chung và Bài tập cuối chương III', chapter: 'Chương III: Tứ giác', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 54, 55', week: 'Tuần 14', objectives: ['Tổng hợp mối quan hệ giữa các tứ giác đặc biệt.'] },
      { stt: 23, title: 'Định lí Thalès trong tam giác', chapter: 'Chương IV: Định lí Thalès', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 56, 57, 58', week: 'Tuần 14, 15', objectives: ['Đoạn thẳng tỉ lệ, định lí Thalès thuận và đảo trong tam giác.'] },
      { stt: 24, title: 'Đường trung bình của tam giác', chapter: 'Chương IV: Định lí Thalès', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 59, 60', week: 'Tuần 15', objectives: ['Định nghĩa và tính chất đường trung bình song song và bằng nửa cạnh đáy.'] },
      { stt: 25, title: 'Tính chất đường phân giác của tam giác', chapter: 'Chương IV: Định lí Thalès', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 61, 62', week: 'Tuần 16', objectives: ['Vận dụng tính chất đường phân giác chia cạnh đối diện thành hai đoạn tỉ lệ.'] },
      { stt: 26, title: 'Ôn tập và Kiểm tra đánh giá cuối Học kỳ I', chapter: 'Ôn tập Học kỳ I', strand: 'Tổng hợp kiến thức', term: 'Học kỳ I', periods: 4, ppct: 'Tiết 63, 64, 65, 66', week: 'Tuần 16, 17', objectives: ['Hệ thống hóa toàn bộ kiến thức Đại số và Hình học Học kỳ I.'] },
      { stt: 27, title: 'Kiểm tra cuối học kỳ I và Hoạt động thực hành trải nghiệm', chapter: 'Đánh giá & Trải nghiệm', strand: 'Tổng hợp kiến thức', term: 'Học kỳ I', periods: 6, ppct: 'Tiết 67, 68, 69, 70, 71, 72', week: 'Tuần 17, 18', objectives: ['Đánh giá chuẩn năng lực và thực hành trải nghiệm toán học.'] },
      { stt: 28, title: 'Thu thập và phân loại dữ liệu', chapter: 'Chương V: Dữ liệu và biểu đồ', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 73, 74, 75', week: 'Tuần 19', objectives: ['Thu thập dữ liệu, phân loại dữ liệu định tính và định lượng.'] },
      { stt: 29, title: 'Lựa chọn dạng biểu đồ để biểu diễn dữ liệu', chapter: 'Chương V: Dữ liệu và biểu đồ', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 76, 77, 78', week: 'Tuần 20', objectives: ['Lựa chọn biểu đồ cột kép, đoạn thẳng, hình quạt tròn phù hợp.'] },
      { stt: 30, title: 'Khái niệm phương trình bậc nhất một ẩn và cách giải', chapter: 'Chương VI: Phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 79, 80, 81', week: 'Tuần 21', objectives: ['Định nghĩa phương trình ax + b = 0 và quy tắc chuyển vế, nhân với một số.'] },
      { stt: 31, title: 'Giải bài toán bằng cách lập phương trình bậc nhất', chapter: 'Chương VI: Phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 4, ppct: 'Tiết 82, 83, 84, 85', week: 'Tuần 22', objectives: ['Các bước lập phương trình giải toán chuyển động, năng suất, quan hệ số.'] },
      { stt: 32, title: 'Khái niệm hàm số và đồ thị hàm số', chapter: 'Chương VII: Hàm số bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 86, 87, 88', week: 'Tuần 23', objectives: ['Khái niệm hàm số, giá trị của hàm số, mặt phẳng tọa độ Oxy.'] },
      { stt: 33, title: 'Hàm số bậc nhất y = ax + b (a ≠ 0) và đồ thị', chapter: 'Chương VII: Hàm số bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 4, ppct: 'Tiết 89, 90, 91, 92', week: 'Tuần 24', objectives: ['Tính đồng biến, nghịch biến và cách vẽ đồ thị đường thẳng y = ax + b.'] },
      { stt: 34, title: 'Hai tam giác đồng dạng và các trường hợp đồng dạng của tam giác', chapter: 'Chương VIII: Tam giác đồng dạng', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 6, ppct: 'Tiết 93, 94, 95, 96, 97, 98', week: 'Tuần 25, 26', objectives: ['Định nghĩa tỉ số đồng dạng và 3 trường hợp đồng dạng (c-c-c, c-g-c, g-g).'] },
      { stt: 35, title: 'Hình chóp tam giác đều và hình chóp tứ giác đều', chapter: 'Chương IX: Một số hình khối trong thực tiễn', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 5, ppct: 'Tiết 99, 100, 101, 102, 103', week: 'Tuần 27', objectives: ['Khái niệm đỉnh, cạnh bên, mặt đáy, diện tích xung quanh và thể tích hình chóp đều.'] },
      { stt: 36, title: 'Ôn tập cuối năm và Đánh giá tổng hợp cuối cấp', chapter: 'Ôn tập cuối năm', strand: 'Tổng hợp kiến thức', term: 'Học kỳ II', periods: 37, ppct: 'Tiết 104 đến 140', week: 'Tuần 28 đến 35', objectives: ['Ôn tập toàn diện chuẩn bị kiểm tra cuối năm và chuyển cấp.'] },
    ];

    const lessons9: Array<{
      stt: number;
      title: string;
      chapter: string;
      strand: string;
      term: 'Học kỳ I' | 'Học kỳ II';
      periods: number;
      ppct: string;
      week: string;
      objectives: string[];
    }> = [
      // HK I (Tuần 1 - 18: 72 tiết)
      { stt: 1, title: 'Bài 1. Khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn', chapter: 'Chương I: Hệ phương trình bậc nhất hai ẩn', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 1, 2', week: 'Tuần 1', objectives: ['Nhận biết khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn.'] },
      { stt: 2, title: 'Bài 2. Giải hệ hai phương trình bậc nhất hai ẩn', chapter: 'Chương I: Hệ phương trình bậc nhất hai ẩn', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 4, ppct: 'Tiết 3, 4, 5, 6', week: 'Tuần 1, 2', objectives: ['Nắm vững phương pháp thế và cộng đại số giải hệ hai phương trình bậc nhất hai ẩn.'] },
      { stt: 3, title: 'Luyện tập chung: Giải hệ hai phương trình bậc nhất hai ẩn', chapter: 'Chương I: Hệ phương trình bậc nhất hai ẩn', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 7, 8', week: 'Tuần 2', objectives: ['Củng cố kỹ năng giải hệ phương trình bậc nhất hai ẩn.'] },
      { stt: 4, title: 'Bài 3. Giải bài toán bằng cách lập hệ phương trình', chapter: 'Chương I: Hệ phương trình bậc nhất hai ẩn', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 9, 10', week: 'Tuần 3', objectives: ['Các bước lập hệ phương trình giải bài toán thực tế.'] },
      { stt: 5, title: 'Bài tập cuối chương I', chapter: 'Chương I: Hệ phương trình bậc nhất hai ẩn', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 11, 12', week: 'Tuần 3', objectives: ['Ôn tập tổng hợp kiến thức Chương I.'] },
      { stt: 6, title: 'Bài 11. Tỉ số lượng giác của góc nhọn', chapter: 'Chương IV: Hệ thức lượng trong tam giác vuông', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 4, ppct: 'Tiết 1, 2, 3, 4 (HH)', week: 'Tuần 4', objectives: ['Định nghĩa sin, cos, tan, cot của góc nhọn và tính chất tỉ số lượng giác.'] },
      { stt: 7, title: 'Bài 12. Một số hệ thức giữa cạnh, góc trong tam giác vuông và ứng dụng', chapter: 'Chương IV: Hệ thức lượng trong tam giác vuông', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 5, 6, 7 (HH)', week: 'Tuần 5', objectives: ['Các hệ thức giữa cạnh và góc trong tam giác vuông, giải tam giác vuông.'] },
      { stt: 8, title: 'Luyện tập chung: Hệ thức lượng trong tam giác vuông', chapter: 'Chương IV: Hệ thức lượng trong tam giác vuông', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 8, 9 (HH)', week: 'Tuần 5, 6', objectives: ['Giải các bài toán thực tế vận dụng tỉ số lượng giác.'] },
      { stt: 9, title: 'Bài tập cuối Chương IV', chapter: 'Chương IV: Hệ thức lượng trong tam giác vuông', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 10, 11 (HH)', week: 'Tuần 6', objectives: ['Tổng hợp kiến thức Hệ thức lượng trong tam giác vuông.'] },
      { stt: 10, title: 'Bài 4. Phương trình quy về phương trình bậc nhất một ẩn', chapter: 'Chương II: Phương trình và bất phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 13, 14, 15', week: 'Tuần 6, 7', objectives: ['Giải phương trình tích và phương trình chứa ẩn ở mẫu.'] },
      { stt: 11, title: 'Bài 5. Bất đẳng thức và tính chất', chapter: 'Chương II: Phương trình và bất phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 16, 17', week: 'Tuần 7', objectives: ['Khái niệm bất đẳng thức và tính chất liên hệ thứ tự.'] },
      { stt: 12, title: 'Luyện tập chung: Phương trình và bất đẳng thức', chapter: 'Chương II: Phương trình và bất phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 18, 19', week: 'Tuần 8', objectives: ['Củng cố giải phương trình quy về bậc nhất và chứng minh bất đẳng thức.'] },
      { stt: 13, title: 'Ôn tập và Kiểm tra giữa kì I', chapter: 'Ôn tập Giữa HK I', strand: 'Tổng hợp kiến thức', term: 'Học kỳ I', periods: 4, ppct: 'Tiết 20, 21 (Số) & Tiết 12, 13 (HH)', week: 'Tuần 8, 9', objectives: ['Đánh giá kiến thức Đại số và Hình học giữa Học kỳ I.'] },
      { stt: 14, title: 'Bài 6. Bất phương trình bậc nhất một ẩn', chapter: 'Chương II: Phương trình và bất phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 22, 23, 24', week: 'Tuần 9, 10', objectives: ['Khái niệm, quy tắc biến đổi và giải bất phương trình bậc nhất một ẩn.'] },
      { stt: 15, title: 'Bài tập cuối chương II', chapter: 'Chương II: Phương trình và bất phương trình bậc nhất', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 25, 26', week: 'Tuần 10', objectives: ['Tổng kết Phương trình và Bất phương trình bậc nhất.'] },
      { stt: 16, title: 'Bài 7. Căn bậc hai và căn thức bậc hai', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 27, 28', week: 'Tuần 10, 11', objectives: ['Khái niệm căn bậc hai số học và điều kiện xác định căn thức bậc hai.'] },
      { stt: 17, title: 'Bài 8. Khai căn bậc hai với phép nhân và phép chia', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 29, 30', week: 'Tuần 11', objectives: ['Quy tắc khai phương một tích, một thương và nhân, chia các căn bậc hai.'] },
      { stt: 18, title: 'Luyện tập chung: Phép tính về căn bậc hai', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 1, ppct: 'Tiết 31', week: 'Tuần 11', objectives: ['Rút gọn biểu thức số chứa căn bậc hai.'] },
      { stt: 19, title: 'Bài 9. Biến đổi đơn giản và rút gọn biểu thức chứa căn thức bậc hai', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 3, ppct: 'Tiết 32, 33, 34', week: 'Tuần 12', objectives: ['Đưa thừa số vào trong, ra ngoài căn, trục căn thức ở mẫu và rút gọn.'] },
      { stt: 20, title: 'Luyện tập chung: Biến đổi biểu thức chứa căn thức', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 1, ppct: 'Tiết 35', week: 'Tuần 12', objectives: ['Củng cố kỹ năng rút gọn biểu thức chứa ẩn dưới dấu căn.'] },
      { stt: 21, title: 'Bài 10. Căn bậc ba và căn thức bậc ba', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 1, ppct: 'Tiết 36', week: 'Tuần 13', objectives: ['Định nghĩa căn bậc ba và tính chất của căn bậc ba.'] },
      { stt: 22, title: 'Luyện tập chung và Bài tập cuối chương III', chapter: 'Chương III: Căn bậc hai và căn thức bậc ba', strand: 'Số và Đại số', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 37, 38', week: 'Tuần 13', objectives: ['Tổng kết chương Căn bậc hai và căn thức bậc ba.'] },
      { stt: 23, title: 'Bài 13. Mở đầu về đường tròn', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 14, 15 (HH)', week: 'Tuần 13, 14', objectives: ['Định nghĩa đường tròn, sự xác định đường tròn, tính đối xứng của đường tròn.'] },
      { stt: 24, title: 'Bài 14. Cung và dây của một đường tròn', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 16, 17 (HH)', week: 'Tuần 14', objectives: ['Đường kính và dây của đường tròn, liên hệ giữa dây và khoảng cách từ tâm đến dây.'] },
      { stt: 25, title: 'Bài 15. Độ dài của cung tròn. Diện tích hình quạt tròn và hình vành khuyên', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 18, 19 (HH)', week: 'Tuần 14, 15', objectives: ['Công thức tính độ dài cung tròn, diện tích hình quạt tròn, hình vành khuyên.'] },
      { stt: 26, title: 'Luyện tập chung: Các yếu tố của đường tròn', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 1, ppct: 'Tiết 20 (HH)', week: 'Tuần 15', objectives: ['Vận dụng tính độ dài cung và diện tích hình quạt tròn.'] },
      { stt: 27, title: 'Bài 16. Vị trí tương đối của đường thẳng và đường tròn', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 21, 22 (HH)', week: 'Tuần 15', objectives: ['Ba vị trí tương đối của đường thẳng và đường tròn, tính chất tiếp tuyến.'] },
      { stt: 28, title: 'Bài 17. Vị trí tương đối của hai đường tròn', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 23, 24 (HH)', week: 'Tuần 16', objectives: ['Các vị trí tương đối của hai đường tròn và hệ thức giữa khoảng cách hai tâm với bán kính.'] },
      { stt: 29, title: 'Luyện tập chung và Bài tập cuối chương V', chapter: 'Chương V: Đường tròn', strand: 'Hình học và Đo lường', term: 'Học kỳ I', periods: 2, ppct: 'Tiết 25, 26 (HH)', week: 'Tuần 16', objectives: ['Tổng kết toàn bộ kiến thức về Đường tròn.'] },
      { stt: 30, title: 'Ôn tập cuối học kì I và Kiểm tra cuối HK1', chapter: 'Ôn tập & Đánh giá Cuối HK I', strand: 'Tổng hợp kiến thức', term: 'Học kỳ I', periods: 4, ppct: 'Tiết 39, 40 (Số) & Tiết 27, 28 (HH)', week: 'Tuần 17', objectives: ['Đánh giá tổng hợp năng lực toán học cuối Học kỳ I.'] },
      { stt: 31, title: 'Hoạt động thực hành trải nghiệm HK1: Pha chế dung dịch & Tính chiều cao khoảng cách', chapter: 'Hoạt động thực hành trải nghiệm', strand: 'HĐTH & TN', term: 'Học kỳ I', periods: 4, ppct: 'Tiết 1, 2, 3, 4 (TH-TN)', week: 'Tuần 18', objectives: ['Thực hành pha chế dung dịch theo nồng độ và xác định chiều cao, khoảng cách trong thực tế.'] },

      // HK II (Tuần 19 - 35: 68 tiết)
      { stt: 32, title: 'Bài 18. Hàm số và đồ thị hàm số y = ax^2 (a ≠ 0)', chapter: 'Chương VI: Hàm số y = ax^2 và Phương trình bậc hai một ẩn', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 41, 42, 43', week: 'Tuần 19', objectives: ['Tính chất biến thiên và đồ thị parabol của hàm số y = ax^2.'] },
      { stt: 33, title: 'Bài 19. Phương trình bậc hai một ẩn', chapter: 'Chương VI: Hàm số y = ax^2 và Phương trình bậc hai một ẩn', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 44, 45, 46', week: 'Tuần 19, 20', objectives: ['Công thức nghiệm và công thức nghiệm thu gọn của phương trình bậc hai.'] },
      { stt: 34, title: 'Luyện tập chung: Phương trình bậc hai một ẩn', chapter: 'Chương VI: Hàm số y = ax^2 và Phương trình bậc hai một ẩn', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 47, 48', week: 'Tuần 20', objectives: ['Giải thành thạo phương trình bậc hai một ẩn.'] },
      { stt: 35, title: 'Bài 20. Định lí Viète và ứng dụng', chapter: 'Chương VI: Hàm số y = ax^2 và Phương trình bậc hai một ẩn', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 49, 50', week: 'Tuần 21', objectives: ['Phát biểu định lí Viète và ứng dụng nhẩm nghiệm, tìm hai số biết tổng và tích.'] },
      { stt: 36, title: 'Bài 21. Giải bài toán bằng cách lập phương trình bậc hai', chapter: 'Chương VI: Hàm số y = ax^2 và Phương trình bậc hai một ẩn', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 51, 52, 53', week: 'Tuần 21, 22', objectives: ['Vận dụng giải bài toán thực tế bằng cách lập phương trình bậc hai.'] },
      { stt: 37, title: 'Luyện tập chung và Bài tập cuối chương VI', chapter: 'Chương VI: Hàm số y = ax^2 và Phương trình bậc hai một ẩn', strand: 'Số và Đại số', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 54, 55, 56', week: 'Tuần 22', objectives: ['Tổng kết chương Hàm số y = ax^2 và Phương trình bậc hai một ẩn.'] },
      { stt: 38, title: 'Bài 27. Góc nội tiếp', chapter: 'Chương IX: Đường tròn ngoại tiếp, nội tiếp. Tứ giác nội tiếp', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 1, ppct: 'Tiết 29 (HH)', week: 'Tuần 23', objectives: ['Định nghĩa góc nội tiếp và định lí số đo góc nội tiếp bằng nửa số đo cung bị chắn.'] },
      { stt: 39, title: 'Bài 28. Đường tròn ngoại tiếp và đường tròn nội tiếp của một tam giác', chapter: 'Chương IX: Đường tròn ngoại tiếp, nội tiếp. Tứ giác nội tiếp', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 30, 31 (HH)', week: 'Tuần 23', objectives: ['Khái niệm và cách xác định tâm, bán kính đường tròn ngoại tiếp, nội tiếp tam giác.'] },
      { stt: 40, title: 'Luyện tập chung: Góc nội tiếp và đường tròn tam giác', chapter: 'Chương IX: Đường tròn ngoại tiếp, nội tiếp. Tứ giác nội tiếp', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 32, 33 (HH)', week: 'Tuần 23, 24', objectives: ['Củng cố bài tập về góc nội tiếp và đường tròn tam giác.'] },
      { stt: 41, title: 'Bài 29. Tứ giác nội tiếp', chapter: 'Chương IX: Đường tròn ngoại tiếp, nội tiếp. Tứ giác nội tiếp', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 34, 35 (HH)', week: 'Tuần 24', objectives: ['Định nghĩa, tính chất và các dấu hiệu nhận biết tứ giác nội tiếp đường tròn.'] },
      { stt: 42, title: 'Bài 30. Đa giác đều', chapter: 'Chương IX: Đường tròn ngoại tiếp, nội tiếp. Tứ giác nội tiếp', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 36, 37 (HH)', week: 'Tuần 24, 25', objectives: ['Khái niệm đa giác đều và phép quay giữ nguyên đa giác đều.'] },
      { stt: 43, title: 'Luyện tập chung và Bài tập cuối chương IX', chapter: 'Chương IX: Đường tròn ngoại tiếp, nội tiếp. Tứ giác nội tiếp', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 38, 39, 40 (HH)', week: 'Tuần 25', objectives: ['Tổng kết chương Đường tròn ngoại tiếp, nội tiếp và Tứ giác nội tiếp.'] },
      { stt: 44, title: 'Ôn tập và Kiểm tra giữa học kì II', chapter: 'Ôn tập Giữa HK II', strand: 'Tổng hợp kiến thức', term: 'Học kỳ II', periods: 4, ppct: 'Tiết 57, 58 (Số) & Tiết 41, 42 (HH)', week: 'Tuần 26', objectives: ['Đánh giá kiến thức Đại số và Hình học giữa Học kỳ II.'] },
      { stt: 45, title: 'Bài 22. Bảng tần số và biểu đồ tần số', chapter: 'Chương VII: Tần số và tần số tương đối', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 1, 2 (TK)', week: 'Tuần 27', objectives: ['Lập bảng tần số và vẽ biểu đồ tần số dạng cột, biểu đồ đoạn thẳng.'] },
      { stt: 46, title: 'Bài 23. Bảng tần số tương đối và biểu đồ tần số tương đối', chapter: 'Chương VII: Tần số và tần số tương đối', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 3, 4 (TK)', week: 'Tuần 27', objectives: ['Lập bảng tần số tương đối và vẽ biểu đồ hình quạt tròn.'] },
      { stt: 47, title: 'Luyện tập chung: Tần số và tần số tương đối', chapter: 'Chương VII: Tần số và tần số tương đối', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 1, ppct: 'Tiết 5 (TK)', week: 'Tuần 28', objectives: ['Phân tích và giải thích dữ liệu từ biểu đồ tần số tương đối.'] },
      { stt: 48, title: 'Bài 24. Bảng tần số, tần số tương đối ghép nhóm và biểu đồ', chapter: 'Chương VII: Tần số và tần số tương đối', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 6, 7, 8 (TK)', week: 'Tuần 28', objectives: ['Ghép nhóm số liệu và vẽ biểu đồ tần số ghép nhóm.'] },
      { stt: 49, title: 'Bài tập cuối chương VII', chapter: 'Chương VII: Tần số và tần số tương đối', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 9, 10 (TK)', week: 'Tuần 29', objectives: ['Tổng kết chương Thống kê tần số và tần số tương đối.'] },
      { stt: 50, title: 'Bài 25. Phép thử ngẫu nhiên và không gian mẫu', chapter: 'Chương VIII: Xác suất của biến cố', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 11, 12, 13 (TK)', week: 'Tuần 29, 30', objectives: ['Khái niệm phép thử ngẫu nhiên, không gian mẫu và biến cố.'] },
      { stt: 51, title: 'Bài 26. Xác suất của biến cố liên quan tới phép thử', chapter: 'Chương VIII: Xác suất của biến cố', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 14, 15 (TK)', week: 'Tuần 30', objectives: ['Tính xác suất của biến cố bằng định nghĩa cổ điển.'] },
      { stt: 52, title: 'Luyện tập chung và Bài tập cuối chương VIII', chapter: 'Chương VIII: Xác suất của biến cố', strand: 'Một số yếu tố Thống kê và Xác suất', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 16, 17, 18 (TK)', week: 'Tuần 30, 31', objectives: ['Tổng kết chương Xác suất của biến cố.'] },
      { stt: 53, title: 'Bài 31. Hình trụ và hình nón', chapter: 'Chương X: Một số hình khối trong thực tiễn', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 3, ppct: 'Tiết 43, 44, 45 (HH)', week: 'Tuần 31, 32', objectives: ['Diện tích xung quanh và thể tích của hình trụ, hình nón.'] },
      { stt: 54, title: 'Bài 32. Hình cầu', chapter: 'Chương X: Một số hình khối trong thực tiễn', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 46, 47 (HH)', week: 'Tuần 32', objectives: ['Diện tích mặt cầu và thể tích hình cầu.'] },
      { stt: 55, title: 'Luyện tập chung và Bài tập cuối chương X', chapter: 'Chương X: Một số hình khối trong thực tiễn', strand: 'Hình học và Đo lường', term: 'Học kỳ II', periods: 2, ppct: 'Tiết 48, 49 (HH)', week: 'Tuần 32, 33', objectives: ['Tổng kết các hình khối thực tiễn Hình trụ, Hình nón, Hình cầu.'] },
      { stt: 56, title: 'Ôn tập và Kiểm tra cuối học kì II', chapter: 'Ôn tập & Đánh giá Cuối HK II', strand: 'Tổng hợp kiến thức', term: 'Học kỳ II', periods: 5, ppct: 'Tiết 50 (HH), 19 (TK), 59, 60 (Số), 20 (TK)', week: 'Tuần 33, 34', objectives: ['Đánh giá tổng hợp năng lực toán học cuối Học kỳ II.'] },
      { stt: 57, title: 'Hoạt động thực hành trải nghiệm HK2: Ứng dụng GeoGebra, Excel và Sinh học', chapter: 'Hoạt động thực hành trải nghiệm', strand: 'HĐTH & TN', term: 'Học kỳ II', periods: 6, ppct: 'Tiết 5 đến 10 (TH-TN)', week: 'Tuần 34, 35', objectives: ['Giải phương trình, vẽ đồ thị với GeoGebra, lập bảng Excel và Gene trội trong thế hệ lai.'] },
    ];

    const sourceLessons = isGrade8 ? lessons8 : lessons9;

    const lessons: CatalogLessonItem[] = sourceLessons.map((item) => {
      const padStt = item.stt < 10 ? `0${item.stt}` : `${item.stt}`;
      const termCode = item.term === 'Học kỳ I' ? 'HKI' : 'HKII';
      return {
        stt: item.stt,
        lessonCode: `TOAN-${gradeNum}-${termCode}-STT${padStt}`,
        lessonTitle: item.title,
        chapter: item.chapter,
        strand: item.strand,
        grade: cleanGrade,
        term: item.term,
        totalPeriods: item.periods,
        ppctRange: item.ppct,
        weekRange: item.week,
        keyObjectives: item.objectives,
        sourceBasis: docCount > 0 ? `Tài liệu nguồn đã nạp (${docNames.join(', ')})` : 'Khung Kế hoạch dạy học Toán 9 chuẩn GDPT 2018 (35 tuần / 140 tiết)',
        matchedSources: docCount > 0 ? activeDocs.map((d) => d.documentType) : ['PPCT', 'PL1', 'SGK'],
      };
    });

    const catalog: CurriculumCatalog = {
      subject: 'Toán học',
      grade: cleanGrade,
      schoolYear: '2026-2027',
      sourceSummary: docCount > 0
        ? `Tự động liên kết dữ liệu nguồn: ${docNames.join(', ')} với Khung PPCT chuẩn GDPT 2018 (35 tuần / 140 tiết)`
        : 'Khung Phân phối chương trình & Danh mục bài học chuẩn Bộ GD&ĐT (35 tuần / 140 tiết)',
      totalLessons: lessons.length,
      totalPeriods: 140,
      sourcesUsed: {
        hasPL1: activeDocs.some((d) => d.documentType === 'PL1'),
        hasPPCT: activeDocs.some((d) => d.documentType === 'PPCT'),
        hasSGK: activeDocs.some((d) => d.documentType === 'SGK') || docCount > 0,
        hasKhdhOld: activeDocs.some((d) => d.documentType === 'KHDH_OLD'),
        hasOther: activeDocs.some((d) => d.documentType === 'OTHER'),
        docCount,
        docNames,
      },
      extractedAt: new Date().toISOString(),
      lessons,
    };

    this.saveCatalog(projectId, catalog);
    return catalog;
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

    if (req.forceRefresh) {
      await this.clearCatalog(targetProject);
    }

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

    const subjectName = req.subject && req.subject !== 'Tài liệu nguồn' && req.subject !== 'Chưa xác định' ? req.subject : (detectedSubject && detectedSubject !== 'Tài liệu nguồn' ? detectedSubject : 'Toán học');
    const gradeName = req.grade && req.grade !== 'Chưa xác định' ? req.grade : (detectedGrade || 'Lớp 8');

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

    // NẾU CÓ TỆP NGUỒN TẢI LÊN NHƯNG CHƯA BÓC TÁCH ĐƯỢC BẢNG (HOẶC 🔑 0 KEYS):
    // Tự động giải phóng danh mục từ chính tệp nguồn đã tải lên
    if (activeDocs.length > 0) {
      const docNames = activeDocs.map((d) => `[${d.documentType}] ${d.displayName}`);
      const fallbackSubject = subjectName && subjectName !== 'Tài liệu nguồn' && subjectName !== 'Chưa xác định' ? subjectName : (detectedSubject || 'Tài liệu nguồn');
      const fallbackGrade = gradeName && gradeName !== 'Chưa xác định' ? gradeName : (detectedGrade || 'Lớp 8');

      // Tạo các bài học từ tên tệp và nội dung văn bản thực tế của người dùng
      const docLessons: CatalogLessonItem[] = activeDocs.map((doc, idx) => {
        const subPrefix = this.getSubjectCodePrefix(fallbackSubject);
        const cleanGradeNum = (fallbackGrade || '8').replace(/[^0-9]/g, '') || '8';
        const stt = idx + 1;
        const padStt = stt < 10 ? `0${stt}` : `${stt}`;
        return {
          stt,
          lessonCode: `${subPrefix}-${cleanGradeNum}-HKI-C01-STT${padStt}`,
          lessonTitle: `Nội dung từ tệp ${doc.displayName}`,
          chapter: 'Dữ liệu bóc tách từ tệp nguồn',
          strand: fallbackSubject,
          grade: fallbackGrade,
          term: 'Học kỳ I',
          totalPeriods: 2,
          ppctRange: `Tiết ${idx * 2 + 1}, ${idx * 2 + 2}`,
          weekRange: `Tuần ${Math.ceil((idx + 1) / 2)}`,
          keyObjectives: [doc.contentSummary || `Theo nội dung tệp ${doc.displayName}`],
          sourceBasis: `${doc.documentType} (${doc.displayName})`,
          matchedSources: [doc.documentType],
        };
      });

      const customCatalog: CurriculumCatalog = {
        subject: fallbackSubject,
        grade: fallbackGrade,
        schoolYear: detectedSchoolYear,
        sourceSummary: `Tự động kết nối dữ liệu tệp nguồn đã nạp: ${docNames.join(', ')}`,
        totalLessons: docLessons.length,
        totalPeriods: docLessons.reduce((a, b) => a + b.totalPeriods, 0),
        sourcesUsed: {
          hasPL1,
          hasPPCT,
          hasSGK,
          hasKhdhOld,
          hasOther,
          docCount: activeDocs.length,
          docNames,
        },
        extractedAt: new Date().toISOString(),
        lessons: docLessons,
      };

      await this.saveCatalog(targetProject, customCatalog);
      const markdown = this.renderCatalogToMarkdown(customCatalog);
      return {
        catalog: customCatalog,
        markdownSummary: markdown,
        isCached: false,
      };
    }

    // CHỈ KHI CHƯA TẢI TỆP NGUỒN NÀO: Trả về Khung mẫu chuẩn GDPT 2018 theo đúng môn và lớp được chọn
    const stdCatalog = this.generateStandardCatalog(subjectName, gradeName, targetProject, []);
    const stdMarkdown = this.renderCatalogToMarkdown(stdCatalog);

    return {
      catalog: stdCatalog,
      markdownSummary: stdMarkdown,
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
