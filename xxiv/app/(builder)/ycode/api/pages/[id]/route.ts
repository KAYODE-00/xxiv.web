import { NextRequest } from 'next/server';
import { getPageById, updatePage, deletePage } from '@/lib/repositories/pageRepository';
import { deleteTranslationsInBulk } from '@/lib/repositories/translationRepository';
import { noCache } from '@/lib/api-response';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function stripXxivSlugSuffix(slug: string, siteId: string): string {
  const suffix = `-${siteId.slice(0, 8)}`;
  if (typeof slug !== 'string') return slug as any;
  if (slug.endsWith(suffix)) {
    return slug.slice(0, -suffix.length);
  }
  return slug;
}

/**
 * GET /ycode/api/pages/[id]
 *
 * Get a specific page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const xxivSiteId = searchParams.get('xxiv_site_id');
    const { id } = await params;
    // For GET requests, return draft version (what users edit)
    const page = await getPageById(id, false);

    if (!page) {
      return noCache(
        { error: 'Page not found' },
        404
      );
    }

    return noCache({
      data: xxivSiteId ? { ...page, slug: stripXxivSlugSuffix(page.slug, xxivSiteId) } : page,
    });
  } catch (error) {
    console.error('Failed to fetch page:', error);

    return noCache(
      { error: error instanceof Error ? error.message : 'Failed to fetch page' },
      500
    );
  }
}

/**
 * PUT /ycode/api/pages/[id]
 *
 * Update a page
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const xxivSiteId = searchParams.get('xxiv_site_id');
    const body = await request.json();

    // Get current draft page to check its state
    // Repository update functions only update draft versions
    const currentPage = await getPageById(id, false);
    if (!currentPage) {
      return noCache(
        { error: 'Page not found' },
        404
      );
    }

    // Determine if the page is/will be an error page, index page, or dynamic page
    const isErrorPage = body.error_page !== undefined
      ? (body.error_page !== null)
      : (currentPage.error_page !== null);

    const isIndexPage = body.is_index !== undefined
      ? body.is_index
      : currentPage.is_index;

    const isDynamicPage = body.is_dynamic !== undefined
      ? body.is_dynamic
      : currentPage.is_dynamic;

    // Error pages and index pages must have empty slugs
    if (isErrorPage || isIndexPage) {
      if (body.slug !== undefined && body.slug.trim() !== '') {
        const pageType = isErrorPage ? 'Error' : 'Index';
        return noCache(
          { error: `${pageType} pages must have an empty slug` },
          400
        );
      }
      // Force slug to empty
      body.slug = '';
    }

    // Dynamic pages should have "*" as slug (allow updates to "*")
    if (isDynamicPage && body.slug !== undefined && body.slug !== '*') {
      body.slug = '*';
    }

    // In XXIV scoped mode, preserve site tagging and namespace updated slugs
    // so root-level unique constraints do not collide across sites.
    const updatePayload = { ...body } as Record<string, any>;
    if (xxivSiteId) {
      updatePayload.settings = {
        ...(currentPage.settings || {}),
        ...(updatePayload.settings || {}),
        xxiv: {
          ...((currentPage.settings as any)?.xxiv || {}),
          ...((updatePayload.settings as any)?.xxiv || {}),
          site_id: xxivSiteId,
        },
      };

      const shouldNamespaceSlug =
        updatePayload.slug !== undefined &&
        typeof updatePayload.slug === 'string' &&
        updatePayload.slug.trim() !== '' &&
        !isErrorPage &&
        !isIndexPage &&
        !isDynamicPage;

      if (shouldNamespaceSlug) {
        const slugSuffix = `-${xxivSiteId.slice(0, 8)}`;
        if (!updatePayload.slug.endsWith(slugSuffix)) {
          updatePayload.slug = `${updatePayload.slug}${slugSuffix}`;
        }
      }
    }

    let page;
    let attempt = 0;
    while (true) {
      try {
        // Pass all updates to the repository (it will handle further validation)
        page = await updatePage(id, updatePayload);
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const isDuplicate = msg.includes('duplicate key value violates unique constraint');
        const canRetrySlug =
          !!xxivSiteId &&
          isDuplicate &&
          typeof updatePayload.slug === 'string' &&
          updatePayload.slug.trim() !== '' &&
          attempt < 4;

        if (!canRetrySlug) {
          throw error;
        }

        attempt += 1;
        updatePayload.slug = `${updatePayload.slug}-${attempt + 1}`;
      }
    }

    return noCache({
      data: xxivSiteId ? { ...page, slug: stripXxivSlugSuffix(page.slug, xxivSiteId) } : page,
    });
  } catch (error) {
    console.error('Failed to update page:', error);

    return noCache(
      { error: error instanceof Error ? error.message : 'Failed to update page' },
      500
    );
  }
}

/**
 * DELETE /ycode/api/pages/[id]
 *
 * Delete a page and its associated translations
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete the page
    await deletePage(id);

    // Delete all translations for this page
    await deleteTranslationsInBulk('page', id);

    return noCache({
      success: true,
      message: 'Page deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete page:', error);

    return noCache(
      { error: error instanceof Error ? error.message : 'Failed to delete page' },
      500
    );
  }
}
