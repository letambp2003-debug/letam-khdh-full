import { CatalogExtractorService } from '@/services/catalog/catalog-extractor.service';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SourceDocument, SourceDocumentType, SourceReadinessReport } from '@/types/source-document';
import { DocumentParserService } from './document-parser.service';
import { SourceContextBuilder } from './source-context-builder';

import fsSync from 'fs';

function getStorageDir(): string {
  try {
    const localDir = path.join(process.cwd(), 'data', 'source-documents');
    if (!fsSync.existsSync(localDir)) {
      fsSync.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'khdh-source-docs');
    if (!fsSync.existsSync(tmpDir)) {
      fsSync.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const STORAGE_DIR = getStorageDir();
const METADATA_FILE = path.join(STORAGE_DIR, 'documents-meta.json');

let memoryDocuments: SourceDocument[] = [];
let isInitialized = false;

export class SourceDocumentService {
  private static async init(): Promise<void> {
    if (isInitialized) return;
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      try {
        const data = await fs.readFile(METADATA_FILE, 'utf-8');
        memoryDocuments = JSON.parse(data);
      } catch {
        memoryDocuments = [];
        await fs.writeFile(METADATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
      isInitialized = true;
    } catch {
      memoryDocuments = [];
      isInitialized = true;
    }
  }

  private static async persist(): Promise<void> {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      await fs.writeFile(METADATA_FILE, JSON.stringify(memoryDocuments, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist document metadata to disk:', err);
    }
  }

  public static async getAll(projectId = 'usr_guest'): Promise<SourceDocument[]> {
    await this.init();
    return memoryDocuments
      .filter((d) => d.projectId === projectId || projectId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async getById(id: string): Promise<SourceDocument | null> {
    await this.init();
    const doc = memoryDocuments.find((d) => d.id === id);
    return doc || null;
  }

  public static async create(
    file: { name: string; size: number; type: string; buffer: Buffer },
    preferredType?: SourceDocumentType,
    projectId = 'usr_guest'
  ): Promise<SourceDocument> {
    await this.init();
    const docId = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const docType = DocumentParserService.detectDocumentType(file.name, preferredType);
    const now = new Date().toISOString();
    const safeFileName = `${docId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(STORAGE_DIR, safeFileName);

    try {
      await fs.writeFile(filePath, file.buffer);
    } catch (err) {
      console.warn('File write error (falling back to memory):', err);
    }

    const { text, summary } = await DocumentParserService.parseDocumentBuffer(file.name, file.buffer, file.type);

    // Vô hiệu hóa tài liệu cũ cùng loại trong không gian này để không bị nạp chồng chéo/dữ liệu đệm
    let nextVersion = 1;
    for (const doc of memoryDocuments) {
      if (doc.projectId === projectId && doc.documentType === docType && doc.isActive) {
        doc.isActive = false;
        doc.status = 'REPLACED';
        doc.replacedBy = docId;
        doc.updatedAt = now;
        nextVersion = Math.max(nextVersion, doc.version + 1);
      }
    }

    const newDoc: SourceDocument = {
      id: docId,
      projectId,
      documentType: docType,
      originalFileName: file.name,
      displayName: file.name.replace(/\.[^/.]+$/, ''),
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      storagePath: filePath,
      status: 'READY',
      version: nextVersion,
      isActive: true,
      contentSummary: summary,
      extractedText: text,
      createdAt: now,
      updatedAt: now,
    };

    memoryDocuments.unshift(newDoc);
    await this.persist();

    // XÓA NGAY BỘ NHỚ ĐỆM DANH MỤC CŨ để dữ liệu mới có hiệu lực tức thì
    try {
      await CatalogExtractorService.clearCatalog(projectId);
    } catch (err) {
      console.warn('Could not clear catalog cache:', err);
    }

    return newDoc;
  }

  public static async replace(
    oldDocId: string,
    file: { name: string; size: number; type: string; buffer: Buffer },
    projectId?: string
  ): Promise<{ oldDoc: SourceDocument; newDoc: SourceDocument }> {
    await this.init();
    const oldIndex = memoryDocuments.findIndex((d) => d.id === oldDocId);
    if (oldIndex === -1) {
      throw new Error('Tài liệu cũ cần thay thế không tồn tại');
    }

    const oldDoc = memoryDocuments[oldIndex];
    const targetProject = projectId || oldDoc.projectId || 'usr_guest';
    const newDocId = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const safeFileName = `${newDocId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(STORAGE_DIR, safeFileName);
    try {
      await fs.writeFile(filePath, file.buffer);
    } catch (err) {
      console.warn('File write error:', err);
    }

    const { text, summary } = await DocumentParserService.parseDocumentBuffer(file.name, file.buffer, file.type);

    oldDoc.status = 'REPLACED';
    oldDoc.isActive = false;
    oldDoc.replacedBy = newDocId;
    oldDoc.updatedAt = now;

    const newDoc: SourceDocument = {
      id: newDocId,
      projectId: targetProject,
      documentType: oldDoc.documentType,
      originalFileName: file.name,
      displayName: file.name.replace(/\.[^/.]+$/, ''),
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      storagePath: filePath,
      status: 'READY',
      version: oldDoc.version + 1,
      isActive: true,
      contentSummary: summary,
      extractedText: text,
      createdAt: now,
      updatedAt: now,
    };

    memoryDocuments.unshift(newDoc);
    await this.persist();

    // XÓA NGAY BỘ NHỚ ĐỆM DANH MỤC CŨ
    try {
      await CatalogExtractorService.clearCatalog(targetProject);
    } catch (err) {
      console.warn('Could not clear catalog cache:', err);
    }

    return { oldDoc, newDoc };
  }

  public static async update(id: string, updates: Partial<SourceDocument>): Promise<SourceDocument | null> {
    await this.init();
    const doc = memoryDocuments.find((d) => d.id === id);
    if (!doc) return null;

    if (updates.displayName !== undefined) doc.displayName = updates.displayName;
    if (updates.documentType !== undefined) doc.documentType = updates.documentType;
    if (updates.isActive !== undefined) doc.isActive = updates.isActive;
    if (updates.status !== undefined) doc.status = updates.status;
    doc.updatedAt = new Date().toISOString();

    await this.persist();
    return doc;
  }

  public static async delete(id: string): Promise<boolean> {
    await this.init();
    const index = memoryDocuments.findIndex((d) => d.id === id);
    if (index === -1) return false;

    const doc = memoryDocuments[index];
    if (doc.storagePath) {
      try {
        await fs.unlink(doc.storagePath);
      } catch {
        // ignore delete error
      }
    }

    memoryDocuments.splice(index, 1);
    await this.persist();
    return true;
  }

  public static async toggleActive(id: string, isActive: boolean): Promise<SourceDocument | null> {
    return this.update(id, { isActive });
  }

  public static async getReadiness(projectId = 'usr_guest'): Promise<SourceReadinessReport> {
    const docs = await this.getAll(projectId);
    return SourceContextBuilder.checkReadiness(docs);
  }

  public static async getActiveReady(projectId = 'usr_guest'): Promise<SourceDocument[]> {
    const docs = await this.getAll(projectId);
    return docs.filter((d) => d.isActive && d.status === 'READY');
  }
}
