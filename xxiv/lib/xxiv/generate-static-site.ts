import 'server-only';

import type {
  CollectionField,
  CollectionItemWithValues,
  Component,
  Layer,
  Page,
  PageFolder,
} from '@/types';
import { buildCustomFontsCss, buildFontClassesCss, getGoogleFontLinks } from '@/lib/font-utils';
import { fetchGlobalPageSettings } from '@/lib/generate-page-metadata';
import {
  layerToHtml,
  resolveAllAssets,
  resolveCollectionLayers,
  resolveRichTextCollections,
} from '@/lib/page-fetcher';
import { buildDynamicPageUrl, buildSlugPath } from '@/lib/page-utils';
import { getAllComponents } from '@/lib/repositories/componentRepository';
import { getFieldsByCollectionId } from '@/lib/repositories/collectionFieldRepository';
import { getItemsWithValues } from '@/lib/repositories/collectionItemRepository';
import { generateColorVariablesCss } from '@/lib/repositories/colorVariableRepository';
import { getPublishedFonts } from '@/lib/repositories/fontRepository';
import { getPublishedLayers } from '@/lib/repositories/pageLayersRepository';
import { getAllPages } from '@/lib/repositories/pageRepository';
import { getAllPageFolders } from '@/lib/repositories/pageFolderRepository';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateCssFromLayers } from '@/lib/server/cssGenerator';
import { resolveComponents } from '@/lib/resolve-components';

export interface GeneratedSiteFiles {
  'index.html': string;
  'styles.css': string;
  [key: string]: string;
}

type DynamicPageEntry = {
  page: Page;
  item: CollectionItemWithValues;
  fields: CollectionField[];
};

type RenderablePageEntry =
  | { page: Page; kind: 'static' }
  | { page: Page; kind: 'dynamic'; item: CollectionItemWithValues; fields: CollectionField[] };

export async function generateStaticSite(siteId: string): Promise<GeneratedSiteFiles> {
  const [allPages, allFoldersRaw, components, globalSettings, fonts, colorVariablesCss] = await Promise.all([
    getAllPages({ is_published: true }, siteId),
    getAllPageFolders({ is_published: true }),
    getAllComponents(true),
    fetchGlobalPageSettings(),
    getPublishedFonts(),
    generateColorVariablesCss(),
  ]);

  const sitePages = await getPublishedSitePages(siteId, allPages);
  if (sitePages.length === 0) {
    throw new Error('No published pages found. Publish the site content first.');
  }

  const folderIds = new Set<string>();
  for (const page of sitePages) {
    let currentFolderId = page.page_folder_id;
    while (currentFolderId) {
      folderIds.add(currentFolderId);
      const folder = allFoldersRaw.find((entry) => entry.id === currentFolderId);
      currentFolderId = folder?.page_folder_id ?? null;
    }
  }
  const allFolders = allFoldersRaw.filter((folder) => folderIds.has(folder.id));

  const dynamicEntries = await getDynamicPageEntries(sitePages);
  const renderEntries: RenderablePageEntry[] = [
    ...sitePages.filter((page) => !page.is_dynamic).map((page) => ({ page, kind: 'static' as const })),
    ...dynamicEntries.map(({ page, item, fields }) => ({ page, kind: 'dynamic' as const, item, fields })),
  ];

  const files: GeneratedSiteFiles = {
    'index.html': '',
    'styles.css': '',
  };

  const allResolvedLayers: Layer[] = [];
  const pageOutputs = await Promise.all(
    renderEntries.map(async (entry) => {
      const publishedLayers = await getPublishedLayers(entry.page.id);
      if (!publishedLayers?.layers?.length) {
        return null;
      }

      const layersWithComponents = resolveComponents(publishedLayers.layers || [], components);
      let resolvedLayers = await resolveCollectionLayers(layersWithComponents, true);
      resolvedLayers = await resolveRichTextCollections(resolvedLayers, components, true);
      const resolvedAssets = await resolveAllAssets(resolvedLayers, true, components);
      resolvedLayers = resolvedAssets.layers;
      allResolvedLayers.push(...resolvedLayers);

      const collectionItemSlugs = await buildCollectionItemSlugsMap(sitePages, entry, components, resolvedLayers);
      const bodyHtml = resolvedLayers
        .map((layer) =>
          layerToHtml(
            layer,
            entry.kind === 'dynamic' ? entry.item.id : undefined,
            sitePages,
            allFolders,
            collectionItemSlugs,
            null,
            {},
            {},
            entry.kind === 'dynamic' ? entry.item.values : undefined,
            entry.kind === 'dynamic' ? entry.item.values : undefined,
            resolvedAssets.assetMap,
            undefined,
            components,
          ),
        )
        .join('\n');

      const pageCss = publishedLayers.generated_css || '';
      const title = getPageSeoTitle(entry.page);
      const description = getPageSeoDescription(entry.page);
      const noindex = Boolean(entry.page.settings?.seo?.noindex);
      const customHeadCode = entry.page.settings?.custom_code?.head || '';
      const customBodyCode = entry.page.settings?.custom_code?.body || '';
      const routePath = getOutputRoutePath(
        entry.page,
        allFolders,
        entry.kind === 'dynamic' ? entry.item : null,
        entry.kind === 'dynamic' ? entry.fields : undefined,
      );

      return {
        routePath,
        html: buildHtmlDocument({
          title,
          description,
          noindex,
          bodyHtml,
          pageCss,
          stylesHref: relativeStylesHref(routePath),
          gaId: globalSettings.gaMeasurementId || null,
          faviconUrl: globalSettings.faviconUrl || null,
          globalHeadCode: globalSettings.globalCustomCodeHead || '',
          customHeadCode,
          globalBodyCode: globalSettings.globalCustomCodeBody || '',
          customBodyCode,
          fontsCss: buildCustomFontsCss(fonts) + buildFontClassesCss(fonts),
          googleFontLinkUrls: getGoogleFontLinks(fonts),
          colorVariablesCss: colorVariablesCss || '',
        }),
      };
    }),
  );

  const globalCss = await generateCssFromLayers(allResolvedLayers, components);
  files['styles.css'] = [globalCss, colorVariablesCss || ''].filter(Boolean).join('\n');

  for (const output of pageOutputs) {
    if (!output) continue;
    const filePath = output.routePath === '/' ? 'index.html' : `${trimSlashes(output.routePath)}/index.html`;
    files[filePath] = output.html;
    if (filePath === 'index.html') {
      files['index.html'] = output.html;
    }
  }

  if (!files['index.html']) {
    const firstGeneratedPage = pageOutputs.find((output): output is NonNullable<typeof output> => Boolean(output));
    if (firstGeneratedPage) {
      files['index.html'] = firstGeneratedPage.html;
    } else {
      const fallbackPage = sitePages.find((page) => page.is_index) || sitePages[0];
      files['index.html'] = buildHtmlDocument({
        title: fallbackPage?.name || 'My Site',
        description: '',
        noindex: false,
        bodyHtml: '<main><h1>Published site</h1></main>',
        pageCss: '',
        stylesHref: '/styles.css',
        gaId: globalSettings.gaMeasurementId || null,
        faviconUrl: globalSettings.faviconUrl || null,
        globalHeadCode: globalSettings.globalCustomCodeHead || '',
        customHeadCode: '',
        globalBodyCode: globalSettings.globalCustomCodeBody || '',
        customBodyCode: '',
        fontsCss: buildCustomFontsCss(fonts) + buildFontClassesCss(fonts),
        googleFontLinkUrls: getGoogleFontLinks(fonts),
        colorVariablesCss: colorVariablesCss || '',
      });
    }
  }

  files['_headers'] = `/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=3600

/styles.css
  Cache-Control: public, max-age=86400
`;

  return files;
}

async function getPublishedSitePages(siteId: string, preloadedPages: Page[]): Promise<Page[]> {
  const directPages = preloadedPages.filter((page) => page.xxiv_site_id === siteId && page.error_page === null);
  if (directPages.length > 0) {
    return directPages;
  }

  const admin = await getSupabaseAdmin();
  if (!admin) {
    return [];
  }

  const { data: legacyPages, error } = await admin
    .from('pages')
    .select('*')
    .eq('is_published', true)
    .is('deleted_at', null)
    .contains('settings', { xxiv: { site_id: siteId } });

  if (error) {
    throw new Error(`Failed to load published site pages: ${error.message}`);
  }

  return (legacyPages || []).filter((page) => page.error_page === null);
}

async function getDynamicPageEntries(sitePages: Page[]): Promise<DynamicPageEntry[]> {
  const entries = await Promise.all(
    sitePages
      .filter((page) => page.is_dynamic && page.settings?.cms?.collection_id)
      .map(async (page) => {
        const collectionId = page.settings?.cms?.collection_id;
        if (!collectionId) return [];

        const [fields, { items }] = await Promise.all([
          getFieldsByCollectionId(collectionId, true),
          getItemsWithValues(collectionId, true),
        ]);

        return items.map((item) => ({ page, item, fields }));
      }),
  );

  return entries.flat();
}

async function buildCollectionItemSlugsMap(
  sitePages: Page[],
  entry: RenderablePageEntry,
  components: Component[],
  resolvedLayers: Layer[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  if (entry.kind === 'dynamic') {
    const slugField = entry.fields.find((field) => field.key === 'slug');
    const slugValue = slugField ? entry.item.values?.[slugField.id] : null;
    if (slugField && slugValue) {
      map[entry.item.id] = slugValue;
    }
  }

  const collectionIds = new Set<string>();
  for (const page of sitePages) {
    const collectionId = page.settings?.cms?.collection_id;
    if (collectionId) collectionIds.add(collectionId);
  }

  if (collectionIds.size === 0) return map;

  const collections = await Promise.all(
    Array.from(collectionIds).map(async (collectionId) => {
      const [fields, { items }] = await Promise.all([
        getFieldsByCollectionId(collectionId, true),
        getItemsWithValues(collectionId, true),
      ]);
      return { fields, items };
    }),
  );

  for (const collection of collections) {
    const slugField = collection.fields.find((field) => field.key === 'slug');
    if (!slugField) continue;
    for (const item of collection.items) {
      const slugValue = item.values?.[slugField.id];
      if (slugValue) {
        map[item.id] = slugValue;
      }
    }
  }

  for (const layer of resolvedLayers) {
    collectStoredCollectionItemSlugs(layer, map);
  }

  return map;
}

function collectStoredCollectionItemSlugs(layer: Layer, map: Record<string, string>) {
  if (layer._collectionItemId && layer._collectionItemSlug) {
    map[layer._collectionItemId] = layer._collectionItemSlug;
  }

  for (const child of layer.children || []) {
    collectStoredCollectionItemSlugs(child, map);
  }
}

function getOutputRoutePath(
  page: Page,
  folders: PageFolder[],
  item: CollectionItemWithValues | null,
  fields?: CollectionField[],
): string {
  if (page.is_dynamic && item && fields) {
    const slugField = fields.find((field) => field.key === 'slug');
    const slugValue = slugField ? item.values?.[slugField.id] || null : null;
    return buildDynamicPageUrl(page, folders, slugValue) || '/';
  }

  return buildSlugPath(page, folders, 'page') || '/';
}

function relativeStylesHref(routePath: string): string {
  if (routePath === '/') return '/styles.css';
  const depth = trimSlashes(routePath).split('/').length;
  return `${'../'.repeat(depth)}styles.css`;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function getPageSeoTitle(page: Page): string {
  return page.settings?.seo?.title || page.name || 'My Site';
}

function getPageSeoDescription(page: Page): string {
  return page.settings?.seo?.description || '';
}

function buildHtmlDocument(opts: {
  title: string;
  description: string;
  noindex: boolean;
  bodyHtml: string;
  pageCss: string;
  stylesHref: string;
  gaId: string | null;
  faviconUrl: string | null;
  globalHeadCode: string;
  customHeadCode: string;
  globalBodyCode: string;
  customBodyCode: string;
  fontsCss: string;
  googleFontLinkUrls: string[];
  colorVariablesCss: string;
}): string {
  const {
    title,
    description,
    noindex,
    bodyHtml,
    pageCss,
    stylesHref,
    gaId,
    faviconUrl,
    globalHeadCode,
    customHeadCode,
    globalBodyCode,
    customBodyCode,
    fontsCss,
    googleFontLinkUrls,
    colorVariablesCss,
  } = opts;

  const robotsTag = noindex ? '<meta name="robots" content="noindex, nofollow">' : '';
  const faviconTag = faviconUrl ? `<link rel="icon" href="${escapeHtml(faviconUrl)}">` : '';
  const gaScript = gaId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(gaId)}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${escapeJsString(gaId)}');
</script>`
    : '';
  const fontLinks = googleFontLinkUrls
    .map((url) => `<link rel="stylesheet" href="${escapeHtml(url)}">`)
    .join('\n');
  const inlinePageCss = pageCss ? `<style>${pageCss}</style>` : '';
  const inlineFontCss = fontsCss ? `<style>${fontsCss}</style>` : '';
  const inlineColorCss = colorVariablesCss ? `<style>${colorVariablesCss}</style>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
  ${robotsTag}
  ${faviconTag}
  <link rel="stylesheet" href="${stylesHref}">
  ${fontLinks}
  ${inlineFontCss}
  ${inlineColorCss}
  ${inlinePageCss}
  ${gaScript}
  ${globalHeadCode}
  ${customHeadCode}
</head>
<body>
  ${bodyHtml}
  ${globalBodyCode}
  ${customBodyCode}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
