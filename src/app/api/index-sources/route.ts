import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Không có file nào được tải lên' }, { status: 400 });
    }

    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    
    // Tạo thư mục nếu chưa có
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }

    const savedFiles = [];
    
    for (const file of files) {
      if (typeof file === 'object' && 'arrayBuffer' in file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(UPLOAD_DIR, file.name);
        await fs.writeFile(filePath, buffer);
        savedFiles.push(file.name);
      }
    }

    // Simulate SourceIndexerAgent indexing process
    return NextResponse.json({
      status: 'success',
      sources_read: savedFiles.length,
      indexes: savedFiles.map(name => `index_for_${name}`),
      warnings: []
    });

  } catch (error) {
    console.error('Lỗi khi index sources:', error);
    return NextResponse.json({ error: 'Lỗi server khi xử lý tài liệu' }, { status: 500 });
  }
}
