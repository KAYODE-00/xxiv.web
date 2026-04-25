import Link from 'next/link';
import { fetchHomepage, fetchErrorPage } from '@/lib/page-fetcher';
import PageRenderer from '@/components/PageRenderer';
import PasswordForm from '@/components/PasswordForm';
import { getScopedSettingsByKeys } from '@/lib/repositories/settingsRepository';
import { generateColorVariablesCss } from '@/lib/repositories/colorVariableRepository';
import { generatePageMetadata } from '@/lib/generate-page-metadata';
import { parseAuthCookie, getPasswordProtection, fetchFoldersForAuth } from '@/lib/page-auth';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

async function fetchPreviewDraftCss() {
  const cookieStore = await cookies();
  const xxivSiteId = cookieStore.get('xxiv_site_id')?.value || null;
  const settings = await getScopedSettingsByKeys(['draft_css'], xxivSiteId);
  return (settings.draft_css as string) || undefined;
}

// Force dynamic rendering - no caching for preview
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedSearchParams = await searchParams;
  const siteFromQuery = typeof resolvedSearchParams?.xxiv_site_id === 'string'
    ? resolvedSearchParams.xxiv_site_id
    : undefined;
  const cookieStore = await cookies();
  const xxivSiteId = siteFromQuery || cookieStore.get('xxiv_site_id')?.value || undefined;
  // Fetch draft homepage data (no caching)
  const data = await fetchHomepage(false, undefined, undefined, undefined, xxivSiteId);

  // If no homepage, show default landing page
  if (!data || !data.pageLayers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Xxiv Preview
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            No homepage found. Create an index page in the builder.
          </p>
          <Link
            href="/xxiv"
            className="inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open Builder →
          </Link>
        </div>
      </div>
    );
  }

  // Fetch draft CSS and color variables
  const [draftCSS, colorVariablesCss] = await Promise.all([
    fetchPreviewDraftCss(),
    generateColorVariablesCss(),
  ]);

  // Check password protection for homepage (using all folders for preview)
  const folders = await fetchFoldersForAuth(false);
  const authCookie = await parseAuthCookie();
  const protection = getPasswordProtection(data.page, folders, authCookie);

  // If homepage is protected and not unlocked, show 401 error page
  if (protection.isProtected && !protection.isUnlocked) {
    const errorPageData = await fetchErrorPage(401, false);

    if (errorPageData) {
      const { page: errorPage, pageLayers: errorPageLayers, components: errorComponents } = errorPageData;

      return (
        <PageRenderer
          page={errorPage}
          layers={errorPageLayers.layers || []}
          components={errorComponents}
          generatedCss={draftCSS}
          colorVariablesCss={colorVariablesCss || undefined}
          isPreview={true}
          passwordProtection={{
            pageId: protection.protectedBy === 'page' ? protection.protectedById : undefined,
            folderId: protection.protectedBy === 'folder' ? protection.protectedById : undefined,
            redirectUrl: '/xxiv/preview',
            isPublished: false,
          }}
        />
      );
    }

    // Inline fallback if no custom 401 page exists
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#111' }}>Password Protected</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>Enter the password to continue.</p>
        <PasswordForm
          pageId={protection.protectedBy === 'page' ? protection.protectedById : undefined}
          folderId={protection.protectedBy === 'folder' ? protection.protectedById : undefined}
          redirectUrl="/xxiv/preview"
          isPublished={false}
        />
      </div>
    );
  }

  // Render homepage preview
  return (
    <PageRenderer
      page={data.page}
      layers={data.pageLayers.layers || []}
      components={data.components}
      generatedCss={draftCSS}
      colorVariablesCss={colorVariablesCss || undefined}
      locale={data.locale}
      availableLocales={data.availableLocales}
      isPreview={true}
      translations={data.translations}
    />
  );
}

// Generate metadata
export async function generateMetadata({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const siteFromQuery = typeof resolvedSearchParams?.xxiv_site_id === 'string'
    ? resolvedSearchParams.xxiv_site_id
    : undefined;
  const cookieStore = await cookies();
  const xxivSiteId = siteFromQuery || cookieStore.get('xxiv_site_id')?.value || undefined;
  const data = await fetchHomepage(false, undefined, undefined, undefined, xxivSiteId);

  if (!data) {
    return {
      title: 'Preview - Xxiv',
      description: 'Preview - Built with Xxiv',
    };
  }

  // Check password protection - don't leak metadata for protected pages
  const folders = await fetchFoldersForAuth(false);
  const authCookie = await parseAuthCookie();
  const protection = getPasswordProtection(data.page, folders, authCookie);

  if (protection.isProtected && !protection.isUnlocked) {
    return {
      title: 'Preview - Password Protected',
      description: 'This page is password protected.',
      robots: { index: false, follow: false },
    };
  }

  return generatePageMetadata(data.page, {
    isPreview: true,
    fallbackTitle: 'Homepage',
  });
}
