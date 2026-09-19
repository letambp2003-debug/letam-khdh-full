export type MathExportMode = 'omml' | 'latex';
export type PrintProfile = 'COMPACT_PRINT' | 'STANDARD';

export interface ProfileConfig {
  name: PrintProfile;
  label: string;
  paperSize: 'A4';
  margins: {
    top: number;    // dxa (1 mm = 56.7 dxa)
    bottom: number;
    left: number;
    right: number;
  };
  bodyFontSize: number;      // half-pts (26 = 13pt, 28 = 14pt)
  heading1Size: number;
  heading2Size: number;
  heading3Size: number;
  tableFontSize: number;
  lineSpacing: number;       // 240 = 1.0, 252 = 1.05, 276 = 1.15
  paragraphSpacingAfter: number; // dxa
  fontFamily: string;
  mathFontFamily: string;
  grayscaleFriendly: boolean;
  compactTablePadding: boolean;
}

export interface WordExportOptions {
  markdown: string;
  title?: string;
  lessonCode?: string;
  schoolName?: string;
  department?: string;
  teacherName?: string;
  mathMode?: MathExportMode;
  printProfile?: PrintProfile;
  includePageNumbers?: boolean;
}

export interface WordExportResult {
  buffer: Buffer;
  filename: string;
  mathMode: MathExportMode;
  printProfile: PrintProfile;
  formulasConverted: number;
  ommlFallbackCount: number;
  tablesCount: number;
  durationMs: number;
}
