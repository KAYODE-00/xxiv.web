import { unstable_noStore } from 'next/cache';
import Link from 'next/link';
import { fetchHomepage, fetchErrorPage, PaginationContext } from '@/lib/page-fetcher';
import PageRenderer from '@/components/PageRenderer';
import PasswordForm from '@/components/PasswordForm';
import { fetchGlobalPageSettingsForSite } from '@/lib/generate-page-metadata';
import { parseAuthCookie, getPasswordProtection, fetchFoldersForAuth } from '@/lib/page-auth';
import { getScopedSettingByKey } from '@/lib/repositories/settingsRepository';
import { enforceSiteLogin } from '@/lib/xxiv/site-auth-guard';
import { getSupabasePublicConfig } from '@/lib/xxiv/site-context';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Internal pagination path: always dynamic/no-store.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DynamicHomeProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DynamicHome({ searchParams }: DynamicHomeProps) {
  const resolvedSearchParams = await searchParams;

  const pageNumbers: Record<string, number> = {};
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (key.startsWith('p_') && typeof value === 'string') {
      const strippedId = key.slice(2);
      const layerId = strippedId.startsWith('lyr-') ? strippedId : `lyr-${strippedId}`;
      const pageNum = parseInt(value, 10);
      if (!isNaN(pageNum) && pageNum >= 1) {
        pageNumbers[layerId] = pageNum;
      }
    }
  }

  unstable_noStore();

  const cookieStore = await cookies();
  const xxivSiteId = typeof resolvedSearchParams.xxiv_site_id === 'string'
    ? resolvedSearchParams.xxiv_site_id
    : cookieStore.get('xxiv_site_id')?.value;

  const paginationContext: PaginationContext = {
    pageNumbers,
    defaultPage: 1,
  };

  const data = await fetchHomepage(true, paginationContext, undefined, undefined, xxivSiteId);

  if (!data || !data.pageLayers) {
    return  redirect('/dashboard');
  }

  if (data.page.settings?.requireSiteLogin) {
    await enforceSiteLogin(data.page.settings, xxivSiteId, '/');
  } else {
    const folders = await fetchFoldersForAuth(true);
    const protectionCheck = getPasswordProtection(data.page, folders, null);

    if (protectionCheck.isProtected) {
      const authCookie = await parseAuthCookie();
      const protection = getPasswordProtection(data.page, folders, authCookie);

      if (!protection.isUnlocked) {
        const errorPageData = await fetchErrorPage(401, true);
        const publishedCSS = await getScopedSettingByKey('published_css', xxivSiteId);

        if (errorPageData) {
          const { page: errorPage, pageLayers: errorPageLayers, components: errorComponents } = errorPageData;

          return (
            <PageRenderer
              page={errorPage}
              layers={errorPageLayers.layers || []}
              components={errorComponents}
              generatedCss={publishedCSS}
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

  const globalSettings = await fetchGlobalPageSettingsForSite(xxivSiteId);
  const siteAuth = xxivSiteId ? await getSupabasePublicConfig() : null;

  return (
    <PageRenderer
      page={data.page}
      layers={data.pageLayers.layers || []}
      components={[]}
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
