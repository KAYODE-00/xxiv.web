import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createAiBuilderMcpClient, callMcpTool } from '@/lib/ai-builder/mcp';
import type {
  AiBuilderCollectionField,
  AiBuilderPage,
  AiBuilderProgressStage,
  AiBuilderSection,
  AiBuilderSitePlan,
} from '@/lib/ai-builder/types';
import { setXxivSiteHomePage } from '@/lib/xxiv/site-management';

export type XxivSiteRecord = {
  id: string;
  name: string;
  user_id: string;
  slug: string;
  home_page_id: string | null;
  mcp_token: string | null;
  mcp_url: string | null;
};

type PageRecord = {
  id: string;
  name: string;
  slug: string;
};

type LayersResult = Array<Record<string, unknown>>;

const SECTION_LAYOUTS: Record<AiBuilderSection['type'], string> = {
  hero: 'hero-002',
  features: 'features-011',
  about: 'features-002',
  services: 'features-003',
  pricing: 'pricing-001',
  testimonials: 'testimonials-002',
  contact: 'features-002',
  footer: 'footer-002',
  gallery: 'features-006',
  faq: 'faq-001',
};

function slugToPageSlug(slug: string) {
  return slug === '/' ? '' : slug.replace(/^\/+/, '');
}

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function flattenLayers(layers: Array<Record<string, unknown>>, acc: Array<Record<string, unknown>> = []) {
  for (const layer of layers) {
    acc.push(layer);
    const children = Array.isArray(layer.children) ? (layer.children as Array<Record<string, unknown>>) : [];
    flattenLayers(children, acc);
  }
  return acc;
}

function getLayerId(layer: Record<string, unknown>) {
  return typeof layer.id === 'string' ? layer.id : null;
}

function getLayerName(layer: Record<string, unknown>) {
  return typeof layer.name === 'string' ? layer.name : '';
}

function getLayerTag(layer: Record<string, unknown>) {
  const settings = layer.settings;
  if (!settings || typeof settings !== 'object') return '';
  return typeof (settings as Record<string, unknown>).tag === 'string'
    ? ((settings as Record<string, unknown>).tag as string)
    : '';
}

function findBodyLayerId(layers: Array<Record<string, unknown>>) {
  return flattenLayers(layers).find((layer) => getLayerName(layer) === 'body')?.id as string | undefined;
}

function findSectionLayerId(layers: Array<Record<string, unknown>>, sectionId: string) {
  return flattenLayers(layers).find((layer) => getLayerId(layer) === sectionId)?.id as string | undefined;
}

function classifyTextTargets(sectionLayers: Array<Record<string, unknown>>) {
  const all = flattenLayers(sectionLayers);
  const headings = all.filter((layer) => {
    const tag = getLayerTag(layer);
    return getLayerName(layer) === 'text' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
  });
  const paragraphs = all.filter((layer) => {
    const tag = getLayerTag(layer);
    return getLayerName(layer) === 'text' && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'].includes(tag);
  });
  const buttonTexts = all.filter((layer) => getLayerName(layer) === 'text' && getLayerTag(layer) === 'span');
  const buttonLayers = all.filter((layer) => getLayerName(layer) === 'button');

  return { headings, paragraphs, buttonTexts, buttonLayers };
}

export async function ensureSiteTokens(site: XxivSiteRecord, origin: string) {
  if (site.mcp_token) {
    return {
      token: site.mcp_token,
      url: site.mcp_url || `${origin}/xxiv/mcp/${site.mcp_token}`,
    };
  }

  const admin = await getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const token = `ymc_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const tokenPrefix = token.slice(0, 12);
  const url = `${origin}/xxiv/mcp/${token}`;

  const { error: tokenError } = await admin
    .from('mcp_tokens')
    .insert({
      name: `${site.name} AI Builder`,
      token,
      token_prefix: tokenPrefix,
    });

  if (tokenError) {
    throw new Error(`Failed to create MCP token: ${tokenError.message}`);
  }

  const { error: siteError } = await admin
    .from('xxiv_sites')
    .update({
      mcp_token: token,
      mcp_url: url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', site.id);

  if (siteError) {
    throw new Error(`Failed to attach MCP token to site: ${siteError.message}`);
  }

  return { token, url };
}

async function safeToolCall(
  client: Awaited<ReturnType<typeof createAiBuilderMcpClient>>['client'],
  name: string,
  args: Record<string, unknown>,
  onError: (message: string) => Promise<void>,
) {
  try {
    return await callMcpTool(client, name, args);
  } catch (error) {
    await onError(`[${name}] ${error instanceof Error ? error.message : 'Unknown MCP error'}`);
    return null;
  }
}

async function styleSection(
  client: Awaited<ReturnType<typeof createAiBuilderMcpClient>>['client'],
  pageId: string,
  sectionId: string,
  section: AiBuilderSection,
  sitePlan: AiBuilderSitePlan,
  onError: (message: string) => Promise<void>,
) {
  const layers = await safeToolCall(client, 'get_layers', { page_id: pageId }, onError) as LayersResult | null;
  if (!layers) return;

  const sectionLayerId = findSectionLayerId(layers, sectionId);
  if (!sectionLayerId) return;

  const sectionLayer = flattenLayers(layers).find((layer) => getLayerId(layer) === sectionLayerId);
  const sectionLayers = sectionLayer ? [sectionLayer] : [];
  const { headings, paragraphs, buttonTexts, buttonLayers } = classifyTextTargets(sectionLayers);

  if (headings[0]?.id) {
    await safeToolCall(client, 'update_layer_text', {
      page_id: pageId,
      layer_id: headings[0].id,
      text: section.heading || titleCase(section.type),
    }, onError);

    await safeToolCall(client, 'update_layer_design', {
      page_id: pageId,
      layer_id: headings[0].id,
      design: {
        typography: {
          isActive: true,
          color: sitePlan.palette.text,
          fontFamily: sitePlan.fonts.heading,
        },
      },
    }, onError);
  }

  if (headings[1]?.id && section.subheading) {
    await safeToolCall(client, 'update_layer_text', {
      page_id: pageId,
      layer_id: headings[1].id,
      text: section.subheading,
    }, onError);
  }

  if (paragraphs[0]?.id && section.body) {
    await safeToolCall(client, 'update_layer_text', {
      page_id: pageId,
      layer_id: paragraphs[0].id,
      text: section.body,
    }, onError);

    await safeToolCall(client, 'update_layer_design', {
      page_id: pageId,
      layer_id: paragraphs[0].id,
      design: {
        typography: {
          isActive: true,
          color: sitePlan.palette.text,
          fontFamily: sitePlan.fonts.body,
        },
      },
    }, onError);
  }

  if (buttonTexts[0]?.id && section.ctaText) {
    await safeToolCall(client, 'update_layer_text', {
      page_id: pageId,
      layer_id: buttonTexts[0].id,
      text: section.ctaText,
    }, onError);
  }

  if (buttonLayers[0]?.id && section.ctaLink) {
    await safeToolCall(client, 'update_layer_link', {
      page_id: pageId,
      layer_id: buttonLayers[0].id,
      link_type: 'url',
      url: section.ctaLink,
      target: section.ctaLink.startsWith('http') ? '_blank' : '_self',
    }, onError);

    await safeToolCall(client, 'update_layer_design', {
      page_id: pageId,
      layer_id: buttonLayers[0].id,
      design: {
        backgrounds: {
          isActive: true,
          backgroundColor: sitePlan.palette.primary,
        },
        typography: {
          isActive: true,
          color: sitePlan.palette.background,
          fontFamily: sitePlan.fonts.body,
        },
      },
    }, onError);
  }

  await safeToolCall(client, 'update_layer_design', {
    page_id: pageId,
    layer_id: sectionLayerId,
    design: {
      backgrounds: {
        isActive: true,
        backgroundColor: section.type === 'footer' ? sitePlan.palette.secondary : sitePlan.palette.background,
      },
    },
  }, onError);
}

async function addContactForm(
  client: Awaited<ReturnType<typeof createAiBuilderMcpClient>>['client'],
  pageId: string,
  parentLayerId: string,
  onError: (message: string) => Promise<void>,
) {
  const form = await safeToolCall(client, 'add_layer', {
    page_id: pageId,
    parent_layer_id: parentLayerId,
    template: 'form',
    custom_name: 'AI Contact Form',
  }, onError) as { layer_id?: string } | null;

  if (!form?.layer_id) return;

  const fields = [
    { label: 'Name', placeholder: 'Your name', type: 'text', template: 'input' },
    { label: 'Email', placeholder: 'you@example.com', type: 'email', template: 'input' },
    { label: 'Message', placeholder: 'Tell us about your project', type: '', template: 'textarea' },
  ] as const;

  for (const field of fields) {
    const wrapper = await safeToolCall(client, 'add_layer', {
      page_id: pageId,
      parent_layer_id: form.layer_id,
      template: field.template,
      custom_name: `${field.label} Field`,
    }, onError) as { layer_id?: string } | null;

    if (!wrapper?.layer_id) continue;

    const label = await safeToolCall(client, 'add_layer', {
      page_id: pageId,
      parent_layer_id: wrapper.layer_id,
      template: 'heading',
      text_content: field.label,
      custom_name: `${field.label} Label`,
    }, onError) as { layer_id?: string } | null;

    if (label?.layer_id) {
      await safeToolCall(client, 'update_layer_settings', {
        page_id: pageId,
        layer_id: label.layer_id,
        tag: 'label',
      }, onError);
    }

    const input = await safeToolCall(client, 'add_layer', {
      page_id: pageId,
      parent_layer_id: wrapper.layer_id,
      template: field.template === 'textarea' ? 'textarea' : 'input',
      custom_name: `${field.label} Input`,
    }, onError) as { layer_id?: string } | null;

    if (input?.layer_id) {
      await safeToolCall(client, 'update_layer_design', {
        page_id: pageId,
        layer_id: input.layer_id,
        design: {
          backgrounds: { isActive: true, backgroundColor: '#111111' },
          borders: { isActive: true, borderColor: '#2A2A2A', borderWidth: '1px' },
          spacing: { isActive: true, paddingTop: '14px', paddingBottom: '14px', paddingLeft: '14px', paddingRight: '14px' },
          typography: { isActive: true, color: '#E8E8E8' },
          sizing: field.template === 'textarea'
            ? { isActive: true, width: '100%', minHeight: '160px' }
            : { isActive: true, width: '100%' },
        },
      }, onError);

      await safeToolCall(client, 'update_layer_settings', {
        page_id: pageId,
        layer_id: input.layer_id,
        custom_attributes: {
          placeholder: field.placeholder,
          ...(field.type ? { type: field.type } : {}),
          name: field.label.toLowerCase(),
        },
      }, onError);
    }
  }

  await safeToolCall(client, 'add_layer', {
    page_id: pageId,
    parent_layer_id: form.layer_id,
    template: 'button',
    text_content: 'Send Message',
    custom_name: 'Submit Button',
  }, onError);
}

async function createCmsCollections(
  client: Awaited<ReturnType<typeof createAiBuilderMcpClient>>['client'],
  collections: AiBuilderSitePlan['collections'],
  onError: (message: string) => Promise<void>,
) {
  if (!collections || collections.length === 0) {
    return;
  }

  const collectionIdByName = new Map<string, string>();
  const fieldIdsByCollectionName = new Map<string, Array<{ field: AiBuilderCollectionField; id: string }>>();

  for (const collection of collections) {
    const createdCollection = await safeToolCall(client, 'create_collection', {
      name: collection.name,
    }, onError) as { id?: string } | null;

    if (!createdCollection?.id) {
      continue;
    }

    collectionIdByName.set(collection.name, createdCollection.id);
  }

  for (const collection of collections) {
    const collectionId = collectionIdByName.get(collection.name);
    if (!collectionId) continue;

    const createdFields: Array<{ field: AiBuilderCollectionField; id: string }> = [];

    for (const field of collection.fields) {
      const fieldPayload: Record<string, unknown> = {
        collection_id: collectionId,
        name: field.name,
        type: field.type,
      };

      if (field.key) {
        fieldPayload.key = field.key;
      }

      if (field.referenceCollectionName) {
        const referenceCollectionId = collectionIdByName.get(field.referenceCollectionName);
        if (referenceCollectionId) {
          fieldPayload.reference_collection_id = referenceCollectionId;
        }
      }

      const createdField = await safeToolCall(client, 'add_collection_field', fieldPayload, onError) as { id?: string } | null;
      if (createdField?.id) {
        createdFields.push({ field, id: createdField.id });
      }
    }

    fieldIdsByCollectionName.set(collection.name, createdFields);
  }

  for (const collection of collections) {
    const collectionId = collectionIdByName.get(collection.name);
    const createdFields = fieldIdsByCollectionName.get(collection.name) || [];
    if (!collectionId || collection.items.length === 0 || createdFields.length === 0) {
      continue;
    }

    for (const item of collection.items) {
      const values: Record<string, unknown> = {};
      for (const { field, id } of createdFields) {
        const rawValue = item[field.key || field.name] ?? item[field.name];
        if (rawValue !== undefined) {
          values[id] = rawValue;
        }
      }

      await safeToolCall(client, 'create_collection_item', {
        collection_id: collectionId,
        values,
      }, onError);
    }
  }
}

async function preparePage(
  client: Awaited<ReturnType<typeof createAiBuilderMcpClient>>['client'],
  pageId: string,
  page: AiBuilderPage,
  sitePlan: AiBuilderSitePlan,
  onError: (message: string) => Promise<void>,
  isExistingHome = false,
) {
  if (isExistingHome) {
    await safeToolCall(client, 'update_page', {
      page_id: pageId,
      name: page.name,
      slug: slugToPageSlug(page.slug),
    }, onError);
  }

  await safeToolCall(client, 'update_page_settings', {
    page_id: pageId,
    seo: {
      title: page.seoTitle,
      description: page.seoDescription,
    },
  }, onError);

  const layers = await safeToolCall(client, 'get_layers', { page_id: pageId }, onError) as LayersResult | null;
  if (!layers) return;

  const bodyLayerId = findBodyLayerId(layers);
  if (!bodyLayerId) return;

  const bodyLayer = flattenLayers(layers).find((layer) => getLayerId(layer) === bodyLayerId);
  const bodyChildren = Array.isArray(bodyLayer?.children) ? (bodyLayer.children as Array<Record<string, unknown>>) : [];

  for (const child of bodyChildren) {
    const layerId = getLayerId(child);
    if (!layerId) continue;
    await safeToolCall(client, 'delete_layer', {
      page_id: pageId,
      layer_id: layerId,
    }, onError);
  }

  await safeToolCall(client, 'update_layer_design', {
    page_id: pageId,
    layer_id: bodyLayerId,
    design: {
      backgrounds: { isActive: true, backgroundColor: sitePlan.palette.background },
      typography: { isActive: true, color: sitePlan.palette.text, fontFamily: sitePlan.fonts.body },
    },
  }, onError);

  for (const section of page.sections) {
    const layoutKey = SECTION_LAYOUTS[section.type] || 'features-011';
    const result = await safeToolCall(client, 'add_layout', {
      page_id: pageId,
      layout_key: layoutKey,
      parent_layer_id: bodyLayerId,
    }, onError) as { section_id?: string } | null;

    if (!result?.section_id) continue;

    await styleSection(client, pageId, result.section_id, section, sitePlan, onError);

    if (section.type === 'contact') {
      const refreshedLayers = await safeToolCall(client, 'get_layers', { page_id: pageId }, onError) as LayersResult | null;
      if (refreshedLayers) {
        const sectionLayer = flattenLayers(refreshedLayers).find((layer) => getLayerId(layer) === result.section_id);
        const containerId = Array.isArray(sectionLayer?.children)
          ? getLayerId((sectionLayer.children as Array<Record<string, unknown>>)[0])
          : result.section_id;
        if (containerId) {
          await addContactForm(client, pageId, containerId, onError);
        }
      }
    }
  }
}

export async function runAiSiteBuild(params: {
  site: XxivSiteRecord;
  sitePlan: AiBuilderSitePlan;
  origin: string;
  emit: (event: string, data: Record<string, unknown>) => void;
  onError: (message: string) => Promise<void>;
}) {
  const { site, sitePlan, origin, emit, onError } = params;
  const { url: mcpUrl } = await ensureSiteTokens(site, origin);
  const mcp = await createAiBuilderMcpClient(mcpUrl);

  try {
    emit('progress', { stage: 'creating-pages' satisfies AiBuilderProgressStage, message: 'Applying site styles...' });

    const existingColors = await safeToolCall(mcp.client, 'list_color_variables', {}, onError) as Array<{ id: string; name: string }> | null;
    const paletteEntries = Object.entries(sitePlan.palette);
    for (const [name, value] of paletteEntries) {
      const existing = existingColors?.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (existing?.id) {
        await safeToolCall(mcp.client, 'update_color_variable', {
          variable_id: existing.id,
          value,
        }, onError);
      } else {
        await safeToolCall(mcp.client, 'create_color_variable', {
          name: titleCase(name),
          value,
        }, onError);
      }
    }

    await safeToolCall(mcp.client, 'add_font', { family: sitePlan.fonts.heading }, onError);
    if (sitePlan.fonts.body !== sitePlan.fonts.heading) {
      await safeToolCall(mcp.client, 'add_font', { family: sitePlan.fonts.body }, onError);
    }

    await safeToolCall(mcp.client, 'set_settings_batch', {
      settings: {
        site_name: sitePlan.globalSeo?.siteTitle || sitePlan.siteName,
        site_description: sitePlan.globalSeo?.siteDescription || `${sitePlan.siteName} website`,
      },
    }, onError);

    if (sitePlan.collections.length > 0) {
      emit('progress', {
        stage: 'creating-pages' satisfies AiBuilderProgressStage,
        message: `Creating ${sitePlan.collections.length} CMS collection${sitePlan.collections.length === 1 ? '' : 's'}...`,
      });

      await createCmsCollections(mcp.client, sitePlan.collections, onError);
    }

    let homePageId = site.home_page_id;
    let firstPageId: string | null = null;

    for (const [index, page] of sitePlan.pages.entries()) {
      emit('progress', {
        stage: 'creating-pages' satisfies AiBuilderProgressStage,
        message: `Creating page ${index + 1} of ${sitePlan.pages.length}: ${page.name}`,
        pageName: page.name,
      });

      let pageId = homePageId;
      let isExistingHome = false;

      if (page.slug === '/' && homePageId) {
        isExistingHome = true;
      } else {
        const created = await safeToolCall(mcp.client, 'create_page', {
          name: page.name,
          slug: slugToPageSlug(page.slug),
          is_index: page.slug === '/',
          xxiv_site_id: site.id,
        }, onError) as PageRecord | null;

        pageId = created?.id || null;

        if (page.slug === '/' && pageId) {
          homePageId = pageId;
          await setXxivSiteHomePage(site.id, pageId);
        }
      }

      if (!pageId) continue;
      if (!firstPageId) firstPageId = pageId;

      emit('progress', {
        stage: 'styling' satisfies AiBuilderProgressStage,
        message: `Adding content and styling for ${page.name}...`,
        pageName: page.name,
      });

      await preparePage(mcp.client, pageId, page, sitePlan, onError, isExistingHome);
    }

    emit('progress', {
      stage: 'publishing' satisfies AiBuilderProgressStage,
      message: 'Publishing your website...',
    });

    await safeToolCall(mcp.client, 'publish', {}, onError);

    emit('complete', {
      success: true,
      editorUrl: firstPageId
        ? `/xxiv/pages/${firstPageId}?xxiv_site_id=${encodeURIComponent(site.id)}`
        : `/xxiv?xxiv_site_id=${encodeURIComponent(site.id)}`,
    });
  } finally {
    await mcp.close();
  }
}
