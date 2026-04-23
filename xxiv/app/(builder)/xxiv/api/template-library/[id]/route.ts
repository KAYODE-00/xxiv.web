import { NextRequest, NextResponse } from 'next/server';
import { getBuilderTemplateById, softDeleteBuilderTemplate, updateBuilderTemplate } from '@/lib/repositories/builderTemplateRepository';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getBuilderTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ data: template });
  } catch (error) {
    console.error('Failed to fetch builder template:', error);
    return NextResponse.json({ error: 'Failed to fetch builder template' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateBuilderTemplate(id, body);
    return NextResponse.json({ data: updated, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Failed to update builder template:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update builder template' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await softDeleteBuilderTemplate(id);
    return NextResponse.json({ data: { id }, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Failed to delete builder template:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete builder template' }, { status: 500 });
  }
}
