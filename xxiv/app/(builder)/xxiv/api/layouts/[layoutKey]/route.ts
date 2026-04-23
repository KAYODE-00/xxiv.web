import { NextRequest, NextResponse } from 'next/server';
import { getBuilderTemplateByKey, updateBuilderTemplate, softDeleteBuilderTemplate } from '@/lib/repositories/builderTemplateRepository';
import { layoutTemplates } from '@/lib/templates/layouts';

async function buildUniqueLayoutKey(baseKey: string, currentId: string): Promise<string> {
  const staticKeys = new Set(Object.keys(layoutTemplates));
  let candidate = baseKey;
  let counter = 2;

  while (staticKeys.has(candidate)) {
    candidate = `${baseKey}-${counter}`;
    counter += 1;
  }

  while (true) {
    const existing = await getBuilderTemplateByKey(candidate);
    if (!existing || existing.id === currentId) {
      return candidate;
    }
    candidate = `${baseKey}-${counter}`;
    counter += 1;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ layoutKey: string }> }
) {
  try {
    const { layoutKey } = await params;
    const { newLayoutKey, newLayoutName, category } = await request.json();

    if (!layoutKey || !newLayoutKey || !newLayoutName || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const existingLayout = await getBuilderTemplateByKey(layoutKey);
    if (!existingLayout || existingLayout.type !== 'layout') {
      return NextResponse.json(
        { error: `DB-backed layout '${layoutKey}' not found` },
        { status: 404 }
      );
    }

    const uniqueLayoutKey = await buildUniqueLayoutKey(newLayoutKey, existingLayout.id);
    const updatedLayout = await updateBuilderTemplate(existingLayout.id, {
      key: uniqueLayoutKey,
      name: newLayoutName,
      category,
    });

    return NextResponse.json({
      data: updatedLayout,
      message: 'Layout updated successfully',
    });
  } catch (error) {
    console.error('Error updating layout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update layout' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ layoutKey: string }> }
) {
  try {
    const { layoutKey } = await params;

    if (!layoutKey) {
      return NextResponse.json(
        { error: 'Layout key is required' },
        { status: 400 }
      );
    }

    const existingLayout = await getBuilderTemplateByKey(layoutKey);
    if (!existingLayout || existingLayout.type !== 'layout') {
      return NextResponse.json(
        { error: `DB-backed layout '${layoutKey}' not found` },
        { status: 404 }
      );
    }

    await softDeleteBuilderTemplate(existingLayout.id);

    return NextResponse.json({
      data: { layoutKey },
      message: 'Layout deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting layout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete layout' },
      { status: 500 }
    );
  }
}
