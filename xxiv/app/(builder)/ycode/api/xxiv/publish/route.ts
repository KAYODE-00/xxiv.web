<<<<<<< HEAD
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

    if (!xxivSiteId || typeof xxivSiteId !== 'string') {
      return NextResponse.json({ error: 'xxivSiteId required' }, { status: 400 });
=======
import { createDashboardClient, getAuthUser } from '@/lib/xxiv/server-client';
import { createVercelProject, triggerDeploy, getDeploymentStatus } from '@/lib/xxiv/vercel-deploy';

type PublishEvent =
  | { type: 'progress'; message: string }
  | { type: 'status'; status: 'BUILDING' | 'READY' | 'ERROR'; url?: string }
  | { type: 'complete'; liveUrl: string; customDomain: string | null; vercelUrl: string }
  | { type: 'error'; message: string };

function createSseStream(handler: (send: (event: PublishEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: PublishEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      handler(send)
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Publish failed';
          send({ type: 'error', message });
        })
        .finally(() => controller.close());
    },
  });

  return stream;
}

export async function POST(request: Request) {
  const stream = createSseStream(async (send) => {
    const body = await request.json().catch(() => ({}));
    const siteId = body?.xxiv_site_id as string | undefined;

    if (!siteId) {
      send({ type: 'error', message: 'Missing xxiv_site_id' });
      return;
>>>>>>> 5472cf66654042f129fdd1d9b7bf366665fc90b0
    }

    const user = await getAuthUser();
    if (!user) {
<<<<<<< HEAD
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createDashboardClient();
    const admin = await getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
=======
      send({ type: 'error', message: 'Not authenticated' });
      return;
    }

    const supabase = await createDashboardClient();
>>>>>>> 5472cf66654042f129fdd1d9b7bf366665fc90b0

    const { data: site, error: siteError } = await supabase
      .from('xxiv_sites')
      .select('*')
<<<<<<< HEAD
      .eq('id', xxivSiteId)
=======
      .eq('id', siteId)
>>>>>>> 5472cf66654042f129fdd1d9b7bf366665fc90b0
      .eq('user_id', user.id)
      .single();

    if (siteError || !site) {
<<<<<<< HEAD
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
    const deployment = await deployFilesToCF(projectName, files);

    await admin
      .from('xxiv_sites')
      .update({
        is_published: true,
        live_url: deployment.url,
        cf_project_name: project.name,
        cf_project_id: project.id,
        publish_status: 'live',
        last_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', xxivSiteId);

    return NextResponse.json({
      success: true,
      url: deployment.url,
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
=======
      send({ type: 'error', message: 'Site not found' });
      return;
    }

    let projectId = site.vercel_project_id as string | null;
    let projectName = site.vercel_project_name as string | null;
    let deployHookId = site.vercel_deploy_hook as string | null;

    if (!projectId || !projectName || !deployHookId) {
      send({ type: 'progress', message: 'Creating Vercel project...' });
      const created = await createVercelProject(site.slug, site.id);
      projectId = created.projectId;
      projectName = created.projectName;
      deployHookId = created.deployHookId;

      const { error: updateError } = await supabase
        .from('xxiv_sites')
        .update({
          vercel_project_id: projectId,
          vercel_project_name: projectName,
          vercel_deploy_hook: deployHookId,
          live_url: created.vercelUrl,
        })
        .eq('id', site.id);

      if (updateError) {
        throw updateError;
      }
    }

    send({ type: 'progress', message: 'Triggering deployment...' });
    const { deploymentId } = await triggerDeploy(deployHookId);

    const start = Date.now();
    const timeoutMs = 3 * 60 * 1000;

    while (Date.now() - start < timeoutMs) {
      const status = await getDeploymentStatus(deploymentId);
      send({ type: 'status', status: status.status, url: status.url });

      if (status.status === 'READY') {
        const vercelUrl = `https://${projectName}.vercel.app`;
        const now = new Date().toISOString();

        const { error: publishError } = await supabase
          .from('xxiv_sites')
          .update({
            is_published: true,
            live_url: vercelUrl,
            last_published_at: now,
          })
          .eq('id', site.id);

        if (publishError) {
          throw publishError;
        }

        send({
          type: 'complete',
          liveUrl: vercelUrl,
          customDomain: site.custom_domain || null,
          vercelUrl,
        });
        return;
      }

      if (status.status === 'ERROR') {
        send({ type: 'error', message: 'Deployment failed' });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    send({ type: 'error', message: 'Deployment timed out' });
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
>>>>>>> 5472cf66654042f129fdd1d9b7bf366665fc90b0
