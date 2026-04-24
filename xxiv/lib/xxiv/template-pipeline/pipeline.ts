import type { Layer } from '@/types';
import { parseHTML } from './html-parser';
import { transformNodeToLayer } from './layer-transformer';
import { detectCategory, extractBlocks, type BlockType } from './block-extractor';
import { createImportedTemplate, setImportedTemplateThumbnail } from '@/lib/services/templateService';
import { generateImportedTemplateThumbnail } from '@/lib/xxiv/template-thumbnail';

export interface PipelineInput {
  html: string;
  name: string;
  source: 'flowbite' | 'prebuiltui' | 'internal' | 'other';
  category?: string;
  tags?: string[];
}

export interface PipelineResult {
  success: boolean;
  imported: number;
  templates: Array<{ id: string; name: string; type: BlockType; category: string }>;
  errors: string[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

export async function runTemplatePipeline(input: PipelineInput): Promise<PipelineResult> {
  const errors: string[] = [];
  const templates: Array<{ id: string; name: string; type: BlockType; category: string }> = [];

  try {
    const parsed = parseHTML(input.html);
    const rootLayer = transformNodeToLayer(parsed);

    if (!rootLayer) {
      return {
        success: false,
        imported: 0,
        templates: [],
        errors: ['Failed to transform HTML into a valid layer tree.'],
      };
    }

    const blocks = extractBlocks(rootLayer, input.name);
    for (const [index, block] of blocks.entries()) {
      const category = input.category || block.category || detectCategory(block.layer);
      const slug = `${slugify(`${input.source}-${block.type}-${block.name}`)}-${Date.now().toString(36)}-${index}`;

      try {
        const created = await createImportedTemplate({
          name: block.name,
          slug,
          description: `${block.type} imported from ${input.source}`,
          category,
          tags: Array.from(new Set([...(input.tags || []), input.source, block.type, category])),
          layers: [block.layer as Layer],
          meta: {
            kind: 'imported_html_template',
            type: block.type,
            source: input.source,
            category,
            original_name: input.name,
            schema_version: 1,
            imported_at: new Date().toISOString(),
          },
        });

        templates.push({
          id: created.id,
          name: created.name,
          type: created.meta.type,
          category: created.category,
        });

        try {
          const thumbnailUrl = await generateImportedTemplateThumbnail({
            id: created.id,
            name: created.name,
            meta: created.meta,
            layers: created.layers || [],
          });
          await setImportedTemplateThumbnail(created.id, thumbnailUrl);
        } catch (thumbnailError) {
          errors.push(`Thumbnail generation skipped for "${block.name}": ${thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'}`);
        }
      } catch (error) {
        errors.push(`Failed to save "${block.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: templates.length > 0,
      imported: templates.length,
      templates,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      templates: [],
      errors: [error instanceof Error ? error.message : 'Unknown import error'],
    };
  }
}
