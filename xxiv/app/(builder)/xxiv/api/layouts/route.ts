import { NextRequest, NextResponse } from 'next/server';
import { getAssetsByIds } from '@/lib/repositories/assetRepository';
import { getComponentsByIds } from '@/lib/repositories/componentRepository';
import { createBuilderTemplate, getBuilderTemplateByKey } from '@/lib/repositories/builderTemplateRepository';
import { layoutTemplates } from '@/lib/templates/layouts';
import type { Asset, Layer } from '@/types';
import { collectComponentIds } from '@/lib/component-utils';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'layout';
}

async function buildUniqueLayoutKey(baseKey: string): Promise<string> {
  const staticKeys = new Set(Object.keys(layoutTemplates));
  let candidate = baseKey;
  let counter = 2;

  while (staticKeys.has(candidate) || await getBuilderTemplateByKey(candidate)) {
    candidate = `${baseKey}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'application/octet-stream';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function collectIconAssetIds(layer: Layer): string[] {
  const assetIds: string[] = [];

  if (layer.name === 'icon' && layer.variables?.icon?.src) {
    const iconSrc = layer.variables.icon.src as { type: string; data?: { asset_id?: string } };
    if (iconSrc.type === 'asset' && iconSrc.data?.asset_id) {
      assetIds.push(iconSrc.data.asset_id);
    }
  }

  if (layer.children) {
    for (const child of layer.children) {
      assetIds.push(...collectIconAssetIds(child));
    }
  }

  return assetIds;
}

function inlineIconAssets(layer: Layer, assetsMap: Record<string, { content?: string | null }>): Layer {
  const newLayer = { ...layer };

  if (newLayer.name === 'icon' && newLayer.variables?.icon?.src) {
    const iconSrc = newLayer.variables.icon.src as { type: string; data?: { asset_id?: string } };
    if (iconSrc.type === 'asset' && iconSrc.data?.asset_id) {
      const asset = assetsMap[iconSrc.data.asset_id];
      if (asset?.content) {
        newLayer.variables = {
          ...newLayer.variables,
          icon: {
            ...newLayer.variables.icon,
            src: {
              type: 'static_text',
              data: { content: asset.content },
            },
          },
        };
      }
    }
  }

  if (newLayer.children) {
    newLayer.children = newLayer.children.map(child => inlineIconAssets(child, assetsMap));
  }

  return newLayer;
}

function inlineComponents(
  layer: Layer,
  componentsMap: Record<string, { name: string; layers: Layer[]; variables?: any[] }>
): Layer {
  const newLayer = { ...layer };

  if (newLayer.componentId) {
    const component = componentsMap[newLayer.componentId];
    if (component && component.layers?.length > 0) {
      (newLayer as any)._inlinedComponentName = component.name;
      if (component.variables?.length) {
        (newLayer as any)._inlinedComponentVariables = component.variables;
      }
      delete newLayer.componentId;
      newLayer.children = component.layers.map(child =>
        inlineComponents({ ...child }, componentsMap)
      );
    }
  }

  if (newLayer.children && !newLayer.componentId) {
    newLayer.children = newLayer.children.map(child => inlineComponents(child, componentsMap));
  }

  return newLayer;
}

function collectMediaAssetIds(layer: Layer): string[] {
  const assetIds: string[] = [];

  const checkVar = (variable: any) => {
    if (variable?.type === 'asset' && variable?.data?.asset_id) {
      assetIds.push(variable.data.asset_id);
    }
  };

  checkVar(layer.variables?.image?.src);
  checkVar(layer.variables?.video?.src);
  checkVar(layer.variables?.video?.poster);
  checkVar(layer.variables?.audio?.src);
  checkVar(layer.variables?.backgroundImage?.src);

  if (layer.children) {
    for (const child of layer.children) {
      assetIds.push(...collectMediaAssetIds(child));
    }
  }

  return assetIds;
}

function inlineMediaAssets(layer: Layer, assetsMap: Record<string, Asset>): Layer {
  const newLayer = { ...layer };

  const replaceAssetVar = (variable: any): any => {
    if (variable?.type === 'asset' && variable?.data?.asset_id) {
      const asset = assetsMap[variable.data.asset_id];
      if (asset?.public_url) {
        return { type: 'dynamic_text', data: { content: asset.public_url } };
      }
    }
    return variable;
  };

  if (newLayer.variables) {
    const vars = { ...newLayer.variables };

    if (vars.image?.src) {
      vars.image = { ...vars.image, src: replaceAssetVar(vars.image.src) };
    }
    if (vars.video?.src) {
      vars.video = { ...vars.video, src: replaceAssetVar(vars.video.src) };
    }
    if (vars.video?.poster) {
      vars.video = { ...vars.video, poster: replaceAssetVar(vars.video.poster) };
    }
    if (vars.audio?.src) {
      vars.audio = { ...vars.audio, src: replaceAssetVar(vars.audio.src) };
    }
    if (vars.backgroundImage?.src) {
      vars.backgroundImage = { ...vars.backgroundImage, src: replaceAssetVar(vars.backgroundImage.src) };
    }

    newLayer.variables = vars;
  }

  if (newLayer.children) {
    newLayer.children = newLayer.children.map(child => inlineMediaAssets(child, assetsMap));
  }

  return newLayer;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const rawLayoutKey = (formData.get('layoutKey') as string) || '';
    const layoutName = (formData.get('layoutName') as string) || '';
    const category = (formData.get('category') as string) || '';
    const templateStr = formData.get('template') as string;
    const imageFile = formData.get('image') as File | null;

    if (!layoutName || !category || !templateStr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let template = JSON.parse(templateStr) as Layer;

    const componentIds = Array.from(collectComponentIds([template]));
    if (componentIds.length > 0) {
      try {
        const componentsMap = await getComponentsByIds(componentIds);
        template = inlineComponents(template, componentsMap);
      } catch (error) {
        console.warn('Warning: Could not inline components:', error);
      }
    }

    const iconAssetIds = collectIconAssetIds(template);
    if (iconAssetIds.length > 0) {
      try {
        const assetsMap = await getAssetsByIds(iconAssetIds, false);
        template = inlineIconAssets(template, assetsMap);
      } catch (error) {
        console.warn('Warning: Could not inline icon assets:', error);
      }
    }

    const mediaAssetIds = collectMediaAssetIds(template);
    if (mediaAssetIds.length > 0) {
      try {
        const assetsMap = await getAssetsByIds(mediaAssetIds, false);
        template = inlineMediaAssets(template, assetsMap);
      } catch (error) {
        console.warn('Warning: Could not inline media assets:', error);
      }
    }

    const baseLayoutKey = slugify(rawLayoutKey || layoutName);
    const layoutKey = await buildUniqueLayoutKey(baseLayoutKey);
    const previewImageUrl = imageFile ? await fileToDataUrl(imageFile) : null;

    const createdTemplate = await createBuilderTemplate({
      key: layoutKey,
      name: layoutName,
      type: 'layout',
      category,
      preview_image_url: previewImageUrl,
      source: 'user',
      tags: [category.toLowerCase()],
      template,
      is_system: false,
      is_published: true,
    });

    return NextResponse.json({
      data: createdTemplate,
      message: 'Layout saved successfully',
    });
  } catch (error) {
    console.error('Error saving layout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save layout' },
      { status: 500 }
    );
  }
}
