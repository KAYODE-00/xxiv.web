import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { fetchHomepage, fetchErrorPage } from '@/lib/page-fetcher';
import PageRenderer from '@/components/PageRenderer';
import PasswordForm from '@/components/PasswordForm';
import { generatePageMetadata, fetchGlobalPageSettingsForSite } from '@/lib/generate-page-metadata';
import { parseAuthCookie, getPasswordProtection, fetchFoldersForAuth } from '@/lib/page-auth';
import { enforceSiteLogin } from '@/lib/xxiv/site-auth-guard';
import { getSupabasePublicConfig } from '@/lib/xxiv/site-context';
import { getSiteBaseUrl } from '@/lib/url-utils';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

// Static by default for performance, dynamic only when pagination is requested
export const revalidate = false; // Cache indefinitely until publish invalidates

/**
 * Fetch homepage data from database
 * Cached with tag-based revalidation (no time-based stale cache)
 */
async function fetchPublishedHomepage(xxivSiteId?: string) {
  try {
    return await unstable_cache(
      async () => fetchHomepage(true, undefined, undefined, undefined, xxivSiteId),
      [`data-for-route-/${xxivSiteId ?? 'default'}`],
      {
        tags: ['all-pages', `route-/${xxivSiteId ?? 'default'}`],
        revalidate: false,
      }
    )();
  } catch {
    // Fallback to uncached fetch when data exceeds cache size limit (2MB).
    // If runtime credentials are unavailable (e.g. build-time), return null.
    try {
      return await fetchHomepage(true, undefined, undefined, undefined, xxivSiteId);
    } catch {
      return null;
    }
  }
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

async function fetchCachedGlobalSettings(xxivSiteId?: string) {
  try {
    return await unstable_cache(
      async () => fetchGlobalPageSettingsForSite(xxivSiteId),
      [`data-for-global-settings-${xxivSiteId ?? 'default'}`],
      { tags: ['all-pages', `site-settings-${xxivSiteId ?? 'default'}`], revalidate: false }
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

async function fetchCachedErrorPage(errorCode: 401) {
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

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const xxivSiteId = await resolveXxivSiteId(searchParams);

  // Cache-first homepage path; pagination is served through internal dynamic routes.
  const data = await fetchPublishedHomepage(xxivSiteId);

  // Public published sites should never bounce visitors into the dashboard.
  // If the site has no published homepage yet, fail as a public 404 instead.
  if (!data || !data.pageLayers) {
    notFound();
  }

  // Load all global settings early so error pages also get global custom code
  const globalSettings = await fetchCachedGlobalSettings(xxivSiteId);
  const siteAuth = xxivSiteId ? await getSupabasePublicConfig() : null;

  if (data.page.settings?.requireSiteLogin) {
    await enforceSiteLogin(data.page.settings, xxivSiteId, '/');
  } else {
    const folders = await fetchCachedFoldersForAuth();
    const protectionCheck = getPasswordProtection(data.page, folders, null);

    if (protectionCheck.isProtected) {
      const authCookie = await parseAuthCookie();
      const protection = getPasswordProtection(data.page, folders, authCookie);

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
                redirectUrl: '/',
                isPublished: true,
              }}
            />
          );
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center max-w-md px-4">
              <h1 className="text-6xl font-bold text-gray-900 mb-4">401</h1>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Password Protected</h2>
              <p className="text-gray-600 mb-8">Enter the password to continue.</p>
              <PasswordForm
                pageId={protection.protectedBy === 'page' ? protection.protectedById : undefined}
                folderId={protection.protectedBy === 'folder' ? protection.protectedById : undefined}
                redirectUrl="/"
                isPublished={true}
              />
            </div>
          </div>
        );
      }
    }
  }

  // Render homepage
  return (
    <PageRenderer
      page={data.page}
      layers={data.pageLayers.layers || []}
      components={data.components}
      generatedCss={globalSettings.publishedCss || undefined}
      colorVariablesCss={globalSettings.colorVariablesCss || undefined}
      locale={data.locale}
      availableLocales={data.availableLocales}
      translations={data.translations}
      gaMeasurementId={globalSettings.gaMeasurementId}
      globalCustomCodeHead={globalSettings.globalCustomCodeHead}
      globalCustomCodeBody={globalSettings.globalCustomCodeBody}
      xxivBadge={globalSettings.xxivBadge}
      siteAuth={siteAuth && xxivSiteId ? { siteId: xxivSiteId, supabaseUrl: siteAuth.url, supabaseAnonKey: siteAuth.anonKey } : null}
    />
  );
}

// Generate metadata
export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const xxivSiteId = await resolveXxivSiteId(searchParams);

  // Fetch page and global settings in parallel
  const [data, globalSettings] = await Promise.all([
    fetchPublishedHomepage(xxivSiteId),
    fetchCachedGlobalSettings(xxivSiteId),
  ]);

  if (!data) {
    return {
      title: 'Xxiv',
      description: 'Built with Xxiv',
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
        fallbackTitle: 'Home',
        pagePath: '/',
        globalSeoSettings: globalSettings,
      }),
      baseUrl: getSiteBaseUrl({ globalCanonicalUrl: globalSettings.globalCanonicalUrl }),
    }),
    ['data-for-route-/-meta'],
    { tags: ['all-pages', 'route-/'], revalidate: false }
  )();

  if (baseUrl) {
    try { meta.metadataBase = new URL(baseUrl); } catch { /* invalid URL */ }
  }

  return meta;
}
