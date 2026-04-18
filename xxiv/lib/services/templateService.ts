import { getKnexClient, closeKnexClient, testKnexConnection } from '../knex-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { STORAGE_BUCKET, STORAGE_FOLDERS } from '@/lib/asset-constants';
import { migrations } from '../migrations-loader';
import { XXIV_EXTERNAL_API_URL } from '@/lib/config';
import {
  getTemplates as getXxivTemplates,
  getTemplateById as getXxivTemplateById,
  getTemplateBySlug as getXxivTemplateBySlug,
  getTemplateLayers,
  getTemplatePages,
  type TemplateFilters,
  type XxivTemplateRecord,
} from '@/lib/repositories/templateRepository';
import { buildXxivIndexSlug } from '@/lib/xxiv/index-slug';
import { createXxivSiteRecord, setXxivSiteHomePage } from '@/lib/xxiv/site-management';
import type { Layer, PageSettings } from '@/types';

/**
 * Tables to truncate when applying a template.
 * Order matters for foreign key constraints (children first).
 */
const TABLES_TO_TRUNCATE = [
  'translations',
  'locales',
  'versions',
  'collection_item_values',
  'collection_items',
  'collection_fields',
  'collections',
  'layer_styles',
  'components',
  'page_layers',
  'pages',
  'page_folders',
];

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  stats?: {
    pages: number;
    components: number;
    collections: number;
  };
  categoryId: string | null;
  livePreviewUrl: string | null;
}

export interface TemplateDetails extends Template {
  version: string;
  createdAt: string;
  tables: string[];
}

export interface ApplyTemplateResult {
  success: boolean;
  templateName?: string;
  error?: string;
}

export interface XxivTemplate extends XxivTemplateRecord {}

export interface CloneTemplateResult {
  template: XxivTemplate;
  siteId: string;
  pageId: string;
  redirectUrl: string;
}

function namespaceTemplatePageSlug(slug: string, siteId: string, isIndex: boolean): string {
  if (isIndex) {
    return buildXxivIndexSlug(siteId);
  }

  const trimmed = (slug || '').trim();
  const base = trimmed || 'page';
  const suffix = `-${siteId.slice(0, 8)}`;
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
}

function tagPageSettingsForSite(settings: PageSettings | null | undefined, siteId: string): PageSettings {
  return {
    ...(settings || {}),
    xxiv: {
      ...((settings as PageSettings & { xxiv?: Record<string, unknown> } | null | undefined)?.xxiv || {}),
      site_id: siteId,
    },
  } as PageSettings;
}

function remapTemplateLinks(value: unknown, pageIdMap: Map<string, string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => remapTemplateLinks(item, pageIdMap));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    next[key] = remapTemplateLinks(child, pageIdMap);
  }

  if (record.type === 'page' && record.page && typeof record.page === 'object') {
    const page = { ...(next.page as Record<string, unknown>) };
    const mappedPageId =
      typeof page.id === 'string'
        ? pageIdMap.get(page.id) || page.id
        : undefined;

    if (mappedPageId) {
      page.id = mappedPageId;
      next.page = page;
    }
  }

  return next;
}

export async function getTemplates(filters: TemplateFilters = {}): Promise<XxivTemplate[]> {
  const templates = await getXxivTemplates(filters);

  if (!filters.query?.trim()) {
    return templates;
  }

  const query = filters.query.trim().toLowerCase();
  return templates.filter((template) => {
    const haystack = [
      template.name,
      template.description,
      template.category,
      ...(template.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export async function getFeaturedTemplates(): Promise<XxivTemplate[]> {
  return getXxivTemplates({ featuredOnly: true, publishedOnly: true, limit: 6 });
}

export async function getTemplateBySlug(slug: string): Promise<XxivTemplate | null> {
  return getXxivTemplateBySlug(slug);
}

export async function getTemplateById(id: string): Promise<XxivTemplate | null> {
  return getXxivTemplateById(id);
}

export async function cloneTemplateToUserSite(templateId: string, userId: string): Promise<CloneTemplateResult> {
  const admin = await getSupabaseAdmin();

  if (!admin) {
    throw new Error('Supabase not configured');
  }

  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const templatePages = await getTemplatePages(template.id);
  if (templatePages.length === 0) {
    throw new Error('Template has no pages');
  }

  const templateLayers = await getTemplateLayers(templatePages.map((page) => page.id));
  const layersByTemplatePageId = new Map(
    templateLayers.map((entry) => [entry.template_page_id, entry])
  );

  const site = await createXxivSiteRecord(userId, template.name);
  const pageIdMap = new Map<string, string>();
  const createdPages: Array<{ id: string; is_index: boolean; page_order: number }> = [];

  for (const templatePage of templatePages) {
    const slug = namespaceTemplatePageSlug(templatePage.slug, site.id, templatePage.is_index);
    const { data: createdPage, error: pageError } = await admin
      .from('pages')
      .insert({
        name: templatePage.name,
        slug,
        page_folder_id: null,
        is_index: templatePage.is_index,
        is_dynamic: false,
        depth: 0,
        order: templatePage.page_order,
        is_published: false,
        xxiv_site_id: site.id,
        settings: tagPageSettingsForSite(templatePage.settings, site.id),
      })
      .select('id, is_index, order')
      .single();

    if (pageError || !createdPage) {
      throw new Error(pageError?.message || 'Failed to create template page');
    }

    pageIdMap.set(templatePage.id, createdPage.id);
    createdPages.push({
      id: createdPage.id,
      is_index: createdPage.is_index,
      page_order: createdPage.order,
    });
  }

  for (const templatePage of templatePages) {
    const newPageId = pageIdMap.get(templatePage.id);
    if (!newPageId) {
      continue;
    }

    const templateLayerEntry = layersByTemplatePageId.get(templatePage.id);
    const clonedLayers = remapTemplateLinks(templateLayerEntry?.layers || [], pageIdMap) as Layer[];
    const { error: layersError } = await admin
      .from('page_layers')
      .insert({
        page_id: newPageId,
        layers: clonedLayers,
        is_published: false,
      });

    if (layersError) {
      throw new Error(layersError.message);
    }
  }

  const homePage =
    createdPages.find((page) => page.is_index) ||
    createdPages.sort((a, b) => a.page_order - b.page_order)[0];

  if (!homePage) {
    throw new Error('Failed to resolve homepage');
  }

  await setXxivSiteHomePage(site.id, homePage.id);

  return {
    template,
    siteId: site.id,
    pageId: homePage.id,
    redirectUrl: `/xxiv/pages/${homePage.id}?xxiv_site_id=${site.id}&template_loaded=1`,
  };
}

/**
 * List available templates and categories from the template service
 */
export async function listTemplatesWithCategories(): Promise<{
  templates: Template[];
  categories: TemplateCategory[];
}> {
  const response = await fetch(`${XXIV_EXTERNAL_API_URL}/api/templates`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }

  const data = await response.json();
  return {
    templates: data.templates || [],
    categories: data.categories || [],
  };
}

/**
 * List available templates from the template service
 * @deprecated Use listTemplatesWithCategories instead
 */
export async function listTemplates(): Promise<Template[]> {
  const { templates } = await listTemplatesWithCategories();
  return templates;
}

/**
 * List template categories from the template service
 * @deprecated Use listTemplatesWithCategories instead
 */
export async function listCategories(): Promise<TemplateCategory[]> {
  const { categories } = await listTemplatesWithCategories();
  return categories;
}

/**
 * Get template details from the template service
 */
export async function getTemplate(id: string): Promise<TemplateDetails | null> {
  const response = await fetch(`${XXIV_EXTERNAL_API_URL}/api/templates/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch template');
  }

  const data = await response.json();
  return data.template;
}

/**
 * Copy template assets from the template-service CDN to the user's storage.
 * This ensures assets are owned by the user and won't break if template is deleted.
 *
 * @param knex - Knex transaction or client
 */
async function copyTemplateAssetsToUserStorage(knex: ReturnType<typeof getKnexClient> extends Promise<infer T> ? T : never): Promise<void> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    console.warn('[copyTemplateAssets] Supabase not configured, skipping asset copy');
    return;
  }

  // Find all template assets that need to be copied (have public_url but no storage_path)
  const templateAssets = await knex('assets')
    .whereNotNull('public_url')
    .whereNull('storage_path')
    .where('source', 'like', 'template:%')
    .select('id', 'filename', 'public_url', 'mime_type');

  if (templateAssets.length === 0) {
    return;
  }

  for (const asset of templateAssets) {
    try {
      // Download from template-service CDN with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response: Response;
      try {
        response = await fetch(asset.public_url, { signal: controller.signal });
      } catch (fetchErr) {
        clearTimeout(timeout);
        console.warn(`[copyTemplateAssets] Failed to fetch ${asset.filename}:`, fetchErr);
        continue;
      }
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[copyTemplateAssets] Failed to download ${asset.filename}: ${response.status}`);
        continue;
      }

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      // Generate unique storage path
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const extension = asset.filename.split('.').pop() || 'bin';
      const storagePath = `${STORAGE_FOLDERS.WEBSITE}/${timestamp}-${random}.${extension}`;

      // Upload to user's storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: asset.mime_type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.warn(`[copyTemplateAssets] Failed to upload ${asset.filename}:`, error);
        continue;
      }

      // Get new public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      // Update asset record with new storage path and URL
      await knex('assets')
        .where('id', asset.id)
        .update({
          storage_path: data.path,
          public_url: urlData.publicUrl,
        });
    } catch (err) {
      console.warn(`[copyTemplateAssets] Error copying ${asset.filename}:`, err);
    }
  }
}

/**
 * Get migrations that need to be run for a template.
 * Returns all migrations that come AFTER the template's lastMigration.
 *
 * @param templateLastMigration - The last migration the template was created with
 * @returns Array of migrations to run
 */
function getPendingMigrationsForTemplate(
  templateLastMigration: string | null | undefined
): typeof migrations {
  // If no lastMigration, return all migrations (template predates tracking)
  if (!templateLastMigration) {
    return migrations;
  }

  // Find the index of the template's last migration
  const templateIndex = migrations.findIndex(
    (m) => m.name === templateLastMigration
  );

  if (templateIndex === -1) {
    // Migration not found - could be a newer version or renamed
    // Conservative approach: assume template is up-to-date
    return [];
  }

  // Return all migrations AFTER the template's last migration
  return migrations.slice(templateIndex + 1);
}

/**
 * Run pending migrations for a template.
 * This ensures template data is transformed to match the current schema.
 *
 * @param knex - Knex client
 * @param templateLastMigration - The last migration the template was created with
 */
async function runPendingMigrationsForTemplate(
  knex: Awaited<ReturnType<typeof getKnexClient>>,
  templateLastMigration: string | null | undefined
): Promise<void> {
  const pendingMigrations = getPendingMigrationsForTemplate(templateLastMigration);

  if (pendingMigrations.length === 0) {
    return;
  }

  for (const migration of pendingMigrations) {
    try {
      await migration.up(knex);
    } catch (error) {
      // Log the error but continue - migrations should be idempotent
      // Schema changes (ADD COLUMN IF NOT EXISTS) will no-op
      // Data changes should use WHERE clauses that are safe on new data
      console.warn(`[runPendingMigrations] Migration ${migration.name} failed (may be expected for schema-only migrations):`, error);
    }
  }
}

/**
 * Apply a template to the database
 *
 * This will:
 * 1. Fetch the processed SQL from the template service
 * 2. Clear previous template assets (keep user uploads)
 * 3. Truncate content tables
 * 4. Execute the template INSERT statements
 * 5. Copy template assets to user's storage
 *
 * @param templateId - The template ID to apply
 * @param tenantId - Optional tenant ID for cloud multi-tenant
 */
export async function applyTemplate(
  templateId: string,
  tenantId?: string
): Promise<ApplyTemplateResult> {
  // Test database connection first
  const canConnect = await testKnexConnection();
  if (!canConnect) {
    return {
      success: false,
      error: 'Cannot connect to database. Please check your configuration.',
    };
  }

  const knex = await getKnexClient();

  try {
    // 1. Fetch processed SQL from template service
    const response = await fetch(
      `${XXIV_EXTERNAL_API_URL}/api/templates/${templateId}/apply`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to fetch template',
      };
    }

    const { template, sql } = await response.json();

    // 2. Execute in a transaction for atomicity
    await knex.transaction(async (trx) => {
      // Disable FK constraints temporarily for truncation
      await trx.raw('SET session_replication_role = replica');

      // 2a. Clear previous template assets (keep user uploads) - only if table exists
      const assetsTableExists = await trx.schema.hasTable('assets');
      if (assetsTableExists) {
        await trx.raw(sql.clearPreviousTemplate);
      }

      // 2b. Clean up empty asset folders from previous template - only if tables exist
      const assetFoldersTableExists = await trx.schema.hasTable('asset_folders');
      if (assetFoldersTableExists && assetsTableExists) {
        await trx.raw(`
          DELETE FROM asset_folders
          WHERE id NOT IN (
            SELECT DISTINCT asset_folder_id FROM assets
            WHERE asset_folder_id IS NOT NULL
          )
          AND id NOT IN (
            SELECT DISTINCT asset_folder_id FROM asset_folders
            WHERE asset_folder_id IS NOT NULL
          )
        `);
      }

      // 2c. Truncate content tables (only tables that exist)
      const existingTables: string[] = [];
      for (const table of TABLES_TO_TRUNCATE) {
        const exists = await trx.schema.hasTable(table);
        if (exists) {
          existingTables.push(table);
        }
      }
      if (existingTables.length > 0) {
        await trx.raw(`TRUNCATE ${existingTables.join(', ')} CASCADE;`);
      }

      // 2d. Insert template data
      await trx.raw(sql.insert);

      // Re-enable FK constraints
      await trx.raw('SET session_replication_role = DEFAULT');
    });

    // 3. Copy template assets to user's storage (outside transaction)
    // This happens after template data is committed, so partial asset failures
    // won't roll back the template
    await copyTemplateAssetsToUserStorage(knex);

    // 4. Run any pending migrations for this template
    // This transforms template data to match the current schema
    // (migrations should be idempotent - schema changes no-op, data changes use safe WHERE clauses)
    await runPendingMigrationsForTemplate(knex, template.lastMigration);

    return {
      success: true,
      templateName: template.name,
    };
  } catch (error) {
    console.error('[applyTemplate] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Template application failed',
    };
  } finally {
    await closeKnexClient();
  }
}
