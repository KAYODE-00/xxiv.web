import { NextRequest, NextResponse } from 'next/server';
import { getImportedTemplates } from '@/lib/services/templateService';

export const dynamic = 'force-dynamic';

function isLibraryUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('supabase not configured') ||
    message.includes('xxiv_templates') ||
    message.includes('relation') ||
    message.includes('schema cache') ||
    message.includes('layers') ||
    message.includes('meta')
  );
}

export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get('type');
    const category = request.nextUrl.searchParams.get('category') || undefined;
    const sourceParam = request.nextUrl.searchParams.get('source');
    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

    const type = typeParam === 'layout' || typeParam === 'block' || typeParam === 'element' ? typeParam : undefined;
    const source = sourceParam === 'flowbite' || sourceParam === 'prebuiltui' || sourceParam === 'internal' || sourceParam === 'other'
      ? sourceParam
      : undefined;

    const data = await getImportedTemplates({
      type,
      category,
      source,
      limit,
      offset,
    });

    return NextResponse.json({
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('Failed to load imported templates:', error);
    if (isLibraryUnavailableError(error)) {
      return NextResponse.json({ data: [], count: 0, meta: { unavailable: true } });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load template blocks' },
      { status: 500 },
    );
  }
}
