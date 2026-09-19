import { PrintProfile, ProfileConfig } from './export.types';

export const PROFILES: Record<PrintProfile, ProfileConfig> = {
  COMPACT_PRINT: {
    name: 'COMPACT_PRINT',
    label: 'Word OMML – Tiết kiệm in (Khuyến nghị in ấn)',
    paperSize: 'A4',
    margins: {
      top: 850,     // ~15 mm
      bottom: 850,  // ~15 mm
      left: 1134,   // 20 mm (gọn gàng, dễ đóng gáy)
      right: 850,   // ~15 mm
    },
    bodyFontSize: 26,       // 13 pt
    heading1Size: 28,       // 14 pt (Bold)
    heading2Size: 26,       // 13 pt (Bold)
    heading3Size: 26,       // 13 pt (Bold)
    tableFontSize: 22,      // 11 pt
    lineSpacing: 250,       // ~1.04 (tiết kiệm trang nhưng thoáng)
    paragraphSpacingAfter: 40, // 2 pt
    fontFamily: 'Times New Roman',
    mathFontFamily: 'Cambria Math',
    grayscaleFriendly: true,
    compactTablePadding: true,
  },
  STANDARD: {
    name: 'STANDARD',
    label: 'Word OMML – Tiêu chuẩn',
    paperSize: 'A4',
    margins: {
      top: 1134,    // 20 mm
      bottom: 1134, // 20 mm
      left: 1417,   // 25 mm
      right: 1134,  // 20 mm
    },
    bodyFontSize: 28,       // 14 pt
    heading1Size: 32,       // 16 pt
    heading2Size: 28,       // 14 pt
    heading3Size: 26,       // 13 pt
    tableFontSize: 24,      // 12 pt
    lineSpacing: 276,       // 1.15
    paragraphSpacingAfter: 80, // 4 pt
    fontFamily: 'Times New Roman',
    mathFontFamily: 'Cambria Math',
    grayscaleFriendly: true,
    compactTablePadding: false,
  },
};
