import { notFound, redirect, permanentRedirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { buildSlugPath } from '@/lib/page-utils';
import { generatePageMetadata, fetchGlobalPageSettings } from '@/lib/generate-page-metadata';
import { fetchHomepage, fetchPageByPath, fetchErrorPage } from '@/lib/page-fetcher';
import PageRenderer from '@/components/PageRenderer';
import PasswordForm from '@/components/PasswordForm';
import { getSettingByKey } from '@/lib/repositories/settingsRepository';
import { parseAuthCookie, getPasswordProtection, fetchFoldersForAuth } from '@/lib/page-auth';
import { getSiteBaseUrl } from '@/lib/url-utils';
import type { Page, PageFolder, Translation, Redirect as RedirectType } from '@/types';
import { cookies } from 'next/headers';

// Static by default for performance, dynamic only when pagination is requested
export const revalidate = false; // Cache indefinitely until publish invalidates
export const dynamicParams = true;

type XxivSiteRouteContext = {
  siteId?: string;
  siteSlug?: string;
  pageSlugPath: string;
  pagePathname: string;
  isXxivSiteRoute: boolean;
};

/**
 * Generate static params for known published pages
 * This tells Next.js which pages to pre-render
 * Includes both default locale paths and translated paths for all locales
 */
export async function generateStaticParams() {
  try {
    const supabase = await getSupabaseAdmin();

    if (!supabase) {
      return [];
    }

    // Get all published pages and folders (excluding soft-deleted)
    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null);

    const { data: folders } = await supabase
      .from('page_folders')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null);

    // Get all active locales
    const { data: locales } = await supabase
      .from('locales')
      .select('*')
      .is('deleted_at', null);

    // Get all published translations
    const { data: translations } = await supabase
      .from('translations')
      .select('*')
      .eq('is_published', true)
      .is('deleted_at', null);

    if (!pages || !folders) {
      return [];
    }

    const params: { slug: string[] }[] = [];

    // Build translations map for easier lookup
    const translationsMap: Record<string, Record<string, Translation>> = {};
    if (translations) {
      for (const translation of translations) {
        if (!translationsMap[translation.locale_id]) {
          translationsMap[translation.locale_id] = {};
        }
        const key = `${translation.source_type}:${translation.source_id}:${translation.content_key}`;
        translationsMap[translation.locale_id][key] = translation;
      }
    }

    // Generate localized homepage paths (e.g., /fr/, /es/)
    if (locales) {
      for (const locale of locales) {
        if (locale.is_default) continue; // Skip default locale (/ is handled by app/page.tsx)
        params.push({ slug: [locale.code] });
      }
    }

    // Generate params for each non-dynamic page
    for (const page of pages) {
      // Skip dynamic pages - they are handled dynamically at request time
      if (page.is_dynamic) {
        continue;
      }

      // Generate default locale path (no locale prefix)
      const defaultPath = buildSlugPath(page, folders as PageFolder[], 'page');
      const defaultSegments = defaultPath.slice(1).split('/').filter(Boolean);

      // Skip empty paths (homepage is handled by app/page.tsx)
      if (defaultSegments.length > 0) {
        params.push({ slug: defaultSegments });
      }

      // Generate translated paths for non-default locales
      if (locales) {
        for (const locale of locales) {
          if (locale.is_default) continue; // Skip default locale

          const localeTranslations = translationsMap[locale.id] || {};

          // Build localized path with translated slugs
          const slugParts: string[] = [locale.code];

          // Add translated folder path
          let currentFolderId = page.page_folder_id;
          const folderSegments: string[] = [];
          while (currentFolderId) {
            const folder = folders.find(f => f.id === currentFolderId);
            if (!folder) break;

            const translationKey = `folder:${folder.id}:slug`;
            const translatedSlug = localeTranslations[translationKey]?.content_value || folder.slug;
            folderSegments.unshift(translatedSlug);

            currentFolderId = folder.page_folder_id;
          }
          slugParts.push(...folderSegments);

          // Add page's own slug
          if (!page.is_index && page.slug) {
            const pageKey = `page:${page.id}:slug`;
            const translatedSlug = localeTranslations[pageKey]?.content_value || page.slug;
            slugParts.push(translatedSlug);
          }

          const localizedSegments = slugParts.filter(Boolean);
          if (localizedSegments.length > 1) { // Must have at least locale + something
            params.push({ slug: localizedSegments });
          }
        }
      }
    }

    return params;
  } catch (error) {
    console.error('Failed to generate static params:', error);
    return [];
  }
}

/**
 * Fetch published page and layers data from database
 * Cached per slug and page for revalidation
 */
async function fetchPublishedPageWithLayers(slugPath: string, xxivSiteId?: string) {
  try {
    return await unstable_cache(
      async () => fetchPageByPath(slugPath, true, undefined, undefined, xxivSiteId),
      [`data-for-route-/${xxivSiteId ?? 'default'}/${slugPath}`],
      {
        tags: ['all-pages', `route-/${xxivSiteId ?? 'default'}/${slugPath}`],
        revalidate: false,
      }
    )();
  } catch {
    // Fallback to uncached fetch when data exceeds cache size limit (2MB).
    // If runtime credentials are unavailable (e.g. build-time), return null.
    try {
      return await fetchPageByPath(slugPath, true, undefined, undefined, xxivSiteId);
    } catch {
      return null;
    }
  }
}

async function fetchPublishedRouteData(slugPath: string, xxivSiteId?: string) {
  if (slugPath) {
    return fetchPublishedPageWithLayers(slugPath, xxivSiteId);
  }

  const homepageData = await fetchHomepage(true, undefined, undefined, undefined, xxivSiteId);
  if (!homepageData) return null;

  return {
    ...homepageData,
    collectionItem: undefined,
    collectionFields: undefined,
  };
}

async function resolveXxivSiteId(searchParams?: Promise<Record<string, string | string[] | undefined>>) {
  const resolvedSearchParams = await searchParams;
  const fromQuery = resolvedSearchParams?.xxiv_site_id;

  if (typeof fromQuery === 'string' && fromQuery) {
    return fromQuery;
  }

  const cookieStore = await cookies();
  return cookieStore.get('xxiv_site_id')?.value;
}

async function resolveXxivSiteFromSlugPath(slug: string | string[]): Promise<XxivSiteRouteContext> {
  const segments = (Array.isArray(slug) ? slug : [slug]).filter(Boolean);
  const joinedSlugPath = segments.join('/');

  if (segments.length === 0) {
    return {
      pageSlugPath: joinedSlugPath,
      pagePathname: joinedSlugPath ? `/${joinedSlugPath}` : '/',
      isXxivSiteRoute: false,
    };
  }

  const supabase = await getSupabaseAdmin();
  if (!supabase) {
    return {
      pageSlugPath: joinedSlugPath,
      pagePathname: `/${joinedSlugPath}`,
      isXxivSiteRoute: false,
    };
  }

  const candidateSiteSlug = segments[0];
  const { data: site } = await supabase
    .from('xxiv_sites')
    .select('id, slug')
    .eq('slug', candidateSiteSlug)
    .eq('is_published', true)
    .maybeSingle();

  if (!site) {
    return {
      pageSlugPath: joinedSlugPath,
      pagePathname: `/${joinedSlugPath}`,
      isXxivSiteRoute: false,
    };
  }

  const innerSegments = segments.slice(1);
  const pageSlugPath = innerSegments.join('/');

  return {
    siteId: site.id,
    siteSlug: site.slug,
    pageSlugPath,
    pagePathname: pageSlugPath ? `/${pageSlugPath}` : '/',
    isXxivSiteRoute: true,
  };
}

async function fetchCachedRedirects(): Promise<RedirectType[] | null> {
  try {
    return await unstable_cache(
      async () => getSettingByKey('redirects') as Promise<RedirectType[] | null>,
      ['data-for-redirects'],
      { tags: ['all-pages'], revalidate: false }
    )();
  } catch {
    return null;
  }
}

async function fetchCachedGlobalSettings() {
  try {
    return await unstable_cache(
      async () => fetchGlobalPageSettings(),
      ['data-for-global-settings'],
      { tags: ['all-pages'], revalidate: false }
    )();
  } catch {
    return {
      googleSiteVerification: null,
      globalCanonicalUrl: null,
      gaMeasurementId: null,
      publishedCss: null,
      colorVariablesCss: null,
      globalCustomCodeHead: null,
      globalCustomCodeBody: null,
      xxivBadge: true,
      faviconUrl: null,
      webClipUrl: null,
    };
  }
}

async function fetchCachedFoldersForAuth() {
  try {
    return await unstable_cache(
      async () => fetchFoldersForAuth(true),
      ['data-for-auth-folders'],
      { tags: ['all-pages'], revalidate: false }
    )();
  } catch {
    return [];
  }
}

async function fetchCachedErrorPage(errorCode: 401 | 404) {
  try {
    return await unstable_cache(
      async () => fetchErrorPage(errorCode, true),
      [`data-for-error-page-${errorCode}`],
      { tags: ['all-pages'], revalidate: false }
    )();
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string | string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ params, searchParams }: PageProps) {
  // Await params
  const { slug } = await params;
  const xxivSiteIdFromSearch = await resolveXxivSiteId(searchParams);

  // Handle catch-all slug (join array into path)
  const slugPath = Array.isArray(slug) ? slug.join('/') : slug;
  
  // Resolve site context
  const xxivSiteRoute = await resolveXxivSiteFromSlugPath(slug);

  // If a cookie or search param exists, it might override the site context,
  // but we still strip the slug from the path if they match.
  if (xxivSiteIdFromSearch && !xxivSiteRoute.siteId) {
    xxivSiteRoute.siteId = xxivSiteIdFromSearch;
    xxivSiteRoute.isXxivSiteRoute = true;
  }

  const xxivSiteId = xxivSiteRoute.siteId;
  const targetSlugPath = xxivSiteRoute.pageSlugPath;

  console.log(`[XXIV Route] Path: /${slugPath}, SiteID: ${xxivSiteId}, TargetSlug: ${targetSlugPath}, isSite: ${xxivSiteRoute.isXxivSiteRoute}`);

  // Check for redirects before processing the page
  const currentPath = xxivSiteRoute.pagePathname;
  const redirects = await fetchCachedRedirects();
  if (redirects && Array.isArray(redirects)) {
    const matchedRedirect = redirects.find((r) => r.oldUrl === currentPath);
    if (matchedRedirect) {
      if (matchedRedirect.type === '302') {
        redirect(matchedRedirect.newUrl);
      } else {
        permanentRedirect(matchedRedirect.newUrl);
      }
    }
  }

  // Cache-first slug path; pagination is served through internal dynamic routes.
  const data = await fetchPublishedRouteData(targetSlugPath, xxivSiteId);

  // Load all global settings early so error pages also get global custom code
  const globalSettings = await fetchCachedGlobalSettings();

  // If page not found, try to show custom 404 error page
  if (!data) {
    console.warn(`[XXIV Route] 404: No data found for /${slugPath} (SiteID: ${xxivSiteId})`);
    const errorPageData = await fetchCachedErrorPage(404);

    if (errorPageData) {
      const { page: errorPage, pageLayers: errorPageLayers, components: errorComponents } = errorPageData;

      return (
        <PageRenderer
          page={errorPage}
          layers={errorPageLayers.layers || []}
          components={errorComponents}
          generatedCss={globalSettings.publishedCss || undefined}
          globalCustomCodeHead={globalSettings.globalCustomCodeHead}
          globalCustomCodeBody={globalSettings.globalCustomCodeBody}
        />
      );
    }

    // No custom 404 page, use default Next.js 404
    notFound();
  }

  const { page, pageLayers, components, collectionItem, collectionFields, locale, availableLocales, translations } = data;

  // Check password protection for this page.
  // First evaluate without cookies() so non-protected pages stay cacheable.
  const folders = await fetchCachedFoldersForAuth();
  const protectionCheck = getPasswordProtection(page, folders, null);

  // If page is protected, read auth cookie and re-check unlock state.
  if (protectionCheck.isProtected) {
    const authCookie = await parseAuthCookie();
    const protection = getPasswordProtection(page, folders, authCookie);

    // If page is protected and not unlocked, show 401 error page
    if (!protection.isUnlocked) {
      const errorPageData = await fetchCachedErrorPage(401);

      if (errorPageData) {
        const { page: errorPage, pageLayers: errorPageLayers, components: errorComponents } = errorPageData;

        return (
          <PageRenderer
            page={errorPage}
            layers={errorPageLayers.layers || []}
            components={errorComponents}
            generatedCss={globalSettings.publishedCss || undefined}
            globalCustomCodeHead={globalSettings.globalCustomCodeHead}
            globalCustomCodeBody={globalSettings.globalCustomCodeBody}
            passwordProtection={{
              pageId: protection.protectedBy === 'page' ? protection.protectedById : undefined,
              folderId: protection.protectedBy === 'folder' ? protection.protectedById : undefined,
              redirectUrl: currentPath,
              isPublished: true,
            }}
          />
        );
      }

      // Inline fallback if no custom 401 page exists
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center max-w-md px-4">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">401</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Password Protected</h2>
            <p className="text-gray-600 mb-8">Enter the password to continue.</p>
            <PasswordForm
              pageId={protection.protectedBy === 'page' ? protection.protectedById : undefined}
              folderId={protection.protectedBy === 'folder' ? protection.protectedById : undefined}
              redirectUrl={currentPath}
              isPublished={true}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <PageRenderer
      page={page}
      layers={pageLayers.layers || []}
      components={components}
      generatedCss={globalSettings.publishedCss || undefined}
      colorVariablesCss={globalSettings.colorVariablesCss || undefined}
      collectionItem={collectionItem}
      collectionFields={collectionFields}
      locale={locale}
      availableLocales={availableLocales}
      translations={translations}
      gaMeasurementId={globalSettings.gaMeasurementId}
      globalCustomCodeHead={globalSettings.globalCustomCodeHead}
      globalCustomCodeBody={globalSettings.globalCustomCodeBody}
      xxivBadge={globalSettings.xxivBadge}
    />
  );
}

// Generate metadata
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string | string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const xxivSiteIdFromSearch = await resolveXxivSiteId(searchParams);

  // Handle catch-all slug (join array into path)
  const slugPath = Array.isArray(slug) ? slug.join('/') : slug;
  const xxivSiteRoute = await resolveXxivSiteFromSlugPath(slug);

  // If a cookie or search param exists, it might override the site context,
  // but we still strip the slug from the path if they match.
  if (xxivSiteIdFromSearch && !xxivSiteRoute.siteId) {
    xxivSiteRoute.siteId = xxivSiteIdFromSearch;
    xxivSiteRoute.isXxivSiteRoute = true;
  }
  
  const xxivSiteId = xxivSiteRoute.siteId;
  const targetSlugPath = xxivSiteRoute.pageSlugPath;
  const pagePathForMeta = xxivSiteRoute.isXxivSiteRoute
    ? `/${xxivSiteRoute.siteSlug}${xxivSiteRoute.pagePathname === '/' ? '' : xxivSiteRoute.pagePathname}`
    : `/${slugPath}`;
  const fallbackTitleSource = targetSlugPath || xxivSiteRoute.siteSlug || slugPath;

  // Fetch page and global settings in parallel
  const [data, globalSettings] = await Promise.all([
    fetchPublishedRouteData(targetSlugPath, xxivSiteId),
    fetchCachedGlobalSettings(),
  ]);

  if (!data) {
    return {
      title: 'Page Not Found',
    };
  }

  // Check password protection - don't leak metadata for protected pages.
  // First check without cookies() to avoid forcing dynamic metadata for public pages.
  const folders = await fetchCachedFoldersForAuth();
  const protectionCheck = getPasswordProtection(data.page, folders, null);

  if (protectionCheck.isProtected) {
    const authCookie = await parseAuthCookie();
    const protection = getPasswordProtection(data.page, folders, authCookie);
    if (!protection.isUnlocked) {
      return {
        title: 'Password Protected',
        description: 'This page is password protected.',
        robots: { index: false, follow: false },
      };
    }
  }

  const { meta, baseUrl } = await unstable_cache(
    async () => ({
      meta: await generatePageMetadata(data.page, {
        fallbackTitle: fallbackTitleSource.charAt(0).toUpperCase() + fallbackTitleSource.slice(1),
        collectionItem: data.collectionItem,
        pagePath: pagePathForMeta,
        globalSeoSettings: globalSettings,
      }),
      baseUrl: getSiteBaseUrl({ globalCanonicalUrl: globalSettings.globalCanonicalUrl }),
    }),
    [`data-for-route-/${slugPath}-meta`],
    { tags: ['all-pages', `route-/${slugPath}`], revalidate: false }
  )();

  if (baseUrl) {
    try { meta.metadataBase = new URL(baseUrl); } catch { /* invalid URL */ }
  }

  return meta;
}
