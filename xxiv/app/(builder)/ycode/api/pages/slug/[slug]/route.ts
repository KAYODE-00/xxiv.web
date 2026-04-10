import { NextRequest } from 'next/server';
import { getPageBySlug } from '@/lib/repositories/pageRepository';
import { noCache } from '@/lib/api-response';

/**
 * GET /ycode/api/pages/slug/[slug]
 *
 * Get a page by slug (scoped to site)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 🔥 CRITICAL: get site ID from request
    const siteId = request.headers.get('x-site-id');

    if (!siteId) {
      return noCache(
        { error: 'Missing site context' },
        400
      );
    }

    // ✅ FIX: scope query to this site only
    const page = await getPageBySlug(slug, {
      xxiv_site_id: siteId,
    });

    if (!page) {
      return noCache(
        { error: 'Page not found' },
        404
      );
    }

    return noCache({
      data: page,
    });
  } catch (error) {
    console.error('[GET /pages/slug] Failed:', error);

    return noCache(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch page',
      },
      500
    );
  }
}