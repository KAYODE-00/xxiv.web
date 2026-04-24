import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-auth';
import { runTemplatePipeline } from '@/lib/xxiv/template-pipeline/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { html, name, source, category, tags } = body as {
      html?: string;
      name?: string;
      source?: 'flowbite' | 'prebuiltui' | 'internal' | 'other';
      category?: string;
      tags?: string[];
    };

    if (!html?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'html and name are required' }, { status: 400 });
    }

    if (html.length > 500_000) {
      return NextResponse.json({ error: 'HTML too large. Max 500KB.' }, { status: 400 });
    }

    const result = await runTemplatePipeline({
      html,
      name,
      source: source || 'other',
      category,
      tags: Array.isArray(tags) ? tags : [],
    });

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    );
  }
}
