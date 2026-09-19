import { NextRequest, NextResponse } from 'next/server';
import { CatalogExtractorService } from '@/services/catalog/catalog-extractor.service';
import { ExtractCatalogRequest } from '@/types/curriculum-catalog.types';
import { resolveUserProjectIdFromRequest } from '@/lib/user-workspace';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clientProjectId = searchParams.get('projectId') || undefined;
    const targetProject = await resolveUserProjectIdFromRequest(req, clientProjectId);

    let catalog = await CatalogExtractorService.getSavedCatalog(targetProject);
    if (!catalog) {
      catalog = CatalogExtractorService.generateStandardCatalog('Toán', 'Lớp 8', targetProject, []);
    }

    const markdownSummary = CatalogExtractorService.renderCatalogToMarkdown(catalog);

    return NextResponse.json({
      success: true,
      catalog,
      markdownSummary,
      isCached: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi lấy danh mục bài học.';
    console.error('API Error in GET /api/extract-catalog:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ExtractCatalogRequest = await req.json().catch(() => ({}));
    const targetProject = await resolveUserProjectIdFromRequest(req, body.projectId);

    const { catalog, markdownSummary, keyUsed, isCached } = await CatalogExtractorService.extractCatalog({
      ...body,
      projectId: targetProject,
    });

    return NextResponse.json({
      success: true,
      catalog,
      markdownSummary,
      keyUsed,
      isCached,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi trích xuất danh mục bài học.';
    console.error('API Error in POST /api/extract-catalog:', error);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clientProjectId = searchParams.get('projectId') || undefined;
    const targetProject = await resolveUserProjectIdFromRequest(req, clientProjectId);

    await CatalogExtractorService.clearCatalog(targetProject);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa danh mục bài học đã lưu.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi xóa danh mục bài học.';
    console.error('API Error in DELETE /api/extract-catalog:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
