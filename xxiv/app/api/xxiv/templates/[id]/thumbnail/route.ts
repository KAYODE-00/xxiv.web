import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-auth';
import { getImportedTemplateById, setImportedTemplateThumbnail } from '@/lib/services/templateService';
import { generateImportedTemplateThumbnail } from '@/lib/xxiv/template-thumbnail';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const template = await getImportedTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const thumbnailUrl = await generateImportedTemplateThumbnail({
    id: template.id,
    name: template.name,
    meta: template.meta,
    layers: template.layers || [],
  });

  await setImportedTemplateThumbnail(template.id, thumbnailUrl);

  return NextResponse.json({ data: { thumbnail_url: thumbnailUrl } });
}
