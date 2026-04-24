import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-auth';
import { getImportedTemplateById, removeImportedTemplate } from '@/lib/services/templateService';
import { deleteTemplateThumbnail } from '@/lib/thumbnail-upload';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = await getImportedTemplateById(id);

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ data: template });
}

export async function DELETE(
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

  await removeImportedTemplate(id);

  try {
    await deleteTemplateThumbnail(id);
  } catch {
    // Ignore storage cleanup failures after DB delete.
  }

  return NextResponse.json({ data: { id } });
}
