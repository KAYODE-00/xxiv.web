import { NextRequest, NextResponse } from 'next/server';
import { getAllDraftPages } from '@/lib/repositories/pageRepository';
import { getAllDraftLayers } from '@/lib/repositories/pageLayersRepository';
import { getAllPageFolders } from '@/lib/repositories/pageFolderRepository';
import { getAllComponents } from '@/lib/repositories/componentRepository';
import { getAllStyles } from '@/lib/repositories/layerStyleRepository';
import { getAllSettings } from '@/lib/repositories/settingsRepository';
import { getAllCollections } from '@/lib/repositories/collectionRepository';
import { getAllLocales } from '@/lib/repositories/localeRepository';
import { getAllAssets } from '@/lib/repositories/assetRepository';
import { getAllAssetFolders } from '@/lib/repositories/assetFolderRepository';
import { getAllFonts } from '@/lib/repositories/fontRepository';
import { getMapboxAccessToken, getGoogleMapsEmbedApiKey } from '@/lib/map-server';
import { createServerClient } from '@supabase/ssr';
import { stripXxivIndexSlug } from '@/lib/xxiv/index-slug';

function getSupabaseEnvConfig(): { url: string; anonKey: string } | null {
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const connectionUrl = process.env.SUPABASE_CONNECTION_URL;
  if (!anonKey || !connectionUrl) return null;
  const match = connectionUrl.match(/\/\/postgres\.([a-z0-9]+):/);
  if (!match) return null;
  return { url: `https://${match[1]}.supabase.co`, anonKey };
}

function pageBelongsToXxivSite(page: any, siteId: string) {
  const settings = page?.settings;
  const tagged = settings?.xxiv?.site_id;
  if (typeof tagged === 'string' && tagged === siteId) return true;
  if (typeof page?.xxiv_site_id === 'string' && page.xxiv_site_id === siteId) return true;
  return false;
}

function pageIsGlobalErrorPage(page: any, siteId: string) {
  if (page?.error_page == null) return false;
  const tagged = page?.settings?.xxiv?.site_id;
  const ownerId = page?.xxiv_site_id;
  const hasOwner = typeof ownerId === 'string' && ownerId.length > 0;
  return !hasOwner && (tagged == null || tagged === siteId);
}

function stripXxivSlugSuffix(slug: string, siteId: string): string {
  const suffix = `-${siteId.slice(0, 8)}`;
  if (typeof slug !== 'string') return slug as any;
  if (slug.endsWith(suffix)) {
    return slug.slice(0, -suffix.length);
  }
  return slug;
}

function normalizeXxivPageSlugForResponse(page: any, siteId: string): any {
  const cleaned = stripXxivSlugSuffix(page.slug, siteId);
  return { ...page, slug: stripXxivIndexSlug(cleaned, siteId) };
}

/**
 * GET /ycode/api/editor/init
 * Get all initial data for the editor in one request:
 * - All draft (non-published) pages
 * - All draft layers
 * - All page folders
 * - All components
 * - All layer styles
 * - All settings
 * - All collections
 * - All locales
 * - All assets
 * - All asset folders
 * - All fonts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const xxivSiteId =
      searchParams.get('xxiv_site_id') || request.cookies.get('xxiv_site_id')?.value || null;

    // Load all data in parallel (only drafts for editor)
    const [pages, drafts, folders, components, styles, settings, collections, locales, assets, assetFolders, fonts, resolvedMapboxToken, resolvedGoogleMapsEmbedKey] = await Promise.all([
      getAllDraftPages(),
      getAllDraftLayers(),
      getAllPageFolders({ is_published: false }),
      getAllComponents(),
      getAllStyles(),
      getAllSettings(),
      getAllCollections(),
      getAllLocales(),
      getAllAssets(),
      getAllAssetFolders(false),
      getAllFonts(),
      getMapboxAccessToken(),
      getGoogleMapsEmbedApiKey(),
    ]);

    // Optional XXIV scoping: when a site is provided, limit the builder data
    // (pages/layers) to pages tagged with settings.xxiv.site_id = siteId.
    if (xxivSiteId) {
      const config = getSupabaseEnvConfig();
      if (!config) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
      }

      // Verify user session and site ownership via RLS.
      const supabase = createServerClient(config.url, config.anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          },
        },
      });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const { data: site, error: siteError } = await supabase
        .from('xxiv_sites')
        .select('id')
        .eq('id', xxivSiteId)
        .single();

      if (siteError || !site?.id) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 });
      }

      const scopedPages = (pages || [])
        .filter((p) => pageBelongsToXxivSite(p, xxivSiteId) || pageIsGlobalErrorPage(p, xxivSiteId))
        .map((p) => normalizeXxivPageSlugForResponse(p, xxivSiteId));
      const allowedPageIds = new Set(scopedPages.map((p) => p.id));
      const scopedDrafts = (drafts || []).filter((d) => allowedPageIds.has(d.page_id));

      // Reuse token-injection logic for scoped responses too.
      const enrichedSettings = [...settings];
      const injectedTokens: [string, string, string | null][] = [
        ['app:mapbox:access_token', 'mapbox_access_token', resolvedMapboxToken],
        ['app:google-maps-embed:api_key', 'google_maps_embed_api_key', resolvedGoogleMapsEmbedKey],
      ];
      for (const [id, key, value] of injectedTokens) {
        if (value) {
          enrichedSettings.push({
            id,
            key,
            value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({
        data: {
          pages: scopedPages,
          drafts: scopedDrafts,
          folders: [], // XXIV sites do not use page_folders
          components,
          styles,
          settings: enrichedSettings,
          collections,
          locales,
          assets,
          assetFolders,
          fonts,
        },
      });
    }

    // Inject app-sourced tokens into settings so they're available via settingsByKey
    const enrichedSettings = [...settings];
    const injectedTokens: [string, string, string | null][] = [
      ['app:mapbox:access_token', 'mapbox_access_token', resolvedMapboxToken],
      ['app:google-maps-embed:api_key', 'google_maps_embed_api_key', resolvedGoogleMapsEmbedKey],
    ];
    for (const [id, key, value] of injectedTokens) {
      if (value) {
        enrichedSettings.push({
          id,
          key,
          value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      data: {
        pages,
        drafts,
        folders,
        components,
        styles,
        settings: enrichedSettings,
        collections,
        locales,
        assets,
        assetFolders,
        fonts,
      },
    });
  } catch (error) {
    console.error('Error loading editor data:', error);
    return NextResponse.json(
      { error: 'Failed to load editor data' },
      { status: 500 }
    );
  }
}
