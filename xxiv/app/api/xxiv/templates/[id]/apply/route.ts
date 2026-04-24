import { NextResponse } from 'next/server';
import { cloneDeep, generateId } from '@/lib/utils';
import { getImportedTemplateById } from '@/lib/services/templateService';
import type { Layer } from '@/types';

export const dynamic = 'force-dynamic';

function reassignLayerTreeIds(layers: Layer[]): Layer[] {
  const clonedLayers = cloneDeep(layers);
  const idMap = new Map<string, string>();

  const assignIds = (layer: Layer): Layer => {
    const oldId = layer.id;
    const newId = generateId('lyr');
    idMap.set(oldId, newId);

    return {
      ...layer,
      id: newId,
      children: (layer.children || []).map(assignIds),
    };
  };

  const remapInteractions = (layer: Layer): Layer => {
    let nextLayer = layer;

    if (layer.interactions?.length) {
      nextLayer = {
        ...nextLayer,
        interactions: layer.interactions.map((interaction) => ({
          ...interaction,
          id: generateId('int'),
          tweens: interaction.tweens.map((tween) => ({
            ...tween,
            id: generateId('twn'),
            layer_id: idMap.get(tween.layer_id) || tween.layer_id,
          })),
        })),
      };
    }

    if (nextLayer.children?.length) {
      nextLayer = {
        ...nextLayer,
        children: nextLayer.children.map(remapInteractions),
      };
    }

    return nextLayer;
  };

  return clonedLayers.map(assignIds).map(remapInteractions);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = await getImportedTemplateById(id);

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const layers = reassignLayerTreeIds(template.layers || []);
  if (layers.length === 0) {
    return NextResponse.json({ error: 'Template has no layers' }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    layers,
    name: template.name,
  });
}
