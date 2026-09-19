import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  ImportedXmlComponent,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { OmmlConverter } from './omml-converter';
import { MathExportMode, PrintProfile, ProfileConfig, WordExportOptions } from './export.types';
import { PROFILES } from './word-export.config';

function sanitizeXmlText(text: string): string {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '');
}

function importOmmlComponents(xmlStr: string): (TextRun | ImportedXmlComponent)[] {
  const imported = ImportedXmlComponent.fromXmlString(xmlStr);
  const anyImported = imported as unknown as { rootKey?: string; root?: unknown[] };
  if (!anyImported.rootKey && Array.isArray(anyImported.root)) {
    return anyImported.root as unknown as (TextRun | ImportedXmlComponent)[];
  }
  return [imported];
}

interface Segment {
  type: 'text' | 'inline-math' | 'display-math';
  content: string;
}

function parseLineSegments(line: string): Segment[] {
  const cleanLine = sanitizeXmlText(line);
  const segments: Segment[] = [];
  let cursor = 0;

  while (cursor < cleanLine.length) {
    if (cleanLine.startsWith('$$', cursor)) {
      const end = cleanLine.indexOf('$$', cursor + 2);
      if (end !== -1) {
        const math = cleanLine.slice(cursor + 2, end);
        segments.push({ type: 'display-math', content: math });
        cursor = end + 2;
        continue;
      }
    }

    if (cleanLine[cursor] === '$' && (cursor === 0 || cleanLine[cursor - 1] !== '\\')) {
      const end = cleanLine.indexOf('$', cursor + 1);
      if (end !== -1 && end > cursor + 1) {
        const math = cleanLine.slice(cursor + 1, end);
        segments.push({ type: 'inline-math', content: math });
        cursor = end + 1;
        continue;
      }
    }

    let nextMath = cleanLine.indexOf('$', cursor);
    if (nextMath === -1) nextMath = cleanLine.length;

    const text = cleanLine.slice(cursor, nextMath);
    if (text) {
      segments.push({ type: 'text', content: text });
    }
    cursor = nextMath;
  }

  return segments;
}

interface HeaderMetadata {
  schoolName: string;
  department: string;
  teacherName: string;
  lessonTitle: string;
  subjectGrade: string;
  durationPpct: string;
}

function extractHeaderMetadata(markdown: string, options: WordExportOptions): HeaderMetadata {
  let schoolName = options.schoolName || 'TRƯỜNG THCS QUANG TRUNG';
  let department = options.department || 'TỔ: TOÁN TIN';
  let teacherName = options.teacherName || 'LÊ TÂM';
  let lessonTitle = '';
  let subjectGrade = 'Môn học: Toán – Lớp: 8';
  let durationPpct = '';

  const lines = markdown.split('\n');
  let rawPpct = '';
  let rawDuration = '';
  let rawWeek = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // School
    const schoolMatch = line.match(/^TRƯỜNG(?:\s*THCS)?\s*:\s*([^\n\|<]+)/i);
    if (schoolMatch) schoolName = schoolMatch[1].trim().toUpperCase();

    // Dept
    const deptMatch = line.match(/^TỔ\s*:\s*([^\n\|<]+)/i);
    if (deptMatch) {
      const d = deptMatch[1].trim().toUpperCase();
      department = d.startsWith('TỔ') ? d : `TỔ: ${d}`;
    }

    // Teacher
    const teacherMatch = line.match(/^(?:Họ tên giáo viên|Giáo viên)\s*:\s*([^\n\|<]+)/i);
    if (teacherMatch) teacherName = teacherMatch[1].trim().toUpperCase();

    // Lesson Title
    const titleMatch = line.match(/^##?\s*\*\*?(BÀI\s+[0-9]+[^\*\n]+)\*\*?/i)
      || line.match(/^(BÀI\s+[0-9]+[\.:\s]+[^\n]+)/i);
    if (titleMatch && !lessonTitle) {
      lessonTitle = titleMatch[1].trim().toUpperCase();
    }

    // Subject & Grade
    const subjMatch = line.match(/^Môn học\s*:\s*([^–\-\n]+)\s*[–\-]\s*Lớp\s*:\s*([^\n]+)/i);
    if (subjMatch) {
      subjectGrade = `Môn học: ${subjMatch[1].trim()} – Lớp: ${subjMatch[2].trim()}`;
    }

    // Duration / PPCT / Week
    const durMatch = line.match(/^(?:Thời lượng|Thời gian thực hiện)\s*:\s*([^\n]+)/i);
    if (durMatch) rawDuration = durMatch[1].trim();

    const ppctMatch = line.match(/^PPCT\s*:\s*([^\n]+)/i);
    if (ppctMatch) rawPpct = ppctMatch[1].trim();

    const weekMatch = line.match(/^Tuần\s*:\s*([^\n]+)/i);
    if (weekMatch) rawWeek = weekMatch[1].trim();
  }

  // Fallback for lessonTitle
  if (!lessonTitle) {
    if (options.title && options.title !== 'Kế hoạch bài dạy') {
      lessonTitle = options.title.toUpperCase();
    } else if (options.lessonCode) {
      const parenMatch = options.lessonCode.match(/\(([^)]+)\)/);
      if (parenMatch) {
        lessonTitle = parenMatch[1].trim().toUpperCase();
      } else {
        lessonTitle = options.lessonCode.toUpperCase();
      }
    } else {
      lessonTitle = 'BÀI 2. ĐA THỨC';
    }
  }

  // Format Duration & PPCT string
  if (rawDuration || rawPpct || rawWeek) {
    const parts: string[] = [];
    if (rawDuration) {
      const durText = rawDuration.endsWith('tiết') ? rawDuration : `${rawDuration} tiết`;
      parts.push(`Thời gian thực hiện: ${durText}`);
    } else {
      parts.push('Thời gian thực hiện: 2 tiết');
    }
    if (rawPpct) {
      const ppctClean = rawPpct.startsWith('Tiết') ? rawPpct : `Tiết ${rawPpct}`;
      parts.push(`PPCT: ${ppctClean}`);
    }
    if (rawWeek) {
      const weekClean = rawWeek.startsWith('Tuần') ? rawWeek : `Tuần ${rawWeek}`;
      parts.push(`Tuần: ${weekClean}`);
    }
    durationPpct = `(${parts.join(' | ')})`;
  } else {
    const fullTimeMatch = markdown.match(/\((?:Thời gian thực hiện|Thời lượng):[^\)]+\)/i);
    if (fullTimeMatch) {
      durationPpct = fullTimeMatch[0].trim();
    } else {
      durationPpct = '(Thời gian thực hiện: 2 tiết | PPCT: Tiết 3, Tiết 4 | Tuần: Tuần 1)';
    }
  }

  return {
    schoolName,
    department,
    teacherName,
    lessonTitle,
    subjectGrade,
    durationPpct,
  };
}

function extractBodyLines(markdown: string): string[] {
  const lines = markdown.split('\n');
  
  // Find where Section I (MỤC TIÊU) starts
  let targetIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^(?:#+\s*)?(?:I|1)\.\s*MỤC TIÊU/i.test(trimmed)) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex !== -1) {
    return lines.slice(targetIndex);
  }

  // If not found, skip any leading metadata / header table lines
  const body: string[] = [];
  let pastHeader = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!pastHeader) {
      if (
        line.startsWith('TRƯỜNG') ||
        line.startsWith('TỔ:') ||
        line.startsWith('Họ tên') ||
        line.startsWith('Môn học:') ||
        line.startsWith('Thời lượng:') ||
        line.startsWith('PPCT:') ||
        line.startsWith('Tuần:') ||
        line.startsWith('|') ||
        line.startsWith('---') ||
        line.startsWith('# 1. PHẦN ĐẦU') ||
        line.startsWith('```') ||
        line.startsWith('# FORM')
      ) {
        continue;
      }
      pastHeader = true;
    }
    body.push(rawLine);
  }
  return body;
}

export class DocxBuilder {
  private mathMode: MathExportMode;
  private profile: ProfileConfig;
  public formulasConverted = 0;
  public ommlFallbackCount = 0;
  public tablesCount = 0;

  constructor(mathMode: MathExportMode = 'omml', printProfile: PrintProfile = 'COMPACT_PRINT') {
    this.mathMode = mathMode;
    this.profile = PROFILES[printProfile] || PROFILES.COMPACT_PRINT;
  }

  private buildParagraphChildren(line: string, fontSize?: number): (TextRun | ImportedXmlComponent)[] {
    const segments = parseLineSegments(line);
    const children: (TextRun | ImportedXmlComponent)[] = [];
    const targetSize = fontSize || this.profile.bodyFontSize;

    for (const seg of segments) {
      if (seg.type === 'inline-math') {
        this.formulasConverted++;
        if (this.mathMode === 'omml') {
          const { omml, isFallback } = OmmlConverter.latexToOmml(seg.content, false);
          if (isFallback) this.ommlFallbackCount++;
          children.push(...importOmmlComponents(omml));
        } else {
          children.push(
            new TextRun({
              text: `$${seg.content}$`,
              font: this.profile.mathFontFamily,
              color: '000000',
              bold: true,
              size: targetSize,
            })
          );
        }
      } else if (seg.type === 'display-math') {
        this.formulasConverted++;
        if (this.mathMode === 'omml') {
          const { omml, isFallback } = OmmlConverter.latexToOmml(seg.content, false);
          if (isFallback) this.ommlFallbackCount++;
          children.push(...importOmmlComponents(omml));
        } else {
          children.push(
            new TextRun({
              text: `$$ ${seg.content} $$`,
              font: this.profile.mathFontFamily,
              color: '000000',
              bold: true,
              size: targetSize,
            })
          );
        }
      } else {
        let raw = seg.content;
        const parts = raw.split(/(\b|\*\*.*?\*\*|\*.*?\*)/g);
        for (const p of parts) {
          if (!p) continue;
          if (p.startsWith('**') && p.endsWith('**') && p.length >= 4) {
            children.push(
              new TextRun({
                text: p.slice(2, -2),
                bold: true,
                font: this.profile.fontFamily,
                size: targetSize,
                color: '000000',
              })
            );
          } else if (p.startsWith('*') && p.endsWith('*') && p.length >= 2) {
            children.push(
              new TextRun({
                text: p.slice(1, -1),
                italics: true,
                font: this.profile.fontFamily,
                size: targetSize,
                color: '000000',
              })
            );
          } else {
            children.push(
              new TextRun({
                text: p,
                font: this.profile.fontFamily,
                size: targetSize,
                color: '000000',
              })
            );
          }
        }
      }
    }

    return children;
  }

  public build(options: WordExportOptions): Document {
    const docElements: (Paragraph | Table)[] = [];
    const meta = extractHeaderMetadata(options.markdown, options);

    // 1. Top Header (2-column borderless table)
    const borderNone = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: borderNone,
        bottom: borderNone,
        left: borderNone,
        right: borderNone,
        insideHorizontal: borderNone,
        insideVertical: borderNone,
      },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: meta.schoolName,
                      bold: true,
                      size: 24, // 12pt
                      font: this.profile.fontFamily,
                      color: '000000',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40, line: 240 },
                  children: [
                    new TextRun({
                      text: meta.department.startsWith('TỔ') ? meta.department : `TỔ: ${meta.department}`,
                      bold: true,
                      size: 24, // 12pt
                      font: this.profile.fontFamily,
                      color: '000000',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: 'Họ tên giáo viên:',
                      size: 24, // 12pt
                      font: this.profile.fontFamily,
                      color: '000000',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40, line: 240 },
                  children: [
                    new TextRun({
                      text: meta.teacherName,
                      bold: true,
                      size: 24, // 12pt
                      font: this.profile.fontFamily,
                      color: '000000',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    docElements.push(headerTable);

    // 2. Centered Title Block
    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 40 },
        keepNext: true,
        children: [
          new TextRun({
            text: meta.lessonTitle,
            bold: true,
            size: 32, // 16pt
            font: this.profile.fontFamily,
            color: '0F4C81', // Dark Blue
          }),
        ],
      })
    );

    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        keepNext: true,
        children: [
          new TextRun({
            text: meta.subjectGrade,
            italics: true,
            size: 26, // 13pt
            font: this.profile.fontFamily,
            color: '333333',
          }),
        ],
      })
    );

    docElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 180 },
        keepNext: true,
        children: [
          new TextRun({
            text: meta.durationPpct,
            italics: true,
            size: 24, // 12pt
            font: this.profile.fontFamily,
            color: '555555',
          }),
        ],
      })
    );

    const bodyLines = extractBodyLines(options.markdown);
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        this.tablesCount++;
        const numCols = Math.max(...tableRows.map((r) => r.length));
        const colWidthPct = Math.floor(100 / numCols);

        const cellMargin = this.profile.compactTablePadding
          ? { top: 60, bottom: 60, left: 100, right: 100 }
          : { top: 100, bottom: 100, left: 140, right: 140 };

        const rows = tableRows.map((row, rIdx) => {
          const isHeader = rIdx === 0;
          const cells = row.map((cellText) => {
            const cellLines = cellText.split(/<br\s*\/?>/gi);
            const cellParagraphs = cellLines.map((cL) => {
              const cellChildren = this.buildParagraphChildren(cL.trim(), this.profile.tableFontSize);
              return new Paragraph({
                children: cellChildren.length > 0 ? cellChildren : [new TextRun({ text: '', font: this.profile.fontFamily })],
                spacing: { before: 20, after: 20, line: this.profile.lineSpacing },
                alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
              });
            });

            return new TableCell({
              width: { size: colWidthPct, type: WidthType.PERCENTAGE },
              shading: isHeader
                ? { type: ShadingType.CLEAR, fill: 'F1F5F9' }
                : undefined,
              margins: cellMargin,
              children: cellParagraphs.length > 0 ? cellParagraphs : [
                new Paragraph({
                  children: [new TextRun({ text: '', font: this.profile.fontFamily })],
                  spacing: { before: 20, after: 20, line: this.profile.lineSpacing },
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                }),
              ],
            });
          });

          return new TableRow({
            children: cells,
            tableHeader: isHeader,
            cantSplit: true,
          });
        });

        docElements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          })
        );
        docElements.push(new Paragraph({ spacing: { before: 0, after: 60 } }));
        tableRows = [];
      }
      inTable = false;
    };

    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i].trim();

      // Check Table line
      if (line.startsWith('|') && line.endsWith('|')) {
        if (/^\|[\s\-:\|]+\|$/.test(line)) {
          continue;
        }
        inTable = true;
        const cols = line
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cols);
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (!line || line === '---' || /^[-*_]{3,}$/.test(line)) {
        continue;
      }

      // Headings with keepNext = true
      if (line.startsWith('# ') || /^(?:I|II|III|IV|V|VI)\.\s+/i.test(line)) {
        const textContent = line.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
        docElements.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: textContent,
                bold: true,
                size: this.profile.heading1Size,
                font: this.profile.fontFamily,
                color: '0F4C81',
              }),
            ],
            spacing: { before: 160, after: 80, line: this.profile.lineSpacing },
            keepNext: true,
          })
        );
      } else if (
        line.startsWith('## ') ||
        /^(?:1|2|3|4|5)\.\s+(?:Kiến thức|Năng lực|Phẩm chất|Giáo viên|Học sinh)/i.test(line) ||
        /^[A-D]\.\s+HOẠT ĐỘNG/i.test(line)
      ) {
        const textContent = line.replace(/^##\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
        docElements.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: textContent,
                bold: true,
                size: this.profile.heading2Size,
                font: this.profile.fontFamily,
                color: '0284C7',
              }),
            ],
            spacing: { before: 120, after: 60, line: this.profile.lineSpacing },
            keepNext: true,
          })
        );
      } else if (line.startsWith('### ') || /^[a-z]\)\s+/i.test(line)) {
        const textContent = line.replace(/^###\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
        docElements.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: textContent,
                bold: true,
                size: this.profile.heading3Size,
                font: this.profile.fontFamily,
                color: '0369A1',
              }),
            ],
            spacing: { before: 80, after: 40, line: this.profile.lineSpacing },
            keepNext: true,
          })
        );
      } else if (line.startsWith('$$') && line.endsWith('$$') && line.length >= 4) {
        const mathContent = line.slice(2, -2).trim();
        this.formulasConverted++;
        if (this.mathMode === 'omml') {
          const { omml, isFallback } = OmmlConverter.latexToOmml(mathContent, true);
          if (isFallback) this.ommlFallbackCount++;
          docElements.push(
            new Paragraph({
              children: importOmmlComponents(omml),
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              keepNext: true,
            })
          );
        } else {
          docElements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `$$ ${mathContent} $$`,
                  font: this.profile.mathFontFamily,
                  color: '000000',
                  bold: true,
                  size: this.profile.bodyFontSize,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              keepNext: true,
            })
          );
        }
      } else {
        // Regular Paragraph - Justified alignment & compact spacing
        const children = this.buildParagraphChildren(line);
        docElements.push(
          new Paragraph({
            children,
            spacing: { before: 0, after: this.profile.paragraphSpacingAfter, line: this.profile.lineSpacing },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
      }
    }

    if (inTable) flushTable();

    return new Document({
      styles: {
        default: {
          document: {
            run: {
              font: this.profile.fontFamily,
              size: this.profile.bodyFontSize,
              color: '000000',
            },
            paragraph: {
              spacing: { before: 0, after: this.profile.paragraphSpacingAfter, line: this.profile.lineSpacing },
              alignment: AlignmentType.JUSTIFIED,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: this.profile.margins,
              pageNumbers: {
                start: 1,
                formatType: NumberFormat.DECIMAL,
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: 'Trang ',
                      font: this.profile.fontFamily,
                      size: 20,
                      color: '64748B',
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: this.profile.fontFamily,
                      size: 20,
                      color: '64748B',
                    }),
                  ],
                }),
              ],
            }),
          },
          children: docElements,
        },
      ],
    });
  }
}
