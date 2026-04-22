import { NextRequest, NextResponse } from 'next/server';
import { createDashboardClient, getAuthUser } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function buildDynamicSiteUrl(request: NextRequest, siteSlug: string) {
  const url = new URL('/', request.url);
  url.pathname = `/${siteSlug}`;
  return url.toString();
}

async function getAccessibleSite(
  supabase: Awaited<ReturnType<typeof createDashboardClient>>,
  userId: string,
  siteId: string,
) {
  const { data: ownedSite, error: ownedSiteError } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedSiteError) {
    throw ownedSiteError;
  }

  if (ownedSite) {
    return ownedSite;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('xxiv_site_members')
    .select('site_id')
    .eq('site_id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    return null;
  }

  const { data: collaborativeSite, error: collaborativeSiteError } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('id', siteId)
    .maybeSingle();

  if (collaborativeSiteError) {
    throw collaborativeSiteError;
  }

  return collaborativeSite;
}

export async function POST(request: NextRequest) {
  let xxivSiteId: string | null = null;

  try {
    const body = await request.json().catch(() => null);
    xxivSiteId = typeof body?.xxivSiteId === 'string' ? body.xxivSiteId : null;

    if (!xxivSiteId) {
      return NextResponse.json({ error: 'xxivSiteId required' }, { status: 400 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createDashboardClient();
    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const site = await getAccessibleSite(supabase, user.id, xxivSiteId);

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    await admin
      .from('xxiv_sites')
      .update({
        publish_status: 'publishing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', xxivSiteId);

    const liveUrl = site.custom_domain && site.custom_domain_verified
      ? `https://${site.custom_domain}`
      : buildDynamicSiteUrl(request, site.slug);

    await admin
      .from('xxiv_sites')
      .update({
        is_published: true,
        live_url: liveUrl,
        publish_status: 'live',
        last_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', xxivSiteId);

    return NextResponse.json({
      success: true,
      url: liveUrl,
      message: 'Site published successfully',
    });
  } catch (error) {
    const admin = await getSupabaseAdmin();

    if (admin && xxivSiteId) {
      await admin
        .from('xxiv_sites')
        .update({
          publish_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', xxivSiteId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 },
    );
  }
}
