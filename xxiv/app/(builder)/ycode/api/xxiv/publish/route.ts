import { NextRequest, NextResponse } from 'next/server';
import { createDashboardClient, getAuthUser } from '@/lib/xxiv/server-client';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { buildCFProjectName, createCFProject, deployFilesToCF } from '@/lib/xxiv/cloudflare-pages';
import { generateStaticSite } from '@/lib/xxiv/generate-static-site';

export const dynamic = 'force-dynamic';

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

    const { data: site, error: siteError } = await supabase
      .from('xxiv_sites')
      .select('*')
      .eq('id', xxivSiteId)
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    await admin
      .from('xxiv_sites')
      .update({
        publish_status: 'deploying',
        updated_at: new Date().toISOString(),
      })
      .eq('id', xxivSiteId);

    const files = await generateStaticSite(xxivSiteId);
    const projectName = site.cf_project_name || buildCFProjectName(site.slug || site.name || 'site', xxivSiteId);
    const project = await createCFProject(projectName);
    await deployFilesToCF(projectName, files);

    const stableUrl = `https://${project.name}.pages.dev`;

    await admin
      .from('xxiv_sites')
      .update({
        is_published: true,
        live_url: stableUrl,
        cf_project_name: project.name,
        cf_project_id: project.id,
        publish_status: 'live',
        last_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', xxivSiteId);

    return NextResponse.json({
      success: true,
      url: stableUrl,
      projectName: project.name,
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
      { error: error instanceof Error ? error.message : 'Deploy failed' },
      { status: 500 },
    );
  }
}
