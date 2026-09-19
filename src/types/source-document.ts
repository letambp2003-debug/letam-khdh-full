/**
 * Source Document Types for KHDH AUTO V10.1
 */

export type SourceDocumentType = 
  | 'PL1'       // Phụ lục I hiện hành
  | 'PPCT'      // Phân phối chương trình hiện hành
  | 'SGK'       // Sách giáo khoa
  | 'KHDH_OLD'  // Kế hoạch dạy học cũ (Tài liệu tham khảo)
  | 'OTHER';    // Tài liệu khác (SBT, SGV, Phụ lục III, Khung năng lực số, Tài liệu địa phương...)

export type SourceDocumentStatus = 
  | 'UPLOADING'   // Đang tải lên
  | 'PROCESSING'  // Đang xử lý
  | 'READY'       // Sẵn sàng
  | 'ERROR'       // Lỗi xử lý
  | 'REPLACED'    // Đã thay thế
  | 'ARCHIVED';   // Đã lưu trữ

export interface SourceDocument {
  id: string;
  projectId: string;
  documentType: SourceDocumentType;
  originalFileName: string;
  displayName: string;
  mimeType: string;
  fileSize: number;
  storagePath?: string;
  fileUrl?: string;
  status: SourceDocumentStatus;
  version: number;
  isActive: boolean;
  contentSummary?: string;
  extractedText?: string;
  errorMessage?: string;
  replacedBy?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceReadinessReport {
  pl1Status: 'READY' | 'MISSING';
  ppctStatus: 'READY' | 'MISSING';
  sgkStatus: 'READY' | 'MISSING';
  khdhOldStatus: 'READY' | 'MISSING';
  isSufficient: boolean;
  readyCount: number;
  activeCount: number;
  warningMessages: string[];
  priorityOrder: SourceDocumentType[];
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: SourceDocument;
  documents?: SourceDocument[];
  message: string;
  readiness?: SourceReadinessReport;
}
