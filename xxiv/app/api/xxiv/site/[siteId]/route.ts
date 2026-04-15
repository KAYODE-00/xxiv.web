import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getSettingByKey } from '@/lib/repositories/settingsRepository';
import { getAllPages } from '@/lib/repositories/pageRepository';
import { getAllPageFolders } from '@/lib/repositories/pageFolderRepository';
import { fetchHomepage, renderPageLayersToHtml } from '@/lib/page-fetcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    if (!siteId) {
      return NextResponse.json({ error: 'Missing site id' }, { status: 400 });
    }

    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: site, error: siteError } = await admin
      .from('xxiv_sites')
      .select('*')
      .eq('id', siteId)
      .eq('is_published', true)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const homepage = await fetchHomepage(true, undefined, undefined, undefined, siteId);
    if (!homepage) {
      return NextResponse.json({ error: 'Homepage not found' }, { status: 404 });
    }

    const [pages, folders, publishedCss] = await Promise.all([
      getAllPages({ is_published: true }, siteId),
      getAllPageFolders({ is_published: true }),
      getSettingByKey('published_css'),
    ]);

    const html = await renderPageLayersToHtml({
      layers: homepage.pageLayers.layers,
      isPublished: true,
      pages,
      folders,
      components: homepage.components,
      locale: homepage.locale || null,
      translations: homepage.translations || {},
    });

    const meta = {
      title: homepage.page.settings?.seo?.title || homepage.page.name,
      description: homepage.page.settings?.seo?.description || null,
    };

    return NextResponse.json({
      html,
      css: publishedCss || '',
      meta,
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
      },
    });
  } catch (error) {
    console.error('[GET /api/xxiv/site] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 });
  }
}
