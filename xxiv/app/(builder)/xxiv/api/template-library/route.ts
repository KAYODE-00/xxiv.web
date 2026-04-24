import { NextRequest, NextResponse } from 'next/server';
import { createBuilderTemplate, listBuilderTemplates } from '@/lib/repositories/builderTemplateRepository';

function isLibraryUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    message.includes('supabase not configured') ||
    message.includes('xxiv_builder_templates') ||
    message.includes('builder templates') ||
    message.includes('relation') ||
    message.includes('schema cache')
  );
}

export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get('type');
    const type = typeParam === 'layout' || typeParam === 'element' ? typeParam : undefined;
    const templates = await listBuilderTemplates(type);
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('Failed to load builder template library:', error);
    if (isLibraryUnavailableError(error)) {
      return NextResponse.json({
        data: [],
        meta: {
          unavailable: true,
          reason: error instanceof Error ? error.message : 'Template library unavailable',
        },
      });
    }

    return NextResponse.json({ error: 'Failed to load builder template library' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const template = await createBuilderTemplate(body);
    return NextResponse.json({ data: template, message: 'Template saved successfully' });
  } catch (error) {
    console.error('Failed to create builder template:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create builder template' }, { status: 500 });
  }
}
