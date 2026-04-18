import { createDashboardClient, getAuthUser } from '@/lib/xxiv/server-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('site_id');

    if (!siteId) {
      return NextResponse.json({ error: 'Missing site_id' }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createDashboardClient();

    const { data: site, error } = await supabase
      .from('xxiv_sites')
      .select('id, name, slug, live_url, cf_project_name, custom_domain, custom_domain_verified, is_published, publish_status, last_published_at')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single();

    if (error || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const liveUrl =
      site.custom_domain && site.custom_domain_verified
        ? `https://${site.custom_domain}`
        : site.live_url || null;

    return NextResponse.json({
      id: site.id,
      name: site.name,
      slug: site.slug,
      live_url: liveUrl,
      cf_project_name: site.cf_project_name,
      custom_domain: site.custom_domain,
      custom_domain_verified: site.custom_domain_verified,
      is_published: site.is_published,
      publish_status: site.publish_status,
      last_published_at: site.last_published_at,
    });
  } catch (error) {
    console.error('Error fetching site info:', error);
    return NextResponse.json({ error: 'Failed to fetch site info' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
